import React from "react";
import LeftToolbar from "./components/LeftToolbar";
import { makeStyles } from "@material-ui/core";
import { Route, Redirect, Switch, useRouteMatch } from "react-router";
import TerminalView from "./views/TerminalView";
import SandboxView from "./views/SandboxView/SandboxView";

export default function () {
    const classes = useStyles();
    const match = useRouteMatch<{ taskID: string }>();

    return (
        <div className={classes.root}>
            <div className={classes.toolbar}>
                <LeftToolbar taskID={match.params.taskID} />
            </div>
            <div className={classes.rightContainer}>
                <div className={classes.container}>
                    <Switch>
                        <Route path="/task/:taskID/terminal" exact={true}>
                            <TerminalView />
                        </Route>
                        <Route path="/task/:taskID/sandbox" exact={true}>
                            <SandboxView />
                        </Route>
                        <Route path="/task/:taskID">
                            <Redirect to={`/task/${match.params.taskID}/terminal`} />
                        </Route>
                    </Switch>
                </div>
            </div>
        </div>
    )
}

const useStyles = makeStyles(theme => ({
    root: {
        maxWidth: `100vw`,
        maxHeight: `100vh`,
        width: `100vw`,
        height: `100vh`,
        display: "flex",
        flexDirection: "row",
        overflow: 'hidden',
    },
    toolbar: {
        minWidth: theme.spacing(8),
        height: '100%',
        backgroundColor: theme.palette.background.default,
        borderRight: "1px solid #565656",
    },
    rightContainer: {
        width: '100%',
        height: '100%',
        display: "flex",
        flexDirection: 'column',
        alignContent: 'center',
        alignItems: 'center',
    },
    container: {
        height: '100%',
        width: '100%',
    }
}))