import { toaster } from "@/components/ui/toaster";
import { DEFAULT_RISK, DEFAULT_STOP_LOSS, DEFAULT_TP_PRESET, TP_PRESETS } from "@/services/config";
import { Button, Flex, SegmentGroup, Stack, Text, VStack } from "@chakra-ui/react";
import { useState } from "react";

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

const AssetInterface = ({ pair }: AssetInterfaceProps) => {
    const [stopLoss, setStopLoss] = useState(DEFAULT_STOP_LOSS);
    const [risk, setRisk] = useState(DEFAULT_RISK);
    const [tpPresets, setTpPresets] = useState(DEFAULT_TP_PRESET);
    const [submitting, setSubmitting] = useState(false);

    const executeTrade = async (side: "long" | "short") => {
        setSubmitting(true);
        try {
            const tp_levels = TP_PRESETS[tpPresets as keyof typeof TP_PRESETS];
            const body = {
                symbol: `${pair}USDT`,
                direction: side,
                risk_percent: Number(risk),
                stop_loss_percent: stopLoss === "natr" ? stopLoss : Number(stopLoss),
                tp_levels,
            };
            const res = await fetch("/api/trade/execute", {
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
        <Stack w="30rem" border="1px solid" borderColor="gray.200" borderRadius="md" p="1rem">
            <Stack gap="1rem">
                <Stack direction="row" gap="1rem" align="flex-start" justify="space-between">
                    <VStack align="flex-start">
                        <Stack direction="row" gap="0.5rem" align="center">
                            <Text fontSize="xl" fontWeight="bold" color="yellow.500">{pair}</Text>
                            <Text fontSize="sm">Stop Loss %</Text>
                        </Stack>
                        <SegmentGroup.Root
                            defaultValue={stopLoss}
                            value={stopLoss}
                            onValueChange={(details) => details.value != null && setStopLoss(details.value)}
                            size="xs"
                            css={{
                                "--segment-indicator-bg": "colors.teal.600",
                                "--segment-indicator-shadow": "shadows.md",
                            }}
                        >
                            <SegmentGroup.Indicator />
                            <SegmentGroup.Items items={["natr", "0.2", "0.3", "0.4", "0.5", "0.6", "0.8", "1", "1.5", "2", "2.5"]} />
                        </SegmentGroup.Root>
                    </VStack>
                </Stack>
                <Stack direction="row" gap="1rem">
                    <VStack align="flex-start">
                        <Text fontSize="sm">Risk %</Text>
                        <SegmentGroup.Root
                            defaultValue={risk}
                            value={risk}
                            onValueChange={(details) => details.value != null && setRisk(details.value)}
                            size="xs"
                            css={{
                                "--segment-indicator-bg": "colors.teal.600",
                                "--segment-indicator-shadow": "shadows.md",
                            }}
                        >
                            <SegmentGroup.Indicator />
                            <SegmentGroup.Items items={["0.5", "1", "1.5", "2"]} />
                        </SegmentGroup.Root>
                    </VStack>
                    <VStack align="flex-start">
                        <Text fontSize="sm">TP Presets</Text>
                        <SegmentGroup.Root
                            defaultValue={tpPresets}
                            value={tpPresets}
                            onValueChange={(details) => details.value != null && setTpPresets(details.value)}
                            size="xs"
                            css={{
                                "--segment-indicator-bg": "colors.teal.600",
                                "--segment-indicator-shadow": "shadows.md",
                            }}
                        >
                            <SegmentGroup.Indicator />
                            <SegmentGroup.Items items={["2", "3", "4", "1-3 25", "1-3 50", "2-4 25"]} />
                        </SegmentGroup.Root>
                    </VStack>
                </Stack>
            </Stack>
            <Stack direction="row" mt="0.5rem">
                <Flex w="50%">
                    <Button
                        w="100%"
                        colorPalette="green"
                        size="sm"
                        onClick={() => void executeTrade("long")}
                        loading={submitting}
                        disabled={submitting}
                    >
                        LONG {pair}
                    </Button>
                </Flex>
                <Flex w="50%">
                    <Button
                        w="100%"
                        colorPalette="red"
                        size="sm"
                        onClick={() => void executeTrade("short")}
                        loading={submitting}
                        disabled={submitting}
                    >
                        SHORT {pair}
                    </Button>
                </Flex>
            </Stack>
        </Stack>
    );
}

export default AssetInterface;