"use client";

import {
  formatR,
  formatShortDate,
  formatShortDateTime,
  formatUsd,
} from "@/components/3_organisms/TradeJournalPanel/journalFormat";
import type { ThemeTokens } from "@/components/ui/theme-color";
import type { TradeJournalGrowth } from "@/types/tradeJournalTypes";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { useCallback, useMemo, useState } from "react";

const CHART_W = 640;
const CHART_H = 108;
const PAD = { top: 10, right: 8, bottom: 6, left: 8 };

type PlotPoint = {
  x: number;
  y: number;
  value: number;
  time: string | null;
  mark: string | null;
  cumulativeR: number | null;
  index: number;
};

function yValue(point: TradeJournalGrowth["points"][number], useEquity: boolean): number | null {
  if (useEquity && point.equity_usd != null && Number.isFinite(point.equity_usd)) {
    return point.equity_usd;
  }
  if (Number.isFinite(point.cumulative_pnl_usd)) return point.cumulative_pnl_usd;
  return null;
}

function buildPath(points: PlotPoint[]): string {
  if (points.length === 0) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

export default function JournalGrowthChart({
  growth,
  tokens,
}: {
  growth: TradeJournalGrowth;
  tokens: ThemeTokens;
}) {
  const alien = tokens.tagAccent.color;
  const useEquity = growth.points.some((p) => p.equity_usd != null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chart = useMemo(() => {
    const innerW = CHART_W - PAD.left - PAD.right;
    const innerH = CHART_H - PAD.top - PAD.bottom;
    const values = growth.points
      .map((p) => yValue(p, useEquity))
      .filter((v): v is number => v != null);
    if (values.length === 0) return null;

    let minY = Math.min(...values);
    let maxY = Math.max(...values);
    if (minY === maxY) {
      const pad = Math.max(50, Math.abs(minY) * 0.05 || 50);
      minY -= pad;
      maxY += pad;
    } else {
      const span = maxY - minY;
      minY -= span * 0.08;
      maxY += span * 0.08;
    }

    const plotPoints = growth.points
      .map((point, index) => {
        const value = yValue(point, useEquity);
        if (value == null) return null;
        const x =
          growth.points.length === 1
            ? PAD.left + innerW / 2
            : PAD.left + (index / (growth.points.length - 1)) * innerW;
        const y = PAD.top + innerH - ((value - minY) / (maxY - minY)) * innerH;
        return {
          x,
          y,
          value,
          time: point.time,
          mark: point.mark ?? null,
          cumulativeR: point.cumulative_r ?? null,
          index,
        };
      })
      .filter((p): p is PlotPoint => p != null);

    const startValue = plotPoints[0]?.value ?? 0;
    const endValue = plotPoints[plotPoints.length - 1]?.value ?? 0;
    const delta = endValue - startValue;
    const lineColor = delta >= 0 ? tokens.tagGreen.color : tokens.tagRed.color;

    return {
      plotPoints,
      path: buildPath(plotPoints),
      innerH,
      lineColor,
      areaPath:
        plotPoints.length > 0
          ? `${buildPath(plotPoints)} L ${plotPoints[plotPoints.length - 1].x.toFixed(2)} ${(PAD.top + innerH).toFixed(2)} L ${plotPoints[0].x.toFixed(2)} ${(PAD.top + innerH).toFixed(2)} Z`
          : "",
    };
  }, [growth.points, tokens.tagGreen.color, tokens.tagRed.color, useEquity]);

  const pickNearest = useCallback(
    (clientX: number, rect: DOMRect) => {
      if (!chart) return;
      const relX = ((clientX - rect.left) / rect.width) * CHART_W;
      let best = 0;
      let bestDist = Infinity;
      chart.plotPoints.forEach((p, i) => {
        const d = Math.abs(p.x - relX);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      setHoverIndex(best);
    },
    [chart],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      pickNearest(event.clientX, event.currentTarget.getBoundingClientRect());
    },
    [pickNearest],
  );

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null);
  }, []);

  if (!chart || growth.points.length === 0) {
    return (
      <Box
        borderWidth="1px"
        borderColor={tokens.panelBorder}
        rounded="sm"
        px="3"
        py="4"
        bg={tokens.blockquoteBg}
      >
        <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} textAlign="center">
          Account growth appears after the first closed trade
        </Text>
      </Box>
    );
  }

  const firstLabel = formatShortDate(chart.plotPoints[0]?.time ?? null);
  const lastLabel = formatShortDate(chart.plotPoints[chart.plotPoints.length - 1]?.time ?? null);
  const hovered = hoverIndex != null ? chart.plotPoints[hoverIndex] : null;
  const tooltipLeftPct = hovered ? (hovered.x / CHART_W) * 100 : 0;
  const tooltipFlip = tooltipLeftPct > 72;

  return (
    <Stack gap="1">
      <Stack gap="0">
        <Text fontFamily="mono" fontSize="2xs" color={alien} letterSpacing="0.2em">
          ◈ ACCOUNT GROWTH
        </Text>
        <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
          {useEquity ? "estimated equity from closed PnL" : "cumulative trading PnL"}
        </Text>
      </Stack>

      <Box position="relative" w="100%" overflow="visible">
        {hovered ? (
          <Box
            position="absolute"
            top="-2px"
            left={`${tooltipLeftPct}%`}
            transform={tooltipFlip ? "translate(-100%, -100%)" : "translate(-8px, -100%)"}
            zIndex={2}
            pointerEvents="none"
            mb="1"
          >
            <Stack
              gap="0"
              px="2"
              py="1.5"
              bg={tokens.panelBg}
              borderWidth="1px"
              borderColor={tokens.panelBorder}
              rounded="sm"
              boxShadow={`0 4px 16px ${tokens.panelBorder}`}
              minW="7rem"
            >
              <Text fontFamily="mono" fontSize="9px" color={tokens.panelMuted} lineHeight="1.3">
                {formatShortDateTime(hovered.time)}
              </Text>
              <Text fontFamily="mono" fontSize="xs" fontWeight="bold" color={chart.lineColor} lineHeight="1.3">
                {formatUsd(hovered.value)}
              </Text>
              {hovered.cumulativeR != null ? (
                <Text fontFamily="mono" fontSize="9px" color={tokens.panelBody} lineHeight="1.3">
                  ΣR {formatR(hovered.cumulativeR)}
                </Text>
              ) : null}
            </Stack>
          </Box>
        ) : null}

        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          width="100%"
          height={CHART_H}
          preserveAspectRatio="none"
          style={{ display: "block", cursor: "crosshair" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <rect
            x={PAD.left}
            y={PAD.top}
            width={CHART_W - PAD.left - PAD.right}
            height={chart.innerH}
            fill="transparent"
          />
          <line
            x1={PAD.left}
            y1={PAD.top + chart.innerH / 2}
            x2={CHART_W - PAD.right}
            y2={PAD.top + chart.innerH / 2}
            stroke={tokens.panelBorder}
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity={0.35}
          />
          {hovered ? (
            <line
              x1={hovered.x}
              y1={PAD.top}
              x2={hovered.x}
              y2={PAD.top + chart.innerH}
              stroke={alien}
              strokeWidth="1"
              opacity={0.45}
              strokeDasharray="3 3"
            />
          ) : null}
          {chart.areaPath ? (
            <path d={chart.areaPath} fill={chart.lineColor} opacity={0.12} />
          ) : null}
          <path
            d={chart.path}
            fill="none"
            stroke={chart.lineColor}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${chart.lineColor})` }}
            pointerEvents="none"
          />
          {chart.plotPoints.map((point) => {
            const active = hoverIndex === point.index;
            if (!active) return null;
            return (
              <circle
                key={`${point.time ?? point.index}-${point.value}`}
                cx={point.x}
                cy={point.y}
                r={point.mark === "now" ? 4.5 : 3.5}
                fill={point.mark === "now" ? alien : chart.lineColor}
                stroke={tokens.panelBg}
                strokeWidth="1.5"
                pointerEvents="none"
              />
            );
          })}
        </svg>

        <Flex justify="space-between" px="1" mt="-1px">
          <Text fontFamily="mono" fontSize="8px" color={tokens.panelMuted} lineHeight="1" opacity={0.7}>
            {firstLabel}
          </Text>
          <Text fontFamily="mono" fontSize="8px" color={tokens.panelMuted} lineHeight="1" opacity={0.7}>
            {lastLabel}
          </Text>
        </Flex>
      </Box>
    </Stack>
  );
}
