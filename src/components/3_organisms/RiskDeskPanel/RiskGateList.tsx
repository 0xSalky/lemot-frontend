"use client";

import type { ThemeTokens } from "@/components/ui/theme-color";
import type { RiskGate, RiskGateStatus, RiskModeInfo } from "@/types/riskDeskTypes";
import { Box, Flex, Grid, Stack, Text } from "@chakra-ui/react";

function gateStatusColor(tokens: ThemeTokens, status: RiskGateStatus): string {
  if (status === "block") return tokens.tagRed.color;
  if (status === "warn") return tokens.warn;
  return tokens.tagGreen.color;
}

function gateStatusLabel(status: RiskGateStatus): string {
  if (status === "block") return "BLOCK";
  if (status === "warn") return "WARN";
  return "OK";
}

export function RiskModeBanner({
  mode,
  tokens,
}: {
  mode: RiskModeInfo | null | undefined;
  tokens: ThemeTokens;
}) {
  if (!mode) return null;
  const strict = mode.risk_desk_strict;
  const accent = strict ? tokens.tagAccent.color : tokens.tagBlue.color;

  return (
    <Box
      borderWidth="1px"
      borderColor={accent}
      bg={tokens.blockquoteBg}
      rounded="md"
      px="4"
      py="3"
    >
      <Flex align="flex-start" justify="space-between" gap="3" flexWrap="wrap">
        <Stack gap="1" flex="1" minW="0">
          <Text
            fontFamily="mono"
            fontSize="xs"
            fontWeight="bold"
            color={accent}
            letterSpacing="0.12em"
          >
            RISK MODE · {mode.label.toUpperCase()}
          </Text>
          <Text fontFamily="mono" fontSize="2xs" color={tokens.panelBody} lineHeight="1.5">
            {mode.summary}
          </Text>
        </Stack>
        <Box
          px="2"
          py="1"
          borderWidth="1px"
          borderColor={accent}
          rounded="sm"
          fontFamily="mono"
          fontSize="2xs"
          color={accent}
          whiteSpace="nowrap"
        >
          {strict ? "HEDGE ON" : "HEDGE OFF"}
        </Box>
      </Flex>
    </Box>
  );
}

export function RiskGateList({
  gates,
  tokens,
  compact = false,
}: {
  gates: RiskGate[];
  tokens: ThemeTokens;
  compact?: boolean;
}) {
  if (!gates.length) return null;

  return (
    <Stack gap={compact ? "1" : "2"}>
      {gates.map((gate) => {
        const color = gateStatusColor(tokens, gate.status);
        return (
          <Grid
            key={gate.id}
            templateColumns={{ base: "4.5rem 1fr", md: compact ? "5rem 1fr" : "5rem 10rem 1fr" }}
            gap="2"
            alignItems="start"
            px="2"
            py={compact ? "1.5" : "2"}
            borderLeftWidth="2px"
            borderLeftColor={color}
            rounded="sm"
          >
            <Text fontFamily="mono" fontSize="2xs" fontWeight="bold" color={color}>
              {gateStatusLabel(gate.status)}
            </Text>
            {!compact ? (
              <Text fontFamily="mono" fontSize="2xs" color={tokens.panelLabel}>
                {gate.label}
              </Text>
            ) : null}
            <Text
              fontFamily="mono"
              fontSize="2xs"
              color={tokens.panelBody}
              lineHeight="1.45"
              gridColumn={{ base: "2", md: compact ? "2" : "3" }}
            >
              {gate.detail}
            </Text>
          </Grid>
        );
      })}
    </Stack>
  );
}
