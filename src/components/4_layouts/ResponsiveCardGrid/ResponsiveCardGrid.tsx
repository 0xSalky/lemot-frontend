import { CARD_WIDTH } from "@/services/config";
import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

type ResponsiveCardGridProps = {
    children: ReactNode;
    gap?: string;
};

/**
 * 1 column on narrow viewports; adds columns as space allows (typically 2–3 on desktop).
 * Each column targets CARD_WIDTH (31rem) minimum when there is room.
 */
const ResponsiveCardGrid = ({ children, gap = "1rem" }: ResponsiveCardGridProps) => {
    return (
        <Box
            display="grid"
            w="100%"
            gap={gap}
            alignItems="start"
            gridTemplateColumns={`repeat(auto-fill, minmax(min(100%, ${CARD_WIDTH}), 1fr))`}
        >
            {children}
        </Box>
    );
};

export default ResponsiveCardGrid;
