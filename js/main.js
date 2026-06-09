class BaseModel {
    cornCount = 0;
    cornSeeds = 5;

    // entity creation
    /** @type {Set<number>} */ entityIds = new Set();

    // component pools
    /** @type {Map<string, Map<number, Component>>} */ poolsByComponentName = new Map();
    /** @type {Map<number, PositionComponent>} */ positionComponents = new Map();
    /** @type {Map<number, DrawableComponent>} */ drawableComponents = new Map();
    /** @type {Map<number, FollowPlayerComponent>} */ followPlayerComponents = new Map();
    /** @type {Map<number, AgeableComponent>} */ ageableComponents = new Map();
    /** @type {Map<number, HarvestableComponent>} */ harvestableComponents = new Map();

    constructor() {
        // set up component pool
        this.poolsByComponentName.set("PositionComponent", this.positionComponents);
        this.poolsByComponentName.set("DrawableComponent", this.drawableComponents);
        this.poolsByComponentName.set("FollowPlayerComponent", this.followPlayerComponents);
        this.poolsByComponentName.set("AgeableComponent", this.ageableComponents);
        this.poolsByComponentName.set("HarvestableComponent", this.harvestableComponents);
    }
    
    getNextId() {
        return this.entityIds.size;
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
        // FollowPlayerSystem
        const entityQuery =
            /** @type {Map<number, [FollowPlayerComponent, PositionComponent]>} */
            (this.query(["FollowPlayerComponent", "PositionComponent"]));
        for (const [_, [followPlayerComponent, positionComponent]] of entityQuery) {
            const maxDistanceFromPlayer = followPlayerComponent.maxDistanceFromPlayer;
            const playerPositionComponent = this.positionComponents.get(followPlayerComponent.followingId);
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
        for (const ageableComponent of this.ageableComponents.values()) {
            ageableComponent.age += 0.01;
        }
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    makeCorn(x, y) {
        const cornId = this.getNextId();
        this.entityIds.add(cornId);
        this.positionComponents.set(cornId, {x: x, y: y});
        this.drawableComponents.set(cornId, {color: "#ffff00"});
        this.ageableComponents.set(cornId, {age: 0});
        this.harvestableComponents.set(cornId, {});
    }

}

/**
 * Game engine. Just a big-ass bag of Entities and a camera.
 */
class HostModel extends BaseModel {

    /** @type {GameEvent[]} */
    events = [];

    constructor() {
        super();
        this.makeCorn(Math.random() * 500 - 250, Math.random() * 500 - 250);
        this.makeCorn(Math.random() * 500 - 250, Math.random() * 500 - 250);
        this.makeCorn(Math.random() * 500 - 250, Math.random() * 500 - 250);
        this.makeCorn(Math.random() * 500 - 250, Math.random() * 500 - 250);
    }

    /**
     * When a player connects, add them here, and also send them the game state.
     * @returns {[Map<string, Map<number, Component>>, Set<number>, number, number]}
     */
    connect() {
        const playerId = this.getNextId();
        this.entityIds.add(playerId);
        this.positionComponents.set(playerId, {x: 10, y: 10});
        this.drawableComponents.set(playerId, {color: "#7b00ffff", label: "Lilian <3"});

        const cameraId = this.getNextId();
        this.entityIds.add(cameraId);
        this.positionComponents.set(cameraId, {x: 10, y: 10})
        this.followPlayerComponents.set(cameraId, {maxDistanceFromPlayer: 150, followingId: playerId});

        return [this.poolsByComponentName, this.entityIds, playerId, cameraId];
    }

    tick() {
        // Manage Client actions first, then run frames.
        for (const event in this.events) {
            if (event instanceof MoveEvent) {
                const playerPositionComponent = this.positionComponents.get(event.playerId);
                if (playerPositionComponent) {
                    playerPositionComponent.x = event.x;
                    playerPositionComponent.y = event.y;
                }
            } else if (event instanceof HarvestEvent) {
                // this.positionComponents.delete(event.harvestableId);
                // this.drawableComponents.delete(event.harvestableId);
                // this.ageableComponents.delete(event.harvestableId);
                // this.harvestableComponents.delete(event.harvestableId);
                this.cornCount += 1
                this.cornSeeds += 2;
            } else if (event instanceof PlantEvent) {
                // this.makeCorn(event.x, event.y);
            }
        }

        super.tick()
    }

    /** @param {GameEvent[]} events */
    addEvents(events) {
        for (const gameEvent in events) {
            this.events.push(gameEvent);
        }
    }
}

class ClientModel extends BaseModel {
    // game state
    pressedKeys = new Set();

    // singleton entities
    /** @type {number} */ playerId;
    /** @type {number} */ cameraId;

    /**
     * @param {Model} model 
     */
    constructor(model, up, down, left, right) {
        super();
        this.model = model;
        this.up = up;
        this.down = down;
        this.left = left;
        this.right = right;
        var data = this.model.connect();
        this.poolsByComponentName = data[0];
        this.positionComponents = this.poolsByComponentName.get("PositionComponent");
        this.drawableComponents = this.poolsByComponentName.get("DrawableComponent");
        this.followPlayerComponents = this.poolsByComponentName.get("FollowPlayerComponent");
        this.ageableComponents = this.poolsByComponentName.get("AgeableComponent");
        this.harvestableComponents = this.poolsByComponentName.get("HarvestableComponent");
        this.entityIds = data[1]
        this.playerId = data[2];
        this.cameraId = data[3];
    }

    tick() {
        // Run client frame first, then send events.
        super.tick();

        const playerPositionComponent = this.positionComponents.get(this.playerId);
        if (!!playerPositionComponent && this.pressedKeys.size > 0) {
            // ControllableSystem
            if (this.pressedKeys.has(this.up)) {
                playerPositionComponent.y -= 2;
            }
            if (this.pressedKeys.has(this.down)) {
                playerPositionComponent.y += 2;
            }
            if (this.pressedKeys.has(this.left)) {
                playerPositionComponent.x -= 2;
            }
            if (this.pressedKeys.has(this.right)) {
                playerPositionComponent.x += 2;
            }
            this.model.addEvents(new MoveEvent(this.playerId, playerPositionComponent.x, playerPositionComponent.y));
        }
    }

    /** @param {HTMLCanvasElement} canvas */
    draw(canvas) {
        const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext("2d"));
        canvas.width = window.innerWidth / 2;
        canvas.height = window.innerHeight / 2;
        ctx.fillStyle = "#888888";
		ctx.fillRect( 0 , 0 , window.innerWidth / 2, window.innerHeight / 2);

        const entityQuery =
            /** @type {Map<number, [DrawableComponent, PositionComponent]>} */
            (this.query(["DrawableComponent", "PositionComponent"]));
        for (const [entityId, [drawableComponent, positionComponent]] of entityQuery) {
            if (entityId == this.cameraId) {
                continue;
            }
            const cameraPositionComponent = this.positionComponents.get(this.cameraId);
            if (!cameraPositionComponent) {
                this.drawCircle(drawableComponent, ctx, positionComponent.x, positionComponent.y);
            } else {
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
            (this.query(["HarvestableComponent", "PositionComponent", "AgeableComponent"]));
        for (const [entityId, [_, positionComponent, ageableComponent]] of entityQuery) {
            if (Math.abs(x - positionComponent.x) < 25 && Math.abs(y - positionComponent.y) < 25) {
                if (ageableComponent.age >= Math.PI * 2) {
                    console.log("harvest registered!");
                    console.log(entityId);
                    this.positionComponents.delete(entityId);
                    this.drawableComponents.delete(entityId);
                    this.ageableComponents.delete(entityId);
                    this.harvestableComponents.delete(entityId);
                    this.cornCount += 1
                    this.cornSeeds += 2;
                    this.model.addEvents(new HarvestEvent(this.playerId, entityId));
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
}

/** @interface */
class GameEvent {}

/** @implements {GameEvent} */
class MoveEvent {
    constructor(playerId, x, y) {
        this.playerId = playerId;
        this.x = x;
        this.y = y;
    }
}

/** @implements {GameEvent} */
class HarvestEvent {
    constructor(playerId, harvestableId) {
        this.playerId = playerId;
        this.harvestableId = harvestableId;
    }
}

/** @implements {GameEvent} */
class PlantEvent {
    constructor(playerId, x, y) {
        this.playerId = playerId;
        this.x = x;
        this.y = y;
    }
}

/** @interface */
class Component {}

/**
 * @typedef {Object} PositionComponent
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} DrawableComponent
 * @property {string} color
 * @property {string|undefined} label
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
 * @typedef {Object} HarvestableComponent
 */