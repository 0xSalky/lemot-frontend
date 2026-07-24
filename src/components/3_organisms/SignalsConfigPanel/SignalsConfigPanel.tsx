"use client";

import type { ThemeTokens } from "@/components/ui/theme-color";
import { useThemeColor } from "@/components/ui/theme-color";
import { toaster } from "@/components/ui/toaster";
import { IS_PROFILE_B_ACTIVE } from "@/services/config";
import {
  fetchSignalsRuntime,
  patchSignalsRuntime,
} from "@/services/signalsRuntime";
import {
  UNAVAILABLE_SIGNALS_RUNTIME,
  type SignalsRuntimeControls,
} from "@/types/signalsRuntimeTypes";
import { Badge, Flex, Stack, Switch, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";

type RuntimeSwitchRowProps = {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  colorPalette: string;
  onChange: (next: boolean) => void;
  tokens: ThemeTokens;
};

function RuntimeSwitchRow({
  label,
  description,
  checked,
  disabled = false,
  colorPalette,
  onChange,
  tokens,
}: RuntimeSwitchRowProps) {
  return (
    <Flex
      align="center"
      justify="space-between"
      gap="3"
      py="2"
      borderBottomWidth="1px"
      borderColor={tokens.panelBorder}
      _last={{ borderBottomWidth: 0 }}
    >
      <Stack gap="0.5" flex="1" minW="0">
        <Text fontFamily="mono" fontSize="xs" fontWeight="medium" color={tokens.panelHeading}>
          {label}
        </Text>
        <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} lineHeight="1.4">
          {description}
        </Text>
      </Stack>
      <Switch.Root
        size="sm"
        colorPalette={colorPalette}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(event) => onChange(event.checked)}
      >
        <Switch.HiddenInput />
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Root>
    </Flex>
  );
}

type SignalsConfigPanelProps = {
  tokens: ThemeTokens;
  refreshKey?: number;
};

export default function SignalsConfigPanel({ tokens, refreshKey = 0 }: SignalsConfigPanelProps) {
  const { palette } = useThemeColor();
  const [controls, setControls] = useState<SignalsRuntimeControls | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSignalsRuntime();
      setControls(data);
    } catch (e) {
      console.error("[signals runtime]", e);
      setControls({ ...UNAVAILABLE_SIGNALS_RUNTIME });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const update = useCallback(
    async (patch: Partial<SignalsRuntimeControls>, key: string) => {
      setSavingKey(key);
      try {
        const result = await patchSignalsRuntime(patch);
        setControls(result);
        toaster.success({
          title: "Signals updated",
          description: result.summary,
        });
      } catch (e) {
        console.error("[signals runtime patch]", e);
        toaster.error({
          title: "Signals update failed",
          description: e instanceof Error ? e.message : "Request failed",
        });
      } finally {
        setSavingKey(null);
      }
    },
    [],
  );

  if (loading && !controls) {
    return (
      <Text fontSize="xs" fontFamily="mono" color={tokens.panelMuted}>
        Loading signals controls…
      </Text>
    );
  }

  if (!controls) {
    return null;
  }

  const unavailable = !controls.ready;
  const masterOff = !unavailable && !controls.signals_enabled;
  const busy = savingKey != null;
  const panelDisabled = unavailable || busy;
  const dayOff = panelDisabled || masterOff || !controls.a_enabled;
  const bOff = panelDisabled || masterOff || !controls.b_enabled;

  return (
    <Stack gap="3">
      {!controls.ready ? (
        <Text fontSize="2xs" fontFamily="mono" color={tokens.panelMuted} lineHeight="1.4">
          Runtime controls unavailable — restart trading-api to initialize the database.
        </Text>
      ) : null}
      <Flex align="center" justify="space-between" gap="2" flexWrap="wrap">
        <Text fontSize="xs" fontFamily="mono" color={tokens.panelMuted}>
          Live toggles — Docker keeps running; changes apply on next poll (~30s).
        </Text>
        <Badge
          colorPalette={unavailable ? "gray" : masterOff ? "orange" : "green"}
          variant="subtle"
          fontFamily="mono"
          fontSize="2xs"
        >
          {controls.summary}
        </Badge>
      </Flex>

      <Stack gap="0">
        <RuntimeSwitchRow
          label="Telegram signals"
          description="Master switch — pauses all fractal alerts and AI reads."
          checked={controls.signals_enabled}
          disabled={panelDisabled}
          colorPalette={palette}
          tokens={tokens}
          onChange={(next) => void update({ signals_enabled: next }, "signals_enabled")}
        />

        <RuntimeSwitchRow
          label="Risk desk · strict mode"
          description="On: one side only, hedge protection, max slots. Off: same side + HTF required, no hedge block. Daily loss cap applies in both modes. Profile YAML trade_with_bias (alerts+ENTER) is separate and shown on Risk Desk."
          checked={controls.risk_desk_strict}
          disabled={panelDisabled || masterOff}
          colorPalette="cyan"
          tokens={tokens}
          onChange={(next) =>
            void update({ risk_desk_strict: next }, "risk_desk_strict")
          }
        />

        <RuntimeSwitchRow
          label="Profile A signals"
          description="30m fractal band alerts — day-trade profile A scanner watchlist."
          checked={controls.a_enabled}
          disabled={panelDisabled || masterOff}
          colorPalette="orange"
          tokens={tokens}
          onChange={(next) => void update({ a_enabled: next }, "a_enabled")}
        />

        <RuntimeSwitchRow
          label="Profile A AI entry advice"
          description="Sonnet follow-up after profile A alerts only — independent from B."
          checked={controls.a_entry_advice_enabled}
          disabled={dayOff}
          colorPalette="blue"
          tokens={tokens}
          onChange={(next) =>
            void update({ a_entry_advice_enabled: next }, "a_entry_advice_enabled")
          }
        />

        <RuntimeSwitchRow
          label="Profile A auto trade"
          description="Execute on Bybit when profile A AI confirms ENTER (max 4% SL, min 1:2 RR)."
          checked={controls.a_auto_trade_enabled}
          disabled={dayOff || !controls.a_entry_advice_enabled}
          colorPalette="green"
          tokens={tokens}
          onChange={(next) =>
            void update({ a_auto_trade_enabled: next }, "a_auto_trade_enabled")
          }
        />

        <RuntimeSwitchRow
          label="Profile A trade management"
          description="Adjust SL/TP on open A-profile positions (day trade, 30m fractals)."
          checked={controls.a_trade_mgmt_enabled}
          disabled={dayOff}
          colorPalette="purple"
          tokens={tokens}
          onChange={(next) =>
            void update({ a_trade_mgmt_enabled: next }, "a_trade_mgmt_enabled")
          }
        />

        <RuntimeSwitchRow
          label="Profile A trade mgmt auto"
          description="Apply A-profile SL/TP moves on Bybit without Telegram confirm."
          checked={controls.a_trade_mgmt_auto_enabled}
          disabled={dayOff || !controls.a_trade_mgmt_enabled}
          colorPalette="green"
          tokens={tokens}
          onChange={(next) =>
            void update({ a_trade_mgmt_auto_enabled: next }, "a_trade_mgmt_auto_enabled")
          }
        />

        {IS_PROFILE_B_ACTIVE && (
          <>
            <RuntimeSwitchRow
              label="Profile B signals"
              description="30m fractal band alerts from the profile B scanner universe (12h HTF bias)."
              checked={controls.b_enabled}
              disabled={panelDisabled || masterOff}
              colorPalette="orange"
              tokens={tokens}
              onChange={(next) => void update({ b_enabled: next }, "b_enabled")}
            />

            <RuntimeSwitchRow
              label="Profile B AI entry advice"
              description="Sonnet follow-up after profile B alerts only — independent from A."
              checked={controls.b_entry_advice_enabled}
              disabled={bOff}
              colorPalette="blue"
              tokens={tokens}
              onChange={(next) =>
                void update({ b_entry_advice_enabled: next }, "b_entry_advice_enabled")
              }
            />

            <RuntimeSwitchRow
              label="Profile B auto trade"
              description="Execute on Bybit when profile B AI confirms ENTER (max 4% SL, min 1:2 RR)."
              checked={controls.b_auto_trade_enabled}
              disabled={bOff || !controls.b_entry_advice_enabled}
              colorPalette="green"
              tokens={tokens}
              onChange={(next) =>
                void update({ b_auto_trade_enabled: next }, "b_auto_trade_enabled")
              }
            />

            <RuntimeSwitchRow
              label="Profile B trade management"
              description="Adjust SL/TP on open B-profile positions (scalping, 5m fractals)."
              checked={controls.b_trade_mgmt_enabled}
              disabled={bOff}
              colorPalette="purple"
              tokens={tokens}
              onChange={(next) =>
                void update({ b_trade_mgmt_enabled: next }, "b_trade_mgmt_enabled")
              }
            />

            <RuntimeSwitchRow
              label="Profile B trade mgmt auto"
              description="Apply B-profile SL/TP moves on Bybit without Telegram confirm."
              checked={controls.b_trade_mgmt_auto_enabled}
              disabled={bOff || !controls.b_trade_mgmt_enabled}
              colorPalette="green"
              tokens={tokens}
              onChange={(next) =>
                void update({ b_trade_mgmt_auto_enabled: next }, "b_trade_mgmt_auto_enabled")
              }
            />
          </>
        )}
      </Stack>

      {controls.updated_at ? (
        <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
          Last update: {new Date(controls.updated_at).toLocaleString()}
        </Text>
      ) : null}
    </Stack>
  );
}
