"use client";

import ConfirmDialog from "@/components/2_molecules/ConfirmDialog/ConfirmDialog";
import { useThemeColor, useThemeTokens } from "@/components/ui/theme-color";
import { themedPanelStyle } from "@/components/ui/themed-panel";
import {
  createAlert,
  deleteAlert,
  fetchAlertsHealth,
  fetchAlertsList,
  updateAlert,
} from "@/services/alertsApi";
import type { AlertsHealth, PriceAlert } from "@/types/alertsTypes";
import {
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  Portal,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useCallback, useEffect, useState, type MouseEvent } from "react";

type AlertsPanelProps = {
  active: boolean;
  refreshKey: number;
};

type FormState = {
  symbol: string;
  price: string;
  comment: string;
};

const EMPTY_FORM: FormState = { symbol: "", price: "", comment: "" };

const pulse = keyframes`
  0%, 100% { opacity: 1; box-shadow: 0 0 8px currentColor; }
  50% { opacity: 0.45; box-shadow: 0 0 2px currentColor; }
`;

const blink = keyframes`
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
`;

function MonoAction({
  label,
  color,
  onClick,
  danger,
}: {
  label: string;
  color: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <Box
      as="button"
      fontFamily="mono"
      fontSize="2xs"
      letterSpacing="0.08em"
      color={danger ? "red.400" : color}
      bg="transparent"
      border="none"
      cursor="pointer"
      px="1"
      py="0.5"
      _hover={{ color: danger ? "red.300" : undefined, opacity: 0.85 }}
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
        onClick();
      }}
    >
      [{label}]
    </Box>
  );
}

export default function AlertsPanel({ active, refreshKey }: AlertsPanelProps) {
  const { palette } = useThemeColor();
  const tokens = useThemeTokens(palette);
  const accent = tokens.tagAccent.color;

  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [timeframe, setTimeframe] = useState("5m");
  const [health, setHealth] = useState<AlertsHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PriceAlert | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PriceAlert | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, h] = await Promise.all([fetchAlertsList(), fetchAlertsHealth()]);
      setAlerts(list.alerts);
      setTimeframe(list.timeframe);
      setHealth(h);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    void reload();
  }, [active, refreshKey, reload]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (row: PriceAlert) => {
    setEditing(row);
    setForm({
      symbol: row.base,
      price: String(row.price),
      comment: row.comment,
    });
    setError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
  };

  const save = async () => {
    const symbol = form.symbol.trim();
    const price = Number(form.price);
    if (!symbol || !(price > 0)) {
      setError("Symbol and a price > 0 are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateAlert(editing.id, {
          symbol,
          price,
          comment: form.comment.trim(),
        });
      } else {
        await createAlert({
          symbol,
          price,
          comment: form.comment.trim(),
        });
      }
      setModalOpen(false);
      setEditing(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAlert(deleteTarget.id);
      setDeleteTarget(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const liveColor = health?.telegram_configured
    ? tokens.tagGreen.color
    : tokens.warn;
  const statusLabel = !health
    ? "loading"
    : health.telegram_configured
      ? "armed"
      : "telegram off";
  const telegramHint = health && !health.telegram_configured ? health.telegram_hint : null;

  return (
    <Box rounded="md" {...themedPanelStyle(tokens, "strong")}>
      <Box
        position="absolute"
        inset="0"
        pointerEvents="none"
        opacity={0.04}
        backgroundImage={`repeating-linear-gradient(0deg, transparent, transparent 2px, ${tokens.title} 3px)`}
      />

      <Flex
        px="4"
        py="3"
        borderBottomWidth="1px"
        borderColor={tokens.panelBorder}
        align="center"
        justify="space-between"
        flexWrap="wrap"
        gap="2"
        position="relative"
      >
        <Flex align="center" gap="3">
          <Box
            w="2.5"
            h="2.5"
            rounded="full"
            bg={liveColor}
            color={liveColor}
            animation={
              health?.telegram_configured ? `${pulse} 2s ease-in-out infinite` : undefined
            }
          />
          <Stack gap="0">
            <Text
              fontFamily="mono"
              fontSize="sm"
              fontWeight="bold"
              color={tokens.title}
              letterSpacing="0.14em"
            >
              PRICE_ALERTS
            </Text>
            <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
              tf {timeframe} · closed candle touch · {statusLabel}
            </Text>
            {telegramHint ? (
              <Text fontFamily="mono" fontSize="2xs" color={tokens.warn} maxW="42rem">
                {telegramHint}
              </Text>
            ) : null}
          </Stack>
        </Flex>

        <Flex gap="3" align="center" flexWrap="wrap" justify="flex-end">
          <Flex
            gap="4"
            fontFamily="mono"
            fontSize="2xs"
            color={tokens.panelMuted}
            flexWrap="wrap"
            align="center"
          >
            <Text>
              pending{" "}
              <Box as="span" color={tokens.panelBody}>
                {alerts.length}
              </Box>
            </Text>
            {health?.last_poll_at ? (
              <Text>
                poll{" "}
                <Box as="span" color={tokens.panelBody}>
                  {health.last_poll_at.slice(0, 19)}
                </Box>
              </Text>
            ) : null}
            <Text animation={`${blink} 1.2s step-end infinite`} color={tokens.title}>
              _
            </Text>
          </Flex>
          <IconButton
            aria-label="Add price alert"
            title="Add price alert"
            size="sm"
            variant="outline"
            colorPalette={palette}
            borderColor={tokens.panelBorder}
            color={tokens.panelBody}
            minW="33px"
            minH="33px"
            onClick={openCreate}
          >
            <Text fontFamily="mono" fontSize="lg" lineHeight="1">
              +
            </Text>
          </IconButton>
        </Flex>
      </Flex>

      {error && !modalOpen ? (
        <Text
          px="4"
          py="2"
          fontFamily="mono"
          fontSize="2xs"
          color="red.400"
          borderBottomWidth="1px"
          borderColor={tokens.panelBorder}
        >
          {error}
        </Text>
      ) : null}

      {loading && alerts.length === 0 ? (
        <Flex py="12" justify="center">
          <Spinner size="sm" color={accent} />
        </Flex>
      ) : alerts.length === 0 ? (
        <Flex py="10" justify="center" direction="column" align="center" gap="2">
          <Text fontFamily="mono" fontSize="sm" color={tokens.panelMuted}>
            {"// no pending alerts"}
          </Text>
          <Box
            as="button"
            fontFamily="mono"
            fontSize="2xs"
            letterSpacing="0.1em"
            color={accent}
            bg="transparent"
            border="none"
            cursor="pointer"
            _hover={{ opacity: 0.8 }}
            onClick={openCreate}
          >
            [+ ADD]
          </Box>
        </Flex>
      ) : (
        <Stack gap="0" position="relative">
          <Flex
            px={{ base: 3, md: 4 }}
            py="2"
            borderBottomWidth="1px"
            borderColor={tokens.panelBorder}
            bg={tokens.tableHeaderBg}
            fontFamily="mono"
            fontSize="2xs"
            color={tokens.tableHeaderColor}
            letterSpacing="0.12em"
            display={{ base: "none", md: "flex" }}
            gap="3"
          >
            <Text flex="0 0 5rem">PAIR</Text>
            <Text flex="0 0 7rem" textAlign="right">
              PRICE
            </Text>
            <Text flex="1">COMMENT</Text>
            <Text flex="0 0 10rem">UPDATED</Text>
            <Text flex="0 0 7rem" textAlign="right">
              {" "}
            </Text>
          </Flex>

          <Stack gap="1" px={{ base: 1, md: 2 }} py="2">
            {alerts.map((row, index) => (
              <Box
                key={row.id}
                position="relative"
                overflow="hidden"
                borderWidth="1px"
                borderColor={tokens.panelBorder}
                bg={index % 2 === 0 ? "transparent" : tokens.blockquoteBg}
                rounded="sm"
                transition="border-color 0.2s, box-shadow 0.2s"
                _hover={{
                  borderColor: `${accent}66`,
                  boxShadow: `inset 0 0 32px ${accent}0a`,
                }}
              >
                <Flex
                  px={{ base: 3, md: 3 }}
                  py="2.5"
                  align={{ base: "stretch", md: "center" }}
                  gap={{ base: 2, md: 3 }}
                  direction={{ base: "column", md: "row" }}
                  fontFamily="mono"
                  fontSize="xs"
                >
                  <Text
                    flex={{ md: "0 0 5rem" }}
                    fontWeight="bold"
                    color={tokens.title}
                    letterSpacing="0.04em"
                  >
                    {row.base}
                  </Text>
                  <Text
                    flex={{ md: "0 0 7rem" }}
                    textAlign={{ md: "right" }}
                    color={accent}
                    fontWeight="semibold"
                  >
                    {row.price}
                  </Text>
                  <Text
                    flex={{ md: "1" }}
                    color={tokens.panelMuted}
                    lineClamp={2}
                    minW="0"
                  >
                    {row.comment || "—"}
                  </Text>
                  <Text
                    flex={{ md: "0 0 10rem" }}
                    fontSize="2xs"
                    color={tokens.panelMuted}
                  >
                    {row.updated_at.slice(0, 19)}
                  </Text>
                  <Flex
                    flex={{ md: "0 0 7rem" }}
                    gap="1"
                    justify={{ md: "flex-end" }}
                    align="center"
                  >
                    <MonoAction
                      label="edit"
                      color={tokens.panelLabel}
                      onClick={() => openEdit(row)}
                    />
                    <MonoAction
                      label="del"
                      color={tokens.panelLabel}
                      danger
                      onClick={() => setDeleteTarget(row)}
                    />
                  </Flex>
                </Flex>
              </Box>
            ))}
          </Stack>
        </Stack>
      )}

      {modalOpen ? (
        <Portal>
          <Box
            position="fixed"
            inset="0"
            bg="blackAlpha.700"
            zIndex={1500}
            onClick={closeModal}
            aria-hidden
          />
          <Flex
            position="fixed"
            inset="0"
            zIndex={1501}
            align="center"
            justify="center"
            p="4"
            pointerEvents="none"
          >
            <Box
              role="dialog"
              aria-modal="true"
              pointerEvents="auto"
              w="full"
              maxW="22rem"
              p="4"
              rounded="md"
              onClick={(e) => e.stopPropagation()}
              {...themedPanelStyle(tokens)}
            >
              <Stack gap="4">
                <Stack gap="2">
                  <Text
                    fontFamily="mono"
                    fontSize="sm"
                    fontWeight="bold"
                    color={tokens.title}
                    letterSpacing="0.08em"
                  >
                    {editing ? "EDIT_ALERT" : "NEW_ALERT"}
                  </Text>
                  <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
                    Fires on {timeframe} closed candle if price is inside the bar, then deletes.
                  </Text>
                </Stack>
                <Stack gap="3">
                  <Box>
                    <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} mb="1">
                      PAIR
                    </Text>
                    <Input
                      value={form.symbol}
                      onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
                      placeholder="BTC"
                      size="sm"
                      fontFamily="mono"
                      fontSize="xs"
                      autoFocus
                    />
                  </Box>
                  <Box>
                    <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} mb="1">
                      PRICE
                    </Text>
                    <Input
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="65000"
                      inputMode="decimal"
                      size="sm"
                      fontFamily="mono"
                      fontSize="xs"
                    />
                  </Box>
                  <Box>
                    <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} mb="1">
                      COMMENT
                    </Text>
                    <Input
                      value={form.comment}
                      onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                      placeholder="optional note"
                      size="sm"
                      fontFamily="mono"
                      fontSize="xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void save();
                      }}
                    />
                  </Box>
                </Stack>
                {error ? (
                  <Text fontFamily="mono" fontSize="2xs" color="red.400">
                    {error}
                  </Text>
                ) : null}
                <Flex gap="2" justify="flex-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    fontFamily="mono"
                    color={tokens.panelMuted}
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="solid"
                    colorPalette={palette}
                    fontFamily="mono"
                    onClick={() => void save()}
                    loading={saving}
                  >
                    Save
                  </Button>
                </Flex>
              </Stack>
            </Box>
          </Flex>
        </Portal>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="DELETE_ALERT"
        description={
          deleteTarget
            ? `Remove ${deleteTarget.base} @ ${deleteTarget.price}?`
            : null
        }
        confirmLabel="Delete"
        confirmColorPalette="red"
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
