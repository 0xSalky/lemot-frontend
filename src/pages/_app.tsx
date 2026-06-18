import AppLayout from "@/components/4_layouts/AppLayout/AppLayout";
import { TradingAccessProvider } from "@/components/3_organisms/TradingAccess/TradingAccess";
import { ColorModeProvider } from "@/components/ui/color-mode";
import { ThemeColorProvider } from "@/components/ui/theme-color";
import { ThemeSkinProvider } from "@/components/ui/theme-skin";
import { system } from "@/theme/chakraTheme";
import "@/styles/theme-shared.css";
import "@/styles/themes/tokyo-night.css";
import "@/styles/themes/vegas-heat.css";
import "@/styles/themes/hacker-terminal.css";
import "@/styles/mobile-inputs.css";
import { ChakraProvider } from "@chakra-ui/react";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider>
        <ThemeSkinProvider>
          <ThemeColorProvider>
            <TradingAccessProvider>
              <AppLayout>
                <Component {...pageProps} />
              </AppLayout>
            </TradingAccessProvider>
          </ThemeColorProvider>
        </ThemeSkinProvider>
      </ColorModeProvider>
    </ChakraProvider>);
}
