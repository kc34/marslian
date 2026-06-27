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
 * @property {Object.<number, SpawnEffectComponent>} spawnEffectComponents
 * @property {Object.<number, AlignmentComponent>} alignmentComponents
 * @property {Object.<number, AIComponent>} aiComponents
 * @property {Object.<number, GiveItemEffectComponent>} [giveItemEffectComponents]
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
 * @property {SpawnEffectComponent} [spawnEffectComponent]
 * @property {AlignmentComponent} [alignmentComponent]
 * @property {AIComponent} [aiComponent]
 * @property {GiveItemEffectComponent} [giveItemEffectComponent]
 */

/** @typedef {keyof EntityComponents} ComponentName */

/**
 * EffectComponentNames are components that can be triggered by other components.
 * 
 * @typedef {"spawnEffectComponent"|"giveItemEffectComponent"} EffectComponentName
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
 * @property {keyof EntityComponents & EffectComponentName} [effectComponent]
 * @property {number} timeToEffect
 */

/**
 * Describes what happens if you left-click on this while it is in the world.
 * 
 * @typedef {Object} InteractableComponent
 * @property {keyof EntityComponents & EffectComponentName} [effectComponent]
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
 * @property {boolean} [deleteOnHit=false]
 * @property {number} [timeBetweenHits=1]
 * @property {number} [timeToNextHit=0]
 */

/**
 * @typedef {Object} HurtboxComponent
 * @property {number} radius
 * @property {number} maxHealth
 * @property {number} currentHealth
 * @property {number} regenRate
 * @property {keyof EntityComponents & EffectComponentName} [effectComponent]
 */

/**
 * @typedef {Object} SpawnEffectComponent
 * @property {keyof PREFABS} spawnEntity
 */

/**
 * @typedef {Object} AlignmentComponent
 * @property {"GOOD"|"EVIL"} alignment
 */

/**
 * @typedef {Object} AIComponent
 */

/**
 * @typedef {Object} GiveItemEffectComponent
 * @property {keyof PREFABS} giveItem
 * @property {number} [sizeRatio]
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
            spawnEffectComponents: {},
            alignmentComponents: {},
            aiComponents: {},
            giveItemEffectComponents: {},
        }
    }
}