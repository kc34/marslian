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
 * @property {Object.<number, HitboxComponent>} hitboxComponents
 * @property {Object.<number, HurtboxComponent>} hurtboxComponents
 */

/**
 * Holds a set of Components for a specific entity.
 * 
 * @typedef {Object} EntityComponents
 * @property {PositionComponent} [positionComponent]
 * @property {SizeComponent} [sizeComponent]
 * @property {VelocityComponent} [velocityComponent]
 * @property {DrawableComponent} [drawableComponent]
 * @property {FollowPlayerComponent} [followPlayerComponent]
 * @property {AgeableComponent} [ageableComponent]
 * @property {UsableComponent} [usableComponent]
 * @property {BuildableComponent} [buildableComponent]
 * @property {HitboxComponent} [hitboxComponent]
 * @property {HurtboxComponent} [hurtboxComponent]
 */

/** @typedef {keyof EntityComponents} ComponentName */

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
 * Describes what happens if you left-click on this while it is in the world.
 * 
 * @typedef {Object} UsableComponent
 * @property {"PLOT"|"TREE"|"WORKSHOP"} behavior
 */

/**
 * Describes what happens if you left-click while this is in your inventory.
 * 
 * <p>TODO: Maybe BUILD should be called Place?
 * 
 * @typedef {Object} BuildableComponent
 * @property {"BOW"|"BUILD"} behavior
 */

/**
 * @typedef {Object} HitboxComponent
 * @property {number} radius
 * @property {number} damage
 */

/**
 * @typedef {Object} HurtboxComponent
 * @property {number} radius
 * @property {number} maxHealth
 * @property {number} currentHealth
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
            hitboxComponents: {},
            hurtboxComponents: {},
        }
    }
}