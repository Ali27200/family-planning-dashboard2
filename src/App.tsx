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

  // Session lives only in memory — no localStorage persistence
  useEffect(() => {
    setLoading(false);
  }, []);

  const handleLoginSuccess = (loggedInUser: UserSession) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
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
