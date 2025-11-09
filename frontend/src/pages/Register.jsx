import React, { useState } from "react";
import { api } from "../utils/api.js";
import { saveToken } from "../store.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register({ onDone, onGoLogin }) {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const { setUserAndToken } = useAuth();

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api().post("/auth/register", form);
      if (data?.token) {
        saveToken(data.token);
        setUserAndToken(data.user, data.token);
        window.location.reload(); // directly go to chat
      } else {
        onDone?.();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-white">
      <form
        onSubmit={submit}
        className="bg-[#f9fafb] p-8 rounded-2xl shadow-md w-[360px] flex flex-col gap-4"
      >
        <h2 className="text-2xl font-semibold text-center mb-2 text-[#0f172a]">Create Account</h2>
        <input
          type="text"
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
        <button
          type="submit"
          className="bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 transition"
        >
          Register
        </button>
        <div className="text-sm text-center text-[#667085]">
          Already have an account?{" "}
          <button type="button" onClick={onGoLogin} className="text-blue-600 hover:underline">
            Login
          </button>
        </div>
      </form>
    </div>
  );
}