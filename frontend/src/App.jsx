import React, { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Chat from "./pages/Chat.jsx";

export default function App() {
  const { user } = useAuth();
  const [view, setView] = useState("login");

  useEffect(() => {
    if (user) setView("chat");
  }, [user]);

  if (user) {
    return <Chat onLogout={() => setView("login")} />;
  }

  if (view === "register") {
    return <Register onDone={() => setView("chat")} onGoLogin={() => setView("login")} />;
  }

  return <Login onDone={() => setView("chat")} onGoRegister={() => setView("register")} />;
}
