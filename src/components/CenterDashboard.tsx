/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  LogOut, Save, Calendar, CheckCircle, FileText, Printer, FileDown,
  AlertTriangle, AlertCircle, RefreshCw, SearchCheck, Lock, Unlock, X, Check
} from "lucide-react";
import { exportFormToPdf } from "../utils/pdfExport";
import { 
  SubmissionRecord, 
  Section1Data, 
  Section2Data, 
  AgeRange, AGE_RANGES,
  createEmptySection1, 
  createEmptySection2 
} from "../types";
import FPReportForm from "./FPReportForm";

interface CenterDashboardProps {
  user: { id: string; name: string };
  onLogout: () => void;
}

const MONTHS = [
  { val: 1, name: "كانون الثاني (1)" },
  { val: 2, name: "شباط (2)" },
  { val: 3, name: "آذار (3)" },
  { val: 4, name: "نيسان (4)" },
  { val: 5, name: "أيار (5)" },
  { val: 6, name: "حزيران (6)" },
  { val: 7, name: "تموز (7)" },
  { val: 8, name: "آب (8)" },
  { val: 9, name: "أيلول (9)" },
  { val: 10, name: "تشرين الأول (10)" },
  { val: 11, name: "تشرين الثاني (11)" },
  { val: 12, name: "كانون الأول (12)" },
];

const YEARS = Array.from({ length: 8 }, (_, i) => 2026 - i);

export default function CenterDashboard({ user, onLogout }: CenterDashboardProps) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  
  // Real statistical form data structured like the papers exactly
  const [section1, setSection1] = useState<Section1Data>(() => createEmptySection1());
  const [section2, setSection2] = useState<Section2Data>(() => createEmptySection2());
  const [advisorName, setAdvisorName] = useState<string>("");
  const [programManager, setProgramManager] = useState<string>("");
  const [directorName, setDirectorName] = useState<string>("بسام محمد ناصر");

  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SubmissionRecord[]>([]);
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [locked, setLocked] = useState(false);
  const [unlockRequested, setUnlockRequested] = useState(false);
  const [unlockMessageText, setUnlockMessageText] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "new" | "secondary" | "repeat">("all");
  const [checkedOk, setCheckedOk] = useState(false);
  const [checkErrors, setCheckErrors] = useState<string[]>([]);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [auditResult, setAuditResult] = useState<{
    parityErrors: { label: string; clients: number; parity: number }[];
    contraErrors: { label: string; s1: number; s2: number }[];
    consultErrors: { label: string; consult: number; clients: number }[];
    success: boolean;
  }>({ parityErrors: [], contraErrors: [], consultErrors: [], success: true });
  const formRef = useRef<HTMLDivElement>(null);

  // Draft rescue states
  const [hasDraft, setHasDraft] = useState(false);
  const [draftPayload, setDraftPayload] = useState<any>(null);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);

  // 1. Auto-save draft to localStorage when user makes changes
  useEffect(() => {
    if (user.id && selectedMonth && selectedYear) {
      const draftKey = `fp_draft_${user.id}_${selectedMonth}_${selectedYear}`;
      const draftData = {
        section1,
        section2,
        advisorName,
        programManager,
        directorName
      };

      // Check if there is actual input content
      const hasContent = Object.values(section1.new_client).some((v: any) => v > 0) || 
                         Object.values(section1.repeat_client).some((v: any) => v > 0) ||
                         Object.values(section2.pills_mini).some((v: any) => v.clients > 0) ||
                         Object.values(section2.pills_combined).some((v: any) => v.clients > 0) ||
                         advisorName.length > 0;

      if (hasContent) {
        localStorage.setItem(draftKey, JSON.stringify(draftData));
        const now = new Date();
        setLastAutoSaveTime(now.toLocaleTimeString("en-US"));
      }
    }
  }, [section1, section2, advisorName, programManager, directorName, user.id, selectedMonth, selectedYear]);

  // 2. Draft detection when active month/year changes or current form resets
  useEffect(() => {
    if (user.id && selectedMonth && selectedYear) {
      const draftKey = `fp_draft_${user.id}_${selectedMonth}_${selectedYear}`;
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          
          // Check if active screen values are completely default/zero (to prevent overwriting active entries)
          const isS1Empty = Object.values(section1.new_client).every((val: any) => val === 0) &&
                            Object.values(section1.repeat_client).every((val: any) => val === 0);
          const isS2Empty = Object.values(section2.pills_mini).every((val: any) => val.clients === 0) &&
                            Object.values(section2.pills_combined).every((val: any) => val.clients === 0);

          if (isS1Empty && isS2Empty) {
            setHasDraft(true);
            setDraftPayload(parsed);
          } else {
            setHasDraft(false);
          }
        } catch (e) {
          console.error("Failed to parse draft", e);
        }
      } else {
        setHasDraft(false);
      }
    }
  }, [selectedMonth, selectedYear, section1, section2, user.id]);

  const handleLoadDraft = () => {
    if (draftPayload) {
      setSection1(draftPayload.section1 || createEmptySection1());
      setSection2(draftPayload.section2 || createEmptySection2());
      setAdvisorName(draftPayload.advisorName || "");
      setProgramManager(draftPayload.programManager || "");
      setDirectorName(draftPayload.directorName || "بسام محمد ناصر");
      setHasDraft(false);
      setSaveStatus({ type: "success", msg: "تمت استعادة المسودة بنجاح! يمكنك مواصلة العمل وحفظ التقرير." });
    }
  };

  const handleClearDraft = () => {
    if (user.id && selectedMonth && selectedYear) {
      const draftKey = `fp_draft_${user.id}_${selectedMonth}_${selectedYear}`;
      localStorage.removeItem(draftKey);
      setHasDraft(false);
      setDraftPayload(null);
    }
  };

  // Load current month record (if any)
  const fetchCurrentRecord = async () => {
    setLoading(true);
    setSaveStatus(null);
    try {
      const response = await fetch(`/api/records?centerId=${user.id}&month=${selectedMonth}&year=${selectedYear}`);
      const data = await response.json();
      if (data && data.length > 0) {
        // Hydrate form
        const record = data[0] as SubmissionRecord;
        setSection1(record.section1 || createEmptySection1());
        setSection2(record.section2 || createEmptySection2());
        setAdvisorName(record.advisorName || "");
        setProgramManager(record.programManager || "");
        setDirectorName(record.directorName || "بسام محمد ناصر");
        setLocked(!!record.locked);
        setUnlockRequested(!!record.unlockRequested);
        setUnlockMessageText(record.unlockMessage || "");
      } else {
        // Reset to zeros
        setSection1(createEmptySection1());
        setSection2(createEmptySection2());
        setAdvisorName("");
        setProgramManager("");
        setDirectorName("بسام محمد ناصر");
        setLocked(false);
        setUnlockRequested(false);
        setUnlockMessageText("");
      }
      setCheckedOk(false);
      setCheckErrors([]);
      setActiveTab("all");
    } catch (err) {
      console.error("Error loading records", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(`/api/records?centerId=${user.id}`);
      const data = await response.json();
      setHistory(data || []);
    } catch (err) {
      console.error("Error loading history", err);
    }
  };

  useEffect(() => {
    fetchCurrentRecord();
  }, [selectedMonth, selectedYear]);

  // Reset check when form data changes
  useEffect(() => {
    if (checkedOk) {
      setCheckedOk(false);
    }
  }, [section1, section2]);

  useEffect(() => {
    fetchHistory();
  }, [user.id]);

  // Poll for unlock status when waiting for master approval
  const prevLockedRef = useRef(locked);
  useEffect(() => {
    prevLockedRef.current = locked;
  }, [locked]);
  useEffect(() => {
    if (!(locked && unlockRequested)) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/records?centerId=${user.id}&month=${selectedMonth}&year=${selectedYear}`);
        const data = await res.json();
        if (data && data.length > 0) {
          const record = data[0];
          if (!record.locked && !record.unlockRequested) {
            setLocked(false);
            setUnlockRequested(false);
            setSaveStatus({ type: "success", msg: "✓ تم فتح الإحصائية من قبل الماستر! يمكنك الآن التعديل." });
            try {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 880;
              osc.type = "sine";
              gain.gain.setValueAtTime(0.3, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
              osc.start();
              osc.stop(ctx.currentTime + 0.5);
            } catch {}
          }
        }
      } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, [locked, unlockRequested, user.id, selectedMonth, selectedYear]);

  // Validation check for all three audit conditions
  const getAgeClients = (age: AgeRange) =>
    (section1.new_client[age] || 0) + (section1.secondary_client[age] || 0) + (section1.repeat_client[age] || 0);

  const getAgeParity = (age: AgeRange) =>
    (section1.nullipara[age] || 0) + (section1.single_child[age] || 0) + (section1.two_children[age] || 0) +
    (section1.three_children[age] || 0) + (section1.four_plus[age] || 0);

  const getAgeContraS2 = (age: AgeRange) =>
    (section2.pills_mini[age]?.clients || 0) + (section2.pills_combined[age]?.clients || 0) +
    (section2.iud_loop[age]?.clients || 0) + (section2.condom[age]?.clients || 0) +
    (section2.injection_mini[age]?.clients || 0) + (section2.vaginal_cream[age]?.clients || 0) +
    (section2.others[age]?.clients || 0);

  const runValidation = (): string[] => {
    const errors: string[] = [];
    AGE_RANGES.forEach((age) => {
      const clients = getAgeClients(age);
      const parity = getAgeParity(age);
      const s1Contra = (section1.get_method[age] || 0) + (section1.change_method[age] || 0);
      const s2Contra = getAgeContraS2(age);
      const s1Consult = section1.consultation[age] || 0;

      if (clients !== parity) {
        errors.push(`الفئة ${age}: عدد الزيارات (${clients}) لا يساوي عدد الأطفال (${parity})`);
      }
      if (s1Contra !== s2Contra) {
        errors.push(`الفئة ${age}: مستفيدات الحصول/تغيير الوسيلة (${s1Contra}) لا تساوي صرف المواد (${s2Contra})`);
      }
      if (s1Consult !== clients) {
        errors.push(`الفئة ${age}: المشورة (${s1Consult}) لا تساوي إجمالي المستفيدات (${clients})`);
      }
    });
    return errors;
  };

  const handleCheck = () => {
    const errors = runValidation();
    const parityErrors: { label: string; clients: number; parity: number }[] = [];
    const contraErrors: { label: string; s1: number; s2: number }[] = [];
    const consultErrors: { label: string; consult: number; clients: number }[] = [];

    AGE_RANGES.forEach((age) => {
      const clients = getAgeClients(age);
      const parity = getAgeParity(age);
      const s1Contra = (section1.get_method[age] || 0) + (section1.change_method[age] || 0);
      const s2Contra = getAgeContraS2(age);
      const s1Consult = section1.consultation[age] || 0;
      const labels: Record<string, string> = { under_20: "أقل من 20", age_20_24: "24-20", age_25_29: "29-25", age_30_34: "34-30", over_35: "فأكثر 35" };

      if (clients !== parity) parityErrors.push({ label: labels[age], clients, parity });
      if (s1Contra !== s2Contra) contraErrors.push({ label: labels[age], s1: s1Contra, s2: s2Contra });
      if (s1Consult !== clients) consultErrors.push({ label: labels[age], consult: s1Consult, clients });
    });

    const success = errors.length === 0;
    setAuditResult({ parityErrors, contraErrors, consultErrors, success });
    setCheckErrors(errors);
    setCheckedOk(success);
    setShowCheckModal(true);

    if (!success) {
      setSaveStatus({ type: "error", msg: `توجد ${errors.length} أخطاء. قم بتصحيحها وأعد الفحص.` });
    } else {
      setSaveStatus({ type: "success", msg: "✓ الفحص ناجح! لا توجد أخطاء. يمكنك الآن الحفظ والإقفال." });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (locked) {
      setSaveStatus({ type: "error", msg: "الإحصائية مقفلة. يجب طلب فتحها من الماستر أولاً." });
      return;
    }

    setLoading(true);
    setSaveStatus(null);

    try {
      const response = await fetch("/api/records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          centerId: user.id,
          month: selectedMonth,
          year: selectedYear,
          section1,
          section2,
          advisorName,
          programManager,
          directorName
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "فشل حفظ الإحصائية. يرجى مراجعة الاتصال بالشبكة.");
      }

      setLocked(true);
      setCheckedOk(false);
      setSaveStatus({ type: "success", msg: "تم حفظ وإقفال الاستمارة الإحصائية بنجاح! لا يمكن التعديل إلا بعد فتح الماستر." });
      fetchHistory(); // refresh submission log list

      // Clear draft back-up from local storage on successful database submission
      const draftKey = `fp_draft_${user.id}_${selectedMonth}_${selectedYear}`;
      localStorage.removeItem(draftKey);
      setHasDraft(false);
      setDraftPayload(null);
    } catch (err: any) {
      setSaveStatus({ type: "error", msg: err.message || "حدث خطأ أثناء الاتصال بالخادم." });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestUnlock = async () => {
    if (!unlockMessageText.trim()) {
      setSaveStatus({ type: "error", msg: "يرجى كتابة سبب طلب التعديل." });
      return;
    }
    try {
      const response = await fetch("/api/records/request-unlock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centerId: user.id,
          month: selectedMonth,
          year: selectedYear,
          message: unlockMessageText,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        setUnlockRequested(true);
        setSaveStatus({ type: "success", msg: "تم إرسال طلب تعديل الإحصائية إلى الماستر. سيتم الرد قريباً." });
      } else {
        setSaveStatus({ type: "error", msg: result.error || "فشل إرسال الطلب." });
      }
    } catch {
      setSaveStatus({ type: "error", msg: "فشل الاتصال بالخادم." });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 dir-rtl text-right" style={{ direction: "rtl" }}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header bar */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print animate-fade-in">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-500 animate-pulse"></span>
              <p className="text-xs font-bold text-teal-600 tracking-wider">بوابة الإدخال للمراكز الصحية</p>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
              المركز الحالي الصحي: <span className="text-teal-600">{user.name}</span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="print-btn"
              onClick={handlePrint}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all"
            >
              <Printer className="h-4 w-4" />
              <span>طباعة</span>
            </button>
            <button
              onClick={() => {
                if (formRef.current) exportFormToPdf(formRef.current, `احصائية-${selectedMonth}-${selectedYear}.pdf`);
              }}
              className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all"
            >
              <FileDown className="h-4 w-4" />
              <span>PDF</span>
            </button>
            <button
              id="logout-btn"
              onClick={onLogout}
              className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>

        {/* Print Only Title Section */}
        <div className="hidden print-only text-center border-b border-dashed border-slate-400 pb-3 mb-5">
          <p className="text-sm font-black">جمهورية العراق - وزارة الصحة - دائرة صحة بابل</p>
          <p className="text-xs text-slate-500">مستخرج من النظام الرقمي لقطاع الحملة الثاني</p>
        </div>

        {/* Selection bar */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm no-print">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-700">تحديد الفترة الإحصائية</h3>
                <p className="text-xs text-slate-500 font-medium font-sans">اختر الشهر والسنة المطلوبة لكتابة البيانات الإحصائية</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-500">الشهر:</label>
                <select
                  id="month-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-xl px-3 py-2 w-44 focus:ring-2 focus:ring-teal-500 outline-none transition-all cursor-pointer"
                >
                  {MONTHS.map((m) => (
                    <option key={m.val} value={m.val}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-500">السنة:</label>
                <select
                  id="year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-xl px-3 py-2 w-28 focus:ring-2 focus:ring-teal-500 outline-none transition-all cursor-pointer"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                id="refresh-btn"
                onClick={fetchCurrentRecord}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-600 transition-all cursor-pointer"
                title="تحديث البيانات"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Replicated Form Frame */}
        <div ref={formRef} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 relative">
          <div className="px-1 py-4 mb-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print">
            <div>
              <h2 className="text-lg font-black text-slate-900">الاستمارة الإحصائية التفاعلية الموحدة</h2>
              <p className="text-xs text-slate-500 font-medium">يرجى كتابة أرقام السجلات اليومية في الخلايا المناسبة لكتابة التقرير النهائي.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {lastAutoSaveTime && (
                <div className="text-[10px] text-slate-500 font-semibold bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>تم الحفظ كمسودة تلقائية {lastAutoSaveTime}</span>
                </div>
              )}
              <div className="text-xs text-teal-700 font-semibold bg-teal-50 border border-teal-100 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1">
                <CheckCircle className="h-3 w-3" />
                <span>العمليات الحسابية للأعمدة والمجموع تتم تلقائياً</span>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-4 no-print">
            {[
              { key: "all", label: "الاحصائية الرئيسية" },
              { key: "new", label: "جديدة أول مرة" },
              { key: "secondary", label: "جديدة بعد انقطاع" },
              { key: "repeat", label: "مترددة" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition-all border-2 ${
                  activeTab === tab.key
                    ? "bg-teal-600 text-white border-teal-600 shadow-md"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:border-teal-300 hover:bg-teal-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Real-time Draft Backup Rescue Alert */}
            {hasDraft && draftPayload && (
              <div className="bg-amber-50/70 border border-amber-300 text-amber-900 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in no-print shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black">عثرنا على مسودة محفوظة تلقائياً للشهر والمركز الحالي!</h4>
                    <p className="text-xs text-amber-800 font-medium leading-relaxed mt-0.5">
                      توجد إحصائية قمت بالعمل عليها محلياً على هذا الجهاز ولم تقم بحفظها في الخادم الرئيسي بعد. هل تود استعادتها؟
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleLoadDraft}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-amber-600/10"
                  >
                    استعادة العمل السابق
                  </button>
                  <button
                    type="button"
                    onClick={handleClearDraft}
                    className="bg-white hover:bg-slate-100 border border-amber-200 hover:border-amber-300 font-semibold text-amber-850 text-xs px-3 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    بدء استمارة فارغة
                  </button>
                </div>
              </div>
            )}

            {saveStatus && (
              <div id="save-status" className={`p-4 rounded-xl border flex items-start gap-3 no-print ${
                saveStatus.type === "success" 
                  ? "bg-emerald-50 border-emerald-500 text-emerald-800" 
                  : "bg-rose-50 border-rose-500 text-rose-800"
              }`}>
                {saveStatus.type === "success" ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <p className="text-sm font-bold">{saveStatus.msg}</p>
              </div>
            )}

            {/* Render form - readOnly if locked */}
            <FPReportForm
              section1={section1}
              section2={section2}
              onChangeSection1={locked ? undefined : setSection1}
              onChangeSection2={locked ? undefined : setSection2}
              advisorName={advisorName}
              onChangeAdvisorName={locked ? undefined : setAdvisorName}
              programManager={programManager}
              onChangeProgramManager={locked ? undefined : setProgramManager}
              directorName={directorName}
              onChangeDirectorName={locked ? undefined : setDirectorName}
              monthName={MONTHS.find((m) => m.val === selectedMonth)?.name || ""}
              year={selectedYear}
              centerName={user.name}
              readOnly={locked}
              category={activeTab}
            />

            {/* Lock banner */}
            {locked && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 no-print shadow-sm space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-black text-amber-900">الإحصائية مقفلة</h4>
                    <p className="text-xs text-amber-800 font-medium leading-relaxed mt-0.5">
                      هذه الإحصائية الشهرية تم حفظها وإقفالها. لا يمكن التعديل إلا بعد فتح الماستر.
                    </p>
                  </div>
                  {unlockRequested && (
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-lg shrink-0">قيد الانتظار</span>
                  )}
                </div>

                {!unlockRequested ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pr-13">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-amber-800 block mb-1">سبب طلب التعديل:</label>
                      <textarea
                        value={unlockMessageText}
                        onChange={(e) => setUnlockMessageText(e.target.value)}
                        placeholder="اكتب سبب طلب فتح الإحصائية للتعديل (مثال: خطأ في عدد المستفيدات)..."
                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                        rows={2}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRequestUnlock}
                      className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-all shrink-0 h-fit"
                    >
                      <Unlock className="h-4 w-4" />
                      إرسال الطلب
                    </button>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 font-medium pr-13">
                    تم إرسال طلب التعديل. يرجى انتظار رد الماستر.
                    {unlockMessageText && (
                      <div className="mt-1.5 text-slate-600 bg-white rounded-lg p-2 border border-blue-100">
                        <span className="font-bold text-slate-700">سبب الطلب: </span>{unlockMessageText}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Bottom action bar */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 no-print">
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 bg-slate-100 px-4 py-2.5 rounded-xl">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <span>
                  قم بفحص الإحصائية للتأكد من صحة البيانات قبل الحفظ.
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  id="check-btn"
                  type="button"
                  onClick={handleCheck}
                  disabled={locked || loading}
                  className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold px-6 py-3 rounded-xl cursor-pointer border-2 border-indigo-200 hover:border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <SearchCheck className="h-5 w-5" />
                  <span>فحص الإحصائية</span>
                </button>

                <button
                  id="submit-record-btn"
                  type="submit"
                  disabled={locked || loading}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-extrabold px-10 py-3 rounded-xl cursor-pointer shadow-lg shadow-teal-600/15 disabled:from-teal-400 disabled:to-teal-400 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>جاري حفظ السجلات...</span>
                    </div>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      <span>حفظ وإقفال الإحصائية</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* History records */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm no-print">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-teal-600" />
            <span>السجلات المرفوعة سابقا من مركزكم</span>
          </h3>

          {history.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-sm font-medium text-slate-500">لا يوجد سجلات مرفوعة سابقاً لهذا المركز في النظام الحالي.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {history.map((h, i) => (
                <div
                  key={i}
                  className="p-4 border border-slate-150 rounded-2xl bg-white hover:border-teal-500 hover:shadow-md transition-all flex flex-col justify-between items-start gap-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center font-bold">
                      {h.month}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        {MONTHS.find((m) => m.val === h.month)?.name}
                      </h4>
                      <p className="text-xs text-slate-500 font-semibold">سنة {h.year}</p>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 flex flex-col gap-0.5 w-full font-sans">
                    <span>تاريخ الرفع: {new Date(h.dateCreated).toLocaleDateString("en-US")}</span>
                    <span className={`font-bold mt-1 ${h.locked ? "text-amber-600" : "text-teal-600"}`}>
                      {h.locked ? "مقفلة - لا يمكن التعديل" : "مفتوحة - قابلة للتعديل"}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedMonth(h.month);
                      setSelectedYear(h.year);
                      setSection1(h.section1 || createEmptySection1());
                      setSection2(h.section2 || createEmptySection2());
                      setAdvisorName(h.advisorName || "");
                      setProgramManager(h.programManager || "");
                      setDirectorName(h.directorName || "بسام محمد ناصر");
                      window.scrollTo({ top: 150, behavior: "smooth" });
                    }}
                    className="w-full mt-1 text-center py-2 bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-700 font-extrabold border border-slate-150 hover:border-teal-200 text-xs rounded-xl cursor-pointer transition-all"
                  >
                    عرض وتعديل هذا السجل
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Audit Check Result Modal */}
    {showCheckModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowCheckModal(false)}>
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                auditResult.success ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
              }`}>
                {auditResult.success ? <Check className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">نتيجة فحص التدقيق الإحصائي</h2>
                <p className="text-sm text-slate-500 font-medium">
                  {auditResult.success 
                    ? "✓ جميع البيانات متطابقة! يمكنك الحفظ والإقفال." 
                    : `توجد اختلافات في البيانات يجب تصحيحها أولاً.`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCheckModal(false)}
              className="p-2 hover:bg-slate-100 rounded-xl cursor-pointer transition-all"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Visits vs Parity */}
            <div className={`p-4 rounded-2xl border transition-all ${
              auditResult.parityErrors.length === 0 ? "bg-emerald-50/20 border-emerald-200" : "bg-amber-50/20 border-amber-200"
            }`}>
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100/60">
                <h4 className="text-xs font-black text-slate-700">1. مطابقة الزيارات مع الولادات</h4>
                {auditResult.parityErrors.length === 0 ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">✓ متطابق</span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">تنبيه</span>
                )}
              </div>
              <p className="text-[10px]/relaxed text-slate-500 font-medium mb-3">
                مجموع المراجعات (جديدة + مترددة) يجب أن يساوي توزيع الأطفال (لا يوجد + 1 + 2 + 3 + 4 فأكثر).
              </p>
              {auditResult.parityErrors.length === 0 ? (
                <p className="text-[11px] font-bold text-emerald-800">جميع الفئات متطابقة ✓</p>
              ) : (
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                  {auditResult.parityErrors.map((e, i) => (
                    <div key={i} className="text-[10px] bg-white border border-amber-150 p-1.5 rounded-lg flex justify-between items-center font-bold">
                      <span className="text-slate-700">{e.label}</span>
                      <span className="text-amber-800 font-mono">زيارات ({e.clients}) ≠ أطفال ({e.parity})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card 2: Contraceptives */}
            <div className={`p-4 rounded-2xl border transition-all ${
              auditResult.contraErrors.length === 0 ? "bg-emerald-50/20 border-emerald-200" : "bg-amber-50/20 border-amber-200"
            }`}>
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100/60">
                <h4 className="text-xs font-black text-slate-700">2. مطابقة مستفيدات الصرف</h4>
                {auditResult.contraErrors.length === 0 ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">✓ متطابق</span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">تنبيه</span>
                )}
              </div>
              <p className="text-[10px]/relaxed text-slate-500 font-medium mb-3">
                الحصول + تغيير الوسيلة (جدول 1) يجب أن يطابق مجموع مستفيدات الوسائل (جدول 2).
              </p>
              {auditResult.contraErrors.length === 0 ? (
                <p className="text-[11px] font-bold text-emerald-800">جميع المستفيدات مطابقات ✓</p>
              ) : (
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                  {auditResult.contraErrors.map((e, i) => (
                    <div key={i} className="text-[10px] bg-white border border-amber-150 p-1.5 rounded-lg flex justify-between items-center font-bold">
                      <span className="text-slate-700">{e.label}</span>
                      <span className="text-amber-800 font-mono">حصول/تغيير ({e.s1}) ≠ صرف ({e.s2})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card 3: Consultation */}
            <div className={`p-4 rounded-2xl border transition-all ${
              auditResult.consultErrors.length === 0 ? "bg-emerald-50/20 border-emerald-200" : "bg-amber-50/20 border-amber-200"
            }`}>
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100/60">
                <h4 className="text-xs font-black text-slate-700">3. مطابقة المشورة</h4>
                {auditResult.consultErrors.length === 0 ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">✓ متطابق</span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">تنبيه</span>
                )}
              </div>
              <p className="text-[10px]/relaxed text-slate-500 font-medium mb-3">
                المشورة (جدول 1) يجب أن تساوي إجمالي المستفيدات لأن كل مستفيدة تحصل على مشورة.
              </p>
              {auditResult.consultErrors.length === 0 ? (
                <p className="text-[11px] font-bold text-emerald-800">جميع المستفيدات لديهن مشورة ✓</p>
              ) : (
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                  {auditResult.consultErrors.map((e, i) => (
                    <div key={i} className="text-[10px] bg-white border border-amber-150 p-1.5 rounded-lg flex justify-between items-center font-bold">
                      <span className="text-slate-700">{e.label}</span>
                      <span className="text-amber-800 font-mono">مشورة ({e.consult}) ≠ مستفيدات ({e.clients})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom actions */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
            <p className="text-xs text-slate-500 font-medium">
              {auditResult.success 
                ? "✓ يمكنك الآن الحفظ والإقفال." 
                : "⚠ قم بتصحيح الأخطاء الموضحة أعلاه وأعد الفحص."}
            </p>
            <button
              onClick={() => setShowCheckModal(false)}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer transition-all text-sm"
            >
              {auditResult.success ? "حسناً، إغلاق" : "إغلاق والتصحيح"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
