import React from 'react';

const TopBar = () => {
    return (
        <div className="topBar">Cryptoip
            <div className="btns">
                <a className="btn" onClick={() => { electron.topBarApi.minimizeApp() }}>_</a>
                <a className="btn" onClick={() => {electron.topBarApi.maximizeApp()}}>&#9645;</a>
                <a className="btn" onClick={() => {electron.topBarApi.quitApp()}}>&times;</a>
            </div>
        </div>
    );
};

export default TopBar;