/// <reference path="./main.js" />

const menuScreen = document.getElementById("menu-screen");
const mainMenu = document.getElementById("main-menu")
const singlePlayerButton = document.getElementById("single-player-button");
const multiPlayerButton = document.getElementById("multi-player-button");

/** @type {LocalHost} */
var localHost;
function startHost() {
    localHost = new LocalHost();
    setInterval(function() {
        localHost.tick();
    }, 1000.0 / 60)
}

/** @param {Host} host */
function startClient(host) {
    var localClient = new LocalClient(host, "W", "S", "A", "D");
    setInterval(function() {
        localClient.tick();
    }, 1000.0 / 60)

    const canvas = document.getElementById("myCanvas");
    // Need to set the canvas's width and height with this, to avoid stretching the canvas.
    canvas.width = window.innerWidth / 2;
    canvas.height = window.innerHeight / 2;

    setInterval(function() { localClient.draw(canvas); }, 1000.0 / 60)
    window.addEventListener('keydown', function(key) { localClient.keydownHandler(key); });
    window.addEventListener('keyup', function(key) { localClient.keyupHandler(key); });
    canvas.addEventListener('click', function(click) { localClient.clickHandler(click); });
}

/** @param {Host} host */
function startHosting(host) {
    const peer = new Peer()

    peer.on('open', (id) => {
    const idSpan = document.getElementById('my-id');
        idSpan.textContent = id;
    })

    peer.on('connection', (incomingConn) => {
        console.log("someone connected!");
        var remoteClient;
        incomingConn.on('open', () => {
            remoteClient = new RemoteClient(localHost, incomingConn);
        })

        incomingConn.on('data', (data) => {
            remoteClient.handleData(data);
        });
    });
}

singlePlayerButton.addEventListener('click', () => {
    // Swap screens
    menuScreen.style.display = "none";
    const gameScreen = document.getElementById("game-screen");
    gameScreen.style.display = "flex";

    startHost();
    startClient(localHost);
});

multiPlayerButton.addEventListener('click', () => {
    mainMenu.style.display = "none";
    const multiPlayerMenu = document.getElementById("multi-player-menu");
    multiPlayerMenu.style.display = "block";

    const hostButton = document.getElementById("host-button");
    hostButton.addEventListener('click', () => {
        menuScreen.style.display = "none";
        const gameScreen = document.getElementById("game-screen");
        gameScreen.style.display = "flex";

        startHost();
        startClient(localHost);
        startHosting(localHost);
    })
});

const inGameHostButton = document.getElementById("in-game-host-button");
inGameHostButton.addEventListener('click', () => {
    startHosting();
});

document.getElementById("connect-button").addEventListener('click', () => {

    const peer = new Peer();

    peer.on('open', () => {
    menuScreen.style.display = "none";
    const gameScreen = document.getElementById("game-screen");
    gameScreen.style.display = "flex";
    
    const remoteIdInput = document.getElementById("remote-id-input");
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