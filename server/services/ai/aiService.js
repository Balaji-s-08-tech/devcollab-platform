const provider = require("./openaiProvider");
const prompts = require("./prompts");

const system = "You are DevCollab AI, a practical collaboration assistant. Be concise, structured, and implementation-minded.";

const generateIssues = (description) =>
  provider.generateJson({ system, prompt: prompts.issueGenerationPrompt({ description }), schemaName: "issues" });

const summarizeMeeting = (transcript) =>
  provider.generateJson({ system, prompt: prompts.meetingSummaryPrompt({ transcript }), schemaName: "meeting_summary" });

const planSprint = ({ backlog, velocity }) =>
  provider.generateJson({ system, prompt: prompts.sprintPlanPrompt({ backlog, velocity }), schemaName: "sprint_plan" });

const generateStandup = (activity) =>
  provider.generateJson({ system, prompt: prompts.standupPrompt({ activity }), schemaName: "standup" });

const summarizeAnalytics = (metrics) =>
  provider.generateJson({ system, prompt: prompts.analyticsPrompt({ metrics }), schemaName: "analytics" });

module.exports = {
  generateIssues,
  generateStandup,
  planSprint,
  summarizeAnalytics,
  summarizeMeeting,
};
