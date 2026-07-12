import { CONTENT_MAX_WIDTH } from "@/services/config";
import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

type ResponsiveCardGridProps = {
    children: ReactNode;
    gap?: string;
};

/** Single column; width capped at CONTENT_MAX_WIDTH. */
const ResponsiveCardGrid = ({ children, gap = "1rem" }: ResponsiveCardGridProps) => {
    return (
        <Box
            display="grid"
            w="100%"
            maxW={CONTENT_MAX_WIDTH}
            mx="auto"
            gap={gap}
            alignItems="start"
            gridTemplateColumns="1fr"
        >
            {children}
        </Box>
    );
};

export default ResponsiveCardGrid;
