import type {
    ScannerChatMessageRow,
    ScannerChatThreadRow,
} from "@/types/scannerChatTypes";
import {
    fetchScannerChatThread,
    fetchScannerChatThreads,
    messageHasDollarTicker,
    sendScannerChatMessage,
} from "@/services/scannerChatUtils";
import { formatUtcIsoLocal } from "@/services/scannerUtils";
import { Box, Button, Stack, Text, Textarea } from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";

const CHAT_TEXT = {
    fontFamily: "mono",
    fontSize: "xs",
    lineHeight: "1.75",
} as const;

function MessageBubble({ message }: { message: ScannerChatMessageRow }) {
    const isUser = message.role === "user";

    return (
        <Box
            alignSelf={isUser ? "flex-end" : "flex-start"}
            maxW="95%"
            px="3"
            py="2"
            rounded="md"
            bg={isUser ? "purple.900" : "purple.950/60"}
            borderWidth="1px"
            borderColor={isUser ? "purple.700" : "purple.800"}
        >
            <Text {...CHAT_TEXT} color="purple.300" mb="1" fontSize="2xs">
                {isUser ? "you" : "ai"} · {formatUtcIsoLocal(message.created_at)}
            </Text>
            <Text
                {...CHAT_TEXT}
                color="purple.50"
                whiteSpace="pre-wrap"
                wordBreak="break-word"
            >
                {message.content}
            </Text>
        </Box>
    );
}

const ScannerChat = () => {
    const [threads, setThreads] = useState<ScannerChatThreadRow[]>([]);
    const [threadId, setThreadId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ScannerChatMessageRow[]>([]);
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(false);
    const [bootLoading, setBootLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    const canSend = messageHasDollarTicker(draft) && !loading;

    const scrollToBottom = useCallback(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    const loadThread = useCallback(async (id: number) => {
        const payload = await fetchScannerChatThread(id);
        setThreadId(id);
        setMessages(payload.messages);
    }, []);

    const refreshThreads = useCallback(async () => {
        const payload = await fetchScannerChatThreads();
        setThreads(payload.threads);
        return payload.threads;
    }, []);

    useEffect(() => {
        void refreshThreads()
            .catch((e) => console.error("[chat threads]", e))
            .finally(() => setBootLoading(false));
    }, [refreshThreads]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading, scrollToBottom]);

    const startNewChat = () => {
        setThreadId(null);
        setMessages([]);
        setDraft("");
        setError(null);
    };

    const selectThread = (id: number) => {
        setError(null);
        void loadThread(id).catch((e) => {
            console.error("[chat thread]", e);
            setError(e instanceof Error ? e.message : "Failed to load thread");
        });
    };

    const handleSend = () => {
        const text = draft.trim();
        if (!text || !messageHasDollarTicker(text) || loading) return;

        setError(null);
        setLoading(true);

        void sendScannerChatMessage(text, threadId)
            .then((result) => {
                setThreadId(result.thread_id);
                setMessages(result.messages);
                setDraft("");
                return refreshThreads();
            })
            .catch((e) => {
                console.error("[chat send]", e);
                setError(e instanceof Error ? e.message : "Chat failed");
            })
            .finally(() => setLoading(false));
    };

    return (
        <Stack gap="3" w="100%">
            <Box
                borderWidth="1px"
                borderColor="purple.800"
                rounded="md"
                p="3"
                bg="purple.950/30"
            >
                <Text {...CHAT_TEXT} color="purple.200">
                    Ask about any pair using <Text as="span" color="purple.100">$TICKER</Text>{" "}
                    (e.g. &quot;Is $SOL a good long into support?&quot;). Up to 3 pairs per
                    message. Fresh HTF levels are scanned before each answer.
                </Text>
            </Box>

            <Stack direction="row" gap="2" flexWrap="wrap" align="center">
                <Button size="xs" variant="outline" colorPalette="purple" onClick={startNewChat}>
                    New chat
                </Button>
                {bootLoading ? (
                    <Text {...CHAT_TEXT} color="fg.muted">
                        Loading threads…
                    </Text>
                ) : threads.length === 0 ? (
                    <Text {...CHAT_TEXT} color="fg.muted">
                        No saved chats yet
                    </Text>
                ) : (
                    threads.slice(0, 8).map((thread) => (
                        <Button
                            key={thread.id}
                            size="xs"
                            variant={threadId === thread.id ? "solid" : "outline"}
                            colorPalette="purple"
                            onClick={() => selectThread(thread.id)}
                        >
                            {thread.title?.trim() || `Chat #${thread.id}`}
                        </Button>
                    ))
                )}
            </Stack>

            {messages.length > 0 || loading ? (
                <Box
                    borderWidth="1px"
                    borderColor="border.emphasized"
                    rounded="md"
                    minH="6rem"
                    maxH="40vh"
                    overflowY="auto"
                    p="3"
                    bg="bg.subtle"
                >
                    <Stack gap="3">
                        {messages.map((msg) => (
                            <MessageBubble key={msg.id} message={msg} />
                        ))}
                        {loading ? (
                            <Text {...CHAT_TEXT} color="purple.300">
                                Scanning levels and asking AI…
                            </Text>
                        ) : null}
                        <Box ref={bottomRef} />
                    </Stack>
                </Box>
            ) : (
                <Text {...CHAT_TEXT} color="fg.muted" px="1">
                    Start with a question that includes $SOL, $ETH, etc.
                </Text>
            )}

            <Stack gap="2">
                <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="e.g. Is $SOL a good long if $BTC holds support?"
                    rows={3}
                    fontFamily="mono"
                    fontSize="xs"
                    disabled={loading}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (canSend) handleSend();
                        }
                    }}
                />
                <Stack direction="row" gap="2" align="center" justify="space-between">
                    <Text {...CHAT_TEXT} color={canSend ? "green.400" : "fg.muted"}>
                        {canSend
                            ? "Ready to send"
                            : "Include at least one $pair to send"}
                    </Text>
                    <Button
                        size="sm"
                        colorPalette="purple"
                        loading={loading}
                        disabled={!canSend}
                        onClick={handleSend}
                    >
                        Send
                    </Button>
                </Stack>
                {error ? (
                    <Text {...CHAT_TEXT} color="red.400">
                        {error}
                    </Text>
                ) : null}
            </Stack>
        </Stack>
    );
};

export default ScannerChat;
