import React, { useState } from "react";
import { api } from "../utils/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register({ onGoLogin }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { setUserAndToken } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const { data } = await api().post("/auth/register", {
        username,
        email,
        password,
      });

      setUserAndToken(data.user, data.token);
      window.location.href = "/chat";
    } catch (err) {
      const code = err?.response?.status;
      const msg = err?.response?.data?.error;
      if (code === 409) setError("User already exists. Try logging in.");
      else setError(msg || "Registration failed.");
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-xl rounded-2xl p-8 w-[380px] flex flex-col gap-5"
      >
        <h2 className="text-3xl text-center font-bold text-blue-700">
          Create Account
        </h2>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          Register
        </button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onGoLogin}
            className="text-blue-600 hover:underline"
          >
            Login
          </button>
        </p>
      </form>
    </div>
  );
}