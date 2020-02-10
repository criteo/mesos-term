import { createContext, useContext } from "react";

interface WindowLoadedContextProps {
    windowLoaded: boolean;
    setWindowLoaded: (loaded: boolean) => void;
}

export const WindowLoadedContext = createContext<WindowLoadedContextProps>({
    windowLoaded: false,
    setWindowLoaded: (loaded: boolean) => { },
});

export function useWindowLoaded() {
    const windowLoaded = useContext(WindowLoadedContext);
    return windowLoaded.windowLoaded;
}