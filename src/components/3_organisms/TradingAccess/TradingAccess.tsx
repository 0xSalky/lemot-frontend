"use client";

import { accent, useThemeColor } from "@/components/ui/theme-color";
import { DEFAULT_TRADING_API_URL } from "@/services/config";
import {
  clearStoredTradingCredentials,
  defaultTradingApiUrl,
  hasStoredTradingCredentials,
  saveStoredTradingCredentials,
  TRADING_CREDENTIALS_INVALID_EVENT,
} from "@/services/tradingCredentials";
import { Box, Button, Input, Stack, Text } from "@chakra-ui/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type TradingAccessContextValue = {
  serverConfigured: boolean;
  signOut: () => void;
};

const TradingAccessContext = createContext<TradingAccessContextValue | null>(null);

export function useTradingAccess(): TradingAccessContextValue {
  const ctx = useContext(TradingAccessContext);
  if (!ctx) {
    throw new Error("useTradingAccess must be used within TradingAccessProvider");
  }
  return ctx;
}

type Phase = "checking" | "gate" | "ready";

function formatConnectError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;
    if (typeof record.message === "string") return record.message;
    if (typeof record.error === "string") return record.error;
  }
  return status === 401 ? "Invalid API key" : `Connection failed (HTTP ${status})`;
}

export function TradingAccessProvider({ children }: { children: ReactNode }) {
  const { palette } = useThemeColor();
  const [phase, setPhase] = useState<Phase>("checking");
  const [serverConfigured, setServerConfigured] = useState(false);
  const [apiUrl, setApiUrl] = useState(defaultTradingApiUrl());
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const unlockIfPossible = useCallback(async () => {
    const statusRes = await fetch("/api/auth/status", { cache: "no-store" });
    const status = (await statusRes.json()) as { serverConfigured?: boolean };

    if (status.serverConfigured) {
      setServerConfigured(true);
      setPhase("ready");
      return;
    }

    setServerConfigured(false);
    if (hasStoredTradingCredentials()) {
      setPhase("ready");
      return;
    }

    setPhase("gate");
  }, []);

  useEffect(() => {
    let cancelled = false;

    void unlockIfPossible().catch(() => {
      if (!cancelled) setPhase("gate");
    });

    return () => {
      cancelled = true;
    };
  }, [unlockIfPossible]);

  useEffect(() => {
    const onInvalid = () => {
      setApiKey("");
      setError("Session expired or invalid API key. Connect again.");
      setPhase("gate");
    };

    window.addEventListener(TRADING_CREDENTIALS_INVALID_EVENT, onInvalid);
    return () => window.removeEventListener(TRADING_CREDENTIALS_INVALID_EVENT, onInvalid);
  }, []);

  const signOut = useCallback(() => {
    clearStoredTradingCredentials();
    setApiKey("");
    setError(null);
    setPhase("gate");
  }, []);

  const handleConnect = () => {
    const trimmedUrl = apiUrl.trim();
    const trimmedKey = apiKey.trim();

    if (!trimmedUrl || !trimmedKey) {
      setError("API URL and key are both required.");
      return;
    }

    setConnecting(true);
    setError(null);

    void fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiUrl: trimmedUrl, apiKey: trimmedKey }),
    })
      .then(async (res) => {
        const data: unknown = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(formatConnectError(data, res.status));
        }

        saveStoredTradingCredentials({ apiUrl: trimmedUrl, apiKey: trimmedKey });
        setApiKey("");
        setPhase("ready");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Connection failed");
      })
      .finally(() => setConnecting(false));
  };

  const contextValue = useMemo(
    () => ({ serverConfigured, signOut }),
    [serverConfigured, signOut],
  );

  if (phase === "checking") {
    return (
      <Stack flex="1" align="center" justify="center" py="12">
        <Text fontFamily="mono" fontSize="sm" color="fg.muted">
          Loading…
        </Text>
      </Stack>
    );
  }

  if (phase === "gate") {
    return (
      <Stack flex="1" align="center" justify="center" py={{ base: "6", md: "12" }} px="2">
        <Box
          w="100%"
          maxW="24rem"
          borderWidth="1px"
          borderColor="border.emphasized"
          rounded="md"
          bg="bg.subtle"
          p={{ base: "4", md: "5" }}
        >
          <Stack gap="4">
            <Stack gap="1">
              <Text fontFamily="mono" fontSize="sm" fontWeight="semibold" color={accent(palette, 200)}>
                Connect to trading API
              </Text>
              <Text fontFamily="mono" fontSize="xs" color="fg.muted" lineHeight="1.6">
                Credentials are saved on this device only and sent to your backend over HTTPS
                when you use the app.
              </Text>
            </Stack>

            <Stack gap="2">
              <Text fontFamily="mono" fontSize="2xs" color={accent(palette, 400)}>
                API URL
              </Text>
              <Input
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder={DEFAULT_TRADING_API_URL}
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                fontFamily="mono"
                fontSize="sm"
                size="md"
              />
            </Stack>

            <Stack gap="2">
              <Text fontFamily="mono" fontSize="2xs" color={accent(palette, 400)}>
                API key
              </Text>
              <Input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type="password"
                autoComplete="off"
                placeholder="Paste TRADING_API_KEY"
                fontFamily="mono"
                fontSize="sm"
                size="md"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConnect();
                }}
              />
            </Stack>

            {error ? (
              <Text fontFamily="mono" fontSize="xs" color="red.400">
                {error}
              </Text>
            ) : null}

            <Button
              size="md"
              w="100%"
              colorPalette={palette}
              fontFamily="mono"
              loading={connecting}
              onClick={handleConnect}
            >
              Connect
            </Button>
          </Stack>
        </Box>
      </Stack>
    );
  }

  return (
    <TradingAccessContext.Provider value={contextValue}>
      {children}
    </TradingAccessContext.Provider>
  );
}
