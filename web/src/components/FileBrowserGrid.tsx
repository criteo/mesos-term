import React, { MouseEvent } from 'react';
import { Grid, Paper, Typography, makeStyles } from '@material-ui/core';
import { FileDescription } from '../services/MesosTerm';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classnames from "classnames";
import { faFolder } from '@fortawesome/free-solid-svg-icons';
import { faFile } from '@fortawesome/free-solid-svg-icons';

interface Props {
    files: FileDescription[];
    selectedFilePath: string | null;

    onFileClick: (fd: FileDescription) => void;
    onFileDoubleClick: (fd: FileDescription) => void;
}

export default function FileBrowserGrid(props: Props) {
    const classes = useStyles();
    const fileItems = props.files ? props.files.map((f, i) => {
        const handleDoubleClick = (ev: MouseEvent<HTMLDivElement>, fd: FileDescription) => {
            props.onFileDoubleClick(fd);
        }
        const handleClick = (ev: MouseEvent<HTMLDivElement>, fd: FileDescription) => {
            ev.stopPropagation();
            props.onFileClick(fd);
        }
        return (
            <Grid item lg={2} sm={3} xs={6}
                key={`file-${i}`}>
                <FileItem fd={f}
                    onClick={e => handleClick(e, f)}
                    onDoubleClick={e => handleDoubleClick(e, f)}
                    selected={props.selectedFilePath !== null && f.path === props.selectedFilePath} />
            </Grid>
        );
    }) : [];

    return (
        <Grid container
            className={classes.grid}
            spacing={2}>
            {fileItems}
        </Grid>
    )
}

const useStyles = makeStyles(theme => ({
    grid: {
        width: 'calc(100%)',
        margin: 0,
        padding: theme.spacing(),
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
