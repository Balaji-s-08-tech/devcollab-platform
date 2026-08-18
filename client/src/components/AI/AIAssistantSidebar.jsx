import { useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { BASE_URL, fetchCsrfToken } from "../../services/api";
import toast from "react-hot-toast";

export default function AIAssistantSidebar({ documentId, onClose }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);

  const ask = async (e) => {
    e.preventDefault();
    if (!documentId) {
      toast.error("Open a document to chat with it");
      return;
    }

    const prompt = question.trim();
    if (!prompt) return;
    setQuestion("");
    setMessages((items) => [...items, { role: "user", text: prompt }, { role: "assistant", text: "" }]);
    setStreaming(true);

    try {
      const csrf = await fetchCsrfToken();
      const response = await fetch(`${BASE_URL}/ai/documents/${documentId}/ask`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("dc_token")}`,
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify({ question: prompt }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      let done = false;
      while (!done) {
        const chunk = await reader.read();
        done = chunk.done;
        if (done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        for (const event of events) {
          const line = event.split("\n").find((entry) => entry.startsWith("data: "));
          if (!line) continue;
          const data = JSON.parse(line.slice(6));
          if (data.delta) {
            setMessages((items) => {
              const next = [...items];
              next[next.length - 1] = { ...next[next.length - 1], text: next[next.length - 1].text + data.delta };
              return next;
            });
          }
        }
      }
    } catch {
      toast.error("AI response failed");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <aside className="w-96 border-l border-surface-600 bg-surface-800 flex flex-col">
      <div className="h-14 px-4 border-b border-surface-600 flex items-center gap-2">
        <Bot size={18} className="text-brand-400" />
        <h2 className="text-sm font-semibold text-white flex-1">AI Assistant</h2>
        <button className="btn-icon" onClick={onClose}><X size={15} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-sm text-slate-500">
            Ask about the current document. Answers are grounded in indexed document chunks.
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`rounded-lg px-3 py-2 text-sm ${message.role === "user" ? "bg-brand-600 text-white ml-8" : "bg-surface-700 text-slate-200 mr-8"}`}
          >
            {message.text || (streaming ? "Thinking..." : "")}
          </div>
        ))}
      </div>

      <form onSubmit={ask} className="p-3 border-t border-surface-600 flex gap-2">
        <input
          className="input flex-1"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={documentId ? "Ask this document..." : "Open a document first"}
          disabled={streaming}
        />
        <button className="btn-primary px-3" disabled={streaming || !question.trim()}>
          <Send size={15} />
        </button>
      </form>
    </aside>
  );
}
