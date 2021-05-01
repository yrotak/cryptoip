var socket = null;
var currentServer = null;
var username = null;
var keyPair = null;
var clientKey = null;
var mainKey = null;
var currentChannel = null;
var passSentence = null;
var channels = [];
var isInCall = false;
var muted = false;
var callThread = null;
const fs = require('fs');
const crypto = require('crypto');
window.$ = window.jQuery = require('./3rdparty/jquery.js');

$(document).ready(function () {
  clearPages();
  if (fs.existsSync("config.json")) {
    fs.readFile("config.json", function (err, data) {
      if (err) alert(err);
      $(".username-input").val(JSON.parse(data).username);
      $(".serverList").empty();

      JSON.parse(data).servers.forEach((server) => {
        $(".serverList").append($('<a class="fav-server">' + server + '</a>'));
      });
      if (JSON.parse(data).encrypted == true) {
        clearPages();
        $(".loginToAccount").css("display", "block");
      } else {
        clearPages();
        $(".connectToServer").css("display", "block");
        passSentence = JSON.parse(data).passsentence;
      }
    });
  } else {
    passSentence = createPassSentence().replace(/[-]+/g, " ");
    clearPages();
    $(".createNewPassSentence").css("display", "block");
    $(".passSentence").text(passSentence);
  }
});
$(document).on("click", ".fav-server", function () {
  $(".host-input").val($(this).text());
});
$(document).on("click", ".skip-password-btn", function () {
  fs.writeFile("config.json", JSON.stringify({ encrypted: false, passsentence: passSentence, username: null, servers: [] }), function (err) {
    if (err) alert(err);
    window.location.reload();
  });
});
$(document).on("click", ".disconnect-button", function () {
  socket.disconnect();
  clearPages();
  $(".connectToServer").css("display", "block");
  isInCall = false;
  socket = null;
});
$(document).on("submit", ".sendMessage", function (e) {
  currentChannel.messages.push({ author: username, content: $(".message-send").val(), signature: sign($(".message-send").val(), keyPair.privateKey, passSentence), isMain: currentChannel.name == "main", checked: verify($(".message-send").val(), sign($(".message-send").val(), keyPair.privateKey, passSentence), keyPair.publicKey) });
  $(".messages").empty();
  currentChannel.messages.forEach((message) => {
    var color = message.checked ? '#19b019' : '#b02819';
    var icon = message.checked ? 'check-square' : 'times';
    var checkResult = message.checked ? 'valid' : 'invalid';
    var messageHTML = '<li class="message"><h5 class="title">' + message.author + '</h5><div class="message-content"><p class="text-normal">' + message.content + '</p><div class="signature-check"><i style="color: ' + color + ';" class="fas fa-' + icon + '"></i><p class="hover"><strong>Signature:</strong> ' + message.signature + ' (' + checkResult + ')</p></div></li>';
    $(".messages").append($(messageHTML));
  });
  e.preventDefault();
  secureKey = randomString(16);
  if (currentChannel.name == "main") {
    socket.emit("message", encrypt(JSON.stringify({ message: encrypt($(".message-send").val(), currentChannel.clientKey), signature: sign($(".message-send").val(), keyPair.privateKey, passSentence), receiver: currentChannel.socketId, publicKey: keyPair.publicKey }), secureKey), secureKey);
  } else {
    socket.emit("message", encrypt(JSON.stringify({ message: encrypt($(".message-send").val(), clientKey), signature: sign($(".message-send").val(), keyPair.privateKey, passSentence), receiver: currentChannel.socketId }), secureKey), secureKey);
  }
  $(".message-send").val("");
});
$(document).on("click", ".setup-password-btn", function () {
  fs.writeFile("config.json", JSON.stringify({ encrypted: true, passsentence: encrypt(passSentence, $(".passSentence-pass").val()), username: null, servers: [] }), function (err) {
    if (err) alert(err);
    window.location.reload();
  });
});
$(document).on("click", ".call-btn", function () {
  isInCall = true;
  muted = false;
  //initRecording();
  var constraints = {
    audio: true
  };
  navigator.mediaDevices.getUserMedia(constraints).then(function (mediaStream) {
    var mediaRecorder = new MediaRecorder(mediaStream);
    mediaRecorder.onstart = function (e) {
      this.chunks = [];
    };
    mediaRecorder.ondataavailable = function (e) {
      this.chunks.push(e.data);
    };
    mediaRecorder.onstop = function (e) {
      var blob = new Blob(this.chunks, {
        'type': 'audio/webm; codecs=opus'
      });
      var enc = new TextEncoder();
      if (!muted && isInCall) {
        blob.arrayBuffer().then(array => socket.emit('radio', Crypto.encrypt_aes_cbc(Crypto.pkcs_pad(array), enc.encode(mainKey).buffer, enc.encode(mainKey).buffer)));
      }
    };
    callThread = setInterval(() => {
      if (mediaRecorder.state != "recording") {
        mediaRecorder.start();
        setTimeout(() => {
          mediaRecorder.stop();
        }, 450);
      }
    }, 10);
  });
  clearCallButtons();
  $(".mute-btn").css("display", "inline");
  $(".hangup-btn").css("display", "inline");
});
$(document).on("click", ".hangup-btn", function () {
  isInCall = false;
  muted = false;
  clearInterval(callThread);
  clearCallButtons();
  $(".call-btn").css("display", "block");
});
$(document).on("click", ".connectToServer-btn", function () {
  socket = io.connect('http://' + $(".host-input").val() + '/');
  keyPair = createKeyPair(passSentence);
  username = $(".username-input").val();
  currentServer = $(".host-input").val();
  var config = JSON.parse(fs.readFileSync("config.json"));
  config.username = username;
  config.servers.push(currentServer);
  config.servers = getUnique(config.servers);
  fs.writeFileSync("config.json", JSON.stringify(config));
  socket.on("connect", () => {
    clientKey = randomString(16);
    clearPages();
    clearCallButtons();
    $(".call-btn").css("display", "block");
    $(".serverConnected").css("display", "block");
    $(".host-title").text(currentServer);
    var secureKey = randomString(16);
    socket.emit("connection", encrypt(JSON.stringify({ username: username, keyHash: crypto.createHash('sha256').update(passSentence).digest("hex"), publicKey: keyPair.publicKey, clientKey: clientKey }), secureKey), secureKey);
    socket.on("infos", function (infos, secureKey) {
      var infosDecrypt = JSON.parse(decrypt(infos, secureKey));
      $(".motd").text(infosDecrypt.motd);
      mainKey = infosDecrypt.mainKey;
    });
    socket.on("clientList", function (clientList, secureKey) {
      var clientListDecrypt = JSON.parse(decrypt(clientList, secureKey));
      console.log(clientListDecrypt);
      channels = [];
      channels.push({ name: "main", socketId: "none", messages: [], publicKey: [], clientKey: mainKey });
      clientListDecrypt.forEach(function (client) {
        channels.push({ name: client.username, socketId: client.socketId, messages: [], publicKey: client.publicKey, clientKey: client.clientKey });
      });
      $(".users").empty();
      channels.forEach(function (channel) {
        if (channel.name == "main") {
          currentChannel = channel;
          $(".users").append($("<a class='channel-button' channel-name='" + channel.name + "'>#" + channel.name + "</a>"));
        } else {
          if (channel.name != username) {
            $(".users").append($("<a class='channel-button' channel-name='" + channel.name + "'>@" + channel.name + "</a>"));
          }
        }
      });
      switchChannel("main");
      //var messagesData = decrypt(fs.readFileSync("data.bin"), crypto.createHash('sha256').update(passSentence).digest("hex"));
      console.log("clientlist");
      var messageData = JSON.parse(fs.readFileSync("data.bin"));
      if (messageData[currentServer] != undefined && messageData[currentServer] != null) {
        for (var i = 0; i < channels.length; i++) {
          if (messageData[currentServer].findIndex(p => p.name == channels[i].name) != -1) {
            channels[i].messages = messageData[currentServer][messageData[currentServer].findIndex(p => p.name == channels[i].name)].messages;
          }
        }
      } else {
        messageData[currentServer] = [];
        fs.writeFileSync("data.bin", JSON.stringify(messageData));
      }
    });
    socket.on("kick", function (reason, secureKey) {
      socket.disconnect();
      socket = null;
      clearPages();
      $(".connectToServer").css("display", "block");
      alert(decrypt(reason, secureKey));
    });
    socket.on("message", function (messageData, secureKey) {
      var messageDataDecrypt = JSON.parse(decrypt(messageData, secureKey));
      console.log(messageDataDecrypt);
      if (messageDataDecrypt.isMain) {
        currentChannel.messages.push({ author: messageDataDecrypt.author, content: decrypt(messageDataDecrypt.message, currentChannel.clientKey), signature: messageDataDecrypt.signature, isMain: messageDataDecrypt.isMain, checked: verify(decrypt(messageDataDecrypt.message, currentChannel.clientKey), messageDataDecrypt.signature, messageDataDecrypt.publicKey) });
        var messageData = JSON.parse(fs.readFileSync("data.bin"));
        if (messageData[currentServer].findIndex(p => p.name == messageDataDecrypt.author) != -1) {
          messageData[currentServer][messageData[currentServer].findIndex(p => p.name == messageDataDecrypt.author)].messages.push({ author: messageDataDecrypt.author, content: decrypt(messageDataDecrypt.message, currentChannel.clientKey), signature: messageDataDecrypt.signature, isMain: messageDataDecrypt.isMain, checked: verify(decrypt(messageDataDecrypt.message, currentChannel.clientKey), messageDataDecrypt.signature, messageDataDecrypt.publicKey) });
        } else {
          messageData[currentServer].push(channels[0]);
        }
        fs.writeFileSync("data.bin", JSON.stringify(messageData));
      } else {
        for (var i = 0; i < channels.length; i++) {
          if (channels[i].name == messageDataDecrypt.author) {
            console.log(channels[i]);
            channels[i].messages.push({ author: messageDataDecrypt.author, content: decrypt(messageDataDecrypt.message, channels[i].clientKey), signature: messageDataDecrypt.signature, isMain: messageDataDecrypt.isMain, checked: verify(decrypt(messageDataDecrypt.message, channels[i].clientKey), messageDataDecrypt.signature, channels[i].publicKey) });
            var messageData = JSON.parse(fs.readFileSync("data.bin"));
            if (messageData[currentServer].findIndex(p => p.name == channels[i]) != -1) {
              messageData[currentServer][messageData[currentServer].findIndex(p => p.name == channels[i])].messages.push({ author: messageDataDecrypt.author, content: decrypt(messageDataDecrypt.message, channels[i].clientKey), signature: messageDataDecrypt.signature, isMain: messageDataDecrypt.isMain, checked: verify(decrypt(messageDataDecrypt.message, channels[i].clientKey), messageDataDecrypt.signature, channels[i].publicKey) });
            } else {
              messageData[currentServer].push(channels[i]);
            }
            fs.writeFileSync("data.bin", JSON.stringify(messageData));
          }
        }
      }
      $(".messages").empty();

      currentChannel.messages.forEach((message) => {
        var color = message.checked ? '#19b019' : '#b02819';
        var icon = message.checked ? 'check-square' : 'times';
        var checkResult = message.checked ? 'valid' : 'invalid';
        var messageHTML = '<li class="message"><h5 class="title">' + message.author + '</h5><div class="message-content"><p class="text-normal">' + message.content + '</p><div class="signature-check"><i style="color: ' + color + ';" class="fas fa-' + icon + '"></i><p class="hover"><strong>Signature:</strong> ' + message.signature + ' (' + checkResult + ')</p></div></li>';
        $(".messages").append($(messageHTML));
      });
    });
    // var context = new AudioContext();
    socket.on('voice', function (data) {
      // var floats = new Float32Array(data);
      // var source = context.createBufferSource();
      // var buffer = context.createBuffer(1, floats.length, 44100);
      // buffer.getChannelData(0).set(floats);
      // source.buffer = buffer;
      // source.connect(context.destination);
      // startAt = Math.max(context.currentTime, 0);
      // source.start(0);
      // startAt += buffer.duration;
      if (isInCall) {
        var enc = new TextEncoder();
        var blob = new Blob([Crypto.pkcs_unpad(Crypto.decrypt_aes_cbc(data, enc.encode(mainKey).buffer, enc.encode(mainKey).buffer))], {
          'type': 'audio/webm; codecs=opus'
        });
        var audio = document.createElement('audio');
        audio.src = window.URL.createObjectURL(blob);
        audio.play();
      }
    });
  });
});
// secureKey = randomString(16);
//     socket.emit("message", encrypt(JSON.stringify({ message: encrypt(message, $scope.currentChannel.clientKey), signature: sign(message, keyPair.privateKey, passSentence), receiver: receiver }), secureKey), secureKey);
$(document).on("click", ".login-btn", function () {
  fs.readFile("config.json", function (err, data) {
    if (err) alert(err);
    passSentence = decrypt(JSON.parse(data).passsentence, $(".password-input").val());
    clearPages();
    $(".connectToServer").css("display", "block");
  });
});
$(document).on("click", ".channel-button", function () {
  switchChannel($(this).attr('channel-name'));
});
function switchChannel(channel) {
  channels.forEach((element) => {
    if (element.name == channel) {
      $(".channel-button").each((channelButton) => {
        $($(".channel-button")[channelButton]).removeAttr("disabled");
        if ($($(".channel-button")[channelButton]).attr('channel-name') == channel) {
          $($(".channel-button")[channelButton]).attr('disabled', 'disabled');
          $(".currentChannel-name").text(element.name);
          $(".message-send").attr('placeholder', 'Message to ' + element.name);
          currentChannel = element;
          $(".messages").empty();
          currentChannel.messages.forEach((message) => {
            var color = message.checked ? '#19b019' : '#b02819';
            var icon = message.checked ? 'check-square' : 'times';
            var checkResult = message.checked ? 'valid' : 'invalid';
            var messageHTML = '<li class="message"><h5 class="title">' + message.author + '</h5><div class="message-content"><p class="text-normal">' + message.content + '</p><div class="signature-check"><i style="color: ' + color + ';" class="fas fa-' + icon + '"></i><p class="hover"><strong>Signature:</strong> ' + message.signature + ' (' + checkResult + ')</p></div></li>';
            $(".messages").append($(messageHTML));
          });
        }
      });
    }
  });
}

function clearCallButtons() {
  $(".mute-btn").css("display", "none");
  $(".muted-btn").css("display", "none");
  $(".hangup-btn").css("display", "none");
  $(".call-btn").css("display", "none");
}

function clearPages() {
  $(".connectToServer").css("display", "none");
  $(".serverConnected").css("display", "none");
  $(".createNewPassSentence").css("display", "none");
  $(".loginToAccount").css("display", "none");
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
function createPassSentence() {
  var names = ["bird", "clock", "boy", "plastic", "duck", "teacher", "old", "professor", "hamster", "dog", "keyboard", "screen", "background", "desk", "metal", "paper", "hacker", "pen", "rock", "dirt", "line", "string", "coin", "mouse", "rat", "lady", "woman", "man", "past", "futur", "drive", "car", "chair", "hashtag", "rule", "notification", "bell", "sound", "stick", "letter", "sentence", "clay", "gravel", "security", "nice", "good", "drawing", "cow", "signature", "dust", "finest", "crazy", "sad", "wood", "lamp", "cable", "phone", "number", "matrix", "vector", "plug", "port", "house", "pepper", "potato", "microphone", "love", "flower", "plant", "fiber", "fruit", "destination", "wall"];
  var finalSentence = "";
  for (var i = 0; i < 10; i++) {
    finalSentence += names[Math.floor(Math.random() * Math.floor(names.length))] + "-";
  }
  return finalSentence.slice(0, -1);
}
function createKeyPair(passSentence) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 1024 * 2,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: passSentence
    }
  });
  return {
    privateKey: privateKey,
    publicKey: publicKey
  };
}
function sign(message, privateKey, passSentence) {
  const sign = crypto.createSign('SHA256');
  sign.write(message);
  sign.end();
  return sign.sign({ key: privateKey, passphrase: passSentence }, 'hex');
}
function verify(message, signature, publicKey) {
  const verify = crypto.createVerify('SHA256');
  verify.write(message);
  verify.end();
  return verify.verify(publicKey, signature, 'hex');
}
function randomString(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
// let bufferSize = 2048,
//   context,
//   processor,
//   input,
//   globalStream;

// const constraints = {
//   audio: true,
//   video: false,
// };

// function initRecording() {
//   context = new AudioContext({
//     latencyHint: 'interactive',
//     sampleRate: 44100,
//   });
//   processor = context.createScriptProcessor(bufferSize, 1, 1);
//   processor.connect(context.destination);
//   context.resume();

//   var handleSuccess = function (stream) {
//     globalStream = stream;
//     input = context.createMediaStreamSource(stream);
//     input.connect(processor);

//     processor.onaudioprocess = function (e) {
//       microphoneProcess(e);
//     };
//   };

//   navigator.mediaDevices.getUserMedia(constraints).then(handleSuccess);
// }

// function microphoneProcess(e) {
//   var left = e.inputBuffer.getChannelData(0);
//   // var left16 = convertFloat32ToInt16(left); // old 32 to 16 function
//   //var left16 = downsampleBuffer(left, 44100, 16000);
//   socket.emit('binaryData', left);
// }
// function stopRecording() {
//   input.disconnect(processor);
//   processor.disconnect();
//   processor = null;
//   globalStream = null;
//   input = null;
//   context = null;
// }
// var downsampleBuffer = function (buffer, sampleRate, outSampleRate) {
//   if (outSampleRate == sampleRate) {
//     return buffer;
//   }
//   if (outSampleRate > sampleRate) {
//     throw 'downsampling rate show be smaller than original sample rate';
//   }
//   var sampleRateRatio = sampleRate / outSampleRate;
//   var newLength = Math.round(buffer.length / sampleRateRatio);
//   var result = new Int16Array(newLength);
//   var offsetResult = 0;
//   var offsetBuffer = 0;
//   while (offsetResult < result.length) {
//     var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
//     var accum = 0,
//       count = 0;
//     for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
//       accum += buffer[i];
//       count++;
//     }

//     result[offsetResult] = Math.min(1, accum / count) * 0x7fff;
//     offsetResult++;
//     offsetBuffer = nextOffsetBuffer;
//   }
//   return result.buffer;
// };
function getUnique(array) {
  var uniqueArray = [];
  for (i = 0; i < array.length; i++)
    if (uniqueArray.indexOf(array[i]) === -1)
      uniqueArray.push(array[i]);
  return uniqueArray;
}