var WebSocketServer = require("websocket").server;
var http = require("http");
const express = require("express");
const lib = require("./lib.js");
const app = express();

app.use(express.json());

var connections = [];

var serverPort = 8080;

const server = app.listen(process.env.PORT || 3000);

app.get("/", function(req, res) {
    res.end("Hello world");
});

app.post("/order_status", function(req, res) {
    var message = "";
    if (req.body["message"] != undefined) {
        message = req.body["message"];
    } else {
        message = JSON.stringify(req.body);
    }
    console.log(JSON.stringify(req.body));
    console.log("Sending post message '" + message + "' to everybody");
    connections.forEach(function(item, index) {
        item.sendUTF(message);
        //item.close();
    });
    res.end(message + " sent to everybody");
});


var wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}


wsServer.on("request", function(request) {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log(new Date() + " Connection from origin " + request.origin + " rejected.");
        return;
    }
    console.log("agent: " + request["httpRequest"]["headers"]["user-agent"] + ", origin: " + request.origin);
    var requestArray = lib.convertGetRequestToObject(request["httpRequest"]["url"]);
  
    if (requestArray.auth == undefined){
      request.reject();
      return;
    } else {
     var connection = request.accept(null, request.origin);

    connection.id = requestArray.auth;
    connections.push(connection); 
    }

    console.log(new Date() + " Connection accepted from " + connection.remoteAddress);
    console.log("Count of connected clients: " + connections.length);
    connection.sendUTF("Greetings from server");
    connection.on("message", function(message) {
        if (message.type === "utf8") {
                console.log("Received Message: " + message.utf8Data + " (from " + connection.id + ")");
                connections.forEach(function(item, index) {
                    if (item.id != connection.id) {
                        item.sendUTF(message.utf8Data);
                    }
                });
        }
    });
    connection.on("close", function(reasonCode, description) {
        console.log(new Date() + " Peer " + connection.remoteAddress + " disconnected.");
        console.log("Connections length before removal: " + connections.length);
        for (var i = 0; i < connections.length; i++) {
            if (connections[i].id === connection.id) {
                connections.splice(i, 1);
            }
        }
        console.log("Connections length after removal: " + connections.length);
    });
});
