/**
 * Game engine. Just a big-ass bag of Entities and a camera.
 */
class Game {
    playerId = undefined;
    cameraId = undefined;
    entityId = -1;

    pressedKeys = new Set();
    fixedCamera = false;

    cornCount = 0;
    cornSeeds = 5;

    positionComponents = new Map();
    drawableComponents = new Map();
    followPlayerComponents = new Map();
    ageableComponents = new Map();
    harvestableComponents = new Map();

    constructor() {

        this.playerId = this.getNextId();
        this.positionComponents.set(this.playerId, new PositionComponent(10, 10));
        this.drawableComponents.set(this.playerId, new DrawableComponent("#7b00ffff", "Lilian <3"));

        this.cameraId = this.getNextId();
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

    tick() {
        const playerPositionComponent = this.positionComponents.get(this.playerId);
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
        for (const ageableComponent of this.ageableComponents.values()) {
            ageableComponent.age += 0.01;
        }

        for (const entityId of this.followPlayerComponents.keys()) {
            const positionComponent = this.positionComponents.get(entityId);
            const playerPositionComponent = this.positionComponents.get(this.playerId);
            const maxDistanceFromPlayer = this.followPlayerComponents.get(entityId).maxDistanceFromPlayer;
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

    draw(ctx) {
        ctx.fillStyle = "#888888";
		ctx.fillRect( 0 , 0 , window.innerWidth , window.innerHeight );

        for (const entityId of this.drawableComponents.keys()) {
            if (!this.drawableComponents.has(entityId) || !this.positionComponents.has(entityId)) {
                continue;
            }
            const positionComponent = this.positionComponents.get(entityId);
            const drawableComponent = this.drawableComponents.get(entityId);
            if (entityId == this.cameraId) {
                continue;
            }
            if (this.fixedCamera) {
                this.drawCircle(ctx, positionComponent.x, positionComponent.y);
            } else {
                const cameraPositionComponent = this.positionComponents.get(this.cameraId);
                const entityPositionComponent = this.positionComponents.get(entityId);
                const age = this.ageableComponents.has(entityId) ? this.ageableComponents.get(entityId).age : undefined;
                this.drawCircle(
                    drawableComponent,
                    ctx,
                    (window.innerWidth / 2) - (cameraPositionComponent.x - entityPositionComponent.x),
                    (window.innerHeight / 2) - (cameraPositionComponent.y - entityPositionComponent.y),
                    age);
            }
        }

        ctx.fillStyle = "#FFFFFF";
		ctx.font = "20px Courier New";
		ctx.fillText("Lilian on Mars", 10, 25);
		ctx.fillText("Corn Count: " + this.cornCount.toString(), 10, 75);
		ctx.fillText("Corn Seeds: " + this.cornSeeds.toString(), 10, 100);
    }

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

    clickHandler(clickEvent) {
        // first, try to determine where the user is clicking.
        var x;
        var y;
        if (this.fixedCamera) {
            x = clickEvent.x;
            y = clickEvent.y;
        } else {
            const cameraPositionComponent = this.positionComponents.get(this.cameraId);
            x = clickEvent.x - window.innerWidth / 2 + cameraPositionComponent.x
            y = clickEvent.y - window.innerHeight / 2 + cameraPositionComponent.y
        }
        // try to find someone who got harvested
        for (const entityId of this.harvestableComponents.keys()) {
            const entityPositionComponent = this.positionComponents.get(entityId);
            if (Math.abs(x - entityPositionComponent.x) < 25 && Math.abs(y - entityPositionComponent.y) < 25) {
                console.log("hit!");
                if (this.ageableComponents.get(entityId).age >= Math.PI * 2) {
                    this.positionComponents.delete(entityId);
                    this.drawableComponents.delete(entityId);
                    this.ageableComponents.delete(entityId);
                    this.harvestableComponents.delete(entityId);
                    this.cornCount += 1
                    this.cornSeeds += 2;
                } else {
                    console.log(this.ageableComponents.get(entityId).age);
                }
                return;
            }
        }
        // if no one got clicked on, but it's close to the player, then plant a corn.
        const playerPositionComponent = this.positionComponents.get(this.playerId);
        if (Math.abs(x - playerPositionComponent.x) < 200 && Math.abs(y - playerPositionComponent.y) < 200) {
            if (this.cornSeeds > 0) {
                this.cornSeeds -= 1;
                this.makeCorn(x, y);
            }
        }
    }

    keydownHandler(keyEvent) {
        const key = String.fromCharCode(keyEvent.keyCode);
        this.pressedKeys.add(key);
    }

    keyupHandler(keyEvent) {
        const key = String.fromCharCode(keyEvent.keyCode);
        this.pressedKeys.delete(key);
    }

    makeCorn(x, y) {
        const cornId = this.getNextId();
        this.positionComponents.set(cornId, new PositionComponent(x, y));
        this.drawableComponents.set(cornId, new DrawableComponent("#ffff00"));
        this.ageableComponents.set(cornId, new AgeableComponent());
        this.harvestableComponents.set(cornId, new HarvestableComponent());
    }
}

class PositionComponent {
    x = undefined;
    y = undefined;
    
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class DrawableComponent {
    color = undefined;
    label = undefined;

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