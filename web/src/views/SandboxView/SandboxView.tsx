import React, { useEffect, useState, useCallback, MouseEvent, Fragment } from "react";
import { browseSandbox, FileDescription, downloadSandboxFile } from "../../services/MesosTerm";
import { useRouteMatch, useHistory, useLocation } from "react-router";
import { makeStyles, Grid, Paper, Typography, Breadcrumbs, Link, Tooltip, CircularProgress, Button } from "@material-ui/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolder, faFile, faSitemap } from "@fortawesome/free-solid-svg-icons";
import queryString from "query-string";
import classnames from "classnames";
import { useNotifications } from "../../hooks/NotificationContext";
import { saveAs } from 'file-saver';
import FileReader from "./FileReader";

function isDirectory(fd: FileDescription) {
    return fd.mode.slice(0, 1) === 'd';
}

export default function () {
    const match = useRouteMatch<{ taskID: string }>();
    const classes = useStyles();
    const location = useLocation();
    const qs = queryString.parse(location.search);
    const [path, setPath] = useState(qs.path ? qs.path as string : '/');
    const [files, setFiles] = useState(null as FileDescription[] | null);
    const history = useHistory();
    const [selectedFile, setSelectedFile] = useState(null as FileDescription | null);
    const [currentFd, setCurrentFd] = useState(null as FileDescription | null);
    const isFile = files && files.length === 0;
    const [loadingState, setLoadingState] = useState(false);
    const { createErrorNotification } = useNotifications();

    const fetchFiles = useCallback(async () => {
        try {
            setLoadingState(true);
            const files = await browseSandbox(match.params.taskID, path);

            const parentDir = path.slice(1).split('/').slice(0, -1).join('/');
            const fds = await browseSandbox(match.params.taskID, '/' + parentDir);

            if (path === '/') {
                setCurrentFd(null);
            } else {
                for (let i = 0; i < fds.length; i++) {
                    if (fds[i].path === path) {
                        setCurrentFd(fds[i]);
                        break;
                    }
                }
            }
            setFiles(files);
            setSelectedFile(null);
        } catch (err) {
            createErrorNotification(err.message);
        } finally {
            setLoadingState(false);
        }
    }, [path, match.params.taskID, setCurrentFd, createErrorNotification, setLoadingState]);


    useEffect(() => {
        if (path !== qs.path) {
            setPath(qs.path ? qs.path as string : '/');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [qs.path, setPath]);

    useEffect(() => { fetchFiles() }, [fetchFiles]);

    useEffect(() => { history.push(`/task/${match.params.taskID}/sandbox?path=${encodeURIComponent(path)}`) },
        [history, path, match.params.taskID]);

    const fileItems = files ? files.map((f, i) => {
        const handleDoubleClick = (ev: MouseEvent<HTMLDivElement>, fd: FileDescription) => {
            setPath(f.path);
        }
        const handleClick = (ev: MouseEvent<HTMLDivElement>, fd: FileDescription) => {
            ev.stopPropagation();
            setSelectedFile(fd);
        }
        return (
            <Grid item lg={2} sm={3} xs={6}
                key={`file-${i}`}>
                <FileItem fd={f}
                    onClick={e => handleClick(e, f)}
                    onDoubleClick={e => handleDoubleClick(e, f)}
                    selected={selectedFile !== null && f.path === selectedFile.path} />
            </Grid>
        );
    }) : [];

    let breadCrumbRoot = (
        <Link href={`/#${location.pathname}?path=${encodeURIComponent('/')}`} key={`path-item-root`}>
            Sandbox
        </Link>
    )

    const restBreadCrumbItems = path.slice(1).split('/').filter(x => x !== '').map((x, i) => {
        const link = path.split('/').slice(0, i + 2).join('/');
        return (
            <Link href={`/#${location.pathname}?path=${encodeURIComponent(link)}`} key={`path-item-${i}`}>
                {x}
            </Link>
        )
    });

    const downloadFile = useCallback(async () => {
        try {
            let p: string;
            let isDir: boolean;
            if (selectedFile) {
                p = selectedFile.path;
                isDir = isDirectory(selectedFile);
            } else if (currentFd) {
                p = currentFd.path;
                isDir = isDirectory(currentFd);
            } else {
                // This is the full sandbox.
                isDir = true;
                p = '/';
            }
            let filename = p.split('/').pop();
            if (!filename) {
                filename = match.params.taskID;
            }
            const blob = await downloadSandboxFile(match.params.taskID, p, isDir);
            // const blob = new Blob([arr], { type: isDir ? 'application/zip' : 'octet/stream' });
            saveAs(blob, filename + ((isDir) ? '.zip' : ''));
        } catch (err) {
            createErrorNotification(err.message);
        }
    }, [selectedFile, match.params.taskID, currentFd, createErrorNotification]);

    const handleDownloadClick = downloadFile;

    return (
        <div className={classes.root}>
            <div className={loadingState ? "" : "hidden"}>
                <CircularProgress size={128} className={classnames(classes.loader)} />
            </div>
            <div className={classes.pathContainer}>
                <FontAwesomeIcon icon={faSitemap} className={classes.sitemapIcon} />
                <Breadcrumbs>
                    {[breadCrumbRoot].concat(restBreadCrumbItems)}
                </Breadcrumbs>
            </div>
            {isFile
                ? <FileReader
                    taskID={match.params.taskID}
                    path={path} />
                : <div className={classes.explorerContainer} onClick={e => { setSelectedFile(null); e.preventDefault() }}>
                    <Grid container
                        className={classes.grid}
                        spacing={2}>
                        {fileItems}
                    </Grid>
                </div>}
            <div className={classes.description}>
                <FileDescriptionBar fd={selectedFile ? selectedFile : currentFd} onDownloadClick={handleDownloadClick} />
            </div>
        </div>
    )
}

const useStyles = makeStyles(theme => ({
    root: {
        width: "100%",
        height: "100%",
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.palette.background.default,
        position: 'relative',
    },
    loader: {
        position: 'absolute',
        left: 'calc(50% - 64px)',
        top: 'calc(50% - 64px)'
    },
    explorerContainer: {
        flexGrow: 1,
        overflowY: "scroll",
    },
    pathContainer: {
        padding: theme.spacing(),
        borderBottom: '1px solid ' + theme.palette.background.default,
        backgroundColor: theme.palette.background.paper,
        '& a': {
            textDecoration: 'none',
            color: 'white',
        },
        display: 'flex',
        flexDirection: 'row',
        alignContent: 'center',
        alignItems: 'center',
    },
    sitemapIcon: {
        marginRight: theme.spacing(),
        marginLeft: theme.spacing(),
        color: 'white',
    },
    grid: {
        width: 'calc(100%)',
        margin: 0,
        padding: theme.spacing(),
    },
    description: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        alignContent: 'center',
        minHeight: theme.spacing(2),
        padding: theme.spacing(2),
        paddingTop: theme.spacing(),
        paddingBottom: theme.spacing(),
        color: 'white',
        backgroundColor: theme.palette.background.paper,
        borderTop: '1px solid ' + theme.palette.background.default,
    },
}));

interface FileItemProps {
    fd: FileDescription;
    selected: boolean;

    onClick: (e: MouseEvent<HTMLDivElement>, fd: FileDescription) => void;
    onDoubleClick: (e: MouseEvent<HTMLDivElement>, fd: FileDescription) => void;
}

function FileItem(props: FileItemProps) {
    const classes = useFileItemStyles();
    const isDirectory = props.fd.mode.slice(0, 1) === 'd';
    const filename = props.fd.path.split('/').pop();

    return (
        <Paper elevation={1}
            onClick={e => props.onClick(e, props.fd)}
            onDoubleClick={e => props.onDoubleClick(e, props.fd)}
            className={classnames(classes.paper, props.selected ? classes.selected : '')}>
            <div className={classnames(classes.content, "file-item")}>
                <FontAwesomeIcon icon={isDirectory ? faFolder : faFile} size="3x" />
                <Typography noWrap className={classnames(classes.filename, "filename")}>{filename}</Typography>
            </div>
        </Paper>
    )
}

const useFileItemStyles = makeStyles(theme => ({
    paper: {
        padding: theme.spacing(2),
        cursor: 'pointer',
        border: '1px solid ' + theme.palette.background.default,
        userSelect: 'none',
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        alignContent: 'center',
        alignItems: 'center',
        color: '#b7b7b7',
        overflow: 'hidden',
    },
    filename: {
        width: '100%',
        textAlign: "center",
    },
    selected: {
        border: '1px solid #949494',
    }
}));

interface FileDescriptionBarProps {
    fd: FileDescription | null;

    onDownloadClick: () => void;
}

function FileDescriptionBar(props: FileDescriptionBarProps) {
    const classes = useFileDescriptionBarStyles();
    const filename = props.fd ? props.fd.path.split('/').pop() : '-';
    const size = props.fd ? (props.fd.size / 1000).toFixed(2) : '-';
    const mode = props.fd ? props.fd.mode : '-';
    const isDir = props.fd === null || mode.slice(0, 1) === 'd';
    const uid = props.fd ? props.fd.uid : '-';
    const gid = props.fd ? props.fd.gid : '-';
    return (
        <Fragment>
            <Tooltip title="download">
                <span onClick={props.onDownloadClick}>
                    <FontAwesomeIcon icon={isDir ? faFolder : faFile} className={classes.icon} />
                </span>
            </Tooltip>
            <span className={classnames(classes.item, "desc-name", "odd")}>name: {filename}</span>{" "}
            <span className={classnames(classes.item, "desc-size", "even")}>size: {size}kb</span>{" "}
            <span className={classnames(classes.item, "desc-mode", "odd")}>mode: {mode}</span>{" "}
            <span className={classnames(classes.item, "desc-uid", "even")}>uid: {uid}</span>{" "}
            <span className={classnames(classes.item, "desc-gid", "odd")}>gid: {gid}</span>{" "}
            <Button size="small" variant="outlined" onClick={props.onDownloadClick}>
                Download
            </Button>
        </Fragment>
    )
}

const useFileDescriptionBarStyles = makeStyles(theme => ({
    item: {
        marginRight: theme.spacing(2),
        '&.even': {
            color: '#b3b3b3',
        }
    },
    icon: {
        display: 'inline-block',
        cursor: 'pointer',
        marginRight: theme.spacing(2),
    }
}));
