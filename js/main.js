/**
 * @typedef {Object} FullComponentPool
 * @property {Object.<number, PositionComponent>} positionComponents
 * @property {Object.<number, DrawableComponent>} drawableComponents
 * @property {Object.<number, FollowPlayerComponent>} followPlayerComponents
 * @property {Object.<number, AgeableComponent>} ageableComponents
 * @property {Object.<number, HarvestableComponent>} harvestableComponents
 */

class BaseModel {
    debugName = "ERROR";

    cornCount = 0;
    cornSeeds = 5;

    // entity creation
    /** @type {Set<number>} */ entityIds = new Set();

    // component pools
    /** @type {FullComponentPool} */ poolsByComponentName = {
        positionComponents: {},
        drawableComponents: {},
        followPlayerComponents: {},
        ageableComponents: {},
        harvestableComponents: {},
    };

    /** @type {GameEvent[]} */
    events = [];
    
    getNextId() {
        const nextId = this.entityIds.size;
        this.entityIds.add(nextId);
        return nextId;
    }

    /**
     * @param {("positionComponents"|"drawableComponents"|"followPlayerComponents"|"ageableComponents"|"harvestableComponents")[]} componentNames
     */
    query(componentNames) {
        /** @type {Map<number, Component[]>} */
        const entities = new Map();
        for (const entityId of this.entityIds.keys()) {
            const components = [];
            for (const componentName of componentNames) {
                const componentPool = this.poolsByComponentName[componentName];
                if (!componentPool) {
                    break;
                }
                const component = componentPool[entityId];
                if (!component) {
                    break;
                }
                components.push(component);
            }
            if (components.length == componentNames.length) {
                entities.set(entityId, components);
            }
        }
        return entities;
    }

    tick() {
        // FollowPlayerSystem
        const entityQuery =
            /** @type {Map<number, [FollowPlayerComponent, PositionComponent]>} */
            (this.query(["followPlayerComponents", "positionComponents"]));
        for (const [_, [followPlayerComponent, positionComponent]] of entityQuery) {
            const maxDistanceFromPlayer = followPlayerComponent.maxDistanceFromPlayer;
            const playerPositionComponent = this.poolsByComponentName.positionComponents[followPlayerComponent.followingId];
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
        for (const [_, ageableComponent] of Object.entries(this.poolsByComponentName.ageableComponents)) {
            ageableComponent.age += 0.01;
        }
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    makeCorn(x, y) {
        const cornId = this.getNextId();
        this.entityIds.add(cornId);
        this.poolsByComponentName.positionComponents[cornId] = {x: x, y: y};
        this.poolsByComponentName.drawableComponents[cornId] = {color: "#ffff00"};
        this.poolsByComponentName.ageableComponents[cornId] = {age: 0};
        this.poolsByComponentName.harvestableComponents[cornId] = {};
    }

    /** @param {GameEvent} gameEvent */
    sendEvent(gameEvent) {
        if (!!gameEvent.moveEvent) {
            const playerPositionComponent = this.poolsByComponentName.positionComponents[gameEvent.moveEvent.playerId];
            if (playerPositionComponent) {
                playerPositionComponent.x = gameEvent.moveEvent.x;
                playerPositionComponent.y = gameEvent.moveEvent.y;
            }
        } else if (!!gameEvent.harvestEvent) {
            delete this.poolsByComponentName.positionComponents[gameEvent.harvestEvent.harvestableId];
            delete this.poolsByComponentName.drawableComponents[gameEvent.harvestEvent.harvestableId];
            delete this.poolsByComponentName.ageableComponents[gameEvent.harvestEvent.harvestableId];
            delete this.poolsByComponentName.harvestableComponents[gameEvent.harvestEvent.harvestableId];
            this.cornCount += 1
            this.cornSeeds += 2;
        } else if (!!gameEvent.plantEvent) {
            this.makeCorn(gameEvent.plantEvent.x, gameEvent.plantEvent.y);
        } else if (!!gameEvent.newPlayerEvent) {
            this.entityIds.add(gameEvent.newPlayerEvent.playerId);
            this.poolsByComponentName.positionComponents[gameEvent.newPlayerEvent.playerId] = {x: gameEvent.newPlayerEvent.x, y: gameEvent.newPlayerEvent.y};
            this.poolsByComponentName.drawableComponents[gameEvent.newPlayerEvent.playerId] = {color: gameEvent.newPlayerEvent.color, label: gameEvent.newPlayerEvent.label};
            this.entityIds.add(gameEvent.newPlayerEvent.cameraId);
            this.poolsByComponentName.positionComponents[gameEvent.newPlayerEvent.cameraId] = {x: 10, y: 10};
            this.poolsByComponentName.followPlayerComponents[gameEvent.newPlayerEvent.cameraId] = {maxDistanceFromPlayer: 150, followingId: gameEvent.newPlayerEvent.playerId};
        } else {
            console.log("unrecognized game event!!");
        }
    }
}

/**
 * Game engine. Just a big-ass bag of Entities and a camera.
 */
class HostModel extends BaseModel {
    debugName = "HOST"

    players = 0;

    /** @type {Map<number, ClientModel>} */
    connections = new Map();

    constructor() {
        super();
        this.makeCorn(Math.random() * 500 - 250, Math.random() * 500 - 250);
        this.makeCorn(Math.random() * 500 - 250, Math.random() * 500 - 250);
        this.makeCorn(Math.random() * 500 - 250, Math.random() * 500 - 250);
        this.makeCorn(Math.random() * 500 - 250, Math.random() * 500 - 250);
    }

    /**
     * When a player connects, add them here, and also send them the game state.
     * @param {ClientModel} clientModel
     */
    connect(clientModel) {
        const playerId = this.getNextId();
        const x = Math.random() * 500 - 250;
        const y = Math.random() * 500 - 250;

        const cameraId = this.getNextId();

        var newPlayerEvent;
        if (this.players == 0) {
            newPlayerEvent = {newPlayerEvent: {playerId: playerId, x: x, y: y, color: "#7b00ffff", label: "Lilian <3", cameraId: cameraId, cameraX: 10, cameraY: 10}};
            this.players += 1;
        } else {
            newPlayerEvent = {newPlayerEvent: {playerId: playerId, x: x, y: y, color: "#262fb1", label: "Kevin :)", cameraId: cameraId, cameraX: 10, cameraY: 10}};
            this.players += 1;
        }
        this.sendEvent(newPlayerEvent);
        for (const connection of this.connections.values()) {
            connection.sendEvent(newPlayerEvent);
        }
        this.connections.set(playerId, clientModel);

        clientModel.connect([JSON.stringify(this.poolsByComponentName), JSON.stringify([...this.entityIds]), playerId, cameraId]);
    }
    
    /** @param {GameEvent} gameEvent */
    sendEvent(gameEvent) {
        super.sendEvent(gameEvent)
        for (const playerId of this.connections.keys()) {
            const connection = this.connections.get(playerId);
            var eventPlayerId;
            if (!!gameEvent.moveEvent) {
                eventPlayerId = gameEvent.moveEvent.playerId;
            } else if (!!gameEvent.harvestEvent) {
                eventPlayerId = gameEvent.harvestEvent.playerId;
            } else if (!!gameEvent.plantEvent) {
                eventPlayerId = gameEvent.plantEvent.playerId;
            } else if (!!gameEvent.newPlayerEvent) {
                eventPlayerId = gameEvent.newPlayerEvent.playerId;
            } else {
                console.log("unrecognized game event!!");
            }
            if (!!connection && eventPlayerId != playerId) {
                connection.sendEvent(gameEvent);
            }
        }
    }
}

class ClientModel extends BaseModel {
    debugName = "CLIENT"
    // game state
    pressedKeys = new Set();

    // singleton entities
    /** @type {number|undefined} */ playerId;
    /** @type {number|undefined} */ cameraId;

    /**
     * @param {HostModel} model 
     */
    constructor(model, up, down, left, right) {
        super();
        this.model = model;
        this.up = up;
        this.down = down;
        this.left = left;
        this.right = right;
        var data = this.model.connect(this);
    }

    connect(data) {
        this.poolsByComponentName = JSON.parse(data[0]);
        this.entityIds = new Set(JSON.parse(data[1]));
        this.playerId = data[2];
        this.cameraId = data[3];
    }

    tick() {
        super.tick();

        const playerPositionComponent = this.poolsByComponentName.positionComponents[this.playerId];
        if (!!playerPositionComponent && this.pressedKeys.size > 0) {
            // ControllableSystem
            if (this.pressedKeys.has(this.up)) {
                playerPositionComponent.y -= 2;
            }
            if (this.pressedKeys.has(this.down)) {
                playerPositionComponent.y += 2;
            }
            if (this.pressedKeys.has(this.left)) {
                playerPositionComponent.x -= 2;
            }
            if (this.pressedKeys.has(this.right)) {
                playerPositionComponent.x += 2;
            }
            this.model.sendEvent({moveEvent: {playerId: this.playerId, x: playerPositionComponent.x, y: playerPositionComponent.y}});
        }
    }

    /** @param {HTMLCanvasElement} canvas */
    draw(canvas) {
        const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext("2d"));
        canvas.width = window.innerWidth / 2;
        canvas.height = window.innerHeight / 2;
        ctx.fillStyle = "#888888";
		ctx.fillRect( 0 , 0 , window.innerWidth / 2, window.innerHeight / 2);

        const entityQuery =
            /** @type {Map<number, [DrawableComponent, PositionComponent]>} */
            (this.query(["drawableComponents", "positionComponents"]));
        for (const [entityId, [drawableComponent, positionComponent]] of entityQuery) {
            if (entityId == this.cameraId) {
                continue;
            }
            const cameraPositionComponent = this.poolsByComponentName.positionComponents[this.cameraId];
            if (!cameraPositionComponent) {
                this.drawCircle(drawableComponent, ctx, positionComponent.x, positionComponent.y);
            } else {
                const ageableComponent = this.poolsByComponentName.ageableComponents[entityId];
                const age = !!ageableComponent ? ageableComponent.age : undefined;
                this.drawCircle(
                    drawableComponent,
                    ctx,
                    (window.innerWidth / 4) - (cameraPositionComponent.x - positionComponent.x),
                    (window.innerHeight / 4) - (cameraPositionComponent.y - positionComponent.y),
                    age);
            }
        }

        if (document.getElementById("corn-count").textContent != this.cornCount.toString()) {
            document.getElementById("corn-count").textContent = this.cornCount.toString();
        }
        if (document.getElementById("corn-seed-count").textContent != this.cornSeeds.toString()) {
            document.getElementById("corn-seed-count").textContent = this.cornSeeds.toString();
        }
    }

    /**
     * @param {DrawableComponent} drawableComponent
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} screenX
     * @param {number} screenY
     * @param {number} [age=2 * Math.PI]
     */
    drawCircle(drawableComponent, ctx, screenX, screenY, age) {
        if (age == undefined) {
            age = 2 * Math.PI;
        }
		ctx.beginPath();
		ctx.arc(screenX, screenY, 25, 0, age);
		ctx.fillStyle = drawableComponent.color;
		ctx.fill();
		ctx.font = "20px Courier New";
        if (!!drawableComponent.label) {
		    ctx.fillText(drawableComponent.label, screenX - 50, screenY - 30);
        }
    }

    /** @param {MouseEvent} clickEvent */
    clickHandler(clickEvent) {
        // first, try to determine where the user is clicking.
        var x;
        var y;
        const cameraPositionComponent = this.poolsByComponentName.positionComponents[this.cameraId];
        if (!cameraPositionComponent) {
            x = clickEvent.offsetX;
            y = clickEvent.offsetY;
        } else {
            x = clickEvent.offsetX - window.innerWidth / 4 + cameraPositionComponent.x
            y = clickEvent.offsetY - window.innerHeight / 4 + cameraPositionComponent.y
        }
        
        // HarvestableSystem -- takes priority
        const entityQuery =
            /** @type {Map<number, [HarvestableComponent, PositionComponent, AgeableComponent]>} */
            (this.query(["harvestableComponents", "positionComponents", "ageableComponents"]));
        for (const [entityId, [_, positionComponent, ageableComponent]] of entityQuery) {
            if (Math.abs(x - positionComponent.x) < 25 && Math.abs(y - positionComponent.y) < 25) {
                if (ageableComponent.age >= Math.PI * 2) {
                    delete this.poolsByComponentName.positionComponents[entityId];
                    delete this.poolsByComponentName.drawableComponents[entityId];
                    delete this.poolsByComponentName.ageableComponents[entityId];
                    delete this.poolsByComponentName.harvestableComponents[entityId];
                    this.cornCount += 1
                    this.cornSeeds += 2;
                    this.model.sendEvent({harvestEvent: {playerId: this.playerId, harvestableId: entityId}});
                }
                return;
            }
        }
        
        // Otherwise, plant.
        const playerPositionComponent = this.poolsByComponentName.positionComponents[this.playerId];
        if (Math.abs(x - playerPositionComponent.x) < 200 && Math.abs(y - playerPositionComponent.y) < 200) {
            if (this.cornSeeds > 0) {
                this.cornSeeds -= 1;
                this.makeCorn(x, y);
                this.model.sendEvent({plantEvent: {playerId: this.playerId, x: x, y: y}});
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
 * @typedef {Object} Connection
 * @property {function(string): void} send
 */

class RemoteClient {
    /**
     * @param {HostModel} model 
     * @param {Connection} incomingConn
     */
    constructor(model, incomingConn) {
        this.model = model;
        this.incomingConn = incomingConn;
    }

    /**
     * @param {*} data 
     */
    connect(data) {
        this.incomingConn.send(JSON.stringify(data))
    }

    /**
     * @param {GameEvent} gameEvent 
     */
    sendEvent(gameEvent) {
        this.incomingConn.send(JSON.stringify({gameEvent: gameEvent}));
    }

    handleData(data) {
        const parsedData = JSON.parse(data);
        if (parsedData === "connect-me") {
            this.model.connect(this);
        } else {
            this.model.sendEvent(parsedData.gameEvent);
        }
    }
}

class RemoteHost {
    /**
     * 
     * @param {*} connection 
     */
    constructor(connection) {
        this.connection = connection;
    }

    /**
     * @param {ClientModel} clientModel 
     */
    connect(clientModel) {
        this.connection.send(JSON.stringify("connect-me"));
        this.clientModel = clientModel;
    }

    sendEvent(gameEvent) {
        console.log("Sending over game event!");
        this.connection.send(JSON.stringify({gameEvent: gameEvent}))
    }

    handleData(data) {
        const parsedData = JSON.parse(data);
        if (!!parsedData["gameEvent"]) {
            this.clientModel.sendEvent(parsedData.gameEvent);
        } else {
            // assume initial connection data
            this.clientModel.connect(parsedData);
        }
    }
}

/**
 * @typedef {Object} GameEvent
 * @property {NewPlayerEvent=} newPlayerEvent
 * @property {MoveEvent=} moveEvent
 * @property {HarvestEvent=} harvestEvent
 * @property {PlantEvent=} plantEvent
 */

/**
 * @typedef {Object} NewPlayerEvent
 * @property {number} playerId 
 * @property {number} x 
 * @property {number} y 
 * @property {string} color
 * @property {string} label
 * @property {number} cameraId
 * @property {number} cameraX
 * @property {number} cameraY
 */

/**
 * @typedef {Object} MoveEvent
 * @property {number} playerId
 * @property {number} x
 * @property {number} y
 */


/**
 * @typedef {Object} HarvestEvent
 * @property {number} playerId
 * @property {number} harvestableId
 */

/**
 * @typedef {Object} PlantEvent
 * @property {number} playerId
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} Component
 */

/**
 * @typedef {Object} PositionComponent
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} DrawableComponent
 * @property {string} color
 * @property {string=} label
 */

/**
 * @typedef {Object} FollowPlayerComponent
 * @property {number} maxDistanceFromPlayer
 * @property {number} followingId
 */

/**
 * @typedef {Object} AgeableComponent
 * @property {number} age
 */

/**
 * @typedef {Object} HarvestableComponent
 */