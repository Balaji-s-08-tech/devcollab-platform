require("dotenv").config({ path: "../.env" });
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Project = require("../models/Project");
const Task = require("../models/Task");
const Issue = require("../models/Issue");
const Document = require("../models/Document");

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/devcollab");
  console.log("Connected to MongoDB");

  await Promise.all([User.deleteMany(), Project.deleteMany(), Task.deleteMany(), Issue.deleteMany(), Document.deleteMany()]);
  console.log("Cleared existing data");

  const [alice, bob, charlie] = await User.create([
    { name: "Alice Chen", email: "alice@devcollab.dev", password: "password123", role: "admin" },
    { name: "Bob Smith", email: "bob@devcollab.dev", password: "password123", role: "developer" },
    { name: "Charlie Park", email: "charlie@devcollab.dev", password: "password123", role: "developer" },
  ]);
  console.log("Created 3 users");

  const project = await Project.create({
    name: "DevCollab Platform",
    description: "The main DevCollab SaaS platform — real-time collaboration for dev teams.",
    icon: "🚀",
    color: "#6366f1",
    owner: alice._id,
    members: [
      { user: alice._id, role: "owner" },
      { user: bob._id, role: "developer" },
      { user: charlie._id, role: "developer" },
    ],
    stats: { openIssues: 3, totalTasks: 8, documents: 2 },
  });
  console.log("Created project");

  await Task.create([
    { project: project._id, title: "Set up CI/CD pipeline", status: "done", priority: "high", author: alice._id, assignees: [bob._id] },
    { project: project._id, title: "Implement Socket.io real-time sync", status: "in_progress", priority: "urgent", author: bob._id, assignees: [bob._id, charlie._id] },
    { project: project._id, title: "Design system tokens + Tailwind config", status: "done", priority: "medium", author: alice._id, assignees: [alice._id] },
    { project: project._id, title: "MongoDB Atlas migration", status: "todo", priority: "medium", author: charlie._id, assignees: [charlie._id] },
    { project: project._id, title: "Redis caching layer", status: "in_review", priority: "high", author: bob._id, assignees: [bob._id] },
    { project: project._id, title: "Write API documentation", status: "backlog", priority: "low", author: alice._id },
    { project: project._id, title: "Add E2E tests with Playwright", status: "todo", priority: "medium", author: charlie._id },
    { project: project._id, title: "Performance audit & optimization", status: "backlog", priority: "low", author: alice._id },
  ]);
  console.log("Created 8 tasks");

  await Issue.create([
    { project: project._id, title: "Socket reconnection fails after 30s idle", body: "When a user goes idle for 30+ seconds, the socket doesn't reconnect properly on wake.", type: "bug", priority: "high", state: "open", author: bob._id, assignees: [charlie._id], number: 1 },
    { project: project._id, title: "Add dark/light mode toggle", body: "Users should be able to switch between dark and light mode from their preferences.", type: "feature", priority: "medium", state: "open", author: charlie._id, number: 2 },
    { project: project._id, title: "Markdown preview flickers on fast typing", body: "When typing quickly in markdown mode, the preview panel flickers noticeably.", type: "bug", priority: "medium", state: "open", author: alice._id, assignees: [bob._id], number: 3 },
    { project: project._id, title: "Initial project scaffold", body: "Set up the initial project structure including Vite + React frontend and Express backend.", type: "task", priority: "high", state: "closed", author: alice._id, closedAt: new Date(), number: 4 },
  ]);
  console.log("Created 4 issues");

  await Document.create([
    {
      project: project._id,
      title: "Architecture Overview",
      icon: "🏗️",
      author: alice._id,
      isPinned: true,
      content: { type: "doc", content: [{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Architecture Overview" }] }, { type: "paragraph", content: [{ type: "text", text: "DevCollab is a full-stack real-time collaboration platform built with React, Node.js, MongoDB, and Redis." }] }] },
      contentText: "Architecture Overview DevCollab is a full-stack real-time collaboration platform.",
    },
    {
      project: project._id,
      title: "Getting Started Guide",
      icon: "🚀",
      author: alice._id,
      content: { type: "doc", content: [{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Getting Started" }] }, { type: "paragraph", content: [{ type: "text", text: "Welcome to DevCollab! This guide will help you get up and running." }] }] },
      contentText: "Getting Started Welcome to DevCollab! This guide will help you get up and running.",
    },
  ]);
  console.log("Created 2 documents");

  console.log("\n✅ Seed complete!");
  console.log("───────────────────────────────");
  console.log("Demo credentials:");
  console.log("  alice@devcollab.dev / password123  (admin)");
  console.log("  bob@devcollab.dev   / password123  (developer)");
  console.log("  charlie@devcollab.dev / password123 (developer)");
  console.log("───────────────────────────────");
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
