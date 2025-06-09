export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
  startLine?: number;
  endLine?: number;
}

export interface ContentSegment {
  type: "text" | "code" | "inline-code";
  content: string;
  language?: string;
  metadata?: Record<string, any>;
}

/**
 * Regular expressions for detecting different types of code content
 */
export const CODE_PATTERNS = {
  // Fenced code blocks: ```language\ncode\n```
  FENCED_CODE_BLOCK: /```(\w+)?\n?([\s\S]*?)\n?```/g,

  // Inline code: `code`
  INLINE_CODE: /`([^`\n]+)`/g,

  // Code blocks with filename: ```typescript:filename.ts
  FENCED_WITH_FILENAME: /```(\w+):([^\n]+)\n([\s\S]*?)\n?```/g,
} as const;

/**
 * Common programming languages and their aliases
 */
export const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  rb: "ruby",
  sh: "bash",
  yml: "yaml",
  md: "markdown",
  json: "json",
  html: "html",
  css: "css",
  sql: "sql",
  go: "go",
  rs: "rust",
  cpp: "cpp",
  c: "c",
  java: "java",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  dart: "dart",
};

/**
 * Detect if content contains code blocks
 */
export function hasCodeBlocks(content: string): boolean {
  return (
    CODE_PATTERNS.FENCED_CODE_BLOCK.test(content) ||
    CODE_PATTERNS.FENCED_WITH_FILENAME.test(content)
  );
}

/**
 * Detect if content contains inline code
 */
export function hasInlineCode(content: string): boolean {
  return CODE_PATTERNS.INLINE_CODE.test(content);
}

/**
 * Extract all code blocks from content
 */
export function extractCodeBlocks(content: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];

  // Extract fenced code blocks with optional filename
  const filenameMatches = Array.from(
    content.matchAll(CODE_PATTERNS.FENCED_WITH_FILENAME)
  );
  for (const match of filenameMatches) {
    const [, language, filename, code] = match;
    blocks.push({
      language: normalizeLanguage(language || ""),
      code: code.trim(),
      filename: filename.trim(),
    });
  }

  // Extract regular fenced code blocks
  const codeMatches = Array.from(
    content.matchAll(CODE_PATTERNS.FENCED_CODE_BLOCK)
  );
  for (const match of codeMatches) {
    const [fullMatch, language, code] = match;

    // Skip if already captured as filename block
    const isFilenameBlock = filenameMatches.some((fm) => fm[0] === fullMatch);
    if (isFilenameBlock) continue;

    blocks.push({
      language: normalizeLanguage(language || ""),
      code: code.trim(),
    });
  }

  return blocks;
}

/**
 * Parse content into segments (text, code blocks, inline code)
 */
export function parseContentSegments(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;

  // First, handle fenced code blocks
  const fencedMatches = Array.from(
    content.matchAll(CODE_PATTERNS.FENCED_CODE_BLOCK)
  );
  const filenameMatches = Array.from(
    content.matchAll(CODE_PATTERNS.FENCED_WITH_FILENAME)
  );
  const allCodeMatches = [...fencedMatches, ...filenameMatches].sort(
    (a, b) => a.index! - b.index!
  );

  for (const match of allCodeMatches) {
    const matchIndex = match.index!;

    // Add text before code block
    if (matchIndex > lastIndex) {
      const textContent = content.slice(lastIndex, matchIndex);
      if (textContent.trim()) {
        // Process inline code in text content
        const textSegments = parseInlineCode(textContent);
        segments.push(...textSegments);
      }
    }

    // Add code block
    const isFilenameMatch = match.length === 4; // filename matches have 4 groups
    if (isFilenameMatch) {
      const [, language, filename, code] = match;
      segments.push({
        type: "code",
        content: code.trim(),
        language: normalizeLanguage(language || ""),
        metadata: { filename: filename.trim() },
      });
    } else {
      const [, language, code] = match;
      segments.push({
        type: "code",
        content: code.trim(),
        language: normalizeLanguage(language || ""),
      });
    }

    lastIndex = matchIndex + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const remainingContent = content.slice(lastIndex);
    if (remainingContent.trim()) {
      const textSegments = parseInlineCode(remainingContent);
      segments.push(...textSegments);
    }
  }

  // If no code blocks found, parse the entire content for inline code
  if (segments.length === 0) {
    return parseInlineCode(content);
  }

  return segments;
}

/**
 * Parse inline code in text content
 */
function parseInlineCode(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;

  const inlineMatches = Array.from(content.matchAll(CODE_PATTERNS.INLINE_CODE));

  for (const match of inlineMatches) {
    const matchIndex = match.index!;

    // Add text before inline code
    if (matchIndex > lastIndex) {
      const textContent = content.slice(lastIndex, matchIndex);
      if (textContent.trim()) {
        segments.push({
          type: "text",
          content: textContent,
        });
      }
    }

    // Add inline code
    const [, code] = match;
    segments.push({
      type: "inline-code",
      content: code,
      language: detectLanguageFromCode(code),
    });

    lastIndex = matchIndex + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const remainingContent = content.slice(lastIndex);
    if (remainingContent.trim()) {
      segments.push({
        type: "text",
        content: remainingContent,
      });
    }
  }

  // If no inline code found, return the entire content as text
  if (segments.length === 0) {
    return [
      {
        type: "text",
        content: content,
      },
    ];
  }

  return segments;
}

/**
 * Normalize language identifier
 */
export function normalizeLanguage(language: string): string {
  const normalized = language.toLowerCase().trim();
  return LANGUAGE_ALIASES[normalized] || normalized || "text";
}

/**
 * Attempt to detect language from code content
 */
function detectLanguageFromCode(code: string): string {
  const trimmedCode = code.trim();

  // Simple heuristics for common patterns
  if (trimmedCode.includes("function") && trimmedCode.includes("=>")) {
    return "javascript";
  }
  if (trimmedCode.includes("def ") || trimmedCode.includes("import ")) {
    return "python";
  }
  if (trimmedCode.includes("const ") || trimmedCode.includes("interface ")) {
    return "typescript";
  }
  if (trimmedCode.includes("SELECT") || trimmedCode.includes("FROM")) {
    return "sql";
  }
  if (trimmedCode.startsWith("$") || trimmedCode.includes("sudo ")) {
    return "bash";
  }

  return "text";
}

/**
 * Escape HTML in text content
 */
export function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return text.replace(/[&<>"']/g, (match) => htmlEscapes[match]);
}

/**
 * Check if a language is supported by Shiki
 */
export function isSupportedLanguage(language: string): boolean {
  const supportedLanguages = [
    "javascript",
    "typescript",
    "python",
    "java",
    "c",
    "cpp",
    "csharp",
    "go",
    "rust",
    "php",
    "ruby",
    "swift",
    "kotlin",
    "dart",
    "scala",
    "html",
    "css",
    "scss",
    "sass",
    "json",
    "xml",
    "yaml",
    "toml",
    "markdown",
    "sql",
    "bash",
    "shell",
    "powershell",
    "dockerfile",
    "nginx",
    "apache",
    "lua",
    "perl",
    "r",
    "matlab",
    "octave",
    "latex",
    "bibtex",
    "diff",
    "git-commit",
    "git-rebase",
    "jsx",
    "tsx",
    "vue",
    "svelte",
    "astro",
    "mdx",
  ];

  return supportedLanguages.includes(normalizeLanguage(language));
}
