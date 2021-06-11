const { ipcRenderer, contextBridge} = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

contextBridge.exposeInMainWorld('electron', {
    configApi: {
        isRegister() {
            return fs.existsSync(path.join(process.env.APPDATA, "cryptoip", "config.json"));
        },
        readConfig(password) {
            try {
                var data = JSON.parse(fs.readFileSync(path.join(process.env.APPDATA, 'cryptoip', 'config.json')));
                return {
                    passSentence: decrypt(data.passsentence, password),
                    serverHistory: data.servers,
                    username: data.username,
                    keyHash: crypto.createHash('sha256').update(decrypt(data.passsentence, password)).digest("hex")
                };
            } catch(e) {
                return false;
            }
        },
        writeConfigPassSentence(passSentence, password) {
            fs.writeFileSync(path.join(process.env.APPDATA, 'cryptoip', 'config.json'), JSON.stringify({
                passsentence: encrypt(passSentence, password),
                username: null,
                servers: []
            }));
        },
        writeConfigConnect(host, username) {
            var data = JSON.parse(fs.readFileSync(path.join(process.env.APPDATA, 'cryptoip', 'config.json')));
            data.servers.push(host);
            data.username = username;
            fs.writeFileSync(path.join(process.env.APPDATA, 'cryptoip', 'config.json'), JSON.stringify(data));
        }
    },
    utilApi: {
        createSentence() {
            return createPassSentence();
        },
        enc(data, psw) {
            return encrypt(data, psw);
        },
        dec(data, psw) {
            return decrypt(data, psw);
        },
        createKeys(passsentence) {
            return createKeyPair(passsentence);
        },
        verifySign(data, sign, pbk) {
            return verify(data,sign,pbk);
        },
        signData(data, pvk,passsentence) {
            return sign(data, pvk, passsentence);
        }
    },
    topBarApi: {
        quitApp() {
            ipcRenderer.send("closeApp");
        },
        minimizeApp() {
            ipcRenderer.send("minimizeApp");
        },
        maximizeApp() {
            ipcRenderer.send("maximizeApp");
        }
    }
});

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
function encrypt(text, password) {
    console.log(password.repeat(16).slice(0, 16));
    console.log(password.repeat(16).slice(0, 16).length);
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