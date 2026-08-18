import axios from "axios";

export const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

const unsafeMethods = new Set(["post", "put", "patch", "delete"]);
let csrfToken = null;
let csrfPromise = null;

const getCsrfToken = async () => {
  if (csrfToken) return csrfToken;

  if (!csrfPromise) {
    csrfPromise = axios
      .get(`${BASE_URL}/auth/csrf-token`, { withCredentials: true })
      .then(({ data }) => {
        csrfToken = data.csrfToken;
        return csrfToken;
      })
      .finally(() => {
        csrfPromise = null;
      });
  }

  return csrfPromise;
};

export const fetchCsrfToken = getCsrfToken;

api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem("dc_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (unsafeMethods.has((config.method || "get").toLowerCase())) {
    config.headers["X-CSRF-Token"] = await getCsrfToken();
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config || {};

    const authUrl = original.url || "";
    const shouldSkipRefresh = authUrl.startsWith("/auth/login") ||
      authUrl.startsWith("/auth/register") ||
      authUrl.startsWith("/auth/2fa/verify") ||
      authUrl.startsWith("/auth/refresh");

    if (error.response?.status === 401 && !original._retry && !shouldSkipRefresh) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          })
          .catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const csrf = await getCsrfToken();
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true, headers: { "X-CSRF-Token": csrf } }
        );
        localStorage.setItem("dc_token", data.token);
        api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
        processQueue(null, data.token);
        return api(original);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem("dc_token");
        window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 403 && /csrf/i.test(error.response?.data?.message || "") && !original._csrfRetry) {
      csrfToken = null;
      original._csrfRetry = true;
      return api(original);
    }

    return Promise.reject(error);
  }
);

export default api;

export const authAPI = {
  csrf: () => api.get("/auth/csrf-token"),
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  verifyTwoFactor: (data) => api.post("/auth/2fa/verify", data),
  refresh: () => api.post("/auth/refresh"),
  logout: () => api.post("/auth/logout"),
  getMe: () => api.get("/auth/me"),
  updateMe: (data) => api.patch("/auth/me", data),
  enrollTwoFactor: () => api.post("/auth/2fa/enroll"),
  verifyTwoFactorEnrollment: (data) => api.post("/auth/2fa/verify-enrollment", data),
  disableTwoFactor: (data) => api.delete("/auth/2fa", { data }),
  listSessions: () => api.get("/auth/sessions"),
  revokeSession: (id) => api.delete(`/auth/sessions/${id}`),
};

export const projectAPI = {
  list: () => api.get("/projects"),
  create: (data) => api.post("/projects", data),
  get: (id) => api.get(`/projects/${id}`),
  update: (id, data) => api.patch(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  addMember: (id, data) => api.post(`/projects/${id}/members`, data),
  removeMember: (id, userId) => api.delete(`/projects/${id}/members/${userId}`),
  getActivity: (id, params) => api.get(`/projects/${id}/activity`, { params }),
};

export const documentAPI = {
  list: (params) => api.get("/documents", { params }),
  create: (data) => api.post("/documents", data),
  get: (id) => api.get(`/documents/${id}`),
  update: (id, data) => api.patch(`/documents/${id}`, data),
  archive: (id) => api.delete(`/documents/${id}`),
  addComment: (id, data) => api.post(`/documents/${id}/comments`, data),
};

export const taskAPI = {
  list: (params) => api.get("/tasks", { params }),
  create: (data) => api.post("/tasks", data),
  get: (id) => api.get(`/tasks/${id}`),
  update: (id, data) => api.patch(`/tasks/${id}`, data),
  reorder: (data) => api.patch("/tasks/reorder", data),
  delete: (id) => api.delete(`/tasks/${id}`),
  addComment: (id, data) => api.post(`/tasks/${id}/comments`, data),
};

export const issueAPI = {
  list: (params) => api.get("/issues", { params }),
  create: (data) => api.post("/issues", data),
  get: (id, params) => api.get(`/issues/${id}`, { params }),
  update: (id, data) => api.patch(`/issues/${id}`, data),
  delete: (id) => api.delete(`/issues/${id}`),
  addComment: (id, data) => api.post(`/issues/${id}/comments`, data),
};

export const searchAPI = {
  search: (params) => api.get("/search", { params }),
};

export const permissionAPI = {
  effective: (params) => api.get("/permissions/effective", { params }),
  grant: (data) => api.post("/permissions/grants", data),
  update: (data) => api.patch("/permissions/grants", data),
  revoke: (data) => api.delete("/permissions/grants", { data }),
  invite: (data) => api.post("/permissions/invites", data),
  acceptInvite: (token) => api.post("/permissions/invites/accept", { token }),
  createShareLink: (data) => api.post("/permissions/share-links", data),
  revokeShareLink: (id) => api.delete(`/permissions/share-links/${id}`),
};

export const aiAPI = {
  getJob: (id) => api.get(`/ai/jobs/${id}`),
  indexDocument: (id) => api.post(`/ai/documents/${id}/index`),
  generateIssues: (data) => api.post("/ai/issues/generate", data),
  summarizeMeeting: (data) => api.post("/ai/meetings/summarize", data),
  planSprint: (data) => api.post("/ai/sprints/plan", data),
  generateStandup: (data) => api.post("/ai/standup", data),
  summarizeAnalytics: (data) => api.post("/ai/analytics/insights", data),
};

export const notificationAPI = {
  list: (params) => api.get("/notifications", { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all"),
  delete: (id) => api.delete(`/notifications/${id}`),
};

export const teamAPI = {
  searchUsers: (q) => api.get("/teams/users", { params: { q } }),
};

export const gitAPI = {
  listRepos: (params) => api.get("/git/repos", { params }),
  getRepo: (id) => api.get(`/git/repos/${id}`),
  deleteRepo: (id) => api.delete(`/git/repos/${id}`),
  clone: (data) => api.post("/git/clone", data),
  pull: (data) => api.post("/git/pull", data),
  commit: (data) => api.post("/git/commit", data),
  push: (data) => api.post("/git/push", data),
  getHistory: (params) => api.get("/git/history", { params }),
  getStatus: (params) => api.get("/git/status", { params }),
  getDiff: (params) => api.get("/git/diff", { params }),
};

export const chatApi = {
  getChannels: (projectId) => api.get("/chat/channels", { params: { projectId } }),
  createChannel: (data) => api.post("/chat/channels", data),
  updateChannel: (id, data) => api.patch(`/chat/channels/${id}`, data),
  addMember: (id, data) => api.post(`/chat/channels/${id}/members`, data),
  getMessages: (channelId, params) => api.get(`/chat/channels/${channelId}/messages`, { params }),
  editMessage: (id, data) => api.patch(`/chat/messages/${id}`, data),
  deleteMessage: (id) => api.delete(`/chat/messages/${id}`),
  reactToMessage: (id, data) => api.post(`/chat/messages/${id}/react`, data),
  createDM: (data) => api.post("/chat/dm", data),
};

export const videoAPI = {
  createRoom: (data) => api.post("/video/rooms", data),
  getRooms: (params) => api.get("/video/rooms", { params }),
  getRoom: (roomId) => api.get(`/video/rooms/${roomId}`),
  joinRoom: (roomId) => api.post(`/video/rooms/${roomId}/join`),
  endRoom: (roomId) => api.delete(`/video/rooms/${roomId}`),
};

export const githubAPI = {
  getStatus: () => api.get("/github/status"),
  disconnect: () => api.delete("/github/disconnect"),
  getRepos: (params) => api.get("/github/repos", { params }),
  getRepoCommits: (owner, repo, params) => api.get(`/github/repos/${owner}/${repo}/commits`, { params }),
  getRepoIssues: (owner, repo, params) => api.get(`/github/repos/${owner}/${repo}/issues`, { params }),
  syncIssues: (owner, repo, data) => api.post(`/github/repos/${owner}/${repo}/sync-issues`, data),

  getAuthUrl: () => `${api.defaults.baseURL}/github/auth`,
};
