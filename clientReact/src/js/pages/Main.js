import React, { useEffect, useState } from 'react';
import ConnectToServer from '../components/ConnectToServer';
import io from "socket.io-client";
import Server from '../components/Server';
var socket = null;

function MainPages(props) {
    if (props.connected) {
        return <Server serverInfos={props.serverInfos} socket={socket} serverHost={props.serverHost} />;
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
    const [serverHost, setServerHost] = useState('');


    const connectToServer = (e, server, username) => {
        e.preventDefault();
        setClientKey(randomString(16));
        setKeyPair(electron.utilApi.createKeys(props.userInfos.passSentence))
        socket = io("http://" + server);
        setServerHost(server);
        socket.on("connect", () => {
            setConnected(true);
            var secureKey = randomString(16);
            socket.emit("connection", electron.utilApi.enc(JSON.stringify({ username: username, keyHash: props.userInfos.keyHash, publicKey: keyPair.publicKey, clientKey: clientKey }), secureKey), secureKey);
        });
    };
    return (
        <div className="page main">
            <MainPages connected={connected} userInfos={props.userInfos} connectToServerHandle={connectToServer} socket={socket} serverHost={serverHost}/>
        </div>
    );
};

export default Main;