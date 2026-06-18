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
import ChatMarkdown from "@/components/2_molecules/ChatMarkdown/ChatMarkdown";
import { accent, useThemeColor } from "@/components/ui/theme-color";
import { Box, Button, Flex, Separator, Stack, Text, Textarea } from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";

const MONO = {
    fontFamily: "mono",
    fontSize: "xs",
    lineHeight: "1.7",
} as const;

function MessageBubble({
    message,
    palette,
}: {
    message: ScannerChatMessageRow;
    palette: ReturnType<typeof useThemeColor>["palette"];
}) {
    const isUser = message.role === "user";

    return (
        <Box alignSelf={isUser ? "flex-end" : "stretch"} maxW={isUser ? "88%" : "100%"}>
            <Text {...MONO} color="fg.muted" fontSize="2xs" mb="1" textAlign={isUser ? "right" : "left"}>
                {isUser ? "You" : "AI"} · {formatUtcIsoLocal(message.created_at)}
            </Text>
            <Box
                px="3"
                py="2.5"
                rounded="md"
                bg={isUser ? accent(palette, "950/50") : accent(palette, "950/40")}
                borderWidth="1px"
                borderColor={accent(palette, 800)}
            >
                {isUser ? (
                    <Text
                        {...MONO}
                        color={accent(palette, 100)}
                        whiteSpace="pre-wrap"
                        wordBreak="break-word"
                    >
                        {message.content}
                    </Text>
                ) : (
                    <ChatMarkdown content={message.content} />
                )}
            </Box>
        </Box>
    );
}

const ScannerChat = () => {
    const { palette } = useThemeColor();
    const [threads, setThreads] = useState<ScannerChatThreadRow[]>([]);
    const [threadId, setThreadId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ScannerChatMessageRow[]>([]);
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(false);
    const [bootLoading, setBootLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    const canSend = messageHasDollarTicker(draft) && !loading;
    const hasTranscript = messages.length > 0 || loading;

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
        let cancelled = false;

        void fetchScannerChatThreads()
            .then((payload) => {
                if (!cancelled) setThreads(payload.threads);
            })
            .catch((e) => {
                if (!cancelled) console.error("[chat threads]", e);
            })
            .finally(() => {
                if (!cancelled) setBootLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

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

    const inputSection = (
        <Stack gap="2">
            <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="$BTC $HYPE — is this a good short?"
                rows={2}
                resize="none"
                fontFamily="mono"
                fontSize="xs"
                bg="transparent"
                borderColor="border.emphasized"
                disabled={loading}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (canSend) handleSend();
                    }
                }}
            />
            <Flex align="center" justify="space-between" gap="2">
                <Text {...MONO} fontSize="2xs" color={canSend ? "green.400" : "fg.muted"}>
                    {canSend ? "Ready" : "Need $pair"}
                </Text>
                <Button
                    size="sm"
                    colorPalette={palette}
                    loading={loading}
                    disabled={!canSend}
                    onClick={handleSend}
                >
                    Send
                </Button>
            </Flex>
            {error ? (
                <Text {...MONO} fontSize="2xs" color="red.400">
                    {error}
                </Text>
            ) : null}
        </Stack>
    );

    return (
        <Flex
            w="100%"
            direction="column"
            borderWidth="1px"
            borderColor="border.emphasized"
            rounded="md"
            overflow="hidden"
            bg="bg.subtle"
            minH={hasTranscript ? "calc(100vh - 6.5rem)" : undefined}
            maxH={hasTranscript ? "calc(100vh - 6.5rem)" : undefined}
        >
            {/* threads */}
            <Flex
                px="3"
                py="2"
                gap="2"
                flexWrap="wrap"
                align="center"
                borderBottomWidth="1px"
                borderColor="border.emphasized"
                flexShrink={0}
            >
                <Button
                    size="xs"
                    variant={threadId === null && messages.length === 0 ? "solid" : "outline"}
                    colorPalette={palette}
                    onClick={startNewChat}
                >
                    New
                </Button>
                {bootLoading ? (
                    <Text {...MONO} color="fg.muted">
                        …
                    </Text>
                ) : (
                    threads.slice(0, 10).map((thread) => (
                        <Button
                            key={thread.id}
                            size="xs"
                            variant={threadId === thread.id ? "solid" : "ghost"}
                            colorPalette={palette}
                            onClick={() => selectThread(thread.id)}
                        >
                            {thread.title?.trim() || `#${thread.id}`}
                        </Button>
                    ))
                )}
            </Flex>

            {hasTranscript ? (
                <>
                    <Box flex="1" minH="0" overflowY="auto" px="3" py="3">
                        <Stack gap="4">
                            {messages.map((msg) => (
                                <MessageBubble key={msg.id} message={msg} palette={palette} />
                            ))}
                            {loading ? (
                                <Text {...MONO} color={accent(palette, 400)}>
                                    Scanning & thinking…
                                </Text>
                            ) : null}
                            <Box ref={bottomRef} />
                        </Stack>
                    </Box>

                    <Box flexShrink={0} borderTopWidth="1px" borderColor="border.emphasized" bg="bg.subtle" px="3" py="3">
                        {inputSection}
                    </Box>
                </>
            ) : (
                <>
                    <Box px="3" py="3">
                        <Text {...MONO} color="fg.muted">
                            Ask with <Text as="span" color={accent(palette, 300)}>$TICKER</Text> — e.g. $SOL $BTC
                        </Text>
                    </Box>
                    <Separator />
                    <Box px="3" py="3">{inputSection}</Box>
                </>
            )}
        </Flex>
    );
};

export default ScannerChat;
