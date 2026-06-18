"use client";

import { useThemeColor } from "@/components/ui/theme-color";
import { Tabs } from "@chakra-ui/react";
import type { ReactNode } from "react";

type ThemeTabTriggerProps = {
    value: string;
    children: ReactNode;
};

const ThemeTabTrigger = ({ value, children }: ThemeTabTriggerProps) => {
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
            _selected={{
                bg: "colorPalette.solid",
                color: "colorPalette.contrast",
            }}
        >
            {children}
        </Tabs.Trigger>
    );
};

export default ThemeTabTrigger;
