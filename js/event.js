
/**
 * @typedef {Object} GameEvent
 * @property {NewPlayerEvent=} newPlayerEvent
 * @property {MoveEvent=} moveEvent
 * @property {VelocityChangeEvent=} velocityChangeEvent
 * @property {UseEvent=} useEvent
 * @property {CollectEvent=} collectEvent
 * @property {BuildEvent=} buildEvent
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
 * @typedef {Object} UseEvent
 * @property {number} playerId
 * @property {number} [playerHoldingId] -- Entity ID of whatever the Player is holding
 * @property {number} targetId
 */

/**
 * @typedef {Object} CollectEvent
 * @property {number} playerId
 * @property {number} itemId
 */

/**
 * @typedef {Object} BuildEvent
 * @property {number} playerId
 * @property {number} itemId
 * @property {number} x
 * @property {number} y
 */