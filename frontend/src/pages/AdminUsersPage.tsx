import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { listUsers, patchUser, deleteUser, type AdminUser } from "../api/admin";
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

function UserCard({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);

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

  const btnBase =
    "text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      {/* Top row: email + badges */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-sm font-medium text-gray-200 break-all min-w-0 flex-1">
          {user.email}
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
          disabled={isSelf || patchMut.isPending}
          className={`${btnBase} border-gray-700 text-gray-400 hover:border-green-700 hover:text-green-400`}
        >
          {user.role === "admin" ? "Make User" : "Make Admin"}
        </button>
        <button
          onClick={() => patchMut.mutate({ is_active: !user.is_active })}
          disabled={isSelf || patchMut.isPending}
          className={`${btnBase} border-gray-700 text-gray-400 hover:border-yellow-700 hover:text-yellow-400`}
        >
          {user.is_active ? "Deactivate" : "Activate"}
        </button>
        {!isSelf && (
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
    </div>
  );
}

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: listUsers,
  });

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage accounts and roles</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-3">
          {users?.map((u) => (
            <UserCard key={u.id} user={u} isSelf={u.id === me?.id} />
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
