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
    Menu,
    Portal,
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

function ChatHistoryMenu({
    threads,
    threadId,
    bootLoading,
    tokens,
    onNewChat,
    onSelectThread,
}: {
    threads: ScannerChatThreadRow[];
    threadId: number | null;
    bootLoading: boolean;
    tokens: ReturnType<typeof useThemeTokens>;
    onNewChat: () => void;
    onSelectThread: (thread: ScannerChatThreadRow) => void;
}) {
    const activeThread = threads.find((thread) => thread.id === threadId);
    const triggerLabel = bootLoading
        ? "Loading chats…"
        : activeThread?.title?.trim() || (threadId ? `Chat #${threadId}` : "New chat");

    return (
        <Menu.Root positioning={{ placement: "bottom-start", gutter: 6 }}>
            <Menu.Trigger asChild>
                <Button
                    size="sm"
                    variant="outline"
                    flex="1"
                    minW="0"
                    maxW={{ base: "100%", md: "320px" }}
                    borderColor={tokens.panelBorder}
                    fontFamily="mono"
                    fontWeight="normal"
                >
                    <Flex align="center" gap="2" w="100%" minW="0">
                        <Text truncate flex="1" textAlign="left" fontSize="xs">
                            {triggerLabel}
                        </Text>
                        <Text fontSize="2xs" color="fg.muted" flexShrink={0} aria-hidden>
                            ▾
                        </Text>
                    </Flex>
                </Button>
            </Menu.Trigger>
            <Portal>
                <Menu.Positioner>
                    <Menu.Content
                        minW={{ base: "min(100vw - 1.5rem, 360px)", sm: "320px" }}
                        maxW="420px"
                        maxH="min(65vh, 440px)"
                        overflowY="auto"
                        zIndex="popover"
                        p="1"
                        borderColor={tokens.panelBorder}
                        bg={tokens.panelBg}
                    >
                        <Menu.Item
                            value="new-chat"
                            onSelect={onNewChat}
                            rounded="md"
                            py="2.5"
                            px="3"
                            fontFamily="mono"
                            fontSize="xs"
                            fontWeight="semibold"
                            color={tokens.panelHeading}
                        >
                            <Menu.ItemText>+ New chat</Menu.ItemText>
                        </Menu.Item>

                        {threads.length > 0 ? <Menu.Separator my="1" /> : null}

                        {threads.length === 0 && !bootLoading ? (
                            <Box px="3" py="2">
                                <Text fontFamily="mono" fontSize="2xs" color="fg.muted">
                                    No previous chats
                                </Text>
                            </Box>
                        ) : null}

                        {threads.slice(0, 40).map((thread) => {
                            const active = threadId === thread.id;
                            const title = thread.title?.trim() || `Chat #${thread.id}`;
                            return (
                                <Menu.Item
                                    key={thread.id}
                                    value={String(thread.id)}
                                    onSelect={() => onSelectThread(thread)}
                                    rounded="md"
                                    py="2.5"
                                    px="3"
                                    bg={active ? tokens.panelBgUser : undefined}
                                >
                                    <Flex align="flex-start" gap="2" w="100%" minW="0">
                                        <Box
                                            w="3.5"
                                            flexShrink={0}
                                            mt="0.5"
                                            textAlign="center"
                                            fontSize="xs"
                                            color={tokens.panelHeading}
                                            aria-hidden
                                        >
                                            {active ? "✓" : ""}
                                        </Box>
                                        <Stack gap="1" flex="1" minW="0">
                                            <Text truncate fontFamily="mono" fontSize="xs">
                                                {title}
                                            </Text>
                                            <Flex gap="2" align="center" flexWrap="wrap">
                                                {thread.profile === "day" || thread.profile === "swing" ? (
                                                    <Badge
                                                        size="sm"
                                                        variant="outline"
                                                        fontFamily="mono"
                                                        fontSize="2xs"
                                                    >
                                                        {scannerProfileLabel(thread.profile)}
                                                    </Badge>
                                                ) : null}
                                                <Text fontFamily="mono" fontSize="2xs" color="fg.muted">
                                                    {formatRelativeTime(thread.updated_at)}
                                                </Text>
                                            </Flex>
                                        </Stack>
                                    </Flex>
                                </Menu.Item>
                            );
                        })}
                    </Menu.Content>
                </Menu.Positioner>
            </Portal>
        </Menu.Root>
    );
}

const ScannerChat = () => {
    const { palette } = useThemeColor();
    const tokens = useThemeTokens(palette);
    const [threads, setThreads] = useState<ScannerChatThreadRow[]>([]);
    const [threadId, setThreadId] = useState<number | null>(null);
    const [lockedProfile, setLockedProfile] = useState<ScannerProfile | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<ScannerProfile>("day");
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
                        label="Day"
                        active={activeProfile === "day"}
                        disabled={Boolean(lockedProfile && lockedProfile !== "day")}
                        onClick={() => setSelectedProfile("day")}
                        tokens={tokens}
                    />
                    <ProfileChip
                        label="Swing"
                        active={activeProfile === "swing"}
                        disabled={Boolean(lockedProfile && lockedProfile !== "swing")}
                        onClick={() => setSelectedProfile("swing")}
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
            direction="column"
            rounded="lg"
            {...themedPanelStyle(tokens)}
            overflow="hidden"
        >
            <Box
                px={{ base: "3", md: "5" }}
                py="3"
                borderBottomWidth="1px"
                borderColor={tokens.panelBorder}
                flexShrink={0}
            >
                <Flex
                    direction={{ base: "column", sm: "row" }}
                    align={{ base: "stretch", sm: "center" }}
                    justify="space-between"
                    gap="3"
                >
                    <Stack gap="0.5" minW="0">
                        <Text
                            fontFamily="mono"
                            fontSize="sm"
                            fontWeight="semibold"
                            color={tokens.panelHeading}
                        >
                            Lemot copilot
                        </Text>
                        <Text fontSize="xs" color="fg.muted" display={{ base: "none", sm: "block" }}>
                            Read-only assistant — scanner, signals, risk desk, footprint
                        </Text>
                    </Stack>

                    <Flex gap="2" align="center" w={{ base: "100%", sm: "auto" }} minW="0">
                        <ChatHistoryMenu
                            threads={threads}
                            threadId={threadId}
                            bootLoading={bootLoading}
                            tokens={tokens}
                            onNewChat={startNewChat}
                            onSelectThread={selectThread}
                        />
                        <Button
                            size="sm"
                            variant="outline"
                            colorPalette={palette}
                            onClick={startNewChat}
                            flexShrink={0}
                            aria-label="New chat"
                            px="3"
                        >
                            +
                        </Button>
                    </Flex>
                </Flex>
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
    );
};

export default ScannerChat;
