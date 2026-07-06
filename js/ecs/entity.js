// Uncomment this line to have CheckJS check for correctness.
/** @type {Object.<string, EntityComponents>} */
const PREFABS = Object.freeze({
    "PLAYER": {
        alignmentComponent: {alignment: "GOOD"},
        collectableComponent: {}, // probably shouldn't be here but it's really funny
        hurtboxComponent: {radius: 12.5, maxHealth: 500, currentHealth: 500},
        sizeComponent: {size: 50},
        usableComponent: {behavior: "BUILD"},
    },
    "CAMERA": {
        // There should be a FollowPlayerComponent here.
    },
    "CORN": {
        drawableComponent: {color: "yellow", shape: "CIRCLE"},
        stackableComponent: {count: 1},
        usableComponent: {behavior: "BUILD"},
    },
    "WOOD": {
        collectableComponent: {},
        drawableComponent: {color: "brown", shape: "SQUARE"},
        sizeComponent: {size: 50},
        stackableComponent: {count: 1},
        usableComponent: {behavior: "BUILD"},
    },
    "BOW": {
        drawableComponent: {color: "black", shape: "TEXT", label: "bow"},
        usableComponent: {behavior: "BOW"},
    },
    "HOE": {
        drawableComponent: {color: "black", shape: "TEXT", label: "hoe"},
        usableComponent: {behavior: "HOE"},
    },
    "ARROW": {
        alignmentComponent: {alignment: "GOOD"},
        drawableComponent: {color: "black", shape: "CIRCLE", label: "pew!"},
        hitboxComponent: {radius: 5, damage: 50, deleteOnHit: true},
        sizeComponent: {size: 5},
    },
    "PLOT": {
        ageableComponent: {age: 0},
        drawableComponent: {color: "#832a2a", shape: "PLOT", secondColor: "yellow"},
        giveItemEffectComponent: {giveItem: "CORN", sizeRatio: 1},
        interactableComponent: {effectComponent: "giveItemEffectComponent"},
        sizeComponent: {size: 50},
        usableComponent: {behavior: "BUILD"},
    },
    "TREE": {
        ageableComponent: {age: 0},
        drawableComponent: {color: "brown", shape: "TREE"},
        giveItemEffectComponent: {giveItem: "WOOD", sizeRatio: 0.5},
        interactableComponent: {effectComponent: "giveItemEffectComponent"},
        sizeComponent: {size: 100},
        usableComponent: {behavior: "BUILD"},
    },
    "WATER": {
        drawableComponent: {color: "#0080ff", shape: "SQUARE"},
        sizeComponent: {size: 50},
        usableComponent: {behavior: "BUILD"},
    },
    "ROAD": {
        drawableComponent: {color: "gray", shape: "SQUARE"},
        sizeComponent: {size: 50},
        usableComponent: {behavior: "BUILD"},
    },
    "BRIDGE": {
        drawableComponent: {color: "maroon", shape: "SQUARE"},
        sizeComponent: {size: 50},
        usableComponent: {behavior: "BUILD"},
    },
    "WORKSHOP": {
        drawableComponent: {color: "beige", shape: "SQUARE", label: "Workshop"},
        giveItemEffectComponent: {giveItem: "BOW"},
        interactableComponent: {effectComponent: "giveItemEffectComponent"},
        sizeComponent: {size: 150},
        usableComponent: {behavior: "BUILD"},
    },
    "SLIME": {
        aiComponent: {},
        alignmentComponent: {alignment: "EVIL"},
        drawableComponent: {color: "lightgreen", shape: "CIRCLE", label: "slime"},
        hitboxComponent: {radius: 12.5, damage: 60},
        hurtboxComponent: {radius: 12.5, maxHealth: 10, currentHealth: 10},
        sizeComponent: {size: 25},
        velocityComponent: {x: 0, y: 0},
    },
    "SLIME_SPAWNER": {
        ageableComponent: {age: 0, effectComponent: "spawnEffectComponent", timeToEffect: 5},
        alignmentComponent: {alignment: "EVIL"},
        drawableComponent: {color: "lightgreen", shape: "CIRCLE", label: "Slime Spawner"},
        hurtboxComponent: {radius: 75, maxHealth: 5000, currentHealth: 5000, regenRate: 100, effectComponent: "spawnEffectComponent"},
        sizeComponent: {size: 150},
        spawnEffectComponent: {spawnEntity: "SLIME"},
        usableComponent: {behavior: "BUILD"},
    },
    "GUARD_TOWER": {
        ageableComponent: {age: 0, effectComponent: "spawnEffectComponent", timeToEffect: 5},
        alignmentComponent: {alignment: "GOOD"},
        drawableComponent: {color: "beige", shape: "SQUARE", label: "Guard Tower"},
        hurtboxComponent: {radius: 150, maxHealth: 5000, currentHealth: 5000, regenRate: 100},
        interactableComponent: {effectComponent: "spawnEffectComponent"},
        sizeComponent: {size: 150},
        spawnEffectComponent: {spawnEntity: "GUARD"},
        usableComponent: {behavior: "BUILD"},
    },
    "GUARD": {
        aiComponent: {},
        alignmentComponent: {alignment: "GOOD"},
        drawableComponent: {color: "beige", shape: "CIRCLE", label: "guard"},
        hitboxComponent: {radius: 12.5, damage: 60},
        hurtboxComponent: {radius: 12.5, maxHealth: 150, currentHealth: 150},
        sizeComponent: {size: 50},
        velocityComponent: {x: 0, y: 0},
    },
});

class Fabricator {
    /**
     * @param {keyof PREFABS} entityName 
     * @param {EntityComponents} entityComponentOverrides
     * @return {EntityComponents}
     */
    static fabricate(entityName, entityComponentOverrides) {
        const newEntityComponents = JSON.parse(JSON.stringify(PREFABS[entityName]));
        for (const [componentName, componentOverride] of Object.entries(entityComponentOverrides)) {
            newEntityComponents[componentName] = componentOverride;
        }
        return newEntityComponents;
    }
}