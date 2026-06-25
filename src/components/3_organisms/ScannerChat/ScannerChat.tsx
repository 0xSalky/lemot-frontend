import type {
    ScannerChatMessageRow,
    ScannerChatStructuredBlock,
    ScannerChatThreadRow,
} from "@/types/scannerChatTypes";
import {
    draftValidationError,
    fetchScannerChatThread,
    fetchScannerChatThreads,
    messageHasDollarTicker,
    progressLabel,
    sendScannerChatMessageStream,
} from "@/services/scannerChatUtils";
import { formatUtcIsoLocal, scannerProfileLabel, type ScannerProfile } from "@/services/scannerUtils";
import ChatMarkdown from "@/components/2_molecules/ChatMarkdown/ChatMarkdown";
import ChatMessageText from "@/components/2_molecules/ChatMessageText/ChatMessageText";
import ChatScanSummary from "@/components/2_molecules/ChatScanSummary/ChatScanSummary";
import ChatStructuredBlock from "@/components/2_molecules/ChatStructuredBlock/ChatStructuredBlock";
import { useThemeColor, useThemeTokens } from "@/components/ui/theme-color";
import { themedPanelStyle } from "@/components/ui/themed-panel";
import { Box, Button, Flex, Separator, Stack, Text, Textarea } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MONO = {
    fontFamily: "mono",
    fontSize: "xs",
    lineHeight: "1.7",
} as const;

function MessageBubble({
    message,
    tokens,
    streamingText,
}: {
    message: ScannerChatMessageRow;
    tokens: ReturnType<typeof useThemeTokens>;
    streamingText?: string;
}) {
    const isUser = message.role === "user";
    const scanSummaries = Array.isArray(message.context?.scan_summaries)
        ? message.context.scan_summaries
        : [];
    const structured = message.context?.structured as ScannerChatStructuredBlock | null | undefined;
    const body = streamingText ?? message.content;

    return (
        <Box alignSelf={isUser ? "flex-end" : "stretch"} maxW={isUser ? "88%" : "100%"}>
            <Text {...MONO} color="fg.muted" fontSize="2xs" mb="1" textAlign={isUser ? "right" : "left"}>
                {isUser ? "You" : "AI"}
                {message.profile ? ` · ${scannerProfileLabel(message.profile)}` : ""}
                {" · "}
                {formatUtcIsoLocal(message.created_at)}
            </Text>
            <Box
                {...themedPanelStyle(tokens)}
                px="3"
                py="2.5"
                rounded="md"
                bg={isUser ? tokens.panelBgUser : tokens.panelBg}
            >
                {isUser ? (
                    <ChatMessageText content={message.content} tokens={tokens} />
                ) : (
                    <>
                        <ChatScanSummary summaries={scanSummaries} tokens={tokens} />
                        <ChatStructuredBlock
                            structured={structured}
                            tokens={tokens}
                            profile={
                                message.profile === "day" || message.profile === "swing"
                                    ? message.profile
                                    : null
                            }
                        />
                        <ChatMarkdown content={body} />
                    </>
                )}
            </Box>
        </Box>
    );
}

const ScannerChat = () => {
    const { palette } = useThemeColor();
    const tokens = useThemeTokens(palette);
    const [threads, setThreads] = useState<ScannerChatThreadRow[]>([]);
    const [threadId, setThreadId] = useState<number | null>(null);
    const [lockedProfile, setLockedProfile] = useState<ScannerProfile | null>(null);
    const [messages, setMessages] = useState<ScannerChatMessageRow[]>([]);
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(false);
    const [bootLoading, setBootLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [progressText, setProgressText] = useState<string | null>(null);
    const [streamReply, setStreamReply] = useState("");
    const bottomRef = useRef<HTMLDivElement | null>(null);

    const draftError = useMemo(
        () => draftValidationError(draft, lockedProfile),
        [draft, lockedProfile],
    );
    const canSend = messageHasDollarTicker(draft) && !loading && !draftError;
    const hasTranscript = messages.length > 0 || loading;

    const scrollToBottom = useCallback(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    const loadThread = useCallback(async (id: number) => {
        const payload = await fetchScannerChatThread(id);
        setThreadId(id);
        setMessages(payload.messages);
        const profile = payload.thread.profile;
        setLockedProfile(profile === "day" || profile === "swing" ? profile : null);
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
    }, [messages, loading, streamReply, progressText, scrollToBottom]);

    const startNewChat = () => {
        setThreadId(null);
        setLockedProfile(null);
        setMessages([]);
        setDraft("");
        setError(null);
        setProgressText(null);
        setStreamReply("");
    };

    const selectThread = (id: number) => {
        setError(null);
        setStreamReply("");
        void loadThread(id).catch((e) => {
            console.error("[chat thread]", e);
            setError(e instanceof Error ? e.message : "Failed to load thread");
        });
    };

    const handleSend = () => {
        const text = draft.trim();
        if (!text || !canSend) return;

        setError(null);
        setLoading(true);
        setProgressText("Starting…");
        setStreamReply("");

        const optimisticUser: ScannerChatMessageRow = {
            id: -Date.now(),
            thread_id: threadId ?? 0,
            role: "user",
            content: text,
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimisticUser]);
        setDraft("");

        void sendScannerChatMessageStream(text, threadId, {
            onProgress: (stage, data) => {
                setProgressText(progressLabel(stage, data));
            },
            onDelta: (chunk) => {
                setProgressText(null);
                setStreamReply((prev) => prev + chunk);
            },
        })
            .then((result) => {
                setThreadId(result.thread_id);
                setMessages(result.messages);
                const profile = result.profile ?? result.thread.profile;
                setLockedProfile(profile === "day" || profile === "swing" ? profile : null);
                setStreamReply("");
                return refreshThreads();
            })
            .catch((e) => {
                console.error("[chat send]", e);
                setError(e instanceof Error ? e.message : "Chat failed");
                setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
            })
            .finally(() => {
                setLoading(false);
                setProgressText(null);
            });
    };

    const inputSection = (
        <Stack gap="2">
            <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="#day $BTC — good scalp into support?"
                rows={2}
                resize="none"
                px="3"
                py="2.5"
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
            <Flex align="center" justify="space-between" gap="2" flexWrap="wrap">
                <Stack direction="row" gap="2" align="center" flexWrap="wrap">
                    <Text {...MONO} fontSize="2xs" color="fg.muted">
                        {lockedProfile
                            ? `Thread locked to #${lockedProfile}`
                            : "Tag #swing or #day · default #swing"}
                    </Text>
                </Stack>
                <Text
                    {...MONO}
                    fontSize="2xs"
                    color={canSend ? "green.600" : draftError ? "red.400" : "fg.muted"}
                >
                    {draftError ?? (canSend ? "Ready" : "Need $pair")}
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
            rounded="md"
            minH={hasTranscript ? "calc(100vh - 6.5rem)" : undefined}
            maxH={hasTranscript ? "calc(100vh - 6.5rem)" : undefined}
            {...themedPanelStyle(tokens)}
        >
            <Flex
                px="3"
                py="2"
                gap="2"
                flexWrap="wrap"
                align="center"
                borderBottomWidth="1px"
                borderColor={tokens.panelBorder}
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
                                <MessageBubble key={msg.id} message={msg} tokens={tokens} />
                            ))}
                            {loading ? (
                                <Box alignSelf="stretch">
                                    {progressText ? (
                                        <Text {...MONO} color={tokens.panelLabel} mb="2">
                                            {progressText}
                                        </Text>
                                    ) : null}
                                    {streamReply ? (
                                        <MessageBubble
                                            message={{
                                                id: -1,
                                                thread_id: threadId ?? 0,
                                                role: "assistant",
                                                content: "",
                                                created_at: new Date().toISOString(),
                                            }}
                                            tokens={tokens}
                                            streamingText={streamReply}
                                        />
                                    ) : null}
                                </Box>
                            ) : null}
                            <Box ref={bottomRef} />
                        </Stack>
                    </Box>

                    <Box
                        flexShrink={0}
                        borderTopWidth="1px"
                        borderColor={tokens.panelBorder}
                        bg={tokens.panelBg}
                        px="3"
                        py="3"
                    >
                        {inputSection}
                    </Box>
                </>
            ) : (
                <>
                    <Box px="3" py="3">
                        <Stack gap="2">
                            <Text {...MONO} color="fg.muted">
                                Use <Text as="span" color={tokens.panelHeading}>#swing</Text> or{" "}
                                <Text as="span" color={tokens.panelHeading}>#day</Text> plus{" "}
                                <Text as="span" color={tokens.inlineCode}>$TICKER</Text>.
                            </Text>
                        </Stack>
                    </Box>
                    <Separator />
                    <Box px="3" py="3">
                        {inputSection}
                    </Box>
                </>
            )}
        </Flex>
    );
};

export default ScannerChat;
