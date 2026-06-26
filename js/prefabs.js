/** @type {Object<string, EntityComponents>} */
const PREFABS = {
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
}


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