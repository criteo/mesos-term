import { Level } from "../components/ColoredSnackbarContent";
import { useCallback, createContext, useContext } from "react";

export interface Notification {
  message: string;
  level: Level;
  timeout: number | undefined;
}

const defaultOptions = {
  timeout: 5,
};

interface NotificationContextProps {
  notification: Notification | null;
  setNotification: (n: Notification | null) => void;
}

const NotificationsContext = createContext<NotificationContextProps>({
  notification: null,
  setNotification: () => {},
});

export default NotificationsContext;

export function useNotifications() {
  let useNotificationsProps = useContext(NotificationsContext);

  const notificationBuilder = (level: Level) => {
    return (message: string, timeout?: number) => {
      let targetTimeout: number | undefined = defaultOptions.timeout;
      if (timeout === -1) {
        targetTimeout = undefined;
      } else {
        targetTimeout = timeout;
      }

      useNotificationsProps.setNotification({
        level,
        message,
        timeout: targetTimeout,
      });
    };
  };

  const resetNotification = () => useNotificationsProps.setNotification(null);
  const createInfoNotification = useCallback(notificationBuilder("info"), []);
  const createSuccessNotification = useCallback(
    notificationBuilder("success"),
    []
  );
  const createWarnNotification = useCallback(
    notificationBuilder("warning"),
    []
  );
  const createErrorNotification = useCallback(notificationBuilder("error"), []);
  const isActive = useNotificationsProps.notification !== null;

  return {
    notification: useNotificationsProps.notification,
    resetNotification,
    createInfoNotification,
    createSuccessNotification,
    createWarnNotification,
    createErrorNotification,
    isActive,
  };
}
