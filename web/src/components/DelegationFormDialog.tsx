import React, { useState, ChangeEvent, Fragment } from "react";
import {
  DialogTitle,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  DialogContentText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  makeStyles,
} from "@material-ui/core";
import { postGenerateDelegationToken } from "../services/MesosTerm";
import { useNotifications } from "../hooks/NotificationContext";
import classnames from "classnames";

export interface Props {
  open: boolean;
  taskID: string;

  onClose: () => void;
}

export default function (props: Props) {
  const [duration, setDuration] = useState("1h");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const { createErrorNotification } = useNotifications();

  const handleClose = () => {
    setToken("");
    props.onClose();
  };

  const handleGenerate = async () => {
    if (username === "") {
      createErrorNotification("Provide a username to delegate access to");
    }

    try {
      const token = await postGenerateDelegationToken({
        delegate_to: username,
        task_id: props.taskID,
        duration: duration,
      });
      setToken(token);
    } catch (err) {
      createErrorNotification(err.message);
    }
  };

  const handleDurationChange = (e: ChangeEvent<{ value: unknown }>) => {
    setDuration(e.target.value as string);
  };

  const handleUsernameChange = (e: ChangeEvent<{ value: string }>) => {
    setUsername(e.target.value);
  };

  const delegationURL =
    window.location.protocol +
    "//" +
    window.location.hostname +
    (window.location.port ? ":" + window.location.port : "") +
    `/task/${props.taskID}/terminal?access_token=${token}`;

  return (
    <Dialog open={props.open} id="delegation-dialog">
      <DialogTitle>Access Delegation</DialogTitle>
      <DialogContent>
        {token ? (
          <TextField
            fullWidth
            label="Token"
            value={delegationURL}
            className="token-field"
            rows={8}
            multiline
            style={{ minWidth: "500px" }}
            InputLabelProps={{
              shrink: true,
            }}
          ></TextField>
        ) : (
          <DelegationForm
            taskID={props.taskID}
            duration={duration}
            username={username}
            onDurationChange={handleDurationChange}
            onUsernameChange={handleUsernameChange}
          />
        )}
      </DialogContent>
      <DialogActions>
        {!token ? (
          <Button onClick={handleGenerate} className="generate-button">
            Generate
          </Button>
        ) : null}
        <Button onClick={handleClose} className="close-button">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface DelegationFormProps {
  taskID: string;
  duration: string;
  username: string;

  onDurationChange: (e: ChangeEvent<{ value: unknown }>) => void;
  onUsernameChange: (e: ChangeEvent<{ value: string }>) => void;
}

function DelegationForm(props: DelegationFormProps) {
  const classes = makeStyles((theme) => ({
    field: {
      marginBottom: theme.spacing(2),
    },
  }))();

  return (
    <Fragment>
      <DialogContentText>
        Generate a delegation token to grant access to the current container for
        a limited period of time.
      </DialogContentText>
      <TextField
        fullWidth
        InputProps={{
          readOnly: true,
        }}
        id="task_id"
        label="Task ID"
        value={props.taskID}
        type="text"
        className={classnames(classes.field, "taskid-field")}
      ></TextField>
      <TextField
        fullWidth
        id="username"
        label={"Username"}
        type="text"
        value={props.username}
        className={classnames(classes.field, "username-field")}
        onChange={props.onUsernameChange}
        InputLabelProps={{
          shrink: true,
        }}
      ></TextField>
      <FormControl fullWidth className={classes.field}>
        <InputLabel id="duration-label">Duration</InputLabel>
        <Select
          fullWidth
          labelId="duration-label"
          id="duration-select"
          className="duration-field"
          value={props.duration}
          onChange={props.onDurationChange}
        >
          <MenuItem value={"1h"}>1 hour</MenuItem>
          <MenuItem value={"1d"}>1 day</MenuItem>
          <MenuItem value={"7d"}>7 days</MenuItem>
          <MenuItem value={"15d"}>15 days</MenuItem>
        </Select>
      </FormControl>
    </Fragment>
  );
}
