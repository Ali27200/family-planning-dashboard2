/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Lock, User, Activity, AlertCircle, Sparkles, Download, Upload, Database } from "lucide-react";

interface LoginProps {
  onLoginSuccess: (user: { id: string; name: string; role: "master" | "center" }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  const handleBackupDownload = async () => {
    setBackupStatus(null);
    try {
      const res = await fetch("/api/backup");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const now = new Date();
      const ds = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      link.download = `family-planning-backup-${ds}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setBackupStatus("success");
      setTimeout(() => setBackupStatus(null), 3000);
    } catch {
      setBackupStatus("error");
    }
  };

  const handleRestore = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (!confirm("سيتم استبدال جميع البيانات الحالية. هل أنت متأكد؟")) return;
      setBackupStatus(null);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const res = await fetch("/api/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data, overwrite: true }),
        });
        const result = await res.json();
        if (result.success) {
          setBackupStatus("restored");
          setTimeout(() => setBackupStatus(null), 3000);
        } else {
          setBackupStatus("error");
        }
      } catch {
        setBackupStatus("error");
      }
    };
    input.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "خطأ غير متوقع في تسجيل الدخول");
      }

      onLoginSuccess(result.user);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "فشل الاتصال بالخادم. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 dir-rtl text-right" style={{ direction: "rtl" }}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-600/20">
            <Activity className="h-9 w-9 text-white animate-pulse" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          نظام الإحصائيات الموحد
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 font-medium">
          وزارة الصحة - إحصائيات وسائل تنظيم الأسرة الشهرية
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl border border-slate-100 rounded-3xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div id="login-error" className="bg-rose-50 border-r-4 border-rose-500 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-sm text-rose-800 font-medium">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-bold text-slate-700">
                اسم المستخدم (اليوز)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pr-10 pl-3 py-3 border border-slate-200 rounded-xl text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-all font-medium text-right"
                  placeholder="مثال: ز، م، هـ أو 1 للماستر"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-slate-700">
                كلمة المرور (الباسوورد)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pr-10 pl-3 py-3 border border-slate-200 rounded-xl text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-all font-medium text-right"
                  placeholder="رمز الدخول الخاص بالمركز"
                />
              </div>
            </div>

            <div>
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-teal-400 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>جاري التحقق...</span>
                  </div>
                ) : (
                  "دخول النظام"
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-6">
            <div className="text-xs bg-teal-50/50 rounded-xl p-3 text-teal-800 flex items-center gap-1.5 leading-relaxed">
              <Sparkles className="h-4 w-4 text-teal-600 shrink-0" />
              <span>
                رمز الدخول الافتراضي للماستر هو <strong>1</strong> لليوزر والرمز السري.
                وباقي المراكز تستخدم الرمز الموحد (مثلاً ز لمركز الزهراء).
              </span>
            </div>
          </div>

          {/* Backup & Restore Section */}
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-500">النسخ الاحتياطي</span>
            </div>
            {backupStatus === "success" && (
              <div className="mb-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-2 rounded-xl text-center">
                ✅ تم تحميل النسخة الاحتياطية بنجاح
              </div>
            )}
            {backupStatus === "restored" && (
              <div className="mb-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-2 rounded-xl text-center">
                ✅ تمت استعادة البيانات بنجاح
              </div>
            )}
            {backupStatus === "error" && (
              <div className="mb-2 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-2 rounded-xl text-center">
                ❌ فشل العملية
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleBackupDownload}
                className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-black px-3 py-2.5 rounded-xl border border-indigo-200 cursor-pointer transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                <span>تحميل نسخة احتياطية</span>
              </button>
              <button
                onClick={handleRestore}
                className="flex-1 flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-black px-3 py-2.5 rounded-xl border border-amber-200 cursor-pointer transition-all"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>استعادة نسخة</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2 font-medium">
              يُنصح بأخذ نسخة احتياطية بشكل دوري وحفظها في D:\الصيانة والخزن
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
