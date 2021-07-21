import React, { useEffect, useState } from 'react';

const Register = () => {
    const [passSentence, setPassSentence] = useState(electron.utilApi.createSentence());
    const [error, setError] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const textAreaInput = (value) => {
        if (value.replaceAll(' ', '-').split('-').length < 10)
            setError('Pass sentence need to have minimum 10 words !');
        else
            setError('');
        setPassSentence(value);
    };
    const register = (e) => {
        e.preventDefault();
        if(password.replaceAll(' ', '') != '' && confirmPassword.replaceAll(' ', '') != '' && passSentence.replaceAll(' ', '') != '') {
            if(password == confirmPassword) {
                if (passSentence.replaceAll(' ', '-').split('-').length < 10) {
                    setError('Pass sentence need to have minimum 10 words !');
                } else {
                    setError('');
                    electron.configApi.writeConfigPassSentence(passSentence.replaceAll(' ', '-'), password);
                    window.location.reload();
                }
            } else {
                setError('The two password does not match !');
            }
        } else {
            setError('Please fill all inputs !');
        }
    }
    return (
        <div className="page register">
            <form className="form" onSubmit={(e) => register(e)}>
                <h2 className="title">Register new account</h2>
                <label className="form-label">Password</label>
                <input autoFocus value={password} onInput={(e) => setPassword(e.target.value)} type="password" className="input" placeholder="e.g Fs4fsef8FS848sf" />
                <label className="form-label">Confirm password</label>
                <input value={confirmPassword} onInput={(e) => setConfirmPassword(e.target.value)} type="password" className="input" placeholder="e.g Fs4fsef8FS848sf" />
                <label className="form-label">Pass sentence</label>
                <textarea onInput={(e) => textAreaInput(e.target.value)} className="input" rows="5" cols="33" value={passSentence.replaceAll('-', ' ')}></textarea>
                <p className={error == '' ? "hidden" : "error"}>{error}</p>
                <button className="form-button">Register</button>
            </form>
        </div>
    );
};

export default Register;