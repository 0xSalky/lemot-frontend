"use client";

import { NativeSelect, Stack, Text } from "@chakra-ui/react";
import * as React from "react";
import { useCallback, useSyncExternalStore } from "react";
import { useColorModeValue } from "./color-mode";

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

export type TagToneStyle = { bg: string; color: string; border: string };

/** Semantic colors that read well in both light and dark mode. */
export type ThemeTokens = {
    title: string;
    panelHeading: string;
    panelBody: string;
    panelLabel: string;
    panelMuted: string;
    panelBg: string;
    panelBgUser: string;
    panelBorder: string;
    inlineStrong: string;
    inlineEm: string;
    inlineCode: string;
    tableHeaderBg: string;
    tableHeaderColor: string;
    tableCellColor: string;
    blockquoteBg: string;
    listBullet: string;
    warn: string;
    tagNeutral: TagToneStyle;
    tagGreen: TagToneStyle;
    tagRed: TagToneStyle;
    tagAccent: TagToneStyle;
    tagBlue: TagToneStyle;
};

export function useThemeTokens(palette: ThemeColor): ThemeTokens {
    const p = palette;

    const panelHeading = useColorModeValue(`${p}.700`, `${p}.300`);
    const panelBody = useColorModeValue("fg", `${p}.50`);
    const panelLabel = useColorModeValue(`${p}.600`, `${p}.400`);
    const panelMuted = useColorModeValue(`${p}.500`, `${p}.200`);
    const title = useColorModeValue(`${p}.800`, `${p}.200`);
    const panelBg = useColorModeValue(`${p}.50`, `${p}.950/40`);
    const panelBgUser = useColorModeValue(`${p}.100`, `${p}.950/50`);
    const panelBorder = useColorModeValue(`${p}.200`, `${p}.800`);
    const inlineStrong = useColorModeValue(`${p}.900`, `${p}.100`);
    const inlineEm = useColorModeValue(`${p}.700`, `${p}.200`);
    const inlineCode = useColorModeValue(`${p}.700`, `${p}.300`);
    const tableHeaderBg = useColorModeValue(`${p}.100`, `${p}.950/60`);
    const tableHeaderColor = useColorModeValue(`${p}.800`, `${p}.300`);
    const tableCellColor = useColorModeValue("fg", `${p}.50`);
    const blockquoteBg = useColorModeValue(`${p}.50`, `${p}.950/30`);
    const listBullet = useColorModeValue(`${p}.500`, `${p}.400`);
    const warn = useColorModeValue("red.600", "red.300");

    const tagNeutral: TagToneStyle = {
        bg: useColorModeValue(`${p}.100`, "whiteAlpha.100"),
        color: useColorModeValue(`${p}.800`, `${p}.200`),
        border: useColorModeValue(`${p}.300`, `${p}.700`),
    };
    const tagGreen: TagToneStyle = {
        bg: useColorModeValue("green.50", "green.950"),
        color: useColorModeValue("green.800", "green.300"),
        border: useColorModeValue("green.200", "green.800"),
    };
    const tagRed: TagToneStyle = {
        bg: useColorModeValue("red.50", "red.950"),
        color: useColorModeValue("red.700", "red.300"),
        border: useColorModeValue("red.200", "red.800"),
    };
    const tagAccent: TagToneStyle = {
        bg: useColorModeValue(`${p}.100`, `${p}.950`),
        color: useColorModeValue(`${p}.800`, `${p}.300`),
        border: useColorModeValue(`${p}.300`, `${p}.800`),
    };
    const tagBlue: TagToneStyle = {
        bg: useColorModeValue("blue.50", "blue.950"),
        color: useColorModeValue("blue.800", "blue.300"),
        border: useColorModeValue("blue.200", "blue.800"),
    };

    return {
        title,
        panelHeading,
        panelBody,
        panelLabel,
        panelMuted,
        panelBg,
        panelBgUser,
        panelBorder,
        inlineStrong,
        inlineEm,
        inlineCode,
        tableHeaderBg,
        tableHeaderColor,
        tableCellColor,
        blockquoteBg,
        listBullet,
        warn,
        tagNeutral,
        tagGreen,
        tagRed,
        tagAccent,
        tagBlue,
    };
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
