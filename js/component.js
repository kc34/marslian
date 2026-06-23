/**
 * @typedef {Object} FullComponentPool
 * @property {Object.<number, PositionComponent>} positionComponents
 * @property {Object.<number, SizeComponent>} sizeComponents
 * @property {Object.<number, VelocityComponent>} velocityComponents
 * @property {Object.<number, DrawableComponent>} drawableComponents
 * @property {Object.<number, FollowPlayerComponent>} followPlayerComponents
 * @property {Object.<number, AgeableComponent>} ageableComponents
 * @property {Object.<number, UsableComponent>} usableComponents // TODO: maybe rename to structure behavior component?
 * @property {Object.<number, BuildableComponent>} buildableComponents // TODO: maybe rename to item behavior component?
 */

/**
 * @typedef {"positionComponents"|"sizeComponents"|"velocityComponents"|"drawableComponents"|"followPlayerComponents"|"ageableComponents"|"usableComponents"|"buildableComponents"} ComponentName
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
 * @typedef {Object} SizeComponent
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
 * @property {string=} secondColor
 * @property {"CIRCLE"|"SQUARE"|"TREE"|"PLOT"|"NOPE"} shape
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
 * @typedef {Object} UsableComponent
 * @property {"PLOT"|"TREE"|"WORKSHOP"} behavior
 */

/**
 * @typedef {Object} BuildableComponent
 * @property {"BOW"} behavior
 */

class FullComponentPools {
    static newComponentPool() {
        return {
            positionComponents: {},
            sizeComponents: {},
            velocityComponents: {},
            drawableComponents: {},
            followPlayerComponents: {},
            ageableComponents: {},
            usableComponents: {},
            buildableComponents: {},
        }
    }
}