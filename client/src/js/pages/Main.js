import React, { useEffect, useRef, useState } from 'react';
import ConnectToServer from '../components/ConnectToServer';
import io from "socket.io-client";
import Server from '../components/Server';
var socket = null;

function randomString(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
function getElementByXpath(path) {
    return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}
const base64abc = [
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
    "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
    "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "/"
];

const base64codes = [
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 62, 255, 255, 255, 63,
    52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 255, 255, 255, 0, 255, 255,
    255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 255, 255, 255, 255, 255,
    255, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51
];

function getBase64Code(charCode) {
    if (charCode >= base64codes.length) {
        throw new Error("Unable to parse base64 string.");
    }
    const code = base64codes[charCode];
    if (code === 255) {
        throw new Error("Unable to parse base64 string.");
    }
    return code;
}
function base64ToBytes(str) {
    if (str.length % 4 !== 0) {
        throw new Error("Unable to parse base64 string.");
    }
    const index = str.indexOf("=");
    if (index !== -1 && index < str.length - 2) {
        throw new Error("Unable to parse base64 string.");
    }
    let missingOctets = str.endsWith("==") ? 2 : str.endsWith("=") ? 1 : 0,
        n = str.length,
        result = new Uint8Array(3 * (n / 4)),
        buffer;
    for (let i = 0, j = 0; i < n; i += 4, j += 3) {
        buffer =
            getBase64Code(str.charCodeAt(i)) << 18 |
            getBase64Code(str.charCodeAt(i + 1)) << 12 |
            getBase64Code(str.charCodeAt(i + 2)) << 6 |
            getBase64Code(str.charCodeAt(i + 3));
        result[j] = buffer >> 16;
        result[j + 1] = (buffer >> 8) & 0xFF;
        result[j + 2] = buffer & 0xFF;
    }
    return result.subarray(0, result.length - missingOctets);
}
const Main = (props) => {
    const [connected, setConnected] = useState(false);
    const [keyPair, setKeyPair] = useState(electron.utilApi.createKeys());
    const [currentUsername, setCurrentUsername] = useState("");
    let serverRef = useRef();
    const connectToServer = (e, server, username) => {
        e.preventDefault();
        setCurrentUsername(username);
        socket = io("http://" + server,
            {
                'reconnection delay': 100,
                'max reconnection attempts': 4
            });
        var serverMainKey = "";
        var channelsPublickeys = [];
        socket.on('disconnect', function () {
            disconnect()
        });
        socket.on("connect", () => {
            electron.configApi.writeConfigConnect(server, username);
            socket.on("publicKey", (publicKey) => {
                setConnected(true);
                var secureKey = randomString(32);
                socket.emit("connection", electron.utilApi.enc(JSON.stringify({ username: username, keyHash: props.userInfos.keyHash, publicKey: keyPair.publicKey }), secureKey), electron.utilApi.encRSA(secureKey, publicKey));
                socket.on("infos", function (infos, secureKeyEncrypt) {
                    var infosDecrypt = JSON.parse(electron.utilApi.dec(infos, new TextDecoder().decode(electron.utilApi.decRSA(secureKeyEncrypt, keyPair.privateKey))));
                    serverRef.current.setServerInfos({
                        endpoint: server,
                        motd: infosDecrypt.motd,
                        publicKey: publicKey,
                        mainKey: infosDecrypt.mainKey
                    });
                    serverMainKey = infosDecrypt.mainKey;
                });
                socket.on("clientList", function (clientList, secureKeyEncrypt) {
                    var clientListDecrypt = JSON.parse(electron.utilApi.dec(clientList, new TextDecoder().decode(electron.utilApi.decRSA(secureKeyEncrypt, keyPair.privateKey))));
                    serverRef.current.setChannels([{ name: "main", socketId: "none", unread: 0 }]);
                    clientListDecrypt.forEach((client) => {
                        serverRef.current.setChannels(channelsServer => [...channelsServer, { name: client.username, socketId: client.socketId, publicKey: client.publicKey, unread: 0 }]);
                        channelsPublickeys.push({ name: client.username, publicKey: client.publicKey })
                    });
                });
                socket.on("kick", function (reason, secureKeyEncrypt) {
                    socket.disconnect();
                    serverRef.current.setConnected(false);
                    alert(electron.utilApi.dec(reason, new TextDecoder().decode(electron.utilApi.decRSA(secureKeyEncrypt, keyPair.privateKey))));
                });
                socket.on("message", function (messageData, secureKeyEncrypt) {
                    var messageDataDecrypt = JSON.parse(electron.utilApi.dec(messageData, new TextDecoder().decode(electron.utilApi.decRSA(secureKeyEncrypt, keyPair.privateKey))).toString());
                    var messagesElem = getElementByXpath('/html/body/div/div/div[2]/div/div[3]/div/div');
                    var shouldScroll = messagesElem.scrollTop + messagesElem.clientHeight > messagesElem.scrollHeight - 50;
                    var content = electron.utilApi.dec(messageDataDecrypt.message, new TextDecoder().decode(electron.utilApi.decRSA(base64ToBytes(messageDataDecrypt.encryptionKey), keyPair.privateKey)));
                    serverRef.current.addNotification(messageDataDecrypt.isMain ? 'main' : messageDataDecrypt.author == username ? messageDataDecrypt.receiverName : messageDataDecrypt.author)
                    serverRef.current.setMessagesStored(messagesStored => [...messagesStored, {
                        channel: messageDataDecrypt.isMain ? 'main' : messageDataDecrypt.author == username ? messageDataDecrypt.receiverName : messageDataDecrypt.author,
                        author: messageDataDecrypt.author,
                        content: content,
                        owned: messageDataDecrypt.author == username,
                        signature: messageDataDecrypt.signature,
                        checked: messageDataDecrypt.isMain ?
                            electron.utilApi.verifySign(content, messageDataDecrypt.signature, atob(messageDataDecrypt.publicKey)) :
                            electron.utilApi.verifySign(content, messageDataDecrypt.signature, channelsPublickeys.find(p => p.name == messageDataDecrypt.author == username ? messageDataDecrypt.receiverName : messageDataDecrypt.author).publicKey)
                    }
                    ])
                    // serverRef.current.setChannels(channelsServer => channelsServer.map(channel => {
                    //     if (channel.name == tofind) {
                    //         serverRef.current.addNotification(channel.name)
                    //         return {
                    //             ...channel, messages: [...channel.messages, {
                    //                 author: messageDataDecrypt.author,
                    //                 content: content,
                    //                 signature: messageDataDecrypt.signature,
                    //                 isMain: messageDataDecrypt.isMain,
                    //                 checked: messageDataDecrypt.isMain ?
                    //                     electron.utilApi.verifySign(content, messageDataDecrypt.signature, atob(messageDataDecrypt.publicKey)) :
                    //                     electron.utilApi.verifySign(content, messageDataDecrypt.signature, channel.publicKey)
                    //             }]
                    //         };
                    //     } else {
                    //         return channel;
                    //     }
                    // }))
                    if (shouldScroll)
                        messagesElem.scrollTop = messagesElem.scrollHeight;
                });
                socket.on("joinedcall", () => {
                    var audio = new Audio('./connected.wav');
                    audio.play();
                });
                socket.on("disconnectcall", () => {
                    var audio = new Audio('./disconnect.wav');
                    audio.play();
                });
                socket.on("callList", (callListReceive, secureKeyEncrypt) => {
                    var callListDecrypt = JSON.parse(electron.utilApi.dec(callListReceive, new TextDecoder().decode(electron.utilApi.decRSA(secureKeyEncrypt, keyPair.privateKey))));
                    serverRef.current.setClientCallList(callListDecrypt);
                });
                var context = new AudioContext();
                var startAt = 0;
                socket.on("testvocal", (data) => {
                    var floats = new Float32Array(data);
                    var source = context.createBufferSource();
                    var buffer = context.createBuffer(1, floats.length, 44100);
                    buffer.getChannelData(0).set(floats);
                    source.buffer = buffer;
                    source.connect(context.destination);
                    startAt = Math.max(context.currentTime, 0);
                    source.start(0);
                    startAt += buffer.duration;
                });
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
                    var enc = new TextEncoder();
                    var blob = new Blob([Crypto.pkcs_unpad(Crypto.decrypt_aes_cbc(data, enc.encode(serverMainKey.slice(0, 16)).buffer, enc.encode(serverMainKey.slice(0, 16)).buffer))], {
                        'type': 'audio/webm; codecs=opus'
                    });
                    var audio = document.createElement('audio');
                    audio.src = window.URL.createObjectURL(blob);
                    audio.play();
                });
            });
        });
    };
    const disconnect = () => {
        socket.disconnect();
        socket = null;
        setConnected(false);
    }
    return (
        <div className="page main">
            {
                connected ? (
                    <Server socket={socket} username={currentUsername} userInfos={props.userInfos} keyPair={keyPair} disconnect={disconnect} ref={serverRef} />
                ) : (
                    <ConnectToServer userInfos={props.userInfos} connectToServerHandle={connectToServer} />
                )
            }
        </div>
    );
};

export default Main;