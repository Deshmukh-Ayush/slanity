import { CONFIG } from "./config.helper";

let rateLimitInfo = {
  remaining: 5000,
  resetTime: new Date(),
};

export async function makeRequest(
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

  const remaining = response.headers.get("X-RateLimit-Remaining");
  const resetTime = response.headers.get("X-RateLimit-Reset");

  if (remaining) {
    rateLimitInfo.remaining = parseInt(remaining);
  }
  if (resetTime) {
    rateLimitInfo.resetTime = new Date(parseInt(resetTime) * 1000);
  }

  if (rateLimitInfo.remaining < CONFIG.rateLimitThreshold) {
    const resetIn = Math.ceil(
      (rateLimitInfo.resetTime.getTime() - Date.now()) / 1000 / 60
    );
    console.warn(
      `⚠️  Rate limit running low: ${rateLimitInfo.remaining} requests remaining. Resets in ${resetIn} minutes.`
    );

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

export async function getRepoInfo(owner: string, repo: string) {
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
