import { marked } from "marked";
import {
  parseContentSegments,
  hasCodeBlocks,
  hasInlineCode,
  escapeHtml,
  type ContentSegment,
} from "./content-utils";
import { highlightCode, highlightInlineCode } from "./code-highlighter";

export interface ProcessedContent {
  segments: ProcessedSegment[];
  hasCode: boolean;
  isPlainText: boolean;
  metadata: {
    codeBlockCount: number;
    inlineCodeCount: number;
    languages: string[];
  };
}

export interface ProcessedSegment {
  id: string;
  type: "text" | "code" | "inline-code";
  content: string;
  highlightedContent?: string;
  language?: string;
  filename?: string;
  lineCount?: number;
  error?: string;
}

interface ProcessingOptions {
  enableHighlighting?: boolean;
  showLineNumbers?: boolean;
  maxCodeBlockHeight?: string;
  allowHtml?: boolean;
}

/**
 * Main content processor that handles mixed text and code content
 */
export class MarkdownProcessor {
  private static instance: MarkdownProcessor;

  private constructor() {
    // Configure marked for basic markdown processing
    marked.setOptions({
      breaks: true, // Convert line breaks to <br>
      gfm: true, // GitHub Flavored Markdown
      silent: true, // Don't throw on malformed markdown
    });
  }

  static getInstance(): MarkdownProcessor {
    if (!MarkdownProcessor.instance) {
      MarkdownProcessor.instance = new MarkdownProcessor();
    }
    return MarkdownProcessor.instance;
  }

  /**
   * Process content with markdown and syntax highlighting
   */
  async processContent(
    content: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessedContent> {
    const {
      enableHighlighting = true,
      showLineNumbers = false,
      maxCodeBlockHeight = "400px",
      allowHtml = false,
    } = options;

    try {
      // Quick check for content type
      const hasCodeContent = hasCodeBlocks(content) || hasInlineCode(content);

      if (!hasCodeContent) {
        // Plain text or simple markdown
        return this.processPlainContent(content, allowHtml);
      }

      // Parse content into segments
      const contentSegments = parseContentSegments(content);
      const processedSegments: ProcessedSegment[] = [];

      let codeBlockCount = 0;
      let inlineCodeCount = 0;
      const languages = new Set<string>();

      // Process each segment
      for (let i = 0; i < contentSegments.length; i++) {
        const segment = contentSegments[i];
        const segmentId = `segment-${i}`;

        if (segment.type === "text") {
          // Process text segment (may contain basic markdown)
          const processedText = allowHtml
            ? await this.processMarkdown(segment.content)
            : escapeHtml(segment.content);

          processedSegments.push({
            id: segmentId,
            type: "text",
            content: segment.content,
            highlightedContent: processedText,
          });
        } else if (segment.type === "code") {
          // Process code block
          codeBlockCount++;
          const language = segment.language || "text";
          languages.add(language);

          let highlightedContent = "";
          let error: string | undefined;

          if (enableHighlighting) {
            try {
              const highlightResult = await highlightCode(
                segment.content,
                language,
                {
                  showLineNumbers,
                  maxHeight: maxCodeBlockHeight,
                }
              );
              highlightedContent = highlightResult.html;
            } catch (err) {
              error =
                err instanceof Error ? err.message : "Highlighting failed";
              highlightedContent = this.createFallbackCodeHtml(
                segment.content,
                language
              );
            }
          } else {
            highlightedContent = this.createFallbackCodeHtml(
              segment.content,
              language
            );
          }

          processedSegments.push({
            id: segmentId,
            type: "code",
            content: segment.content,
            highlightedContent,
            language,
            filename: segment.metadata?.filename,
            lineCount: segment.content.split("\n").length,
            error,
          });
        } else if (segment.type === "inline-code") {
          // Process inline code
          inlineCodeCount++;
          const language = segment.language;
          if (language) languages.add(language);

          let highlightedContent = "";

          if (enableHighlighting && language) {
            try {
              highlightedContent = await highlightInlineCode(
                segment.content,
                language
              );
            } catch (err) {
              highlightedContent = escapeHtml(segment.content);
            }
          } else {
            highlightedContent = escapeHtml(segment.content);
          }

          processedSegments.push({
            id: segmentId,
            type: "inline-code",
            content: segment.content,
            highlightedContent,
            language,
          });
        }
      }

      return {
        segments: processedSegments,
        hasCode: codeBlockCount > 0 || inlineCodeCount > 0,
        isPlainText: false,
        metadata: {
          codeBlockCount,
          inlineCodeCount,
          languages: Array.from(languages),
        },
      };
    } catch (error) {
      console.error("Content processing failed:", error);

      // Fallback to plain text
      return this.processPlainContent(content, allowHtml);
    }
  }

  /**
   * Process plain content without code
   */
  private async processPlainContent(
    content: string,
    allowHtml: boolean
  ): Promise<ProcessedContent> {
    const processedContent = allowHtml
      ? await this.processMarkdown(content)
      : escapeHtml(content);

    return {
      segments: [
        {
          id: "plain-content",
          type: "text",
          content,
          highlightedContent: processedContent,
        },
      ],
      hasCode: false,
      isPlainText: true,
      metadata: {
        codeBlockCount: 0,
        inlineCodeCount: 0,
        languages: [],
      },
    };
  }

  /**
   * Process markdown content
   */
  private async processMarkdown(content: string): Promise<string> {
    try {
      // Use marked to process basic markdown (excluding code blocks which we handle separately)
      const processed = marked(content);
      return typeof processed === "string" ? processed : content;
    } catch (error) {
      console.error("Markdown processing failed:", error);
      return escapeHtml(content);
    }
  }

  /**
   * Create fallback HTML for code blocks when highlighting fails
   */
  private createFallbackCodeHtml(code: string, language: string): string {
    const escapedCode = escapeHtml(code);
    return `<pre class="code-block fallback"><code class="language-${language}">${escapedCode}</code></pre>`;
  }

  /**
   * Quick check if content needs processing
   */
  needsProcessing(content: string): boolean {
    return (
      hasCodeBlocks(content) ||
      hasInlineCode(content) ||
      content.includes("*") ||
      content.includes("#")
    );
  }

  /**
   * Extract just code blocks from content (useful for analysis)
   */
  async extractCodeBlocks(content: string): Promise<ProcessedSegment[]> {
    const processed = await this.processContent(content, {
      enableHighlighting: false,
    });
    return processed.segments.filter((segment) => segment.type === "code");
  }

  /**
   * Get content statistics
   */
  async getContentStats(content: string): Promise<{
    totalLength: number;
    wordCount: number;
    lineCount: number;
    codeBlockCount: number;
    inlineCodeCount: number;
    languages: string[];
  }> {
    const processed = await this.processContent(content, {
      enableHighlighting: false,
    });

    const words = content.split(/\s+/).filter((word) => word.length > 0);
    const lines = content.split("\n");

    return {
      totalLength: content.length,
      wordCount: words.length,
      lineCount: lines.length,
      codeBlockCount: processed.metadata.codeBlockCount,
      inlineCodeCount: processed.metadata.inlineCodeCount,
      languages: processed.metadata.languages,
    };
  }
}

// Export singleton instance
export const markdownProcessor = MarkdownProcessor.getInstance();

// Convenience functions
export async function processContent(
  content: string,
  options?: ProcessingOptions
): Promise<ProcessedContent> {
  return markdownProcessor.processContent(content, options);
}

export async function needsProcessing(content: string): Promise<boolean> {
  return markdownProcessor.needsProcessing(content);
}

export async function getContentStats(content: string) {
  return markdownProcessor.getContentStats(content);
}
