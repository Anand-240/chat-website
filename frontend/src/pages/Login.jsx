import React, { useState } from "react";
import { api } from "../utils/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { io } from "socket.io-client";
import { API_BASE_URL } from "../constants.js";

export default function Login({ onDone, onGoRegister }) {
  const { setAuth } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const body = identifier.includes("@")
        ? { email: identifier, password }
        : { username: identifier, password };

      const { data } = await api().post("/auth/login", body);

      const { token, user } = data;
      if (!token || !user) throw new Error("Invalid response from server");

      setAuth(token, user);

      const socket = io(API_BASE_URL, {
        transports: ["websocket"],
        auth: { token },
        withCredentials: true,
      });

      socket.on("connect", () => {
        console.log("✅ Socket connected:", socket.id);
      });

      socket.on("connect_error", (err) => {
        console.error("Socket error:", err.message);
      });

      onDone && onDone();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Login failed");
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={submit}
        className="bg-white w-96 p-8 rounded-xl shadow-md space-y-4"
      >
        <h1 className="text-2xl font-semibold text-center text-indigo-600">
          Sign In
        </h1>
        <input
          className="w-full border border-gray-300 rounded-lg p-2 outline-none"
          placeholder="Username or Email"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
        <input
          type="password"
          className="w-full border border-gray-300 rounded-lg p-2 outline-none"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && (
          <div className="text-sm text-red-500 text-center">{error}</div>
        )}
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition"
        >
          Login
        </button>
        <p className="text-sm text-center">
          Don’t have an account?{" "}
          <button
            type="button"
            onClick={onGoRegister}
            className="text-indigo-600 underline"
          >
            Register
          </button>
        </p>
      </form>
    </div>
  );
}
