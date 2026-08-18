import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../context/authStore";
import { Github, ShieldCheck, Zap } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, verifyTwoFactor, isLoading } = useAuthStore();
  const [form, setForm] = useState({ email: "", password: "", code: "" });
  const [challengeId, setChallengeId] = useState(null);
  const oauthBase = import.meta.env.VITE_API_URL || "/api";

  const handle = async (e) => {
    e.preventDefault();
    const res = challengeId
      ? await verifyTwoFactor(challengeId, form.code)
      : await login(form.email, form.password);

    if (res.success) {
      toast.success("Welcome back!");
      navigate("/dashboard");
    } else if (res.requiresTwoFactor) {
      setChallengeId(res.challengeId);
      toast.success("Enter your authenticator code");
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-glow-brand">
            <Zap size={20} className="text-white" />
          </div>
          <span className="font-display font-bold text-2xl text-white">DevCollab</span>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-semibold text-white mb-1">Sign in</h1>
          <p className="text-sm text-slate-500 mb-6">Welcome back to your workspace</p>

          <form onSubmit={handle} className="space-y-4">
            {!challengeId ? (
              <>
                <div>
                  <label className="label">Email</label>
                  <input
                    className="input"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="you@example.com"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input
                    className="input"
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Password"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="label flex items-center gap-1.5">
                  <ShieldCheck size={13} /> Authenticator code
                </label>
                <input
                  className="input tracking-widest"
                  required
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                  placeholder="123456"
                  autoFocus
                />
              </div>
            )}

            <button className="btn-primary w-full justify-center" disabled={isLoading}>
              {isLoading ? "Signing in..." : challengeId ? "Verify" : "Sign In"}
            </button>
          </form>

          {!challengeId && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <a className="btn-secondary justify-center" href={`${oauthBase}/auth/oauth/google`}>
                Google
              </a>
              <a className="btn-secondary justify-center" href={`${oauthBase}/auth/oauth/github`}>
                <Github size={15} /> GitHub
              </a>
            </div>
          )}

          <p className="text-center text-sm text-slate-500 mt-4">
            No account? <Link to="/register" className="text-brand-400 hover:text-brand-300">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
