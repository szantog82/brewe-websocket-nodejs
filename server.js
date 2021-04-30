var WebSocketServer = require("websocket").server;
var http = require("http");
const express = require("express");
const lib = require("./lib.js");
const app = express();
var mongoose = require('mongoose');

app.use(express.json());

var connections = [];

var mongodbUri = "mongodb://" + process.env.LOGIN + ":" + process.env.PASSWORD + "@szantog82-shard-00-00.1dmlm.mongodb.net:27017,szantog82-shard-00-01.1dmlm.mongodb.net:27017,szantog82-shard-00-02.1dmlm.mongodb.net:27017/szantog82?ssl=true&replicaSet=atlas-zj6i4v-shard-0&authSource=admin&retryWrites=true&w=majority";
var messageSchema = mongoose.Schema({
    auth: String,
    message: String,
});

var Message = mongoose.model('Message', messageSchema);

var mongoConn = mongoose.connect(mongodbUri,{ useNewUrlParser: true , useUnifiedTopology: true}, function(error) {
  console.log("Error connecting to mongoDb: " + error)
});
var mongoCollection = mongoose.connection.collection('Messages');

var upload = new Message();
upload.auth = "auth";
upload.message = "message";


const server = app.listen(process.env.PORT || 8080);

app.get("/", function(req, res) {
    res.statusCode = 302;
    res.setHeader('Location','http://www.szantog82.nhely.hu');
    res.end();
});

app.post("/send_message", function(req, res) {
  console.log("Incoming message via POST/send_message: " + req.body["message"] + ", auth: " + req.body["auth"] + ", toAll: " + req.body["toAll"]);
    var auth = req.body["auth"];
    var success = false;
    if (req.body["toAll"] == 1) {
      connections.forEach(function(item, index) {
             item.sendUTF(req.body["message"]); 
        });
    } else {
      console.log("sending message to " + auth);
      connections.forEach(function(item, index) {
            if (item.id == auth) {
                item.sendUTF(req.body["message"]);
                success = true;
            }
        });
      if (!success){
      //
      //if user was not available, save message to db
      //
     var upload = new Message();
     upload.auth = auth;
     upload.message = req.body["message"];
     console.log("sending message to " + auth + " failed, saving info to database: " + upload)
     mongoCollection.insertOne(upload, function(err, ds){
       console.log("insertion error: " + err);
     });
    }
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
    console.log("request auth: " +requestArray.auth);
    connection.id = requestArray.auth;
    connections.push(connection);
      //
      //if user was not available, when message was emitted previously
      //
      mongoCollection.find({auth: requestArray.auth}, function(err, data) {
        data.toArray(function(err2, items) {
            data.forEach(function (item, index){
              connection.sendUTF(item.message);
            })
          mongoCollection.deleteMany({ auth: requestArray.auth});
        })
      })
    }

    console.log(new Date() + " Connection accepted from " + connection.remoteAddress);
    console.log("Count of connected clients: " + connections.length);
  
    connection.on("message", function(message) {
      //
      //following section is only for debugging
      //
       /* if (message.type === "utf8") {
                console.log("Received Message: " + message.utf8Data + " (from " + connection.id + ")");
                connections.forEach(function(item, index) {
                    if (item.id != connection.id) {
                        item.sendUTF(message.utf8Data);
                    }
                });
        }*/
      //Debugging section end here
      //
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
