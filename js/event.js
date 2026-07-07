
/**
 * @typedef {Object} GameEvent
 * @property {NewPlayerEvent=} newPlayerEvent
 * @property {MoveEvent=} moveEvent
 * @property {UseEvent=} useEvent
 * @property {UseAtPointEvent=} useAtPointEvent
 * @property {CollectEvent=} collectEvent
 * @property {BuildEvent=} buildEvent
 * @property {SetPlayerInventoryEvent=} setPlayerInventoryEvent
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
 * Sent when a Player clicks on an object.
 * 
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
 * Sent when a Player clicks on the ground.
 * 
 * @typedef {Object} BuildEvent
 * @property {number} playerId
 * @property {number} itemId
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} SetPlayerInventoryEvent
 * @property {number} playerId
 * @property {number[]} playerInventory
 */