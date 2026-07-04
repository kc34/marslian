// Uncomment this line to have CheckJS check for correctness.
/** @type {Object.<string, EntityComponents>} */
const PREFABS = Object.freeze({
    "PLAYER": {
        sizeComponent: {size: 50},
        usableComponent: {behavior: "BUILD"},
        hurtboxComponent: {radius: 12.5, maxHealth: 500, currentHealth: 500},
        alignmentComponent: {alignment: "GOOD"},
    },
    "CAMERA": {
        usableComponent: {behavior: "BUILD"},
    },
    "CORN": {
        drawableComponent: {color: "yellow", shape: "CIRCLE"},
        usableComponent: {behavior: "BUILD"},
    },
    "WOOD": {
        drawableComponent: {color: "brown", shape: "SQUARE"},
        usableComponent: {behavior: "BUILD"},
    },
    "BOW": {
        drawableComponent: {color: "black", shape: "?", label: "bow"},
        usableComponent: {behavior: "BOW"},
    },
    "HOE": {
        drawableComponent: {color: "black", shape: "?", label: "hoe"},
        usableComponent: {behavior: "HOE"},
    },
    "ARROW": {
        sizeComponent: {size: 5},
        drawableComponent: {color: "black", shape: "CIRCLE", label: "pew!"},
        hitboxComponent: {radius: 5, damage: 50, deleteOnHit: true},
        alignmentComponent: {alignment: "GOOD"},
    },
    "PLOT": {
        sizeComponent: {size: 50},
        drawableComponent: {color: "#832a2a", shape: "PLOT", secondColor: "yellow"},
        ageableComponent: {age: 0},
        interactableComponent: {effectComponent: "giveItemEffectComponent"},
        usableComponent: {behavior: "BUILD"},
        giveItemEffectComponent: {giveItem: "CORN", sizeRatio: 1},
    },
    "TREE": {
        sizeComponent: {size: 100},
        drawableComponent: {color: "brown", shape: "TREE"},
        ageableComponent: {age: 0},
        interactableComponent: {effectComponent: "giveItemEffectComponent"},
        usableComponent: {behavior: "BUILD"},
        giveItemEffectComponent: {giveItem: "WOOD", sizeRatio: 0.5},
    },
    "WATER": {
        sizeComponent: {size: 50},
        drawableComponent: {color: "#0080ff", shape: "SQUARE"},
        usableComponent: {behavior: "BUILD"},
    },
    "ROAD": {
        sizeComponent: {size: 50},
        drawableComponent: {color: "gray", shape: "SQUARE"},
        usableComponent: {behavior: "BUILD"},
    },
    "BRIDGE": {
        sizeComponent: {size: 50},
        drawableComponent: {color: "maroon", shape: "SQUARE"},
        usableComponent: {behavior: "BUILD"},
    },
    "WALL": {
        sizeComponent: {size: 50},
        drawableComponent: {color: "brown", shape: "SQUARE"},
        usableComponent: {behavior: "BUILD"},
    },
    "WORKSHOP": {
        sizeComponent: {size: 150},
        drawableComponent: {color: "beige", shape: "SQUARE", label: "Workshop"},
        interactableComponent: {effectComponent: "giveItemEffectComponent"},
        usableComponent: {behavior: "BUILD"},
        giveItemEffectComponent: {giveItem: "BOW"},
    },
    "SLIME": {
        velocityComponent: {x: 0, y: 0},
        sizeComponent: {size: 25},
        drawableComponent: {color: "lightgreen", shape: "CIRCLE", label: "slime"},
        hitboxComponent: {radius: 12.5, damage: 60},
        hurtboxComponent: {radius: 12.5, maxHealth: 10, currentHealth: 10},
        alignmentComponent: {alignment: "EVIL"},
        aiComponent: {},
    },
    "SLIME_SPAWNER": {
        sizeComponent: {size: 150},
        drawableComponent: {color: "lightgreen", shape: "CIRCLE", label: "Slime Spawner"},
        ageableComponent: {age: 0, effectComponent: "spawnEffectComponent", timeToEffect: 5},
        usableComponent: {behavior: "BUILD"},
        hurtboxComponent: {radius: 75, maxHealth: 5000, currentHealth: 5000, regenRate: 100, effectComponent: "spawnEffectComponent"},
        spawnEffectComponent: {spawnEntity: "SLIME"},
        alignmentComponent: {alignment: "EVIL"},
    },
    "GUARD_TOWER": {
        sizeComponent: {size: 150},
        drawableComponent: {color: "beige", shape: "SQUARE", label: "Guard Tower"},
        ageableComponent: {age: 0, effectComponent: "spawnEffectComponent", timeToEffect: 5},
        interactableComponent: {effectComponent: "spawnEffectComponent"},
        usableComponent: {behavior: "BUILD"},
        hurtboxComponent: {radius: 150, maxHealth: 5000, currentHealth: 5000, regenRate: 100},
        spawnEffectComponent: {spawnEntity: "GUARD"},
        alignmentComponent: {alignment: "GOOD"},
    },
    "GUARD": {
        velocityComponent: {x: 0, y: 0},
        sizeComponent: {size: 50},
        drawableComponent: {color: "beige", shape: "CIRCLE", label: "guard"},
        hitboxComponent: {radius: 12.5, damage: 60},
        hurtboxComponent: {radius: 12.5, maxHealth: 150, currentHealth: 150},
        alignmentComponent: {alignment: "GOOD"},
        aiComponent: {},
    }
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