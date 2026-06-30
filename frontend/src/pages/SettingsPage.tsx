import { useState } from "react";
import toast from "react-hot-toast";
import { setApiKey, removeApiKey } from "../api/ai";
import { useAuth } from "../auth/AuthContext";
import { useBranding } from "../contexts/BrandingContext";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { branding, saveBranding } = useBranding();
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [brandIcon, setBrandIcon] = useState("");   // emoji string or data URL
  const [iconMode, setIconMode] = useState<"emoji" | "image">("emoji");
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [iconError, setIconError] = useState<string | null>(null);
  const [brandingSaving, setBrandingSaving] = useState(false);

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

    if (!file.type.startsWith("image/")) {
      setIconError("File must be an image.");
      return;
    }
    if (file.size > 64 * 1024) {
      setIconError("Image must be under 64 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      // Validate pixel dimensions
      const img = new Image();
      img.onload = () => {
        const MAX = 256;
        let { width, height } = img;
        if (width <= MAX && height <= MAX) {
          setIconPreview(dataUrl);
          setBrandIcon(dataUrl);
          return;
        }
        // Scale down to fit within 256×256, maintaining aspect ratio
        if (width > height) {
          height = Math.round((height / width) * MAX);
          width = MAX;
        } else {
          width = Math.round((width / height) * MAX);
          height = MAX;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        const scaled = canvas.toDataURL("image/png");
        setIconPreview(scaled);
        setBrandIcon(scaled);
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
      await saveBranding({
        app_name: brandName.trim() || undefined,
        app_icon: brandIcon || undefined,
      });
      setBrandName("");
      setBrandIcon("");
      setIconPreview(null);
      toast.success("Branding updated.");
    } catch {
      toast.error("Failed to update branding.");
    } finally {
      setBrandingSaving(false);
    }
  };

  const inputCls =
    "flex-1 border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-mono";

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-8">{user?.email}</p>

      {/* Branding — admin only */}
      {user?.role === "admin" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-gray-100 mb-1">App Branding</h2>
          <p className="text-xs text-gray-500 mb-4">Customise the name and icon shown in the sidebar.</p>
          <form onSubmit={handleBrandingSave} className="space-y-4">
            {/* App name */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">App Name</label>
              <input
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
                placeholder={branding.app_name}
                className="w-full border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Icon */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">Icon</label>
              {/* mode toggle */}
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
