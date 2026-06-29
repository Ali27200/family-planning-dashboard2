/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import CenterDashboard from "./components/CenterDashboard";
import AdminDashboard from "./components/AdminDashboard";

interface UserSession {
  id: string;
  name: string;
  role: "master" | "center";
}

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Load session from localStorage on startup
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("family_planning_session");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (err) {
      console.error("Error reading saved session from localStorage", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: UserSession) => {
    setUser(loggedInUser);
    try {
      localStorage.setItem("family_planning_session", JSON.stringify(loggedInUser));
    } catch (err) {
      console.error("Error storing session to localStorage", err);
    }
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem("family_planning_session");
    } catch (err) {
      console.error("Error removing session from localStorage", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          <p className="text-sm font-bold text-slate-500 text-right dir-rtl">جاري تهيئة النظام الموحد للتنظيم...</p>
        </div>
      </div>
    );
  }

  // Route based on role
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (user.role === "master") {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  return <CenterDashboard user={user} onLogout={handleLogout} />;
}
