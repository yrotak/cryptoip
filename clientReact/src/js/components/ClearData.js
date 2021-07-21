import React, { useState } from 'react';

const ClearData = () => {
    const [needConfirm, setNeedConfirm] = useState(false);
    return (
        <div className={"clear-data "+(needConfirm ? "opened" : "closed")}>
            {
                needConfirm ? (
                    <div className="confirm">
                        <h4 className="text-normal">Do you really want to delete all your data ?<br></br><span className="infotext">(You will loose your account, messages, server history and you cannot undo, files are encrypted)</span></h4>
                        <div className="buttons">
                            <button className="form-button-outline" onClick={()=>setNeedConfirm(false)}>
                                Cancel
                            </button>
                            <button className="form-button" onClick={() => {
                                electron.configApi.clearData();
                                window.location.reload();
                            }}>
                                Delete
                            </button>
                        </div>
                    </div>
                ) : (
                    <></>
                )
            }
            <button className="form-button-outline cleardata-btn" onClick={()=>setNeedConfirm(true)}>
                Clear data
            </button>
        </div>
    );
};

export default ClearData;