var socket = null;
var currentServer = null;
var username = null;
var keyPair = null;
var clientKey = null;
var mainKey = null;
var passSentence = null;
const cryptoip = angular.module("cryptoipApp", ["ngRoute"]);
const fs = require('fs');
const crypto = require('crypto');
cryptoip.config(["$routeProvider", function ($routeProvider) {
  $routeProvider
    .when("/", { templateUrl: "app/html/home.html" })
    .when("/login/", { templateUrl: "app/html/login.html" })
    .when("/channel/:channelName", { templateUrl: "app/html/channel.html" })
    .otherwise({ redirectTo: "/" });
}]);
cryptoip.controller("mainController", function ($scope) {
  $scope.isLoaded = false;
  if (fs.existsSync("config.json")) {
    $scope.isLoaded = true;
    fs.readFile("config.json", function (err, data) {
      if (err) alert(err);
      if (JSON.parse(data).encrypted == true) {
        window.location.href = "#!/login/";
      } else {
        window.location.href = "#!/";
        passSentence = JSON.parse(data).passsentence;
      }
    });
  } else {
    $scope.passSentence = createPassSentence().replace(/[-]+/g, " ");
    passSentence = $scope.passSentence;
    $scope.setupClient = function (passSentence, usePassword, password) {
      if (usePassword) {
        fs.writeFile("config.json", JSON.stringify({ encrypted: true, passsentence: encrypt(passSentence, password) }), function (err) {
          if (err) alert(err);
          window.location.reload();
        });
      } else {
        fs.writeFile("config.json", JSON.stringify({ encrypted: false, passsentence: passSentence }), function (err) {
          if (err) alert(err);
          window.location.reload();
        });
      }
    }
  }
  $scope.login = function (password) {
    fs.readFile("config.json", function (err, data) {
      if (err) alert(err);
      $scope.passSentence = decrypt(JSON.parse(data).passsentence, password);
      passSentence = $scope.passSentence;
      window.location.href = "#!/";
    });
  }
});
cryptoip.controller("homeController", function ($scope) {
  $scope.connect = function (host, user) {
    socket = io.connect('http://' + host + '/');
    keyPair = createKeyPair(passSentence);
    username = user;
    currentServer = host;
    socket.on("connect", () => {
      clientKey = randomString(16);
      window.location.href = "#!/channel/main";
    });
  }
});
cryptoip.controller("channelController", function ($scope, $routeParams) {
  $scope.isInCall = false;
  $scope.isMuted = false;
  if (socket == null)
    window.location.href = "#!/";
  $scope.channels = [];
  $scope.host = currentServer;
  var secureKey = randomString(16);
  socket.emit("connection", encrypt(JSON.stringify({ username: username, keyHash: crypto.createHash('sha256').update(passSentence).digest("hex"), publicKey: keyPair.publicKey, clientKey: clientKey }), secureKey), secureKey);
  socket.on("infos", function (infos, secureKey) {
    var infosDecrypt = JSON.parse(decrypt(infos, secureKey))
    $scope.motd = infosDecrypt.motd;
    mainKey = infosDecrypt.mainKey;
    $scope.$apply();
  });
  socket.on("clientList", function (clientList, secureKey) {
    clientListDecrypt = JSON.parse(decrypt(clientList, secureKey));
    clientListDecrypt.forEach(function (client) {
      $scope.channels.push({ name: client.username, socketId: client.socketId, messages: [], publicKey: client.publicKey, clientKey: client.clientKey });
    });
    $scope.$apply();
    $scope.channels.forEach(function (channel) {
      console.log(channel);
      if (channel.name == $routeParams.channelName) {
        $scope.currentChannel = { name: channel.name, socketId: channel.socketId, messages: [], publicKey: channel.publicKey, clientKey: channel.clientKey };
        $scope.$apply();
      } else if ($routeParams.channelName == "main") {
        $scope.currentChannel = { name: "main", socketId: "none", messages: [], publicKey: channel.publicKey, clientKey: mainKey };
        $scope.$apply();
      }
    });
  });
  socket.on("kick", function (reason, secureKey) {
    socket.disconnect();
    socket = null;
    window.location.href = "#!/";
    alert(decrypt(reason, secureKey));
  });
  socket.on("message", function (messageData, secureKey) {
    var messageDataDecrypt = JSON.parse(decrypt(messageData, secureKey));
    if (verify(decrypt(messageDataDecrypt.message, $scope.currentChannel.clientKey), messageDataDecrypt.signature, $scope.currentChannel.publicKey)) {
      $scope.currentChannel.messages.push({ author: messageDataDecrypt.author, content: decrypt(messageDataDecrypt.message, $scope.currentChannel.clientKey), signature: messageDataDecrypt.signature, checked: true });
    } else {
      $scope.currentChannel.messages.push({ author: messageDataDecrypt.author, content: decrypt(messageDataDecrypt.message, $scope.currentChannel.clientKey), signature: messageDataDecrypt.signature, checked: false });
    }
    $scope.$apply();
  });
  $scope.sendMessage = function (message, receiver) {
    secureKey = randomString(16);
    socket.emit("message", encrypt(JSON.stringify({ message: encrypt(message, $scope.currentChannel.clientKey), signature: sign(message, keyPair.privateKey, passSentence), receiver: receiver }), secureKey), secureKey);
    $scope.messageToSend = null;
  }
  $scope.disconnect = function () {
    socket.disconnect();
    socket = null;
    window.location.href = "#!/";
  }
  $scope.mute = function () {
    $scope.isMuted = !$scope.isMuted;
    $scope.$apply();
  }
  $scope.hangup = function () {
    $scope.isInCall = false;
    stopRecording();
  }
  var context = new AudioContext();
  var sampleRate = 44100;
  var startAt = 0;
  socket.on('voice', function (data) {
    var floats = new Float32Array(data);
    var source = context.createBufferSource();
    var buffer = context.createBuffer(1, floats.length, sampleRate);
    buffer.getChannelData(0).set(floats);
    source.buffer = buffer;
    source.connect(context.destination);
    startAt = Math.max(context.currentTime, startAt);
    source.start(startAt);
    startAt += buffer.duration;
  });
  $scope.call = function () {
    $scope.isInCall = true;
    initRecording();
  }
});
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
let bufferSize = 2048,
  context,
  processor,
  input,
  globalStream;

const constraints = {
  audio: true,
  video: false,
};

function initRecording() {
  var context = new AudioContext({
    latencyHint: 'interactive',
    sampleRate: 44100,
  });
  processor = context.createScriptProcessor(bufferSize, 1, 1);
  processor.connect(context.destination);
  context.resume();

  var handleSuccess = function (stream) {
    globalStream = stream;
    input = context.createMediaStreamSource(stream);
    input.connect(processor);

    processor.onaudioprocess = function (e) {
      microphoneProcess(e);
    };
  };

  navigator.mediaDevices.getUserMedia(constraints).then(handleSuccess);
}

function microphoneProcess(e) {
  var left = e.inputBuffer.getChannelData(0);
  // var left16 = convertFloat32ToInt16(left); // old 32 to 16 function
  //var left16 = downsampleBuffer(left, 44100, 16000);
  socket.emit('binaryData', left);
}
function stopRecording() {
  let track = globalStream.getTracks()[0];
  track.stop();
  input.disconnect(processor);
  input = null;
  processor = null;
  context = null;
}
var downsampleBuffer = function (buffer, sampleRate, outSampleRate) {
  if (outSampleRate == sampleRate) {
    return buffer;
  }
  if (outSampleRate > sampleRate) {
    throw 'downsampling rate show be smaller than original sample rate';
  }
  var sampleRateRatio = sampleRate / outSampleRate;
  var newLength = Math.round(buffer.length / sampleRateRatio);
  var result = new Int16Array(newLength);
  var offsetResult = 0;
  var offsetBuffer = 0;
  while (offsetResult < result.length) {
    var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    var accum = 0,
      count = 0;
    for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }

    result[offsetResult] = Math.min(1, accum / count) * 0x7fff;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result.buffer;
};