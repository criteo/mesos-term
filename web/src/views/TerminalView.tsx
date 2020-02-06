import React, { useEffect, useState, useCallback } from "react";
import { makeStyles, Link, Paper, CircularProgress, Tooltip, useTheme, Button } from "@material-ui/core";
import XTerm from "../components/XTerm";
import { useRouteMatch, useLocation } from "react-router";
import { faUser, faChevronRight, faServer } from "@fortawesome/free-solid-svg-icons";
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { postCreateTerminal, getConfig, ConfigResponse } from "../services/MesosTerm";
import classnames from "classnames";
import { useNotifications } from "../hooks/NotificationContext";
import CopyToClipboard from 'react-copy-to-clipboard';
import DelegationDialog from "../components/DelegationFormDialog";
import AccessRequestDialog from "../components/AccessRequestDialog";
import { UnauthorizedAccessError, TaskNotFoundError } from "../errors";
import queryString from "query-string";


interface Context {
    user: string;
    taskID: string;
    agent: string;
}

enum Status {
    Closed = 1,
    Failed = 2,
    Loaded = 3,
    Loading = 4,
    Unauthorized = 5,
}

export default function () {
    const classes = useStyles();
    const match = useRouteMatch<{ taskID: string }>();
    const [termToken, setTermToken] = useState(null as string | null);
    const [context, setContext] = useState(null as Context | null);
    const { createErrorNotification } = useNotifications();
    const [status, setStatus] = useState(Status.Closed);
    const theme = useTheme();
    const [delegationDialogOpen, setDelegationDialogOpen] = useState(false);
    const [accessRequestDialogOpen, setAccessRequestDialogOpen] = useState(false);
    const location = useLocation();
    const qs = queryString.parse(location.search);
    const [accessToken, setAccessToken] = useState<string | null>(qs.access_token ? qs.access_token as string : null);
    const [config, setConfig] = useState(null as ConfigResponse | null);

    const taskID = match.params.taskID ? match.params.taskID : null;

    const createTerminal = useCallback(async () => {
        if (!taskID) {
            return;
        }
        try {
            setStatus(Status.Loading);
            const res = await postCreateTerminal(taskID, accessToken);
            setTermToken(res.token);
            setContext({ user: res.task.user, taskID: taskID, agent: res.task.agent_url });
        } catch (err) {
            console.error(err);
            if (err instanceof UnauthorizedAccessError) {
                setStatus(Status.Unauthorized);
                if (accessToken) {
                    createErrorNotification(err.message);
                }
                return;
            } else if (err instanceof TaskNotFoundError) {
                setStatus(Status.Failed);
                createErrorNotification("Task not found");
                return;
            }
            createErrorNotification(err.message, -1);
            setStatus(Status.Failed);
        }
    }, [taskID, createErrorNotification, accessToken]);

    const retrieveConfig = useCallback(async () => {
        try {
            const res = await getConfig();
            setConfig(res);
        } catch (err) {
            createErrorNotification(`Unable to retrieve configuration: ${err.message}`);
        }
    }, [createErrorNotification]);

    useEffect(() => { createTerminal() }, [createTerminal]);
    useEffect(() => {
        if (status === Status.Unauthorized) {
            setAccessRequestDialogOpen(true);
        } else if (status === Status.Loaded) {
            setAccessRequestDialogOpen(false);
        }
    }, [status]);
    useEffect(() => { retrieveConfig() }, [retrieveConfig]);

    return (
        <div className={classes.root}>
            {taskID ? <DelegationDialog
                open={delegationDialogOpen}
                taskID={taskID}
                onClose={() => setDelegationDialogOpen(false)} /> : null}
            {taskID ? <AccessRequestDialog
                open={accessRequestDialogOpen}
                closable={status !== Status.Unauthorized}
                onClose={() => setAccessRequestDialogOpen(false)}
                onAccessRequest={setAccessToken} /> : null}
            <div className={classes.terminal}>
                <span className={classnames(classes.loader, status === Status.Loaded || status === Status.Failed || status === Status.Closed ? "hidden" : "")}>
                    <CircularProgress size={128} />
                </span>
                <XTerm
                    token={termToken}
                    onOpen={() => { setStatus(Status.Loaded) }}
                    onClose={() => { setStatus(Status.Closed) }} />
            </div>
            <div className={classes.statusBarContainer}>
                <div className={classes.statusBar}>
                    <StatusBarItem value={context ? context.user : "_______"} icon={faUser} copy className={"user-item"} />
                    <StatusBarItem value={context ? context.taskID : "____________________"} icon={faChevronRight} copy />
                    <StatusBarItem value={context ? context.agent : "____________________"} icon={faServer} copy />
                    {config && config.can_grant_access && status === Status.Loaded
                        ? <Button style={{ padding: theme.spacing(0.3) }}
                            variant="outlined"
                            onClick={() => setDelegationDialogOpen(true)}
                            className="grant-permission-button">
                            <div>Grant access</div>
                        </Button>
                        : null
                    }
                </div>
                <Link className={classes.brand}
                    href="https://github.com/clems4ever/mesos-term"
                    target="_blank">
                    <Paper>
                        <FontAwesomeIcon icon={faGithub} />
                        MesosTerm
                    </Paper>
                </Link>
            </div>
        </div>
    );
}


const useStyles = makeStyles(theme => ({
    root: {
        display: 'flex',
        flexDirection: "column",
        background: theme.palette.background.default,
        height: '100%',
    },
    terminal: {
        flexGrow: 1,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    statusBarContainer: {
        width: '100%',
        minHeight: theme.spacing(4),
        display: "flex",
        flexDirection: "row",
        alignContent: "center",
        alignItems: "center",
        zIndex: 10,
    },
    statusBar: {
        display: "flex",
        flexDirection: "row",
        alignContent: "center",
        alignItems: "center",
        color: "white",
        paddingLeft: theme.spacing(),
        flexGrow: 1,
    },
    brand: {
        marginRight: theme.spacing(),
        padding: theme.spacing(0.3),
        paddingLeft: theme.spacing(),
        paddingRight: theme.spacing(),
        background: theme.palette.background.paper
    },
    loader: {
        zIndex: 3,
        position: "absolute",
        left: "50%",
        top: "50%",
        marginLeft: "-64px",
        marginTop: "-64px",
    }
}))


interface StatusBarItemProps {
    value: string;
    icon: IconProp;
    copy?: boolean;
    className?: string;
}

export function StatusBarItem(props: StatusBarItemProps) {
    const classes = useStatusBarItemStyles();
    const [open, setOpen] = React.useState(false);

    const handleTooltipOpen = () => {
        setOpen(true);
        setTimeout(() => setOpen(false), 1000);
    };

    if (!props.copy) {
        return (
            <div className={classnames(classes.root, props.className)} onClick={handleTooltipOpen}>
                <FontAwesomeIcon icon={props.icon} className={classes.icon} />
                {props.value}
            </div>
        )
    }

    return (
        <Tooltip
            PopperProps={{
                disablePortal: true,
            }}
            open={open}
            disableFocusListener
            disableHoverListener
            disableTouchListener
            title="copied!"
        >
            <div className={classnames(classes.root, props.className, props.copy ? classes.copyPointer : "")}
                onClick={handleTooltipOpen}>
                <CopyToClipboard text={props.value}>
                    <div>
                        <FontAwesomeIcon icon={props.icon} className={classes.icon} />
                        {props.value}
                    </div>
                </CopyToClipboard>
            </div>
        </Tooltip >
    )
}

const useStatusBarItemStyles = makeStyles(theme => ({
    root: {
        marginRight: theme.spacing(3),
    },
    copyPointer: {
        cursor: "pointer",
    },
    icon: {
        marginRight: theme.spacing(),
    }
}))