import AssetInterface from "@/components/3_organisms/AssetInterface/AssetInterface";
import { TRADING_PAIRS } from "@/services/config";
import { Stack } from "@chakra-ui/react";

const HomePage = () => {
    return (
        <Stack mt="1rem">
            {TRADING_PAIRS.map((pair: string) => (
                <AssetInterface key={pair} pair={pair} />
            ))}
        </Stack>
    );
}

export default HomePage;