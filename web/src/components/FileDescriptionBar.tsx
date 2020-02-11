import React, { Fragment } from "react";
import { FileDescription } from "../services/MesosTerm";
import { Tooltip, makeStyles, Button } from "@material-ui/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolder, faFile } from "@fortawesome/free-solid-svg-icons";
import classnames from "classnames";
import Moment from "moment";

interface FileDescriptionBarProps {
    fd: FileDescription | null;

    onDownloadClick: () => void;
}

export default function (props: FileDescriptionBarProps) {
    const classes = useFileDescriptionBarStyles();
    const filename = props.fd ? props.fd.path.split('/').pop() : '-';
    const size = props.fd ? (props.fd.size / 1000).toFixed(2) : '-';
    const mode = props.fd ? props.fd.mode : '-';
    const isDir = props.fd === null || mode.slice(0, 1) === 'd';
    const uid = props.fd ? props.fd.uid : '-';
    const gid = props.fd ? props.fd.gid : '-';
    const mtime = props.fd ? Moment(new Date(props.fd.mtime * 1000)).format("DD/MM/YYYY HH:mm:ss") : '-';
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
            <span className={classnames(classes.item, "desc-mode", "even")}>date: {mtime}</span>{" "}
            <span className={classnames(classes.item, "desc-uid", "odd")}>uid: {uid}</span>{" "}
            <span className={classnames(classes.item, "desc-gid", "even")}>gid: {gid}</span>{" "}
            <Button
                size="small" variant="outlined"
                onClick={props.onDownloadClick}>
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
