import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Plus, FileText, Archive, Pin, MoreHorizontal, Trash2 } from "lucide-react";
import { useDocStore } from "../context/stores";
import { documentAPI } from "../services/api";
import { formatDistanceToNow } from "date-fns";
import Avatar from "../components/common/Avatar";
import { PageSpinner } from "../components/common/Spinner";
import toast from "react-hot-toast";
import clsx from "clsx";

const EMOJI_LIST = ["📄","📝","🗒️","📋","🔖","💡","🏗️","🎯","🔥","⚡","🚀","🌐","🔧","📊","🎨"];

export default function DocsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { documents, loading, fetchDocuments, createDocument, archiveDocument } = useDocStore();
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchDocuments({ project: projectId }); }, [projectId]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const doc = await createDocument({ project: projectId, title: "Untitled", icon: "📄" });
      navigate(`/projects/${projectId}/docs/${doc._id}`);
    } catch { toast.error("Failed to create document"); }
    setCreating(false);
  };

  const handleArchive = async (e, id) => {
    e.preventDefault();
    if (!confirm("Archive this document?")) return;
    await archiveDocument(id);
    toast.success("Document archived");
  };

  const pinned = documents.filter(d => d.isPinned);
  const rest = documents.filter(d => !d.isPinned);

  if (loading && documents.length === 0) return <PageSpinner />;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Documents</h1>
          <p className="text-slate-500 text-sm mt-0.5">{documents.length} pages in this project</p>
        </div>
        <button onClick={handleCreate} disabled={creating} className="btn-primary">
          <Plus size={16} /> {creating ? "Creating..." : "New Page"}
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-4">📄</div>
          <p className="text-slate-400 mb-4">No documents yet. Create your first page!</p>
          <button onClick={handleCreate} className="btn-primary mx-auto">
            <Plus size={16} /> Create Page
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Pin size={11} /> Pinned
              </h2>
              <DocList docs={pinned} projectId={projectId} onArchive={handleArchive} />
            </div>
          )}
          <div>
            {pinned.length > 0 && <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">All Pages</h2>}
            <DocList docs={rest} projectId={projectId} onArchive={handleArchive} />
          </div>
        </div>
      )}
    </div>
  );
}

function DocList({ docs, projectId, onArchive }) {
  return (
    <div className="card overflow-hidden divide-y divide-surface-600">
      {docs.map((doc) => (
        <Link
          key={doc._id}
          to={`/projects/${projectId}/docs/${doc._id}`}
          className="flex items-center gap-3 px-4 py-3 hover:bg-surface-600/40 transition-colors group"
        >
          <span className="text-xl flex-shrink-0">{doc.icon || "📄"}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white group-hover:text-brand-400 transition-colors truncate">
              {doc.title || "Untitled"}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              {doc.author && <><Avatar user={doc.author} size="xs" /> <span>{doc.author.name}</span></>}
              <span>· {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</span>
            </div>
          </div>
          <button
            onClick={(e) => onArchive(e, doc._id)}
            className="opacity-0 group-hover:opacity-100 btn-icon text-slate-500 hover:text-red-400 transition-all"
            title="Archive"
          >
            <Archive size={14} />
          </button>
        </Link>
      ))}
    </div>
  );
}
