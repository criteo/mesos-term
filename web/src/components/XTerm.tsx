import React, { useState, useRef, useEffect } from "react";
import { makeStyles } from "@material-ui/core";
import classnames from "classnames";

import { Terminal } from 'xterm';
import "xterm/css/xterm.css";

import { FitAddon } from 'xterm-addon-fit';
import { AttachAddon } from 'xterm-addon-attach';
import { useLocation } from "react-router";


export interface Props extends React.DOMAttributes<{}> {
    /*onChange?: (e) => void;
    onInput?: (e) => void;
    onFocusChange?: Function;
    onScroll?: (e) => void;
    onContextMenu?: (e) => void;
    options?: any;
    path?: string;
    value?: string;
    className?: string;
    style?: React.CSSProperties;*/
}

export default function (props: Props) {
    const [isFocused, setIsFocused] = useState(false);
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal>(new Terminal());
    const classes = useStyles();

    useEffect(() => {
        const protocol = (window.location.protocol === 'https:') ? 'wss://' : 'ws://';
        const socketURL = protocol + window.location.hostname + ((window.location.port) ? (':' + window.location.port) : '') + '/terminals/ws?token=';
        const ws = new WebSocket(socketURL);
        ws.onopen = handleSocketOpen;
        ws.onclose = handleSocketClose;
        ws.onerror = handleSocketError;

        xtermRef.current.loadAddon(new FitAddon());
        xtermRef.current.loadAddon(new AttachAddon(ws));
    }, [])

    const handleSocketOpen = (e: Event) => {

    }

    const handleSocketClose = (e: Event) => {

    }

    const handleSocketError = (e: Event) => {

    }

    const termClassName = classnames("xterm", isFocused ? 'xterm-focused' : null);
    return (
        <div className={classes.root}>
            <div ref={terminalRef} className={termClassName} />
        </div>
    );
}

const useStyles = makeStyles(theme => ({
    root: {
        display: "flex",
        width: '100%',
        height: '100%',
        backgroundColor: 'black',
    },
}))