import { useCallback, useEffect, useRef, useState } from "react";
import { readSandboxFile } from "../services/MesosTerm";

interface Range {
    start: number;
    end: number;
}

interface FileState {
    data: string;
    range: Range;
    lineRange: Range;
}


export function useFileReader(
    taskID: string, path: string,
    chunkSize: number, loadMore: boolean) {

    const timer = useRef<NodeJS.Timeout | null>();
    const [follow, setFollow] = useState(true);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const buffer = useRef<FileState | null>(null);
    const [init, setInit] = useState(false);
    const [displayedLines, setDisplayedLines] = useState([] as string[]);
    const lineRange = buffer.current ? buffer.current.lineRange : { start: 0, end: 0 };

    const readPreviousPortion = useCallback(async () => {
        if (!buffer.current) {
            return;
        }

        const from = Math.max(0, buffer.current.range.start - chunkSize);
        const size = Math.min(buffer.current.range.start, chunkSize);
        const res = await readSandboxFile(taskID, path, from, size);
        if (res.data !== '') {
            const contentLines = buffer.current.data.split('\n');
            buffer.current.data = res.data + buffer.current.data;
            buffer.current.range.start -= res.data.length;
            const newContentLines = buffer.current.data.split('\n');
            buffer.current.lineRange.start -= newContentLines.length - contentLines.length;
            setDisplayedLines(newContentLines);
        }
    }, [setDisplayedLines, taskID, chunkSize, path]);

    const readNextPortion = useCallback(async () => {
        if (!buffer.current) {
            return;
        }

        const from = buffer.current.range.end;
        const size = Math.min(chunkSize);
        const res = await readSandboxFile(taskID, path, from, size);
        if (res.data !== '') {
            const contentLines = buffer.current.data.split('\n');
            buffer.current.data = buffer.current.data + res.data;
            buffer.current.range.end += res.data.length;
            const newContentLines = buffer.current.data.split('\n');
            buffer.current.lineRange.end += newContentLines.length - contentLines.length;
            setDisplayedLines(newContentLines);
        }
    }, [setDisplayedLines, taskID, chunkSize, path]);

    const initialize = useCallback(async () => {
        const newContent = await readSandboxFile(taskID, path, -1, -1);
        buffer.current = {
            data: '',
            range: {
                start: newContent.offset,
                end: newContent.offset
            },
            lineRange: { start: 0, end: 0 }
        };
        setInit(true);
    }, [taskID, path]);

    useEffect(() => {
        timer.current = setInterval(readNextPortion, 2000);
        return () => {
            if (timer.current) {
                clearInterval(timer.current);
            }
        }
    }, [readNextPortion]);

    useEffect(() => {
        if (contentRef.current && follow) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [follow, displayedLines]);

    useEffect(() => { initialize() }, [initialize]);
    useEffect(() => {
        async function fn() {
            if (init) {
                await readPreviousPortion();
                if (contentRef.current)
                    contentRef.current.scrollTop = contentRef.current.scrollHeight;
            }
        }
        fn();
    }, [readPreviousPortion, init]);

    useEffect(() => {
        if (loadMore) {
            readPreviousPortion();
        }
    }, [readPreviousPortion, loadMore]);

    return { lines: displayedLines, contentRef, follow, setFollow, lineRange };
}