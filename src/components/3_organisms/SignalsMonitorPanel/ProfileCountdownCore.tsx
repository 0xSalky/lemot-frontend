"use client";

import type { ThemeTokens } from "@/components/ui/theme-color";
import type { SignalsProfileHealth } from "@/types/signalsMonitorTypes";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";

const TF_SECONDS: Record<string, number> = {
  "30m": 1800,
  "1h": 3600,
};

const flicker = keyframes`
  0%, 94%, 100% { opacity: 1; }
  95% { opacity: 0.5; }
  96% { opacity: 1; }
`;

const digitPulse = keyframes`
  0%, 100% { text-shadow: 0 0 12px currentColor; }
  50% { text-shadow: 0 0 22px currentColor, 0 0 36px currentColor; }
`;

function formatCountdown(totalSec: number): string {
  const sec = Math.max(0, totalSec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function barCycleProgress(profile: SignalsProfileHealth, countdownSec: number): number {
  const total = TF_SECONDS[profile.timeframe] ?? 1800;
  const remaining = Math.max(0, countdownSec);
  return Math.min(1, Math.max(0, 1 - remaining / total));
}

function profileAccent(tokens: ThemeTokens, profileKey: string): string {
  return profileKey === "b" ? tokens.tagBlue.color : tokens.tagAccent.color;
}

function CountdownDigits({ value, accent }: { value: string; accent: string }) {
  const parts = value.split(":");
  return (
    <Flex align="center" gap="1" fontFamily="mono" fontVariantNumeric="tabular-nums">
      {parts.map((part, index) => (
        <Flex key={`${part}-${index}`} align="center" gap="1">
          {index > 0 ? (
            <Text fontSize="xl" color={accent} opacity={0.7} lineHeight="1" animation={`${flicker} 4s step-end infinite`}>
              :
            </Text>
          ) : null}
          <Box
            px="2"
            py="1"
            borderWidth="1px"
            borderColor={`${accent}66`}
            bg={`${accent}11`}
            rounded="sm"
            boxShadow={`0 0 12px ${accent}33`}
          >
            <Text
              fontSize="2xl"
              fontWeight="bold"
              color={accent}
              letterSpacing="0.08em"
              lineHeight="1"
              animation={`${digitPulse} 2.4s ease-in-out infinite`}
            >
              {part}
            </Text>
          </Box>
        </Flex>
      ))}
    </Flex>
  );
}

function CycleStrip({ progress, accent, tokens }: { progress: number; accent: string; tokens: ThemeTokens }) {
  const segments = 24;
  const filled = Math.round(progress * segments);
  return (
    <Flex gap="2px" w="100%" h="4px" rounded="full" overflow="hidden" bg={tokens.blockquoteBg}>
      {Array.from({ length: segments }).map((_, index) => {
        const active = index < filled;
        return (
          <Box
            key={`seg-${index}`}
            flex="1"
            bg={active ? accent : tokens.panelBorder}
            opacity={active ? 0.95 : 0.35}
            boxShadow={active && index === filled - 1 ? `0 0 8px ${accent}` : undefined}
          />
        );
      })}
    </Flex>
  );
}

export default function ProfileCountdownCore({
  profileKey,
  profile,
  countdownSec,
  tokens,
}: {
  profileKey: string;
  profile: SignalsProfileHealth;
  countdownSec: number;
  tokens: ThemeTokens;
}) {
  const accent = profileAccent(tokens, profileKey);
  const alien = tokens.tagAccent.color;
  const progress = barCycleProgress(profile, countdownSec);
  const countdown = formatCountdown(countdownSec);
  const urgent = countdownSec <= 60;

  return (
    <Box
      flex="1"
      minW={{ base: "100%", md: "15rem" }}
      position="relative"
      overflow="hidden"
      borderWidth="1px"
      borderColor={urgent ? tokens.warn : accent}
      bg={`linear-gradient(180deg, ${tokens.blockquoteBg} 0%, ${tokens.panelBg} 100%)`}
      rounded="sm"
      px="3"
      py="3"
      boxShadow={`0 0 20px ${accent}22`}
    >
      <Box
        position="absolute"
        inset="0"
        pointerEvents="none"
        opacity={0.07}
        backgroundImage={`linear-gradient(${alien}33 1px, transparent 1px), linear-gradient(90deg, ${alien}33 1px, transparent 1px)`}
        backgroundSize="16px 16px"
      />

      <Stack gap="2.5" position="relative" zIndex={1}>
        <Flex justify="space-between" align="center" gap="2" flexWrap="wrap">
          <Text
            fontFamily="mono"
            fontSize="2xs"
            color={alien}
            letterSpacing="0.2em"
            textTransform="uppercase"
          >
            ◇ bar close vector
          </Text>
          <Text fontFamily="mono" fontSize="2xs" color={accent} letterSpacing="0.1em" fontWeight="bold">
            {profileKey.toUpperCase()}
          </Text>
        </Flex>

        <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} letterSpacing="0.08em">
          {profile.timeframe} · {profile.fractal_timing}
        </Text>

        <CountdownDigits value={countdown} accent={urgent ? tokens.warn : accent} />

        <CycleStrip progress={progress} accent={accent} tokens={tokens} />

        <Flex justify="space-between" fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} flexWrap="wrap" gap="2">
          <Text>
            cycle {Math.round(progress * 100)}%
          </Text>
          <Text color={urgent ? tokens.warn : tokens.panelMuted}>
            {urgent ? "◆ imminent close" : "sync live"}
          </Text>
        </Flex>

        <Flex gap="3" flexWrap="wrap" fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
          <Text>watch {profile.symbols_watched}</Text>
          <Text>near band {profile.near_band_count}</Text>
          <Text>last bar {formatTime(profile.last_bar_processed_at)}</Text>
        </Flex>
      </Stack>
    </Box>
  );
}
