import React, { useState } from "react";
import { useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Chat from "./pages/Chat.jsx";
import Profile from "./pages/Profile.jsx";
import Navbar from "./components/Navbar.jsx";
import VideoCall from "./components/VideoCall.jsx";

export default function App() {
  const { token } = useAuth();
  const [view, setView] = useState("chat");
  const [authView, setAuthView] = useState("login");

  if (!token) {
    return authView === "login" ? (
      <Login onDone={() => setAuthView("login")} onGoRegister={() => setAuthView("register")} />
    ) : (
      <Register onDone={() => setAuthView("login")} onGoLogin={() => setAuthView("login")} />
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-white">
      <VideoCall />
      <Navbar onGoChat={() => setView("chat")} onGoProfile={() => setView("profile")} />
      <div className="flex-1 min-h-0">
        {view === "chat" ? (
          <Chat />
        ) : (
          <Profile
            onGoChat={(userId) => {
              if (userId) {
                const url = new URL(window.location.href);
                url.searchParams.set("u", userId);
                window.history.replaceState({}, "", url);
              }
              setView("chat");
            }}
          />
        )}
      </div>
    </div>
  );
}