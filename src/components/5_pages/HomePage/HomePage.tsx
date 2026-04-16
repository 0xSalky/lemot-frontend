import AccountBalance from "@/components/3_organisms/AccountBalance/AccountBalance";
import AssetInterface from "@/components/3_organisms/AssetInterface/AssetInterface";
import { TRADING_PAIRS } from "@/services/config";
import { Stack } from "@chakra-ui/react";

const HomePage = () => {
    return (
        <Stack mt="1rem" gap="1rem" mb="1rem" w="30rem">
            {TRADING_PAIRS.map((pair: string) => (
                <AssetInterface key={pair} pair={pair} />
            ))}
            <AccountBalance />
        </Stack>
    );
}

export default HomePage;