/**
 * Game engine. Just a big-ass bag of Entities and a camera.
 */
class Game {
    // game state
    pressedKeys = new Set();
    cornCount = 0;
    cornSeeds = 5;

    // entity creation
    entityId = -1;
    /** @type {Set<number>} */ entityIds = new Set();

    // singleton entities
    /** @type {number} */ playerId;
    /** @type {number} */ cameraId;

    // component pools
    /** @type {Map<string, Map<number, Component>>} */ poolsByComponentName = new Map();
    /** @type {Map<number, PositionComponent>} */ positionComponents = new Map();
    /** @type {Map<number, DrawableComponent>} */ drawableComponents = new Map();
    /** @type {Map<number, FollowPlayerComponent>} */ followPlayerComponents = new Map();
    /** @type {Map<number, AgeableComponent>} */ ageableComponents = new Map();
    /** @type {Map<number, HarvestableComponent>} */ harvestableComponents = new Map();

    // debug
    fixedCamera = false;

    constructor() {
        // set up component pool
        this.poolsByComponentName.set(PositionComponent.name, this.positionComponents);
        this.poolsByComponentName.set(DrawableComponent.name, this.drawableComponents);
        this.poolsByComponentName.set(FollowPlayerComponent.name, this.followPlayerComponents);
        this.poolsByComponentName.set(AgeableComponent.name, this.ageableComponents);
        this.poolsByComponentName.set(HarvestableComponent.name, this.harvestableComponents);

        this.playerId = this.getNextId();
        this.entityIds.add(this.playerId);
        this.positionComponents.set(this.playerId, new PositionComponent(10, 10));
        this.drawableComponents.set(this.playerId, new DrawableComponent("#7b00ffff", "Lilian <3"));

        this.cameraId = this.getNextId();
        this.entityIds.add(this.cameraId);
        this.positionComponents.set(this.cameraId, new PositionComponent(10, 10))
        this.drawableComponents.set(this.cameraId, new DrawableComponent("#000000"));
        this.followPlayerComponents.set(this.cameraId, new FollowPlayerComponent());

        this.makeCorn(Math.random() * 500 - 250, Math.random() * 500 - 250);
        this.makeCorn(Math.random() * 500 - 250, Math.random() * 500 - 250);
        this.makeCorn(Math.random() * 500 - 250, Math.random() * 500 - 250);
        this.makeCorn(Math.random() * 500 - 250, Math.random() * 500 - 250);
    }
    
    getNextId() {
        this.entityId += 1;
        return this.entityId;
    }

    /**
     * @param {string[]} componentNames
     */
    query(componentNames) {
        /** @type {Map<number, Component[]>} */
        const entities = new Map();
        for (const entityId of this.entityIds.keys()) {
            const components = [];
            for (const componentName of componentNames) {
                const componentPool = this.poolsByComponentName.get(componentName);
                if (!componentPool) {
                    break;
                }
                const component = componentPool.get(entityId);
                if (!component) {
                    break;
                }
                components.push(component);
            }
            if (components.length == componentNames.length) {
                entities.set(entityId, components);
            }
        }
        return entities;
    }

    tick() {
        const playerPositionComponent = this.positionComponents.get(this.playerId);
        if (!!playerPositionComponent) {
            // ControllableSystem
            if (this.pressedKeys.has("W")) {
                playerPositionComponent.y -= 1;
            }
            if (this.pressedKeys.has("S")) {
                playerPositionComponent.y += 1;
            }
            if (this.pressedKeys.has("A")) {
                playerPositionComponent.x -= 1;
            }
            if (this.pressedKeys.has("D")) {
                playerPositionComponent.x += 1;
            }

            // FollowPlayerSystem
            const entityQuery =
                /** @type {Map<number, [FollowPlayerComponent, PositionComponent]>} */
                (this.query([FollowPlayerComponent.name, PositionComponent.name]));
            for (const [_, [followPlayerComponent, positionComponent]] of entityQuery) {
                const maxDistanceFromPlayer = followPlayerComponent.maxDistanceFromPlayer;
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

        // AgeableSystem
        for (const ageableComponent of this.ageableComponents.values()) {
            ageableComponent.age += 0.01;
        }
    }

    /** @param {HTMLCanvasElement} canvas */
    draw(canvas) {
        const ctx = canvas.getContext("2d");
        canvas.width = window.innerWidth / 2;
        canvas.height = window.innerHeight / 2;
        console.log("filling rectangle!")
        console.log(window.innerWidth);
        console.log(window.innerHeight);
        ctx.fillStyle = "#888888";
		ctx.fillRect( 0 , 0 , window.innerWidth / 2, window.innerHeight / 2);

        const entityQuery =
            /** @type {Map<number, [DrawableComponent, PositionComponent]>} */
            (this.query([DrawableComponent.name, PositionComponent.name]));
        for (const [entityId, [drawableComponent, positionComponent]] of entityQuery) {
            if (entityId == this.cameraId) {
                continue;
            }
            if (this.fixedCamera) {
                this.drawCircle(drawableComponent, ctx, positionComponent.x, positionComponent.y);
            } else {
                const cameraPositionComponent = this.positionComponents.get(this.cameraId);
                if (!cameraPositionComponent) {
                    continue;
                }
                const ageableComponent = this.ageableComponents.get(entityId);
                const age = !!ageableComponent ? ageableComponent.age : undefined;
                this.drawCircle(
                    drawableComponent,
                    ctx,
                    (window.innerWidth / 4) - (cameraPositionComponent.x - positionComponent.x),
                    (window.innerHeight / 4) - (cameraPositionComponent.y - positionComponent.y),
                    age);
            }
        }

        if (document.getElementById("corn-count").textContent != this.cornCount.toString()) {
            document.getElementById("corn-count").textContent = this.cornCount.toString();
        }
        if (document.getElementById("corn-seed-count").textContent != this.cornSeeds.toString()) {
            document.getElementById("corn-seed-count").textContent = this.cornSeeds.toString();
        }
        
    }

    /**
     * @param {DrawableComponent} drawableComponent
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} screenX
     * @param {number} screenY
     * @param {number} [age=2 * Math.PI]
     */
    drawCircle(drawableComponent, ctx, screenX, screenY, age) {
        if (age == undefined) {
            age = 2 * Math.PI;
        }
		ctx.beginPath();
		ctx.arc(screenX, screenY, 25, 0, age);
		ctx.fillStyle = drawableComponent.color;
		ctx.fill();
		ctx.font = "20px Courier New";
        if (!!drawableComponent.label) {
		    ctx.fillText(drawableComponent.label, screenX - 50, screenY - 30);
        }
    }

    /** @param {MouseEvent} clickEvent */
    clickHandler(clickEvent) {
        console.log(clickEvent);
        // first, try to determine where the user is clicking.
        var x;
        var y;
        if (this.fixedCamera) {
            x = clickEvent.offsetX;
            y = clickEvent.offsetY;
        } else {
            const cameraPositionComponent = this.positionComponents.get(this.cameraId);
            if (!cameraPositionComponent) {
                return;
            }
            x = clickEvent.offsetX - window.innerWidth / 4 + cameraPositionComponent.x
            y = clickEvent.offsetY - window.innerHeight / 4 + cameraPositionComponent.y
        }
        
        // HarvestableSystem -- takes priority
        const entityQuery =
            /** @type {Map<number, [HarvestableComponent, PositionComponent, AgeableComponent]>} */
            (this.query([HarvestableComponent.name, PositionComponent.name, AgeableComponent.name]));
        for (const [entityId, [_, positionComponent, ageableComponent]] of entityQuery) {
            if (Math.abs(x - positionComponent.x) < 25 && Math.abs(y - positionComponent.y) < 25) {
                if (ageableComponent.age >= Math.PI * 2) {
                    this.positionComponents.delete(entityId);
                    this.drawableComponents.delete(entityId);
                    this.ageableComponents.delete(entityId);
                    this.harvestableComponents.delete(entityId);
                    this.cornCount += 1
                    this.cornSeeds += 2;
                }
                return;
            }
        }
        
        // Otherwise, plant.
        const playerPositionComponent = this.positionComponents.get(this.playerId);
        if (Math.abs(x - playerPositionComponent.x) < 200 && Math.abs(y - playerPositionComponent.y) < 200) {
            if (this.cornSeeds > 0) {
                this.cornSeeds -= 1;
                this.makeCorn(x, y);
            }
        }
    }

    /** @param {KeyboardEvent} keyEvent */
    keydownHandler(keyEvent) {
        const key = String.fromCharCode(keyEvent.keyCode);
        this.pressedKeys.add(key);
    }

    /** @param {KeyboardEvent} keyEvent */
    keyupHandler(keyEvent) {
        const key = String.fromCharCode(keyEvent.keyCode);
        this.pressedKeys.delete(key);
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    makeCorn(x, y) {
        const cornId = this.getNextId();
        this.entityIds.add(cornId);
        this.positionComponents.set(cornId, new PositionComponent(x, y));
        this.drawableComponents.set(cornId, new DrawableComponent("#ffff00"));
        this.ageableComponents.set(cornId, new AgeableComponent());
        this.harvestableComponents.set(cornId, new HarvestableComponent());
    }
}

/** @interface */
class Component {}

/** @implements {Component} */
class PositionComponent {
    /** @type {number} */ x;
    /** @type {number} */ y;
    
    /**
     * @param {number} x
     * @param {number} y
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class DrawableComponent {
    /** @type {string} */ color;
    /** @type {string|undefined} */ label;

    /**
     * @param {string} color
     * @param {string} [label]
     */ 
    constructor(color, label) {
        this.color = color;
        this.label = label;
    }
}

/**
 * Singleton that trails behind Player singleton.
 */
class FollowPlayerComponent {
    maxDistanceFromPlayer = 250;
}

class AgeableComponent {
    age = 0;
}

class HarvestableComponent {}