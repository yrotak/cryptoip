const express = require('express')
const app = express()
const http = require('http').Server(app);
const io = require("socket.io")(http);

const port = 3000;

app.get('/', function(req,res) {
    res.sendStatus(400);
});

http.listen(port, function() {
   console.log('Cryptoip started on port ' + port);
});
io.sockets.on('connection', function(socket) {
  socket.on('radio', function(blob, clientID) {
    io.emit('voice', blob, clientID);
  });
});
