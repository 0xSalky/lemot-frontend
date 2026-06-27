import type { RiskGate } from "@/types/riskDeskTypes";
import type { SignalCondition } from "@/components/3_organisms/SignalsMonitorPanel/signalConditions";

export type MatrixNodeState = "pass" | "fail" | "warn" | "unknown";

export interface MatrixNode {
  id: string;
  short: string;
  label: string;
  detail?: string;
  state: MatrixNodeState;
}

export function signalConditionToMatrixNode(condition: SignalCondition): MatrixNode {
  return {
    id: condition.id,
    short: condition.short,
    label: condition.label,
    detail: condition.detail,
    state:
      condition.state === "met" ? "pass" : condition.state === "unmet" ? "fail" : "unknown",
  };
}

export function riskGateToMatrixNode(gate: RiskGate): MatrixNode {
  return {
    id: gate.id,
    short: gate.short,
    label: gate.label,
    detail: gate.detail,
    state: gate.status === "ok" ? "pass" : gate.status === "warn" ? "warn" : "fail",
  };
}

export function countPassNodes(nodes: MatrixNode[]): number {
  return nodes.filter((node) => node.state === "pass").length;
}

export function matrixSummary(nodes: MatrixNode[]): "clear" | "warn" | "blocked" {
  if (nodes.some((node) => node.state === "fail")) return "blocked";
  if (nodes.some((node) => node.state === "warn")) return "warn";
  return "clear";
}
