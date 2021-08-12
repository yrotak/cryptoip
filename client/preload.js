const { ipcRenderer, contextBridge } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
function randomString(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
var isWin = process.platform === "win32";
var cryptoipPath = ""
if(!isWin) {
    if(!fs.existsSync(path.join(process.env.HOME, 'cryptoip')))
        fs.mkdirSync(path.join(process.env.HOME, 'cryptoip'))
    cryptoipPath = path.join(process.env.HOME, 'cryptoip')
} else {
    cryptoipPath = path.join(process.env.APPDATA, "cryptoip")
}
contextBridge.exposeInMainWorld('electron', {
    configApi: {
        isRegister() {
            return fs.existsSync(path.join(cryptoipPath, "config.json"));
        },
        readConfig(password) {
            try {
                var data = JSON.parse(fs.readFileSync(path.join(cryptoipPath, 'config.json')));
                return {
                    passSentence: decrypt(data.passsentence, password),
                    serverHistory: data.servers,
                    username: data.username,
                    keyHash: crypto.createHash('sha256').update(decrypt(data.passsentence, password)).digest("hex"),
                    password: password
                };
            } catch (e) {
                console.log(e);
                return false;
            }
        },
        writeConfigPassSentence(passSentence, password) {
            fs.writeFileSync(path.join(cryptoipPath, 'config.json'), JSON.stringify({
                passsentence: encrypt(passSentence, password),
                username: null,
                servers: []
            }));
        },
        writeConfigConnect(host, username) {
            var data = JSON.parse(fs.readFileSync(path.join(cryptoipPath, 'config.json')));
            if (!data.servers.includes(host))
                data.servers.push(host);
            data.username = username;
            fs.writeFileSync(path.join(cryptoipPath, 'config.json'), JSON.stringify(data));
        },
        clearData() {
            fs.writeFileSync(path.join(pcryptoipPath, 'config.json'), encrypt(fs.readFileSync(path.join(cryptoipPath, 'config.json')), randomString(16)));
            fs.unlinkSync(path.join(cryptoipPath, 'config.json'));
            fs.writeFileSync(path.join(cryptoipPath, 'messages.json'), encrypt(fs.readFileSync(path.join(cryptoipPath, 'messages.json')), randomString(16)));
            fs.unlinkSync(path.join(cryptoipPath, 'messages.json'));
        },
        writeMessages(messages, server, password) {
            try {
                var data = JSON.parse(fs.readFileSync(path.join(cryptoipPath, 'messages.json')));
                data[server] = encrypt(JSON.stringify(messages), password)
                fs.writeFileSync(path.join(cryptoipPath, 'messages.json'), JSON.stringify(data));
            } catch (e) {
                fs.writeFileSync(path.join(cryptoipPath, 'messages.json'), JSON.stringify({}));
            }
        },
        readMessages(password, server) {
            try {

                return JSON.parse(decrypt(JSON.parse(fs.readFileSync(path.join(cryptoipPath, 'messages.json')))[server], password));
            } catch (e) {
                console.log(e);
                return [];
            }
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
        encRSA(data, pbk) {
            return encryptRSA(data, pbk);
        },
        decRSA(data, pvk) {
            return decryptRSA(data, pvk);
        },
        createKeys(passsentence) {
            return createKeyPair(passsentence);
        },
        verifySign(data, sign, pbk) {
            return verify(data, sign, pbk);
        },
        signData(data, pvk, passsentence) {
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
function createPassSentence() {
    var names = ["bird", "clock", "boy", "plastic", "duck", "teacher", "old", "professor", "hamster", "dog", "keyboard", "screen", "background", "desk", "metal", "paper", "hacker", "pen", "rock", "dirt", "line", "string", "coin", "mouse", "rat", "lady", "woman", "man", "past", "futur", "drive", "car", "chair", "hashtag", "rule", "notification", "bell", "sound", "stick", "letter", "sentence", "clay", "gravel", "security", "nice", "good", "drawing", "cow", "signature", "dust", "finest", "crazy", "sad", "wood", "lamp", "cable", "phone", "number", "matrix", "vector", "plug", "port", "house", "pepper", "potato", "microphone", "love", "flower", "plant", "fiber", "fruit", "destination", "wall"];
    var finalSentence = "";
    for (var i = 0; i < 10; i++) {
        finalSentence += names[Math.floor(Math.random() * Math.floor(names.length))] + "-";
    }
    return finalSentence.slice(0, -1);
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