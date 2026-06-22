"use client";

import type { ThemeTokens } from "@/components/ui/theme-color";
import { useThemeColor } from "@/components/ui/theme-color";
import { toaster } from "@/components/ui/toaster";
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
};

export default function SignalsConfigPanel({ tokens }: SignalsConfigPanelProps) {
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
  }, [load]);

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
          description="Master switch — pauses fractal alerts and AI reads while you sleep."
          checked={controls.signals_enabled}
          disabled={panelDisabled}
          colorPalette={palette}
          tokens={tokens}
          onChange={(next) => void update({ signals_enabled: next }, "signals_enabled")}
        />

        <RuntimeSwitchRow
          label="AI entry advice"
          description="Sonnet follow-up after each alert. Alerts can stay on with AI off."
          checked={controls.entry_advice_enabled}
          disabled={panelDisabled || masterOff}
          colorPalette="blue"
          tokens={tokens}
          onChange={(next) => void update({ entry_advice_enabled: next }, "entry_advice_enabled")}
        />

        <RuntimeSwitchRow
          label="Day signals"
          description="30m fractal band alerts from the day scanner watchlist."
          checked={controls.day_enabled}
          disabled={panelDisabled || masterOff}
          colorPalette="orange"
          tokens={tokens}
          onChange={(next) => void update({ day_enabled: next }, "day_enabled")}
        />

        <RuntimeSwitchRow
          label="Swing signals"
          description="1h fractal band alerts from the swing scanner universe."
          checked={controls.swing_enabled}
          disabled={panelDisabled || masterOff}
          colorPalette="orange"
          tokens={tokens}
          onChange={(next) => void update({ swing_enabled: next }, "swing_enabled")}
        />
      </Stack>

      {controls.updated_at ? (
        <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
          Last update: {new Date(controls.updated_at).toLocaleString()}
        </Text>
      ) : null}
    </Stack>
  );
}
