"use client";

import type { ProfileFilter } from "@/components/2_molecules/ProfileSubTabs/ProfileSubTabs";
import { formatUsd } from "@/components/3_organisms/TradeJournalPanel/journalFormat";
import type { ThemeTokens } from "@/components/ui/theme-color";
import { profileAccountPayload } from "@/hooks/useProfileBalances";
import type { AccountBalanceResponse } from "@/types/accountBalanceTypes";
import { Box, Flex, Spinner, Stack, Text } from "@chakra-ui/react";

function profileAccent(tokens: ThemeTokens, profile: "a" | "b"): string {
  return profile === "b" ? tokens.tagBlue.color : tokens.panelLabel;
}

function ProfileBalanceRow({
  profile,
  balances,
  riskPercent,
  tokens,
}: {
  profile: "a" | "b";
  balances: AccountBalanceResponse | null;
  riskPercent?: number;
  tokens: ThemeTokens;
}) {
  const account = profileAccountPayload(balances, profile);
  const accent = profileAccent(tokens, profile);
  const equity = account?.balance.total_equity ?? 0;
  const available = account?.balance.available_balance ?? 0;
  const unrealized = account?.balance.total_unrealized_pnl ?? 0;
  const configured = account?.configured ?? false;
  const oneR =
    riskPercent != null && riskPercent > 0 && equity > 0
      ? equity * (riskPercent / 100)
      : null;

  return (
    <Flex
      gap={{ base: "2", md: "3" }}
      align="center"
      flexWrap="wrap"
      fontFamily="mono"
      fontSize="2xs"
      color={tokens.panelMuted}
    >
      <Text color={accent} fontWeight="bold" letterSpacing="0.12em" minW="1.25rem">
        {profile.toUpperCase()}
      </Text>
      {!configured ? (
        <Text color={tokens.warn}>not configured</Text>
      ) : !account?.success || equity <= 0 ? (
        <Text color={tokens.warn}>balance unavailable</Text>
      ) : (
        <>
          <Stack gap="0" minW="4.5rem">
            <Text>equity</Text>
            <Text color={tokens.panelBody} fontWeight="semibold">
              {formatUsd(equity)}
            </Text>
          </Stack>
          <Stack gap="0" minW="4.5rem">
            <Text>available</Text>
            <Text color={tokens.panelBody}>{formatUsd(available)}</Text>
          </Stack>
          <Stack gap="0" minW="4.5rem">
            <Text>unrealized</Text>
            <Text
              color={
                unrealized > 0
                  ? tokens.tagGreen.color
                  : unrealized < 0
                    ? "red.400"
                    : tokens.panelBody
              }
            >
              {formatUsd(unrealized)}
            </Text>
          </Stack>
          {oneR != null ? (
            <Stack gap="0" minW="4rem">
              <Text>1R</Text>
              <Text color={tokens.panelBody}>
                {formatUsd(oneR)}
                {riskPercent != null ? ` (${riskPercent}%)` : ""}
              </Text>
            </Stack>
          ) : null}
        </>
      )}
    </Flex>
  );
}

type ProfileBalancesStripProps = {
  balances: AccountBalanceResponse | null;
  profileFilter: ProfileFilter;
  riskPercent?: number;
  loading?: boolean;
  tokens: ThemeTokens;
};

export default function ProfileBalancesStrip({
  balances,
  profileFilter,
  riskPercent,
  loading = false,
  tokens,
}: ProfileBalancesStripProps) {
  const profiles: Array<"a" | "b"> =
    profileFilter === "all" ? ["a", "b"] : [profileFilter];

  if (loading && !balances) {
    return (
      <Flex align="center" gap="2" py="1">
        <Spinner size="xs" color={tokens.panelMuted} />
        <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
          loading balances…
        </Text>
      </Flex>
    );
  }

  return (
    <Stack gap="2">
      {profiles.map((profile, index) => (
        <Box
          key={profile}
          borderTopWidth={index > 0 ? "1px" : undefined}
          borderColor={tokens.panelBorder}
          pt={index > 0 ? "2" : undefined}
        >
          <ProfileBalanceRow
            profile={profile}
            balances={balances}
            riskPercent={riskPercent}
            tokens={tokens}
          />
        </Box>
      ))}
    </Stack>
  );
}
