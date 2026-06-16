/**
 * @typedef {Object} FullComponentPool
 * @property {Object.<number, PositionComponent>} positionComponents
 * @property {Object.<number, VelocityComponent>} velocityComponents
 * @property {Object.<number, DrawableComponent>} drawableComponents
 * @property {Object.<number, FollowPlayerComponent>} followPlayerComponents
 * @property {Object.<number, AgeableComponent>} ageableComponents
 * @property {Object.<number, HarvestableComponent>} harvestableComponents
 * @property {Object.<number, PlotComponent>} plotComponents
 */

/**
 * @typedef {"positionComponents"|"velocityComponents"|"drawableComponents"|"followPlayerComponents"|"ageableComponents"|"harvestableComponents"|"plotComponents"} ComponentName
 */

/**
 * @typedef {Object} Component
 */

/**
 * @typedef {Object} PositionComponent
 * @property {number} x
 * @property {number} y
 * @property {number} size
 */

/**
 * @typedef {Object} VelocityComponent
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} DrawableComponent
 * @property {string} color
 * @property {string=} label
 * @property {"CIRCLE"|"SQUARE"} shape
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

/**
 * @typedef {Object} PlotComponent
 */

class FullComponentPools {
    static newComponentPool() {
        return {
            positionComponents: {},
            velocityComponents: {},
            drawableComponents: {},
            followPlayerComponents: {},
            ageableComponents: {},
            harvestableComponents: {},
            plotComponents: {},
        }
    }
}