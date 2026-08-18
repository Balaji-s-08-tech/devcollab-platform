const GITHUB_API = "https://api.github.com";

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "DevCollab-App",
  };
}

async function apiRequest(path, token, options = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      ...authHeaders(token),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || `GitHub API error: ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

async function getAuthUser(token) {
  return apiRequest("/user", token);
}

async function getUserRepos(token, { page = 1, perPage = 30, sort = "updated" } = {}) {
  return apiRequest(
    `/user/repos?per_page=${perPage}&page=${page}&sort=${sort}&affiliation=owner,collaborator,organization_member`,
    token
  );
}

async function getRepoCommits(token, owner, repo, { per_page = 20, page = 1 } = {}) {
  return apiRequest(`/repos/${owner}/${repo}/commits?per_page=${per_page}&page=${page}`, token);
}

async function getRepoIssues(token, owner, repo, { state = "open", per_page = 20, page = 1 } = {}) {
  return apiRequest(
    `/repos/${owner}/${repo}/issues?state=${state}&per_page=${per_page}&page=${page}`,
    token
  );
}

async function getRepoPRs(token, owner, repo, { state = "open", per_page = 10 } = {}) {
  return apiRequest(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=${per_page}`, token);
}

async function getRepo(token, owner, repo) {
  return apiRequest(`/repos/${owner}/${repo}`, token);
}

module.exports = {
  getAuthUser,
  getUserRepos,
  getRepoCommits,
  getRepoIssues,
  getRepoPRs,
  getRepo,
};
