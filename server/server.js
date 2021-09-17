const express = require('express')
const app = express()
const http = require('http').Server(app);
const io = require('socket.io')(http);
const crypto = require('crypto');

const port = 3000;
const motd = "Cryptoip, VOIP / Chat in realtime fully encrypted [ OPEN SOURCE ]";

var users = [];
var online = [];
var inCall = [];
var keyPair = null;
var secureKey = randomString(32);
var mainKey = randomString(32);

app.get('/', function (req, res) {
  res.sendStatus(400);
});
http.listen(port, () => {
  console.log("Started server on port " + port + " with motd " + motd);
  keyPair = createKeyPair();

  io.sockets.on('connection', (socket) => {
    io.to(socket.id).emit("publicKey", keyPair.publicKey);
    // CONNECTION
    socket.on("connection", (connectionInfos, secureKeyEncrypt) => {
      var connectionInfosDecrypt = JSON.parse(decrypt(connectionInfos, decryptRSA(secureKeyEncrypt, keyPair.privateKey).toString()));

      if (users.findIndex(p => p.username == connectionInfosDecrypt.username) != -1) {

        if (users[users.findIndex(p => p.username == connectionInfosDecrypt.username)].keyHash == connectionInfosDecrypt.keyHash) {
          if (online.findIndex(p => p.socketId == socket.id) == -1)
            online.push({ username: connectionInfosDecrypt.username, socketId: socket.id, publicKey: connectionInfosDecrypt.publicKey });

          secureKey = randomString(32);
          io.to(socket.id).emit("infos", encrypt(JSON.stringify({ motd: motd, mainKey: mainKey }), secureKey), encryptRSA(secureKey, connectionInfosDecrypt.publicKey));
          online.forEach(client => io.to(client.socketId).emit("clientList", encrypt(JSON.stringify(online), secureKey), encryptRSA(secureKey, client.publicKey)));

        } else {
          secureKey = randomString(32);
          io.to(socket.id).emit("kick", encrypt("Use your own username !", secureKey), encryptRSA(secureKey, connectionInfosDecrypt.publicKey));
          socket.disconnect();
        }
      } else if (users.findIndex(p => p.keyHash == connectionInfosDecrypt.keyHash) != -1) {
        if (users[users.findIndex(p => p.keyHash == connectionInfosDecrypt.keyHash)].username == connectionInfosDecrypt.username) {
          if (online.findIndex(p => p.socketId == socket.id) == -1)
            online.push({ username: connectionInfosDecrypt.username, socketId: socket.id, publicKey: connectionInfosDecrypt.publicKey });

          secureKey = randomString(32);
          io.to(socket.id).emit("infos", encrypt(JSON.stringify({ motd: motd, mainKey: mainKey }), secureKey), encryptRSA(secureKey, connectionInfosDecrypt.publicKey));
          online.forEach(client => io.to(client.socketId).emit("clientList", encrypt(JSON.stringify(online), secureKey), encryptRSA(secureKey, client.publicKey)));
        } else {
          secureKey = randomString(32);
          io.to(socket.id).emit("kick", encrypt("Use your own username !", secureKey), encryptRSA(secureKey, connectionInfosDecrypt.publicKey));
          socket.disconnect();
        }
      } else {
        users.push({ username: connectionInfosDecrypt.username, keyHash: connectionInfosDecrypt.keyHash });
        if (online.findIndex(p => p.socketId == socket.id) == -1)
          online.push({ username: connectionInfosDecrypt.username, socketId: socket.id, publicKey: connectionInfosDecrypt.publicKey });

        secureKey = randomString(32);
        io.to(socket.id).emit("infos", encrypt(JSON.stringify({ motd: motd, mainKey: mainKey }), secureKey), encryptRSA(secureKey, connectionInfosDecrypt.publicKey));
        online.forEach(client => io.to(client.socketId).emit("clientList", encrypt(JSON.stringify(online), secureKey), encryptRSA(secureKey, client.publicKey)));
      }
    });


    socket.on("message", (messageData, secureKeyEncrypt) => {
      if (online.findIndex(p => p.socketId == socket.id) != -1) {
        var messageDataDecrypt = JSON.parse(decrypt(messageData, decryptRSA(secureKeyEncrypt, keyPair.privateKey).toString()));

        var author = online[online.findIndex(p => p.socketId == socket.id)].username;
        secureKey = randomString(32);
        if (messageDataDecrypt.receiver == "none") {
          online.forEach(client => io.to(client.socketId).emit("message", encrypt(JSON.stringify({
            message: messageDataDecrypt.message,
            author: author,
            signature: messageDataDecrypt.signature,
            encryptionKey: Buffer.from(encryptRSA(decryptRSA(Buffer.from(messageDataDecrypt.encryptionKey, 'base64'), keyPair.privateKey).toString(), client.publicKey)).toString('base64'),
            isMain: true,
            publicKey: messageDataDecrypt.publicKey
          }), secureKey), encryptRSA(secureKey, client.publicKey)));
        } else {
          io.to(messageDataDecrypt.receiver).emit("message", encrypt(JSON.stringify({
            message: messageDataDecrypt.message,
            encryptionKey: messageDataDecrypt.encryptionKey,
            receiverName: online.find(p=>p.socketId == messageDataDecrypt.receiver).username, 
            author: author,
            signature: messageDataDecrypt.signature,
            publicKey: messageDataDecrypt.publicKey,
            isMain: false
          }), secureKey), encryptRSA(secureKey, online[online.findIndex(p => p.socketId == messageDataDecrypt.receiver)].publicKey));
        }
      }
    });
    socket.on("disconnect", () => {
      if (online.findIndex(p => p.socketId == socket.id) != -1) {
        online.splice(online.findIndex(p => p.socketId == socket.id), 1);

        secureKey = randomString(32);
        online.forEach(client => io.to(client.socketId).emit("callList", encrypt(JSON.stringify(inCall), secureKey), encryptRSA(secureKey, client.publicKey)));

        if (inCall.findIndex(p => p.socketId == socket.id) != -1) {
          inCall.splice(inCall.findIndex(p => p.socketId == socket.id), 1);
          secureKey = randomString(32);
          online.forEach(client => io.to(client.socketId).emit("callList", encrypt(JSON.stringify(inCall), secureKey), encryptRSA(secureKey, client.publicKey)));

          inCall.forEach(client => io.to(client.socketId).emit("disconnectcall"));
          io.to(socket.id).emit('disconnectcall');
        }
      }
    });
    socket.on("radio", (data) => {
      if (online.findIndex(p => p.socketId == socket.id) != -1 && inCall.findIndex(p => p.socketId == socket.id) != -1 && inCall[inCall.findIndex(p => p.socketId == socket.id)].muted != true) {
        inCall.forEach((usercall) => {
          if (usercall.socketId != socket.id)
            io.to(usercall.socketId).emit('voice', data);
        });
      }
    });

    socket.on("testvocal", (data) => {
      inCall.forEach((usercall) => {
        if (usercall.socketId != socket.id)
          io.to(usercall.socketId).emit('testvocal', data);
      });
      // io.to(socket.id).emit('testvocal', data);
    });

    socket.on("muteStatus", (muted) => {
      if (online.findIndex(p => p.socketId == socket.id) != -1 && inCall.findIndex(p => p.socketId == socket.id) != -1) {
        inCall[inCall.findIndex(p => p.socketId == socket.id)].muted = muted;
        secureKey = randomString(32);
        online.forEach(client => io.to(client.socketId).emit("callList", encrypt(JSON.stringify(inCall), secureKey), encryptRSA(secureKey, client.publicKey)));
      }
    });
    socket.on("joinCall", () => {
      if (online.findIndex(p => p.socketId == socket.id) != -1 && inCall.findIndex(p => p.socketId == socket.id) == -1) {
        inCall.push({ socketId: socket.id, muted: false });
        secureKey = randomString(32);
        online.forEach(client => io.to(client.socketId).emit("callList", encrypt(JSON.stringify(inCall), secureKey), encryptRSA(secureKey, client.publicKey)));

        inCall.forEach(client => io.to(client.socketId).emit('joinedcall'));
        //io.to(socket.id).emit('joinedcall');
      }
    });
    socket.on("quitCall", () => {
      if (inCall.findIndex(p => p.socketId == socket.id) != -1) {
        inCall.splice(inCall.findIndex(p => p.socketId == socket.id), 1);
        secureKey = randomString(32);
        online.forEach(client => io.to(client.socketId).emit("callList", encrypt(JSON.stringify(inCall), secureKey), encryptRSA(secureKey, client.publicKey)));
        inCall.forEach(client => io.to(client.socketId).emit('disconnectcall'));
        io.to(socket.id).emit('disconnectcall');
      }
    });
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
  var cipher = crypto.createCipheriv("aes-256-cbc", password.repeat(32).slice(0, 32), password.repeat(16).slice(0, 16))
  var crypted = cipher.update(text, 'utf8', 'hex')
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(text, password) {
  var decipher = crypto.createDecipheriv("aes-256-cbc", password.repeat(32).slice(0, 32), password.repeat(16).slice(0, 16))
  var dec = decipher.update(text, 'hex', 'utf8')
  dec += decipher.final('utf8');
  return dec;
}
function encryptRSA(text, pbk) {
  const encryptedData = crypto.publicEncrypt(
    {
      key: pbk,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(text, 'ascii')
  )
  return encryptedData;
}
function decryptRSA(text, pvk) {
  const decryptedData = crypto.privateDecrypt(
    {
      key: pvk,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(text, 'hex')
  )
  return decryptedData;
}
function createKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 1024 * 4,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  return {
    privateKey: privateKey,
    publicKey: publicKey
  };
}