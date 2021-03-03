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
const motd = "Saloute !";

app.get('/', function(req,res) {
    res.sendStatus(400);
});
http.listen(port);

io.sockets.on('connection', function(socket) {
  socket.on("connection", function() {
    io.to(socket.id).emit("clientList", []);
    io.to(socket.id).emit("motd", motd);
  })
});
