/**
 * @typedef {Object} FullComponentPool
 * @property {Object.<number, PositionComponent>} positionComponents
 * @property {Object.<number, VelocityComponent>} velocityComponents
 * @property {Object.<number, DrawableComponent>} drawableComponents
 * @property {Object.<number, FollowPlayerComponent>} followPlayerComponents
 * @property {Object.<number, AgeableComponent>} ageableComponents
 * @property {Object.<number, HarvestableComponent>} harvestableComponents
 */

/**
 * @typedef {"positionComponents"|"velocityComponents"|"drawableComponents"|"followPlayerComponents"|"ageableComponents"|"harvestableComponents"} ComponentName
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
 * @typedef {Object} VelocityComponent
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

class FullComponentPools {
    static newComponentPool() {
        return {
            positionComponents: {},
            velocityComponents: {},
            drawableComponents: {},
            followPlayerComponents: {},
            ageableComponents: {},
            harvestableComponents: {},
        }
    }
}