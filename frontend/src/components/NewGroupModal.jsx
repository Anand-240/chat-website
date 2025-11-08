import React, { useState } from "react";
import { api } from "../utils/api.js";

export default function NewGroupModal({ token, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState([]);
  const [resolving, setResolving] = useState(false);
  const [creating, setCreating] = useState(false);

  async function resolveAndAdd() {
    const q = query.trim();
    if (!q) return;
    try {
      setResolving(true);
      const { data } = await api(token).get(`/chat/resolve/${encodeURIComponent(q)}`);
      if (!members.some((m) => m.id === data.id)) {
        setMembers((prev) => [...prev, { id: data.id, label: data.username || data.email || data.id }]);
      }
      setQuery("");
    } catch {
      alert("User not found");
    } finally {
      setResolving(false);
    }
  }

  async function createGroup() {
    if (!name.trim()) return alert("Enter group name");
    try {
      setCreating(true);
      const payload = { name: name.trim(), members: members.map((m) => m.id) };
      const { data } = await api(token).post("/groups", payload);
      onCreated?.(data);
      onClose?.();
    } catch {
      alert("Failed to create group");
    } finally {
      setCreating(false);
    }
  }

  function removeMember(id) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
        <div className="text-lg font-semibold mb-3">New Group</div>
        <div className="space-y-3">
          <input
            className="w-full rounded-lg border border-(--border) px-3 py-2"
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-(--border) px-3 py-2"
              placeholder="Add member by username or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && resolveAndAdd()}
            />
            <button
              onClick={resolveAndAdd}
              disabled={resolving}
              className="rounded-lg px-3 py-2 bg-(--primary) text-white text-sm"
            >
              {resolving ? "Adding..." : "Add"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-2 bg-(--lav-2) text-sm rounded-full px-3 py-1">
                {m.label}
                <button onClick={() => removeMember(m.id)} className="text-[#667085]">×</button>
              </span>
            ))}
            {!members.length && <div className="text-xs text-[#98a2b3]">No members yet</div>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="rounded-lg px-3 py-2 bg-[#f4f5f9] text-sm">Cancel</button>
            <button onClick={createGroup} disabled={creating} className="rounded-lg px-4 py-2 bg-(--primary) text-white text-sm">
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}