// Types for GitHub integration
export interface GitHubFile {
  name: string;
  path: string;
  content: string;
  size: number;
  extension: string;
}

export interface RepositoryData {
  repo: {
    owner: string;
    name: string;
    description: string;
    language: string;
    stars: number;
    forks: number;
    url: string;
  };
  files: GitHubFile[];
  totalFiles: number;
  totalSize: number;
  languages: Record<string, number>;
  rateLimitRemaining?: number;
}
