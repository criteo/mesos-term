import React from "react";
import { Fab, makeStyles } from "@material-ui/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTerminal, faFolderOpen } from "@fortawesome/free-solid-svg-icons";
import { useHistory } from "react-router";

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
    )
}

const useStyles = makeStyles(theme => ({
    root: {
        display: "flex",
        flexDirection: "column",
        alignContent: "center",
        alignItems: "center",
        paddingTop: theme.spacing(2),
    },
    button: {
        marginBottom: theme.spacing(),
        backgroundColor: theme.palette.background.paper,
        color: "white",
    }
}))