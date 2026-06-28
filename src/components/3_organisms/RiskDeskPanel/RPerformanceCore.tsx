"use client";

import type { ThemeTokens } from "@/components/ui/theme-color";
import type { RiskDeskPayload, RiskDeskPosition } from "@/types/riskDeskTypes";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useMemo } from "react";

const breathe = keyframes`
  0%, 100% { opacity: 0.35; filter: blur(0px); }
  50% { opacity: 0.9; filter: blur(1px); }
`;

const corePulse = keyframes`
  0%, 100% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 24px currentColor, 0 0 48px currentColor; }
  50% { transform: translate(-50%, -50%) scale(1.12); box-shadow: 0 0 36px currentColor, 0 0 72px currentColor; }
`;

const drift = keyframes`
  0%, 100% { transform: translateY(0); opacity: 0.25; }
  50% { transform: translateY(-3px); opacity: 0.7; }
`;

const rotateSlow = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const flicker = keyframes`
  0%, 92%, 100% { opacity: 1; }
  93% { opacity: 0.4; }
  94% { opacity: 1; }
  96% { opacity: 0.6; }
`;

function formatR(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}R`;
}

function formatUsd(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}$${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function computeExposure(positions: RiskDeskPosition[]) {
  const legs = positions.filter((p) => p.r_multiple != null && Number.isFinite(p.r_multiple));
  const rs = legs.map((p) => p.r_multiple as number);
  const totalR = rs.reduce((sum, r) => sum + r, 0);
  const minR = rs.length ? Math.min(...rs) : 0;
  const maxR = rs.length ? Math.max(...rs) : 0;
  const totalUsd = positions.reduce((sum, p) => sum + (p.unrealized_pnl_usd ?? 0), 0);
  return { legs, rs, totalR, minR, maxR, totalUsd };
}

function scaleRange(totalR: number, minR: number, maxR: number, legCount: number) {
  const extent = Math.max(Math.abs(minR), Math.abs(maxR), Math.abs(totalR), legCount > 0 ? 0.5 : 1);
  const bound = Math.max(1, Math.ceil((extent + 0.35) * 2) / 2);
  return { min: -bound, max: bound };
}

function toPct(value: number, min: number, max: number): number {
  const span = max - min;
  if (span <= 0) return 50;
  return Math.min(100, Math.max(0, ((value - min) / span) * 100));
}

export default function RPerformanceCore({
  desk,
  tokens,
}: {
  desk: RiskDeskPayload;
  tokens: ThemeTokens;
}) {
  const exposure = useMemo(() => computeExposure(desk.positions), [desk.positions]);
  const range = useMemo(
    () => scaleRange(exposure.totalR, exposure.minR, exposure.maxR, exposure.legs.length),
    [exposure],
  );

  const win = exposure.totalR > 0;
  const loss = exposure.totalR < 0;
  const neutral = exposure.totalR === 0;
  const accent = win ? tokens.tagGreen.color : loss ? tokens.tagRed.color : tokens.tagAccent.color;
  const alien = tokens.tagAccent.color;
  const zeroPct = toPct(0, range.min, range.max);
  const totalPct = toPct(exposure.totalR, range.min, range.max);
  const beamLeft = Math.min(zeroPct, totalPct);
  const beamWidth = Math.abs(totalPct - zeroPct);

  const tickStep = range.max <= 1.5 ? 0.25 : range.max <= 3 ? 0.5 : 1;
  const ticks: number[] = [];
  for (let v = range.min; v <= range.max + 0.001; v += tickStep) {
    ticks.push(Math.round(v * 100) / 100);
  }

  return (
    <Box
      position="relative"
      overflow="hidden"
      borderWidth="1px"
      borderColor={accent}
      bg={`linear-gradient(180deg, ${tokens.blockquoteBg} 0%, ${tokens.panelBg} 45%, ${tokens.blockquoteBg} 100%)`}
      boxShadow={`0 0 40px ${accent}33, inset 0 0 60px ${alien}11`}
      py={{ base: 5, md: 6 }}
      px={{ base: 4, md: 5 }}
    >
      <Box
        position="absolute"
        inset="0"
        pointerEvents="none"
        opacity={0.12}
        backgroundImage={`
          linear-gradient(${alien}22 1px, transparent 1px),
          linear-gradient(90deg, ${alien}22 1px, transparent 1px)
        `}
        backgroundSize="18px 18px"
      />
      <Box
        position="absolute"
        top="50%"
        left="50%"
        w="140%"
        h="140%"
        transform="translate(-50%, -50%)"
        borderWidth="1px"
        borderColor={`${alien}44`}
        borderStyle="dashed"
        rounded="full"
        animation={`${rotateSlow} 48s linear infinite`}
        pointerEvents="none"
      />

      <Stack gap="4" position="relative" zIndex={1}>
        <Flex justify="space-between" align="flex-start" flexWrap="wrap" gap="3">
          <Stack gap="1">
            <Text
              fontFamily="mono"
              fontSize="2xs"
              color={alien}
              letterSpacing="0.28em"
              textTransform="uppercase"
              animation={`${flicker} 5s step-end infinite`}
            >
              ◈ ΣR performance field
            </Text>
            <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} letterSpacing="0.14em">
              open book · {exposure.legs.length} node{exposure.legs.length === 1 ? "" : "s"} · 1R ={" "}
              {desk.risk_percent}% equity
            </Text>
          </Stack>
          <Stack align="flex-end" gap="0">
            <Text
              fontFamily="mono"
              fontSize={{ base: "3xl", md: "4xl" }}
              fontWeight="bold"
              color={accent}
              letterSpacing="0.06em"
              lineHeight="1"
              textShadow={`0 0 20px ${accent}, 0 0 40px ${accent}88`}
              animation={`${flicker} 7s step-end infinite`}
            >
              {formatR(exposure.totalR)}
            </Text>
            <Text fontFamily="mono" fontSize="sm" color={tokens.panelBody}>
              {formatUsd(exposure.totalUsd)} unrealized
            </Text>
          </Stack>
        </Flex>

        <Box position="relative" h={{ base: "4.5rem", md: "5.5rem" }} px="1">
          <Box
            position="absolute"
            left={`${zeroPct}%`}
            top="0"
            bottom="0"
            w="2px"
            bg={tokens.panelHeading}
            transform="translateX(-50%)"
            boxShadow={`0 0 12px ${tokens.panelHeading}`}
            zIndex={2}
          />
          <Text
            position="absolute"
            left={`${zeroPct}%`}
            bottom="-1px"
            transform="translateX(-50%)"
            fontFamily="mono"
            fontSize="2xs"
            color={tokens.panelMuted}
            letterSpacing="0.1em"
          >
            0R
          </Text>

          {beamWidth > 0.5 ? (
            <Box
              position="absolute"
              top="50%"
              left={`${beamLeft}%`}
              w={`${beamWidth}%`}
              h="14px"
              transform="translateY(-50%)"
              borderRadius="full"
              bg={`linear-gradient(90deg, ${loss ? tokens.tagRed.color : accent}88, ${accent}, ${win ? tokens.tagGreen.color : accent}88)`}
              boxShadow={`0 0 16px ${accent}, 0 0 32px ${accent}66`}
              animation={`${breathe} 2.8s ease-in-out infinite`}
            />
          ) : null}

          {exposure.legs.map((leg, index) => {
            const r = leg.r_multiple as number;
            const pct = toPct(r, range.min, range.max);
            const legColor =
              r > 0 ? tokens.tagGreen.color : r < 0 ? tokens.tagRed.color : tokens.panelMuted;
            return (
              <Box
                key={`${leg.symbol}-${index}`}
                position="absolute"
                left={`${pct}%`}
                top="50%"
                transform="translate(-50%, -50%)"
                zIndex={3}
                animation={`${drift} ${2.2 + index * 0.4}s ease-in-out infinite`}
              >
                <Box
                  w="11px"
                  h="11px"
                  rounded="full"
                  borderWidth="2px"
                  borderColor={legColor}
                  bg={tokens.panelBg}
                  boxShadow={`0 0 10px ${legColor}`}
                />
                <Text
                  position="absolute"
                  top="-1.35rem"
                  left="50%"
                  transform="translateX(-50%)"
                  fontFamily="mono"
                  fontSize="0.55rem"
                  color={legColor}
                  letterSpacing="0.08em"
                  whiteSpace="nowrap"
                >
                  {leg.symbol}
                </Text>
                <Text
                  position="absolute"
                  bottom="-1.2rem"
                  left="50%"
                  transform="translateX(-50%)"
                  fontFamily="mono"
                  fontSize="0.5rem"
                  color={tokens.panelMuted}
                  whiteSpace="nowrap"
                >
                  {formatR(r)}
                </Text>
              </Box>
            );
          })}

          <Box
            position="absolute"
            left={`${totalPct}%`}
            top="50%"
            w="18px"
            h="18px"
            rounded="full"
            bg={accent}
            color={accent}
            transform="translate(-50%, -50%)"
            zIndex={4}
            animation={`${corePulse} 2s ease-in-out infinite`}
          />
        </Box>

        <Flex justify="space-between" fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} px="1">
          <Text>{formatR(range.min)}</Text>
          <Text color={neutral ? tokens.panelMuted : accent}>
            {win ? "▲ ACCUMULATING" : loss ? "▼ BLEEDING" : "◎ PHASE NEUTRAL"}
          </Text>
          <Text>{formatR(range.max)}</Text>
        </Flex>

        <Flex
          justify="space-between"
          fontFamily="mono"
          fontSize="0.5rem"
          color={`${alien}99`}
          letterSpacing="0.06em"
          px="1"
          flexWrap="wrap"
          gap="1"
        >
          {ticks.map((tick) => (
            <Box key={tick} flex="1" textAlign="center" minW="1.5rem" opacity={tick === 0 ? 1 : 0.55}>
              {tick > 0 ? `+${tick}` : tick}
            </Box>
          ))}
        </Flex>
      </Stack>
    </Box>
  );
}
