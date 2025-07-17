import { getLanguage } from "@/helpers/config.helper";
import { RepositoryData } from "@/types/github-api";
import { parseGitHubUrl } from "@/helpers/github.helper";
import { getRepoInfo } from "@/helpers/repoInfo.helper";
import { getAllFiles } from "@/helpers/fileContent.helper";

let rateLimitInfo = {
  remaining: 5000,
  resetTime: new Date(),
};

export async function analyzeGitHubRepository(
  githubUrl: string
): Promise<RepositoryData> {
  try {
    const { owner, repo } = parseGitHubUrl(githubUrl);

    console.log(`Analyzing repository: ${owner}/${repo}`);

    const [repoInfo, files] = await Promise.all([
      getRepoInfo(owner, repo),
      getAllFiles(owner, repo),
    ]);

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
      rateLimitRemaining: getRateLimitInfo().remaining,
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
