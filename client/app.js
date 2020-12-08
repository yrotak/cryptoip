function genID(length, chars) {
  var result = '';
  for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}
var iv = new Uint8Array();
var key = new Uint8Array();
var clientID = "";
var socket;
var voip;
document.getElementById("connected").style.display = "none";
document.getElementById("disconnect-button").addEventListener("click", function(e) {
  document.getElementById("connect-controls").style.display = "block";
  document.getElementById("connected").style.display = "none";
  clearInterval(voip);
  socket.disconnect();
});
document.getElementById("connect-button").addEventListener("click", function(e) {
  clientID = genID(16, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
  document.title = "criptoip client - " + clientID;
  console.log()
  var enc = new TextEncoder();

  iv = enc.encode(document.getElementById("key-input").value);
  key = enc.encode(document.getElementById("key-input").value);

  socket = io.connect('http://' + document.getElementById("ip-input").value + '/');
  socket.on("connect", function() {
    document.getElementById("connect-controls").style.display = "none";
    document.getElementById("connected").style.display = "block";
    voip = setInterval(function() {
      var constraints = {
        audio: true
      };
      navigator.mediaDevices.getUserMedia(constraints).then(function(mediaStream) {
        var mediaRecorder = new MediaRecorder(mediaStream);
        mediaRecorder.onstart = function(e) {
          this.chunks = [];
        };
        mediaRecorder.ondataavailable = function(e) {
          this.chunks.push(e.data);
        };
        mediaRecorder.onstop = function(e) {
          var blob = new Blob(this.chunks, {
            'type': 'audio/ogg; codecs=opus'
          });
          if(document.getElementById("mute").checked == false) {
            blob.arrayBuffer().then(array => socket.emit('radio', Crypto.encrypt_aes_cbc(Crypto.pkcs_pad(array), key.buffer, iv.buffer), clientID));
          }
        };
        mediaRecorder.start();
        setTimeout(function() {
          mediaRecorder.stop()
        }, 450);
      });
    }, 450);
    socket.on('voice', function(arrayBuffer, clientIDreceive) {
      if (clientIDreceive != clientID) {
        var blob = new Blob([Crypto.pkcs_unpad(Crypto.decrypt_aes_cbc(arrayBuffer, key.buffer, iv.buffer))], {
          'type': 'audio/ogg; codecs=opus'
        });
        var audio = document.createElement('audio');
        audio.src = window.URL.createObjectURL(blob);
        audio.play();
      }
    });
  });
});
document.getElementById("randomkey-button").addEventListener("click", function(e) {
  document.getElementById("key-input").value = genID(16, "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
});
