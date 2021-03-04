/**
 * @Date:   2020-12-07T17:32:33+01:00
 * @Last modified time: 2020-12-19T23:03:15+01:00
 * @License: MIT
 */

const express = require('express')
const app = express()
const http = require('http').Server(app);
const io = require("socket.io")(http);

const port = 3000;
const motd = "Cryptoip, VOIP / Chat in realtime fully encrypted [ OPEN SOURCE ]";

app.get('/', function (req, res) {
  res.sendStatus(400);
});
http.listen(port);
var users = [];
var online = [];
io.sockets.on('connection', function (socket) {
  socket.on("connection", function (username, keyHash, publicKey) {
    var checkDone = 2;
    users.forEach(function (client) {
      if (client.username == username) {
        if (client.keyHash == keyHash) {
          checkDone = 1;
        } else {
          console.log("Kicked " + socket.id);
          io.to(socket.id).emit("kick", "(invalid key hash) - Use your own username, the username is already used");
          socket.disconnect();
          checkDone = 3;
        }
      } else if (client.keyHash == keyHash) {
        if (client.username == username) {
          checkDone = 1;
        } else {
          console.log("Kicked " + socket.id);
          io.to(socket.id).emit("kick", "(invalid username) - Use your own username, the username is already used");
          socket.disconnect();
          checkDone = 3;
        }
      }
    });
    if (checkDone == 1) {
      var alreadyConnected = false;
      online.forEach(function (user) {
        if (user.socketId == socket.id) {
          alreadyConnected = true;
        }
      });
      if (!alreadyConnected)
        online.push({ username: username, socketId: socket.id, publicKey: publicKey });
      io.to(socket.id).emit("clientList", online);
      io.to(socket.id).emit("motd", motd);
    } else if (checkDone == 2) {
      users.push({ username: username, keyHash: keyHash });
      var alreadyConnected = false;
      online.forEach(function (user) {
        if (user.socketId == socket.id) {
          alreadyConnected = true;
        }
      });
      if (!alreadyConnected)
        online.push({ username: username, socketId: socket.id, publicKey: publicKey });
      io.to(socket.id).emit("clientList", online);
      io.to(socket.id).emit("motd", motd);
    }
  });
  socket.on("message", function (message, signature, receiver) {
    if (receiver == "none") {
      var author = "";
      online.forEach(function (user) {
        if (user.socketId == socket.id) {
          author = user.username;
        }
      });
      socket.emit("message", message, author, signature);
    } else {
      var author = "";
      online.forEach(function (user) {
        if (user.socketId == socket.id) {
          author = user.username;
        }
      });
      io.to(receiver).emit("message", message, author, signature);
    }
  });
  socket.on("disconnect", function () {
    for (let i = 0; i < online.length; i++) {
      if (online[i].socketId == socket.id) {
        online.splice(i, 1);
      }
    }
    socket.emit("clientList", online);
  });
});
