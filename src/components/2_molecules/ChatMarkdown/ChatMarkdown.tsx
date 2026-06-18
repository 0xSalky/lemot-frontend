"use client";

/**
 * Lightweight markdown renderer for chat AI replies (headers, tables, lists, quotes).
 * Styled to match ScannerResults AI blocks — no extra dependencies.
 */

import { useThemeColor, useThemeTokens, type ThemeTokens } from "@/components/ui/theme-color";
import { Box, Separator, Stack, Table, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

const AI_TEXT = {
    fontFamily: "mono",
    fontSize: "xs",
    lineHeight: "1.75",
} as const;

type Block =
    | { kind: "h2"; text: string }
    | { kind: "h3"; text: string }
    | { kind: "hr" }
    | { kind: "table"; headers: string[]; rows: string[][] }
    | { kind: "blockquote"; lines: string[] }
    | { kind: "ul"; items: string[] }
    | { kind: "ol"; items: string[] }
    | { kind: "p"; text: string };

function stripMdInline(text: string): string {
    return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`(.+?)`/g, "$1");
}

function parseTableRow(line: string): string[] {
    return line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim());
}

function isTableDivider(line: string): boolean {
    return /^\|[\s\-:|]+\|$/.test(line.trim());
}

function parseBlocks(source: string): Block[] {
    const lines = source.replace(/\r\n/g, "\n").split("\n");
    const blocks: Block[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed) {
            i += 1;
            continue;
        }

        if (trimmed === "---" || trimmed === "***") {
            blocks.push({ kind: "hr" });
            i += 1;
            continue;
        }

        if (trimmed.startsWith("## ")) {
            blocks.push({ kind: "h2", text: trimmed.slice(3).trim() });
            i += 1;
            continue;
        }

        if (trimmed.startsWith("### ")) {
            blocks.push({ kind: "h3", text: trimmed.slice(4).trim() });
            i += 1;
            continue;
        }

        if (trimmed.startsWith("# ")) {
            blocks.push({ kind: "h2", text: trimmed.slice(2).trim() });
            i += 1;
            continue;
        }

        if (trimmed.startsWith(">")) {
            const quoteLines: string[] = [];
            while (i < lines.length && lines[i].trim().startsWith(">")) {
                quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
                i += 1;
            }
            blocks.push({ kind: "blockquote", lines: quoteLines });
            continue;
        }

        if (trimmed.startsWith("|") && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
            const headers = parseTableRow(trimmed);
            i += 2;
            const rows: string[][] = [];
            while (i < lines.length && lines[i].trim().startsWith("|")) {
                rows.push(parseTableRow(lines[i]));
                i += 1;
            }
            blocks.push({ kind: "table", headers, rows });
            continue;
        }

        if (/^[-*]\s+/.test(trimmed)) {
            const items: string[] = [];
            while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
                items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
                i += 1;
            }
            blocks.push({ kind: "ul", items });
            continue;
        }

        if (/^\d+\.\s+/.test(trimmed)) {
            const items: string[] = [];
            while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
                items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
                i += 1;
            }
            blocks.push({ kind: "ol", items });
            continue;
        }

        const paraLines: string[] = [trimmed];
        i += 1;
        while (i < lines.length) {
            const next = lines[i].trim();
            if (
                !next ||
                next.startsWith("#") ||
                next === "---" ||
                next.startsWith(">") ||
                next.startsWith("|") ||
                /^[-*]\s+/.test(next) ||
                /^\d+\.\s+/.test(next)
            ) {
                break;
            }
            paraLines.push(next);
            i += 1;
        }
        blocks.push({ kind: "p", text: paraLines.join(" ") });
    }

    return blocks;
}

function renderInline(text: string, tokens: ThemeTokens): ReactNode {
    const parts: ReactNode[] = [];
    const re = /(\*\*.+?\*\*|\*.+?\*|`[^`]+`)/g;
    let last = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    while ((match = re.exec(text)) !== null) {
        if (match.index > last) {
            parts.push(text.slice(last, match.index));
        }
        const token = match[0];
        if (token.startsWith("**")) {
            parts.push(
                <Text as="span" key={key++} fontWeight="semibold" color={tokens.inlineStrong}>
                    {token.slice(2, -2)}
                </Text>,
            );
        } else if (token.startsWith("*")) {
            parts.push(
                <Text as="span" key={key++} fontStyle="italic" color={tokens.inlineEm}>
                    {token.slice(1, -1)}
                </Text>,
            );
        } else if (token.startsWith("`")) {
            parts.push(
                <Text as="span" key={key++} color={tokens.inlineCode}>
                    {token.slice(1, -1)}
                </Text>,
            );
        }
        last = match.index + token.length;
    }

    if (last < text.length) {
        parts.push(text.slice(last));
    }

    return parts.length === 1 ? parts[0] : parts;
}

function MarkdownTable({
    headers,
    rows,
    tokens,
}: {
    headers: string[];
    rows: string[][];
    tokens: ThemeTokens;
}) {
    return (
        <Box overflowX="auto" borderWidth="1px" borderColor={tokens.panelBorder} rounded="md">
            <Table.Root size="sm" variant="outline">
                <Table.Header>
                    <Table.Row bg={tokens.tableHeaderBg}>
                        {headers.map((h, idx) => (
                            <Table.ColumnHeader
                                key={idx}
                                {...AI_TEXT}
                                color={tokens.tableHeaderColor}
                                fontSize="0.7rem"
                                whiteSpace="nowrap"
                            >
                                {renderInline(stripMdInline(h), tokens)}
                            </Table.ColumnHeader>
                        ))}
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {rows.map((row, rIdx) => (
                        <Table.Row key={rIdx}>
                            {row.map((cell, cIdx) => (
                                <Table.Cell
                                    key={cIdx}
                                    {...AI_TEXT}
                                    color={tokens.tableCellColor}
                                    fontSize="0.7rem"
                                    lineHeight="1.6"
                                    verticalAlign="top"
                                    py="1.5"
                                >
                                    {renderInline(cell, tokens)}
                                </Table.Cell>
                            ))}
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>
        </Box>
    );
}

function MarkdownBlock({ block, tokens }: { block: Block; tokens: ThemeTokens }) {
    switch (block.kind) {
        case "h2":
            return (
                <Text {...AI_TEXT} color={tokens.panelHeading} fontWeight="semibold" fontSize="sm" pt="1">
                    {renderInline(block.text, tokens)}
                </Text>
            );
        case "h3":
            return (
                <Text {...AI_TEXT} color={tokens.panelLabel} letterSpacing="0.04em" pt="1">
                    ── {renderInline(block.text, tokens)}
                </Text>
            );
        case "hr":
            return <Separator borderColor={tokens.panelBorder} />;
        case "table":
            return <MarkdownTable headers={block.headers} rows={block.rows} tokens={tokens} />;
        case "blockquote":
            return (
                <Box
                    borderLeftWidth="2px"
                    borderColor={tokens.panelMuted}
                    pl="3"
                    py="1"
                    bg={tokens.blockquoteBg}
                    rounded="sm"
                >
                    <Stack gap="1">
                        {block.lines.map((line, i) => (
                            <Text key={i} {...AI_TEXT} color={tokens.panelBody}>
                                {renderInline(line, tokens)}
                            </Text>
                        ))}
                    </Stack>
                </Box>
            );
        case "ul":
            return (
                <Stack gap="1.5" pl="1">
                    {block.items.map((item, i) => (
                        <Text key={i} {...AI_TEXT} color={tokens.panelBody}>
                            <Text as="span" color={tokens.listBullet}>
                                ·{" "}
                            </Text>
                            {renderInline(item, tokens)}
                        </Text>
                    ))}
                </Stack>
            );
        case "ol":
            return (
                <Stack gap="1.5" pl="1">
                    {block.items.map((item, i) => (
                        <Text key={i} {...AI_TEXT} color={tokens.panelBody}>
                            <Text as="span" color={tokens.listBullet}>
                                {i + 1}.{" "}
                            </Text>
                            {renderInline(item, tokens)}
                        </Text>
                    ))}
                </Stack>
            );
        case "p":
            return (
                <Text {...AI_TEXT} color={tokens.panelBody} whiteSpace="pre-wrap" wordBreak="break-word">
                    {renderInline(block.text, tokens)}
                </Text>
            );
        default:
            return null;
    }
}

type ChatMarkdownProps = {
    content: string;
};

const ChatMarkdown = ({ content }: ChatMarkdownProps) => {
    const { palette } = useThemeColor();
    const tokens = useThemeTokens(palette);
    const blocks = parseBlocks(content);

    return (
        <Stack gap="3">
            {blocks.map((block, i) => (
                <MarkdownBlock key={i} block={block} tokens={tokens} />
            ))}
        </Stack>
    );
};

export default ChatMarkdown;
