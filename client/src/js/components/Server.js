import React, { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
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

function bytesToBase64(bytes) {
    let result = '', i, l = bytes.length;
    for (i = 2; i < l; i += 3) {
        result += base64abc[bytes[i - 2] >> 2];
        result += base64abc[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)];
        result += base64abc[((bytes[i - 1] & 0x0F) << 2) | (bytes[i] >> 6)];
        result += base64abc[bytes[i] & 0x3F];
    }
    if (i === l + 1) { // 1 octet yet to write
        result += base64abc[bytes[i - 2] >> 2];
        result += base64abc[(bytes[i - 2] & 0x03) << 4];
        result += "==";
    }
    if (i === l) { // 2 octets yet to write
        result += base64abc[bytes[i - 2] >> 2];
        result += base64abc[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)];
        result += base64abc[(bytes[i - 1] & 0x0F) << 2];
        result += "=";
    }
    return result;
}
const Server = (props, ref) => {
    const [muted, setMuted] = useState(false);
    const [inCall, setInCall] = useState(false);
    const [serverInfos, setServerInfos] = useState({});
    const [channelsServer, setChannels] = useState([]);
    const [messagesStored, setMessagesStored] = useState([{ channel: "main", author: "drayneur", content: "omg", signature: "lol", checked: true }]);
    const [clientCallList, setClientCallList] = useState([]);
    const [currentChannel, setCurrentChannel] = useState('main');
    useImperativeHandle(ref, () => ({
        setServerInfos(msg) {
            setServerInfos(msg)
        },
        setChannels(msg) {
            setChannels(msg)
        },
        setMessagesStored(msg) {
            setMessagesStored(msg);
        },
        setClientCallList(msg) {
            setClientCallList(msg)
        },
        addNotification(channelname) {
            if (currentChannel != channelname) {
                setChannels(channelsServer => channelsServer.map(channel => {
                    if (channel.name == channelname) {
                        return {
                            ...channel, unread: channel.unread + 1
                        };
                    } else {
                        return channel;
                    }
                }))
            }
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
                    console.log("lesgooo");
                    var constraints = {
                        audio: true
                    };
                    navigator.mediaDevices.getUserMedia(constraints).then(function (mediaStream) {
                        console.log("callback");
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
                            if (!muted) {
                                blob.arrayBuffer().then(array => props.socket.emit('radio', Crypto.encrypt_aes_cbc(Crypto.pkcs_pad(array), enc.encode(serverInfos.mainKey).buffer, enc.encode(serverInfos.mainKey).buffer)));
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
                                        setCurrentChannel(channel.name);
                                        setChannels(channelsServer => channelsServer.map(channelmap => {
                                            if (channelmap.name == channel.name) {
                                                return {
                                                    ...channelmap, unread: 0
                                                };
                                            } else {
                                                return channelmap;
                                            }
                                        }))
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
                <div className="channel" style={{ width: inCall ? '85%' : '100%' }}>
                    <h4 className="title currentChannel-name">{currentChannel}</h4>
                    <div className="messages">
                        {
                            channelsServer.findIndex(p => p.name == currentChannel) != -1 ? (
                                messagesStored.map(message => (
                                    <>
                                        {
                                            message.channel == currentChannel ? (
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
                                            ) : (
                                                <></>
                                            )
                                        }
                                    </>
                                ))
                            ) : (
                                <></>
                            )
                        }
                    </div>
                    <form className="sendMessage" onSubmit={(e) => {
                        e.preventDefault();
                        var secureKey = randomString(16);
                        var encryptionKey = randomString(16);
                        var selectedChannel = channelsServer[channelsServer.findIndex(p => p.name == currentChannel)];
                        var signature = electron.utilApi.signData(messageTyping, props.keyPair.privateKey, props.userInfos.passSentence);
                        if (selectedChannel.name == "main") {
                            props.socket.emit("message", electron.utilApi.enc(JSON.stringify({
                                message: electron.utilApi.enc(messageTyping, encryptionKey),
                                encryptionKey: bytesToBase64(electron.utilApi.encRSA(encryptionKey, serverInfos.publicKey)),
                                signature: signature,
                                receiver: selectedChannel.socketId,
                                publicKey: btoa(props.keyPair.publicKey)
                            }), secureKey), electron.utilApi.encRSA(secureKey, serverInfos.publicKey));
                        } else {
                            props.socket.emit("message", electron.utilApi.enc(JSON.stringify({
                                message: electron.utilApi.enc(messageTyping, encryptionKey),
                                encryptionKey: bytesToBase64(electron.utilApi.encRSA(encryptionKey, channelsServer[channelsServer.findIndex(p => p.name == currentChannel)].publicKey)),
                                signature: signature,
                                receiver: selectedChannel.socketId
                            }), secureKey), electron.utilApi.encRSA(secureKey, serverInfos.publicKey));
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