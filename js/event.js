
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