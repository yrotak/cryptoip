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
  socket.emit("connection", username, crypto.createHash('sha256').update(passSentence).digest("hex"), keyPair.publicKey, clientKey);
  socket.on("infos", function (infos) {
    $scope.motd = infos.motd;
    mainKey = infos.mainKey;
    $scope.$apply();
  });
  socket.on("clientList", function (clientList) {
    clientList.forEach(function (client) {
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
  socket.on("kick", function (reason) {
    socket.disconnect();
    socket = null;
    window.location.href = "#!/";
    alert(reason);
  });
  socket.on("message", function (message, author, signature) {
    if (verify(decrypt(message, $scope.currentChannel.clientKey), signature, $scope.currentChannel.publicKey)) {
      $scope.currentChannel.messages.push({ author: author, content: decrypt(message, $scope.currentChannel.clientKey), signature: signature, checked: true });
    } else {
      $scope.currentChannel.messages.push({ author: author, content: decrypt(message, $scope.currentChannel.clientKey), signature: signature, checked: false });
    }
    $scope.$apply();
  });
  $scope.sendMessage = function (message, receiver) {
    socket.emit("message", encrypt(message, $scope.currentChannel.clientKey), sign(message, keyPair.privateKey, passSentence), receiver);
    $scope.messageToSend = null;
  }
  $scope.disconnect = function () {
    socket.disconnect();
    socket = null;
    window.location.href = "#!/";
  }
  $scope.mute = function() {
    $scope.isMuted = !$scope.isMuted;
    $scope.$apply();
  }
  $scope.hangup = function() {
    console.log("grodfsmd fgdsfh; lfjhn hmcgfckljnf:g")
    $scope.isInCall = false;
    $scope.$apply();
  }
  $scope.call = function() {
    $scope.isInCall = true;
    $scope.$apply();
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