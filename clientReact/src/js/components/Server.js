import React, { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import FontAwesome from 'react-fontawesome';
var callThread = null;
function randomString(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
const Server = (props, ref) => {
    const [muted, setMuted] = useState(false);
    const [inCall, setInCall] = useState(false);
    const [serverInfos, setServerInfos] = useState({});
    const [channelsServer, setChannels] = useState([]);
    const [clientCallList, setClientCallList] = useState([]);
    const [currentChannel, setCurrentChannel] = useState('main');
    useImperativeHandle(ref, () => ({
        setServerInfos(msg) {
            setServerInfos(msg)
        },
        setChannels(msg) {
            setChannels(msg)
        },
        setClientCallList(msg) {
            setClientCallList(msg)
        }
    }), [])
    const [messageTyping, setMessageTyping] = useState('');
    return (
        <div className="server">
            <div className="server-info">
                <h2 className="title host-title">{serverInfos.endpoint}</h2>
                <button className="form-button disconnect-button" onClick={() => {
                    setMuted(false);
                    setInCall(false);
                    clearInterval(callThread);
                    props.disconnect();
                }}><i className="fas fa-running"></i> Disconnect</button>
                <div className="call-buttons">
                    <button className={"form-button-outline button-call " + (!muted && inCall ? 'show' : 'hidden')} onClick={() => {
                        if (inCall) {
                            setMuted(true);
                            props.socket.emit("muteStatus", true);
                        }
                    }}><i className="fas fa-microphone"></i></button>
                    <button className={"form-button-outline button-call " + (muted && inCall ? 'show' : 'hidden')} onClick={() => {
                        if (inCall) {
                            setMuted(false);
                            props.socket.emit("muteStatus", false);
                        }
                    }}><i className="fas fa-microphone-slash"></i></button>
                    <button className={"form-button-outline button-call " + (inCall ? 'show' : 'hidden')} onClick={() => {
                        setInCall(false);
                        props.socket.emit("quitCall");
                        clearInterval(callThread);
                    }}><i className="fas fa-phone-slash"></i></button>
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
                }}><i className="fas fa-phone"></i></button>

                <h5 className="title motd">{serverInfos.motd}</h5>
            </div>

            <div className="users">
                {
                    channelsServer.map((channel) => (
                        <div key={randomString(16)}>
                            {
                                channel.name != props.userInfos.username ? (
                                    <a disabled={currentChannel == channel.name} className="channel-button" onClick={() => {
                                        setCurrentChannel(channel.name)
                                    }}>{(channel.name == "main" ? "#" : "@") + channel.name}
                                        {
                                            channel.unread > 0 ? (
                                                <p className="notif">{channel.unread}</p>
                                            ) : (
                                                <></>
                                            )
                                        }</a>
                                ) : (
                                    <></>
                                )
                            }
                        </div>
                    ))
                }
            </div>

            <div className="panel">
                <div className="channel" style={{width: inCall ? '85%' : '100%'}}>
                    <div className="messages">
                        <h4 className="title currentChannel-name">{currentChannel}</h4>
                        <hr></hr>
                        {
                            channelsServer.findIndex(p => p.name == currentChannel) != -1 ? (
                                channelsServer[channelsServer.findIndex(p => p.name == currentChannel)].messages.map((message) => (
                                    <li key={randomString(16)} className="message">
                                        <h5 className="title">{message.author}</h5>
                                        <div className="message-content">
                                            <p className="text-normal">{message.content}</p>
                                            <div className="signature-check">
                                                <i style={{ color: (message.checked ? '#19b019' : '#b02819') }} className={"fas fa-" + (message.checked ? 'check-square' : 'times')}></i>
                                                <p className="hover"><strong>Signature:</strong>{message.signature + ' (' + (message.checked ? 'valid' : 'invalid') + ')'}</p>
                                            </div>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <></>
                            )
                        }
                    </div>
                    <form className="sendMessage" onSubmit={(e) => {
                        e.preventDefault();
                        var secureKey = randomString(16);
                        var selectedChannel = channelsServer[channelsServer.findIndex(p => p.name == currentChannel)];
                        if (selectedChannel.name == "main") {
                            props.socket.emit("message", electron.utilApi.enc(JSON.stringify({ message: electron.utilApi.enc(messageTyping, selectedChannel.clientKey), signature: electron.utilApi.signData(messageTyping, props.keyPair.privateKey, props.userInfos.passSentence), receiver: selectedChannel.socketId, publicKey: props.keyPair.publicKey }), secureKey), secureKey);
                        } else {
                            props.socket.emit("message", electron.utilApi.enc(JSON.stringify({ message: electron.utilApi.enc(messageTyping, props.clientKey), signature: electron.utilApi.signData(messageTyping, props.keyPair.privateKey, props.userInfos.passSentence), receiver: selectedChannel.socketId }), secureKey), secureKey);
                        }
                        setMessageTyping('');
                    }}>
                        <input value={messageTyping} onChange={(e) => setMessageTyping(e.target.value)} className="input message-send" type="text" placeholder={"Message to " + currentChannel}></input>
                    </form>
                </div>
                {
                    inCall ? (
                        <div className="callPanel">
                            <h4 className="title">Call</h4>
                            <hr />
                            <div className="call-list">
                                {
                                    clientCallList.map((client) => (
                                        <a className="user-call" key={randomString(16)}>{channelsServer[channelsServer.findIndex(p => p.socketId == client.socketId)].name} <i className={"fas fa-microphone-slash " + (client.muted ? 'show' : 'hidden')}></i></a>
                                    ))
                                }
                            </div>
                        </div>
                    ) : (
                        <></>
                    )
                }
            </div>
        </div>
    );
};

export default forwardRef(Server);