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
const Main = (props) => {
    const [connected, setConnected] = useState(false);
    const [clientKey, setClientKey] = useState(randomString(16));
    const [keyPair, setKeyPair] = useState(electron.utilApi.createKeys(props.userInfos.passSentence));
    let serverRef = useRef();
    const connectToServer = (e, server, username) => {
        e.preventDefault();
        socket = io("http://" + server);
        var ServerInfos = {};
        socket.on("connect", () => {
            electron.configApi.writeConfigConnect(server, username);
            setConnected(true);
            var secureKey = randomString(16);
            socket.emit("connection", electron.utilApi.enc(JSON.stringify({ username: username, keyHash: props.userInfos.keyHash, publicKey: keyPair.publicKey, clientKey: clientKey }), secureKey), secureKey);
        });
        socket.on("infos", function (infos, secureKey) {
            var infosDecrypt = JSON.parse(electron.utilApi.dec(infos, secureKey));
            serverRef.current.setServerInfos({
                endpoint: server,
                motd: infosDecrypt.motd,
                mainKey: infosDecrypt.mainKey
            });
            ServerInfos = {
                endpoint: server,
                motd: infosDecrypt.motd,
                mainKey: infosDecrypt.mainKey
            };
        });
        socket.on("clientList", function (clientList, secureKey) {
            var clientListDecrypt = JSON.parse(electron.utilApi.dec(clientList, secureKey));
            serverRef.current.setChannels([{ name: "main", socketId: "none", messages: [], publicKey: null, clientKey: ServerInfos.mainKey, unread: 0 }]);
            clientListDecrypt.forEach((client) => {
                serverRef.current.setChannels(channelsServer => [...channelsServer, { name: client.username, socketId: client.socketId, messages: [], publicKey: client.publicKey, clientKey: client.clientKey, unread: 0 }]);
            });
        });
        socket.on("kick", function (reason, secureKey) {
            socket.disconnect();
            serverRef.current.setConnected(false);
            alert(electron.utilApi.dec(reason, secureKey));
        });
        socket.on("message", function (messageData, secureKey) {
            var messageDataDecrypt = JSON.parse(electron.utilApi.dec(messageData, secureKey));

            var tofind = messageDataDecrypt.isMain ? "main" : messageDataDecrypt.author;
            var messagesElem = getElementByXpath('/html/body/div/div/div[2]/div/div[3]/div/div');
            var shouldScroll = messagesElem.scrollTop + messagesElem.clientHeight === messagesElem.scrollHeight;
            serverRef.current.setChannels(channelsServer => channelsServer.map(channel => {
                if (channel.name == tofind) {
                    serverRef.current.addNotification(channel.name)
                    return {
                        ...channel, messages: [...channel.messages, {
                            author: messageDataDecrypt.author,
                            content: electron.utilApi.dec(messageDataDecrypt.message, channel.clientKey),
                            signature: messageDataDecrypt.signature,
                            isMain: messageDataDecrypt.isMain,
                            checked: messageDataDecrypt.isMain ?
                                electron.utilApi.verifySign(electron.utilApi.dec(messageDataDecrypt.message, channel.clientKey), messageDataDecrypt.signature, messageDataDecrypt.publicKey) :
                                electron.utilApi.verifySign(electron.utilApi.dec(messageDataDecrypt.message, channel.clientKey), messageDataDecrypt.signature, channel.publicKey)
                        }]
                    };
                } else {
                    return channel;
                }
            }))
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
        socket.on("callList", (callListReceive, secureKey) => {
            var callListDecrypt = JSON.parse(electron.utilApi.dec(callListReceive, secureKey));
            serverRef.current.setClientCallList(callListDecrypt);
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
                    <Server socket={socket} userInfos={props.userInfos} clientKey={clientKey} keyPair={keyPair} disconnect={disconnect} ref={serverRef} />
                ) : (
                    <ConnectToServer userInfos={props.userInfos} connectToServerHandle={connectToServer} />
                )
            }
        </div>
    );
};

export default Main;