/// <reference path="./component.js" />
/// <reference path="./packet.js" />

/**
 * Represents an authoritative game state.
 * 
 * <p>Note that since TypeScript is structurally typed, it will not catch when
 * parameters are added into the interface functions but not the implementer
 * functions.
 * 
 * @interface
 */
class Host {
    /**
     * @param {Client} client
     * @param {Packet} packet
     */
    handlePacket(client, packet) {}
}

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
 * @typedef {Object} GameState
 * @property {number} frameCount
 * @property {FullComponentPool} poolsByComponentName
 * @property {Object<number, boolean>} entityIds
 * @property {number} cornCount
 * @property {number} cornSeeds
 * @property {Object<number, Array<number>>} playerInventories
 */

/**
 * Contains core game logic, which is essentially holding game state and handling game events.
 */
class BaseModel {
    /** @type {GameState} */
    gameState = {
        frameCount: 0,
        poolsByComponentName: FullComponentPools.newComponentPool(),
        entityIds: {},
        cornCount: 5,
        cornSeeds: 5,
        playerInventories: {},
    }
    TIME_STEP = 1 / 60.0

    debugName = "ERROR";

    /** @type {GameEvent[]} */
    events = [];
    
    getNextId() {
        const nextId = Object.keys(this.gameState.entityIds).length;
        this.gameState.entityIds[nextId] = true;
        return nextId;
    }

    /**
     * @param {ComponentName[]} componentNames
     */
    query(componentNames) {
        /** @type {Map<number, Component[]>} */
        const entities = new Map();
        for (const entityId of Object.keys(this.gameState.entityIds)) {
            const components = [];
            for (const componentName of componentNames) {
                const componentPool = this.gameState.poolsByComponentName[componentName];
                if (!componentPool) {
                    break;
                }
                const component = componentPool[parseInt(entityId)];
                if (!component) {
                    break;
                }
                components.push(component);
            }
            if (components.length == componentNames.length) {
                entities.set(parseInt(entityId), components);
            }
        }
        return entities;
    }

    tick() {
        this.gameState.frameCount += 1;
        const velocityEntityQuery =
            /** @type {Map<number, [VelocityComponent, PositionComponent]>} */
            (this.query(["velocityComponents", "positionComponents"]));
        for (const [_, [velocityComponent, positionComponent]] of velocityEntityQuery) {
            positionComponent.x += velocityComponent.x * this.TIME_STEP;
            positionComponent.y += velocityComponent.y * this.TIME_STEP;
        }

        // FollowPlayerSystem
        const followPlayerEntityQuery =
            /** @type {Map<number, [FollowPlayerComponent, PositionComponent]>} */
            (this.query(["followPlayerComponents", "positionComponents"]));
        for (const [_, [followPlayerComponent, positionComponent]] of followPlayerEntityQuery) {
            const maxDistanceFromPlayer = followPlayerComponent.maxDistanceFromPlayer;
            const playerPositionComponent = this.gameState.poolsByComponentName.positionComponents[followPlayerComponent.followingId];
            if (!playerPositionComponent) {
                continue;
            }
            // Follow player if player leaves box.
            // I did try a circle at one point, but this was actually much less fun
            // and made me dizzy. (Basically, if you were on the lower half of the screen
            // and walked left, you would get pushed up to the middle of the screen.)
            if (positionComponent.x - playerPositionComponent.x > maxDistanceFromPlayer) {
                positionComponent.x = playerPositionComponent.x + maxDistanceFromPlayer;
            }
            if (positionComponent.x - playerPositionComponent.x < -1 * maxDistanceFromPlayer) {
                positionComponent.x = playerPositionComponent.x - maxDistanceFromPlayer;
            }
            if (positionComponent.y - playerPositionComponent.y > maxDistanceFromPlayer) {
                positionComponent.y = playerPositionComponent.y + maxDistanceFromPlayer;
            }
            if (positionComponent.y - playerPositionComponent.y < -1 * maxDistanceFromPlayer) {
                positionComponent.y = playerPositionComponent.y - maxDistanceFromPlayer;
            }
        }

        // AgeableSystem
        for (const [_, plotComponents] of Object.entries(this.gameState.poolsByComponentName.plotComponents)) {
            plotComponents.age += this.TIME_STEP;
        }
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} [size=50]
     */
    makePlot(x, y, size = 50) {
        const plotId = this.getNextId();
        this.gameState.entityIds[plotId] = true;
        this.gameState.poolsByComponentName.positionComponents[plotId] = {x: x, y: y};
        this.gameState.poolsByComponentName.sizeComponents[plotId] = {size: size};
        this.gameState.poolsByComponentName.drawableComponents[plotId] = {color: "#832a2a", shape: "SQUARE"};
        this.gameState.poolsByComponentName.plotComponents[plotId] = {age: 0};
    }

    /** @param {GameEvent} gameEvent */
    handleGameEvent(gameEvent) {
        if (!!gameEvent.moveEvent) {
            const playerPositionComponent = this.gameState.poolsByComponentName.positionComponents[gameEvent.moveEvent.playerId];
            if (playerPositionComponent) {
                playerPositionComponent.x = gameEvent.moveEvent.x;
                playerPositionComponent.y = gameEvent.moveEvent.y;
            }
        } else if (!!gameEvent.velocityChangeEvent) {
            const playerPositionComponent = this.gameState.poolsByComponentName.velocityComponents[gameEvent.velocityChangeEvent.playerId];
            if (playerPositionComponent) {
                playerPositionComponent.x = gameEvent.velocityChangeEvent.x;
                playerPositionComponent.y = gameEvent.velocityChangeEvent.y;
            }
        } else if (!!gameEvent.newPlayerEvent) {
            this.gameState.entityIds[gameEvent.newPlayerEvent.playerId] = true;
            this.gameState.poolsByComponentName.positionComponents[gameEvent.newPlayerEvent.playerId] = {x: gameEvent.newPlayerEvent.x, y: gameEvent.newPlayerEvent.y};
            this.gameState.poolsByComponentName.sizeComponents[gameEvent.newPlayerEvent.playerId] = {size: 50};
            this.gameState.poolsByComponentName.velocityComponents[gameEvent.newPlayerEvent.playerId] = {x: 0, y: 0}
            this.gameState.poolsByComponentName.drawableComponents[gameEvent.newPlayerEvent.playerId] = {color: gameEvent.newPlayerEvent.color, label: gameEvent.newPlayerEvent.label, shape: "CIRCLE"};
            this.gameState.entityIds[gameEvent.newPlayerEvent.cameraId] = true;
            this.gameState.poolsByComponentName.positionComponents[gameEvent.newPlayerEvent.cameraId] = {x: gameEvent.newPlayerEvent.cameraX, y: gameEvent.newPlayerEvent.cameraY};
            this.gameState.poolsByComponentName.followPlayerComponents[gameEvent.newPlayerEvent.cameraId] = {maxDistanceFromPlayer: 150, followingId: gameEvent.newPlayerEvent.playerId};
        } else if (!!gameEvent.useEvent) {
            const targetId = gameEvent.useEvent.targetId;
            if (this.gameState.poolsByComponentName.plotComponents[targetId]) {
                const plotComponent = this.gameState.poolsByComponentName.plotComponents[targetId];
                if (plotComponent.age > 10) {
                    this.gameState.cornCount += 1;
                    this.gameState.poolsByComponentName.plotComponents[targetId].age = 0;
                }
            }
        } else if (!!gameEvent.collectEvent) {
            console.log("collecting");
            console.log(gameEvent.collectEvent);
            // remove entity from world, and put in player inventory
            delete this.gameState.poolsByComponentName.positionComponents[gameEvent.collectEvent.itemId];
            if (!this.gameState.playerInventories[gameEvent.collectEvent.playerId]) {
                this.gameState.playerInventories[gameEvent.collectEvent.playerId] = [];
            }
            this.gameState.playerInventories[gameEvent.collectEvent.playerId].push(gameEvent.collectEvent.itemId);
            console.log(this.gameState.playerInventories[gameEvent.collectEvent.playerId]);
        } else if (!!gameEvent.buildEvent) {
            // delete from player inventory, and put into world
            this.gameState.playerInventories[gameEvent.buildEvent.playerId].splice(this.gameState.playerInventories[gameEvent.buildEvent.playerId].indexOf(gameEvent.buildEvent.itemId), 1);
            this.gameState.poolsByComponentName.positionComponents[gameEvent.buildEvent.itemId] = {x: gameEvent.buildEvent.x, y: gameEvent.buildEvent.y};
        } else {
            console.log("unrecognized game event!!");
        }
    }

    /** @param {number} entityId */
    deleteEntity(entityId) {
        for (const componentPool of Object.values(this.gameState.poolsByComponentName)) {
            delete componentPool[entityId];
        }
    }
}

/**
 * Host running on this process.
 * 
 * @implements {Host}
 */
class LocalHost extends BaseModel {
    debugName = "HOST"

    players = 0;

    /** @type {Map<number, Client>} */
    connections = new Map();

    constructor() {
        super();

        // make a river
        for (let x = -1; x <= 1; x++) {
            for (let y = -25; y <= 25; y++) {
                if (y >= -1 && y <= 1) {
                    continue; // draw a bridge here
                }
                const waterId = this.getNextId();
                this.gameState.entityIds[waterId] = true;
                this.gameState.poolsByComponentName.positionComponents[waterId] = {x: 50 * x, y: y * 50};
                this.gameState.poolsByComponentName.sizeComponents[waterId] = {size: 50};
                this.gameState.poolsByComponentName.drawableComponents[waterId] = {color: "#0080ff", shape: "SQUARE"};
            }
        }

        // make a street
        for (let x = -25; x <= 25; x++) {
            for (let y = -1; y <= 1; y++) {
                if (x >= -1 && x <= -1) {
                    continue; // draw a bridge here
                }
                const roadId = this.getNextId();
                this.gameState.entityIds[roadId] = true;
                this.gameState.poolsByComponentName.positionComponents[roadId] = {x: 50 * x, y: y * 50};
                this.gameState.poolsByComponentName.sizeComponents[roadId] = {size: 50};
                this.gameState.poolsByComponentName.drawableComponents[roadId] = {color: "gray", shape: "SQUARE"};
            }
        }

        // bridge
        for (let x = -2; x <= 2; x++) {
            for (let y = -1; y <= 1; y++) {
                const bridgeId = this.getNextId();
                this.gameState.entityIds[bridgeId] = true;
                this.gameState.poolsByComponentName.positionComponents[bridgeId] = {x: 50 * x, y: y * 50};
                this.gameState.poolsByComponentName.sizeComponents[bridgeId] = {size: 50};
                this.gameState.poolsByComponentName.drawableComponents[bridgeId] = {color: "brown", shape: "SQUARE"};
            }
        }

        // make house walls
        for (let x = -16; x <= -4; x++) {
            for (let y = -14; y <= -6; y++) {
                if (x !== -16 && x !== -4 && y !== -14 && y !== -6) {
                    continue;
                }
                if (y === -14 && x >= -11 && x <= -9) {
                    // leave a space for the door
                    continue;
                }
                const wallId = this.getNextId();
                this.gameState.entityIds[wallId] = true;
                this.gameState.poolsByComponentName.positionComponents[wallId] = {x: 50 * x, y: y * 50};
                this.gameState.poolsByComponentName.sizeComponents[wallId] = {size: 50};
                this.gameState.poolsByComponentName.drawableComponents[wallId] = {color: "beige", shape: "SQUARE"};
            }
        }

        // make 4 3x3 plots
        for (let x = -16; x <= -4; x++) {
            for (let y = -18; y >= -22; y -= 2) {
                this.makePlot(x * 50, y * 50);
            }
        }

        // city
        const kitchenId = this.getNextId();
        this.gameState.entityIds[kitchenId] = true;
        this.gameState.poolsByComponentName.positionComponents[kitchenId] = {x: 50 * 15, y: 0 * 50};
        this.gameState.poolsByComponentName.sizeComponents[kitchenId] = {size: 150};
        this.gameState.poolsByComponentName.drawableComponents[kitchenId] = {color: "beige", shape: "SQUARE", label: "Kitchen"};

        // wilderness
        this.makePlot(-150, 150, 150);
    }

    tick() {
        super.tick();
    }

    /**
     * When a player connects, add them here, and also send them the game state.
     * @param {Client} client
     * @param {Packet} packet
     */
    handlePacket(client, packet) {
        if (packet.playerJoinPacket) {
            const playerJoinPacket = packet.playerJoinPacket;
            const playerId = this.getNextId();
            const x = Math.random() * 250 - 125 - 500;
            const y = Math.random() * 250 - 125 - 500;

            const cameraId = this.getNextId();

            var newPlayerEvent;
            newPlayerEvent = {
                playerId: playerId, x: x, y: y, color: playerJoinPacket.color, label: playerJoinPacket.name, cameraId: cameraId, cameraX: x, cameraY: y
            };
            this.players += 1;
            this.handleGameEvent({newPlayerEvent});
            this.connections.set(playerId, client);

            client.handlePacket({
                playerJoinSuccessPacket: {
                    gameState: JSON.parse(JSON.stringify(this.gameState)),
                    playerId: playerId,
                    cameraId: cameraId,
                }
            })
        } else if (packet.gameEvent) {
            this.handleGameEvent(packet.gameEvent);
        }
    }
    
    /**
     * Runs BaseModel.handleGameEvent, then re-broadcasts to everyone, except the sender sometimes.
     * 
     * @param {GameEvent} gameEvent
     */
    handleGameEvent(gameEvent) {
        super.handleGameEvent(gameEvent)

        var eventPlayerId;
        if (!!gameEvent.moveEvent) {
            // Client does client-side movement prediction.
            eventPlayerId = gameEvent.moveEvent.playerId;
        } else if (!!gameEvent.velocityChangeEvent) {
            // Client does client-side movement prediction.
            eventPlayerId = gameEvent.velocityChangeEvent;
        } else if (!!gameEvent.newPlayerEvent) {
            // Client will know about itself after getting the player join success packet
            eventPlayerId = gameEvent.newPlayerEvent.playerId;
        }

        for (const playerId of this.connections.keys()) {
            const connection = this.connections.get(playerId);
            if (!!connection && eventPlayerId != playerId) {
                connection.handlePacket({gameEvent: gameEvent});
            }
        }
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
     * @param {string} up
     * @param {string} down
     * @param {string} left
     * @param {string} right
     * @param {string} name
     * @param {string} color
     */
    constructor(host, up, down, left, right, name, color) {
        super();
        this.host = host;
        this.up = up;
        this.down = down;
        this.left = left;
        this.right = right;
        var data = this.host.handlePacket(this, {playerJoinPacket: {name: name, color: color}});
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
        }
    }

    tick() {
        super.tick();

        if (!this.playerId) {
            return;
        }

        const playerVelocityComponent = this.gameState.poolsByComponentName.velocityComponents[this.playerId];
        if (!playerVelocityComponent) {
            console.log("player velocity component not found!");
        } else {
            const initialVelocity = {x: playerVelocityComponent.x, y: playerVelocityComponent.y}
            // ControllableSystem
            if (this.pressedKeys.has(this.up)) {
                playerVelocityComponent.y = 120;
            } else if (this.pressedKeys.has(this.down)) {
                playerVelocityComponent.y = -120;
            } else {
                playerVelocityComponent.y = 0;
            }
            if (this.pressedKeys.has(this.left)) {
                playerVelocityComponent.x = -120;
            } else if (this.pressedKeys.has(this.right)) {
                playerVelocityComponent.x = 120;
            } else {
                playerVelocityComponent.x = 0;
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

        const entityQuery =
            /** @type {Map<number, [DrawableComponent, PositionComponent, SizeComponent]>} */
            (this.query(["drawableComponents", "positionComponents", "sizeComponents"]));
        for (const [entityId, [drawableComponent, positionComponent, sizeComponent]] of entityQuery) {
            const cameraPositionComponent = !!this.cameraId ? this.gameState.poolsByComponentName.positionComponents[this.cameraId] : undefined;
            if (!cameraPositionComponent) {
                this.drawCircle(drawableComponent, ctx, positionComponent.x, positionComponent.y, 25);
            } else {
                if (drawableComponent.shape === "CIRCLE") {
                    this.drawCircle(
                        drawableComponent,
                        ctx,
                        (canvas.width / 2) - (cameraPositionComponent.x - positionComponent.x) / scale,
                        (canvas.height / 2) + (cameraPositionComponent.y - positionComponent.y) / scale,
                        sizeComponent.size / scale);
                } else if (drawableComponent.shape === "SQUARE") {
                    this.drawSquare(
                        drawableComponent,
                        ctx,
                        (canvas.width / 2) - (cameraPositionComponent.x - positionComponent.x) / scale,
                        (canvas.height / 2) + (cameraPositionComponent.y - positionComponent.y) / scale,
                        sizeComponent.size / scale);
                }

                // If it's a plot, also draw a little corn in it based on age.
                const plotComponent = this.gameState.poolsByComponentName.plotComponents[entityId];
                if (plotComponent) {
                    this.drawCircle(
                        {color: "#ffff00", shape: "CIRCLE"},
                        ctx,
                        (canvas.width / 2) - (cameraPositionComponent.x - positionComponent.x) / scale,
                        (canvas.height / 2) + (cameraPositionComponent.y - positionComponent.y) / scale,
                        sizeComponent.size / scale,
                        plotComponent.age);
                }
            }
        }

        const cornCountElement = document.getElementById("corn-count");
        if (!!cornCountElement && cornCountElement.textContent != this.gameState.cornCount.toString()) {
            cornCountElement.textContent = this.gameState.cornCount.toString();
        }
        const cornSeedCountElement = document.getElementById("corn-seed-count");
        if (!!cornSeedCountElement && cornSeedCountElement.textContent != this.gameState.cornSeeds.toString()) {
            cornSeedCountElement.textContent = this.gameState.cornSeeds.toString();
        }
    }

    /**
     * @param {DrawableComponent} drawableComponent
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} screenX
     * @param {number} screenY
     * @param {number} size
     * @param {number} [age=100]
     */
    drawCircle(drawableComponent, ctx, screenX, screenY, size, age) {
        var agePercentage = 100;
        if (age !== undefined) {
            agePercentage = Math.min(age * 10, 100);
        }
		ctx.beginPath();
		ctx.arc(screenX, screenY, size / 2 * agePercentage / 100, 0, 2 * Math.PI);
		ctx.fillStyle = drawableComponent.color;
		ctx.fill();
		ctx.font = "20px Courier New";
        if (!!drawableComponent.label) {
            const textWidth = ctx.measureText(drawableComponent.label);
		    ctx.fillText(drawableComponent.label, screenX - textWidth.width / 2, screenY - size / 2 - 10);
        }
    }

    /**
     * @param {DrawableComponent} drawableComponent
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} screenX
     * @param {number} screenY
     * @param {number} size
     */
    drawSquare(drawableComponent, ctx, screenX, screenY, size) {
		ctx.beginPath();
		ctx.rect(screenX - size / 2, screenY - size / 2, size, size);
		ctx.fillStyle = drawableComponent.color;
		ctx.fill();
		ctx.font = "20px Courier New";
        if (!!drawableComponent.label) {
            const textWidth = ctx.measureText(drawableComponent.label);
		    ctx.fillText(drawableComponent.label, screenX - textWidth.width / 2, screenY - size / 2 - 10);
        }
    }

    /**
     * Handles when a player left-clicks (i.e. places inventory item, or interacts with entity.)
     * 
     * @param {MouseEvent} clickEvent
     */
    clickHandler(clickEvent) {
        if (!this.playerId) {
            return;
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
        
        // Reject clicks too far away from player.
        const playerPositionComponent = this.gameState.poolsByComponentName.positionComponents[this.playerId];
        if (Math.abs(x - playerPositionComponent.x) > 200 || Math.abs(y - playerPositionComponent.y) > 200) {
            return;
        }

        const entityQuery = /** @type {Map<number, [PositionComponent, SizeComponent]>} */ (this.query(["positionComponents", "sizeComponents"]));
        for (const [entityId, [positionComponent, sizeComponent]] of entityQuery) {
            if (Math.abs(x - positionComponent.x) < sizeComponent.size / 2 && Math.abs(y - positionComponent.y) < sizeComponent.size / 2) {
                this.host.handlePacket(this, {gameEvent: {useEvent: {playerId: this.playerId, targetId: entityId}}});
                return;
            }
        }

        const playerInventory = this.gameState.playerInventories[this.playerId];
        const itemId = playerInventory.at(-1);
        if (itemId) {
            this.host.handlePacket(this, {gameEvent: {buildEvent: {playerId: this.playerId, itemId: itemId, x: x, y: y}}});
        }
    }

    /**
     * Handles when a player right-clicks (i.e. places something).
     *
     * @param {MouseEvent} clickEvent
     */
    auxClickHandler(clickEvent) {
        console.log("aux click!");
        if (!this.playerId) {
            return;
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
        
        // Reject clicks too far away from player.
        const playerPositionComponent = this.gameState.poolsByComponentName.positionComponents[this.playerId];
        if (Math.abs(x - playerPositionComponent.x) > 200 || Math.abs(y - playerPositionComponent.y) > 200) {
            return;
        }

        const entityQuery =
            /** @type {Map<number, [PositionComponent, SizeComponent]>} */
            (this.query(["positionComponents", "sizeComponents"]));
        for (const [entityId, [positionComponent, sizeComponent]] of entityQuery) {
            if (entityId === this.playerId) {
                // can't collect yourself, or else you can't build yourself
                continue;
            }
            if (sizeComponent.size > 50) {
                // too big!
                continue;
            }
            if (Math.abs(x - positionComponent.x) < sizeComponent.size / 2 && Math.abs(y - positionComponent.y) < sizeComponent.size / 2) {
                this.host.handlePacket(this, {gameEvent: {collectEvent: {playerId: this.playerId, itemId: entityId}}});
                return;
            }
        }
    }

    /** @param {KeyboardEvent} keyEvent */
    keydownHandler(keyEvent) {
        const key = String.fromCharCode(keyEvent.keyCode);
        this.pressedKeys.add(key);
    }

    /** @param {KeyboardEvent} keyEvent */
    keyupHandler(keyEvent) {
        const key = String.fromCharCode(keyEvent.keyCode);
        this.pressedKeys.delete(key);
    }
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
 * Represents a Host running on a different process.
 * 
 * @implements {Host}
 */
class RemoteHost {
    /** @type {Client|undefined} */ client;

    /**
     * @param {Connection} connection 
     */
    constructor(connection) {
        this.connection = connection;
    }

    /**
     * Receives a connection request from the given Client, and forwards it to the "real" Host.
     * 
     * (Also saves the Client for subsequent forwarding.)
     * 
     * @param {Client} client
     * @param {Packet} packet
     */
    handlePacket(client, packet) {
        this.connection.send(JSON.stringify(packet));
        this.client = client;
    }

    /**
     * Receives data from the "real" Host, and forwards it to the client.
     * 
     * @param {string} data deserializes into a connectionResponse or a gameEvent. 
     */
    handleData(data) {
        if (!this.client) {
            return;
        }
        this.client.handlePacket(JSON.parse(data));
    }
}