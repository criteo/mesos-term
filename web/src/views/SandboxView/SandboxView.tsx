import React, { useEffect, useState, useCallback } from "react";
import { browseSandbox, FileDescription, downloadSandboxFile } from "../../services/MesosTerm";
import { useRouteMatch, useHistory, useLocation } from "react-router";
import { makeStyles, Breadcrumbs, Link, CircularProgress } from "@material-ui/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSitemap } from "@fortawesome/free-solid-svg-icons";
import queryString from "query-string";
import classnames from "classnames";
import { useNotifications } from "../../hooks/NotificationContext";
import { saveAs } from 'file-saver';
import FileReader from "./FileReader";
import FileDescriptionBar, { Layout } from "../../components/FileDescriptionBar";
import FileBrowser from "../../components/FileBrowser";

function isDirectory(fd: FileDescription) {
    return fd.mode.slice(0, 1) === 'd';
}

function buildURL(taskID: string, path: string, layout: Layout) {
    const lay = layout === Layout.List ? "list" : "grid";
    return `/task/${taskID}/sandbox?path=${encodeURIComponent(path)}&layout=${lay}`;
}

export default function () {
    const match = useRouteMatch<{ taskID: string }>();
    const classes = useStyles();
    const location = useLocation();
    const qs = queryString.parse(location.search, { sort: false });
    const [path, setPath] = useState(qs.path ? qs.path as string : '/');
    const [layout, setLayout] = useState(qs.layout && qs.layout === 'grid' ?
        Layout.Grid : Layout.List);

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

    useEffect(() => {
        history.push(buildURL(match.params.taskID, path, layout));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [history, path, match.params.taskID]);

    useEffect(() => {
        history.replace(buildURL(match.params.taskID, path, layout));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [layout]);

    let breadCrumbRoot = (
        <Link href={buildURL(match.params.taskID, '/', layout)} key={`path-item-root`}>
            Sandbox
        </Link>
    )

    const restBreadCrumbItems = path.slice(1).split('/').filter(x => x !== '').map((x, i) => {
        const link = path.split('/').slice(0, i + 2).join('/');
        const url = buildURL(match.params.taskID, link, layout);
        return (
            <Link href={url} key={`path-item-${i}`}>
                {x}
            </Link>
        )
    });

    const downloadFile = async (fd: FileDescription) => {
        console.log(fd);
        try {
            const p = fd.path;
            const isDir = isDirectory(fd);
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
    }


    const downloadFileCallback = useCallback(async () => {
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

    const handleFileDoubleClick = (fd: FileDescription) => {
        setPath(fd.path);
    }
    const handleFileClick = (fd: FileDescription) => {
        setSelectedFile(fd);
    }

    const handleLayoutChange = (layout: Layout) => {
        setLayout(layout);
    }

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
                : <div className={classes.explorerContainer}
                    onClick={e => { setSelectedFile(null); e.preventDefault() }}>
                    <FileBrowser
                        files={files ? files : []}
                        layout={layout}
                        selectedFilePath={selectedFile ? selectedFile.path : null}
                        onFileClick={handleFileClick}
                        onFileDoubleClick={handleFileDoubleClick}
                        onFileDownloadClick={downloadFile} />
                </div>}
            <div className={classes.description}>
                <FileDescriptionBar
                    fd={selectedFile ? selectedFile : currentFd}
                    hideLayoutButtons={isFile === true}
                    layout={layout}
                    onLayoutChanged={handleLayoutChange}
                    onDownloadClick={downloadFileCallback} />
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

