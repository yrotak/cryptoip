import React, { useState } from 'react';

const Login = (props) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const login = (e) => {
        e.preventDefault();
        if(password.replaceAll(' ', '') != '') {
            var response = electron.configApi.readConfig(password);
            if(response != false) {
                setError('');
                props.handleData(response);
                props.handleLogged(true);
            } else {
                setError('Incorrect password !');
            }
        } else {
            setError('Please fill all the fields !');
        }
    };
    return (
        <div className="page login">
            <form className="form" onSubmit={(e) => login(e)}>
                <h2 className="title">Login</h2>
                <label className="form-label">Password</label>
                <input value={password} onInput={(e) => setPassword(e.target.value)} type="password" className="input" placeholder="e.g Fs4fsef8FS848sf" />
                <p className={error == '' ? "hidden" : "error"}>{error}</p>
                <button className="form-button">Login</button>
            </form>
        </div>
    );
};

export default Login;