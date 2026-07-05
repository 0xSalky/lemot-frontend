"use client";

import type { ThemeTokens } from "@/components/ui/theme-color";
import { Box, Text } from "@chakra-ui/react";

export type ProfileKey = "a" | "b" | string | null | undefined;

export function profileTone(
  profile: ProfileKey,
  tokens: ThemeTokens,
): { bg: string; color: string; border: string; label: string } {
  const key = String(profile ?? "").trim().toLowerCase();
  if (key === "a") {
    return {
      ...tokens.tagAccent,
      label: "A",
    };
  }
  if (key === "b") {
    return {
      bg: tokens.tagBlue.bg,
      color: tokens.panelHeading,
      border: tokens.tagBlue.border,
      label: "B",
    };
  }
  return {
    ...tokens.tagNeutral,
    label: key ? key.toUpperCase() : "—",
  };
}

export function ProfileBadge({
  profile,
  tokens,
  size = "sm",
}: {
  profile: ProfileKey;
  tokens: ThemeTokens;
  size?: "sm" | "xs";
}) {
  const tone = profileTone(profile, tokens);
  return (
    <Box
      as="span"
      display="inline-block"
      px={size === "xs" ? "1" : "1.5"}
      py="0.5"
      fontFamily="mono"
      fontSize="2xs"
      fontWeight="bold"
      letterSpacing="0.12em"
      borderWidth="1px"
      borderColor={tone.border}
      bg={tone.bg}
      color={tone.color}
      rounded="sm"
      boxShadow={`0 0 8px ${tone.color}33`}
    >
      {tone.label}
    </Box>
  );
}

export function ProfileLetter({
  profile,
  tokens,
  size = "sm",
}: {
  profile: ProfileKey;
  tokens: ThemeTokens;
  size?: "sm" | "xs";
}) {
  const tone = profileTone(profile, tokens);
  return (
    <Text
      fontFamily="mono"
      fontSize={size === "xs" ? "xs" : "sm"}
      fontWeight="bold"
      letterSpacing="0.08em"
      color={tone.color}
      lineHeight="1"
      textShadow={`0 0 10px ${tone.color}44`}
    >
      {tone.label}
    </Text>
  );
}

export function PairLabel({
  profile,
  base,
  tokens,
  size = "sm",
}: {
  profile: ProfileKey;
  base: string;
  tokens: ThemeTokens;
  size?: "sm" | "xs";
}) {
  const tone = profileTone(profile, tokens);
  return (
    <Text
      fontFamily="mono"
      fontSize={size === "xs" ? "xs" : "sm"}
      fontWeight="bold"
      letterSpacing="0.04em"
      lineHeight="1.2"
      whiteSpace="nowrap"
    >
      <Box as="span" color={tone.color} mr="1.5">
        {tone.label}
      </Box>
      <Box as="span" color={tokens.title}>
        {base}
      </Box>
    </Text>
  );
}
