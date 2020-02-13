import React, { Fragment } from "react";
import { FileDescription } from "../services/MesosTerm";
import { Tooltip, makeStyles, Button, ButtonGroup } from "@material-ui/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolder, faFile, faList, faThLarge } from "@fortawesome/free-solid-svg-icons";
import classnames from "classnames";
import Moment from "moment";
import { DATETIME_FORMAT } from "../constants";

interface FileDescriptionBarProps {
    fd: FileDescription | null;
    layout: Layout;
    hideLayoutButtons: boolean;
    downloadInProgress: boolean;

    onDownloadClick: () => void;
    onLayoutChanged: (layout: Layout) => void;
}

export enum Layout {
    Grid,
    List,
}

export default function (props: FileDescriptionBarProps) {
    const classes = useFileDescriptionBarStyles();
    const filename = props.fd ? props.fd.path.split('/').pop() : '-';
    const size = props.fd ? (props.fd.size / 1000).toFixed(2) : '-';
    const mode = props.fd ? props.fd.mode : '-';
    const isDir = props.fd === null || mode.slice(0, 1) === 'd';
    const uid = props.fd ? props.fd.uid : '-';
    const gid = props.fd ? props.fd.gid : '-';
    const mtime = props.fd ? Moment(new Date(props.fd.mtime * 1000)).format(DATETIME_FORMAT) : '-';

    const handleLayoutGridClick = () => {
        props.onLayoutChanged(Layout.Grid);
    }

    const handleLayoutListClick = () => {
        props.onLayoutChanged(Layout.List);
    }

    return (
        <Fragment>
            {!props.hideLayoutButtons ? <ButtonGroup className={classes.layoutButtons}>
                <Button disabled={props.layout === Layout.Grid}
                    onClick={handleLayoutGridClick}>
                    <FontAwesomeIcon icon={faThLarge} />
                </Button>
                <Button disabled={props.layout === Layout.List}
                    onClick={handleLayoutListClick}>
                    <FontAwesomeIcon icon={faList} />
                </Button>
            </ButtonGroup> : null}
            <Tooltip title="download">
                <span onClick={props.onDownloadClick}>
                    <FontAwesomeIcon icon={isDir ? faFolder : faFile} className={classes.icon} />
                </span>
            </Tooltip>
            <span className={classnames(classes.item, "desc-name", "odd")}>name: {filename}</span>{" "}
            <span className={classnames(classes.item, "desc-size", "even")}>size: {size}kb</span>{" "}
            <span className={classnames(classes.item, "desc-mode", "odd")}>mode: {mode}</span>{" "}
            <span className={classnames(classes.item, "desc-mode", "even")}>date: {mtime}</span>{" "}
            <span className={classnames(classes.item, "desc-uid", "odd")}>uid: {uid}</span>{" "}
            <span className={classnames(classes.item, "desc-gid", "even")}>gid: {gid}</span>{" "}
            <Button
                size="small" variant="outlined"
                onClick={props.onDownloadClick}>
                Download
            </Button>
            {props.downloadInProgress
                ? <span className={classes.preparingDownload}>Preparing download...</span>
                : null}
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
    layoutButtons: {
        marginRight: theme.spacing(2),
    },
    icon: {
        display: 'inline-block',
        cursor: 'pointer',
        marginRight: theme.spacing(2),
    },
    preparingDownload: {
        marginLeft: theme.spacing(2),
    }
}));
