"use client";

import { NativeSelect, Stack, Text } from "@chakra-ui/react";
import * as React from "react";
import { useCallback, useSyncExternalStore } from "react";

export const THEME_COLOR_OPTIONS = [
    { value: "orange", label: "Orange" },
    { value: "purple", label: "Purple" },
    { value: "yellow", label: "Yellow" },
    { value: "green", label: "Green" },
    { value: "teal", label: "Teal" },
    { value: "blue", label: "Blue" },
    { value: "pink", label: "Pink" },
] as const;

export type ThemeColor = (typeof THEME_COLOR_OPTIONS)[number]["value"];

const STORAGE_KEY = "lemot-theme-color";
const DEFAULT_THEME_COLOR: ThemeColor = "orange";
const THEME_COLOR_EVENT = "lemot-theme-color-change";

function isThemeColor(value: string | null | undefined): value is ThemeColor {
    return THEME_COLOR_OPTIONS.some((opt) => opt.value === value);
}

function readThemeColor(): ThemeColor {
    if (typeof window === "undefined") return DEFAULT_THEME_COLOR;
    const stored = localStorage.getItem(STORAGE_KEY);
    return isThemeColor(stored) ? stored : DEFAULT_THEME_COLOR;
}

function subscribe(onStoreChange: () => void) {
    window.addEventListener("storage", onStoreChange);
    window.addEventListener(THEME_COLOR_EVENT, onStoreChange);
    return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener(THEME_COLOR_EVENT, onStoreChange);
    };
}

function persistThemeColor(next: ThemeColor) {
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(THEME_COLOR_EVENT));
}

export function accent(palette: ThemeColor, shade: string | number): string {
    return `${palette}.${shade}`;
}

type ThemeColorContextValue = {
    palette: ThemeColor;
    setPalette: (next: ThemeColor) => void;
};

const ThemeColorContext = React.createContext<ThemeColorContextValue | null>(null);

export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
    const palette = useSyncExternalStore(subscribe, readThemeColor, () => DEFAULT_THEME_COLOR);
    const setPalette = useCallback((next: ThemeColor) => {
        persistThemeColor(next);
    }, []);

    return (
        <ThemeColorContext.Provider value={{ palette, setPalette }}>
            {children}
        </ThemeColorContext.Provider>
    );
}

export function useThemeColor(): ThemeColorContextValue {
    const ctx = React.useContext(ThemeColorContext);
    if (!ctx) {
        throw new Error("useThemeColor must be used within ThemeColorProvider");
    }
    return ctx;
}

export function ThemeColorSelector() {
    const { palette, setPalette } = useThemeColor();

    return (
        <Stack gap="1">
            <Text fontSize="xs" fontFamily="mono" color="fg.muted">
                Theme color
            </Text>
            <NativeSelect.Root size="sm" width="10rem">
                <NativeSelect.Field
                    value={palette}
                    fontFamily="mono"
                    fontSize="xs"
                    onChange={(e) => {
                        const next = e.currentTarget.value;
                        if (isThemeColor(next)) setPalette(next);
                    }}
                >
                    {THEME_COLOR_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </NativeSelect.Field>
            </NativeSelect.Root>
        </Stack>
    );
}
