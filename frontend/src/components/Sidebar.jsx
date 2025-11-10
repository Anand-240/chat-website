import React, { useState } from "react";
import { api } from "../utils/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Sidebar({ me, items, activeId, onSelect, view, onChangeView, onGroupCreated }) {
  const { token } = useAuth();
  const [show, setShow] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState([]);
  const [busy, setBusy] = useState(false);

  function addMember() {
    const v = memberInput.trim();
    if (!v) return;
    if (!members.includes(v)) setMembers(prev => [...prev, v]);
    setMemberInput("");
  }
  function removeMember(v) {
    setMembers(prev => prev.filter(x => x !== v));
  }

  async function createGroup() {
    if (!groupName.trim()) return;
    setBusy(true);
    try {
      const { data } = await api(token).post("/groups", { name: groupName.trim(), members });
      onGroupCreated?.(data);
      onSelect({ id: data._id, type: "group", label: `# ${data.name}` });
      setShow(false);
      setGroupName("");
      setMemberInput("");
      setMembers([]);
    } catch (e) {
      alert(e.response?.data?.error || "Failed to create group");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <div className="font-semibold text-lg truncate">{me?.username}</div>
        <div className="flex gap-2">
          <button onClick={() => onChangeView?.("dm")} className={`px-2 py-1 rounded ${view === "dm" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>DM</button>
          <button onClick={() => onChangeView?.("group")} className={`px-2 py-1 rounded ${view === "group" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>Groups</button>
          <button className="px-2 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600" onClick={() => setShow(true)}>+ Group</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 && <div className="p-4 text-gray-500 text-sm">No conversations</div>}
        {items.map((it) => (
          <div
            key={`${it.type}:${it.id}`}
            onClick={() => onSelect(it)}
            className={`px-4 py-3 cursor-pointer ${activeId === it.id ? "bg-blue-50 border-l-4 border-blue-500" : "hover:bg-gray-50"}`}
          >
            <div className="font-medium truncate">{it.label}</div>
          </div>
        ))}
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/30 grid place-items-center">
          <div className="bg-white p-6 rounded-lg w-96 shadow-md">
            <div className="text-lg font-semibold mb-4">Create Group</div>
            <input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Group name"
              className="border w-full p-2 mb-3 rounded"
            />
            <div className="flex gap-2 mb-2">
              <input
                value={memberInput}
                onChange={e => setMemberInput(e.target.value)}
                placeholder="username or email"
                className="border flex-1 p-2 rounded"
              />
              <button onClick={addMember} className="px-3 rounded bg-gray-800 text-white">+</button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {members.map(m => (
                <span key={m} className="px-2 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-2">
                  {m}
                  <button onClick={() => removeMember(m)} className="text-red-500">×</button>
                </span>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShow(false); setMembers([]); setMemberInput(""); setGroupName(""); }} className="px-3 py-1 rounded border border-gray-300">Cancel</button>
              <button disabled={busy} onClick={createGroup} className="px-4 py-1 rounded bg-blue-500 text-white hover:bg-blue-600">{busy ? "Creating..." : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}