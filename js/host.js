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
                this.makeEntity("WATER", {positionComponent: {x: x * 50, y: y * 50}});
            }
        }

        // make a street
        for (let x = -25; x <= 25; x++) {
            for (let y = -1; y <= 1; y++) {
                if (x >= -2 && x <= 2) {
                    continue; // draw a bridge here
                }
                this.makeEntity("ROAD", {positionComponent: {x: x * 50, y: y * 50}});
            }
        }

        // bridge
        for (let x = -2; x <= 2; x++) {
            for (let y = -1; y <= 1; y++) {
                this.makeEntity("BRIDGE", {positionComponent: {x: x * 50, y: y * 50}});
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
                this.makeEntity("WALL", {positionComponent: {x: x * 50, y: y * 50}});
            }
        }

        for (let x = -11; x <= -9; x++) {
            for (let y = -18; y >= -20; y -= 2) {
                this.makeEntity("PLOT", {positionComponent: {x: x * 50, y: y * 50}});
            }
        }

        for (let x = -28; x <= -20; x += 4) {
            for (let y = -14; y <= -6; y += 4) {
                this.makeEntity("TREE", {positionComponent: {x: x * 50, y: y * 50}});
            }
        }


        // city
        this.makeEntity("WORKSHOP", {positionComponent: {x: 10 * 50, y: -5 * 50}});
        this.makeEntity("WORKSHOP",
            {
                positionComponent: {x: 15 * 50, y: -5 * 50},
                drawableComponent: {color: "orange", shape: "SQUARE", label: "HOME DEPOT"},
                giveItemEffectComponent: {giveItem: "HOE"},
            });


        // wilderness
        this.makeEntity("PLOT", {positionComponent: {x: -800, y: 150}, sizeComponent: {size: 150}});
        this.makeEntity("TREE", {positionComponent: {x: -200, y: 150}, sizeComponent: {size: 150}});

        this.makeEntity("GUARD_TOWER", {positionComponent: {x: -10 * 50, y: 3 * 50}});
        this.makeEntity("SLIME_SPAWNER", {positionComponent: {x: -10 * 50, y: 15 * 50}});
    }

    /**
     * @param {number} timeStep
     */
    tick(timeStep) {
        super.tick(timeStep);

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