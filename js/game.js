/**
 * @typedef {Object} GameState
 * @property {number} frameCount
 * @property {FullComponentPool} poolsByComponentName
 * @property {Object<number, boolean>} entityIds
 * @property {Object<number, Array<number>>} playerInventories
 * @property {boolean} everythingCollectable
 * @property {boolean} everythingPlantable
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
        // Funny stupid debug options
        everythingCollectable: true,
        everythingPlantable: true,
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
        return FullComponentPools.query(this.gameState.poolsByComponentName, componentNames);
    }

    /**
     * @param {number} entityId 
     * @returns {EntityComponents} 
     */
    getEntityComponents(entityId) {
        return FullComponentPools.getEntityComponents(this.gameState.poolsByComponentName, entityId);
    }

    /**
     * @param {number} timeStep -- difference in time
     */
    tick(timeStep) {
        this.gameState.frameCount += 1;

        AISystem.act(this.gameState.poolsByComponentName);

        PhysicsSystem.act(this.gameState.poolsByComponentName, timeStep);

        FollowPlayerSystem.act(this.gameState.poolsByComponentName);

        const ageableTriggers = AgeableSystem.act(this.gameState.poolsByComponentName, timeStep);
        for (const [entityId, trigger] of ageableTriggers) {
            this.handleEffectComponent(entityId, trigger);
        }

        HurtboxSystem.act(this.gameState.poolsByComponentName, timeStep);

        const hitboxTriggers = HitboxSystem.act(this.gameState.poolsByComponentName, timeStep);
        for (const [entityId, trigger] of hitboxTriggers) {
            this.handleEffectComponent(entityId, trigger);
        }

        DirtSystem.act(this.gameState.poolsByComponentName, timeStep);
    }

    /**
     * TODO: Probably just "handle effect".
     * TODO: Probably drop support for optional Player ID. (We probably don't want to give players items outside of Use ID.)
     * 
     * @param {number} entityId 
     * @param {EffectName} effectName
     * @param {number} [playerIdToGiveItem]
     */
    handleEffectComponent(entityId, effectName, playerIdToGiveItem) {
        if (effectName === EffectName.DEATH) {
            this.deleteEntity(entityId);
            return;
        }
        const entityComponents = FullComponentPools.getEntityComponents(this.gameState.poolsByComponentName, entityId);

        if (effectName === EffectName.SPAWN) {
            const ageableComponent = entityComponents.ageableComponent;
            if (!entityComponents.spawnEffectComponent || !entityComponents.positionComponent) {
                return;
            }
            const seed = ageableComponent?.age || 0;
            const dx = Math.sin(seed * seed);
            const dy = Math.cos(seed * seed);
            this.makeEntity(
                entityComponents.spawnEffectComponent.spawnEntity,
                {positionComponent: {
                    x: entityComponents.positionComponent.x + dx * 250,
                    y: entityComponents.positionComponent.y + dy * 250
                }});
        }
    }

    /**
     * @param {number} playerId 
     * @param {number} itemId 
     */
    addItemToPlayerInventory(playerId, itemId) {
        // try to find a stackable identical entity in the user's entity
        let matchId = undefined;
        for (const potentialMatchId of this.gameState.playerInventories[playerId]) {
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
            const item = this.getEntityComponents(itemId);
            const match = this.getEntityComponents(matchId);
            if (!item.stackableComponent || !match.stackableComponent) {
                return;
            }
            match.stackableComponent.count = match.stackableComponent.count || 1;
            match.stackableComponent.count += item.stackableComponent.count || 1;
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
        FullComponentPools.setEntityComponents(this.gameState.poolsByComponentName, entityId, entityComponents);
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
            // Reject clicks too far away from player.
            const playerId = gameEvent.useEvent.playerId;
            const playerEntity = this.getEntityComponents(playerId);
            const targetId = gameEvent.useEvent.targetId;
            const targetEntity = this.getEntityComponents(targetId);
            if (!playerEntity.positionComponent
                || !targetEntity.positionComponent
                || Math.abs(targetEntity.positionComponent.x - playerEntity.positionComponent.x) > 200
                || Math.abs(targetEntity.positionComponent.y - playerEntity.positionComponent.y) > 200) {
                return;
            }

            if (targetEntity.interactableComponent?.effectName) {
                if (targetEntity.interactableComponent?.effectName === InteractableEffectName.PLANT) {
                    if (targetEntity.dirtComponent) {
                        if (targetEntity.dirtComponent?.plantableId) {
                            this.addItemToPlayerInventory(gameEvent.useEvent.playerId, targetEntity.dirtComponent.plantableId);
                            targetEntity.dirtComponent.plantableId = undefined;
                        } else {
                            const playerHoldingId = gameEvent.useEvent.playerHoldingId;
                            if (playerHoldingId && (this.gameState.everythingPlantable || this.gameState.poolsByComponentName.plantableComponents[playerHoldingId])) {
                                // delete from player inventory, and put into plot
                                this.gameState.playerInventories[playerId].splice(this.gameState.playerInventories[playerId].indexOf(playerHoldingId), 1);
                                targetEntity.dirtComponent.plantableId = playerHoldingId;
                            }
                        }
                    }
                } else if (targetEntity.interactableComponent.effectName === InteractableEffectName.GIVE_ITEM) {
                    if (targetEntity.giveItemEffectComponent) {
                        const ageableComponent = targetEntity.ageableComponent;
                        if (ageableComponent !== undefined) {
                            if (ageableComponent.age < 10) {
                                return;
                            }
                            ageableComponent.age = 0;
                        }

                        let entityComponentOverrides = {};
                        if (targetEntity.giveItemEffectComponent.sizeRatio && targetEntity.sizeComponent) {
                            entityComponentOverrides = {sizeComponent: {size: targetEntity.sizeComponent.size * targetEntity.giveItemEffectComponent.sizeRatio}};
                        }
                        const itemId = this.makeEntity(targetEntity.giveItemEffectComponent.giveItem, entityComponentOverrides);
                        this.addItemToPlayerInventory(playerId, itemId);
                    }
                } else {
                    this.handleEffectComponent(gameEvent.useEvent.targetId, targetEntity.interactableComponent.effectName);
                }
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
            if (!this.gameState.poolsByComponentName.collectableComponents[itemId] && !this.gameState.everythingCollectable) {
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
            } else if (this.gameState.poolsByComponentName.usableComponents[gameEvent.buildEvent.itemId]?.behavior === "BUILD" || this.gameState.everythingCollectable) {
                // delete from player inventory, and put into world
                this.gameState.playerInventories[gameEvent.buildEvent.playerId].splice(this.gameState.playerInventories[gameEvent.buildEvent.playerId].indexOf(gameEvent.buildEvent.itemId), 1);
                this.gameState.poolsByComponentName.positionComponents[gameEvent.buildEvent.itemId] = {x: gameEvent.buildEvent.x, y: gameEvent.buildEvent.y};
            } 
        } else if (!!gameEvent.setPlayerInventoryEvent) {
            this.gameState.playerInventories[gameEvent.setPlayerInventoryEvent.playerId] = gameEvent.setPlayerInventoryEvent.playerInventory;
        } else {
            console.log("unrecognized game event!!");
        }
    }

    /** @param {number} entityId */
    deleteEntity(entityId) {
        delete this.gameState.entityIds[entityId];
        for (const componentPool of Object.values(this.gameState.poolsByComponentName)) {
            delete componentPool[entityId];
        }
    }
}