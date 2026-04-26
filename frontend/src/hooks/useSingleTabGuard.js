import { useEffect, useState } from "react";

const TAB_KEY = 'spendwise-active-tab';

export function useSingleTabGuard(userId) {
    const [isDuplicateTab, setIsDuplicateTab] = useState(false);
    const tabId = `${userId}-${Date.now()}`;

    useEffect(() => {
        if (!userId) return;

        const existingTab = localStorage.getItem(TAB_KEY);
        
        if (existingTab && existingTab !== tabId) {
            setIsDuplicateTab(true);
        } else {
            localStorage.setItem(TAB_KEY, tabId);
        }

        const handleStorageChange = (event) => {
            if (event.key === TAB_KEY && event.newValue !== tabId) {
                setIsDuplicateTab(true);
            }
        };

        const cleanup = () => {
            if (localStorage.getItem(TAB_KEY) === tabId) {
                localStorage.removeItem(TAB_KEY);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('beforeunload', cleanup);

        return () => {
            cleanup();
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('beforeunload', cleanup);
        };
    }, [userId]);

    return isDuplicateTab;
}