import { create } from "zustand";
import { projectAPI, taskAPI, issueAPI, documentAPI } from "../services/api";

export const useProjectStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  activity: [],
  loading: false,

  fetchProjects: async () => {
    set({ loading: true });
    try {
      const { data } = await projectAPI.list();
      set({ projects: data.data, loading: false });
    } catch { set({ loading: false }); }
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  fetchProject: async (id) => {
    const { data } = await projectAPI.get(id);
    set({ currentProject: data.data });
    return data.data;
  },

  createProject: async (payload) => {
    const { data } = await projectAPI.create(payload);
    set((s) => ({ projects: [data.data, ...s.projects] }));
    return data.data;
  },

  updateProject: async (id, payload) => {
    const { data } = await projectAPI.update(id, payload);
    set((s) => ({
      projects: s.projects.map((p) => (p._id === id ? data.data : p)),
      currentProject: s.currentProject?._id === id ? data.data : s.currentProject,
    }));
    return data.data;
  },

  deleteProject: async (id) => {
    await projectAPI.delete(id);
    set((s) => ({
      projects: s.projects.filter((p) => p._id !== id),
      currentProject: s.currentProject?._id === id ? null : s.currentProject,
    }));
  },

  fetchActivity: async (id) => {
    const { data } = await projectAPI.getActivity(id);
    set({ activity: data.data });
  },

  onProjectUpdated: (project) =>
    set((s) => ({
      projects: s.projects.map((p) => (p._id === project._id ? project : p)),
      currentProject: s.currentProject?._id === project._id ? project : s.currentProject,
    })),

  onMemberAdded: (payload) =>
    set((s) => ({
      currentProject: s.currentProject?._id === payload.projectId
        ? { ...s.currentProject, members: [...s.currentProject.members, payload.member] }
        : s.currentProject,
    })),
}));

export const useTaskStore = create((set, get) => ({
  tasks: [],
  loading: false,

  fetchTasks: async (params) => {
    set({ loading: true });
    try {
      const { data } = await taskAPI.list(params);
      set({ tasks: data.data, loading: false });
    } catch { set({ loading: false }); }
  },

  createTask: async (payload) => {
    const { data } = await taskAPI.create(payload);
    set((s) => ({ tasks: [...s.tasks, data.data] }));
    return data.data;
  },

  updateTask: async (id, payload) => {
    const { data } = await taskAPI.update(id, payload);
    set((s) => ({ tasks: s.tasks.map((t) => (t._id === id ? data.data : t)) }));
    return data.data;
  },

  deleteTask: async (id) => {
    await taskAPI.delete(id);
    set((s) => ({ tasks: s.tasks.filter((t) => t._id !== id) }));
  },

  reorderTasks: async (updates, projectId) => {

    set((s) => ({
      tasks: s.tasks.map((t) => {
        const u = updates.find((u) => u.id === t._id);
        return u ? { ...t, status: u.status, order: u.order } : t;
      }),
    }));
    try {
      await taskAPI.reorder({ updates, project: projectId });
    } catch (err) {
      get().fetchTasks({ project: projectId });
    }
  },

  onTaskCreated: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
  onTaskUpdated: (task) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t._id === task._id ? task : t)) })),
  onTaskDeleted: ({ taskId }) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t._id !== taskId) })),
  onTaskMoved: ({ taskId, toStatus, order }) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t._id === taskId ? { ...t, status: toStatus, order } : t
      ),
    })),
}));

export const useIssueStore = create((set) => ({
  issues: [],
  meta: {},
  loading: false,

  fetchIssues: async (params) => {
    set({ loading: true });
    try {
      const { data } = await issueAPI.list(params);
      set({ issues: data.data, meta: data.meta, loading: false });
    } catch { set({ loading: false }); }
  },

  createIssue: async (payload) => {
    const { data } = await issueAPI.create(payload);
    set((s) => ({ issues: [data.data, ...s.issues] }));
    return data.data;
  },

  updateIssue: async (id, payload) => {
    const { data } = await issueAPI.update(id, payload);
    set((s) => ({ issues: s.issues.map((i) => (i._id === id ? data.data : i)) }));
    return data.data;
  },

  deleteIssue: async (id) => {
    await issueAPI.delete(id);
    set((s) => ({ issues: s.issues.filter((i) => i._id !== id) }));
  },

  onIssueCreated: (issue) => set((s) => ({ issues: [issue, ...s.issues] })),
  onIssueUpdated: (issue) =>
    set((s) => ({ issues: s.issues.map((i) => (i._id === issue._id ? issue : i)) })),
  onIssueDeleted: ({ issueId }) =>
    set((s) => ({ issues: s.issues.filter((i) => i._id !== issueId) })),
}));

export const useDocStore = create((set) => ({
  documents: [],
  loading: false,

  fetchDocuments: async (params) => {
    set({ loading: true });
    try {
      const { data } = await documentAPI.list(params);
      set({ documents: data.data, loading: false });
    } catch { set({ loading: false }); }
  },

  createDocument: async (payload) => {
    const { data } = await documentAPI.create(payload);
    set((s) => ({ documents: [...s.documents, data.data] }));
    return data.data;
  },

  updateDocument: (id, updates) =>
    set((s) => ({
      documents: s.documents.map((d) => (d._id === id ? { ...d, ...updates } : d)),
    })),

  archiveDocument: async (id) => {
    await documentAPI.archive(id);
    set((s) => ({ documents: s.documents.filter((d) => d._id !== id) }));
  },

  onDocCreated: (doc) => set((s) => ({ documents: [...s.documents, doc] })),
  onDocArchived: ({ docId }) =>
    set((s) => ({ documents: s.documents.filter((d) => d._id !== docId) })),
}));

export const useNotifStore = create((set) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifications, unreadCount) =>
    set({ notifications, unreadCount }),

  addNotification: (notif) =>
    set((s) => ({
      notifications: [notif, ...s.notifications],
      unreadCount: s.unreadCount + 1,
    })),

  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n._id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - 1),
    })),

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),
}));
