import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Save, Users, MoreHorizontal } from "lucide-react";
import { documentAPI } from "../services/api";
import { joinDocument, leaveDocument, sendDocChange, sendDocCursor, sendDocTyping, getSocket } from "../services/socket";
import { useDocStore } from "../context/stores";
import DocEditor from "../components/Editor/DocEditor";
import Avatar from "../components/common/Avatar";
import { PageSpinner } from "../components/common/Spinner";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

export default function DocEditorPage() {
  const { projectId, docId } = useParams();
  const { updateDocument } = useDocStore();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeEditors, setActiveEditors] = useState([]);
  const [lastSaved, setLastSaved] = useState(null);
  const socket = useRef();

  useEffect(() => {
    documentAPI.get(docId).then(({ data }) => {
      setDoc(data.data);
      setLoading(false);
    });

    joinDocument(docId);
    socket.current = getSocket();

    if (socket.current) {
      socket.current.on("doc:user_joined", ({ user }) => {
        setActiveEditors(prev => [...prev.filter(u => u._id !== user._id), user]);
      });
      socket.current.on("doc:user_left", ({ userId }) => {
        setActiveEditors(prev => prev.filter(u => u._id !== userId));
      });
      socket.current.on("doc:patch", ({ delta, author }) => {

        console.log("Incoming patch from:", author.name);
      });
    }

    return () => {
      leaveDocument(docId);
      socket.current?.off("doc:user_joined");
      socket.current?.off("doc:user_left");
      socket.current?.off("doc:patch");
    };
  }, [docId]);

  const handleChange = useCallback(async ({ json, text }) => {
    if (!doc) return;
    setSaving(true);
    try {
      await documentAPI.update(docId, { content: json, contentText: text });
      setDoc(d => ({ ...d, content: json }));
      updateDocument(docId, { content: json });
      setLastSaved(new Date());

      sendDocChange(docId, json, doc.version);
    } catch {  }
    setSaving(false);
  }, [docId, doc]);

  const handleTitleChange = async (e) => {
    const title = e.target.value;
    setDoc(d => ({ ...d, title }));
    try {
      await documentAPI.update(docId, { title });
      updateDocument(docId, { title });
    } catch {}
  };

  if (loading) return <PageSpinner />;
  if (!doc) return <div className="p-6 text-slate-400">Document not found</div>;

  return (
    <div className="flex flex-col h-full">
      {}
      <div className="flex items-center justify-between px-6 py-3 border-b border-surface-600 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to={`/projects/${projectId}/docs`} className="btn-icon text-slate-500">
            <ArrowLeft size={16} />
          </Link>
          <span className="text-xl">{doc.icon || "📄"}</span>
          <input
            className="bg-transparent text-white font-semibold text-lg outline-none border-b border-transparent 
                       focus:border-brand-500 transition-colors pb-0.5 min-w-0 w-auto"
            value={doc.title}
            onChange={e => setDoc(d => ({ ...d, title: e.target.value }))}
            onBlur={handleTitleChange}
            placeholder="Untitled"
          />
        </div>

        <div className="flex items-center gap-3">
          {}
          {activeEditors.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1.5">
                {activeEditors.slice(0, 4).map(u => (
                  <Avatar key={u._id} user={u} size="xs" className="ring-2 ring-surface-800" title={u.name} />
                ))}
              </div>
              <span className="text-xs text-slate-500">{activeEditors.length} editing</span>
            </div>
          )}

          {}
          <div className="text-xs text-slate-500">
            {saving ? (
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" /> Saving...</span>
            ) : lastSaved ? (
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-green-400 rounded-full" /> Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}</span>
            ) : null}
          </div>

          {doc.lastEditedBy && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Avatar user={doc.lastEditedBy} size="xs" />
              Last edited by {doc.lastEditedBy.name}
            </div>
          )}
        </div>
      </div>

      {}
      {doc.coverImage && (
        <div className="h-40 overflow-hidden flex-shrink-0">
          <img src={doc.coverImage} alt="cover" className="w-full h-full object-cover" />
        </div>
      )}

      {}
      <div className="flex-1 overflow-hidden">
        <DocEditor
          content={doc.content}
          onChange={handleChange}
          onCursorChange={(pos) => sendDocCursor(docId, pos.from, pos)}
          placeholder="Start writing your document..."
        />
      </div>
    </div>
  );
}
