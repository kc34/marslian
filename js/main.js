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
        playerInventories: {},
    }
    TIME_STEP = 1 / 60.0

    debugName = "ERROR";

    /** @type {GameEvent[]} */
    events = [];
    
    /** Reserves and returns the next Entity ID. */
    popNextId() {
        var highestId = -1;
        for (const id of Object.keys(this.gameState.entityIds)) {
            if (parseInt(id) > highestId) {
                highestId = parseInt(id);
            }
        }
        const nextId = highestId + 1;
        this.gameState.entityIds[nextId] = true;
        return nextId;
    }

    /**
     * @param {ComponentName[]} componentNames
     * @returns {Map<number, EntityComponents>}
     */

    /**
     * @template {keyof EntityComponents} K
     * @param {K[]} componentNames
     * @returns {Map<number, Omit<EntityComponents, K> & Required<Pick<EntityComponents, K>>>}
     */
    query(componentNames) {
        /** @type {Map<number, EntityComponents>} */
        if (componentNames.length == 0) {
            return new Map();
        }
        let entityIds = new Set(Object.keys(this.gameState.poolsByComponentName[componentNames[0] + 's']));
        for (let i = 1; i < componentNames.length; i++) {
            entityIds = entityIds.intersection(new Set(Object.keys(this.gameState.poolsByComponentName[componentNames[i] + 's'])));
        }
        let entityComponents = new Map();
        for (const entityId of entityIds) {
            entityComponents.set(parseInt(entityId), this.getEntityComponents(parseInt(entityId)));
        }
        return entityComponents;
    }

    /**
     * @param {number} entityId 
     * @param {EntityComponents} entityComponents 
     */
    setEntityComponents(entityId, entityComponents) {
        for (const [componentName, component] of Object.entries(entityComponents)) {
            this.gameState.poolsByComponentName[componentName + 's'][entityId] = component;
        }
    }

    /**
     * @param {number} entityId 
     * @returns {EntityComponents} 
     */
    getEntityComponents(entityId) {
        /** @type {EntityComponents} */
        const entityComponents = {}
        for (const [componentNamePlural, componentPool] of Object.entries(this.gameState.poolsByComponentName)) {
            entityComponents[componentNamePlural.slice(0, -1)] = componentPool[entityId];
        }
        return entityComponents;
    }

    tick() {
        this.gameState.frameCount += 1;
        const velocityEntityQuery = this.query(["velocityComponent", "positionComponent"]);
        for (const [_, {velocityComponent, positionComponent}] of velocityEntityQuery) {
            positionComponent.x += velocityComponent.x * this.TIME_STEP;
            positionComponent.y += velocityComponent.y * this.TIME_STEP;
        }

        // FollowPlayerSystem
        const followPlayerEntityQuery = this.query(["followPlayerComponent", "positionComponent"]);
        for (const [_, {followPlayerComponent, positionComponent}] of followPlayerEntityQuery) {
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
        const ageableQuery = this.query(["ageableComponent"]);
        for (const [entityId, {ageableComponent, positionComponent}] of ageableQuery) {
            ageableComponent.age += this.TIME_STEP;

            if (!positionComponent) {
                continue;
            }
            if (this.getEntityComponents(entityId).drawableComponent?.label === "Slime Spawner") {
                if (Math.floor(ageableComponent.age / 5) > Math.floor((ageableComponent.age - this.TIME_STEP) / 5)) {
                    const seed = Math.floor(ageableComponent.age / 5);
                    const dx = Math.sin(seed * seed);
                    const dy = Math.cos(seed * seed);
                    const slimeId = this.popNextId();
                    this.setEntityComponents(
                        slimeId,
                        {
                            positionComponent: {x: positionComponent.x + dx * 250, y: positionComponent.y + dy * 250},
                            sizeComponent: {size: 25},
                            drawableComponent: {color: "lightgreen", shape: "CIRCLE", label: "slime"},
                            hurtboxComponent: {radius: 12.5, maxHealth: 10, currentHealth: 10}
                        });
                }
            }
        }

        const hitboxEntities = this.query(["hitboxComponent", "positionComponent"]);
        for (const [hitEntity, {hitboxComponent, positionComponent: hitPositionComponent}] of hitboxEntities) {
            const hurtboxEntities = this.query(["hurtboxComponent", "positionComponent"]);
            for (const [hurtEntity, {hurtboxComponent, positionComponent: hurtPositionComponent}] of hurtboxEntities) {
                const distance = 
                    Math.pow(Math.pow(hurtPositionComponent.x - hitPositionComponent.x, 2) + Math.pow(hurtPositionComponent.y - hitPositionComponent.y, 2), 0.5);
                if (distance < hurtboxComponent.radius + hitboxComponent.radius) {
                    hurtboxComponent.currentHealth -= hitboxComponent?.damage;
                    delete this.gameState.entityIds[hitEntity];
                    for (const [_, componentPool] of Object.entries(this.gameState.poolsByComponentName)) {
                        delete componentPool[hitEntity];
                    }
                    
                    const hurtEntityComponents = this.getEntityComponents(hurtEntity);
                    if (hurtEntityComponents.drawableComponent?.label === "Slime Spawner") {
                        const seed = hurtEntityComponents.ageableComponent.age;
                        const dx = Math.sin(seed * seed);
                        const dy = Math.cos(seed * seed);
                        const slimeId = this.popNextId();
                        this.setEntityComponents(
                            slimeId,
                            {
                                positionComponent: {x: hurtEntityComponents.positionComponent.x + dx * 250, y: hurtEntityComponents.positionComponent.y + dy * 250},
                                sizeComponent: {size: 25},
                                drawableComponent: {color: "lightgreen", shape: "CIRCLE", label: "slime"},
                                hurtboxComponent: {radius: 12.5, maxHealth: 10, currentHealth: 10}
                            });
                    }
                }
                if (hurtboxComponent.currentHealth <= 0) {
                    delete this.gameState.entityIds[hurtEntity];
                    for (const [_, componentPool] of Object.entries(this.gameState.poolsByComponentName)) {
                        delete componentPool[hurtEntity];
                    }
                }
            }
        }
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} [size=50]
     */
    makePlot(x, y, size = 50) {
        const plotId = this.popNextId();
        this.setEntityComponents(
            plotId,
            {
                positionComponent: {x: x, y: y},
                sizeComponent: {size: size},
                drawableComponent: {color: "#832a2a", shape: "PLOT", secondColor: "yellow"},
                ageableComponent: {age: 0},
                interactableComponent: {behavior: "PLOT"},
                usableComponent: {behavior: "BUILD"},
            });
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} [size=50]
     */
    makeTree(x, y, size = 50) {
        const treeId = this.popNextId();
        this.setEntityComponents(
            treeId,
            {
                positionComponent: {x: x, y: y},
                sizeComponent: {size: size},
                drawableComponent: {color: "brown", shape: "TREE"},
                ageableComponent: {age: 0},
                interactableComponent: {behavior: "TREE"},
                usableComponent: {behavior: "BUILD"},
            });
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
            // Server reserved Player IDs, but hosts might not, so reserve it again:
            this.gameState.entityIds[gameEvent.newPlayerEvent.playerId] = true;
            this.gameState.entityIds[gameEvent.newPlayerEvent.cameraId] = true;
            // newPlayerEvent.playerId
            this.setEntityComponents(
                gameEvent.newPlayerEvent.playerId,
                {
                    positionComponent: {x: gameEvent.newPlayerEvent.x, y: gameEvent.newPlayerEvent.y},
                    sizeComponent: {size: 50},
                    velocityComponent: {x: 0, y: 0},
                    drawableComponent: {color: gameEvent.newPlayerEvent.color, label: gameEvent.newPlayerEvent.label, shape: "CIRCLE"},
                    usableComponent: {behavior: "BUILD"},
                });
            this.setEntityComponents(
                gameEvent.newPlayerEvent.cameraId,
                {
                    positionComponent: {x: gameEvent.newPlayerEvent.cameraX, y: gameEvent.newPlayerEvent.cameraY},
                    followPlayerComponent: {maxDistanceFromPlayer: 150, followingId: gameEvent.newPlayerEvent.playerId},
                    usableComponent: {behavior: "BUILD"},
                });
            this.gameState.playerInventories[gameEvent.newPlayerEvent.playerId] = [-1];
        } else if (!!gameEvent.useEvent) {
            const playerId = gameEvent.useEvent.playerId;
            const targetId = gameEvent.useEvent.targetId;
            // Reject clicks too far away from player.
            const playerPositionComponent = this.gameState.poolsByComponentName.positionComponents[playerId];
            const targetPositionComponent = this.gameState.poolsByComponentName.positionComponents[targetId];
            if (!playerPositionComponent) {
                return;
            }
            if (Math.abs(targetPositionComponent.x - playerPositionComponent.x) > 200 || Math.abs(targetPositionComponent.y - playerPositionComponent.y) > 200) {
                return;
            }

            if (this.gameState.poolsByComponentName.interactableComponents[targetId]?.behavior == "PLOT") {
                const ageableComponent = this.gameState.poolsByComponentName.ageableComponents[targetId];
                if (ageableComponent.age > 10) {
                    const cornId = this.popNextId();
                    this.setEntityComponents(
                        cornId,
                        {
                            sizeComponent: {size: this.gameState.poolsByComponentName.sizeComponents[targetId].size},
                            drawableComponent: {color: "yellow", shape: "CIRCLE"},
                            usableComponent: {behavior: "BUILD"},
                        });
                    this.gameState.playerInventories[gameEvent.useEvent.playerId].push(cornId);
                    ageableComponent.age = 0;
                }
            } else if (this.gameState.poolsByComponentName.interactableComponents[targetId]?.behavior == "TREE") {
                const ageableComponent = this.gameState.poolsByComponentName.ageableComponents[targetId];
                if (ageableComponent.age > 10) {
                    const woodId = this.popNextId();
                    // trees are big so we make the wood half as big
                    this.setEntityComponents(
                        woodId,
                        {
                            sizeComponent: {size: this.gameState.poolsByComponentName.sizeComponents[targetId].size / 2},
                            drawableComponent: {color: "brown", shape: "SQUARE"},
                            usableComponent: {behavior: "BUILD"},
                        });
                    this.gameState.playerInventories[gameEvent.useEvent.playerId].push(woodId);
                    ageableComponent.age = 0;
                }
            } else if (this.gameState.poolsByComponentName.interactableComponents[targetId]?.behavior == "WORKSHOP") {
                const bowId = this.popNextId();
                this.setEntityComponents(
                        bowId,
                        {
                            drawableComponent: {color: "black", shape: "?", label: "bow"},
                            usableComponent: {behavior: "BOW"},
                        });
                this.gameState.playerInventories[gameEvent.useEvent.playerId].push(bowId);
            }
        } else if (!!gameEvent.collectEvent) {
            const playerId = gameEvent.collectEvent.playerId;
            const itemId = gameEvent.collectEvent.itemId;
            // Reject clicks too far away from player.
            const playerPositionComponent = this.gameState.poolsByComponentName.positionComponents[playerId];
            const targetPositionComponent = this.gameState.poolsByComponentName.positionComponents[itemId];
            if (!playerPositionComponent) {
                return;
            }
            if (Math.abs(targetPositionComponent.x - playerPositionComponent.x) > 200 || Math.abs(targetPositionComponent.y - playerPositionComponent.y) > 200) {
                return;
            }
            // remove entity from world, and put in player inventory
            delete this.gameState.poolsByComponentName.positionComponents[itemId];
            if (!this.gameState.playerInventories[playerId]) {
                this.gameState.playerInventories[playerId] = [-1];
            }
            this.gameState.playerInventories[playerId].push(itemId);
        } else if (!!gameEvent.buildEvent) {
            // for now, use the buildEvent as the general left-click
            
            // if bow, we don't want to actually build it
            if (this.gameState.poolsByComponentName.usableComponents[gameEvent.buildEvent.itemId]?.behavior == "BOW") {
                const playerPositionComponent = this.gameState.poolsByComponentName.positionComponents[gameEvent.buildEvent.playerId];
                const distance = Math.pow(Math.pow(gameEvent.buildEvent.x - playerPositionComponent.x, 2) + Math.pow(gameEvent.buildEvent.y - playerPositionComponent.y, 2), 0.5); // used for norming
                const arrow = this.popNextId();
                this.setEntityComponents(
                    arrow,
                    {
                        positionComponent: {x: playerPositionComponent.x, y: playerPositionComponent.y},
                        sizeComponent: {size: 5},
                        velocityComponent: {
                            x: (gameEvent.buildEvent.x - playerPositionComponent.x) / distance * 1000,
                            y: (gameEvent.buildEvent.y - playerPositionComponent.y) / distance * 1000
                        },
                        drawableComponent: {color: "black", shape: "CIRCLE", label: "pew!"},
                        hitboxComponent: {radius: 5, damage: 50}
                    });
            } else if (this.gameState.poolsByComponentName.usableComponents[gameEvent.buildEvent.itemId]?.behavior === "BUILD" || this.gameState.poolsByComponentName.usableComponents[gameEvent.buildEvent.itemId]?.behavior === undefined) {
                // delete from player inventory, and put into world
                this.gameState.playerInventories[gameEvent.buildEvent.playerId].splice(this.gameState.playerInventories[gameEvent.buildEvent.playerId].indexOf(gameEvent.buildEvent.itemId), 1);
                this.gameState.poolsByComponentName.positionComponents[gameEvent.buildEvent.itemId] = {x: gameEvent.buildEvent.x, y: gameEvent.buildEvent.y};
            }
        } else if (!!gameEvent.setPlayerInventoryEvent) {
            this.gameState.playerInventories[gameEvent.setPlayerInventoryEvent.playerId] = gameEvent.setPlayerInventoryEvent.playerInventory;
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
                const waterId = this.popNextId();
                this.setEntityComponents(
                    waterId,
                    {
                        positionComponent: {x: 50 * x, y: y * 50},
                        sizeComponent: {size: 50},
                        drawableComponent: {color: "#0080ff", shape: "SQUARE"},
                        usableComponent: {behavior: "BUILD"},
                    });
            }
        }

        // make a street
        for (let x = -25; x <= 25; x++) {
            for (let y = -1; y <= 1; y++) {
                if (x >= -2 && x <= 2) {
                    continue; // draw a bridge here
                }
                const roadId = this.popNextId();
                this.setEntityComponents(
                    roadId,
                    {
                        positionComponent: {x: 50 * x, y: y * 50},
                        sizeComponent: {size: 50},
                        drawableComponent: {color: "gray", shape: "SQUARE"},
                        usableComponent: {behavior: "BUILD"},
                    });
            }
        }

        // bridge
        for (let x = -2; x <= 2; x++) {
            for (let y = -1; y <= 1; y++) {
                const bridgeId = this.popNextId();
                this.setEntityComponents(
                    bridgeId,
                    {
                        positionComponent: {x: 50 * x, y: y * 50},
                        sizeComponent: {size: 50},
                        drawableComponent: {color: "maroon", shape: "SQUARE"},
                        usableComponent: {behavior: "BUILD"},
                    });
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
                const wallId = this.popNextId();
                this.setEntityComponents(
                    wallId,
                    {
                        positionComponent: {x: 50 * x, y: y * 50},
                        sizeComponent: {size: 50},
                        drawableComponent: {color: "brown", shape: "SQUARE"},
                        usableComponent: {behavior: "BUILD"},
                    });
            }
        }

        for (let x = -11; x <= -9; x++) {
            for (let y = -18; y >= -20; y -= 2) {
                this.makePlot(x * 50, y * 50);
            }
        }

        for (let x = -28; x <= -20; x += 4) {
            for (let y = -14; y <= -6; y += 4) {
                this.makeTree(x * 50, y * 50, 100);
            }
        }


        // city
        const workshop = this.popNextId();
        this.setEntityComponents(
            workshop,
            {
                positionComponent: {x: 10 * 50, y: -5 * 50},
                sizeComponent: {size: 150},
                drawableComponent: {color: "beige", shape: "SQUARE", label: "Workshop"},
                interactableComponent: {behavior: "WORKSHOP"},
                usableComponent: {behavior: "BUILD"},
            });


        // wilderness
        this.makePlot(-150, 150, 150);
        this.makeTree(-350, 150, 150);

        const slimeSpawner = this.popNextId();
        this.setEntityComponents(
            slimeSpawner,
            {
                positionComponent: {x: -10 * 50, y: 15 * 50},
                sizeComponent: {size: 150},
                drawableComponent: {color: "lightgreen", shape: "CIRCLE", label: "Slime Spawner"},
                ageableComponent: {age: 0},
                usableComponent: {behavior: "BUILD"},
                hurtboxComponent: {radius: 75, maxHealth: 5000, currentHealth: 5000},
            });
    }

    tick() {
        super.tick();

        if (this.gameState.frameCount % 60 == 0) {
            for (const playerId of this.connections.keys()) {
                const gameStateString = JSON.stringify(this.gameState);
                const connection = this.connections.get(playerId);
                if (!!connection) {
                    connection.handlePacket({syncPacket: {gameState: JSON.parse(gameStateString)}});
                }
            }
        }
    }

    /**
     * When a player connects, add them here, and also send them the game state.
     * @param {Client} client
     * @param {Packet} packet
     */
    handlePacket(client, packet) {
        if (packet.playerJoinPacket) {
            const playerJoinPacket = packet.playerJoinPacket;
            const playerId = this.popNextId();
            const x = Math.random() * 250 - 125 - 500;
            const y = Math.random() * 250 - 125 - 500;

            const cameraId = this.popNextId();

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
        for (const [entityId, {drawableComponent, positionComponent, sizeComponent, hurtboxComponent}] of entityQuery) {
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

            const age = this.gameState.poolsByComponentName.ageableComponents[entityId]?.age;
            this.drawEntity(
                drawableComponent,
                ctx,
                screenX,
                screenY,
                sizeComponent.size / scale,
                age,
                hurtboxComponent ? hurtboxComponent.currentHealth / hurtboxComponent.maxHealth : undefined);
        }

        const playerInventory = this.gameState.playerInventories[this.playerId];
        for (let i = 0; i < playerInventory.length; i++) {
            let itemX = canvas.width - 200 - ((playerInventory.length - 1) * 100) + (i * 100) + 50;
            let itemY = canvas.height - 50;
            let size = 100;
            let label = "";
            if (i == playerInventory.length - 1) {
                itemX = canvas.width - 100;
                itemY = canvas.height - 100;
                size = 200;
                label = "holding";
            }
            // draw a background square to hold the entity.
            this.drawEntity(
                {color: "#ffffff", shape: "CIRCLE", label}, ctx, itemX, itemY, size);
            const entityComponents = this.getEntityComponents(playerInventory[i]);
            const age = entityComponents.ageableComponent?.age;
            this.drawEntity(
                    entityComponents.drawableComponent,
                    ctx, itemX, itemY, size/2, age,
                    entityComponents.hurtboxComponent ? entityComponents.hurtboxComponent.currentHealth / entityComponents.hurtboxComponent.maxHealth : undefined);
        }
    }

    /**
     * @param {DrawableComponent|undefined} drawableComponent
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} screenX
     * @param {number} screenY
     * @param {number} size
     * @param {number} [age=100]
     * @param {number} [healthRatio]
     */
    drawEntity(drawableComponent, ctx, screenX, screenY, size, age, healthRatio) {
        if (drawableComponent === undefined) {
            drawableComponent = {color: "red", shape: "NOPE"};
        }
        const maxAge = 10;
        const ageRatio = Math.min((age || maxAge) / maxAge, 1);
        if (drawableComponent.shape === 'CIRCLE') {
            ctx.beginPath();
            const radius = size / 2;
            ctx.arc(screenX, screenY, radius, 0, 2 * Math.PI);
            ctx.fillStyle = drawableComponent.color;
            ctx.fill();
        } else if (drawableComponent.shape === 'SQUARE') {
            ctx.beginPath();
            // rect uses the top left corner
            ctx.rect(screenX - size / 2, screenY - size / 2, size, size);
            ctx.fillStyle = drawableComponent.color;
            ctx.fill();
        } else if (drawableComponent.shape === 'PLOT') {
            ctx.beginPath();
            ctx.rect(screenX - size / 2, screenY - size / 2, size, size);
            ctx.fillStyle = drawableComponent.color;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(screenX, screenY, size / 2 * ageRatio, 0, 2 * Math.PI);
            ctx.fillStyle = drawableComponent.secondColor || "#ffffff";
            ctx.fill();
        } else if (drawableComponent.shape === 'TREE') {
            ctx.beginPath();
            ctx.rect(screenX - (size / 6), screenY + size / 2, size / 3, - size / 3);
            ctx.fillStyle = drawableComponent.color;
            ctx.fill();

            ctx.beginPath();
            const radius = (size) / 2 * ageRatio;
            ctx.arc(screenX, screenY + (1/6) * size - radius, radius, 0, 2 * Math.PI);
            ctx.fillStyle = drawableComponent.secondColor || "green";
            ctx.fill();
        } else if (drawableComponent.shape === 'NOPE') {
            ctx.fillStyle = drawableComponent.color;
		    ctx.font = Math.round(size / 2).toString() + "px Courier New";
		    ctx.fillText("NO", screenX - ctx.measureText("NO").width / 2, screenY);
		    ctx.fillText("PE", screenX - ctx.measureText("PE").width / 2, screenY + size * 0.45);
        } else if (drawableComponent.shape === '?') {
            ctx.fillStyle = drawableComponent.color;
		    ctx.font = Math.round(size).toString() + "px Courier New";
		    ctx.fillText("?", screenX - ctx.measureText("?").width / 2, screenY + size * 0.25);
        }

		ctx.font = "20px Courier New";
        if (!!drawableComponent.label) {
            const textWidth = ctx.measureText(drawableComponent.label);
		    ctx.fillText(drawableComponent.label, screenX - textWidth.width / 2, screenY - size / 2 - 10);
        }
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
            x = Math.round(x / 25) * 25;
            y = Math.round(y / 25) * 25;
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
            playerInventory.unshift(playerInventory.pop());
            // Let the server know so that the refresh doesn't reset it
            // This might re-broadcast back
            this.host.handlePacket(this, {gameEvent: {setPlayerInventoryEvent: {playerId: this.playerId, playerInventory}}});
        } else {
            playerInventory.push(playerInventory.shift());
            // Let the server know so that the refresh doesn't reset it
            // This might re-broadcast back
            this.host.handlePacket(this, {gameEvent: {setPlayerInventoryEvent: {playerId: this.playerId, playerInventory}}});
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