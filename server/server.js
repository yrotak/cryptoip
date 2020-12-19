const express = require('express')
const app = express()
const http = require('http').Server(app);
const io = require("socket.io")(http);

const port = 3000;

app.get('/', function(req,res) {
    res.sendStatus(400);
});
var clients = [];
http.listen(port);

io.sockets.on('connection', function(socket) {
  socket.on('username', function(username) {
    var id = socket.id;
    clients.push({username, id});
    console.log("\nnew client connected with username: " + username + " and id: "+ socket.id+"!");
    io.emit('UserConnected', JSON.stringify(clients));
  });
  socket.on('radio', function(blob, clientID) {
    io.emit('voice', blob, clientID);
  });
  socket.on('message', function(message, clientID) {
    if(message != "" && message != " ")
      io.emit('messageReceive', message, clientID);
  });
  socket.on('disconnect', function() {
    var username = "";
    for(let i = 0; i < clients.length; i++) {
      if(clients[i]["id"] == socket.id) {
        clients.splice(clients[i], 1);
      }
    }
    console.log("\nthe client with id: "+ socket.id+" has disconnect!");
    io.emit('UserDisconnected', JSON.stringify(clients));
  });
});
