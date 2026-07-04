/**
 * @typedef {Object} GameState
 * @property {number} frameCount
 * @property {FullComponentPool} poolsByComponentName
 * @property {Object<number, boolean>} entityIds
 * @property {Object<number, Array<number>>} playerInventories
 */

/**
 * Contains core game logic, which is essentially holding game state and handling game events.
 */
class BaseModel {
    /** @type {GameState} */
    gameState = {
        frameCount: 0,
        poolsByComponentName: FullComponentPools.newComponentPool(),
        entityIds: {},
        playerInventories: {},
    }

    debugName = "ERROR";

    /** @type {GameEvent[]} */
    events = [];
    
    /** Reserves and returns the next Entity ID. */
    popNextId() {
        var highestId = -1;
        for (const id of Object.keys(this.gameState.entityIds)) {
            if (parseInt(id) > highestId) {
                highestId = parseInt(id);
            }
        }
        const nextId = highestId + 1;
        this.gameState.entityIds[nextId] = true;
        return nextId;
    }

    /**
     * @param {ComponentName[]} componentNames
     * @returns {Map<number, EntityComponents>}
     */

    /**
     * @template {keyof EntityComponents} K
     * @param {K[]} componentNames
     * @returns {Map<number, Omit<EntityComponents, K> & Required<Pick<EntityComponents, K>>>}
     */
    query(componentNames) {
        /** @type {Map<number, EntityComponents>} */
        if (componentNames.length == 0) {
            return new Map();
        }
        let entityIds = new Set(Object.keys(this.gameState.poolsByComponentName[/** @type {ComponentPoolName} */ (componentNames[0] + 's')]));
        for (let i = 1; i < componentNames.length; i++) {
            entityIds = entityIds.intersection(new Set(Object.keys(this.gameState.poolsByComponentName[/** @type {ComponentPoolName} */ (componentNames[i] + 's')])));
        }
        let entityComponents = new Map();
        for (const entityId of entityIds) {
            entityComponents.set(parseInt(entityId), this.getEntityComponents(parseInt(entityId)));
        }
        return entityComponents;
    }

    /**
     * @param {number} entityId 
     * @param {EntityComponents} entityComponents 
     */
    setEntityComponents(entityId, entityComponents) {
        for (const [componentName, component] of Object.entries(entityComponents)) {
            this.gameState.poolsByComponentName[/** @type {ComponentPoolName} */ (componentName + 's')][entityId] = component;
        }
    }

    /**
     * @param {number} entityId 
     * @returns {EntityComponents} 
     */
    getEntityComponents(entityId) {
        /** @type {EntityComponents} */
        const entityComponents = {}
        for (const [componentNamePlural, componentPool] of Object.entries(this.gameState.poolsByComponentName)) {
            entityComponents[componentNamePlural.slice(0, -1)] = componentPool[entityId];
        }
        return entityComponents;
    }

    /**
     * @param {number} timeStep -- difference in time
     */
    tick(timeStep) {
        this.gameState.frameCount += 1;

        // AISystem
        // Maybe when this becomes more complicated, we should move it server-side and have Events explain what's happening.
        const aiQuery = this.query(["aiComponent", "alignmentComponent", "positionComponent", "velocityComponent"]);
        for (const [_, {alignmentComponent, positionComponent, velocityComponent}] of aiQuery) {
            // find closest target within vision
            let closestTarget;
            let closestTargetDistance = 69420;
            const alignmentQuery = this.query(["alignmentComponent", "positionComponent", "hurtboxComponent"]);
            for (const [targetId, {alignmentComponent: targetAlignmentComponent, positionComponent: targetPositionComponent}] of alignmentQuery) {
                if (alignmentComponent?.alignment === targetAlignmentComponent.alignment) {
                    continue;
                }
                const distance = Math.pow(Math.pow(positionComponent.x - targetPositionComponent.x, 2) + Math.pow(positionComponent.y - targetPositionComponent.y, 2), 0.5);
                const vision = 500;
                if (distance > vision) {
                    continue;
                }

                if (!closestTarget || distance < closestTargetDistance) {
                    closestTarget = targetId;
                    closestTargetDistance = distance;
                }
            }

            if (closestTarget) {
                let closestTargetPositionComponent = this.getEntityComponents(closestTarget).positionComponent;
                velocityComponent.x = (closestTargetPositionComponent.x - positionComponent.x) / closestTargetDistance * 50;
                velocityComponent.y = (closestTargetPositionComponent.y - positionComponent.y) / closestTargetDistance * 50;
            } else {
                velocityComponent.x = 0;
                velocityComponent.y = 0;
            }
        }


        const velocityEntityQuery = this.query(["velocityComponent", "positionComponent"]);
        for (const [_, {velocityComponent, positionComponent}] of velocityEntityQuery) {
            positionComponent.x += velocityComponent.x * timeStep;
            positionComponent.y += velocityComponent.y * timeStep;
        }

        // FollowPlayerSystem
        const followPlayerEntityQuery = this.query(["followPlayerComponent", "positionComponent"]);
        for (const [_, {followPlayerComponent, positionComponent}] of followPlayerEntityQuery) {
            const maxDistanceFromPlayer = followPlayerComponent.maxDistanceFromPlayer;
            const playerPositionComponent = this.gameState.poolsByComponentName.positionComponents[followPlayerComponent.followingId];
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

        // AgeableSystem
        const ageableQuery = this.query(["ageableComponent"]);
        for (const [entityId, entityComponents] of ageableQuery) {
            entityComponents.ageableComponent.age += timeStep;

            if (!!entityComponents.ageableComponent.effectComponent &&
                Math.floor(entityComponents.ageableComponent.age / entityComponents.ageableComponent.timeToEffect) >
                Math.floor((entityComponents.ageableComponent.age - timeStep) / entityComponents.ageableComponent.timeToEffect)) {
                    this.handleEffectComponent(entityComponents, entityComponents.ageableComponent.effectComponent);
            }
        }

        const hurtboxQuery = this.query(["hurtboxComponent"]);
        for (const {hurtboxComponent} of hurtboxQuery.values()) {
            if (hurtboxComponent.regenRate) {
                hurtboxComponent.currentHealth += hurtboxComponent.regenRate * timeStep;
            }
            hurtboxComponent.currentHealth = Math.min(hurtboxComponent.currentHealth, hurtboxComponent.maxHealth);
        }

        const hitboxEntities = this.query(["hitboxComponent", "positionComponent", "alignmentComponent"]);
        for (const [hitEntity, hitEntityComponents] of hitboxEntities) {
            if (hitEntityComponents.hitboxComponent?.timeToNextHit && hitEntityComponents.hitboxComponent?.timeToNextHit > 0) {
                hitEntityComponents.hitboxComponent.timeToNextHit -= timeStep;
                continue;
            }

            const hurtboxEntities = this.query(["hurtboxComponent", "positionComponent", "alignmentComponent"]);
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
                        delete this.gameState.entityIds[hitEntity];
                        for (const [_, componentPool] of Object.entries(this.gameState.poolsByComponentName)) {
                            delete componentPool[hitEntity];
                        }
                    }
                    
                    if (!!hurtEntityComponents.hurtboxComponent.effectComponent) {
                        this.handleEffectComponent(hurtEntityComponents, hurtEntityComponents.hurtboxComponent.effectComponent);
                    }

                    hitEntityComponents.hitboxComponent.timeToNextHit = hitEntityComponents.hitboxComponent.timeBetweenHits || 1;
                }
                if (hurtEntityComponents.hurtboxComponent.currentHealth <= 0) {
                    delete this.gameState.entityIds[hurtEntity];
                    for (const [_, componentPool] of Object.entries(this.gameState.poolsByComponentName)) {
                        delete componentPool[hurtEntity];
                    }
                }
            }
        }
    }

    /**
     * @param {EntityComponents} entityComponents 
     * @param {EffectComponentName} effectComponentName
     * @param {number} [playerIdToGiveItem]
     */
    handleEffectComponent(entityComponents, effectComponentName, playerIdToGiveItem) {
        if (effectComponentName === "spawnEffectComponent") {
            const ageableComponent = entityComponents.ageableComponent;
            const seed = ageableComponent?.age || 0;
            const dx = Math.sin(seed * seed);
            const dy = Math.cos(seed * seed);
            this.makeEntity(
                entityComponents.spawnEffectComponent.spawnEntity,
                {positionComponent: {
                    x: entityComponents.positionComponent.x + dx * 250,
                    y: entityComponents.positionComponent.y + dy * 250
                }});
        } else if (effectComponentName === "giveItemEffectComponent") {
            const ageableComponent = entityComponents.ageableComponent;
            if (ageableComponent !== undefined) {
                if (ageableComponent.age < 10) {
                    return;
                }
                ageableComponent.age = 0;
            }

            let entityComponentOverrides = {};
            if (entityComponents.giveItemEffectComponent.sizeRatio && entityComponents.sizeComponent) {
                entityComponentOverrides = {sizeComponent: {size: entityComponents.sizeComponent.size * entityComponents.giveItemEffectComponent.sizeRatio}};
            }
            const itemId = this.makeEntity(entityComponents.giveItemEffectComponent.giveItem, entityComponentOverrides);
            this.addItemToPlayerInventory(playerIdToGiveItem, itemId);
        }
    }

    addItemToPlayerInventory(playerId, itemId) {
        // try to find a stackable identical entity in the user's entity
        let matchId = undefined;
        for (const potentialMatchId of this.gameState.playerInventories[playerId]) {
            console.log("checking match");
            // copy the potential match
            const potentialMatch = this.getEntityComponents(potentialMatchId);
            // if there's no stackable component, quit.
            if (potentialMatch.stackableComponent === undefined) {
                continue;
            }
            // otherwise, strip its stackable component and see if they align
            const potentialMatchCopy = JSON.parse(JSON.stringify(potentialMatch));
            delete potentialMatchCopy["stackableComponent"];
            const itemCopy = JSON.parse(JSON.stringify(this.getEntityComponents(itemId)));
            delete itemCopy["stackableComponent"];
            if (JSON.stringify(potentialMatchCopy) === JSON.stringify(itemCopy)) {
                matchId = potentialMatchId;
                break;
            }
        }

        if (!!matchId) {
            const match = this.getEntityComponents(matchId);
            match.stackableComponent.count += this.getEntityComponents(itemId).stackableComponent?.count || 1;
            this.deleteEntity(itemId);
        } else {
            this.gameState.playerInventories[playerId].push(itemId);
        }

    }

    /**
     * @param {keyof PREFABS} entityName 
     * @param {EntityComponents} componentOverrides 
     * @param {number} [entityIdOverride]
     * 
     * @return {number} new Entity ID
     */
    makeEntity(entityName, componentOverrides, entityIdOverride) {
        let entityId;
        if (entityIdOverride) {
            entityId = entityIdOverride;
        } else {
            entityId = this.popNextId();
        }
        const entityComponents = Fabricator.fabricate(
            entityName,
            componentOverrides);
        this.setEntityComponents(entityId, entityComponents);
        return entityId;
    }

    /** @param {GameEvent} gameEvent */
    handleGameEvent(gameEvent) {
        if (!!gameEvent.moveEvent) {
            const playerPositionComponent = this.gameState.poolsByComponentName.positionComponents[gameEvent.moveEvent.playerId];
            if (playerPositionComponent) {
                playerPositionComponent.x = gameEvent.moveEvent.x;
                playerPositionComponent.y = gameEvent.moveEvent.y;
            }
        } else if (!!gameEvent.velocityChangeEvent) {
            const playerPositionComponent = this.gameState.poolsByComponentName.velocityComponents[gameEvent.velocityChangeEvent.playerId];
            if (playerPositionComponent) {
                playerPositionComponent.x = gameEvent.velocityChangeEvent.x;
                playerPositionComponent.y = gameEvent.velocityChangeEvent.y;
            }
        } else if (!!gameEvent.newPlayerEvent) {
            // Server reserved Player IDs, but hosts might not, so reserve it again:
            this.gameState.entityIds[gameEvent.newPlayerEvent.playerId] = true;
            this.gameState.entityIds[gameEvent.newPlayerEvent.cameraId] = true;
            this.makeEntity(
                "PLAYER",
                {
                    positionComponent: {x: gameEvent.newPlayerEvent.x, y: gameEvent.newPlayerEvent.y},
                    velocityComponent: {x: 0, y: 0},
                    drawableComponent: {color: gameEvent.newPlayerEvent.color, label: gameEvent.newPlayerEvent.label, shape: "CIRCLE"},
                },
                gameEvent.newPlayerEvent.playerId);
            this.makeEntity(
                "CAMERA",
                {
                    positionComponent: {x: gameEvent.newPlayerEvent.cameraX, y: gameEvent.newPlayerEvent.cameraY},
                    followPlayerComponent: {maxDistanceFromPlayer: 150, followingId: gameEvent.newPlayerEvent.playerId},
                },
                gameEvent.newPlayerEvent.cameraId);
            this.gameState.playerInventories[gameEvent.newPlayerEvent.playerId] = [-1];
        } else if (!!gameEvent.useEvent) {
            const targetEntity = this.getEntityComponents(gameEvent.useEvent.targetId);
            // Reject clicks too far away from player.
            const playerPositionComponent = this.gameState.poolsByComponentName.positionComponents[gameEvent.useEvent.playerId];
            const targetPositionComponent = targetEntity.positionComponent;
            if (!playerPositionComponent || !targetPositionComponent) {
                return;
            }
            if (Math.abs(targetPositionComponent.x - playerPositionComponent.x) > 200 || Math.abs(targetPositionComponent.y - playerPositionComponent.y) > 200) {
                return;
            }

            if (targetEntity.interactableComponent?.effectComponent) {
                this.handleEffectComponent(targetEntity, targetEntity.interactableComponent.effectComponent, gameEvent.useEvent.playerId)
            }
        } else if (!!gameEvent.collectEvent) {
            const playerId = gameEvent.collectEvent.playerId;
            const itemId = gameEvent.collectEvent.itemId;
            // Reject clicks too far away from player.
            const playerPositionComponent = this.gameState.poolsByComponentName.positionComponents[playerId];
            const targetPositionComponent = this.gameState.poolsByComponentName.positionComponents[itemId];
            if (!playerPositionComponent) {
                return;
            }
            if (Math.abs(targetPositionComponent.x - playerPositionComponent.x) > 200 || Math.abs(targetPositionComponent.y - playerPositionComponent.y) > 200) {
                return;
            }

            // remove entity from world, and put in player inventory
            delete this.gameState.poolsByComponentName.positionComponents[itemId];
            if (!this.gameState.playerInventories[playerId]) {
                this.gameState.playerInventories[playerId] = [-1];
            }
            this.addItemToPlayerInventory(playerId, itemId);
        } else if (!!gameEvent.buildEvent) {
            // for now, use the buildEvent as the general left-click
            
            // if bow, we don't want to actually build it
            if (this.gameState.poolsByComponentName.usableComponents[gameEvent.buildEvent.itemId]?.behavior == "BOW") {
                const playerPositionComponent = this.gameState.poolsByComponentName.positionComponents[gameEvent.buildEvent.playerId];
                const distance = Math.pow(Math.pow(gameEvent.buildEvent.x - playerPositionComponent.x, 2) + Math.pow(gameEvent.buildEvent.y - playerPositionComponent.y, 2), 0.5); // used for norming
                this.makeEntity(
                    "ARROW",
                    {
                        positionComponent: {
                            x: playerPositionComponent.x + (gameEvent.buildEvent.x - playerPositionComponent.x) / distance * 50,
                            y: playerPositionComponent.y + (gameEvent.buildEvent.y - playerPositionComponent.y) / distance * 50},
                        velocityComponent: {
                            x: (gameEvent.buildEvent.x - playerPositionComponent.x) / distance * 1000,
                            y: (gameEvent.buildEvent.y - playerPositionComponent.y) / distance * 1000
                        },
                    });
            } else if (this.gameState.poolsByComponentName.usableComponents[gameEvent.buildEvent.itemId]?.behavior === "BUILD") {
                // delete from player inventory, and put into world
                this.gameState.playerInventories[gameEvent.buildEvent.playerId].splice(this.gameState.playerInventories[gameEvent.buildEvent.playerId].indexOf(gameEvent.buildEvent.itemId), 1);
                this.gameState.poolsByComponentName.positionComponents[gameEvent.buildEvent.itemId] = {x: gameEvent.buildEvent.x, y: gameEvent.buildEvent.y};
            } else if (this.gameState.poolsByComponentName.usableComponents[gameEvent.buildEvent.itemId]?.behavior === "HOE") {
                const playerPositionComponent = this.gameState.poolsByComponentName.positionComponents[gameEvent.buildEvent.playerId];
                const distance = Math.pow(Math.pow(gameEvent.buildEvent.x - playerPositionComponent.x, 2) + Math.pow(gameEvent.buildEvent.y - playerPositionComponent.y, 2), 0.5); // used for norming
                this.makeEntity(
                    "PLOT",
                    {
                        positionComponent: {
                            x: gameEvent.buildEvent.x,
                            y: gameEvent.buildEvent.y}
                    });
            }
        } else if (!!gameEvent.setPlayerInventoryEvent) {
            this.gameState.playerInventories[gameEvent.setPlayerInventoryEvent.playerId] = gameEvent.setPlayerInventoryEvent.playerInventory;
        } else {
            console.log("unrecognized game event!!");
        }
    }

    /** @param {number} entityId */
    deleteEntity(entityId) {
        for (const componentPool of Object.values(this.gameState.poolsByComponentName)) {
            delete componentPool[entityId];
        }
    }
}