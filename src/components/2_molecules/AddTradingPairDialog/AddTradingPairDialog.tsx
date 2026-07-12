"use client";

import { useThemeColor, useThemeTokens } from "@/components/ui/theme-color";
import { themedPanelStyle } from "@/components/ui/themed-panel";
import { normalizeTradingPairSymbol } from "@/services/tradingPairs";
import { Box, Button, Flex, Input, Portal, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";

type AddTradingPairDialogProps = {
  open: boolean;
  existingPairs: readonly string[];
  onAdd: (symbol: string) => void;
  onClose: () => void;
};

export default function AddTradingPairDialog({
  open,
  existingPairs,
  onAdd,
  onClose,
}: AddTradingPairDialogProps) {
  const { palette } = useThemeColor();
  const tokens = useThemeTokens(palette);
  const [symbol, setSymbol] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleAdd = () => {
    const normalized = normalizeTradingPairSymbol(symbol);
    if (!normalized) {
      setError("Enter a valid symbol (e.g. BTC or SOLUSDT).");
      return;
    }
    if (existingPairs.includes(normalized)) {
      setError(`${normalized} is already in your pairs list.`);
      return;
    }
    onAdd(normalized);
    onClose();
  };

  return (
    <Portal>
      <Box
        position="fixed"
        inset="0"
        bg="blackAlpha.700"
        zIndex={1500}
        onClick={onClose}
        aria-hidden
      />
      <Flex
        position="fixed"
        inset="0"
        zIndex={1501}
        align="center"
        justify="center"
        p="4"
        pointerEvents="none"
      >
        <Box
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-pair-dialog-title"
          pointerEvents="auto"
          w="full"
          maxW="20rem"
          p="4"
          rounded="md"
          onClick={(event) => event.stopPropagation()}
          {...themedPanelStyle(tokens)}
        >
          <Stack gap="4">
            <Stack gap="2">
              <Text
                id="add-pair-dialog-title"
                fontFamily="mono"
                fontSize="sm"
                fontWeight="bold"
                color={tokens.title}
              >
                Add trading pair
              </Text>
              <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
                Base symbol or USDT pair (e.g. TAO, ZECUSDT).
              </Text>
            </Stack>
            <Input
              value={symbol}
              onChange={(event) => {
                setSymbol(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleAdd();
              }}
              placeholder="Symbol"
              size="sm"
              fontFamily="mono"
              fontSize="xs"
              autoFocus
            />
            {error ? (
              <Text fontFamily="mono" fontSize="2xs" color="red.400">
                {error}
              </Text>
            ) : null}
            <Flex gap="2" justify="flex-end">
              <Button
                size="sm"
                variant="ghost"
                fontFamily="mono"
                color={tokens.panelMuted}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="solid"
                colorPalette={palette}
                fontFamily="mono"
                onClick={handleAdd}
              >
                Add
              </Button>
            </Flex>
          </Stack>
        </Box>
      </Flex>
    </Portal>
  );
}
