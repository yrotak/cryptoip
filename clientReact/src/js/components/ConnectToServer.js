import React, { useState } from 'react';

const ConnectToServer = (props) => {
    const [username, setUsername] = useState(props.userInfos.username);
    const [server, setServer] = useState(props.userInfos.serverHistory[props.userInfos.serverHistory.length - 1]);
    return (
        <form className="form connectToServer" onSubmit={(e) => props.connectToServerHandle(e, server, username)}>
            <label className="form-label">Username</label>
            <input className="input" type="text" value={username} onInput={(e) => setUsername(e.target.value)} placeholder="e.g dimitri"></input>
            <label className="form-label">Server</label>
            <input className="input" type="text" value={server} onInput={(e) => setServer(e.target.value)} placeholder="e.g 127.0.0.1:3000"></input>
            <button className="form-button">Connect</button>
            <div className={props.userInfos.serverHistory.length > 0 ? 'show' : 'hidden'}>
                <label className="form-label">Server history</label>
                {
                    props.userInfos.serverHistory.map((serverInList) => (
                        <a key={serverInList} className="server" onClick={() => setServer(serverInList)}>{serverInList}</a>
                    ))
                }
            </div>
        </form>
    );
};

export default ConnectToServer;