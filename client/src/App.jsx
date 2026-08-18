import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import useAuthStore from "./context/authStore";
import { getSocket } from "./services/socket";
import { useTaskStore, useIssueStore, useDocStore, useNotifStore, useProjectStore } from "./context/stores";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ProjectPage from "./pages/ProjectPage";
import BoardPage from "./pages/BoardPage";
import IssuesPage from "./pages/IssuesPage";
import IssuePage from "./pages/IssuePage";
import DocsPage from "./pages/DocsPage";
import DocEditorPage from "./pages/DocEditorPage";
import TeamPage from "./pages/TeamPage";
import SettingsPage from "./pages/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";

import GitPage from "./pages/GitPage";
import ChatPage from "./pages/ChatPage";
import VideoPage from "./pages/VideoPage";
import GitHubPage from "./pages/GitHubPage";

import AppLayout from "./components/Layout/AppLayout";

function Protected({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function SocketEvents() {
  const taskStore = useTaskStore();
  const issueStore = useIssueStore();
  const docStore = useDocStore();
  const notifStore = useNotifStore();
  const projectStore = useProjectStore();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on("task:created", taskStore.onTaskCreated);
    socket.on("task:updated", taskStore.onTaskUpdated);
    socket.on("task:deleted", taskStore.onTaskDeleted);
    socket.on("task:moved", taskStore.onTaskMoved);

    socket.on("issue:created", issueStore.onIssueCreated);
    socket.on("issue:updated", issueStore.onIssueUpdated);
    socket.on("issue:deleted", issueStore.onIssueDeleted);

    socket.on("doc:created", docStore.onDocCreated);
    socket.on("doc:archived", docStore.onDocArchived);

    socket.on("project:updated", projectStore.onProjectUpdated);
    socket.on("project:member_added", projectStore.onMemberAdded);

    socket.on("notification:new", notifStore.addNotification);

    return () => {
      socket.off("task:created");
      socket.off("task:updated");
      socket.off("task:deleted");
      socket.off("task:moved");
      socket.off("issue:created");
      socket.off("issue:updated");
      socket.off("issue:deleted");
      socket.off("doc:created");
      socket.off("doc:archived");
      socket.off("project:updated");
      socket.off("project:member_added");
      socket.off("notification:new");
    };
  }, []);

  return null;
}

function OAuthCallback() {
  const navigate = useNavigate();
  const acceptOAuthToken = useAuthStore((s) => s.acceptOAuthToken);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    acceptOAuthToken(token)
      .then(() => navigate("/dashboard", { replace: true }))
      .catch(() => navigate("/login", { replace: true }));
  }, []);

  return null;
}

export default function App() {
  const { fetchMe, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) fetchMe();
  }, []);

  return (
    <BrowserRouter>
      <SocketEvents />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#232330",
            color: "#f1f5f9",
            border: "1px solid #35354a",
            borderRadius: "12px",
            fontSize: "14px",
          },
          success: { iconTheme: { primary: "#6366f1", secondary: "#fff" } },
        }}
      />
      <Routes>
        {}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />

        {}
        <Route
          path="/"
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          <Route path="projects/:projectId" element={<ProjectPage />} />
          <Route path="projects/:projectId/board" element={<BoardPage />} />
          <Route path="projects/:projectId/issues" element={<IssuesPage />} />
          <Route path="projects/:projectId/issues/:issueId" element={<IssuePage />} />
          <Route path="projects/:projectId/docs" element={<DocsPage />} />
          <Route path="projects/:projectId/docs/:docId" element={<DocEditorPage />} />
          <Route path="projects/:projectId/team" element={<TeamPage />} />
          <Route path="projects/:projectId/settings" element={<SettingsPage />} />
          {}
          <Route path="projects/:projectId/git" element={<GitPage />} />
          <Route path="projects/:projectId/chat" element={<ChatPage />} />
          <Route path="projects/:projectId/video" element={<VideoPage />} />
          <Route path="github" element={<GitHubPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
