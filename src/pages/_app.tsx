import AppLayout from "@/components/4_layouts/AppLayout/AppLayout";
import { ColorModeProvider } from "@/components/ui/color-mode";
import { ThemeColorProvider } from "@/components/ui/theme-color";
import { system } from "@/theme/chakraTheme";
import { ChakraProvider } from "@chakra-ui/react";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider>
        <ThemeColorProvider>
          <AppLayout>
            <Component {...pageProps} />
          </AppLayout>
        </ThemeColorProvider>
      </ColorModeProvider>
    </ChakraProvider>);
}
