"use client";

import { Tooltip } from "@/components/ui/tooltip";
import type { ThemeTokens } from "@/components/ui/theme-color";
import {
  countPassNodes,
  matrixSummary,
  type MatrixNode,
  type MatrixNodeState,
} from "@/components/2_molecules/ConditionMatrix/conditionMatrixTypes";
import { Box, Flex, Text } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useCallback, useEffect, useState } from "react";

const dotPulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.12); opacity: 0.88; }
`;

const flow = keyframes`
  to { background-position: 200% 0; }
`;

const sweep = keyframes`
  0% { transform: translateX(-120%) skewX(-14deg); opacity: 0; }
  20% { opacity: 0.5; }
  100% { transform: translateX(220%) skewX(-14deg); opacity: 0; }
`;

function stateColor(tokens: ThemeTokens, state: MatrixNodeState): string {
  if (state === "pass") return tokens.tagGreen.color;
  if (state === "fail") return tokens.tagRed.color;
  if (state === "warn") return tokens.warn;
  return tokens.panelMuted;
}

function stateLabel(state: MatrixNodeState): string {
  if (state === "pass") return "✓ pass";
  if (state === "fail") return "✗ fail";
  if (state === "warn") return "⚠ warn";
  return "— pending";
}

function summaryColor(tokens: ThemeTokens, summary: ReturnType<typeof matrixSummary>): string {
  if (summary === "blocked") return tokens.tagRed.color;
  if (summary === "warn") return tokens.warn;
  return tokens.tagGreen.color;
}

function summaryLabel(summary: ReturnType<typeof matrixSummary>): string {
  if (summary === "blocked") return "BLOCKED";
  if (summary === "warn") return "CAUTION";
  return "CLEAR";
}

function variantAccent(tokens: ThemeTokens, variant: "watch" | "alert" | "gate"): string {
  if (variant === "watch") return tokens.tagBlue.color;
  if (variant === "gate") return tokens.tagAccent.color;
  return tokens.tagAccent.color;
}

function useHoverCapable(): boolean {
  const [hoverCapable, setHoverCapable] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setHoverCapable(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return hoverCapable;
}

function MatrixNodeDot({
  node,
  tokens,
  pulse,
}: {
  node: MatrixNode;
  tokens: ThemeTokens;
  pulse?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hoverCapable = useHoverCapable();
  const color = stateColor(tokens, node.state);
  const filled = node.state === "pass";

  const handleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setOpen((value) => !value);
  }, []);

  return (
    <Tooltip
      showArrow
      open={open}
      onOpenChange={(details) => setOpen(details.open)}
      openDelay={hoverCapable ? 120 : 0}
      closeOnClick={false}
      content={
        <Box bg={tokens.panelBgUser} borderWidth="1px" borderColor={tokens.panelBorder} rounded="md" p="2">
          <Box fontFamily="mono" fontSize="2xs" lineHeight="1.5" maxW="14rem">
            <Text color={tokens.title} fontWeight="bold" letterSpacing="0.08em">
              {node.label}
            </Text>
            {node.detail ? (
              <Text color={tokens.panelBody} mt="1">
                {node.detail}
              </Text>
            ) : null}
            <Text color={color} mt="1" textTransform="uppercase" letterSpacing="0.1em">
              {stateLabel(node.state)}
            </Text>
          </Box>
        </Box>
      }
      contentProps={{ bg: "transparent", border: "none", p: 0 }}
    >
      <Flex
        direction="column"
        align="center"
        gap="1"
        cursor="pointer"
        minW="2.4rem"
        px="0.5"
        onClick={handleClick}
        onPointerEnter={() => hoverCapable && setOpen(true)}
        onPointerLeave={() => hoverCapable && setOpen(false)}
        aria-label={`${node.label}: ${node.state}`}
      >
        <Box
          w="0.7rem"
          h="0.7rem"
          rounded="full"
          bg={filled ? color : "transparent"}
          borderWidth="2px"
          borderColor={color}
          borderStyle={node.state === "unknown" ? "dashed" : "solid"}
          boxShadow={filled ? `0 0 10px ${color}` : `0 0 6px ${color}66`}
          animation={
            pulse && (filled || node.state === "fail")
              ? `${dotPulse} 2.2s ease-in-out infinite`
              : undefined
          }
          transition="transform 0.15s ease"
          _hover={{ transform: hoverCapable ? "scale(1.15)" : undefined }}
        />
        <Text
          fontFamily="mono"
          fontSize="2xs"
          color={node.state === "unknown" ? tokens.panelMuted : color}
          letterSpacing="0.04em"
          lineHeight="1"
          userSelect="none"
          whiteSpace="nowrap"
        >
          {node.short}
        </Text>
      </Flex>
    </Tooltip>
  );
}

function Connector({
  tokens,
  active,
}: {
  tokens: ThemeTokens;
  active: boolean;
}) {
  return (
    <Box
      flex="1"
      minW="0.5rem"
      maxW="1.25rem"
      h="2px"
      mt="-1.1rem"
      alignSelf="center"
      rounded="full"
      overflow="hidden"
      bg={active ? `${tokens.tagGreen.color}33` : tokens.panelBorder}
      opacity={active ? 1 : 0.45}
    >
      {active ? (
        <Box
          h="100%"
          w="200%"
          bg={`linear-gradient(90deg, transparent, ${tokens.tagGreen.color}, transparent)`}
          backgroundSize="50% 100%"
          animation={`${flow} 1.4s linear infinite`}
        />
      ) : null}
    </Box>
  );
}

function SegmentStrip({ nodes, tokens }: { nodes: MatrixNode[]; tokens: ThemeTokens }) {
  return (
    <Flex gap="2px" w="100%" h="4px" rounded="full" overflow="hidden" bg={tokens.blockquoteBg}>
      {nodes.map((node) => (
        <Box
          key={`seg-${node.id}`}
          flex="1"
          bg={stateColor(tokens, node.state)}
          opacity={node.state === "unknown" ? 0.35 : 0.9}
          boxShadow={node.state === "pass" ? `0 0 6px ${tokens.tagGreen.color}` : undefined}
        />
      ))}
    </Flex>
  );
}

export default function ConditionMatrix({
  nodes,
  tokens,
  title,
  variant = "alert",
  compact = false,
  pulse = false,
  showTitle = true,
}: {
  nodes: MatrixNode[];
  tokens: ThemeTokens;
  title?: string;
  variant?: "watch" | "alert" | "gate";
  compact?: boolean;
  pulse?: boolean;
  showTitle?: boolean;
}) {
  if (nodes.length === 0) return null;

  const passCount = countPassNodes(nodes);
  const total = nodes.length;
  const summary = matrixSummary(nodes);
  const accent = variant === "gate" ? summaryColor(tokens, summary) : variantAccent(tokens, variant);
  const alien = tokens.tagAccent.color;
  const showChrome = !compact;
  const resolvedTitle =
    title ?? (variant === "watch" ? "Band checks" : variant === "gate" ? "Gate matrix" : "Entry checks");

  return (
    <Box
      w={compact ? "auto" : "100%"}
      position="relative"
      overflow="hidden"
      px={compact ? "0" : "3"}
      py={compact ? "1" : "3"}
      rounded="sm"
      borderWidth={showChrome ? "1px" : "0"}
      borderColor={showChrome ? accent : "transparent"}
      bg={
        showChrome
          ? `linear-gradient(180deg, ${tokens.blockquoteBg} 0%, ${tokens.panelBg} 100%)`
          : "transparent"
      }
      boxShadow={showChrome ? `0 0 20px ${accent}22` : undefined}
    >
      {showChrome ? (
        <>
          <Box
            position="absolute"
            inset="0"
            pointerEvents="none"
            opacity={0.06}
            backgroundImage={`linear-gradient(${alien}33 1px, transparent 1px), linear-gradient(90deg, ${alien}33 1px, transparent 1px)`}
            backgroundSize="16px 16px"
          />
          <Box
            position="absolute"
            inset="0"
            pointerEvents="none"
            bg={`linear-gradient(105deg, transparent 44%, ${alien}33 50%, transparent 56%)`}
            animation={`${sweep} 6s ease-in-out infinite`}
          />
        </>
      ) : null}

      <Box position="relative" zIndex={1}>
        {showTitle ? (
          <Flex justify="space-between" align="center" mb="2" gap="2" flexWrap="wrap">
            <Text
              fontFamily="mono"
              fontSize="2xs"
              color={showChrome ? alien : tokens.panelLabel}
              letterSpacing="0.14em"
              textTransform="uppercase"
            >
              {resolvedTitle}
            </Text>
            <Flex align="center" gap="2" fontFamily="mono" fontSize="2xs">
              <Text color={accent} fontWeight="bold">
                {passCount}/{total}
              </Text>
              {showChrome && variant === "gate" ? (
                <Text color={accent} letterSpacing="0.1em">
                  {summaryLabel(summary)}
                </Text>
              ) : null}
            </Flex>
          </Flex>
        ) : showChrome ? (
          <Flex justify="flex-end" mb="2">
            <Text fontFamily="mono" fontSize="2xs" color={accent} fontWeight="bold">
              {passCount}/{total} · {summaryLabel(summary)}
            </Text>
          </Flex>
        ) : null}

        <SegmentStrip nodes={nodes} tokens={tokens} />

        <Flex
          align="flex-start"
          gap="0"
          mt="2.5"
          overflowX="auto"
          css={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
          pb="0.5"
        >
          {nodes.map((node, index) => (
            <Flex key={node.id} align="flex-start" flexShrink={0}>
              {index > 0 ? (
                <Connector
                  tokens={tokens}
                  active={nodes[index - 1]?.state === "pass" && node.state === "pass"}
                />
              ) : null}
              <MatrixNodeDot
                node={node}
                tokens={tokens}
                pulse={pulse && index === 0}
              />
            </Flex>
          ))}
        </Flex>
      </Box>
    </Box>
  );
}
