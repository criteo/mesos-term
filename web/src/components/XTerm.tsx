import React, { useState, useRef, useEffect, useCallback } from "react";
import { makeStyles } from "@material-ui/core";
import classnames from "classnames";

import { Terminal } from 'xterm';
import "xterm/css/xterm.css";

import { AttachAddon } from 'xterm-addon-attach';
import { FitAddon } from './FitAddon';
import { postResizeTerminal } from "../services/MesosTerm";
import MesosImage from "../assets/images/mesos.png";
import { useNotifications } from "../hooks/NotificationContext";
import queryString from 'query-string';
import { useLocation } from "react-router";
import { useMemoizedCallback } from "../hooks/MemoizedCallback";
import { useWindowLoaded } from "../hooks/WindowLoadedContext";
import * as XtermWebfontAddon from 'xterm-webfont'

export interface Props extends React.DOMAttributes<{}> {
    token: string | null;

    onOpen: () => void;
    onClose: () => void;
}

export default function (props: Props) {
    const [isFocused,] = useState(false);
    const terminalDivRef = useRef<HTMLDivElement>(null);
    const timer = useRef<NodeJS.Timeout | null>(null);
    const fitAddon = useRef<FitAddon>(new FitAddon());
    const webFontAddon = useRef(new XtermWebfontAddon());
    const websocket = useRef<WebSocket | null>(null);
    const classes = useStyles();
    const [websocketState, setWebsocketState] = useState(WebSocket.CLOSED);
    const { createErrorNotification, createInfoNotification } = useNotifications();
    const location = useLocation();
    const queryParams = queryString.parse(location.search);
    const xtermRef = useRef<Terminal | null>(null);
    const resizeThrottlingTimer = useRef<NodeJS.Timeout | null>(null);
    const windowLoaded = useWindowLoaded();
    const [terminalReady, setTerminalReady] = useState(false);

    const resizeRemoteTerminal = useCallback(async () => {
        if (props.token === null || websocketState !== WebSocket.OPEN || !terminalReady) {
            return;
        }
        const dimensions = fitAddon.current.proposeDimensions();
        if (dimensions && dimensions.cols && dimensions.rows) {
            await postResizeTerminal(props.token, dimensions.rows, dimensions.cols);
        }
    }, [props.token, websocketState, terminalReady]);

    const handleTerminalResize = useCallback(async () => {
        fitAddon.current.fit();
        if (resizeThrottlingTimer.current) {
            clearTimeout(resizeThrottlingTimer.current);
            resizeThrottlingTimer.current = null;
        }
        resizeThrottlingTimer.current = setTimeout(() => {
            resizeRemoteTerminal();
        }, 300);
    }, [resizeRemoteTerminal]);

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
        handleTerminalResize();
        console.log("Connection is open!");
    }, [handleTerminalResize]);

    const handleSocketClose = useMemoizedCallback((socket: WebSocket, e: Event) => {
        setWebsocketState(WebSocket.CLOSED);
        console.log("Connection has been closed.");
        createInfoNotification("Connection has been closed.");
        props.onClose();
    }, []);

    const handleSocketError = useMemoizedCallback((socket: WebSocket, e: Event) => {
        setWebsocketState(-1);
        console.log("Error raised by websocket.", e);
        createErrorNotification("Error raised by websocket.");
    }, []);


    const createTerminal = useCallback(async () => {
        if (props.token === null || terminalDivRef.current === null || xtermRef.current !== null || !windowLoaded) {
            return;
        }

        const protocol = (window.location.protocol === 'https:') ? 'wss://' : 'ws://';
        const socketURL = protocol + window.location.hostname
            + ((window.location.port) ? (':' + window.location.port) : '')
            + `/api/terminals/ws?token=${props.token}`;
        websocket.current = new WebSocket(socketURL);
        setWebsocketState(WebSocket.CONNECTING);

        websocket.current.onopen = function (this, e) { handleSocketOpen(this, e) };
        websocket.current.onclose = function (this, e) { handleSocketClose(this, e) };;
        websocket.current.onerror = function (this, e) { handleSocketError(this, e) };;

        xtermRef.current = new Terminal({
            screenReaderMode: queryParams.screenReaderMode === "true",
            fontFamily: 'terminal-roboto',
            fontWeight: 'normal',
        })
        xtermRef.current.loadAddon(fitAddon.current);
        xtermRef.current.loadAddon(new AttachAddon(websocket.current));
        xtermRef.current.loadAddon(webFontAddon.current);
        (xtermRef.current as any).loadWebfontAndOpen(terminalDivRef.current);

        // Create an observer to check when the terminal is ready in order to resize it.
        const observer = new MutationObserver(function (mutations) {
            if (xtermRef.current && xtermRef.current.element) {
                observer.disconnect();
                handleTerminalResize();
                setTerminalReady(true);
            }
        });
        observer.observe(terminalDivRef.current, {
            attributes: false,
            childList: true,
            characterData: false,
            subtree: true
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
            props.token,
            handleSocketOpen,
            handleSocketClose,
            handleSocketError,
            windowLoaded,
            queryParams.screenReaderMode
        ]);

    useEffect(() => { resizeRemoteTerminal(); }, [resizeRemoteTerminal]);
    useEffect(() => {
        window.addEventListener('resize', handleTerminalResize);
        return () => { window.removeEventListener('resize', handleTerminalResize); };
    }, [handleTerminalResize]);

    useEffect(() => {
        createTerminal();
        return () => { xtermRef.current = null; };
    }, [createTerminal]);

    const termClassName = classnames(isFocused ? 'xterm-focused' : null, classes.term);
    const isReady = websocketState === WebSocket.OPEN;

    return (
        <div className={classes.root}>
            <img src={MesosImage} alt="mesos logo" className={classnames(classes.mesosLogo, isReady ? classes.mesosLogoBackground : "")} />
            <div ref={terminalDivRef} className={termClassName} id="terminal" />
        </div>
    );
}

const useStyles = makeStyles(theme => ({
    root: {
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
    },
    term: {
        flexGrow: 1,
        backgroundColor: 'black',
    },
    mesosLogo: {
        position: 'fixed',
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