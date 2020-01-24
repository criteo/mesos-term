import React from 'react';
import XTerm from './components/XTerm';
import { Grid, makeStyles } from '@material-ui/core';

const App: React.FC = () => {
  const classes = useStyles();
  return (
    <Grid container className={classes.root}>
      <Grid item xs={12}>
        <XTerm />
      </Grid>
    </Grid>
  );
}

const useStyles = makeStyles(theme => ({
  root: {
    width: "100%",
    height: "100vh",
  }
}))

export default App;
