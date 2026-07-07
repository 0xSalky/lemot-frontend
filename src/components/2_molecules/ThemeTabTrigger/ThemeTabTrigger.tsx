"use client";

import { useThemeColor } from "@/components/ui/theme-color";
import { Tabs } from "@chakra-ui/react";
import type { ReactNode } from "react";

type ThemeTabTriggerProps = {
    value: string;
    children: ReactNode;
    currentTab: string;
    onReselect?: (value: string) => void;
};

const ThemeTabTrigger = ({ value, children, currentTab, onReselect }: ThemeTabTriggerProps) => {
    const { palette } = useThemeColor();

    return (
        <Tabs.Trigger
            value={value}
            fontFamily="mono"
            fontSize="xs"
            px="3"
            py="1.5"
            rounded="md"
            colorPalette={palette}
            borderWidth="1px"
            borderStyle="solid"
            onClick={() => {
                if (currentTab === value) onReselect?.(value);
            }}
        >
            {children}
        </Tabs.Trigger>
    );
};

export default ThemeTabTrigger;
