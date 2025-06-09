import {
  getHighlighter,
  type Highlighter,
  type ThemeRegistration,
} from "shiki";
import { normalizeLanguage, isSupportedLanguage } from "./content-utils";

// Custom theme for glassmorphic dark interface
const GLASSMORPHIC_DARK_THEME: ThemeRegistration = {
  name: "glassmorphic-dark",
  displayName: "Glassmorphic Dark",
  type: "dark",
  colors: {
    "editor.background": "#1e293b00", // Transparent background for glassmorphism
    "editor.foreground": "#e2e8f0",
    "editorLineNumber.foreground": "#64748b",
    "editorLineNumber.activeForeground": "#94a3b8",
  },
  tokenColors: [
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: {
        foreground: "#64748b",
        fontStyle: "italic",
      },
    },
    {
      scope: ["keyword", "storage.type", "storage.modifier"],
      settings: {
        foreground: "#f472b6", // Pink for keywords
        fontStyle: "bold",
      },
    },
    {
      scope: ["string", "string.quoted"],
      settings: {
        foreground: "#34d399", // Emerald for strings
      },
    },
    {
      scope: ["constant.numeric", "constant.language"],
      settings: {
        foreground: "#fbbf24", // Amber for numbers and constants
      },
    },
    {
      scope: ["entity.name.function", "meta.function-call"],
      settings: {
        foreground: "#60a5fa", // Blue for functions
      },
    },
    {
      scope: ["entity.name.class", "entity.name.type"],
      settings: {
        foreground: "#a78bfa", // Purple for classes/types
      },
    },
    {
      scope: ["variable", "variable.other"],
      settings: {
        foreground: "#e2e8f0", // Light gray for variables
      },
    },
    {
      scope: ["entity.name.tag"],
      settings: {
        foreground: "#f87171", // Red for HTML tags
      },
    },
    {
      scope: ["entity.other.attribute-name"],
      settings: {
        foreground: "#fcd34d", // Yellow for attributes
      },
    },
    {
      scope: ["punctuation", "meta.brace"],
      settings: {
        foreground: "#94a3b8", // Gray for punctuation
      },
    },
  ],
};

interface HighlightOptions {
  showLineNumbers?: boolean;
  startingLineNumber?: number;
  highlightLines?: number[];
  maxHeight?: string;
}

interface HighlightResult {
  html: string;
  language: string;
  lineCount: number;
}

class CodeHighlighter {
  private static instance: CodeHighlighter;
  private highlighter: Highlighter | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): CodeHighlighter {
    if (!CodeHighlighter.instance) {
      CodeHighlighter.instance = new CodeHighlighter();
    }
    return CodeHighlighter.instance;
  }

  /**
   * Initialize the highlighter with themes and languages
   */
  private async initialize(): Promise<void> {
    if (this.highlighter) return;

    try {
      this.highlighter = await getHighlighter({
        themes: [GLASSMORPHIC_DARK_THEME, "github-dark", "nord"],
        langs: [
          // Core web technologies
          "javascript",
          "typescript",
          "html",
          "css",
          "json",
          "jsx",
          "tsx",
          "vue",
          "svelte",

          // Backend languages
          "python",
          "java",
          "go",
          "rust",
          "php",
          "ruby",
          "csharp",
          "swift",
          "kotlin",
          "dart",
          "scala",

          // Systems languages
          "c",
          "cpp",
          "zig",

          // Data & config
          "sql",
          "yaml",
          "toml",
          "xml",
          "csv",

          // Shell & tools
          "bash",
          "shell",
          "powershell",
          "dockerfile",

          // Documentation
          "markdown",
          "mdx",
          "latex",

          // Others
          "diff",
          "git-commit",
          "nginx",
          "apache",
          "lua",
          "perl",
          "r",
          "matlab",
        ],
      });
    } catch (error) {
      console.error("Failed to initialize code highlighter:", error);
      // Continue without highlighting rather than breaking the app
    }
  }

  /**
   * Ensure highlighter is initialized
   */
  private async ensureInitialized(): Promise<boolean> {
    if (this.highlighter) return true;

    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }

    try {
      await this.initPromise;
      return this.highlighter !== null;
    } catch (error) {
      console.error("Code highlighter initialization failed:", error);
      return false;
    }
  }

  /**
   * Highlight code with syntax highlighting
   */
  async highlight(
    code: string,
    language: string,
    options: HighlightOptions = {}
  ): Promise<HighlightResult> {
    const normalizedLang = normalizeLanguage(language);
    const lineCount = code.split("\n").length;

    // Ensure highlighter is ready
    const isReady = await this.ensureInitialized();
    if (!isReady || !this.highlighter) {
      // Fallback to plain text with basic HTML escaping
      return {
        html: this.createFallbackHtml(code, options),
        language: normalizedLang,
        lineCount,
      };
    }

    try {
      // Use supported language or fallback to text
      const highlightLang = isSupportedLanguage(normalizedLang)
        ? normalizedLang
        : "text";

      const html = this.highlighter.codeToHtml(code, {
        lang: highlightLang,
        theme: "glassmorphic-dark",
      });

      return {
        html: this.processHighlightedHtml(html, options),
        language: highlightLang,
        lineCount,
      };
    } catch (error) {
      console.error(
        `Failed to highlight code for language "${normalizedLang}":`,
        error
      );

      // Fallback to plain text
      return {
        html: this.createFallbackHtml(code, options),
        language: normalizedLang,
        lineCount,
      };
    }
  }

  /**
   * Highlight inline code (simpler, no line numbers)
   */
  async highlightInline(code: string, language?: string): Promise<string> {
    const isReady = await this.ensureInitialized();
    if (!isReady || !this.highlighter || !language) {
      return this.escapeHtml(code);
    }

    try {
      const normalizedLang = normalizeLanguage(language);
      const highlightLang = isSupportedLanguage(normalizedLang)
        ? normalizedLang
        : "text";

      const html = this.highlighter.codeToHtml(code, {
        lang: highlightLang,
        theme: "glassmorphic-dark",
      });

      // Extract just the inner content, removing the <pre> wrapper for inline use
      const match = html.match(/<code[^>]*>([\s\S]*?)<\/code>/);
      return match ? match[1] : this.escapeHtml(code);
    } catch (error) {
      console.error("Failed to highlight inline code:", error);
      return this.escapeHtml(code);
    }
  }

  /**
   * Process the highlighted HTML to add custom classes and structure
   */
  private processHighlightedHtml(
    html: string,
    options: HighlightOptions
  ): string {
    let processed = html;

    // Add custom wrapper classes for glassmorphic styling
    processed = processed.replace(
      /<pre[^>]*>/,
      '<pre class="shiki-container glassmorphic-code-block"'
    );

    // Add max height if specified
    if (options.maxHeight) {
      processed = processed.replace(
        'class="shiki-container glassmorphic-code-block"',
        `class="shiki-container glassmorphic-code-block" style="max-height: ${options.maxHeight}; overflow-y: auto;"`
      );
    }

    return processed;
  }

  /**
   * Create fallback HTML when highlighting fails
   */
  private createFallbackHtml(code: string, options: HighlightOptions): string {
    const escapedCode = this.escapeHtml(code);
    const lines = escapedCode.split("\n");

    if (options.showLineNumbers) {
      const numberedLines = lines
        .map((line, index) => {
          const lineNumber = (options.startingLineNumber || 1) + index;
          const isHighlighted = options.highlightLines?.includes(lineNumber);
          const highlightClass = isHighlighted ? " highlighted-line" : "";

          return `<span class="line${highlightClass}"><span class="line-number">${lineNumber}</span>${line}</span>`;
        })
        .join("\n");

      return `<pre class="shiki-container glassmorphic-code-block fallback line-numbers"><code>${numberedLines}</code></pre>`;
    }

    return `<pre class="shiki-container glassmorphic-code-block fallback"><code>${escapedCode}</code></pre>`;
  }

  /**
   * Escape HTML entities
   */
  private escapeHtml(text: string): string {
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
   * Get available languages
   */
  async getAvailableLanguages(): Promise<string[]> {
    const isReady = await this.ensureInitialized();
    if (!isReady || !this.highlighter) {
      return [];
    }

    return this.highlighter.getLoadedLanguages();
  }

  /**
   * Check if a specific language is loaded
   */
  async isLanguageLoaded(language: string): Promise<boolean> {
    const languages = await this.getAvailableLanguages();
    return languages.includes(normalizeLanguage(language));
  }
}

// Export singleton instance
export const codeHighlighter = CodeHighlighter.getInstance();

// Convenience functions
export async function highlightCode(
  code: string,
  language: string,
  options?: HighlightOptions
): Promise<HighlightResult> {
  return codeHighlighter.highlight(code, language, options);
}

export async function highlightInlineCode(
  code: string,
  language?: string
): Promise<string> {
  return codeHighlighter.highlightInline(code, language);
}

export async function getAvailableLanguages(): Promise<string[]> {
  return codeHighlighter.getAvailableLanguages();
}
