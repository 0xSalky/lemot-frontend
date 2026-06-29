import type {
    ScannerChatMessageRow,
    ScannerChatModel,
    ScannerChatScanSummary,
    ScannerChatThreadRow,
} from "@/types/scannerChatTypes";
import {
    chatModelLabel,
    draftValidationError,
    fetchScannerChatThread,
    fetchScannerChatThreads,
    formatRelativeTime,
    loadChatModelPreference,
    progressLabel,
    saveChatModelPreference,
    sendScannerChatMessageStream,
    toolLabel,
} from "@/services/scannerChatUtils";
import { scannerProfileLabel, type ScannerProfile } from "@/services/scannerUtils";
import ChatMarkdown from "@/components/2_molecules/ChatMarkdown/ChatMarkdown";
import ChatMessageText from "@/components/2_molecules/ChatMessageText/ChatMessageText";
import { useThemeColor, useThemeTokens } from "@/components/ui/theme-color";
import { themedPanelStyle } from "@/components/ui/themed-panel";
import {
    Badge,
    Box,
    Button,
    Collapsible,
    Flex,
    Stack,
    Text,
    Textarea,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function ProfileChip({
    label,
    active,
    disabled,
    onClick,
    tokens,
}: {
    label: string;
    active: boolean;
    disabled?: boolean;
    onClick: () => void;
    tokens: ReturnType<typeof useThemeTokens>;
}) {
    return (
        <Button
            size="xs"
            variant={active ? "solid" : "outline"}
            disabled={disabled}
            onClick={onClick}
            fontFamily="mono"
            fontSize="2xs"
            px="2.5"
            borderColor={tokens.panelBorder}
        >
            {label}
        </Button>
    );
}

function ScanSummaryPanel({
    summaries,
    tokens,
}: {
    summaries: ScannerChatScanSummary[];
    tokens: ReturnType<typeof useThemeTokens>;
}) {
    if (summaries.length === 0) return null;

    return (
        <Collapsible.Root defaultOpen={false} mb="3">
            <Collapsible.Trigger asChild>
                <Button
                    size="xs"
                    variant="ghost"
                    fontFamily="mono"
                    fontSize="2xs"
                    color={tokens.panelLabel}
                    px="0"
                    mb="1"
                >
                    Scan data ({summaries.length})
                </Button>
            </Collapsible.Trigger>
            <Collapsible.Content>
                <Stack gap="1.5">
                    {summaries.map((summary) => (
                        <Box
                            key={summary.symbol}
                            px="2"
                            py="1.5"
                            rounded="sm"
                            borderWidth="1px"
                            borderColor={tokens.panelBorder}
                            bg={tokens.panelBgUser}
                        >
                            <Text fontFamily="mono" fontSize="2xs" color={tokens.panelHeading}>
                                ${summary.base}
                                {summary.bias ? ` · ${summary.bias}` : ""}
                                {summary.nearest_band?.side
                                    ? ` · ${summary.nearest_band.side} ${summary.nearest_band.dist_pct?.toFixed(2) ?? "?"}%`
                                    : ""}
                            </Text>
                        </Box>
                    ))}
                </Stack>
            </Collapsible.Content>
        </Collapsible.Root>
    );
}

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
    const body = streamingText ?? message.content;
    const scanSummaries = Array.isArray(message.context?.scan_summaries)
        ? message.context.scan_summaries
        : [];
    const toolsUsed = Array.isArray(message.context?.tools_used)
        ? message.context.tools_used
        : [];
    const model =
        message.context?.model === "haiku" || message.context?.model === "sonnet"
            ? message.context.model
            : null;

    return (
        <Flex direction="column" align={isUser ? "flex-end" : "flex-start"} w="100%">
            <Box maxW={isUser ? "min(720px, 85%)" : "100%"} w={isUser ? "auto" : "100%"}>
                {!isUser ? (
                    <Flex gap="2" align="center" mb="1.5" flexWrap="wrap">
                        <Badge
                            size="sm"
                            variant="subtle"
                            fontFamily="mono"
                            fontSize="2xs"
                            color={tokens.panelHeading}
                        >
                            Copilot
                        </Badge>
                        {message.profile ? (
                            <Badge size="sm" variant="outline" fontFamily="mono" fontSize="2xs">
                                {scannerProfileLabel(message.profile)}
                            </Badge>
                        ) : null}
                        {model ? (
                            <Badge size="sm" variant="outline" fontFamily="mono" fontSize="2xs">
                                {chatModelLabel(model)}
                            </Badge>
                        ) : null}
                        {toolsUsed.map((tool) => (
                            <Badge
                                key={tool}
                                size="sm"
                                variant="surface"
                                fontFamily="mono"
                                fontSize="2xs"
                            >
                                {toolLabel(tool)}
                            </Badge>
                        ))}
                    </Flex>
                ) : null}

                <Box
                    {...themedPanelStyle(tokens)}
                    px="3.5"
                    py="3"
                    rounded="lg"
                    bg={isUser ? tokens.panelBgUser : tokens.panelBg}
                    borderColor={isUser ? tokens.panelBorder : tokens.panelBorder}
                >
                    {isUser ? (
                        <ChatMessageText content={message.content} tokens={tokens} />
                    ) : (
                        <>
                            <ScanSummaryPanel summaries={scanSummaries} tokens={tokens} />
                            <Box fontSize="sm" lineHeight="1.7">
                                <ChatMarkdown content={body} />
                            </Box>
                        </>
                    )}
                </Box>

                <Text
                    fontFamily="mono"
                    fontSize="2xs"
                    color="fg.muted"
                    mt="1"
                    textAlign={isUser ? "right" : "left"}
                >
                    {formatRelativeTime(message.created_at)}
                </Text>
            </Box>
        </Flex>
    );
}

function ThreadRow({
    thread,
    active,
    onClick,
    tokens,
}: {
    thread: ScannerChatThreadRow;
    active: boolean;
    onClick: () => void;
    tokens: ReturnType<typeof useThemeTokens>;
}) {
    return (
        <Button
            justifyContent="flex-start"
            alignItems="flex-start"
            h="auto"
            py="2"
            px="2.5"
            w="100%"
            variant={active ? "subtle" : "ghost"}
            onClick={onClick}
            whiteSpace="normal"
            textAlign="left"
        >
            <Stack gap="0.5" align="flex-start" w="100%">
                <Text fontFamily="mono" fontSize="xs" fontWeight="medium" lineClamp={2}>
                    {thread.title?.trim() || `Chat #${thread.id}`}
                </Text>
                <Flex gap="2" align="center">
                    {thread.profile === "day" || thread.profile === "swing" ? (
                        <Badge size="sm" variant="outline" fontFamily="mono" fontSize="2xs">
                            {scannerProfileLabel(thread.profile)}
                        </Badge>
                    ) : null}
                    <Text fontFamily="mono" fontSize="2xs" color="fg.muted">
                        {formatRelativeTime(thread.updated_at)}
                    </Text>
                </Flex>
            </Stack>
        </Button>
    );
}

const ScannerChat = () => {
    const { palette } = useThemeColor();
    const tokens = useThemeTokens(palette);
    const [threads, setThreads] = useState<ScannerChatThreadRow[]>([]);
    const [threadId, setThreadId] = useState<number | null>(null);
    const [lockedProfile, setLockedProfile] = useState<ScannerProfile | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<ScannerProfile>("swing");
    const [selectedModel, setSelectedModel] = useState<ScannerChatModel>(() =>
        loadChatModelPreference(),
    );
    const [messages, setMessages] = useState<ScannerChatMessageRow[]>([]);
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(false);
    const [bootLoading, setBootLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [progressText, setProgressText] = useState<string | null>(null);
    const [streamReply, setStreamReply] = useState("");
    const bottomRef = useRef<HTMLDivElement | null>(null);

    const activeProfile = lockedProfile ?? selectedProfile;

    const draftError = useMemo(
        () => draftValidationError(draft, lockedProfile, selectedProfile),
        [draft, lockedProfile, selectedProfile],
    );
    const canSend = draft.trim().length > 0 && !loading && !draftError;

    const scrollToBottom = useCallback(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    const loadThread = useCallback(async (id: number, profile?: ScannerProfile | null) => {
        const payload = await fetchScannerChatThread(id, profile);
        setThreadId(id);
        setMessages(payload.messages);
        const resolved = payload.thread.profile;
        if (resolved === "day" || resolved === "swing") {
            setLockedProfile(resolved);
            setSelectedProfile(resolved);
        }
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

    const selectThread = (thread: ScannerChatThreadRow) => {
        setError(null);
        setStreamReply("");
        void loadThread(thread.id, thread.profile ?? null).catch((e) => {
            console.error("[chat thread]", e);
            setError(e instanceof Error ? e.message : "Failed to load thread");
        });
    };

    const handleModelChange = (model: ScannerChatModel) => {
        setSelectedModel(model);
        saveChatModelPreference(model);
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
            profile: activeProfile,
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimisticUser]);
        setDraft("");

        void sendScannerChatMessageStream(
            text,
            threadId,
            {
                onProgress: (stage, data) => {
                    setProgressText(progressLabel(stage, data));
                },
                onDelta: (chunk) => {
                    setProgressText(null);
                    setStreamReply((prev) => prev + chunk);
                },
            },
            { profile: activeProfile, model: selectedModel },
        )
            .then((result) => {
                setThreadId(result.thread_id);
                setMessages(result.messages);
                const profile = result.profile ?? result.thread.profile;
                if (profile === "day" || profile === "swing") {
                    setLockedProfile(profile);
                    setSelectedProfile(profile);
                }
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

    const composer = (
        <Stack gap="3">
            <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask anything — e.g. Why was SOL skipped? What's my book risk? Mention $SOL for pair scans."
                rows={3}
                resize="none"
                px="3.5"
                py="3"
                fontSize="sm"
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

            <Flex align="center" justify="space-between" gap="3" flexWrap="wrap">
                <Flex gap="2" align="center" flexWrap="wrap">
                    <ProfileChip
                        label="Swing"
                        active={activeProfile === "swing"}
                        disabled={Boolean(lockedProfile && lockedProfile !== "swing")}
                        onClick={() => setSelectedProfile("swing")}
                        tokens={tokens}
                    />
                    <ProfileChip
                        label="Day"
                        active={activeProfile === "day"}
                        disabled={Boolean(lockedProfile && lockedProfile !== "day")}
                        onClick={() => setSelectedProfile("day")}
                        tokens={tokens}
                    />
                    <Box w="1px" h="5" bg={tokens.panelBorder} />
                    <ProfileChip
                        label="Haiku"
                        active={selectedModel === "haiku"}
                        onClick={() => handleModelChange("haiku")}
                        tokens={tokens}
                    />
                    <ProfileChip
                        label="Sonnet"
                        active={selectedModel === "sonnet"}
                        onClick={() => handleModelChange("sonnet")}
                        tokens={tokens}
                    />
                </Flex>

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

            {draftError ? (
                <Text fontFamily="mono" fontSize="2xs" color="red.400">
                    {draftError}
                </Text>
            ) : lockedProfile ? (
                <Text fontFamily="mono" fontSize="2xs" color="fg.muted">
                    Thread locked to {scannerProfileLabel(lockedProfile)} profile
                </Text>
            ) : null}

            {error ? (
                <Text fontFamily="mono" fontSize="2xs" color="red.400">
                    {error}
                </Text>
            ) : null}
        </Stack>
    );

    return (
        <Flex
            w="100%"
            h="calc(100vh - 6.5rem)"
            minH="520px"
            rounded="lg"
            {...themedPanelStyle(tokens)}
            overflow="hidden"
        >
            <Box
                w={{ base: "0", md: "240px" }}
                display={{ base: "none", md: "block" }}
                borderRightWidth="1px"
                borderColor={tokens.panelBorder}
                bg={tokens.panelBg}
                flexShrink={0}
            >
                <Stack gap="2" p="3" h="100%">
                    <Button size="sm" colorPalette={palette} onClick={startNewChat}>
                        New chat
                    </Button>
                    <Box flex="1" overflowY="auto">
                        {bootLoading ? (
                            <Text fontFamily="mono" fontSize="xs" color="fg.muted" px="1">
                                Loading…
                            </Text>
                        ) : threads.length === 0 ? (
                            <Text fontFamily="mono" fontSize="xs" color="fg.muted" px="1">
                                No chats yet
                            </Text>
                        ) : (
                            <Stack gap="1">
                                {threads.slice(0, 30).map((thread) => (
                                    <ThreadRow
                                        key={thread.id}
                                        thread={thread}
                                        active={threadId === thread.id}
                                        onClick={() => selectThread(thread)}
                                        tokens={tokens}
                                    />
                                ))}
                            </Stack>
                        )}
                    </Box>
                </Stack>
            </Box>

            <Flex direction="column" flex="1" minW="0">
                <Box
                    px={{ base: "3", md: "5" }}
                    py="3"
                    borderBottomWidth="1px"
                    borderColor={tokens.panelBorder}
                    flexShrink={0}
                >
                    <Text fontFamily="mono" fontSize="sm" fontWeight="semibold" color={tokens.panelHeading}>
                        Lemot copilot
                    </Text>
                    <Text fontSize="xs" color="fg.muted" mt="0.5">
                        Read-only system assistant — scanner, signals, risk desk, footprint
                    </Text>
                </Box>

                <Box flex="1" minH="0" overflowY="auto" px={{ base: "3", md: "5" }} py="4">
                    {messages.length === 0 && !loading ? (
                        <Stack gap="3" maxW="640px">
                            <Text fontSize="sm" color="fg.muted">
                                Ask about open trades, why a signal was skipped, HTF bands, or orderflow.
                                Mention <Text as="span" fontFamily="mono">$SOL</Text> when you want a fresh pair scan.
                            </Text>
                        </Stack>
                    ) : (
                        <Stack gap="6" maxW="900px">
                            {messages.map((msg) => (
                                <MessageBubble key={msg.id} message={msg} tokens={tokens} />
                            ))}
                            {loading ? (
                                <Stack gap="2">
                                    {progressText ? (
                                        <Text fontFamily="mono" fontSize="xs" color={tokens.panelLabel}>
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
                                                profile: activeProfile,
                                                context: { model: selectedModel },
                                                created_at: new Date().toISOString(),
                                            }}
                                            tokens={tokens}
                                            streamingText={streamReply}
                                        />
                                    ) : null}
                                </Stack>
                            ) : null}
                            <Box ref={bottomRef} />
                        </Stack>
                    )}
                </Box>

                <Box
                    flexShrink={0}
                    borderTopWidth="1px"
                    borderColor={tokens.panelBorder}
                    bg={tokens.panelBg}
                    px={{ base: "3", md: "5" }}
                    py="4"
                >
                    {composer}
                </Box>
            </Flex>
        </Flex>
    );
};

export default ScannerChat;
