import React, { useState } from "react";
import { api } from "../utils/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login({ onGoRegister }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { setUserAndToken } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const { data } = await api().post("/auth/login", { identifier, password });
      setUserAndToken(data.user, data.token);
      window.location.href = "/chat";
    } catch (err) {
      setError(err.response?.data?.error || "Invalid credentials");
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-xl rounded-2xl p-8 w-[360px] flex flex-col gap-5"
      >
        <h2 className="text-3xl text-center font-bold text-blue-700">Login</h2>

        <input
          type="text"
          placeholder="Email or Username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          required
        />

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition"
        >
          Login
        </button>

        <p className="text-center text-sm text-gray-600">
          New user?{" "}
          <button
            type="button"
            onClick={onGoRegister}
            className="text-blue-600 hover:underline"
          >
            Register
          </button>
        </p>
      </form>
    </div>
  );
}