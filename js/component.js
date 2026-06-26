/**
 * @typedef {Object} FullComponentPool
 * @property {Object.<number, PositionComponent>} positionComponents
 * @property {Object.<number, SizeComponent>} sizeComponents
 * @property {Object.<number, VelocityComponent>} velocityComponents
 * @property {Object.<number, DrawableComponent>} drawableComponents
 * @property {Object.<number, FollowPlayerComponent>} followPlayerComponents
 * @property {Object.<number, AgeableComponent>} ageableComponents
 * @property {Object.<number, InteractableComponent>} interactableComponents
 * @property {Object.<number, UsableComponent>} usableComponents
 * @property {Object.<number, HitboxComponent>} hitboxComponents
 * @property {Object.<number, HurtboxComponent>} hurtboxComponents
 */

/** @typedef {keyof FullComponentPool} ComponentPoolName */

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
 * @property {InteractableComponent} [interactableComponent]
 * @property {UsableComponent} [usableComponent]
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
 * @property {"CIRCLE"|"SQUARE"|"TREE"|"PLOT"|"NOPE"|"?"} shape
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
 * @typedef {Object} InteractableComponent
 * @property {keyof PREFABS} giveItem
 */

/**
 * Describes what happens if you left-click while this is in your inventory.
 * 
 * @typedef {Object} UsableComponent
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

    /** @returns {FullComponentPool} */
    static newComponentPool() {
        return {
            positionComponents: {},
            sizeComponents: {},
            velocityComponents: {},
            drawableComponents: {},
            followPlayerComponents: {},
            ageableComponents: {},
            interactableComponents: {},
            usableComponents: {},
            hitboxComponents: {},
            hurtboxComponents: {},
        }
    }
}