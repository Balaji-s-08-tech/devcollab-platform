import { create } from "zustand";
import { authAPI } from "../services/api";
import { initSocket, disconnectSocket } from "../services/socket";

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem("dc_token"),
  isLoading: false,
  isAuthenticated: !!localStorage.getItem("dc_token"),

  completeAuth: (data) => {
    localStorage.setItem("dc_token", data.token);
    initSocket(data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
  },

  acceptOAuthToken: async (token) => {
    localStorage.setItem("dc_token", token);
    initSocket(token);
    set({ token, isAuthenticated: true, isLoading: true });
    await get().fetchMe();
    set({ isLoading: false });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await authAPI.login({ email, password });
      if (data.requiresTwoFactor) {
        set({ isLoading: false });
        return { success: false, requiresTwoFactor: true, challengeId: data.challengeId };
      }
      get().completeAuth(data);
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, message: err.response?.data?.message || "Login failed" };
    }
  },

  verifyTwoFactor: async (challengeId, code) => {
    set({ isLoading: true });
    try {
      const normalized = code.includes("-")
        ? { backupCode: code }
        : { token: code };
      const { data } = await authAPI.verifyTwoFactor({ challengeId, ...normalized });
      get().completeAuth(data);
      return { success: true, backupCodeUsed: data.backupCodeUsed };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, message: err.response?.data?.message || "Invalid verification code" };
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await authAPI.register({ name, email, password });
      get().completeAuth(data);
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, message: err.response?.data?.message || "Registration failed" };
    }
  },

  logout: async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem("dc_token");
    disconnectSocket();
    set({ user: null, token: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    try {
      const { data } = await authAPI.getMe();
      set({ user: data.user, isAuthenticated: true });
      const token = localStorage.getItem("dc_token");
      if (token) initSocket(token);
    } catch {
      localStorage.removeItem("dc_token");
      set({ user: null, isAuthenticated: false });
    }
  },

  updateUser: (updates) => set((s) => ({ user: { ...s.user, ...updates } })),
}));

export default useAuthStore;
