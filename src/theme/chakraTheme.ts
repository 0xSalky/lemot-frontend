import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  theme: {
    breakpoints: {
      sm: "375px",
      md: "768px",
      lg: "1050px",
      xl: "1700px",
      "2xl": "2000px",
    },
    semanticTokens: {
      colors: {
        bg: {
          value: {
            _light: "var(--app-bg)",
            _dark: "var(--app-bg)",
          },
        },
        "bg.subtle": {
          value: {
            _light: "var(--app-surface)",
            _dark: "var(--app-surface)",
          },
        },
        fg: {
          value: {
            _light: "var(--app-text)",
            _dark: "var(--app-text)",
          },
        },
        "fg.muted": {
          value: {
            _light: "var(--app-muted)",
            _dark: "var(--app-muted)",
          },
        },
        border: {
          value: {
            _light: "var(--app-border)",
            _dark: "var(--app-border)",
          },
        },
        "border.emphasized": {
          value: {
            _light: "var(--app-border-strong)",
            _dark: "var(--app-border-strong)",
          },
        },
      },
    },
  },
  globalCss: {
    body: {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
    a: {
      outline: "none",
      textDecoration: "none",
      _focus: { outline: "none", boxShadow: "none" },
      _hover: { textDecoration: "none" },
    },
  },
});

export const system = createSystem(defaultConfig, config);
