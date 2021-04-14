const express = require('express')
const app = express()
const http = require('http').Server(app);
const io = require('socket.io')(http);
const crypto = require('crypto');

const port = 3000;
const motd = "Cryptoip, VOIP / Chat in realtime fully encrypted [ OPEN SOURCE ]";

app.get('/', function (req, res) {
  res.sendStatus(400);
});
http.listen(port);
var users = [];
var online = [];
var secureKey = null;
var mainKey = randomString(16);
setInterval(function () {
  online.forEach(function (client) {
    if (client.warn > 2) {
      secureKey = randomString(16);
      io.to(client.socketId).emit("kick", encrypt("(security bot) - You have 3 warns, please stop!", secureKey), secureKey);
    }
    if (client.actionNumber > 0) {
      client.actionNumber--;
    }
  });
}, 500);
io.sockets.on('connection', function (socket) {
  socket.on("connection", function (connectionInfos, secureKey) {
    var connectionInfosDecrypt = JSON.parse(decrypt(connectionInfos, secureKey));
    var checkDone = 2;
    users.forEach(function (client) {
      if (client.username == connectionInfosDecrypt.username) {
        if (client.keyHash == connectionInfosDecrypt.keyHash) {
          checkDone = 1;
        } else {
          console.log("Kicked " + socket.id);
          secureKey = randomString(16);
          io.to(socket.id).emit("kick", encrypt("(invalid key hash) - Use your own username, the username is already used!", secureKey), secureKey);
          socket.disconnect();
          checkDone = 3;
        }
      } else if (client.keyHash == connectionInfosDecrypt.keyHash) {
        if (client.username == connectionInfosDecrypt.username) {
          checkDone = 1;
        } else {
          console.log("Kicked " + socket.id);
          secureKey = randomString(16);
          io.to(socket.id).emit("kick", encrypt("(invalid username) - Use your own username, the username is already used!", secureKey), secureKey);
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
        online.push({ username: connectionInfosDecrypt.username, socketId: socket.id, publicKey: connectionInfosDecrypt.publicKey, clientKey: connectionInfosDecrypt.clientKey, actionNumber: 0, warn: 0 });
      secureKey = randomString(16);
      io.to(socket.id).emit("infos", encrypt(JSON.stringify({ motd: motd, mainKey: mainKey }), secureKey), secureKey);
      secureKey = randomString(16);
      io.to(socket.id).emit("clientList", encrypt(JSON.stringify(online), secureKey), secureKey);
      socket.emit("clientList", encrypt(JSON.stringify(online), secureKey), secureKey);
    } else if (checkDone == 2) {
      users.push({ username: connectionInfosDecrypt.username, keyHash: connectionInfosDecrypt.keyHash });
      var alreadyConnected = false;
      online.forEach(function (user) {
        if (user.socketId == socket.id) {
          alreadyConnected = true;
        }
      });
      if (!alreadyConnected)
        online.push({ username: connectionInfosDecrypt.username, socketId: socket.id, publicKey: connectionInfosDecrypt.publicKey, clientKey: connectionInfosDecrypt.clientKey, actionNumber: 0, warn: 0 });
      secureKey = randomString(16);
      io.to(socket.id).emit("infos", encrypt(JSON.stringify({ motd: motd, mainKey: mainKey }), secureKey), secureKey);
      secureKey = randomString(16);
      io.to(socket.id).emit("clientList", encrypt(JSON.stringify(online), secureKey), secureKey);
    }
  });
  socket.on("message", function (messageData, secureKey) {
    var messageDataDecrypt = JSON.parse(decrypt(messageData, secureKey));
    online.forEach(function (client) {
      if (client.socketId == socket.id) {
        client.actionNumber++;
        if (client.actionNumber > 10) {
          client.actionNumber = 0;
          client.warn++;
        }
      }
    });
    if (messageDataDecrypt.receiver == "none") {
      var author = "";
      online.forEach(function (user) {
        if (user.socketId == socket.id) {
          author = user.username;
        }
      });
      socket.emit("message", encrypt(JSON.stringify({ message: messageDataDecrypt.message, author: author, signature: messageDataDecrypt.signature, isMain: true, publicKey: messageDataDecrypt.publicKey }), secureKey), secureKey);
    } else {
      var author = "";
      online.forEach(function (user) {
        if (user.socketId == socket.id) {
          author = user.username;
        }
      });
      io.to(messageDataDecrypt.receiver).emit("message", encrypt(JSON.stringify({ message: messageDataDecrypt.message, author: author, signature: messageDataDecrypt.signature, isMain: false }), secureKey), secureKey);
    }
  });
  socket.on("disconnect", function () {
    for (let i = 0; i < online.length; i++) {
      if (online[i].socketId == socket.id) {
        online.splice(i, 1);
      }
    }
    secureKey = randomString(16);
    socket.emit("clientList", encrypt(JSON.stringify(online), secureKey), secureKey);
  });
  socket.on("binaryData", function(data) {
    //socket.emit("voice", data);
    socket.broadcast.emit('voice', data);
  });
});
function randomString(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
function encrypt(text, password) {
  var cipher = crypto.createCipheriv("aes-128-cbc", password.repeat(16).slice(0, 16), password.repeat(16).slice(0, 16))
  var crypted = cipher.update(text, 'utf8', 'hex')
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(text, password) {
  var decipher = crypto.createDecipheriv("aes-128-cbc", password.repeat(16).slice(0, 16), password.repeat(16).slice(0, 16))
  var dec = decipher.update(text, 'hex', 'utf8')
  dec += decipher.final('utf8');
  return dec;
}