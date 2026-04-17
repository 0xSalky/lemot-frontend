import { Button, Stack } from "@chakra-ui/react";
import { useState } from "react";

const AccountBalance = () => {
    const [balance, setBalance] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);

    const fetchBalance = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/account/balance", { cache: "no-store" });
            const raw = await res.text();

            let data: unknown = {};
            try {
                data = raw ? JSON.parse(raw) : {};
            } catch {
                data = { message: raw || `HTTP ${res.status}` };
            }
            console.log(data);
            setBalance((data as { balance: { total_equity: number } })?.balance?.total_equity
            );
            setLoading(false);
        } catch (error) {
            setLoading(false);
            console.error("Failed to fetch account balance:", error);
        }
    };

    return (
        <Stack direction="row" gap="1rem" justify="flex-end">
            <Button size="xs" variant="outline" onClick={fetchBalance} loading={loading}>Balance {balance?.toFixed(2)}</Button>
        </Stack>
    );
}

export default AccountBalance;