"use client";

import { useThemeTokens, useThemeColor, type ThemeTokens } from "@/components/ui/theme-color";
import { Box, Flex } from "@chakra-ui/react";

export type ProfileFilter = "all" | "a" | "b";

const PROFILE_LABELS: Record<ProfileFilter, string> = {
  all: "ALL",
  a: "A",
  b: "B",
};

function Chip({
  label,
  active,
  accentColor,
  tokens,
  onClick,
}: {
  label: string;
  active: boolean;
  accentColor: string;
  tokens: ThemeTokens;
  onClick: () => void;
}) {
  return (
    <Box
      as="button"
      onClick={onClick}
      fontFamily="mono"
      fontSize="2xs"
      fontWeight={active ? "bold" : "normal"}
      letterSpacing="0.1em"
      px="2"
      py="0.5"
      rounded="sm"
      borderWidth="1px"
      borderColor={active ? accentColor : tokens.panelBorder}
      bg={active ? `${accentColor}18` : "transparent"}
      color={active ? accentColor : tokens.panelMuted}
      cursor="pointer"
      transition="all 0.12s ease"
      _hover={{ borderColor: accentColor, color: accentColor }}
      whiteSpace="nowrap"
    >
      {label}
    </Box>
  );
}

type ProfileSubTabsProps = {
  value: ProfileFilter;
  onChange: (v: ProfileFilter) => void;
  /** Optional extra label before the chips (e.g. "profile") */
  label?: string;
};

export default function ProfileSubTabs({ value, onChange, label }: ProfileSubTabsProps) {
  const { palette } = useThemeColor();
  const tokens = useThemeTokens(palette);

  const accentA = tokens.panelLabel;
  const accentB = tokens.tagBlue.color;
  const accentAll = tokens.tagNeutral.color;

  function accent(tab: ProfileFilter) {
    if (tab === "a") return accentA;
    if (tab === "b") return accentB;
    return accentAll;
  }

  return (
    <Flex gap="1.5" align="center" flexShrink={0}>
      {label ? (
        <Box fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} letterSpacing="0.08em" mr="0.5">
          {label}
        </Box>
      ) : null}
      {(["all", "a", "b"] as ProfileFilter[]).map((tab) => (
        <Chip
          key={tab}
          label={PROFILE_LABELS[tab]}
          active={value === tab}
          accentColor={accent(tab)}
          tokens={tokens}
          onClick={() => onChange(tab)}
        />
      ))}
    </Flex>
  );
}
