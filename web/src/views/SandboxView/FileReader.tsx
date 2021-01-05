import React, { useRef, MutableRefObject, UIEvent } from "react";
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
  const {
    lines,
    contentRef,
    follow,
    setFollow,
    lineRange,
    readPreviousPortion,
    buffer,
  } = useFileReader(props.taskID, props.path, 10000);
  const throttler = useRef<boolean>(false);

  const handleScroll = async (p: UIEvent<HTMLDivElement>) => {
    if (!buffer) {
      return;
    }

    setFollow(
      contentRef.current !== null &&
        contentRef.current.scrollHeight - p.currentTarget.scrollTop ===
          contentRef.current.clientHeight
    );

    if (buffer.range.start === 0) {
      return;
    }

    if (p.currentTarget.scrollTop < 0.05 * p.currentTarget.scrollHeight) {
      if (p.currentTarget.scrollTop === 0) {
        p.currentTarget.scrollTo({ top: 0.05 * p.currentTarget.scrollHeight });
      }
      if (throttler.current) {
        return;
      }
      throttler.current = true;
      await readPreviousPortion();
      setTimeout(() => (throttler.current = false), 200);
    }
  };

  return (
    <div className={classes.rootRoot} id="file-reader">
      <div
        onClick={() => setFollow(!follow)}
        className={classnames(
          classes.follow,
          follow ? classes.followActive : classes.followInactive
        )}
      >
        <FontAwesomeIcon icon={faCircle} size="lg" />
      </div>
      <div className={classes.root} ref={fileReaderRef}>
        <AutoSizer>
          {({ height, width }) => (
            <FileContent
              width={width}
              height={height}
              lineRange={lineRange}
              contentRef={contentRef}
              onScroll={handleScroll}
              lines={lines}
            />
          )}
        </AutoSizer>
      </div>
    </div>
  );
}

const useFileReaderStyles = makeStyles((theme) => ({
  rootRoot: {
    overflow: "hidden",
    position: "relative",
    height: "100%",
    backgroundColor: "black",
  },
  root: {
    color: "#b7b7b7",
    overflow: "hidden",
    height: "100%",
    wordBreak: "break-all",
  },
  follow: {
    position: "absolute",
    right: theme.spacing(4),
    top: theme.spacing(2),
    zIndex: 3,
    cursor: "pointer",
  },
  followInactive: {
    color: "grey",
  },
  followActive: {
    color: "green",
  },
}));

interface FileContentProps {
  lines: string[];
  width: number;
  height: number;
  lineRange: { start: number; end: number };

  contentRef: MutableRefObject<HTMLDivElement | null>;
  onScroll: (p: UIEvent<HTMLDivElement>) => void;
}

function FileContent(props: FileContentProps) {
  const classes = useFileContentStyles();
  const theme = useTheme();
  const margin = theme.spacing(2);

  const items = props.lines.map((l, i) => {
    const key = props.lineRange.start + i + l;
    return <Row content={l} margin={margin} key={key} />;
  });

  return (
    <div
      className={classes.root}
      style={{
        width: props.width,
        height: props.height,
      }}
      onScroll={props.onScroll}
      ref={props.contentRef}
    >
      <div className={classes.inner} id="file-reader-content">
        {items}
      </div>
    </div>
  );
}

const useFileContentStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    overflow: "auto",
  },
  inner: {
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
    marginTop: theme.spacing(),
    marginBottom: theme.spacing(),
  },
}));

interface RowProps {
  content: string;
  margin: number;
}

function Row(props: RowProps) {
  const theme = useTheme();
  return (
    <pre
      style={{
        margin: 0,
        width: "100%",
        fontSize: theme.typography.fontSize,
      }}
    >
      {props.content}
    </pre>
  );
}
