import { toaster } from "@/components/ui/toaster";
import { Tooltip } from "@/components/ui/tooltip";
import { useThemeColor, useThemeTokens } from "@/components/ui/theme-color";
import { apiFetch } from "@/services/apiFetch";
import { DEFAULT_RISK, DEFAULT_STOP_LOSS, DEFAULT_TP_PRESET, NATR_MULTIPLIER, TP_PRESETS } from "@/services/config";
import { Box, Button, Flex, Input, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { useState } from "react";

const MONO = {
    fontFamily: "mono",
    fontSize: "xs",
    lineHeight: "1.7",
} as const;

function formatTradeApiError(data: unknown): string {
    if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        if (typeof d.detail === "string") return d.detail;
        if (Array.isArray(d.detail)) {
            return d.detail
                .map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item)))
                .join("; ");
        }
        if (typeof d.message === "string") return d.message;
        if (typeof d.reason === "string") return d.reason;
        if (typeof d.error === "string") return d.error;
    }
    return "Request failed";
}

interface AssetInterfaceProps {
    pair: string;
}

type OptionItem = { value: string; label: ReactNode };

function SectionLabel({ children }: { children: ReactNode }) {
    const { palette } = useThemeColor();
    const tokens = useThemeTokens(palette);
    return (
        <Text {...MONO} color={tokens.panelLabel} letterSpacing="0.04em">
            ── {children}
        </Text>
    );
}

function OptionChip({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    const { palette } = useThemeColor();
    return (
        <Button
            size="xs"
            variant={active ? "solid" : "outline"}
            colorPalette={active ? palette : "gray"}
            fontFamily="mono"
            color={active ? undefined : "fg.muted"}
            borderColor={active ? undefined : "border.emphasized"}
            onClick={onClick}
        >
            {children}
        </Button>
    );
}

function OptionRow({
    label,
    value,
    onChange,
    items,
}: {
    label: string;
    value: string;
    onChange: (next: string) => void;
    items: OptionItem[];
}) {
    return (
        <Stack gap="2">
            <SectionLabel>{label}</SectionLabel>
            <Flex gap="1" flexWrap="wrap">
                {items.map((item) => (
                    <OptionChip
                        key={item.value}
                        active={value === item.value}
                        onClick={() => onChange(item.value)}
                    >
                        {item.label}
                    </OptionChip>
                ))}
            </Flex>
        </Stack>
    );
}

const STOP_LOSS_ITEMS: OptionItem[] = [
    { value: "price", label: "price" },
    { value: "natr_1m", label: "natr_1m" },
    { value: "natr_5m", label: "natr_5m" },
    { value: "natr_15m", label: "natr_15m" },
    { value: "natr_30m", label: "natr_30m" },
    { value: "0.3", label: "0.3" },
    { value: "0.5", label: "0.5" },
    { value: "1", label: "1" },
];

const RISK_ITEMS: OptionItem[] = ["0.25", "0.5", "1", "1.5", "2"].map((v) => ({
    value: v,
    label: v,
}));

const AssetInterface = ({ pair }: AssetInterfaceProps) => {
    const { palette } = useThemeColor();
    const tokens = useThemeTokens(palette);
    const [stopLoss, setStopLoss] = useState(DEFAULT_STOP_LOSS);
    const [risk, setRisk] = useState(DEFAULT_RISK);
    const [tpPresets, setTpPresets] = useState(DEFAULT_TP_PRESET);
    const [submitting, setSubmitting] = useState(false);
    const [stopLossPrice, setStopLossPrice] = useState("");

    const slPriceRequired =
        (stopLoss === "price" && stopLossPrice === "") || stopLossPrice === "0";

    const executeTrade = async (side: "long" | "short") => {
        setSubmitting(true);
        try {
            const tp_levels = TP_PRESETS[tpPresets as keyof typeof TP_PRESETS];
            const stop_loss_text_formatted = stopLoss.startsWith("natr_")
                ? `${stopLoss}_${NATR_MULTIPLIER}`
                : stopLoss;
            const body = {
                symbol: `${pair}USDT`,
                direction: side,
                risk_percent: Number(risk),
                stop_loss_percent:
                    stopLoss.startsWith("natr_") || stopLoss === "price"
                        ? stop_loss_text_formatted
                        : Number(stopLoss),
                stop_loss_price: stopLossPrice ? Number(stopLossPrice) : undefined,
                tp_levels,
            };
            const res = await apiFetch("/api/trade/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const raw = await res.text();
            let data: unknown = {};
            try {
                data = raw ? JSON.parse(raw) : {};
            } catch {
                data = { message: raw || `HTTP ${res.status}` };
            }

            if (!res.ok) {
                toaster.error({
                    title: "Trade failed",
                    description: formatTradeApiError(data),
                });
                return;
            }

            const payload = data as { success?: boolean; reason?: string };

            if (!payload.success) {
                toaster.warning({
                    title: "Trade not placed",
                    description:
                        payload.reason === "conflict_detected"
                            ? "Conflict check blocked execution."
                            : formatTradeApiError(data),
                });
                return;
            }

            toaster.success({
                title: "Trade executed",
                description: `${pair} ${side.toUpperCase()}`,
            });
            setStopLossPrice("");
        } catch (e) {
            toaster.error({
                title: "Trade failed",
                description: e instanceof Error ? e.message : "Network error",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box
            w="100%"
            borderWidth="1px"
            borderColor="border.emphasized"
            rounded="md"
            overflow="hidden"
            bg="bg"
        >
            <Flex
                px="3"
                py="2"
                direction={{ base: "column", md: "row" }}
                align={{ base: "stretch", md: "center" }}
                justify="space-between"
                gap="3"
                borderBottomWidth="1px"
                borderColor="border.emphasized"
                flexShrink={0}
            >
                <Text {...MONO} fontSize="sm" fontWeight="semibold" color={tokens.title}>
                    {pair}
                </Text>
                <Input
                    size="xs"
                    w={{ base: "100%", md: "8rem" }}
                    alignSelf={{ base: "stretch", md: "auto" }}
                    value={stopLossPrice}
                    onChange={(e) => setStopLossPrice(e.target.value)}
                    placeholder="SL price"
                    type="number"
                    variant="flushed"
                    fontFamily="mono"
                    fontSize="xs"
                    color="fg"
                    borderColor={tokens.panelBorder}
                    disabled={stopLoss !== "price"}
                    opacity={stopLoss === "price" ? 1 : 0.45}
                />
            </Flex>

            <Stack gap="3" px="3" py="3">
                <OptionRow
                    label="stop loss"
                    value={stopLoss}
                    onChange={setStopLoss}
                    items={STOP_LOSS_ITEMS}
                />
                <Box
                    display="grid"
                    gap="3"
                    w="100%"
                    gridTemplateColumns={{ base: "1fr", md: "1fr 1fr" }}
                >
                    <OptionRow label="risk %" value={risk} onChange={setRisk} items={RISK_ITEMS} />
                    <OptionRow
                        label="tp preset"
                        value={tpPresets}
                        onChange={setTpPresets}
                        items={TP_SEGMENT_ITEMS}
                    />
                </Box>
            </Stack>

            <Flex
                gap="2"
                px="3"
                py="3"
                borderTopWidth="1px"
                borderColor="border.emphasized"
                bg="bg.subtle"
            >
                <Button
                    flex="1"
                    size="sm"
                    variant="solid"
                    colorPalette={palette}
                    fontFamily="mono"
                    onClick={() => void executeTrade("long")}
                    loading={submitting}
                    disabled={slPriceRequired}
                >
                    LONG
                </Button>
                <Button
                    flex="1"
                    size="sm"
                    variant="outline"
                    colorPalette={palette}
                    fontFamily="mono"
                    onClick={() => void executeTrade("short")}
                    loading={submitting}
                    disabled={slPriceRequired}
                >
                    SHORT
                </Button>
            </Flex>
        </Box>
    );
};

export default AssetInterface;

function segmentLabel(value: string, tip: string): ReactNode {
    return (
        <Tooltip content={tip}>
            <span style={{ display: "inline-block" }}>{value}</span>
        </Tooltip>
    );
}

const TP_SEGMENT_ITEMS: OptionItem[] = [
    { value: "2", label: segmentLabel("2", "One take-profit at 2R") },
    { value: "3", label: segmentLabel("3", "One take-profit at 3R") },
    { value: "4", label: segmentLabel("4", "One take-profit at 4R") },
    { value: "6", label: segmentLabel("6", "One take-profit at 6R") },
    { value: "8", label: segmentLabel("8", "One take-profit at 8R") },
    { value: "A", label: segmentLabel("A", "1R @ 10%, 2R @ 20%, runner 70%") },
    { value: "B", label: segmentLabel("B", "1R @ 15%, 3R @ 25%, runner 60%") },
    { value: "C", label: segmentLabel("C", "1R @ 20%, 4R @ 20%, runner 60%") },
];
