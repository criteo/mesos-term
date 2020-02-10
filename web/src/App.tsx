import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Redirect, Switch } from "react-router-dom";
import { ThemeProvider, createMuiTheme } from '@material-ui/core';
import NotificationsContext, { Notification } from './hooks/NotificationContext';
import NotificationBar from './components/NotificationBar';
import Layout from './Layout';
import MainView from './views/MainView';
import { WindowLoadedContext } from './hooks/WindowLoadedContext';

const App: React.FC = () => {
  const [notification, setNotification] = useState(null as Notification | null);
  const [windowLoaded, setWindowLoaded] = useState(false);

  useEffect(() => {
    window.addEventListener('load', function () { setWindowLoaded(true) });
  }, []);

  const darkTheme = createMuiTheme({
    palette: {
      type: 'dark',
    },
  });

  return (
    <ThemeProvider theme={darkTheme}>
      <NotificationsContext.Provider value={{ notification, setNotification }} >
        <WindowLoadedContext.Provider value={{ windowLoaded, setWindowLoaded }}>
          <NotificationBar onClose={() => setNotification(null)} />
          <Router>
            <Switch>
              <Route path="/" exact={true}>
                <MainView />
              </Route>
              <Route path="/task/:taskID">
                <Layout />
              </Route>
              <Route path="/">
                <Redirect to="/" />
              </Route>
            </Switch>
          </Router>
        </WindowLoadedContext.Provider>
      </NotificationsContext.Provider>
    </ThemeProvider>
  );
}

export default App;
