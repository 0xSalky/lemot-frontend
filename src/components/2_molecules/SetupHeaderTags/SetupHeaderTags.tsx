"use client";

import type { ThemeTokens } from "@/components/ui/theme-color";
import {
  adxRegimeShort,
  formatVolDollar,
  scannerSymbolToBase,
} from "@/services/scannerUtils";
import type { ScannerSetupRow } from "@/types/scannerTypes";
import { Badge, Flex, Text } from "@chakra-ui/react";

type SetupHeaderTagsProps = {
  setup: ScannerSetupRow;
  tokens: ThemeTokens;
};

function biasPalette(bias: string): string {
  const b = bias.toUpperCase();
  if (b === "BULLISH") return "green";
  if (b === "BEARISH") return "red";
  return "gray";
}

function signalPalette(signal: string | null | undefined): string {
  const s = (signal ?? "").toUpperCase();
  if (s === "IN_RANGE") return "yellow";
  if (s === "OUT_OF_RANGE") return "gray";
  return "gray";
}

function signalLabel(signal: string | null | undefined): string | null {
  const s = (signal ?? "").toUpperCase();
  if (s === "IN_RANGE") return "IN RANGE";
  if (s === "OUT_OF_RANGE") return "OUT OF RANGE";
  return signal ?? null;
}

function adxPalette(regime: string): string {
  const r = regime.toUpperCase();
  if (r.includes("STRONG")) return "orange";
  if (r.includes("TREND")) return "blue";
  return "gray";
}

function volPalette(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) return "gray";
  if (score >= 7) return "orange";
  if (score >= 3) return "blue";
  return "gray";
}

export default function SetupHeaderTags({ setup, tokens }: SetupHeaderTagsProps) {
  const base = scannerSymbolToBase(setup.symbol);
  const signal = signalLabel(setup.signal);
  const vol =
    setup.vol_score == null || Number.isNaN(Number(setup.vol_score))
      ? null
      : Math.max(0, Math.min(10, Math.round(Number(setup.vol_score))));

  return (
    <Flex
      gap="2"
      flexWrap="wrap"
      align="center"
      px="3"
      py="2"
      mx="-3"
      mt="-3"
      borderBottomWidth="1px"
      borderColor={tokens.panelBorder}
    >
      <Text fontFamily="mono" fontSize="sm" fontWeight="semibold" color={tokens.panelHeading} mr="1">
        #{setup.rank} · {base}
      </Text>
      <Badge colorPalette="blue" variant="subtle" fontFamily="mono" fontSize="2xs">
        score {setup.score.toFixed(1)}
      </Badge>
      <Badge colorPalette={biasPalette(setup.bias)} variant="solid" fontFamily="mono" fontSize="2xs">
        {setup.bias.toUpperCase()}
      </Badge>
      {signal ? (
        <Badge colorPalette={signalPalette(setup.signal)} variant="subtle" fontFamily="mono" fontSize="2xs">
          {signal}
        </Badge>
      ) : null}
      <Badge colorPalette={adxPalette(setup.adx_regime)} variant="outline" fontFamily="mono" fontSize="2xs">
        ADX {setup.adx.toFixed(1)} {adxRegimeShort(setup.adx_regime)}
      </Badge>
      {vol != null ? (
        <Badge colorPalette={volPalette(vol)} variant="outline" fontFamily="mono" fontSize="2xs">
          VOL {vol}/10
        </Badge>
      ) : null}
      <Badge colorPalette="gray" variant="outline" fontFamily="mono" fontSize="2xs">
        24h {formatVolDollar(setup.quote_volume_24h)}
      </Badge>
    </Flex>
  );
}
