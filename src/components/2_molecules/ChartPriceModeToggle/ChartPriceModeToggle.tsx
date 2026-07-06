"use client";

import type { ChartPriceMode } from "@/utils/chartOhlc";
import type { ThemeTokens } from "@/components/ui/theme-color";
import { Box, Flex, Text } from "@chakra-ui/react";

type ChartPriceModeToggleProps = {
  mode: ChartPriceMode;
  onChange: (mode: ChartPriceMode) => void;
  tokens: ThemeTokens;
};

function ModeButton({
  label,
  active,
  onClick,
  tokens,
  title,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tokens: ThemeTokens;
  title: string;
}) {
  return (
    <Box
      as="button"
      aria-label={title}
      aria-pressed={active}
      title={title}
      display="flex"
      alignItems="center"
      justifyContent="center"
      fontFamily="mono"
      fontSize="9px"
      lineHeight="1"
      w="1.5rem"
      h="1.5rem"
      minW="1.5rem"
      bg={active ? tokens.panelBg : tokens.panelBgUser}
      borderWidth="1px"
      borderColor={active ? tokens.panelHeading : tokens.panelBorder}
      color={active ? tokens.panelHeading : tokens.panelMuted}
      rounded="sm"
      cursor="pointer"
      onClick={onClick}
      _hover={{ bg: tokens.panelBg }}
    >
      {label}
    </Box>
  );
}

export default function ChartPriceModeToggle({
  mode,
  onChange,
  tokens,
}: ChartPriceModeToggleProps) {
  return (
    <Flex align="center" gap="1">
      <ModeButton
        label="▮"
        active={mode === "candle"}
        onClick={() => onChange("candle")}
        tokens={tokens}
        title="Candle chart"
      />
      <ModeButton
        label="／"
        active={mode === "line"}
        onClick={() => onChange("line")}
        tokens={tokens}
        title="Line chart"
      />
      <Text
        fontFamily="mono"
        fontSize="9px"
        color={tokens.panelMuted}
        display={{ base: "none", sm: "block" }}
      >
        {mode === "candle" ? "candle" : "line"}
      </Text>
    </Flex>
  );
}
