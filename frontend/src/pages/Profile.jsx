import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../utils/api.js";

export default function Profile({ onGoChat }) {
  const { token, user } = useAuth();
  const [pending, setPending] = useState([]);
  const [friends, setFriends] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const [p, f] = await Promise.all([
        api(token).get("/friends/pending"),
        api(token).get("/friends/friends"),
      ]);
      setPending(p.data || []);
      setFriends(f.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  async function sendRequest() {
    const q = query.trim();
    if (!q) return;
    setSending(true);
    try {
      const resolved = await api(token).get(`/chat/resolve/${encodeURIComponent(q)}`);
      const id = resolved.data?.id;
      if (!id) throw new Error("User not found");
      await api(token).post(`/friends/request/${id}`);
      setQuery("");
      await load();
      alert("Friend request sent");
    } catch (e) {
      alert(e.response?.data?.error || "Unable to send request");
    } finally {
      setSending(false);
    }
  }

  async function accept(id) {
    try {
      await api(token).post(`/friends/accept/${id}`);
      await load();
      alert("Accepted. You can chat now.");
    } catch {
      alert("Failed to accept");
    }
  }

  async function reject(id) {
    try {
      await api(token).post(`/friends/reject/${id}`);
      await load();
    } catch {
      alert("Failed to reject");
    }
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-white">
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-8">
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold">Profile</div>
          <div className="text-sm text-[#667085]">{user?.username} ({user?.email})</div>
        </div>

        <div className="rounded-2xl border border-(--border) p-4">
          <div className="text-sm text-[#667085] mb-2">Send friend request by username or email</div>
          <div className="flex items-center gap-2">
            <input
              className="flex-1 rounded-lg border border-(--border) px-3 py-2"
              placeholder="username or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendRequest()}
            />
            <button
              disabled={sending}
              onClick={sendRequest}
              className="rounded-lg px-4 py-2 bg-(--primary) text-white text-sm"
            >
              {sending ? "Sending..." : "Send"}
            </button>
            <button
              onClick={() => onGoChat && onGoChat()}
              className="rounded-lg px-4 py-2 bg-[#f4f5f9] text-sm"
            >
              Go to Chat
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-(--border) p-4">
            <div className="font-semibold mb-2">Incoming Requests</div>
            <div className="space-y-2">
              {(pending || []).map((u) => (
                <div key={u._id} className="flex items-center justify-between rounded-lg border border-(--border) p-2">
                  <div className="text-sm">{u.username} <span className="text-[#98a2b3]">({u.email})</span></div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => accept(u._id)} className="px-3 py-1.5 rounded-lg bg-(--primary) text-white text-xs">Accept</button>
                    <button onClick={() => reject(u._id)} className="px-3 py-1.5 rounded-lg bg-[#f4f5f9] text-xs">Reject</button>
                  </div>
                </div>
              ))}
              {!loading && (!pending || pending.length === 0) && (
                <div className="text-xs text-[#98a2b3]">No pending requests</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-(--border) p-4">
            <div className="font-semibold mb-2">Friends</div>
            <div className="space-y-2">
              {(friends || []).map((u) => (
                <div key={u._id} className="flex items-center justify-between rounded-lg border border-(--border) p-2">
                  <div className="text-sm">{u.username} <span className="text-[#98a2b3]">({u.email})</span></div>
                  <button
                    onClick={() => onGoChat && onGoChat(u._id)}
                    className="px-3 py-1.5 rounded-lg bg-[#0f1218] text-white text-xs"
                  >
                    Message
                  </button>
                </div>
              ))}
              {!loading && (!friends || friends.length === 0) && (
                <div className="text-xs text-[#98a2b3]">No friends yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}