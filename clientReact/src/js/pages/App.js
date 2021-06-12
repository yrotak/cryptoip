import React, { useEffect, useState } from 'react';
import TopBar from '../components/TopBar';
import Register from './Register';
import Login from './Login';
import Main from './Main';
import axios from 'axios';
var Version = "1.7";

function Pages(props) {
    if (electron.configApi.isRegister()) {
        if (props.isLogedIn) {
            return <Main userInfos={props.userInfos}/>;
        } else {
            return <Login handleLogged={props.handleLogged} handleData={props.handleData}/>;
        }
    } else {
        return <Register />;
    }
}
const App = () => {
    const [loggedIn, setLoggedIn] = useState(false);
    const [userInfos, setUserInfos] = useState({});
    useEffect(() => {
        axios.get("https://api.github.com/repos/Drayneur/cryptoip/releases").then((response) => {
            if(Version != response.data[0]["tag_name"]) {
                alert("New version: "+response.data[0]["tag_name"]+" with name: "+response.data[0]["name"])
            }
        });
    }, []);
    return (
        <div className="page">
            <TopBar />
            <Pages isLogedIn={loggedIn} handleLogged={setLoggedIn} handleData={setUserInfos} userInfos={userInfos}/>
        </div>
    );
};

export default App;