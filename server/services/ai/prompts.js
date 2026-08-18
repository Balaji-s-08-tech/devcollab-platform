const issueGenerationPrompt = ({ description }) => `
Create a practical issue breakdown for this feature request.

Feature:
${description}

Return JSON with:
{
  "issues": [
    {
      "title": "short issue title",
      "description": "developer-ready description",
      "acceptanceCriteria": ["criterion"],
      "estimate": 1,
      "priority": "low|medium|high|critical",
      "type": "feature|bug|enhancement|documentation|task|other"
    }
  ]
}
`;

const meetingSummaryPrompt = ({ transcript }) => `
Summarize this meeting transcript into JSON:
{
  "summary": "brief summary",
  "decisions": ["decision"],
  "actionItems": [{"owner": "person or team", "task": "task", "dueDate": null}],
  "risks": ["risk"]
}

Transcript:
${transcript}
`;

const sprintPlanPrompt = ({ backlog, velocity }) => `
Given team velocity ${velocity}, select a realistic sprint plan from this backlog.
Return JSON with {"summary": "...", "selected": [], "deferred": [], "risks": []}.

Backlog:
${JSON.stringify(backlog, null, 2)}
`;

const standupPrompt = ({ activity }) => `
Draft a concise standup from this activity.
Return JSON with {"yesterday": [], "today": [], "blockers": []}.

Activity:
${JSON.stringify(activity, null, 2)}
`;

const analyticsPrompt = ({ metrics }) => `
Explain collaboration/productivity metrics in plain language.
Return JSON with {"summary": "...", "insights": [], "recommendations": []}.

Metrics:
${JSON.stringify(metrics, null, 2)}
`;

module.exports = {
  analyticsPrompt,
  issueGenerationPrompt,
  meetingSummaryPrompt,
  sprintPlanPrompt,
  standupPrompt,
};
