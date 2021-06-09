import React, { useEffect, useState } from 'react';
import TopBar from '../components/TopBar';
import Register from './Register';
import Login from './Login';
import Main from './Main';

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
    return (
        <div className="page">
            <TopBar />
            <Pages isLogedIn={loggedIn} handleLogged={setLoggedIn} handleData={setUserInfos} userInfos={userInfos}/>
        </div>
    );
};

export default App;