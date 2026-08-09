"use client";

import ConfirmDialog from "@/components/2_molecules/ConfirmDialog/ConfirmDialog";
import { useThemeTokens } from "@/components/ui/theme-color";
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
  Input,
  Portal,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";

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

export default function AlertsPanel({ active, refreshKey }: AlertsPanelProps) {
  const tokens = useThemeTokens();
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
    setModalOpen(true);
  };

  const openEdit = (row: PriceAlert) => {
    setEditing(row);
    setForm({
      symbol: row.base,
      price: String(row.price),
      comment: row.comment,
    });
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

  return (
    <Box {...themedPanelStyle(tokens)} p="4">
      <Flex justify="space-between" align="flex-start" gap="3" mb="4" flexWrap="wrap">
        <Stack gap="1">
          <Text fontSize="lg" fontWeight="semibold" color={tokens.title}>
            Price alerts
          </Text>
          <Text fontSize="sm" color={tokens.panelMuted}>
            Watch TF <Box as="span" color={tokens.tagBlue.color}>{timeframe}</Box>
            {" · "}fires when alert price sits inside the newly closed candle, then deletes
            {health ? (
              <>
                {" · "}telegram{" "}
                <Box
                  as="span"
                  color={
                    health.telegram_configured
                      ? tokens.tagAccent.color
                      : tokens.panelMuted
                  }
                >
                  {health.telegram_configured ? "on" : "off"}
                </Box>
                {health.last_poll_at ? ` · polled ${health.last_poll_at}` : null}
              </>
            ) : null}
          </Text>
        </Stack>
        <Button size="sm" colorPalette="blue" onClick={openCreate}>
          Add alert
        </Button>
      </Flex>

      {error ? (
        <Text mb="3" fontSize="sm" color="red.400">
          {error}
        </Text>
      ) : null}

      {loading && alerts.length === 0 ? (
        <Text color={tokens.panelMuted}>Loading…</Text>
      ) : alerts.length === 0 ? (
        <Text color={tokens.panelMuted}>No pending alerts.</Text>
      ) : (
        <Box overflowX="auto">
          <Table.Root size="sm" variant="line">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Pair</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Price</Table.ColumnHeader>
                <Table.ColumnHeader>Comment</Table.ColumnHeader>
                <Table.ColumnHeader>Updated</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {alerts.map((row) => (
                <Table.Row key={row.id}>
                  <Table.Cell fontWeight="medium">{row.base}</Table.Cell>
                  <Table.Cell textAlign="right" fontFamily="mono">
                    {row.price}
                  </Table.Cell>
                  <Table.Cell color={tokens.panelMuted}>
                    {row.comment || "—"}
                  </Table.Cell>
                  <Table.Cell color={tokens.panelMuted} fontSize="xs">
                    {row.updated_at.slice(0, 19)}
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Flex gap="2" justify="flex-end">
                      <Button size="xs" variant="outline" onClick={() => openEdit(row)}>
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        colorPalette="red"
                        onClick={() => setDeleteTarget(row)}
                      >
                        Delete
                      </Button>
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
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
            pointerEvents="none"
          >
            <Box
              {...themedPanelStyle(tokens)}
              p="5"
              w="100%"
              maxW="420px"
              pointerEvents="auto"
              onClick={(e) => e.stopPropagation()}
            >
              <Text fontSize="md" fontWeight="semibold" mb="3" color={tokens.title}>
                {editing ? "Edit alert" : "New alert"}
              </Text>
              <Stack gap="3">
                <Box>
                  <Text fontSize="xs" color={tokens.panelMuted} mb="1">
                    Pair
                  </Text>
                  <Input
                    value={form.symbol}
                    onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
                    placeholder="BTC"
                    autoFocus
                  />
                </Box>
                <Box>
                  <Text fontSize="xs" color={tokens.panelMuted} mb="1">
                    Alert price
                  </Text>
                  <Input
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="65000"
                    inputMode="decimal"
                  />
                </Box>
                <Box>
                  <Text fontSize="xs" color={tokens.panelMuted} mb="1">
                    Comment
                  </Text>
                  <Input
                    value={form.comment}
                    onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                    placeholder="optional note"
                  />
                </Box>
                <Flex gap="2" justify="flex-end" pt="2">
                  <Button variant="ghost" onClick={closeModal} disabled={saving}>
                    Cancel
                  </Button>
                  <Button colorPalette="blue" onClick={() => void save()} loading={saving}>
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
        title="Delete alert"
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
