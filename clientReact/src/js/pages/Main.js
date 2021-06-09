import React, { useState } from 'react';
import ConnectToServer from '../components/ConnectToServer';
import io from "socket.io-client";
import Server from '../components/Server';

function MainPages(props) {
    if (props.connected) {
        return <Server channels={props.channels} serverInfos={props.serverInfos} callInfo={props.callInfo} callInfoHandle={props.callInfoHandle} />;
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
    const [callInfo, setCallInfo] = useState({muted: false, inCall: false, callThread: null});

    const changeMuteState = (muted) => {
        if(muted) {

        } else {
            
        }
    }

    const connectToServer = (e, server, username) => {
        e.preventDefault();
        setClientKey(randomString(16));
        setKeyPair(electron.utilApi.createKeys(props.userInfos.passSentence))
        const socket = io("http://" + server);
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
                setChannels(channels => [...channels, { name: "main", socketId: "none", messages: [], publicKey: [], clientKey: serverInfos.mainKey, unread: 0 }]);
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
                var messageDataDecrypt = JSON.parse(decrypt(messageData, secureKey));

                var tofind = messageDataDecrypt.isMain ? "main" : messageDataDecrypt.author;
                var channelsTemp = channels;

                channelsTemp[channelsTemp.findIndex(p => p.name == tofind)].messages.push({ author: messageDataDecrypt.author, content: decrypt(messageDataDecrypt.message, channelsTemp[channelsTemp.findIndex(p => p.name == tofind)].clientKey), signature: messageDataDecrypt.signature, isMain: messageDataDecrypt.isMain, checked: messageDataDecrypt.isMain ? verify(decrypt(messageDataDecrypt.message, channelsTemp[channelsTemp.findIndex(p => p.name == tofind)].clientKey), messageDataDecrypt.signature, messageDataDecrypt.publicKey) : verify(decrypt(messageDataDecrypt.message, channelsTemp[channelsTemp.findIndex(p => p.name == tofind)].clientKey), messageDataDecrypt.signature, channelsTemp[channelsTemp.findIndex(p => p.name == tofind)].publicKey) });
                if(currentChannel.name != channels[channels.findIndex(p => p.name == tofind)].name) {
                    channelsTemp[channelsTemp.findIndex(p => p.name == tofind)].unread++;
                }
                setChannels(channelsTemp);
                currentChannel.messages.forEach((message) => {
                  var color = message.checked ? '#19b019' : '#b02819';
                  var icon = message.checked ? 'check-square' : 'times';
                  var checkResult = message.checked ? 'valid' : 'invalid';
                  var messageText = $('<p class="text-normal"></p>').text(message.content);
                  var messageContent = $('<div class="message-content"></div>').append(messageText).append($('<div class="signature-check"><i style="color: ' + color + ';" class="fas fa-' + icon + '"></i><p class="hover"><strong>Signature:</strong> ' + message.signature + ' (' + checkResult + ')</p></div>'));
                  var message = $('<li class="message"><h5 class="title">' + message.author.replace(/<(|\/|[^>\/bi]|\/[^>bi]|[^\/>][^>]+|\/[^>][^>]+)>/g, '') + '</h5></li>').append(messageContent);
                  $(".messages").append(message);
                });
              });
        });
    };
    return (
        <div className="page main">
            <MainPages connected={connected} userInfos={props.userInfos} connectToServerHandle={connectToServer} channels={channels} serverInfos={serverInfos} callInfo={callInfo} callInfoHandle={setCallInfo} />
        </div>
    );
};

export default Main;