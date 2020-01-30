import React, { useState, useRef, MutableRefObject, UIEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircle } from "@fortawesome/free-regular-svg-icons";
import { makeStyles, useTheme } from "@material-ui/core";
import classnames from "classnames";
import { useFileReader } from "../../hooks/FileReader";
import AutoSizer from "react-virtualized-auto-sizer";

interface FileReaderProps {
    taskID: string;
    path: string;
}

export default function (props: FileReaderProps) {
    const classes = useFileReaderStyles();
    const fileReaderRef = useRef<HTMLDivElement | null>(null);
    const [loadPreviousPortion, setLoadPreviousPortion] = useState(false);
    const { lines, contentRef, follow, setFollow, lineRange } = useFileReader(
        props.taskID, props.path, 2000, loadPreviousPortion);

    const handleScroll = (p: UIEvent<HTMLDivElement>) => {
        if (p.currentTarget.scrollHeight > 0) {
            if (p.currentTarget.scrollTop < 0.1 * p.currentTarget.scrollHeight) {
                setLoadPreviousPortion(true);
            } else {
                setLoadPreviousPortion(false);
            }

            setFollow(contentRef.current !== null &&
                contentRef.current.scrollHeight - p.currentTarget.scrollTop === contentRef.current.clientHeight)
        }
    }

    return (
        <div className={classes.rootRoot}>
            <div onClick={() => setFollow(!follow)}
                className={classnames(classes.follow, follow ? classes.followActive : classes.followInactive)}>
                <FontAwesomeIcon icon={faCircle} size="lg" />
            </div>
            <div className={classes.root} ref={fileReaderRef}>
                <AutoSizer>
                    {({ height, width }) =>
                        <FileContent
                            width={width}
                            height={height}
                            lineRange={lineRange}
                            contentRef={contentRef}
                            onScroll={handleScroll}
                            lines={lines} />}
                </AutoSizer>
            </div>
        </div>
    )
}

const useFileReaderStyles = makeStyles(theme => ({
    rootRoot: {
        overflow: 'hidden',
        position: 'relative',
        height: '100%',
        backgroundColor: 'black',
    },
    root: {
        color: '#b7b7b7',
        overflow: 'hidden',
        height: '100%',
        wordBreak: 'break-all',
    },
    follow: {
        position: 'absolute',
        right: theme.spacing(4),
        top: theme.spacing(2),
        zIndex: 3,
        cursor: 'pointer',
    },
    followInactive: {
        color: 'grey',
    },
    followActive: {
        color: 'green',
    }
}))



interface FileContentProps {
    lines: string[];
    width: number;
    height: number;
    lineRange: { start: number, end: number };

    contentRef: MutableRefObject<HTMLDivElement | null>;
    onScroll: (p: UIEvent<HTMLDivElement>) => void;
}

function FileContent(props: FileContentProps) {
    const classes = useFileContentStyles();
    const textParts = props.lines;
    const theme = useTheme();
    const margin = theme.spacing(2);

    const items = props.lines.map((l, i) =>
        <Row content={textParts[i]} margin={margin} key={props.lineRange.start + i} />);

    return (
        <div className={classes.root}
            style={{
                width: props.width,
                height: props.height
            }}
            onScroll={props.onScroll}
            ref={props.contentRef}>
            <div className={classes.inner}>
                {items}
            </div>
        </div>
    );
}

const useFileContentStyles = makeStyles(theme => ({
    root: {
        width: '100%',
        overflow: 'auto',
    },
    inner: {
        marginLeft: theme.spacing(2),
        marginRight: theme.spacing(2),
        marginTop: theme.spacing(),
        marginBottom: theme.spacing(),
    }
}))

interface RowProps {
    content: string;
    margin: number;
}

function Row(props: RowProps) {
    return (
        <p style={{
            margin: 0,
            width: '100%',
        }}>
            {props.content}
        </p>
    )
}