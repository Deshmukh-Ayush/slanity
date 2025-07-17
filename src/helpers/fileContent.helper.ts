import { GitHubFile } from "@/types/github-api";
import { CONFIG } from "./config.helper";
import { makeRequest } from "./repoInfo.helper";
import { parseLinkHeader, shouldIncludeFile } from "./github.helper";

// Get file content
export async function getFileContent(
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
export async function getAllFilesFromUrl(
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
export async function getAllFiles(
  owner: string,
  repo: string,
  path: string = "",
  totalSize: { value: number } = { value: 0 },
  depth: number = 0
): Promise<GitHubFile[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  return getAllFilesFromUrl(url, owner, repo, totalSize, depth);
}
