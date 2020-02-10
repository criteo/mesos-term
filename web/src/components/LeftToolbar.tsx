import React from "react";
import { Fab, makeStyles, Link } from "@material-ui/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTerminal, faFolderOpen } from "@fortawesome/free-solid-svg-icons";
import { useHistory } from "react-router";
import MesosLogo from "../assets/images/mesos-logo.png";

export interface Props {
    taskID: string;
}

export default function (props: Props) {
    const classes = useStyles();
    const history = useHistory();

    const handleTerminalClick = () => {
        history.push(`/task/${props.taskID}/terminal`)
    }

    const handleSandboxClick = () => {
        history.push(`/task/${props.taskID}/sandbox`)
    }

    return (
        <div id="left-toolbar" className={classes.root}>
            <div className={classes.top}>
                <Fab size="medium"
                    className={classes.button}
                    onClick={handleTerminalClick}>
                    <FontAwesomeIcon icon={faTerminal} />
                </Fab>
                <Fab size="medium"
                    className={classes.button}
                    onClick={handleSandboxClick}>
                    <FontAwesomeIcon icon={faFolderOpen} />
                </Fab>
            </div>
            <div className={classes.spacer}>
                <Link href="https://mesos.apache.org/" target="_blank">
                    <img src={MesosLogo} alt="mesos logo" className={classes.mesosLogo} />
                </Link>
            </div>
        </div>
    )
}

const useStyles = makeStyles(theme => ({
    root: {
        display: "flex",
        flexDirection: "column",
        alignContent: "center",
        alignItems: "center",
        minHeight: '100%',
    },
    top: {
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        marginTop: theme.spacing(2),
    },
    button: {
        marginBottom: theme.spacing(),
        backgroundColor: theme.palette.background.paper,
        color: "white",
    },
    spacer: {
        marginBottom: theme.spacing(2),
    },
    mesosLogo: {
        width: theme.spacing(4),
    }
}))