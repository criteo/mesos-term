import React from "react";
import { FileDescription } from "../services/MesosTerm";
import { Layout } from "./FileDescriptionBar";
import FileBrowserGrid from "./FileBrowserGrid";
import FileBrowserList from "./FileBrowserList";

interface Props {
  files: FileDescription[];
  layout: Layout;
  selectedFilePath: string | null;

  onFileClick: (fd: FileDescription) => void;
  onFileDoubleClick: (fd: FileDescription) => void;
  onFileDownloadClick: (fd: FileDescription) => void;
}

export default function (props: Props) {
  return props.layout === Layout.Grid ? (
    <FileBrowserGrid
      files={props.files}
      selectedFilePath={props.selectedFilePath}
      onFileClick={props.onFileClick}
      onFileDoubleClick={props.onFileDoubleClick}
    />
  ) : (
    <FileBrowserList
      files={props.files}
      selectedFilePath={props.selectedFilePath}
      onFileClick={props.onFileClick}
      onFileDoubleClick={props.onFileDoubleClick}
      onFileDownloadClick={props.onFileDownloadClick}
    />
  );
}
