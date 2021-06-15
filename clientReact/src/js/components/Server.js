import React, { useEffect, useState } from 'react';
var callThread = null;
const Server = (props) => {
    const [muted, setMuted] = useState(false);
    const [inCall, setInCall] = useState(false);
    const [serverInfos, setServerInfos] = useState({});
    const [channelsServer, setChannels] = useState([]);
    const [clientCallList, setClientCallList] = useState([]);
    const [currentChannel, setCurrentChannel] = useState('main');
    useEffect(() => {
        props.socket.on("infos", function (infos, secureKey) {
            var infosDecrypt = JSON.parse(electron.utilApi.dec(infos, secureKey));
            setServerInfos({
                endpoint: props.serverHost,
                motd: infosDecrypt.motd,
                mainKey: infosDecrypt.mainKey
            });
        });
        props.socket.on("clientList", function (clientList, secureKey) {
            var clientListDecrypt = JSON.parse(electron.utilApi.dec(clientList, secureKey));
            setChannels([{ name: "main", socketId: "none", messages: [], publicKey: [], clientKey: serverInfos.mainKey, unread: 0 }]);
            clientListDecrypt.forEach((client) => {
                setChannels(channelsServer => [...channelsServer, { name: client.username, socketId: client.socketId, messages: [], publicKey: client.publicKey, clientKey: client.clientKey, unread: 0 }]);
            });
        });
        props.socket.on("kick", function (reason, secureKey) {
            props.socket.disconnect();
            setConnected(false);
            alert(electron.utilApi.dec(reason, secureKey));
        });
        props.socket.on("message", function (messageData, secureKey) {
            var messageDataDecrypt = JSON.parse(electron.utilApi.dec(messageData, secureKey));

            var tofind = messageDataDecrypt.isMain ? "main" : messageDataDecrypt.author;
            console.log(channelsServer);
            setChannels(channelsServer => channelsServer.map(channel => {
                if (channel.name == tofind) {
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
        });
        props.socket.on("joinedcall", () => {
            var audio = new Audio('./connected.wav');
            audio.play();
        });
        props.socket.on("disconnectcall", () => {
            var audio = new Audio('./disconnect.wav');
            audio.play();
        });
        props.socket.on("callList", (callListReceive, secureKey) => {
            var callListDecrypt = JSON.parse(electron.utilApi.dec(callListReceive, secureKey));
            setClientCallList(callListDecrypt);
        });
    }, []);
    return (
        <div className="server" onLoad={() => { console.log("ttt"); }}>
            <div className="server-info">
                <h2 className="title host-title">{serverInfos.endpoint}</h2>
                <button className="form-button disconnect-button">Disconnect</button>
                <div className="call-buttons">
                    <button className={"form-button-outline button-call " + (muted && inCall ? 'hidden' : 'show')} onClick={() => {
                        if (inCall) {
                            setMuted(true);
                            props.socket.emit("muteStatus", muted);
                        }
                    }}>mute</button>
                    <button className={"form-button-outline button-call " + (muted && inCall ? 'show' : 'hidden')} onClick={() => {
                        if (inCall) {
                            setMuted(false);
                            props.socket.emit("muteStatus", muted);
                        }
                    }}>unmute</button>
                    <button className={"form-button-outline button-call " + (inCall ? 'show' : 'hidden')} onClick={() => {
                        setInCall(false);
                        props.socket.emit("quitCall");
                        clearInterval(callThread);
                    }}>hangup</button>
                </div>
                <button className={"form-button-outline call-btn " + (inCall ? 'hidden' : 'show')} onClick={() => {
                    setInCall(true);
                    props.socket.emit("joinCall");
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
                            if (!muted && inCall) {
                                blob.arrayBuffer().then(array => props.socket.emit('radio', Crypto.encrypt_aes_cbc(Crypto.pkcs_pad(array), enc.encode(mainKey).buffer, enc.encode(mainKey).buffer)));
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
                }}>call</button>

                <h5 className="title motd">{serverInfos.motd}</h5>
            </div>

            <div className={"callPanel " + (inCall ? 'show' : 'hidden')}>
                <h4 className="title">Call</h4>
                <hr />
                <div className="call-list">
                    {
                        clientCallList.map((client) => (
                            <a className="user-call" key={client.socketId}>{channelsServer[channelsServer.findIndex(p => p.socketId == client.socketId)].name} <i className={"fas fa-microphone-slash " + (client.muted ? 'show' : 'hidden')}></i></a>
                        ))
                    }
                </div>
            </div>

            <div className="users">
                {
                    channelsServer.map((channel) => (
                        <a key={channel.name} className="channel-button" onClick={() => {
                            setCurrentChannel(channel.name)
                        }}>{(channel.name == "main" ? "#" : "@") + channel.name}<p className="notif">{channel.unread}</p></a>
                    ))
                }
            </div>


            <div className="channel">
                <h4 className="title currentChannel-name">-</h4>
                <div className={"messages " + (inCall ? 'incall' : 'show')}>
                    {
                        channelsServer.findIndex(p => p.name == currentChannel) != -1 ? (
                            channelsServer[channelsServer.findIndex(p => p.name == currentChannel)].messages.map((message) => (
                                <p>{JSON.stringify(message)}</p>
                            ))
                        ) : (
                            <></>
                        )
                    }
                </div>
                <form className="sendMessage">
                    <input className={"input message-send " + (inCall ? 'incall-input' : 'show')} type="text" placeholder={"Message to " + currentChannel}></input>
                </form>
            </div>
        </div>
    );
};

export default Server;