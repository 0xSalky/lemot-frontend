"use client";

import type { ThemeTokens } from "@/components/ui/theme-color";
import { Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

const TOKEN_RE = /(\$[A-Za-z0-9]+|#(?:b|a)\b)/gi;

type ChatMessageTextProps = {
  content: string;
  tokens: ThemeTokens;
};

function highlightTokens(text: string, tokens: ThemeTokens): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const token = match[0];
    const isProfile = token.startsWith("#");
    parts.push(
      <Text
        as="span"
        key={key++}
        color={isProfile ? tokens.panelHeading : tokens.inlineCode}
        fontWeight="semibold"
      >
        {token}
      </Text>,
    );
    last = match.index + token.length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts.length > 0 ? parts : [text];
}

const ChatMessageText = ({ content, tokens }: ChatMessageTextProps) => {
  return (
    <Text
      fontFamily="mono"
      fontSize="xs"
      lineHeight="1.7"
      color={tokens.panelBody}
      whiteSpace="pre-wrap"
      wordBreak="break-word"
    >
      {highlightTokens(content, tokens)}
    </Text>
  );
};

export default ChatMessageText;
