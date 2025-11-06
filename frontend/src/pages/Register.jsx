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
      if (setToken) setToken(data.token);
      onDone && onDone();
    } catch (e) {
      setErr(e?.response?.data?.error || "Registration failed");
    }
  }

  return (
    <div className="h-full flex items-center justify-center">
      <form onSubmit={submit} className="bg-white p-6 rounded-2xl shadow w-80 space-y-3">
        <h1 className="text-xl font-semibold">Create account</h1>
        <input
          className="w-full border rounded p-2"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="w-full border rounded p-2"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full border rounded p-2"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <button className="w-full bg-black text-white rounded p-2">Register</button>
        <button type="button" onClick={onGoLogin} className="text-sm text-blue-600">
          Back to login
        </button>
      </form>
    </div>
  );
}
