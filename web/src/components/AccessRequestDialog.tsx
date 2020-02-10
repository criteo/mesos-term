import React, { useState } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogContentText,
    TextField, DialogActions, Button
} from "@material-ui/core";

export interface Props {
    open: boolean;
    closable: boolean;

    onClose: () => void;
    onAccessRequest: (token: string) => void;
}

export default function (props: Props) {
    const [token, setToken] = useState("");
    const handleOK = () => {
        props.onAccessRequest(token);
    }

    return (
        <Dialog open={props.open} id="access-request-dialog">
            <DialogTitle>
                Unauthorized Access
            </DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Enter an access token provided by an administrator to get access to the container
                </DialogContentText>
                <TextField
                    label="Access token"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    InputProps={{
                        className: "token-field"
                    }}
                    InputLabelProps={{
                        shrink: true,
                    }}
                    fullWidth>
                </TextField>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleOK} className="ok-button">
                    OK
                </Button>

                {props.closable
                    ? <Button onClick={props.onClose} className="close-button">
                        Close
                    </Button>
                    : null}
            </DialogActions>
        </Dialog>
    )
}