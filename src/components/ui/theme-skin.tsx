"use client";

import { NativeSelect, Stack, Text } from "@chakra-ui/react";
import * as React from "react";
import { useCallback, useSyncExternalStore } from "react";

export const THEME_SKIN_OPTIONS = [
    { value: "tokyo", label: "Tokyo Night", css: "tokyo-night.css" },
    { value: "vegas", label: "Fear & Loathing", css: "vegas-heat.css" },
    { value: "hacker", label: "Hacker", css: "hacker-terminal.css" },
] as const;

export type ThemeSkin = (typeof THEME_SKIN_OPTIONS)[number]["value"];

const STORAGE_KEY = "lemot-theme-skin";
const DEFAULT_SKIN: ThemeSkin = "tokyo";
const SKIN_EVENT = "lemot-theme-skin-change";

function isThemeSkin(value: string | null | undefined): value is ThemeSkin {
    return THEME_SKIN_OPTIONS.some((opt) => opt.value === value);
}

function readThemeSkin(): ThemeSkin {
    if (typeof window === "undefined") return DEFAULT_SKIN;
    const stored = localStorage.getItem(STORAGE_KEY);
    return isThemeSkin(stored) ? stored : DEFAULT_SKIN;
}

function subscribe(onStoreChange: () => void) {
    window.addEventListener("storage", onStoreChange);
    window.addEventListener(SKIN_EVENT, onStoreChange);
    return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener(SKIN_EVENT, onStoreChange);
    };
}

function applyThemeSkin(skin: ThemeSkin) {
    document.documentElement.dataset.skin = skin;
}

function persistThemeSkin(next: ThemeSkin) {
    localStorage.setItem(STORAGE_KEY, next);
    applyThemeSkin(next);
    window.dispatchEvent(new Event(SKIN_EVENT));
}

type ThemeSkinContextValue = {
    skin: ThemeSkin;
    setSkin: (next: ThemeSkin) => void;
};

const ThemeSkinContext = React.createContext<ThemeSkinContextValue | null>(null);

export function ThemeSkinProvider({ children }: { children: React.ReactNode }) {
    const skin = useSyncExternalStore(subscribe, readThemeSkin, () => DEFAULT_SKIN);

    React.useEffect(() => {
        applyThemeSkin(skin);
    }, [skin]);

    const setSkin = useCallback((next: ThemeSkin) => {
        persistThemeSkin(next);
    }, []);

    const value = React.useMemo(() => ({ skin, setSkin }), [skin, setSkin]);

    return (
        <ThemeSkinContext.Provider value={value}>
            {children}
        </ThemeSkinContext.Provider>
    );
}

export function useThemeSkin(): ThemeSkinContextValue {
    const ctx = React.useContext(ThemeSkinContext);
    if (!ctx) {
        throw new Error("useThemeSkin must be used within ThemeSkinProvider");
    }
    return ctx;
}

export function ThemeSkinSelector() {
    const { skin, setSkin } = useThemeSkin();

    return (
        <Stack gap="1">
            <Text fontSize="xs" fontFamily="mono" color="fg.muted">
                Theme
            </Text>
            <NativeSelect.Root size="sm" width="12rem">
                <NativeSelect.Field
                    value={skin}
                    fontFamily="mono"
                    fontSize="xs"
                    onChange={(e) => {
                        const next = e.currentTarget.value;
                        if (isThemeSkin(next)) setSkin(next);
                    }}
                >
                    {THEME_SKIN_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </NativeSelect.Field>
            </NativeSelect.Root>
        </Stack>
    );
}
