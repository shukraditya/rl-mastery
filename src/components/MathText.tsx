'use client';

import { useMemo } from 'react';
import katex from 'katex';

interface Props {
  text: string;
  className?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function preprocess(text: string): string {
  // If already has delimiters, trust the author
  if (text.includes('$')) return text;

  // Find tokens that look like math expressions and wrap only those.
  // A token starts with a letter or backslash and continues until
  // a space or sentence punctuation. We wrap it only if it contains
  // at least one unambiguous math character.
  return text.replace(
    /([\\\p{L}]+[^ \t\n.,;!?]*)/gu,
    (match) => {
      if (/[_^\\[\]{}+\-=*/()]|\d/.test(match)) {
        return `$${match}$`;
      }
      return match;
    }
  );
}

function renderMixed(text: string): string {
  const regex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;
  const parts: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(escapeHtml(text.slice(lastIndex, match.index)));
    }

    const delim = match[0];
    const isDisplay = delim.startsWith('$$');
    const latex = delim.slice(isDisplay ? 2 : 1, -(isDisplay ? 2 : 1));

    try {
      parts.push(
        katex.renderToString(latex.trim(), {
          displayMode: isDisplay,
          throwOnError: false,
        })
      );
    } catch {
      parts.push(escapeHtml(delim));
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(escapeHtml(text.slice(lastIndex)));
  }

  return parts.join('');
}

export default function MathText({ text, className }: Props) {
  const html = useMemo(() => {
    const processed = preprocess(text);
    return renderMixed(processed);
  }, [text]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
