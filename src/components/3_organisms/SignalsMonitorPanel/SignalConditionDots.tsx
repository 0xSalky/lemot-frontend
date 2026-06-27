"use client";

import ConditionMatrix from "@/components/2_molecules/ConditionMatrix/ConditionMatrix";
import { signalConditionToMatrixNode } from "@/components/2_molecules/ConditionMatrix/conditionMatrixTypes";
import type { ThemeTokens } from "@/components/ui/theme-color";
import type { SignalCondition } from "./signalConditions";

export function SignalConditionDots({
  conditions,
  tokens,
  variant = "alert",
  pulse = false,
  compact = false,
  showTitle,
}: {
  conditions: SignalCondition[];
  tokens: ThemeTokens;
  variant?: "alert" | "watch";
  pulse?: boolean;
  compact?: boolean;
  showTitle?: boolean;
}) {
  const nodes = conditions.map(signalConditionToMatrixNode);
  return (
    <ConditionMatrix
      nodes={nodes}
      tokens={tokens}
      variant={variant}
      compact={compact}
      pulse={pulse}
      showTitle={showTitle}
    />
  );
}
