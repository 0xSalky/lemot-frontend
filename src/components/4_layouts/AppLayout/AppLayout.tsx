import { Flex, Theme } from "@chakra-ui/react";
import { useColorMode } from "@/components/ui/color-mode";
import { Toaster } from "@/components/ui/toaster";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { colorMode } = useColorMode();

  return (
    <>
      <Toaster />
      <Theme appearance={colorMode} suppressHydrationWarning>
        <Flex
          flexDirection="column"
          alignItems="stretch"
          minHeight="100vh"
          w="100%"
          maxW="100%"
          px={{
            base: "1rem",
            md: "1.5rem",
            lg: "2rem",
          }}
        >
          {children}
        </Flex>
      </Theme>
    </>
  );
};

export default AppLayout;
