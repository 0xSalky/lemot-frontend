"use client";

import { Box, type BoxProps } from "@chakra-ui/react";
import type { ThemeTokens } from "./theme-color";

export type ThemedPanelVariant = "default" | "strong";

export type ThemedPanelBg = "user" | "panel";

export function themedPanelStyle(
  tokens: ThemeTokens,
  variant: ThemedPanelVariant = "default",
  bg: ThemedPanelBg = "user",
) {
  return {
    borderWidth: "1px" as const,
    borderColor: tokens.panelBorder,
    bg: bg === "panel" ? tokens.panelBg : tokens.panelBgUser,
    boxShadow: variant === "strong" ? tokens.panelGlowStrong : tokens.panelGlow,
    position: "relative" as const,
    overflow: "hidden" as const,
  };
}

export type ThemedPanelProps = BoxProps & {
  tokens: ThemeTokens;
  variant?: ThemedPanelVariant;
  panelBg?: ThemedPanelBg;
};

export function ThemedPanel({
  tokens,
  variant = "default",
  panelBg = "user",
  children,
  ...rest
}: ThemedPanelProps) {
  return (
    <Box {...themedPanelStyle(tokens, variant, panelBg)} {...rest}>
      {children}
    </Box>
  );
}
