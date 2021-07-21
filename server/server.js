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
var inCall = [];
var secureKey = null;
var mainKey = randomString(16);

io.sockets.on('connection', (socket) => {

  // CONNECTION
  socket.on("connection", (connectionInfos, secureKey) => {
    var connectionInfosDecrypt = JSON.parse(decrypt(connectionInfos, secureKey));
    if (users.findIndex(p => p.username == connectionInfosDecrypt.username) != -1) {
      if (users[users.findIndex(p => p.username == connectionInfosDecrypt.username)].keyHash == connectionInfosDecrypt.keyHash) {
        if (online.findIndex(p => p.socketId == socket.id) == -1)
          online.push({ username: connectionInfosDecrypt.username, socketId: socket.id, publicKey: connectionInfosDecrypt.publicKey, clientKey: connectionInfosDecrypt.clientKey, actionNumber: 0, warn: 0 });
        secureKey = randomString(16);
        io.to(socket.id).emit("infos", encrypt(JSON.stringify({ motd: motd, mainKey: mainKey }), secureKey), secureKey);
        secureKey = randomString(16);
        io.to(socket.id).emit("clientList", encrypt(JSON.stringify(online), secureKey), secureKey);
        socket.broadcast.emit("clientList", encrypt(JSON.stringify(online), secureKey), secureKey);
      } else {
        secureKey = randomString(16);
        io.to(socket.id).emit("kick", encrypt("(invalid key hash) - Use your own username, the username is already used!", secureKey), secureKey);
        socket.disconnect();
      }
    } else if (users.findIndex(p => p.keyHash == connectionInfosDecrypt.keyHash) != -1) {
      if (users[users.findIndex(p => p.keyHash == connectionInfosDecrypt.keyHash)].username == connectionInfosDecrypt.username) {
        if (online.findIndex(p => p.socketId == socket.id) == -1)
          online.push({ username: connectionInfosDecrypt.username, socketId: socket.id, publicKey: connectionInfosDecrypt.publicKey, clientKey: connectionInfosDecrypt.clientKey, actionNumber: 0, warn: 0 });
        secureKey = randomString(16);
        io.to(socket.id).emit("infos", encrypt(JSON.stringify({ motd: motd, mainKey: mainKey }), secureKey), secureKey);
        secureKey = randomString(16);
        io.to(socket.id).emit("clientList", encrypt(JSON.stringify(online), secureKey), secureKey);
        socket.broadcast.emit("clientList", encrypt(JSON.stringify(online), secureKey), secureKey);
      } else {
        secureKey = randomString(16);
        io.to(socket.id).emit("kick", encrypt("(invalid username) - Use your own username, the username is already used!", secureKey), secureKey);
        socket.disconnect();
      }
    } else {
      users.push({ username: connectionInfosDecrypt.username, keyHash: connectionInfosDecrypt.keyHash });
      if (online.findIndex(p => p.socketId == socket.id) == -1)
        online.push({ username: connectionInfosDecrypt.username, socketId: socket.id, publicKey: connectionInfosDecrypt.publicKey, clientKey: connectionInfosDecrypt.clientKey, actionNumber: 0, warn: 0 });
      secureKey = randomString(16);
      io.to(socket.id).emit("infos", encrypt(JSON.stringify({ motd: motd, mainKey: mainKey }), secureKey), secureKey);
      secureKey = randomString(16);
      io.to(socket.id).emit("clientList", encrypt(JSON.stringify(online), secureKey), secureKey);
      socket.broadcast.emit("clientList", encrypt(JSON.stringify(online), secureKey), secureKey);
    }
  });


  socket.on("message", (messageData, secureKey) => {
    if (online.findIndex(p => p.socketId == socket.id) != -1) {
      var messageDataDecrypt = JSON.parse(decrypt(messageData, secureKey));
      if (messageDataDecrypt.receiver == "none") {
        var author = online[online.findIndex(p => p.socketId == socket.id)].username;
        socket.broadcast.emit("message", encrypt(JSON.stringify({ message: messageDataDecrypt.message, author: author, signature: messageDataDecrypt.signature, isMain: true, publicKey: messageDataDecrypt.publicKey }), secureKey), secureKey);
      } else {
        var author = online[online.findIndex(p => p.socketId == socket.id)].username;
        io.to(messageDataDecrypt.receiver).emit("message", encrypt(JSON.stringify({ message: messageDataDecrypt.message, author: author, signature: messageDataDecrypt.signature, isMain: false }), secureKey), secureKey);      }
    }
  });
  socket.on("disconnect", () => {
    if (online.findIndex(p => p.socketId == socket.id) != -1) {
      online.splice(online.findIndex(p => p.socketId == socket.id), 1);
      secureKey = randomString(16);
      socket.broadcast.emit("clientList", encrypt(JSON.stringify(online), secureKey), secureKey);

      inCall.splice(inCall.findIndex(p => p.socketId == socket.id), 1);
      secureKey = randomString(16);
      socket.broadcast.emit('callList', encrypt(JSON.stringify(inCall), secureKey), secureKey);
      io.to(socket.id).emit("callList", encrypt(JSON.stringify(inCall), secureKey), secureKey);

      if (inCall.findIndex(p => p.socketId == socket.id) != -1) {
        socket.broadcast.emit('disconnectcall');
        io.to(socket.id).emit('disconnectcall');
      }
    }
  });
  socket.on("radio", (data) => {
    if (online.findIndex(p => p.socketId == socket.id) != -1 && inCall.findIndex(p => p.socketId == socket.id) != -1 && inCall[inCall.findIndex(p => p.socketId == socket.id)].muted != true) {
      inCall.forEach((usercall) => {
        if(usercall.socketId != socket.id)
          io.to(usercall.socketId).emit('voice', data);
      });
    }
  });
  socket.on("muteStatus", (muted) => {
    if (online.findIndex(p => p.socketId == socket.id) != -1 && inCall.findIndex(p => p.socketId == socket.id) != -1) {
      inCall[inCall.findIndex(p => p.socketId == socket.id)].muted = muted;
      secureKey = randomString(16);
      socket.broadcast.emit('callList', encrypt(JSON.stringify(inCall), secureKey), secureKey);
      io.to(socket.id).emit("callList", encrypt(JSON.stringify(inCall), secureKey), secureKey);
    }
  });
  socket.on("joinCall", () => {
    if (online.findIndex(p => p.socketId == socket.id) != -1 && inCall.findIndex(p => p.socketId == socket.id) == -1) {
      inCall.push({ socketId: socket.id, muted: false });
      secureKey = randomString(16);
      socket.broadcast.emit('callList', encrypt(JSON.stringify(inCall), secureKey), secureKey);
      io.to(socket.id).emit("callList", encrypt(JSON.stringify(inCall), secureKey), secureKey);

      inCall.forEach(client => {
        io.to(client.socketId).emit('joinedcall');
      });
      //io.to(socket.id).emit('joinedcall');
    }
  });
  socket.on("quitCall", () => {
    if (inCall.findIndex(p => p.socketId == socket.id) != -1) {
      inCall.splice(inCall.findIndex(p => p.socketId == socket.id), 1);
      secureKey = randomString(16);
      socket.broadcast.emit('callList', encrypt(JSON.stringify(inCall), secureKey), secureKey);
      io.to(socket.id).emit("callList", encrypt(JSON.stringify(inCall), secureKey), secureKey);
      inCall.forEach(client => {
        io.to(client.socketId).emit('disconnectcall');
      });
      io.to(socket.id).emit('disconnectcall');
    }
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