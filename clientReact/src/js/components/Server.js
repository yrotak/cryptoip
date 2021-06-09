import React from 'react';

const Server = (props) => {
    return (
        <div className="server">
            <div className="server-info">
                <h2 className="title host-title">{props.serverInfos.endpoint}</h2>
                <button className="form-button disconnect-button">Disconnect</button>
                <div className="call-buttons">
                    <button className={"form-button-outline button-call " + (props.callInfo.muted ? 'hidden' : 'show')}>mute</button>
                    <button className={"form-button-outline button-call " + (props.callInfo.muted ? 'show' : 'hidden')}>unmute</button>
                    <button className={"form-button-outline button-call " + (props.callInfo.inCall ? 'show' : 'hidden')}>hangup</button>
                </div>
                <button className={"form-button-outline call-btn " + (props.callInfo.inCall ? 'hidden' : 'show')} >call</button>

                <h5 className="title motd">{props.serverInfos.motd}</h5>
            </div>

            <div className={"callPanel " + (props.callInfo.inCall ? 'show' : 'hidden')}>
                <h4 className="title">Call</h4>
                <hr />
                <div className="call-list">
                    <a className="user-call">Drayneur <i className="fas fa-microphone-slash"></i></a>
                </div>
            </div>

            <div className="users">
                {
                    props.channels.map((channel) => (
                        <a className="channel-button">{(channel.name == "main" ? "#" : "@") + channel.name}<p className="notif">{channel.unread}</p></a>
                    ))
                }
            </div>


            <div className="channel">
                <h4 className="title currentChannel-name">-</h4>
                <div className="messages">
                </div>
                <form className="sendMessage">
                    <input className="input message-send" type="text" placeholder="Message to -"></input>
                </form>
            </div>
        </div>
    );
};

export default Server;