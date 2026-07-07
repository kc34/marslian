/**
 * @interface
 */
class Client {
    /**
     * @param {Packet} packet
     */
    handlePacket(packet) {}
}

/**
 * Represents a Client running on a different process.
 * 
 * @implements {Client}
 */
class RemoteClient {
    /**
     * @param {Host} host
     * @param {Connection} connection
     */
    constructor(host, connection) {
        this.host = host;
        this.connection = connection;
    }

    /**
     * Receives a Packet from the Host, and forwards it to the "real" Client.
     * 
     * @param {Packet} packet 
     */
    handlePacket(packet) {
        this.connection.send(JSON.stringify(packet))
    }

    /**
     * Receives data from the "real" Client, and forwards it to the Host.
     * 
     * @param {string} data should deserialize into a connectionRequest or a gameEvent.
     */
    handleData(data) {
        this.host.handlePacket(this, JSON.parse(data));
    }
}

/**
 * Client running on this process.
 * 
 * @implements {Client}
 */
class LocalClient extends BaseModel {
    debugName = "CLIENT"
    // game state
    pressedKeys = new Set();

    // singleton entities
    /** @type {number|undefined} */ playerId;
    /** @type {number|undefined} */ cameraId;

    /**
     * @param {Host} host
     * @param {string} name
     * @param {string} color
     */
    constructor(host, name, color) {
        super();
        this.host = host;
        this.host.handlePacket(this, {playerJoinPacket: {name: name, color: color}});
    }

    /**
     * @param {Packet} packet
     */
    handlePacket(packet) {
        if (packet.playerJoinSuccessPacket) {
            this.gameState = packet.playerJoinSuccessPacket.gameState;
            this.playerId = packet.playerJoinSuccessPacket.playerId;
            this.cameraId = packet.playerJoinSuccessPacket.cameraId;
        } else if (packet.gameEvent) {
            this.handleGameEvent(packet.gameEvent);
        } else if (packet.syncPacket) {
            this.gameState = packet.syncPacket.gameState;
        }
    }

    /** @param {number} timeStep */
    tick(timeStep) {
        super.tick(timeStep);

        if (!this.playerId) {
            return;
        }

        const playerVelocityComponent = this.gameState.poolsByComponentName.velocityComponents[this.playerId];
        if (!playerVelocityComponent) {
            console.log("player velocity component not found!");
        } else {
            const initialVelocity = {x: playerVelocityComponent.x, y: playerVelocityComponent.y}
            // ControllableSystem
            if (this.pressedKeys.has("W")) {
                playerVelocityComponent.y = 125;
            } else if (this.pressedKeys.has("S")) {
                playerVelocityComponent.y = -125;
            } else {
                playerVelocityComponent.y = 0;
            }
            if (this.pressedKeys.has("A")) {
                playerVelocityComponent.x = -125;
            } else if (this.pressedKeys.has("D")) {
                playerVelocityComponent.x = 125;
            } else {
                playerVelocityComponent.x = 0;
            }
            if (this.pressedKeys.has("Shift".toUpperCase())) {
                playerVelocityComponent.x *= 2;
                playerVelocityComponent.y *= 2;
            }
            if (initialVelocity.x != playerVelocityComponent.x || initialVelocity.y != playerVelocityComponent.y) {
                this.host.handlePacket(this, {gameEvent: {velocityChangeEvent: {playerId: this.playerId, x: playerVelocityComponent.x, y: playerVelocityComponent.y}}});
            }
        }
    }

    /** @param {HTMLCanvasElement} canvas */
    draw(canvas) {
        let scale = 1;
        if (this.pressedKeys.has("M")) {
            scale = 10;
        }
        const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext("2d"));
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.fillStyle = "#886e6e";
		ctx.fillRect( 0 , 0, canvas.width, canvas.height);

        const entityQuery = this.query(["drawableComponent", "positionComponent", "sizeComponent"]);
        for (const [entityId, {positionComponent}] of entityQuery) {
            const cameraPositionComponent = !!this.cameraId ? this.gameState.poolsByComponentName.positionComponents[this.cameraId] : undefined;
            var screenX;
            var screenY;
            if (!cameraPositionComponent) {
                screenX = positionComponent.x
                screenY = positionComponent.y
            } else {
                screenX = (canvas.width / 2) - (cameraPositionComponent.x - positionComponent.x) / scale;
                screenY = (canvas.height / 2) + (cameraPositionComponent.y - positionComponent.y) / scale;
            }

            this.drawEntity(
                entityId,
                ctx,
                screenX,
                screenY,
                scale);
        }

        if (this.playerId) {
            const playerInventory = this.gameState.playerInventories[this.playerId];
            for (let i = 0; i < playerInventory.length; i++) {
                let itemX = canvas.width - 200 - ((playerInventory.length - 1) * 100) + (i * 100) + 50;
                let itemY = canvas.height - 50;
                let size = 100;
                let scale = 1;
                let label = "";
                if (i == playerInventory.length - 1) {
                    itemX = canvas.width - 100;
                    itemY = canvas.height - 100;
                    size = 200;
                    scale = 0.5;
                    label = "holding";
                }
                // draw a background square to hold the entity.
                this.drawCircle({color: "#ffffff", shape: "CIRCLE", label}, ctx, itemX, itemY, size);
                this.drawLabel({color: "#ffffff", shape: "CIRCLE", label}, ctx, itemX, itemY, size);
                this.drawEntity(playerInventory[i], ctx, itemX, itemY, scale);
            }
        }
    }

    /**
     * @param {number} entityId
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} screenX
     * @param {number} screenY
     * @param {number} scale
     */
    drawEntity(entityId, ctx, screenX, screenY, scale) {
        const entityComponents = this.getEntityComponents(entityId);
        let size = (entityComponents.sizeComponent?.size || 50) / scale;
        let drawableComponent = entityComponents.drawableComponent || {color: "red", shape: "NOPE"};
        let age = entityComponents.ageableComponent?.age || 10;
        let healthRatio = entityComponents.hurtboxComponent ? entityComponents.hurtboxComponent.currentHealth / entityComponents.hurtboxComponent.maxHealth : undefined;

        const maxAge = 10;
        const ageRatio = Math.min((age || maxAge) / maxAge, 1);
        switch (drawableComponent.shape) {
            case DrawableShape.CIRCLE:
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                ctx.shadowColor = "black";

                this.drawCircle(drawableComponent, ctx, screenX, screenY, size);
                break;
            case DrawableShape.SQUARE:
                // squares often represent tiles or walls, which we don't want to shadow over each other
                // roads/water we might be able to disable, but not clear how to connected walls yet

                ctx.beginPath();
                // rect uses the top left corner
                ctx.rect(screenX - size / 2, screenY - size / 2, size, size);
                ctx.fillStyle = drawableComponent.color;
                ctx.fill();
                break;
            case DrawableShape.PLOT:
                ctx.beginPath();
                ctx.rect(screenX - size / 2, screenY - size / 2, size, size);
                ctx.fillStyle = drawableComponent.color;
                ctx.fill();

                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                ctx.shadowColor = "black";

                ctx.beginPath();
                ctx.arc(screenX, screenY, size / 2 * ageRatio, 0, 2 * Math.PI);
                ctx.fillStyle = drawableComponent.secondColor || "#ffffff";
                ctx.fill();
                break;
            case DrawableShape.TREE:
                ctx.beginPath();
                ctx.rect(screenX - (size / 6), screenY + size / 2, size / 3, - size / 3);
                ctx.fillStyle = drawableComponent.color;
                ctx.fill();

                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                ctx.shadowColor = "black";

                ctx.beginPath();
                const radius = (size) / 2 * ageRatio;
                ctx.arc(screenX, screenY + (1/6) * size - radius, radius, 0, 2 * Math.PI);
                ctx.fillStyle = drawableComponent.secondColor || "green";
                ctx.fill();
                break;
            case DrawableShape.NOPE:
                ctx.fillStyle = drawableComponent.color;
                ctx.font = Math.round(size / 2).toString() + "px Courier New";
                ctx.fillText("NO", screenX - ctx.measureText("NO").width / 2, screenY);
                ctx.fillText("PE", screenX - ctx.measureText("PE").width / 2, screenY + size * 0.45);
                break;
            case DrawableShape.TEXT:
                const text = drawableComponent.text || "?";
                ctx.fillStyle = drawableComponent.color;
                ctx.font = Math.round(size).toString() + "px Courier New";
                ctx.fillText(text, screenX - ctx.measureText(text).width / 2, screenY + size * 0.25);
                break;
        }

        this.drawLabel(drawableComponent, ctx, screenX, screenY, size);
        if (healthRatio !== undefined && healthRatio != 1) {
            ctx.beginPath();
            ctx.rect(screenX - size / 2, screenY - size / 2, size, -10);
            ctx.fillStyle = "red"
            ctx.fill();
            ctx.beginPath();
            ctx.rect(screenX - size / 2, screenY - size / 2, size * healthRatio, -10);
            ctx.fillStyle = "green"
            ctx.fill();
        }

        
        if (entityComponents.stackableComponent?.count !== undefined && entityComponents.stackableComponent.count != 1) {
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.shadowColor = "black";

            const text = entityComponents.stackableComponent.count?.toString()
            ctx.fillStyle = "white";
		    ctx.font = Math.round(size / 2).toString() + "px Courier New";
		    ctx.fillText(text, screenX + (size / 2) - ctx.measureText(text).width / 2, screenY + (size / 2));
        }

        // reset shadow in case it was set
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        if (!!entityComponents.dirtComponent?.plantableId) {
            this.drawEntity(entityComponents.dirtComponent.plantableId, ctx, screenX, screenY, scale);
        }
    }

    /**
     * @param {DrawableComponent} drawableComponent
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} screenX
     * @param {number} screenY
     * @param {number} size
     */
    drawCircle(drawableComponent, ctx, screenX, screenY, size) {
        ctx.beginPath();
        const radius = size / 2;
        ctx.arc(screenX, screenY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = drawableComponent.color;
        ctx.fill();
    }

    /**
     * @param {DrawableComponent} drawableComponent
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} screenX
     * @param {number} screenY
     * @param {number} size
     */
    drawLabel(drawableComponent, ctx, screenX, screenY, size) {
        // reset shadow in case it was set. shadow on label can be distracting
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

		ctx.font = "20px Courier New";
        if (!!drawableComponent.label) {
            const textWidth = ctx.measureText(drawableComponent.label);
		    ctx.fillText(drawableComponent.label, screenX - textWidth.width / 2, screenY - size / 2 - 10);
        }
    }

    /**
     * @param {MouseEvent} clickEvent
     * @returns {[number, number]?} 
     */
    #translateClick(clickEvent) {
        if (!this.playerId) {
            return null;
        }
        // first, try to determine where the user is clicking.
        var x;
        var y;
        const cameraPositionComponent = this.cameraId ? this.gameState.poolsByComponentName.positionComponents[this.cameraId] : undefined;
        if (!cameraPositionComponent) {
            x = clickEvent.offsetX;
            y = clickEvent.offsetY;
        } else {
            x = clickEvent.offsetX - window.innerWidth / 2 + cameraPositionComponent.x
            y = window.innerHeight / 2 + cameraPositionComponent.y - clickEvent.offsetY
        }

        if (this.pressedKeys.has("Shift".toUpperCase())) {
            x = Math.round(x / 50) * 50;
            y = Math.round(y / 50) * 50;
        }
        return [x, y];
    }

    /**
     * Handles when a player left-clicks (i.e. places inventory item, or interacts with entity.)
     * 
     * @param {MouseEvent} clickEvent
     */
    clickHandler(clickEvent) {
        const click = this.#translateClick(clickEvent);
        if (!click) {
            return;
        }
        const [x, y] = click;

        if (!this.playerId) {
            return;
        }
        const entityQuery =
        /** @type {Map<number, {positionComponent: PositionComponent, sizeComponent: SizeComponent, interactableComponent: InteractableComponent}>} */
        (this.query(["positionComponent", "sizeComponent", "interactableComponent"]));
        for (const [entityId, {positionComponent, sizeComponent}] of entityQuery) {
            if (Math.abs(x - positionComponent.x) <= sizeComponent.size / 2 && Math.abs(y - positionComponent.y) <= sizeComponent.size / 2) {
                this.host.handlePacket(this, {
                    gameEvent: {
                        useEvent: {
                            playerId: this.playerId,
                            playerHoldingId: this.gameState.playerInventories[this.playerId].at(-1),
                            targetId: entityId}}});
                return; // note that if entities are drawn over each other, this will only click on the bottom entity.
            }
        }

        const itemId = this.gameState.playerInventories[this.playerId].at(-1);
        if (itemId && itemId != -1) {
            this.host.handlePacket(this, {gameEvent: {buildEvent: {playerId: this.playerId, itemId: itemId, x: x, y: y}}});
        }
    }

    /**
     * Handles when a player right-clicks (i.e. places something).
     *
     * @param {MouseEvent} clickEvent
     */
    auxClickHandler(clickEvent) {
        const click = this.#translateClick(clickEvent);
        if (!click) {
            return;
        }
        const [x, y] = click;

        if (!this.playerId) {
            return;
        }

        const entityQuery = this.query(["positionComponent", "sizeComponent"]);
        for (const [entityId, {positionComponent, sizeComponent}] of entityQuery) {
            if (entityId === this.playerId) {
                // can't collect yourself, or else you can't build yourself
                continue;
            }
            if (Math.abs(x - positionComponent.x) <= sizeComponent.size / 2 && Math.abs(y - positionComponent.y) <= sizeComponent.size / 2) {
                this.host.handlePacket(this, {gameEvent: {collectEvent: {playerId: this.playerId, itemId: entityId}}});
                return; // note that if entities are drawn over each other, this will only click on the bottom entity.
            }
        }
    }

    /** @param {WheelEvent} wheelEvent */
    mousewheelHandler(wheelEvent) {
        this.#spinPlayerInventory(wheelEvent.deltaY < 0);
    }

    /** @param {boolean} reverse */
    #spinPlayerInventory(reverse) {
        if (!this.playerId) {
            return;
        }
        const playerInventory = this.gameState.playerInventories[this.playerId];
        if (playerInventory.length == 0) {
            return;
        }

        if (!reverse) {
            const element = playerInventory.pop();
            if (element) {
                playerInventory.unshift(element);
                // Let the server know so that the refresh doesn't reset it
                // This might re-broadcast back
                this.host.handlePacket(this, {gameEvent: {setPlayerInventoryEvent: {playerId: this.playerId, playerInventory}}});
            }
        } else {
            const element = playerInventory.shift();
            if (element) {
                playerInventory.push(element);
                // Let the server know so that the refresh doesn't reset it
                // This might re-broadcast back
                this.host.handlePacket(this, {gameEvent: {setPlayerInventoryEvent: {playerId: this.playerId, playerInventory}}});
            }
        }
    }

    /** @param {KeyboardEvent} keyEvent */
    keydownHandler(keyEvent) {
        const key = keyEvent.key.toUpperCase();
        if (key.toUpperCase() === "Tab".toUpperCase()) {
            const reverse = this.pressedKeys.has("Shift".toUpperCase());
            this.#spinPlayerInventory(reverse);
        }
        this.pressedKeys.add(key);
    }

    /** @param {KeyboardEvent} keyEvent */
    keyupHandler(keyEvent) {
        const key = keyEvent.key.toUpperCase();
        this.pressedKeys.delete(key);
    }
}