import { useEffect, useMemo, useRef, useState } from "react";
import { Bug, FileText, Kanban, MessageSquare, Search, User, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { searchAPI } from "../../services/api";
import Spinner from "./Spinner";

const TYPE_ICONS = { document: FileText, board: Kanban, issue: Bug, user: User, comment: MessageSquare };
const TYPE_LABELS = { document: "Documents", board: "Board", issue: "Issues", user: "People", comment: "Comments" };

const renderHighlighted = (html, fallback) => {
  const value = html || fallback || "";
  const parts = value.split(/(<mark>|<\/mark>)/g);
  let marked = false;
  return parts.map((part, index) => {
    if (part === "<mark>") {
      marked = true;
      return null;
    }
    if (part === "</mark>") {
      marked = false;
      return null;
    }
    return marked ? <mark key={index} className="bg-brand-500/30 text-brand-100 rounded px-0.5">{part}</mark> : part;
  });
};

export default function SearchModal({ onClose }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const timer = useRef();

  const grouped = useMemo(() => hits.reduce((acc, hit) => {
    acc[hit.type] = acc[hit.type] || [];
    acc[hit.type].push(hit);
    return acc;
  }, {}), [hits]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setHits([]);
      return undefined;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await searchAPI.search({
          q,
          ...(projectId && { project: projectId }),
          types: "document,issue,board,user,comment",
          limit: 8,
        });
        setHits(data.hits || []);
        setActive(0);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer.current);
  }, [q, projectId]);

  const goTo = (item = hits[active]) => {
    if (!item) return;
    navigate(item.url || "/dashboard");
    onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((value) => Math.min(value + 1, hits.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((value) => Math.max(value - 1, 0));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      goTo();
    }
    if (e.key === "Escape") onClose();
  };

  let cursor = -1;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface-800 border border-surface-500 rounded-2xl shadow-2xl w-full max-w-xl animate-slide-up overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-600">
          <Search size={18} className="text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onKeyDown={onKeyDown}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search documents, issues, people, comments..."
            className="flex-1 bg-transparent outline-none text-white placeholder:text-slate-500 text-sm"
          />
          {loading && <Spinner size="sm" />}
          <button onClick={onClose} className="btn-icon flex-shrink-0"><X size={15} /></button>
        </div>

        <div className="max-h-[430px] overflow-y-auto">
          {!q && <div className="py-8 text-center text-slate-600 text-sm">Start typing to search...</div>}
          {q && !loading && hits.length === 0 && <div className="py-8 text-center text-slate-600 text-sm">No results for "{q}"</div>}
          {Object.entries(grouped).map(([type, items]) => {
            const Icon = TYPE_ICONS[type] || FileText;
            return (
              <div key={type}>
                <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-surface-700/50">
                  {TYPE_LABELS[type] || type}
                </div>
                {items.map((item) => {
                  cursor += 1;
                  const selected = cursor === active;
                  return (
                    <button
                      key={item.id}
                      onMouseEnter={() => setActive(hits.findIndex((hit) => hit.id === item.id))}
                      onClick={() => goTo(item)}
                      className={`w-full flex items-start gap-3 px-4 py-2.5 transition-colors text-left ${selected ? "bg-surface-600" : "hover:bg-surface-600/70"}`}
                    >
                      <Icon size={15} className="text-slate-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">
                          {renderHighlighted(item._formatted?.title || item._formatted?.name, item.title || item.name)}
                        </p>
                        {(item._formatted?.body || item._formatted?.content || item._formatted?.comment) && (
                          <p className="text-xs text-slate-500 line-clamp-1">
                            {renderHighlighted(item._formatted?.body || item._formatted?.content || item._formatted?.comment)}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="px-4 py-2 border-t border-surface-600 flex items-center gap-3 text-xs text-slate-600">
          <span><kbd className="font-mono bg-surface-600 px-1 rounded">Up/Down</kbd> navigate</span>
          <span><kbd className="font-mono bg-surface-600 px-1 rounded">Enter</kbd> select</span>
          <span><kbd className="font-mono bg-surface-600 px-1 rounded">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
