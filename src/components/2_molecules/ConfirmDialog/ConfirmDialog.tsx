"use client";

import { useThemeTokens } from "@/components/ui/theme-color";
import { Box, Button, Flex, Portal, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColorPalette?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmColorPalette = "blue",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const tokens = useThemeTokens();

  if (!open) return null;

  return (
    <Portal>
      <Box
        position="fixed"
        inset="0"
        bg="blackAlpha.700"
        zIndex={1500}
        onClick={onCancel}
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
          aria-labelledby="confirm-dialog-title"
          pointerEvents="auto"
          w="full"
          maxW="22rem"
          p="4"
          rounded="md"
          borderWidth="1px"
          borderColor={tokens.panelBorder}
          bg={tokens.panelBgUser}
          boxShadow={`0 12px 40px ${tokens.panelBorder}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Stack gap="4">
            <Stack gap="2">
              <Text
                id="confirm-dialog-title"
                fontFamily="mono"
                fontSize="sm"
                fontWeight="bold"
                color={tokens.title}
              >
                {title}
              </Text>
              <Text fontFamily="mono" fontSize="xs" color={tokens.panelBody} lineHeight="1.5">
                {description}
              </Text>
            </Stack>
            <Flex gap="2" justify="flex-end" flexWrap="wrap">
              <Button
                size="sm"
                variant="ghost"
                fontFamily="mono"
                color={tokens.panelMuted}
                onClick={onCancel}
                disabled={loading}
              >
                {cancelLabel}
              </Button>
              <Button
                size="sm"
                variant="solid"
                colorPalette={confirmColorPalette}
                fontFamily="mono"
                loading={loading}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </Flex>
          </Stack>
        </Box>
      </Flex>
    </Portal>
  );
}
