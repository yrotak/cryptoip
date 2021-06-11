import React, { useState } from 'react';
var callThread = null;
const Server = (props) => {
    const [muted, setMuted] = useState(false);
    const [inCall, setInCall] = useState(false);
    console.log(props.channels);
    return (
        <div className="server">
            <div className="server-info">
                <h2 className="title host-title">{props.serverInfos.endpoint}</h2>
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

                <h5 className="title motd">{props.serverInfos.motd}</h5>
            </div>

            <div className={"callPanel " + (inCall ? 'show' : 'hidden')}>
                <h4 className="title">Call</h4>
                <hr />
                <div className="call-list">
                    {
                        props.callList.map((client) => (
                            <a className="user-call" key={client.socketId}>{props.channels[props.channels.findIndex(p => p.socketId == client.socketId)].name} <i className={"fas fa-microphone-slash " + (client.muted ? 'show' : 'hidden')}></i></a>
                        ))
                    }
                </div>
            </div>

            <div className="users">
                {
                    props.channels.map((channel) => (
                        <a key={channel.name} className="channel-button" onClick={() => {
                            props.currentChannelHandle(channel.name)
                        }}>{(channel.name == "main" ? "#" : "@") + channel.name}<p className="notif">{channel.unread}</p></a>
                    ))
                }
            </div>


            <div className="channel">
                <h4 className="title currentChannel-name">-</h4>
                <div className={"messages " + (inCall ? 'incall' : 'show')}>
                    {
                        props.channels.findIndex(p => p.name == props.currentChannel) != -1 ? (
                            props.channels[props.channels.findIndex(p => p.name == props.currentChannel)].messages.map((message) => (
                                <p>{JSON.stringify(message)}</p>
                            ))
                        ) : (
                            <></>
                        )
                    }
                </div>
                <form className="sendMessage">
                    <input className={"input message-send " + (inCall ? 'incall-input' : 'show')} type="text" placeholder={"Message to " + props.currentChannel}></input>
                </form>
            </div>
        </div>
    );
};

export default Server;