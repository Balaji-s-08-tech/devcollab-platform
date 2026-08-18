import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-8xl font-display font-black text-surface-600 mb-4">404</p>
        <h1 className="text-2xl font-display font-bold text-white mb-2">Page not found</h1>
        <p className="text-slate-500 mb-6">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/dashboard" className="btn-primary">← Back to Dashboard</Link>
      </div>
    </div>
  );
}
