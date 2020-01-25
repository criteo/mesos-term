import React, { useState } from 'react';
import { BrowserRouter as Router, Switch, Route, Redirect } from "react-router-dom";
import TerminalView from './views/TerminalView';
import { ThemeProvider, createMuiTheme } from '@material-ui/core';
import NotificationsContext, { Notification } from './hooks/NotificationContext';
import NotificationBar from './components/NotificationBar';
import MainView from './views/MainView';

const App: React.FC = () => {
  const [notification, setNotification] = useState(null as Notification | null);

  const darkTheme = createMuiTheme({
    palette: {
      type: 'dark',
    },
  });

  return (
    <ThemeProvider theme={darkTheme}>
      <NotificationsContext.Provider value={{ notification, setNotification }} >
        <NotificationBar onClose={() => setNotification(null)} />
        <Router>
          <Switch>
            <Route path="/" exact={true}>
              <MainView />
            </Route>
            <Route path="/login/:task_id" exact={true}>
              <TerminalView />
            </Route>
            <Route path="/">
              <Redirect to="/" />
            </Route>
          </Switch>
        </Router>
      </NotificationsContext.Provider>
    </ThemeProvider>
  );
}

export default App;
