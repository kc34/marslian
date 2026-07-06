/**
 * Holds all Components for all entities.
 * 
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
 * @property {Object.<number, StackableComponent>} [stackableComponents]
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
 * @property {StackableComponent} [stackableComponent]
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
 * @property {string} [label]
 * @property {string} [secondColor]
 * @property {string} [text]
 * @property {"CIRCLE"|"SQUARE"|"TREE"|"PLOT"|"TEXT"|"NOPE"} shape
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
 * @property {number} [timeToEffect]
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
 * @property {"BOW"|"BUILD"|"HOE"} behavior
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
 * @property {number} [regenRate]
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

/**
 * @typedef {Object} StackableComponent
 * @property {number} [count=1]
 */

/**
 * Utility class for working with a full set of ComponentPools.
 */
class FullComponentPools {

    /**
     * Returns a full set of empty ComponentPools.
     * 
     * @returns {FullComponentPool}
     */
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
            stackableComponents: {},
        }
    }

    /**
     * Given a full set of ComponentPools and a list of EntityComponent names,
     * filters for entities containing all of those components, and returns
     * those components indexed by Entity ID.
     * 
     * @template {keyof EntityComponents} K
     * @param {FullComponentPool} componentPools
     * @param {K[]} componentNames
     * @returns {Map<number, Omit<EntityComponents, K> & Required<Pick<EntityComponents, K>>>}
     */
    static query(componentPools, componentNames) {
        let entityIds = new Set();
        for (let i = 0; i < componentNames.length; i++) {
            const componentPoolName = /** @type {ComponentPoolName} */ (componentNames[i] + 's');
            const componentPool = /** @type {Object.<number, Object>} */ (componentPools[componentPoolName]);
            const newEntityIds = new Set(Object.keys(componentPool));

            if (i === 0) {
                entityIds = newEntityIds;
            } else {
                entityIds = entityIds.intersection(newEntityIds);
            }
        }

        let entityComponents = new Map();
        for (const entityId of entityIds) {
            entityComponents.set(parseInt(entityId), this.getEntityComponents(componentPools, parseInt(entityId)));
        }
        return entityComponents;
    }

    /**
     * Given a full set of ComponentPools, an Entity ID, and an
     * EntityComponents object, puts each component in the right pool.
     * 
     * @param {FullComponentPool} componentPools
     * @param {number} entityId 
     * @param {EntityComponents} entityComponents 
     */
    static setEntityComponents(componentPools, entityId, entityComponents) {
        for (const [componentName, component] of Object.entries(entityComponents)) {
            const componentPoolName = /** @type {ComponentPoolName} */ (componentName + 's');
            const componentPool = /** @type {Object.<number, Object>} */ (componentPools[componentPoolName]);
            componentPool[entityId] = component;
        }
    }

    /**
     * Given a full set of ComponentPools and an EntityId, gets each
     * component and returns an EntityComponents object.
     * 
     * @param {FullComponentPool} componentPools
     * @param {number} entityId 
     * @returns {EntityComponents} 
     */
    static getEntityComponents(componentPools, entityId) {
        /** @type {EntityComponents} */
        const entityComponents = {}
        for (const [componentPoolName, componentPool] of Object.entries(componentPools)) {
            const componentName = /** @type {ComponentName} */ (componentPoolName.slice(0, -1));
            entityComponents[componentName] = componentPool[entityId];
        }
        return entityComponents;
    }
}