import AppLayout from "@/components/4_layouts/AppLayout/AppLayout";
import { TradingAccessProvider } from "@/components/3_organisms/TradingAccess/TradingAccess";
import { ColorModeProvider } from "@/components/ui/color-mode";
import { ThemeColorProvider } from "@/components/ui/theme-color";
import { system } from "@/theme/chakraTheme";
import "@/styles/mobile-inputs.css";
import { ChakraProvider } from "@chakra-ui/react";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider>
        <ThemeColorProvider>
          <TradingAccessProvider>
            <AppLayout>
              <Component {...pageProps} />
            </AppLayout>
          </TradingAccessProvider>
        </ThemeColorProvider>
      </ColorModeProvider>
    </ChakraProvider>);
}
