import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { listUsers, patchUser, deleteUser, adminResetPassword, adminCreateUser, type AdminUser } from "../api/admin";
import { usernameFromEmail } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import Spinner from "../components/ui/Spinner";

function RoleBadge({ role }: { role: string }) {
  return role === "admin" ? (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-900/50 text-green-400 border border-green-800">
      Admin
    </span>
  ) : (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
      User
    </span>
  );
}

function UserCard({ user, isSelf, isFounder }: { user: AdminUser; isSelf: boolean; isFounder: boolean }) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const canResetPassword = !isFounder || isSelf;

  const patchMut = useMutation({
    mutationFn: (body: { role?: string; is_active?: boolean }) => patchUser(user.id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (e: { response?: { data?: { detail?: string } } }) =>
      toast.error(e.response?.data?.detail ?? "Update failed."),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteUser(user.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User deleted.");
    },
  });

  const resetMut = useMutation({
    mutationFn: (pw: string) => adminResetPassword(user.id, pw),
    onSuccess: () => {
      toast.success(`Password reset for ${usernameFromEmail(user.email)}.`);
      setResetting(false);
      setNewPw("");
      setConfirmPw("");
    },
    onError: (e: { response?: { data?: { detail?: string } } }) =>
      toast.error(e.response?.data?.detail ?? "Reset failed."),
  });

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) { toast.error("Passwords don't match."); return; }
    if (newPw.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    resetMut.mutate(newPw);
  };

  const btnBase =
    "text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed";
  const fieldCls =
    "w-full border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      {/* Top row: username + badges */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-sm font-medium text-gray-200 break-all min-w-0 flex-1">
          {usernameFromEmail(user.email)}
          {isFounder && <span className="ml-2 text-xs text-yellow-600">★ founding account</span>}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <RoleBadge role={user.role} />
          <span className={`text-xs font-medium ${user.is_active ? "text-green-400" : "text-gray-600"}`}>
            {user.is_active ? "Active" : "Inactive"}
          </span>
          {isSelf && <span className="text-xs text-gray-600 italic">you</span>}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => patchMut.mutate({ role: user.role === "admin" ? "user" : "admin" })}
          disabled={isSelf || isFounder || patchMut.isPending}
          className={`${btnBase} border-gray-700 text-gray-400 hover:border-green-700 hover:text-green-400`}
        >
          {user.role === "admin" ? "Make User" : "Make Admin"}
        </button>
        <button
          onClick={() => patchMut.mutate({ is_active: !user.is_active })}
          disabled={isSelf || isFounder || patchMut.isPending}
          className={`${btnBase} border-gray-700 text-gray-400 hover:border-yellow-700 hover:text-yellow-400`}
        >
          {user.is_active ? "Deactivate" : "Activate"}
        </button>
        {canResetPassword && !resetting && (
          <button
            onClick={() => setResetting(true)}
            className={`${btnBase} border-gray-700 text-gray-400 hover:border-blue-700 hover:text-blue-400`}
          >
            Reset Password
          </button>
        )}
        {!isSelf && !isFounder && (
          confirming ? (
            <>
              <button
                onClick={() => deleteMut.mutate()}
                className={`${btnBase} bg-red-900/50 text-red-400 border-red-800 hover:bg-red-900`}
              >
                Confirm delete
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="text-xs px-2 py-1.5 text-gray-600 hover:text-gray-400 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className={`${btnBase} border-gray-800 text-gray-700 hover:border-red-800 hover:text-red-400`}
            >
              Delete
            </button>
          )
        )}
      </div>

      {/* Inline password reset form */}
      {resetting && (
        <form onSubmit={handleResetSubmit} className="mt-4 pt-4 border-t border-gray-800 space-y-2">
          <p className="text-xs text-gray-500 mb-2">Set new password for {usernameFromEmail(user.email)}</p>
          <input
            type="password"
            required
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
            placeholder="New password (min 8 chars)"
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
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={resetMut.isPending || !newPw || !confirmPw}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white transition-colors"
            >
              {resetMut.isPending ? "Saving…" : "Set Password"}
            </button>
            <button
              type="button"
              onClick={() => { setResetting(false); setNewPw(""); setConfirmPw(""); }}
              className="text-xs px-3 py-1.5 text-gray-600 hover:text-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");

  const createMut = useMutation({
    mutationFn: () => adminCreateUser(username.trim(), password, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(`User "${username.trim()}" created.`);
      onDone();
    },
    onError: (e: { response?: { data?: { detail?: string } } }) =>
      toast.error(e.response?.data?.detail ?? "Failed to create user."),
  });

  const fieldCls =
    "w-full border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";

  return (
    <form
      onSubmit={e => { e.preventDefault(); createMut.mutate(); }}
      className="bg-gray-900 border border-green-900/50 rounded-xl p-4 space-y-3"
    >
      <p className="text-sm font-medium text-gray-200">New User</p>
      <input
        type="text"
        required
        value={username}
        onChange={e => setUsername(e.target.value)}
        placeholder="Username"
        className={fieldCls}
      />
      <input
        type="password"
        required
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password (min 8 chars)"
        className={fieldCls}
      />
      <select
        value={role}
        onChange={e => setRole(e.target.value as "user" | "admin")}
        className={fieldCls}
      >
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createMut.isPending || !username.trim() || !password}
          className="text-sm px-4 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white transition-colors"
        >
          {createMut.isPending ? "Creating…" : "Create"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-sm px-3 py-1.5 text-gray-600 hover:text-gray-400 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [creating, setCreating] = useState(false);
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: listUsers,
  });

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage accounts and roles</p>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:border-green-700 hover:text-green-400 transition-colors"
          >
            + Create User
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-4">
          <CreateUserForm onDone={() => setCreating(false)} />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-3">
          {users?.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              isSelf={u.id === me?.id}
              isFounder={u.id === 1 && me?.id !== 1}
            />
          ))}
          {users?.length === 0 && (
            <p className="text-center text-gray-600 py-8 text-sm">No users found.</p>
          )}
        </div>
      )}

      <p className="text-xs text-gray-700 mt-6">
        New users register at <code className="text-gray-600">/register</code>.
        Deactivated accounts cannot log in.
      </p>
    </div>
  );
}
