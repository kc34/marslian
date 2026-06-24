/**
 * Packets to send between server and client. Either direction.
 */

/**
 * @typedef {Object} Packet
 * @property {PlayerJoinPacket=} playerJoinPacket
 * @property {PlayerJoinSuccessPacket=} playerJoinSuccessPacket
 * @property {SyncPacket=} syncPacket
 * @property {GameEvent=} gameEvent
 */

/**
 * @typedef {Object} PlayerJoinPacket
 * @property {string} name
 * @property {string} color
 */

/**
 * @typedef {Object} PlayerJoinSuccessPacket
 * @property {GameState} gameState
 * @property {number} playerId
 * @property {number} cameraId
 */

/**
 * @typedef {Object} SyncPacket
 * @property {GameState} gameState
 */