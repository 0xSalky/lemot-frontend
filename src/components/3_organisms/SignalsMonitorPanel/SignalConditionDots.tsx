"use client";

import { Tooltip } from "@/components/ui/tooltip";
import type { ThemeTokens } from "@/components/ui/theme-color";
import { Box, Flex, Text } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import type { SignalCondition, SignalConditionState } from "./signalConditions";
import { countMetConditions } from "./signalConditions";

const dotPulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.85; }
`;

function stateColor(tokens: ThemeTokens, state: SignalConditionState): string {
  if (state === "met") return tokens.tagGreen.color;
  if (state === "unmet") return tokens.tagRed.color;
  return tokens.panelMuted;
}

function ConditionDot({
  condition,
  tokens,
  pulse,
}: {
  condition: SignalCondition;
  tokens: ThemeTokens;
  pulse?: boolean;
}) {
  const color = stateColor(tokens, condition.state);
  const filled = condition.state === "met";
  const tooltip = (
    <Box fontFamily="mono" fontSize="2xs" lineHeight="1.5" maxW="14rem">
      <Text color={tokens.title} fontWeight="bold" letterSpacing="0.08em">
        {condition.label}
      </Text>
      {condition.detail ? (
        <Text color={tokens.panelBody} mt="1">
          {condition.detail}
        </Text>
      ) : null}
      <Text color={color} mt="1" textTransform="uppercase" letterSpacing="0.1em">
        {condition.state === "met" ? "✓ met" : condition.state === "unmet" ? "✗ not met" : "— unknown"}
      </Text>
    </Box>
  );

  return (
    <Tooltip
      showArrow
      openDelay={150}
      content={
        <Box
          bg={tokens.panelBgUser}
          borderWidth="1px"
          borderColor={tokens.panelBorder}
          rounded="md"
          p="2"
        >
          {tooltip}
        </Box>
      }
      contentProps={{ bg: "transparent", border: "none", p: 0 }}
    >
      <Flex direction="column" align="center" gap="0.5" cursor="help" minW="2.1rem" px="0.5">
        <Box
          w="0.55rem"
          h="0.55rem"
          rounded="full"
          bg={filled ? color : "transparent"}
          borderWidth="2px"
          borderColor={color}
          borderStyle={condition.state === "unknown" ? "dashed" : "solid"}
          boxShadow={filled ? `0 0 10px ${color}` : undefined}
          animation={pulse && filled ? `${dotPulse} 2.4s ease-in-out infinite` : undefined}
          transition="box-shadow 0.2s ease, transform 0.2s ease"
          _hover={{ transform: "scale(1.2)" }}
        />
        <Text
          fontFamily="mono"
          fontSize="0.45rem"
          color={filled ? color : tokens.panelMuted}
          letterSpacing="0.02em"
          lineHeight="1"
          userSelect="none"
          whiteSpace="nowrap"
        >
          {condition.short}
        </Text>
      </Flex>
    </Tooltip>
  );
}

function Connector({ tokens, met }: { tokens: ThemeTokens; met: boolean }) {
  return (
    <Box
      flex="1"
      minW="0.35rem"
      maxW="0.75rem"
      h="1px"
      mt="-0.65rem"
      bg={met ? tokens.tagGreen.color : tokens.panelBorder}
      opacity={met ? 0.55 : 0.35}
      alignSelf="center"
    />
  );
}

export function SignalConditionDots({
  conditions,
  tokens,
  variant = "alert",
  pulse = false,
  compact = false,
}: {
  conditions: SignalCondition[];
  tokens: ThemeTokens;
  variant?: "alert" | "watch";
  pulse?: boolean;
  compact?: boolean;
}) {
  if (conditions.length === 0) return null;

  const metCount = countMetConditions(conditions);
  const total = conditions.length;
  const accent = variant === "watch" ? tokens.tagBlue.color : tokens.tagAccent.color;

  return (
    <Box
      w={compact ? "auto" : "100%"}
      px={compact ? "0" : "0.5"}
      py={compact ? "0" : "1.5"}
      rounded="sm"
      borderWidth={compact ? "0" : "1px"}
      borderColor={tokens.panelBorder}
      bg={
        compact
          ? "transparent"
          : `linear-gradient(90deg, ${tokens.blockquoteBg} 0%, transparent 70%)`
      }
    >
      {!compact ? (
        <Flex justify="space-between" align="center" mb="1.5" gap="2">
          <Text
            fontFamily="mono"
            fontSize="0.5rem"
            color={tokens.panelLabel}
            letterSpacing="0.12em"
            textTransform="uppercase"
          >
            {variant === "watch" ? "Band checks" : "Entry checks"}
          </Text>
          <Text fontFamily="mono" fontSize="0.5rem" color={accent}>
            {metCount}/{total}
          </Text>
        </Flex>
      ) : null}

      <Flex
        align="flex-start"
        gap="0"
        overflowX="auto"
        css={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
        pb={compact ? "0" : "0.5"}
      >
        {conditions.map((condition, index) => (
          <Flex key={condition.id} align="flex-start" flexShrink={0}>
            {index > 0 ? (
              <Connector
                tokens={tokens}
                met={
                  conditions[index - 1]?.state === "met" && condition.state === "met"
                }
              />
            ) : null}
            <ConditionDot condition={condition} tokens={tokens} pulse={pulse && index === 0} />
          </Flex>
        ))}
      </Flex>
    </Box>
  );
}
