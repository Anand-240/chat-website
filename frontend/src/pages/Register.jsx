import React, { useState } from "react";
import { api } from "../utils/api.js";
import { saveToken } from "../store.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register({ onDone, onGoLogin }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const { setToken } = useAuth?.() || {};

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      const { data } = await api().post("/auth/register", { username, email, password });
      saveToken(data.token);
      setToken && setToken(data.token);
      onDone && onDone();
    } catch (e) {
      setErr(e?.response?.data?.error || "Registration failed");
    }
  }

  return (
    <div className="h-full flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-(--border) bg-(--card)/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.35)] p-6 space-y-4">
        <div className="text-center text-2xl font-semibold bg-linear-to-r from-(--accent1) to-(--accent2) bg-clip-text text-transparent">Create account</div>
        <input className="w-full rounded-xl border border-(--border) bg-[#0f1218] px-3 py-2 text-[15px] text-white/90 placeholder:text-[#70778a] outline-none focus:ring-2 focus:ring-(--accent1)/40" placeholder="Username" value={username} onChange={(e)=>setUsername(e.target.value)} />
        <input className="w-full rounded-xl border border-(--border) bg-[#0f1218] px-3 py-2 text-[15px] text-white/90 placeholder:text-[#70778a] outline-none focus:ring-2 focus:ring-(--accent1)/40" placeholder="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="w-full rounded-xl border border-(--border) bg-[#0f1218] px-3 py-2 text-[15px] text-white/90 placeholder:text-[#70778a] outline-none focus:ring-2 focus:ring-(--accent1)/40" placeholder="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        {err && <div className="text-red-400 text-sm">{err}</div>}
        <div className="flex gap-2">
          <button className="w-full rounded-xl py-2.5 font-medium bg-linear-to-tr from-(--accent1) to-(--accent2) text-black shadow hover:opacity-90 transition">Register</button>
          <button type="button" onClick={onGoLogin} className="rounded-xl px-4 py-2 font-medium bg-[#171a22] text-[14px] border border-(--border) hover:border-(--accent1)/40 transition">Back</button>
        </div>
      </form>
    </div>
  );
}
