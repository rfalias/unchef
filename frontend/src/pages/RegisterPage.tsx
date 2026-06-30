import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register, login } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import toast from "react-hot-toast";
import axios from "axios";

export default function RegisterPage() {
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [regOpen, setRegOpen] = useState<boolean | null>(null);

  useEffect(() => {
    axios.get("/api/v1/auth/registration-open")
      .then(r => setRegOpen(r.data.open))
      .catch(() => setRegOpen(true)); // fail open
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwords don't match."); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      await register(username, password);
      const { access_token } = await login(username, password);
      setToken(access_token);
      navigate("/recipes");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Registration failed.";
      toast.error(typeof msg === "string" ? msg : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">🥗</span>
          <h1 className="text-2xl font-bold text-gray-100 mt-2">Uninspired Chef</h1>
          <p className="text-gray-500 text-sm mt-1">Create an account</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
          {regOpen === false ? (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm mb-1">Registration is currently disabled.</p>
              <p className="text-gray-600 text-xs">Contact an administrator to create an account.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                />
              </div>
              <button
                type="submit"
                disabled={loading || regOpen === null}
                className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white font-semibold py-2.5 rounded-lg transition-colors mt-2"
              >
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-600 mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-green-400 hover:text-green-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
