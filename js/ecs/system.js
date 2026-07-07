/**
 * system.js contains Systems, which act on Components.
 */

class AISystem {
    /**
     * @param {FullComponentPool} componentPool
     */
    static act(componentPool) {
        const aiQuery = FullComponentPools.query(componentPool, ["aiComponent", "alignmentComponent", "positionComponent", "velocityComponent"]);
        for (const [_, {alignmentComponent, positionComponent, velocityComponent}] of aiQuery) {
            // find closest target within vision
            let closestTargetPositionComponent;
            let closestTargetDistance = 69420;
            const alignmentQuery = FullComponentPools.query(componentPool, ["alignmentComponent", "positionComponent", "hurtboxComponent"]);
            for (const [targetId, {alignmentComponent: targetAlignmentComponent, positionComponent: targetPositionComponent}] of alignmentQuery) {
                if (alignmentComponent?.alignment === targetAlignmentComponent.alignment) {
                    continue;
                }
                const distance = Math.pow(Math.pow(positionComponent.x - targetPositionComponent.x, 2) + Math.pow(positionComponent.y - targetPositionComponent.y, 2), 0.5);
                const vision = 500;
                if (distance > vision) {
                    continue;
                }

                if (!closestTargetPositionComponent || distance < closestTargetDistance) {
                    closestTargetPositionComponent = targetPositionComponent;
                    closestTargetDistance = distance;
                }
            }

            if (closestTargetPositionComponent) {
                velocityComponent.x = (closestTargetPositionComponent.x - positionComponent.x) / closestTargetDistance * 50;
                velocityComponent.y = (closestTargetPositionComponent.y - positionComponent.y) / closestTargetDistance * 50;
            } else {
                velocityComponent.x = 0;
                velocityComponent.y = 0;
            }
        }
    }
}

class PhysicsSystem {
    /**
     * @param {FullComponentPool} componentPool
     * @param {number} timeStep
     */
    static act(componentPool, timeStep) {
        const velocityEntityQuery = FullComponentPools.query(componentPool, ["velocityComponent", "positionComponent"]);
        for (const [_, {velocityComponent, positionComponent}] of velocityEntityQuery) {
            positionComponent.x += velocityComponent.x * timeStep;
            positionComponent.y += velocityComponent.y * timeStep;
        }
    }
}

class FollowPlayerSystem {
    /**
     * @param {FullComponentPool} componentPool
     */
    static act(componentPool) {
        const followPlayerEntityQuery = FullComponentPools.query(componentPool, ["followPlayerComponent", "positionComponent"]);
        for (const [_, {followPlayerComponent, positionComponent}] of followPlayerEntityQuery) {
            const maxDistanceFromPlayer = followPlayerComponent.maxDistanceFromPlayer;
            const playerPositionComponent = FullComponentPools.getEntityComponents(componentPool, followPlayerComponent.followingId).positionComponent;
            if (!playerPositionComponent) {
                continue;
            }
            // Follow player if player leaves box.
            // I did try a circle at one point, but this was actually much less fun
            // and made me dizzy. (Basically, if you were on the lower half of the screen
            // and walked left, you would get pushed up to the middle of the screen.)
            if (positionComponent.x - playerPositionComponent.x > maxDistanceFromPlayer) {
                positionComponent.x = playerPositionComponent.x + maxDistanceFromPlayer;
            }
            if (positionComponent.x - playerPositionComponent.x < -1 * maxDistanceFromPlayer) {
                positionComponent.x = playerPositionComponent.x - maxDistanceFromPlayer;
            }
            if (positionComponent.y - playerPositionComponent.y > maxDistanceFromPlayer) {
                positionComponent.y = playerPositionComponent.y + maxDistanceFromPlayer;
            }
            if (positionComponent.y - playerPositionComponent.y < -1 * maxDistanceFromPlayer) {
                positionComponent.y = playerPositionComponent.y - maxDistanceFromPlayer;
            }
        }
    }
}

class AgeableSystem {
    /**
     * @param {FullComponentPool} componentPool
     * @param {number} timeStep
     * 
     * @return {Array<[number, EffectComponentName]>}
     */
    static act(componentPool, timeStep) {
        /** @type {Array<[number, EffectComponentName]>} */
        let triggers = [];
        const ageableQuery = FullComponentPools.query(componentPool, ["ageableComponent"]);
        for (const [entityId, entityComponents] of ageableQuery) {
            const ageableComponent = entityComponents.ageableComponent;
            entityComponents.ageableComponent.age += timeStep;

            if (!!ageableComponent.effectComponent
                && !!ageableComponent.timeToEffect
                && Math.floor(ageableComponent.age / ageableComponent.timeToEffect) > Math.floor((ageableComponent.age - timeStep) / ageableComponent.timeToEffect)) {
                    triggers.push([entityId, ageableComponent.effectComponent]);
            }
        }

        return triggers;
    }
}

class HurtboxSystem {
    /**
     * @param {FullComponentPool} componentPool
     * @param {number} timeStep
     */
    static act(componentPool, timeStep) {
        const hurtboxQuery = FullComponentPools.query(componentPool, ["hurtboxComponent"]);
        for (const {hurtboxComponent} of hurtboxQuery.values()) {
            if (hurtboxComponent.regenRate) {
                hurtboxComponent.currentHealth += hurtboxComponent.regenRate * timeStep;
            }
            hurtboxComponent.currentHealth = Math.min(hurtboxComponent.currentHealth, hurtboxComponent.maxHealth);
        }
    }
}

class HitboxSystem {
    /**
     * @param {FullComponentPool} componentPool
     * @param {number} timeStep
     * 
     * @return {Array<[number, "DELETE" | EffectComponentName]>}
     */
    static act(componentPool, timeStep) {
        /** @type {Array<[number, "DELETE" | EffectComponentName]>} */
        let triggers = [];

        const hitboxEntities = FullComponentPools.query(componentPool, ["hitboxComponent", "positionComponent", "alignmentComponent"]);
        for (const [hitEntity, hitEntityComponents] of hitboxEntities) {
            if (hitEntityComponents.hitboxComponent?.timeToNextHit && hitEntityComponents.hitboxComponent?.timeToNextHit > 0) {
                hitEntityComponents.hitboxComponent.timeToNextHit -= timeStep;
                continue;
            }

            const hurtboxEntities = FullComponentPools.query(componentPool, ["hurtboxComponent", "positionComponent", "alignmentComponent"]);
            for (const [hurtEntity, hurtEntityComponents] of hurtboxEntities) {
                if (hitEntityComponents.alignmentComponent.alignment === hurtEntityComponents.alignmentComponent.alignment) {
                    continue;
                }
                const distance = 
                    Math.pow(
                        Math.pow(hurtEntityComponents.positionComponent.x - hitEntityComponents.positionComponent.x, 2) +
                        Math.pow(hurtEntityComponents.positionComponent.y - hitEntityComponents.positionComponent.y, 2),
                        0.5);
                if (distance < hurtEntityComponents.hurtboxComponent.radius + hitEntityComponents.hitboxComponent.radius) {
                    hurtEntityComponents.hurtboxComponent.currentHealth -= hitEntityComponents.hitboxComponent?.damage;
                    if (hitEntityComponents.hitboxComponent.deleteOnHit) {
                        triggers.push([hitEntity, "DELETE"]);
                    }
                    
                    if (!!hurtEntityComponents.hurtboxComponent.effectComponent) {
                        triggers.push([hurtEntity, hurtEntityComponents.hurtboxComponent.effectComponent])
                    }

                    hitEntityComponents.hitboxComponent.timeToNextHit = hitEntityComponents.hitboxComponent.timeBetweenHits || 1;
                }
                if (hurtEntityComponents.hurtboxComponent.currentHealth <= 0) {
                        triggers.push([hurtEntity, "DELETE"]);
                }
            }
        }

        return triggers;
    }
}

class DirtSystem {
    /**
     * @param {FullComponentPool} componentPool
     * @param {number} timeStep
     */
    static act(componentPool, timeStep) {
        const dirtEntities = FullComponentPools.query(componentPool, ["dirtComponent"]);
        for (const [dirtEntityId, dirtEntityComponents] of dirtEntities) {
            // If the dirt entity contains a plantable, then grow it if space permits.
            if (!dirtEntityComponents.dirtComponent.plantableId) {
                continue;
            }
            const plantableEntityComponents = FullComponentPools.getEntityComponents(componentPool, dirtEntityComponents.dirtComponent.plantableId);

            if (!!plantableEntityComponents.sizeComponent?.size
                && !!dirtEntityComponents.sizeComponent?.size
                && plantableEntityComponents.sizeComponent.size < dirtEntityComponents.sizeComponent.size) {
                const growthRate = 1;
                plantableEntityComponents.sizeComponent.size += growthRate * timeStep;
                plantableEntityComponents.sizeComponent.size = Math.min(plantableEntityComponents.sizeComponent.size, dirtEntityComponents.sizeComponent.size);
            }
        }
    }
}