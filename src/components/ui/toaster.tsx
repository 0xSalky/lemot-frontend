"use client";

import { useThemeTokens, type ThemeTokens } from "@/components/ui/theme-color";
import {
  Toaster as ChakraToaster,
  Portal,
  Spinner,
  Stack,
  Toast,
  createToaster,
} from "@chakra-ui/react";

export const toaster = createToaster({
  placement: "bottom-end",
  pauseOnPageIdle: true,
});

function toastSurface(
  type: string | undefined,
  tokens: ThemeTokens,
): { bg: string; borderColor: string; boxShadow: string } {
  const base = {
    bg: tokens.panelBgUser,
    borderColor: tokens.panelBorder,
    boxShadow: tokens.panelGlow,
  };

  switch (type) {
    case "success":
      return { ...base, borderColor: tokens.tagGreen.border };
    case "error":
      return { ...base, borderColor: tokens.tagRed.border };
    case "warning":
      return { ...base, borderColor: tokens.warn };
    case "info":
      return { ...base, borderColor: tokens.tagAccent.border };
    default:
      return base;
  }
}

export const Toaster = () => {
  const tokens = useThemeTokens();

  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: "4" }}>
        {(toast) => {
          const surface = toastSurface(toast.type, tokens);
          return (
            <Toast.Root
              width={{ md: "sm" }}
              bg={surface.bg}
              borderWidth="1px"
              borderColor={surface.borderColor}
              boxShadow={surface.boxShadow}
              backdropFilter="blur(10px)"
            >
              {toast.type === "loading" ? (
                <Spinner size="sm" color={tokens.panelHeading} />
              ) : (
                <Toast.Indicator />
              )}
              <Stack gap="1" flex="1" maxWidth="100%">
                {toast.title && (
                  <Toast.Title
                    fontFamily="mono"
                    fontSize="sm"
                    fontWeight="semibold"
                    color={tokens.panelHeading}
                  >
                    {toast.title}
                  </Toast.Title>
                )}
                {toast.description && (
                  <Toast.Description
                    fontFamily="mono"
                    fontSize="xs"
                    color={tokens.panelBody}
                    lineHeight="1.45"
                  >
                    {toast.description}
                  </Toast.Description>
                )}
              </Stack>
              {toast.action && (
                <Toast.ActionTrigger>{toast.action.label}</Toast.ActionTrigger>
              )}
              {toast.closable && <Toast.CloseTrigger />}
            </Toast.Root>
          );
        }}
      </ChakraToaster>
    </Portal>
  );
};
