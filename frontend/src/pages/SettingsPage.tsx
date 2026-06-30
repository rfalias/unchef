import { useState } from "react";
import toast from "react-hot-toast";

const PALETTES = [
  {
    id: "charcoal",
    label: "Charcoal",
    description: "Cool dark gray",
    swatches: ["#0f1117", "#111827", "#1f2937", "#374151"],
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "Blue-tinted slate",
    swatches: ["#020617", "#0f172a", "#1e293b", "#334155"],
  },
  {
    id: "mocha",
    label: "Mocha",
    description: "Warm brown tones",
    swatches: ["#1a1310", "#231b15", "#2e2218", "#42301e"],
  },
];

const ACCENTS = [
  { id: "green",  label: "Green",  color: "#10b981" },
  { id: "blue",   label: "Blue",   color: "#3b82f6" },
  { id: "purple", label: "Purple", color: "#a855f7" },
  { id: "amber",  label: "Amber",  color: "#f59e0b" },
  { id: "rose",   label: "Rose",   color: "#f43f5e" },
  { id: "cyan",   label: "Cyan",   color: "#06b6d4" },
];
import { setApiKey, removeApiKey } from "../api/ai";
import { changePassword } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import { useBranding } from "../contexts/BrandingContext";
import { usernameFromEmail } from "../api/auth";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { branding, saveBranding } = useBranding();

  // API key
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Branding
  const [brandName, setBrandName] = useState("");
  const [brandIcon, setBrandIcon] = useState("");
  const [iconMode, setIconMode] = useState<"emoji" | "image">("emoji");
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [iconError, setIconError] = useState<string | null>(null);
  const [brandingSaving, setBrandingSaving] = useState(false);

  // Theme
  const [themeSaving, setThemeSaving] = useState(false);

  // Password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setSaving(true);
    try {
      await setApiKey(key.trim());
      await refreshUser();
      setKey("");
      toast.success("Claude API key saved and verified.");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail ?? "Failed to save API key.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Remove your Claude API key? AI features will be disabled.")) return;
    setRemoving(true);
    try {
      await removeApiKey();
      await refreshUser();
      toast.success("API key removed.");
    } catch {
      toast.error("Failed to remove API key.");
    } finally {
      setRemoving(false);
    }
  };

  const handleIconFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIconError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setIconError("File must be an image."); return; }
    if (file.size > 64 * 1024) { setIconError("Image must be under 64 KB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX = 256;
        let { width, height } = img;
        if (width <= MAX && height <= MAX) { setIconPreview(dataUrl); setBrandIcon(dataUrl); return; }
        if (width > height) { height = Math.round((height / width) * MAX); width = MAX; }
        else { width = Math.round((width / height) * MAX); height = MAX; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        const scaled = canvas.toDataURL("image/png");
        setIconPreview(scaled); setBrandIcon(scaled);
      };
      img.onerror = () => setIconError("Could not read image.");
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleBrandingSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (iconError) return;
    setBrandingSaving(true);
    try {
      await saveBranding({ app_name: brandName.trim() || undefined, app_icon: brandIcon || undefined });
      setBrandName(""); setBrandIcon(""); setIconPreview(null);
      toast.success("Branding updated.");
    } catch {
      toast.error("Failed to update branding.");
    } finally {
      setBrandingSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) { toast.error("Passwords don't match."); return; }
    if (newPw.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setPwSaving(true);
    try {
      await changePassword(currentPw, newPw);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      toast.success("Password changed.");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail ?? "Failed to change password.");
    } finally {
      setPwSaving(false);
    }
  };

  const handleThemeSave = async (patch: { theme_palette?: string; theme_accent?: string }) => {
    setThemeSaving(true);
    try {
      await saveBranding(patch);
    } catch {
      toast.error("Failed to save theme.");
    } finally {
      setThemeSaving(false);
    }
  };

  const inputCls =
    "flex-1 border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-mono";
  const fieldCls =
    "w-full border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-8">{user ? usernameFromEmail(user.email) : ""}</p>

      {/* Change password */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-gray-100 mb-1">Change Password</h2>
        <p className="text-xs text-gray-500 mb-4">Must be at least 8 characters.</p>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <input
            type="password"
            required
            value={currentPw}
            onChange={e => setCurrentPw(e.target.value)}
            placeholder="Current password"
            className={fieldCls}
          />
          <input
            type="password"
            required
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
            placeholder="New password"
            className={fieldCls}
          />
          <input
            type="password"
            required
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
            placeholder="Confirm new password"
            className={fieldCls}
          />
          <button
            type="submit"
            disabled={pwSaving || !currentPw || !newPw || !confirmPw}
            className="bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {pwSaving ? "Saving…" : "Change Password"}
          </button>
        </form>
      </div>

      {/* Theme — admin only */}
      {user?.role === "admin" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-gray-100 mb-1">Theme</h2>
          <p className="text-xs text-gray-500 mb-5">Applies to all users.</p>

          {/* Palette */}
          <div className="mb-5">
            <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide font-medium">Base Palette</p>
            <div className="grid grid-cols-3 gap-3">
              {PALETTES.map(p => (
                <button
                  key={p.id}
                  type="button"
                  disabled={themeSaving}
                  onClick={() => handleThemeSave({ theme_palette: p.id })}
                  className={`rounded-xl border-2 p-3 text-left transition-all ${
                    branding.theme_palette === p.id
                      ? "border-green-500 ring-1 ring-green-500/30"
                      : "border-gray-700 hover:border-gray-500"
                  }`}
                >
                  {/* Swatch strip using absolute palette colors */}
                  <div className="flex gap-1 mb-2 rounded overflow-hidden h-8">
                    {p.swatches.map((c, i) => (
                      <div key={i} className="flex-1" style={{ background: c }} />
                    ))}
                  </div>
                  <p className="text-xs font-medium text-gray-200">{p.label}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{p.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Accent */}
          <div>
            <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide font-medium">Accent Color</p>
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map(a => (
                <button
                  key={a.id}
                  type="button"
                  disabled={themeSaving}
                  onClick={() => handleThemeSave({ theme_accent: a.id })}
                  title={a.label}
                  className={`w-9 h-9 rounded-full border-2 transition-all ${
                    branding.theme_accent === a.id
                      ? "border-white scale-110 ring-2 ring-white/20"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ background: a.color }}
                />
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Current: <span className="text-gray-400 capitalize">{branding.theme_accent}</span>
            </p>
          </div>
        </div>
      )}

      {/* Branding — admin only */}
      {user?.role === "admin" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-gray-100 mb-1">App Branding</h2>
          <p className="text-xs text-gray-500 mb-4">Customise the name and icon shown in the sidebar.</p>
          <form onSubmit={handleBrandingSave} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">App Name</label>
              <input
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
                placeholder={branding.app_name}
                className="w-full border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">Icon</label>
              <div className="flex gap-1 mb-3 p-1 bg-gray-800 border border-gray-700 rounded-lg w-fit">
                {(["emoji", "image"] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setIconMode(m); setBrandIcon(""); setIconPreview(null); setIconError(null); }}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors capitalize ${iconMode === m ? "bg-gray-600 text-gray-100" : "text-gray-500 hover:text-gray-300"}`}
                  >
                    {m === "emoji" ? "Emoji" : "Image"}
                  </button>
                ))}
              </div>

              {iconMode === "emoji" ? (
                <div className="flex items-center gap-3">
                  <input
                    value={brandIcon}
                    onChange={e => setBrandIcon(e.target.value)}
                    placeholder="e.g. 🍽️"
                    className="w-24 border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-600 rounded-lg px-3 py-2 text-lg text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  {brandIcon && <span className="text-xs text-gray-500">Preview: <span className="text-2xl">{brandIcon}</span></span>}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer border border-gray-700 border-dashed rounded-lg px-4 py-3 hover:border-gray-500 transition-colors w-fit">
                    <span className="text-sm text-gray-400">Choose image…</span>
                    <input type="file" accept="image/*" onChange={handleIconFile} className="hidden" />
                  </label>
                  <p className="text-xs text-gray-600">PNG, JPG, GIF, WebP · max 64 KB · scaled to fit 256 × 256</p>
                  {iconError && <p className="text-xs text-red-400">{iconError}</p>}
                  {iconPreview && (
                    <div className="flex items-center gap-3">
                      <img src={iconPreview} alt="preview" className="w-10 h-10 object-contain rounded border border-gray-700" />
                      <button type="button" onClick={() => { setIconPreview(null); setBrandIcon(""); }} className="text-xs text-gray-600 hover:text-red-400">Remove</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={brandingSaving || (!!iconError) || (!brandName.trim() && !brandIcon)}
              className="bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {brandingSaving ? "Saving…" : "Save Branding"}
            </button>
          </form>
        </div>
      )}

      {/* Claude AI */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl">✨</span>
          <div>
            <h2 className="font-semibold text-gray-100">Claude AI</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Add your Anthropic API key to enable AI-powered recipe imports,
              ingredient parsing, and aisle keyword suggestions.
            </p>
          </div>
        </div>

        {user?.has_claude_key ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 border border-green-800 rounded-lg">
              <span className="text-green-400 text-sm">✓</span>
              <span className="text-sm text-green-300">API key saved</span>
            </div>
            <p className="text-xs text-gray-600">
              The key is stored securely and never returned by the API.
              To update it, remove the current key and add a new one.
            </p>
            <button
              onClick={handleRemove}
              disabled={removing}
              className="text-sm text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {removing ? "Removing…" : "Remove key"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-3">
            <div className="flex gap-2">
              <input
                type={show ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                required
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="text-gray-600 hover:text-gray-300 px-2 transition-colors"
                tabIndex={-1}
              >
                {show ? "🙈" : "👁"}
              </button>
            </div>
            <p className="text-xs text-gray-600">
              Get your API key at{" "}
              <span className="text-gray-500 font-mono">console.anthropic.com</span>.
              The key is validated before saving.
            </p>
            <button
              type="submit"
              disabled={saving || !key.trim()}
              className="bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? "Validating…" : "Save API Key"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
