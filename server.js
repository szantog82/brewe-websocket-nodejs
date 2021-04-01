var WebSocketServer = require("websocket").server;
var http = require("http");
const express = require("express");
const lib = require("./lib.js");
const app = express();

var json = {"auth" : "8faopcj",
"message" : "1 macchiato elkészült jöhetsz érte",
"order_id" : 5,
"item_id": 8,
"shop_name": "Espresso Embassy"};
//https://bold-wind-museum.glitch.me/order_status

app.use(express.json());

var connections = [];
var messagesBuffer = {
  "abbab": ["Helló1", "Csáó2", "mizu3"] 
};

const server = app.listen(process.env.PORT || 8080);

app.get("/", function(req, res) {
    res.end("Hello world");
});

app.post("/send_message", function(req, res) {
  console.log("Incoming message via POST/send_message: " + req.body["message"]);
    var auth = req.body["auth"];
    if (req.body["toAll"]) {
      connections.forEach(function(item, index) {
             item.sendUTF(req.body["message"]); 
        });
    } else {
      connections.forEach(function(item, index) {
            if (item.id = auth) {
                item.sendUTF(JSON.stringify(req.body)); 
            }
        });
    }
    res.end();
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
      console.log("no request auth; rejected");
      request.reject();
      return;
    } else {
     var connection = request.accept(null, request.origin);
    console.log("request auth:" +requestArray.auth);
    connection.id = requestArray.auth;
    connections.push(connection); 
    console.log(messagesBuffer[connection.id]);
      if (messagesBuffer[connection.id] != undefined) {
        messagesBuffer[connection.id].forEach(function(item, index){
          connection.sendUTF(item);
        });
      }
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
        for (var i = 0; i < connections.length; i++) {
            if (connections[i].id === connection.id) {
                connections.splice(i, 1);
            }
        }
        console.log("Connections length after removal: " + connections.length);
    });
});
