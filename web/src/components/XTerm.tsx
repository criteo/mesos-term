import React, { useState, useRef, useEffect, useCallback } from "react";
import { makeStyles } from "@material-ui/core";
import classnames from "classnames";
import Measure, { ContentRect } from "react-measure";

import { Terminal } from 'xterm';
import "xterm/css/xterm.css";

import { AttachAddon } from 'xterm-addon-attach';
import { FitAddon } from 'xterm-addon-fit';
import { postResizeTerminal } from "../services/MesosTerm";
import MesosImage from "../assets/images/mesos.png";
import { useNotifications } from "../hooks/NotificationContext";
import queryString from 'query-string';
import { useLocation } from "react-router";
import { useMemoizedCallback } from "../hooks/MemoizedCallback";

export interface Props extends React.DOMAttributes<{}> {
    token: string | null;

    onOpen: () => void;
    onClose: () => void;
}

interface Dimension {
    rows: number;
    cols: number;
}

export default function (props: Props) {
    const [isFocused,] = useState(false);
    const terminalDivRef = useRef<HTMLDivElement>(null);
    const timer = useRef<NodeJS.Timeout | null>(null);
    const fitAddon = useRef<FitAddon>(new FitAddon());
    const websocket = useRef<WebSocket | null>(null);
    const classes = useStyles();
    const [dimension, setDimension] = useState(null as Dimension | null);
    const [websocketState, setWebsocketState] = useState(WebSocket.CLOSED);
    const { createErrorNotification, createInfoNotification } = useNotifications();
    const location = useLocation();
    const queryParams = queryString.parse(location.search);
    const xtermRef = useRef<Terminal>(new Terminal({ screenReaderMode: queryParams.screenReaderMode === "true" }));
    const resizeThrottlingTimer = useRef<NodeJS.Timeout | null>(null);

    const handleTerminalResize = async () => {
        fitAddon.current.fit();
        console.log('resize');
        if (resizeThrottlingTimer.current) {
            clearTimeout(resizeThrottlingTimer.current);
            resizeThrottlingTimer.current = null;
        }
        resizeThrottlingTimer.current = setTimeout(() => {
            const dimensions = fitAddon.current.proposeDimensions();
            if (dimensions) {
                setDimension(dimensions);
            }
        }, 300);
    }

    const resizeRemoteTerminal = useCallback(async () => {
        if (dimension === null || props.token === null) {
            return;
        }

        await postResizeTerminal(props.token, dimension.rows, dimension.cols);
        if (websocket.current && websocketState === WebSocket.OPEN) {
            // Workaround: send a space and a backspace to update the length of the current line otherwise the
            // the line is updated only when the user send new keys.
            websocket.current.send(" \x1b[D");
        }
    }, [dimension, props.token, websocketState]);

    const handleSocketOpen = useMemoizedCallback((socket: WebSocket, e: Event) => {
        const self = socket;
        function keepAlive() {
            var timeout = 2000;
            if (self.readyState === self.OPEN) {
                self.send('');
            }
            timer.current = setTimeout(keepAlive, timeout);
        }
        keepAlive();
        setWebsocketState(WebSocket.OPEN);
        props.onOpen();
        console.log("Connection is open!");
    }, []);

    const handleSocketClose = useMemoizedCallback((socket: WebSocket, e: Event) => {
        setWebsocketState(WebSocket.CLOSED);
        console.log("Connection has been closed.");
        createInfoNotification("Connection has been closed.")
        props.onClose();
    }, []);

    const handleSocketError = useMemoizedCallback((socket: WebSocket, e: Event) => {
        setWebsocketState(-1);
        console.log("Error raised by websocket.", e);
        createErrorNotification("Error raised by websocket.");
    }, []);


    const createTerminal = useCallback(async () => {
        if (props.token === null || terminalDivRef.current === null) {
            return;
        }
        const protocol = (window.location.protocol === 'https:') ? 'wss://' : 'ws://';
        const socketURL = protocol + window.location.hostname
            + ((window.location.port) ? (':' + window.location.port) : '')
            + '/api/terminals/ws?token=' + props.token;
        websocket.current = new WebSocket(socketURL);
        setWebsocketState(WebSocket.CONNECTING);

        websocket.current.onopen = function (this, e) { handleSocketOpen(this, e) };
        websocket.current.onclose = function (this, e) { handleSocketClose(this, e) };;
        websocket.current.onerror = function (this, e) { handleSocketError(this, e) };;

        xtermRef.current.loadAddon(fitAddon.current);
        xtermRef.current.loadAddon(new AttachAddon(websocket.current));
        xtermRef.current.open(terminalDivRef.current);
        handleTerminalResize();
    }, [props.token, handleSocketOpen, handleSocketClose, handleSocketError]);

    useEffect(() => { resizeRemoteTerminal(); }, [resizeRemoteTerminal]);
    useEffect(() => { createTerminal(); }, [createTerminal]);

    const termClassName = classnames(isFocused ? 'xterm-focused' : null, classes.termContainer);
    const isReady = websocketState === WebSocket.OPEN;

    return (
        <Measure bounds onResize={handleTerminalResize}>
            {({ measureRef }) => (
                <div className={classes.root} ref={measureRef}>
                    <img src={MesosImage} alt="mesos logo" className={classnames(classes.mesosLogo, isReady ? classes.mesosLogoBackground : "")} />
                    <div ref={terminalDivRef} className={termClassName} id="terminal" />
                </div>
            )}
        </Measure>
    );
}

const useStyles = makeStyles(theme => ({
    root: {
        display: "flex",
        flexDirection: "column",
        backgroundColor: 'black',
        height: "100%",
    },
    termContainer: {
        flexGrow: 1,
    },
    mesosLogo: {
        position: 'absolute',
        left: 0,
        right: 0,
        marginLeft: 'auto',
        marginRight: 'auto',
        top: '350px',
        width: '500px',
        zIndex: 1,
        opacity: 1,
    },
    mesosLogoBackground: {
        transition: "opacity 0.5s ease-in",
        opacity: 0.3,
    }
}))