import { CONFIG } from "./config.helper";

// Parse GitHub URL with support for multiple formats
export function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const cleanUrl = url.trim().replace(/\/$/, "");

  const patterns = [
    /^https?:\/\/(?:www\.)?github\.com\/([^\/\s]+)\/([^\/\s]+?)(?:\/.*)?(?:\.git)?$/,
    /^git@github\.com:([^\/\s]+)\/([^\/\s]+?)(?:\.git)?$/,
    /^(?:www\.)?github\.com\/([^\/\s]+)\/([^\/\s]+?)(?:\/.*)?(?:\.git)?$/,
  ];

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match) {
      const owner = match[1];
      const repo = match[2];

      if (owner && repo && !["tree", "blob", "commit"].includes(owner)) {
        return { owner, repo };
      }
    }
  }

  throw new Error(
    "Invalid GitHub URL. Supported formats: https://github.com/owner/repo, git@github.com:owner/repo.git"
  );
}

export function shouldIncludeFile(path: string, size: number): boolean {
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

// Parse GitHub API Link header for pagination
export function parseLinkHeader(linkHeader: string): { next?: string } {
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
