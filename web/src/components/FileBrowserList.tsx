import React, { MouseEvent } from "react";
import { FileDescription } from "../services/MesosTerm";
import { makeStyles, Table, TableHead, TableRow, TableCell, TableBody, Button } from "@material-ui/core";
import Moment from "moment";
import { faFolder, faFile } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { formatFileSize } from "../utils/FileSize";
import { DATETIME_FORMAT } from "../constants";
import classnames from "classnames";


interface Props {
    files: FileDescription[];
    selectedFilePath: string | null;

    onFileDownloadClick: (fd: FileDescription) => void;
    onFileClick: (fd: FileDescription) => void;
    onFileDoubleClick: (fd: FileDescription) => void;
}

export default function (props: Props) {
    const classes = useStyles();
    const directories = props.files ? props.files.filter(f => f.mode.slice(0, 1) === 'd') : [];
    const files = props.files ? props.files.filter(f => f.mode.slice(0, 1) !== 'd') : [];
    const dirsAndFiles = directories.concat(files);

    const fileItems = dirsAndFiles.map((f, i) => {
        const handleDoubleClick = (ev: MouseEvent<HTMLDivElement>, fd: FileDescription) => {
            props.onFileDoubleClick(fd);
        }
        const handleClick = (ev: MouseEvent<HTMLDivElement>, fd: FileDescription) => {
            ev.stopPropagation();
            props.onFileClick(fd);
        }
        const handleDownload = () => {
            props.onFileDownloadClick(f);
        }

        return (
            <FileItem fd={f}
                key={`file-${i}`}
                onClick={e => handleClick(e, f)}
                onDoubleClick={e => handleDoubleClick(e, f)}
                onDownloadClick={handleDownload}
                selected={props.selectedFilePath !== null && f.path === props.selectedFilePath} />
        );
    });

    return (
        <Table>
            <TableHead>
                <TableRow className={classes.headerRow}>
                    <TableCell>filename</TableCell>
                    <TableCell>uid</TableCell>
                    <TableCell>gid</TableCell>
                    <TableCell align="right">size</TableCell>
                    <TableCell align="right">date</TableCell>
                    <TableCell align="center">mode</TableCell>
                    <TableCell align="center">download</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {fileItems}
            </TableBody>
        </Table>
    )
}

const useStyles = makeStyles(theme => ({
    headerRow: {
        '& th': {
            fontWeight: 'bold',
            color: '#c76383',
        }
    },
}))

interface FileItemProps {
    fd: FileDescription;
    selected: boolean;

    onClick: (e: MouseEvent<HTMLDivElement>, fd: FileDescription) => void;
    onDoubleClick: (e: MouseEvent<HTMLDivElement>, fd: FileDescription) => void;
    onDownloadClick: () => void;
}

function FileItem(props: FileItemProps) {
    const classes = useFileItemStyles();
    const isDirectory = props.fd.mode.slice(0, 1) === 'd';
    const filename = props.fd.path.split('/').pop();
    const date = Moment(new Date(props.fd.mtime * 1000)).format(DATETIME_FORMAT);

    const handleClick = (e: MouseEvent<HTMLTableRowElement>) => {
        props.onClick(e, props.fd);
    }

    const handleDoubleClick = (e: MouseEvent<HTMLTableRowElement>) => {
        props.onDoubleClick(e, props.fd);
    }

    const handleDownloadClick = (e: MouseEvent<HTMLButtonElement>) => {
        props.onDownloadClick();
        e.preventDefault();
    }

    const icon = <FontAwesomeIcon icon={isDirectory ? faFolder : faFile} size="lg"
        className={classnames(classes.icon, isDirectory ? classes.directory : '')} />;

    return (
        <TableRow className={classnames(classes.root, "file-item")}
            hover
            selected={props.selected}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}>
            <TableCell>{icon}<span className="filename">{filename}</span></TableCell>
            <TableCell>{props.fd.uid}</TableCell>
            <TableCell>{props.fd.gid}</TableCell>
            <TableCell align="right">{formatFileSize(props.fd.size)}</TableCell>
            <TableCell align="right">{date}</TableCell>
            <TableCell align="center">{props.fd.mode}</TableCell>
            <TableCell align="center">
                <Button variant="outlined"
                    onClick={handleDownloadClick}>
                    Download
                </Button>
            </TableCell>
        </TableRow>
    )
}

const useFileItemStyles = makeStyles(theme => ({
    root: {
        color: 'white',
    },
    icon: {
        marginRight: theme.spacing(2),
    },
    directory: {
        color: '#c38c00',
    }
}))