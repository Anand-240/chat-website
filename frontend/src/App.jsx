import React, { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Chat from "./pages/Chat.jsx";
import Navbar from "./components/Navbar.jsx";

export default function App() {
  const { token, user, logout } = useAuth();
  const [view, setView] = useState(token ? "chat" : "login");

  useEffect(() => {
    setView(token ? "chat" : "login");
  }, [token]);

  return (
    <div className="min-h-full flex flex-col">
      <Navbar
        authed={!!token}
        username={user?.username}
        onGoLogin={() => setView("login")}
        onGoRegister={() => setView("register")}
        onGoChat={() => setView("chat")}
        onLogout={() => {
          logout();
          setView("login");
        }}
      />
      <div className="flex-1">
        {view === "login" && (
          <Login onDone={() => setView("chat")} onGoRegister={() => setView("register")} />
        )}
        {view === "register" && (
          <Register onDone={() => setView("chat")} onGoLogin={() => setView("login")} />
        )}
        {view === "chat" && <Chat onLogout={() => setView("login")} />}
      </div>
    </div>
  );
}
