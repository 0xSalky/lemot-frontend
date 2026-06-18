"use client";

import * as React from "react";
import { useColorModeValue } from "./color-mode";
import { useThemeSkin } from "./theme-skin";

export type ThemeColor = "pink" | "orange" | "green";

export type TagToneStyle = { bg: string; color: string; border: string };

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

export function accent(palette: ThemeColor, shade: string | number): string {
    return `${palette}.${shade}`;
}

function useTokyoTokens(): ThemeTokens {
    const title = useColorModeValue("#a21caf", "#ff5ce8");
    const panelHeading = useColorModeValue("#0e7490", "#6df7ff");
    const panelBody = useColorModeValue("#1e1030", "#ebe4f8");
    const panelLabel = useColorModeValue("#7c3aed", "#c9a0ff");
    const panelMuted = useColorModeValue("#6b5b80", "#9b8ab8");
    const panelBg = useColorModeValue("rgba(255, 252, 255, 0.82)", "rgba(14, 3, 28, 0.9)");
    const panelBgUser = useColorModeValue("rgba(248, 240, 255, 0.94)", "rgba(24, 6, 42, 0.94)");
    const panelBorder = useColorModeValue("rgba(192, 38, 160, 0.22)", "rgba(255, 92, 232, 0.34)");
    const inlineStrong = useColorModeValue("#14081f", "#ffffff");
    const inlineEm = useColorModeValue("#0e7490", "#6df7ff");
    const inlineCode = useColorModeValue("#a21caf", "#ffb3f0");
    const tableHeaderBg = useColorModeValue("rgba(236, 72, 153, 0.08)", "rgba(255, 92, 232, 0.12)");
    const tableHeaderColor = useColorModeValue("#0e7490", "#6df7ff");
    const tableCellColor = useColorModeValue("#1e1030", "#ebe4f8");
    const blockquoteBg = useColorModeValue("rgba(14, 165, 233, 0.07)", "rgba(94, 234, 255, 0.07)");
    const listBullet = useColorModeValue("#db2777", "#ff5ce8");
    const warn = useColorModeValue("#dc2626", "#ff5577");

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
        tagNeutral: {
            bg: useColorModeValue("rgba(124, 58, 237, 0.1)", "rgba(155, 138, 184, 0.16)"),
            color: useColorModeValue("#5b21b6", "#d4c4f0"),
            border: useColorModeValue("rgba(124, 58, 237, 0.28)", "rgba(155, 138, 184, 0.4)"),
        },
        tagGreen: {
            bg: useColorModeValue("rgba(5, 150, 105, 0.1)", "rgba(0, 255, 148, 0.1)"),
            color: useColorModeValue("#047857", "#5dffb8"),
            border: useColorModeValue("rgba(5, 150, 105, 0.3)", "rgba(0, 255, 148, 0.38)"),
        },
        tagRed: {
            bg: useColorModeValue("rgba(219, 39, 119, 0.1)", "rgba(255, 78, 205, 0.12)"),
            color: useColorModeValue("#be185d", "#ff7ae0"),
            border: useColorModeValue("rgba(219, 39, 119, 0.28)", "rgba(255, 78, 205, 0.42)"),
        },
        tagAccent: {
            bg: useColorModeValue("rgba(14, 165, 233, 0.09)", "rgba(94, 234, 255, 0.1)"),
            color: useColorModeValue("#0369a1", "#6df7ff"),
            border: useColorModeValue("rgba(14, 165, 233, 0.28)", "rgba(94, 234, 255, 0.38)"),
        },
        tagBlue: {
            bg: useColorModeValue("rgba(59, 130, 246, 0.1)", "rgba(120, 140, 255, 0.12)"),
            color: useColorModeValue("#1d4ed8", "#9ecbff"),
            border: useColorModeValue("rgba(59, 130, 246, 0.28)", "rgba(120, 180, 255, 0.38)"),
        },
    };
}

function useVegasTokens(): ThemeTokens {
    const title = useColorModeValue("#be185d", "#ff4da6");
    const panelHeading = useColorModeValue("#b45309", "#f5c451");
    const panelBody = useColorModeValue("#2a1008", "#ffe8d4");
    const panelLabel = useColorModeValue("#c2410c", "#ff8c42");
    const panelMuted = useColorModeValue("#9a6b52", "#c49a7a");
    const panelBg = useColorModeValue("rgba(255, 250, 244, 0.88)", "rgba(28, 10, 18, 0.92)");
    const panelBgUser = useColorModeValue("rgba(255, 246, 235, 0.94)", "rgba(36, 14, 22, 0.94)");
    const panelBorder = useColorModeValue("rgba(225, 29, 116, 0.22)", "rgba(255, 77, 166, 0.32)");
    const inlineStrong = useColorModeValue("#1a0806", "#fff5eb");
    const inlineEm = useColorModeValue("#b45309", "#f5c451");
    const inlineCode = useColorModeValue("#be185d", "#ff8c9e");
    const tableHeaderBg = useColorModeValue("rgba(217, 119, 6, 0.09)", "rgba(245, 196, 81, 0.12)");
    const tableHeaderColor = useColorModeValue("#b45309", "#f5c451");
    const tableCellColor = useColorModeValue("#2a1008", "#ffe8d4");
    const blockquoteBg = useColorModeValue("rgba(225, 29, 116, 0.07)", "rgba(255, 77, 166, 0.08)");
    const listBullet = useColorModeValue("#e11d74", "#ff4da6");
    const warn = useColorModeValue("#dc2626", "#f87171");

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
        tagNeutral: {
            bg: useColorModeValue("rgba(180, 83, 9, 0.1)", "rgba(245, 196, 81, 0.1)"),
            color: useColorModeValue("#92400e", "#fcd34d"),
            border: useColorModeValue("rgba(180, 83, 9, 0.28)", "rgba(245, 196, 81, 0.32)"),
        },
        tagGreen: {
            bg: useColorModeValue("rgba(5, 150, 105, 0.1)", "rgba(52, 211, 153, 0.1)"),
            color: useColorModeValue("#047857", "#6ee7b7"),
            border: useColorModeValue("rgba(5, 150, 105, 0.3)", "rgba(52, 211, 153, 0.35)"),
        },
        tagRed: {
            bg: useColorModeValue("rgba(220, 38, 38, 0.1)", "rgba(248, 113, 113, 0.12)"),
            color: useColorModeValue("#b91c1c", "#fca5a5"),
            border: useColorModeValue("rgba(220, 38, 38, 0.28)", "rgba(248, 113, 113, 0.38)"),
        },
        tagAccent: {
            bg: useColorModeValue("rgba(225, 29, 116, 0.09)", "rgba(255, 77, 166, 0.1)"),
            color: useColorModeValue("#be185d", "#ff8c9e"),
            border: useColorModeValue("rgba(225, 29, 116, 0.28)", "rgba(255, 77, 166, 0.36)"),
        },
        tagBlue: {
            bg: useColorModeValue("rgba(59, 130, 246, 0.08)", "rgba(96, 165, 250, 0.1)"),
            color: useColorModeValue("#1d4ed8", "#93c5fd"),
            border: useColorModeValue("rgba(59, 130, 246, 0.25)", "rgba(96, 165, 250, 0.32)"),
        },
    };
}

function useHackerTokens(): ThemeTokens {
    const title = useColorModeValue("#15803d", "#4ade80");
    const panelHeading = useColorModeValue("#be185d", "#f472b6");
    const panelBody = useColorModeValue("#052e16", "#d1fae5");
    const panelLabel = useColorModeValue("#db2777", "#f9a8d4");
    const panelMuted = useColorModeValue("#4d7c62", "#6b9e82");
    const panelBg = useColorModeValue("rgba(240, 253, 246, 0.88)", "rgba(6, 18, 10, 0.92)");
    const panelBgUser = useColorModeValue("rgba(236, 253, 245, 0.94)", "rgba(8, 24, 14, 0.94)");
    const panelBorder = useColorModeValue("rgba(22, 163, 74, 0.22)", "rgba(74, 222, 128, 0.3)");
    const inlineStrong = useColorModeValue("#022c15", "#ecfdf5");
    const inlineEm = useColorModeValue("#be185d", "#f472b6");
    const inlineCode = useColorModeValue("#15803d", "#86efac");
    const tableHeaderBg = useColorModeValue("rgba(22, 163, 74, 0.08)", "rgba(74, 222, 128, 0.12)");
    const tableHeaderColor = useColorModeValue("#15803d", "#4ade80");
    const tableCellColor = useColorModeValue("#052e16", "#d1fae5");
    const blockquoteBg = useColorModeValue("rgba(219, 39, 119, 0.06)", "rgba(244, 114, 182, 0.08)");
    const listBullet = useColorModeValue("#db2777", "#f472b6");
    const warn = useColorModeValue("#dc2626", "#fb7185");

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
        tagNeutral: {
            bg: useColorModeValue("rgba(22, 163, 74, 0.1)", "rgba(74, 222, 128, 0.1)"),
            color: useColorModeValue("#166534", "#86efac"),
            border: useColorModeValue("rgba(22, 163, 74, 0.28)", "rgba(74, 222, 128, 0.32)"),
        },
        tagGreen: {
            bg: useColorModeValue("rgba(5, 150, 105, 0.1)", "rgba(52, 211, 153, 0.12)"),
            color: useColorModeValue("#047857", "#6ee7b7"),
            border: useColorModeValue("rgba(5, 150, 105, 0.3)", "rgba(52, 211, 153, 0.38)"),
        },
        tagRed: {
            bg: useColorModeValue("rgba(219, 39, 119, 0.1)", "rgba(244, 114, 182, 0.12)"),
            color: useColorModeValue("#be185d", "#f9a8d4"),
            border: useColorModeValue("rgba(219, 39, 119, 0.28)", "rgba(244, 114, 182, 0.38)"),
        },
        tagAccent: {
            bg: useColorModeValue("rgba(219, 39, 119, 0.09)", "rgba(244, 114, 182, 0.1)"),
            color: useColorModeValue("#be185d", "#f9a8d4"),
            border: useColorModeValue("rgba(219, 39, 119, 0.28)", "rgba(244, 114, 182, 0.36)"),
        },
        tagBlue: {
            bg: useColorModeValue("rgba(14, 165, 233, 0.08)", "rgba(34, 211, 238, 0.1)"),
            color: useColorModeValue("#0369a1", "#67e8f9"),
            border: useColorModeValue("rgba(14, 165, 233, 0.25)", "rgba(34, 211, 238, 0.32)"),
        },
    };
}

export function useThemeTokens(_palette?: ThemeColor): ThemeTokens {
    const { skin } = useThemeSkin();
    const tokyo = useTokyoTokens();
    const vegas = useVegasTokens();
    const hacker = useHackerTokens();
    if (skin === "vegas") return vegas;
    if (skin === "hacker") return hacker;
    return tokyo;
}

type ThemeColorContextValue = {
    palette: ThemeColor;
};

const ThemeColorContext = React.createContext<ThemeColorContextValue | null>(null);

export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
    const { skin } = useThemeSkin();
    const palette: ThemeColor =
        skin === "vegas" ? "orange" : skin === "hacker" ? "green" : "pink";
    const value = React.useMemo(() => ({ palette }), [palette]);

    return (
        <ThemeColorContext.Provider value={value}>
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
