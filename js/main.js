/// <reference path="./component.js" />

/**
 * Represents an authoritative game state.
 * 
 * @interface
 */
class Host {
    /**
     * Handles a request to connect.
     * 
     * @param {Client} client
     */
    handleConnectionRequest(client) {}

    /**
     * Handles a GameEvent. (Maybe should be called handleGameEvent?)
     * 
     * @param {GameEvent} gameEvent
     */
    sendEvent(gameEvent) {}
}

/**
 * @interface
 */
class Client {
    /**
     * Handles a GameEvent. (Maybe should be called handleGameEvent?)
     * 
     * @param {GameEvent} gameEvent
     */
    sendEvent(gameEvent) {}

    /**
     * Handles a response for connection.
     * @param {ConnectionData} data
     */
    handleConnectionResponse(data) {}
}

/**
 * @typedef {Object} GameState
 * @property {number} frameCount
 * @property {FullComponentPool} poolsByComponentName
 * @property {Object<number, boolean>} entityIds
 * @property {number} cornCount
 * @property {number} cornSeeds
 */

/**
 * Contains common Game Engine code.
 */
class BaseModel {
    /** @type {GameState} */
    gameState = {
        frameCount: 0,
        poolsByComponentName: FullComponentPools.newComponentPool(),
        entityIds: {},
        cornCount: 5,
        cornSeeds: 5,
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
        console.log(this.gameState);
        for (const [_, ageableComponent] of Object.entries(this.gameState.poolsByComponentName.ageableComponents)) {
            ageableComponent.age += this.TIME_STEP;
        }
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    makeCorn(x, y) {
        this.gameState.cornSeeds -= 1;
        const cornId = this.getNextId();
        this.gameState.entityIds[cornId] = true;
        this.gameState.poolsByComponentName.positionComponents[cornId] = {x: x, y: y};
        this.gameState.poolsByComponentName.drawableComponents[cornId] = {color: "#ffff00"};
        this.gameState.poolsByComponentName.ageableComponents[cornId] = {age: 0};
        this.gameState.poolsByComponentName.harvestableComponents[cornId] = {};
    }

    /** @param {GameEvent} gameEvent */
    sendEvent(gameEvent) {
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
        } else if (!!gameEvent.harvestEvent) {
            this.deleteEntity(gameEvent.harvestEvent.harvestableId);
            this.gameState.cornCount += 1
            this.gameState.cornSeeds += 2;
        } else if (!!gameEvent.plantEvent) {
            this.makeCorn(gameEvent.plantEvent.x, gameEvent.plantEvent.y);
        } else if (!!gameEvent.newPlayerEvent) {
            this.gameState.entityIds[gameEvent.newPlayerEvent.playerId] = true;
            this.gameState.poolsByComponentName.positionComponents[gameEvent.newPlayerEvent.playerId] = {x: gameEvent.newPlayerEvent.x, y: gameEvent.newPlayerEvent.y};
            this.gameState.poolsByComponentName.velocityComponents[gameEvent.newPlayerEvent.playerId] = {x: 0, y: 0}
            this.gameState.poolsByComponentName.drawableComponents[gameEvent.newPlayerEvent.playerId] = {color: gameEvent.newPlayerEvent.color, label: gameEvent.newPlayerEvent.label};
            this.gameState.entityIds[gameEvent.newPlayerEvent.cameraId] = true;
            this.gameState.poolsByComponentName.positionComponents[gameEvent.newPlayerEvent.cameraId] = {x: 10, y: 10};
            this.gameState.poolsByComponentName.followPlayerComponents[gameEvent.newPlayerEvent.cameraId] = {maxDistanceFromPlayer: 150, followingId: gameEvent.newPlayerEvent.playerId};
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
        this.makeCorn(Math.random() * 500 - 250, Math.random() * 500 - 250);
        this.makeCorn(Math.random() * 500 - 250, Math.random() * 500 - 250);
        this.makeCorn(Math.random() * 500 - 250, Math.random() * 500 - 250);
        this.makeCorn(Math.random() * 500 - 250, Math.random() * 500 - 250);
    }

    tick() {
        super.tick();
    }

    /**
     * When a player connects, add them here, and also send them the game state.
     * @param {Client} client
     */
    handleConnectionRequest(client) {
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
        this.connections.set(playerId, client);

        client.handleConnectionResponse([JSON.stringify(this.gameState), playerId, cameraId]);
    }
    
    /** @param {GameEvent} gameEvent */
    sendEvent(gameEvent) {
        super.sendEvent(gameEvent)
        for (const playerId of this.connections.keys()) {
            const connection = this.connections.get(playerId);
            var eventPlayerId;
            if (!!gameEvent.moveEvent) {
                eventPlayerId = gameEvent.moveEvent.playerId;
            } else if (!!gameEvent.velocityChangeEvent) {
                eventPlayerId = gameEvent.velocityChangeEvent;
            } else if (!!gameEvent.harvestEvent) {
                eventPlayerId = gameEvent.harvestEvent.playerId;
            } else if (!!gameEvent.plantEvent) {
                eventPlayerId = gameEvent.plantEvent.playerId;
            } else if (!!gameEvent.newPlayerEvent) {
                eventPlayerId = gameEvent.newPlayerEvent.playerId;
            } else {
                console.log("unrecognized game event!!");
                console.log(gameEvent);
            }
            if (!!connection && eventPlayerId != playerId) {
                connection.sendEvent(gameEvent);
            }
        }
    }
}

/**
 * @typedef {[string, number, number]} ConnectionData
 */

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
     */
    constructor(host, up, down, left, right) {
        super();
        this.host = host;
        this.up = up;
        this.down = down;
        this.left = left;
        this.right = right;
        var data = this.host.handleConnectionRequest(this);
    }

    /**
     * @param {ConnectionData} data 
     */
    handleConnectionResponse(data) {
        this.gameState = JSON.parse(data[0]);
        this.playerId = data[1];
        this.cameraId = data[2];
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
                playerVelocityComponent.y = -120;
            } else if (this.pressedKeys.has(this.down)) {
                playerVelocityComponent.y = 120;
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
                this.host.sendEvent({velocityChangeEvent: {playerId: this.playerId, x: playerVelocityComponent.x, y: playerVelocityComponent.y}});
            }
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
            const cameraPositionComponent = !!this.cameraId ? this.gameState.poolsByComponentName.positionComponents[this.cameraId] : undefined;
            if (!cameraPositionComponent) {
                this.drawCircle(drawableComponent, ctx, positionComponent.x, positionComponent.y);
            } else {
                const ageableComponent = this.gameState.poolsByComponentName.ageableComponents[entityId];
                const age = !!ageableComponent ? ageableComponent.age : undefined;
                this.drawCircle(
                    drawableComponent,
                    ctx,
                    (window.innerWidth / 4) - (cameraPositionComponent.x - positionComponent.x),
                    (window.innerHeight / 4) - (cameraPositionComponent.y - positionComponent.y),
                    age);
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
                    delete this.gameState.poolsByComponentName.positionComponents[entityId];
                    delete this.gameState.poolsByComponentName.drawableComponents[entityId];
                    delete this.gameState.poolsByComponentName.ageableComponents[entityId];
                    delete this.gameState.poolsByComponentName.harvestableComponents[entityId];
                    this.gameState.cornCount += 1
                    this.gameState.cornSeeds += 2;
                    this.host.sendEvent({harvestEvent: {playerId: this.playerId, harvestableId: entityId}});
                }
                return;
            }
        }
        
        // Otherwise, plant.
        const playerPositionComponent = this.gameState.poolsByComponentName.positionComponents[this.playerId];
        if (Math.abs(x - playerPositionComponent.x) < 200 && Math.abs(y - playerPositionComponent.y) < 200) {
            if (this.gameState.cornSeeds > 0) {
                this.makeCorn(x, y);
                this.host.sendEvent({plantEvent: {playerId: this.playerId, x: x, y: y}});
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

class BaseRemote {   
    /**
     * @param {Connection} connection
     */
    constructor(connection) {
        this.connection = connection;
    }
    /**
     * @param {GameEvent} gameEvent
     */
    sendEvent(gameEvent) {
        this.connection.send(JSON.stringify({gameEvent: gameEvent}))
    }
}

/**
 * Represents a Client running on a different process.
 * 
 * @implements {Client}
 */
class RemoteClient extends BaseRemote {
    /**
     * @param {Host} host
     * @param {Connection} connection
     */
    constructor(host, connection) {
        super(connection);
        this.host = host;
    }

    /**
     * Receives ConnectionData from the Host, and forwards it to the "real" Client.
     * 
     * @param {ConnectionData} data 
     */
    handleConnectionResponse(data) {
        this.connection.send(JSON.stringify(data))
    }

    /**
     * Receives data from the "real" Client, and forwards it to the Host.
     * 
     * @param {string} data should deserialize into a connectionRequest or a gameEvent.
     */
    handleData(data) {
        const parsedData = JSON.parse(data);
        if (parsedData === "connect-me") {
            this.host.handleConnectionRequest(this);
        } else {
            this.host.sendEvent(parsedData.gameEvent);
        }
    }
}

/**
 * Represents a Host running on a different process.
 * 
 * @implements {Host}
 */
class RemoteHost extends BaseRemote {
    /** @type {Client|undefined} */ client;

    /**
     * Receives a connection request from the given Client, and forwards it to the "real" Host.
     * 
     * (Also saves the Client for subsequent forwarding.)
     * 
     * @param {Client} client 
     */
    handleConnectionRequest(client) {
        this.connection.send(JSON.stringify("connect-me"));
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
        const parsedData = JSON.parse(data);
        if (!!parsedData["gameEvent"]) {
            this.client.sendEvent(parsedData.gameEvent);
        } else {
            // assume initial connection data
            this.client.handleConnectionResponse(parsedData);
        }
    }
}

/**
 * @typedef {Object} GameEvent
 * @property {NewPlayerEvent=} newPlayerEvent
 * @property {MoveEvent=} moveEvent
 * @property {VelocityChangeEvent=} velocityChangeEvent
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
 * @typedef {Object} VelocityChangeEvent
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