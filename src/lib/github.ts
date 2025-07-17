import { GitHubFile, RepositoryData } from "@/types/github-api";

// Configuration
const CONFIG = {
  maxFileSizeMB: 1,
  maxTotalSizeMB: 50,
  maxDepth: 10, // Prevent infinite recursion
  rateLimitThreshold: 100, // Warn when below this many requests
  includeExtensions: [
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".py",
    ".java",
    ".cpp",
    ".c",
    ".cs",
    ".php",
    ".rb",
    ".go",
    ".rs",
    ".swift",
    ".kt",
    ".html",
    ".css",
    ".vue",
    ".scss",
    ".sass",
    ".less",
    ".json",
    ".yaml",
    ".yml",
    ".xml",
    ".sql",
    ".sh",
  ],
  excludePatterns: [
    "node_modules/",
    "dist/",
    "build/",
    ".git/",
    "coverage/",
    "vendor/",
    "target/",
    "__pycache__/",
    ".venv/",
    "venv/",
    ".DS_Store",
    ".gradle/",
    ".mvn/",
    "Thumbs.db",
    ".env",
  ],
};

// Global rate limit tracking
let rateLimitInfo = {
  remaining: 5000,
  resetTime: new Date(),
};

// Parse GitHub URL with support for multiple formats
function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const cleanUrl = url.trim().replace(/\/$/, "");

  const patterns = [
    // HTTPS URLs
    /^https?:\/\/(?:www\.)?github\.com\/([^\/\s]+)\/([^\/\s]+?)(?:\/.*)?(?:\.git)?$/,
    // SSH URLs
    /^git@github\.com:([^\/\s]+)\/([^\/\s]+?)(?:\.git)?$/,
    // Simple format
    /^(?:www\.)?github\.com\/([^\/\s]+)\/([^\/\s]+?)(?:\/.*)?(?:\.git)?$/,
  ];

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match) {
      const owner = match[1];
      const repo = match[2];

      // Validate owner and repo names
      if (owner && repo && !["tree", "blob", "commit"].includes(owner)) {
        return { owner, repo };
      }
    }
  }

  throw new Error(
    "Invalid GitHub URL. Supported formats: https://github.com/owner/repo, git@github.com:owner/repo.git"
  );
}

// Check if file should be included
function shouldIncludeFile(path: string, size: number): boolean {
  const maxSizeBytes = CONFIG.maxFileSizeMB * 1024 * 1024;
  if (size > maxSizeBytes) return false;

  // Check exclude patterns
  if (CONFIG.excludePatterns.some((pattern) => path.includes(pattern))) {
    return false;
  }

  // Check extension
  const extension = path.substring(path.lastIndexOf("."));
  return CONFIG.includeExtensions.includes(extension);
}

// Get language from extension
function getLanguage(extension: string): string {
  const langMap: Record<string, string> = {
    ".js": "JavaScript",
    ".ts": "TypeScript",
    ".jsx": "JavaScript",
    ".tsx": "TypeScript",
    ".py": "Python",
    ".java": "Java",
    ".cpp": "C++",
    ".c": "C",
    ".cs": "C#",
    ".php": "PHP",
    ".rb": "Ruby",
    ".go": "Go",
    ".rs": "Rust",
    ".swift": "Swift",
    ".kt": "Kotlin",
    ".html": "HTML",
    ".css": "CSS",
    ".vue": "Vue",
    ".scss": "SCSS",
    ".sass": "Sass",
    ".less": "Less",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".xml": "XML",
    ".sql": "SQL",
    ".sh": "Shell",
  };
  return langMap[extension] || "Other";
}

// Parse GitHub API Link header for pagination
function parseLinkHeader(linkHeader: string): { next?: string } {
  const links: { next?: string } = {};

  if (!linkHeader) return links;

  const parts = linkHeader.split(",");
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) {
      const [, url, rel] = match;
      if (rel === "next") {
        links.next = url;
      }
    }
  }

  return links;
}

// Make API request with rate limit handling
async function makeRequest(
  url: string
): Promise<{ data: any; headers: Headers }> {
  const token = process.env.GITHUB_API_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "GitHub-Analyzer/1.0",
  };

  if (token) {
    headers["Authorization"] = `token ${token}`;
  }

  const response = await fetch(url, { headers });

  // Update rate limit info
  const remaining = response.headers.get("X-RateLimit-Remaining");
  const resetTime = response.headers.get("X-RateLimit-Reset");

  if (remaining) {
    rateLimitInfo.remaining = parseInt(remaining);
  }
  if (resetTime) {
    rateLimitInfo.resetTime = new Date(parseInt(resetTime) * 1000);
  }

  // Check rate limit
  if (rateLimitInfo.remaining < CONFIG.rateLimitThreshold) {
    const resetIn = Math.ceil(
      (rateLimitInfo.resetTime.getTime() - Date.now()) / 1000 / 60
    );
    console.warn(
      `⚠️  Rate limit running low: ${rateLimitInfo.remaining} requests remaining. Resets in ${resetIn} minutes.`
    );

    // Add small delay to be more conservative
    if (rateLimitInfo.remaining < 50) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Repository not found or is private");
    }
    if (response.status === 403) {
      if (rateLimitInfo.remaining <= 0) {
        const resetIn = Math.ceil(
          (rateLimitInfo.resetTime.getTime() - Date.now()) / 1000 / 60
        );
        throw new Error(
          `Rate limit exceeded. Try again in ${resetIn} minutes or add a GitHub token.`
        );
      }
      throw new Error(
        "Access forbidden. Repository may be private or require authentication."
      );
    }
    if (response.status === 401) {
      throw new Error(
        "Invalid GitHub token. Please check your GITHUB_API_TOKEN environment variable."
      );
    }
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return { data, headers: response.headers };
}

// Get repository info
async function getRepoInfo(owner: string, repo: string) {
  const { data } = await makeRequest(
    `https://api.github.com/repos/${owner}/${repo}`
  );
  return {
    owner,
    name: repo,
    description: data.description || "",
    language: data.language || "",
    stars: data.stargazers_count || 0,
    forks: data.forks_count || 0,
    url: data.html_url,
  };
}

// Get file content
async function getFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  try {
    const { data } = await makeRequest(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
        path
      )}`
    );

    if (data.type === "file" && data.content) {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }

    return "";
  } catch (error) {
    console.warn(
      `Failed to get content for ${path}:`,
      error instanceof Error ? error.message : "Unknown error"
    );
    return "";
  }
}

// Get all files from a specific URL (for pagination)
async function getAllFilesFromUrl(
  url: string,
  owner: string,
  repo: string,
  totalSize: { value: number },
  depth: number = 0
): Promise<GitHubFile[]> {
  if (depth > CONFIG.maxDepth) {
    console.warn(
      `Maximum depth (${CONFIG.maxDepth}) reached, stopping recursion`
    );
    return [];
  }

  const { data, headers } = await makeRequest(url);
  const items = Array.isArray(data) ? data : [data];
  const files: GitHubFile[] = [];

  for (const item of items) {
    // Check total size limit
    const maxTotalSizeBytes = CONFIG.maxTotalSizeMB * 1024 * 1024;
    if (totalSize.value > maxTotalSizeBytes) {
      console.warn(
        `Total size limit (${CONFIG.maxTotalSizeMB}MB) reached, stopping analysis`
      );
      break;
    }

    if (item.type === "file" && shouldIncludeFile(item.path, item.size)) {
      const content = await getFileContent(owner, repo, item.path);
      if (content) {
        totalSize.value += item.size;
        files.push({
          name: item.name,
          path: item.path,
          content,
          size: item.size,
          extension: item.path.substring(item.path.lastIndexOf(".")),
        });
      }
    } else if (item.type === "dir") {
      const subFiles = await getAllFiles(
        owner,
        repo,
        item.path,
        totalSize,
        depth + 1
      );
      files.push(...subFiles);
    }
  }

  // Handle pagination
  const linkHeader = headers.get("Link");
  if (linkHeader) {
    const links = parseLinkHeader(linkHeader);
    if (links.next) {
      const nextFiles = await getAllFilesFromUrl(
        links.next,
        owner,
        repo,
        totalSize,
        depth
      );
      files.push(...nextFiles);
    }
  }

  return files;
}

// Get all files recursively with pagination support
async function getAllFiles(
  owner: string,
  repo: string,
  path: string = "",
  totalSize: { value: number } = { value: 0 },
  depth: number = 0
): Promise<GitHubFile[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  return getAllFilesFromUrl(url, owner, repo, totalSize, depth);
}

// Main function to analyze repository
export async function analyzeGitHubRepository(
  githubUrl: string
): Promise<RepositoryData> {
  try {
    const { owner, repo } = parseGitHubUrl(githubUrl);

    console.log(`🔍 Analyzing repository: ${owner}/${repo}`);

    // Get repo info and files in parallel
    const [repoInfo, files] = await Promise.all([
      getRepoInfo(owner, repo),
      getAllFiles(owner, repo),
    ]);

    // Calculate language distribution
    const languages: Record<string, number> = {};
    for (const file of files) {
      const lang = getLanguage(file.extension);
      languages[lang] = (languages[lang] || 0) + file.size;
    }

    console.log(
      `✅ Analysis complete: ${files.length} files, ${
        Object.keys(languages).length
      } languages`
    );

    return {
      repo: repoInfo,
      files,
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      languages,
      rateLimitRemaining: rateLimitInfo.remaining,
    };
  } catch (error) {
    console.error("❌ Repository analysis failed:", error);
    throw new Error(
      `Failed to analyze repository: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Export the main function as default
export default analyzeGitHubRepository;

// Utility function to check current rate limit
export function getRateLimitInfo() {
  return {
    remaining: rateLimitInfo.remaining,
    resetTime: rateLimitInfo.resetTime,
    resetIn: Math.max(
      0,
      Math.ceil((rateLimitInfo.resetTime.getTime() - Date.now()) / 1000 / 60)
    ),
  };
}
