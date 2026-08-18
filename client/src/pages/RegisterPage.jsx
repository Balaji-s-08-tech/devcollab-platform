import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../context/authStore";
import { Zap } from "lucide-react";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const handle = async (e) => {
    e.preventDefault();
    const res = await register(form.name, form.email, form.password);
    if (res.success) { toast.success("Account created!"); navigate("/dashboard"); }
    else toast.error(res.message);
  };

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

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
          <h1 className="text-xl font-semibold text-white mb-1">Create account</h1>
          <p className="text-sm text-slate-500 mb-6">Start collaborating with your team</p>
          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" required value={form.name} onChange={set("name")} placeholder="Jane Smith" autoFocus />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={form.email} onChange={set("email")} placeholder="jane@example.com" />
            </div>
            <div>
              <label className="label">Password <span className="text-slate-600 normal-case font-normal">(min 8 chars)</span></label>
              <input className="input" type="password" required minLength={8} value={form.password} onChange={set("password")} placeholder="••••••••" />
            </div>
            <button className="btn-primary w-full justify-center" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Account"}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-4">
            Have an account? <Link to="/login" className="text-brand-400 hover:text-brand-300">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
