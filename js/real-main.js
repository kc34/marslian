/// <reference path="./main.js" />

/**
 * @type {LocalHost}
 */
var localHost;

const menuScreen =          /** @type {HTMLDivElement} */       (document.getElementById("menu-screen"));
const mainMenu =            /** @type {HTMLDivElement} */       (document.getElementById("main-menu"));
const usernameInput =       /** @type {HTMLInputElement} */     (document.getElementById("username-input"));
const colorPickerInput =    /** @type {HTMLInputElement} */     (document.getElementById("color-picker-input"));
const singlePlayerButton =  /** @type {HTMLButtonElement} */    (document.getElementById("single-player-button"));
const multiPlayerButton =   /** @type {HTMLButtonElement} */    (document.getElementById("multi-player-button"));

singlePlayerButton.addEventListener('click', () => {
    // Swap screens
    menuScreen.style.display = "none";
    gameScreen.style.display = "flex";

    startHost();
    startClient(localHost);
});

multiPlayerButton.addEventListener('click', () => {
    mainMenu.style.display = "none";
    multiPlayerMenu.style.display = "block";
});


const multiPlayerMenu =     /** @type {HTMLDivElement} */       (document.getElementById("multi-player-menu"));
const hostButton =          /** @type {HTMLButtonElement} */    (document.getElementById("host-button"));
const remoteIdInput =       /** @type {HTMLInputElement} */     (document.getElementById("remote-id-input"));
const connectButton =       /** @type {HTMLButtonElement} */    (document.getElementById("connect-button"));

hostButton.addEventListener('click', () => {
    menuScreen.style.display = "none";
    gameScreen.style.display = "flex";

    startHost();
    startClient(localHost);
    startHosting(localHost);
})

connectButton.addEventListener('click', () => {
    const peer = /** @type {Peer} */ (new Peer());

    peer.on('open', () => {
    menuScreen.style.display = "none";
    gameScreen.style.display = "flex";
    
    const hostConn = peer.connect(remoteIdInput.value.trim());
    console.log("attempting connection: "+ remoteIdInput.value.trim());
    hostConn.on('open', () => {
        console.log("connected!");
        var remoteHost = new RemoteHost(hostConn);
        startClient(remoteHost);

        hostConn.on('data', (data) => {
            remoteHost.handleData(data);
        });
    })
    });
});

const gameScreen =          /** @type {HTMLDivElement} */       (document.getElementById("game-screen"));
const canvas =              /** @type {HTMLCanvasElement} */    (document.getElementById("myCanvas"));
const inGameHostButton =    /** @type {HTMLButtonElement} */    (document.getElementById("in-game-host-button"));
const idSpan =              /** @type {HTMLSpanElement} */      (document.getElementById("my-id"));

inGameHostButton.addEventListener('click', () => {
    startHosting(localHost);
});

function startHost() {
    localHost = new LocalHost();
    setInterval(function() {
        localHost.tick();
    }, 1000.0 / 60)
}

/** @param {Host} host */
function startClient(host) {
    var localClient = new LocalClient(host, "W", "S", "A", "D", usernameInput.value, colorPickerInput.value);
    setInterval(function() {
        localClient.tick();
    }, 1000.0 / 60)

    // Need to set the canvas's width and height with this, to avoid stretching the canvas.
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    setInterval(function() { localClient.draw(canvas); }, 1000.0 / 60)
    window.addEventListener('keydown', function(key) { localClient.keydownHandler(key); });
    window.addEventListener('keyup', function(key) { localClient.keyupHandler(key); });
    canvas.addEventListener('click', function(click) { localClient.clickHandler(click); });
    
    // disable right-click menu, and replace with auxclick.
    canvas.addEventListener('contextmenu', (event) => { event.preventDefault(); });
    canvas.addEventListener('auxclick', function(click) { localClient.auxClickHandler(click); });
}

/** @param {Host} host */
function startHosting(host) {
    const peer = /** @type {Peer} */ (new Peer());

    peer.on('open', (id) => {
        idSpan.textContent = id;
    })

    peer.on('connection', (incomingConn) => {
        console.log("someone connected!");
        /** @type {RemoteClient} */
        var remoteClient;
        incomingConn.on('open', () => {
            remoteClient = new RemoteClient(host, incomingConn);
        })

        incomingConn.on('data', (data) => {
            remoteClient.handleData(data);
        });
    });
}