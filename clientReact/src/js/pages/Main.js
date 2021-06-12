import React, { useEffect, useState } from 'react';
import ConnectToServer from '../components/ConnectToServer';
import io from "socket.io-client";
import Server from '../components/Server';
var socket = null;

function MainPages(props) {
    if (props.connected) {
        return <Server channels={props.channels} serverInfos={props.serverInfos} socket={socket} callList={props.callList} currentChannel={props.currentChannel} currentChannelHandle={props.currentChannelHandle} />;
    } else {
        return <ConnectToServer userInfos={props.userInfos} connectToServerHandle={props.connectToServerHandle} />;
    }
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
const Main = (props) => {
    const [connected, setConnected] = useState(false);
    const [clientKey, setClientKey] = useState('');
    const [keyPair, setKeyPair] = useState({});
    const [serverInfos, setServerInfos] = useState({});
    const [channels, setChannels] = useState([]);
    const [clientCallList, setClientCallList] = useState([]);
    const [currentChannel, setCurrentChannel] = useState('main');

    const connectToServer = (e, server, username) => {
        e.preventDefault();
        setClientKey(randomString(16));
        setKeyPair(electron.utilApi.createKeys(props.userInfos.passSentence))
        socket = io("http://" + server);
        socket.on("connect", () => {
            setConnected(true);
            var secureKey = randomString(16);
            socket.emit("connection", electron.utilApi.enc(JSON.stringify({ username: username, keyHash: props.userInfos.keyHash, publicKey: keyPair.publicKey, clientKey: clientKey }), secureKey), secureKey);
            socket.on("infos", function (infos, secureKey) {
                var infosDecrypt = JSON.parse(electron.utilApi.dec(infos, secureKey));
                setServerInfos({
                    endpoint: server,
                    motd: infosDecrypt.motd,
                    mainKey: infosDecrypt.mainKey
                });
            });
            socket.on("clientList", function (clientList, secureKey) {
                var clientListDecrypt = JSON.parse(electron.utilApi.dec(clientList, secureKey));
                setChannels([{ name: "main", socketId: "none", messages: [], publicKey: [], clientKey: serverInfos.mainKey, unread: 0 }]);
                clientListDecrypt.forEach((client) => {
                    setChannels(channels => [...channels, { name: client.username, socketId: client.socketId, messages: [], publicKey: client.publicKey, clientKey: client.clientKey, unread: 0 }]);
                });
            });
            socket.on("kick", function (reason, secureKey) {
                socket.disconnect();
                setConnected(false);
                alert(electron.utilApi.dec(reason, secureKey));
            });
            socket.on("message", function (messageData, secureKey) {
                var messageDataDecrypt = JSON.parse(electron.utilApi.dec(messageData, secureKey));

                var tofind = messageDataDecrypt.isMain ? "main" : messageDataDecrypt.author;
                console.log(channels);
                setChannels(channels => channels.map(channel => {
                    if(channel.name == tofind) {
                        return {...channel, messages: [...channel.messages, { author: messageDataDecrypt.author, content: electron.utilApi.dec(messageDataDecrypt.message, channel.clientKey), signature: messageDataDecrypt.signature, isMain: messageDataDecrypt.isMain, checked: messageDataDecrypt.isMain ? electron.utilApi.verifySign(electron.utilApi.dec(messageDataDecrypt.message, channel.clientKey), messageDataDecrypt.signature, messageDataDecrypt.publicKey) : electron.utilApi.verifySign(electron.utilApi.dec(messageDataDecrypt.message, channel.clientKey), messageDataDecrypt.signature, channel.publicKey) }]};
                    } else {
                        return channel;
                    }
                }))
                // var channelsTemp = channels;
                // if (channelsTemp.findIndex(p => p.name == tofind) != -1) {
                //     channelsTemp[channelsTemp.findIndex(p => p.name == tofind)].messages.push({ author: messageDataDecrypt.author, content: electron.utilApi.dec(messageDataDecrypt.message, channelsTemp[channelsTemp.findIndex(p => p.name == tofind)].clientKey), signature: messageDataDecrypt.signature, isMain: messageDataDecrypt.isMain, checked: messageDataDecrypt.isMain ? electron.utilApi.verifySign(electron.utilApi.dec(messageDataDecrypt.message, channelsTemp[channelsTemp.findIndex(p => p.name == tofind)].clientKey), messageDataDecrypt.signature, messageDataDecrypt.publicKey) : electron.utilApi.verifySign(electron.utilApi.dec(messageDataDecrypt.message, channelsTemp[channelsTemp.findIndex(p => p.name == tofind)].clientKey), messageDataDecrypt.signature, channelsTemp[channelsTemp.findIndex(p => p.name == tofind)].publicKey) });
                //     if (currentChannel != channels[channels.findIndex(p => p.name == tofind)].name) {
                //         channelsTemp[channelsTemp.findIndex(p => p.name == tofind)].unread++;
                //     }
                // }
                // setChannels(channelsTemp);
                // currentChannel.messages.forEach((message) => {
                //     var color = message.checked ? '#19b019' : '#b02819';
                //     var icon = message.checked ? 'check-square' : 'times';
                //     var checkResult = message.checked ? 'valid' : 'invalid';
                //     var messageText = $('<p class="text-normal"></p>').text(message.content);
                //     var messageContent = $('<div class="message-content"></div>').append(messageText).append($('<div class="signature-check"><i style="color: ' + color + ';" class="fas fa-' + icon + '"></i><p class="hover"><strong>Signature:</strong> ' + message.signature + ' (' + checkResult + ')</p></div>'));
                //     var message = $('<li class="message"><h5 class="title">' + message.author.replace(/<(|\/|[^>\/bi]|\/[^>bi]|[^\/>][^>]+|\/[^>][^>]+)>/g, '') + '</h5></li>').append(messageContent);
                //     $(".messages").append(message);
                // });
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
                setClientCallList(callListDecrypt);
            });
        });
    };
    return (
        <div className="page main">
            <MainPages connected={connected} userInfos={props.userInfos} connectToServerHandle={connectToServer} channels={channels} serverInfos={serverInfos} socket={socket} callList={clientCallList} currentChannel={currentChannel} currentChannelHandle={setCurrentChannel} />
        </div>
    );
};

export default Main;