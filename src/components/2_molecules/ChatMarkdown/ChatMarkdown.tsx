"use client";

/**
 * Lightweight markdown renderer for chat AI replies (headers, tables, lists, quotes).
 * Styled to match ScannerResults AI blocks — no extra dependencies.
 */

import { accent, useThemeColor, type ThemeColor } from "@/components/ui/theme-color";
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

function renderInline(text: string, palette: ThemeColor): ReactNode {
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
                <Text as="span" key={key++} fontWeight="semibold" color={accent(palette, 100)}>
                    {token.slice(2, -2)}
                </Text>,
            );
        } else if (token.startsWith("*")) {
            parts.push(
                <Text as="span" key={key++} fontStyle="italic" color={accent(palette, 200)}>
                    {token.slice(1, -1)}
                </Text>,
            );
        } else if (token.startsWith("`")) {
            parts.push(
                <Text as="span" key={key++} color={accent(palette, 300)}>
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
    palette,
}: {
    headers: string[];
    rows: string[][];
    palette: ThemeColor;
}) {
    return (
        <Box overflowX="auto" borderWidth="1px" borderColor={accent(palette, 800)} rounded="md">
            <Table.Root size="sm" variant="outline">
                <Table.Header>
                    <Table.Row bg={accent(palette, "950/60")}>
                        {headers.map((h, idx) => (
                            <Table.ColumnHeader
                                key={idx}
                                {...AI_TEXT}
                                color={accent(palette, 300)}
                                fontSize="0.7rem"
                                whiteSpace="nowrap"
                            >
                                {renderInline(stripMdInline(h), palette)}
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
                                    color={accent(palette, 50)}
                                    fontSize="0.7rem"
                                    lineHeight="1.6"
                                    verticalAlign="top"
                                    py="1.5"
                                >
                                    {renderInline(cell, palette)}
                                </Table.Cell>
                            ))}
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>
        </Box>
    );
}

function MarkdownBlock({ block, palette }: { block: Block; palette: ThemeColor }) {
    switch (block.kind) {
        case "h2":
            return (
                <Text {...AI_TEXT} color={accent(palette, 200)} fontWeight="semibold" fontSize="sm" pt="1">
                    {renderInline(block.text, palette)}
                </Text>
            );
        case "h3":
            return (
                <Text {...AI_TEXT} color={accent(palette, 400)} letterSpacing="0.04em" pt="1">
                    ── {renderInline(block.text, palette)}
                </Text>
            );
        case "hr":
            return <Separator borderColor={accent(palette, 800)} />;
        case "table":
            return <MarkdownTable headers={block.headers} rows={block.rows} palette={palette} />;
        case "blockquote":
            return (
                <Box
                    borderLeftWidth="2px"
                    borderColor={accent(palette, 500)}
                    pl="3"
                    py="1"
                    bg={accent(palette, "950/30")}
                    rounded="sm"
                >
                    <Stack gap="1">
                        {block.lines.map((line, i) => (
                            <Text key={i} {...AI_TEXT} color={accent(palette, 100)}>
                                {renderInline(line, palette)}
                            </Text>
                        ))}
                    </Stack>
                </Box>
            );
        case "ul":
            return (
                <Stack gap="1.5" pl="1">
                    {block.items.map((item, i) => (
                        <Text key={i} {...AI_TEXT} color={accent(palette, 50)}>
                            <Text as="span" color={accent(palette, 400)}>
                                ·{" "}
                            </Text>
                            {renderInline(item, palette)}
                        </Text>
                    ))}
                </Stack>
            );
        case "ol":
            return (
                <Stack gap="1.5" pl="1">
                    {block.items.map((item, i) => (
                        <Text key={i} {...AI_TEXT} color={accent(palette, 50)}>
                            <Text as="span" color={accent(palette, 400)}>
                                {i + 1}.{" "}
                            </Text>
                            {renderInline(item, palette)}
                        </Text>
                    ))}
                </Stack>
            );
        case "p":
            return (
                <Text {...AI_TEXT} color={accent(palette, 50)} whiteSpace="pre-wrap" wordBreak="break-word">
                    {renderInline(block.text, palette)}
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
    const blocks = parseBlocks(content);

    return (
        <Stack gap="3">
            {blocks.map((block, i) => (
                <MarkdownBlock key={i} block={block} palette={palette} />
            ))}
        </Stack>
    );
};

export default ChatMarkdown;
