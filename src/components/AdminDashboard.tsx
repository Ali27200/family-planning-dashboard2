/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Building2, Plus, Edit2, Trash2, Calendar, FileSpreadsheet, 
  Printer, LogOut, CheckCircle2, ChevronLeft, AlertCircle,
  Database, RefreshCw, ShieldAlert, FileText, Check, X,
  Lock, Unlock, Download, Upload
} from "lucide-react";
import { 
  HealthCenter, SubmissionRecord, Section1Data, Section2Data, AgeRange, AGE_RANGES,
  createEmptySection1, createEmptySection2 
} from "../types";
import FPReportForm from "./FPReportForm";
import ReportsView from "./ReportsView";
import { exportFormToPdf } from "../utils/pdfExport";

interface AdminDashboardProps {
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

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  // Query Filters State
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedCenterId, setSelectedCenterId] = useState<string>("all");

  // Data State
  const [centers, setCenters] = useState<HealthCenter[]>([]);
  const [records, setRecords] = useState<SubmissionRecord[]>([]);
  const [unlockRequests, setUnlockRequests] = useState<SubmissionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Center Management State
  const [showCenterForm, setShowCenterForm] = useState(false);
  const [centerFormMode, setCenterFormMode] = useState<"add" | "edit">("add");
  const [editingCenterId, setEditingCenterId] = useState<string | null>(null);
  const [centerName, setCenterName] = useState("");
  const [centerUser, setCenterUser] = useState("");
  const [centerPass, setCenterPass] = useState("");
  const [mgmtStatus, setMgmtStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const formPdfRef = useRef<HTMLDivElement>(null);
  // View toggles: "report" = reports dashboard, "centers" = health centers list manager, "reports" = annual/charts
  const [currentView, setCurrentView] = useState<"report" | "centers" | "reports">("report");

  // Fetch standard data
  const fetchData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // Fetch Centers
      const centersRes = await fetch("/api/centers");
      const centersVal = await centersRes.json();
      setCenters(centersVal || []);

      // Fetch Records for selected month/year
      const recordsUrl = `/api/records?month=${selectedMonth}&year=${selectedYear}`;
      const recordsRes = await fetch(recordsUrl);
      const recordsVal = await recordsRes.json();
      setRecords(recordsVal || []);
    } catch (err) {
      console.error(err);
      setErrorMessage("خطأ في الاتصال بالخادم وتحميل الإحصائيات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  // Fetch unlock requests separately (any month/year)
  const fetchUnlockRequests = async () => {
    try {
      const res = await fetch("/api/records/unlock-requests");
      const data = await res.json();
      setUnlockRequests(data || []);
    } catch (err) {
      console.error("Error fetching unlock requests", err);
    }
  };

  // Initial fetch + auto-poll every 15s with audio alert on new requests
  const prevUnlockCountRef = useRef(0);
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/records/unlock-requests");
        const data: SubmissionRecord[] = await res.json();
        const count = (data || []).length;
        if (count > prevUnlockCountRef.current && prevUnlockCountRef.current > 0) {
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 660;
            osc.type = "sine";
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
          } catch {}
        }
        prevUnlockCountRef.current = count;
        setUnlockRequests(data || []);
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handle open add center
  const handleOpenAddCenter = () => {
    setCenterFormMode("add");
    setEditingCenterId(null);
    setCenterName("");
    setCenterUser("");
    setCenterPass("");
    setMgmtStatus(null);
    setShowCenterForm(true);
  };

  // Handle open edit center
  const handleOpenEditCenter = (center: HealthCenter) => {
    setCenterFormMode("edit");
    setEditingCenterId(center.id);
    setCenterName(center.name);
    setCenterUser(center.username);
    setCenterPass(center.password);
    setMgmtStatus(null);
    setShowCenterForm(true);
  };

  // Save/Update Center
  const saveCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    setMgmtStatus(null);
    const url = centerFormMode === "add" ? "/api/centers" : `/api/centers/${editingCenterId}`;
    const method = centerFormMode === "add" ? "POST" : "PUT";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: centerName, username: centerUser, password: centerPass }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "حدث خطأ أثناء حفظ المركز");
      }

      setMgmtStatus({
        type: "success",
        msg: centerFormMode === "add" ? "تمت إضافة المركز الصحي بنجاح" : "تم تحديث بيانات المركز بنجاح!",
      });
      fetchData();
      
      // Clear form on add
      if (centerFormMode === "add") {
        setCenterName("");
        setCenterUser("");
        setCenterPass("");
      }
    } catch (err: any) {
      setMgmtStatus({ type: "error", msg: err.message });
    }
  };

  // Delete Center
  const deleteCenter = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المركز بالكامل من النظام؟ سيؤدي ذلك أيضاً إلى إزالة أي سجلات تابعة له.")) {
      return;
    }

    try {
      const response = await fetch(`/api/centers/${id}`, { method: "DELETE" });
      if (response.ok) {
        fetchData();
      } else {
        alert("فشل حذف المركز الصحي.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate aggregated / Summed data for all records
  const aggregateSection1 = (): Section1Data => {
    const aggregate = createEmptySection1();
    records.forEach((rec) => {
      if (!rec.section1) return;
      Object.keys(rec.section1).forEach((rowKeyStr) => {
        const rowKey = rowKeyStr as keyof Section1Data;
        const row = rec.section1[rowKey];
        if (row) {
          AGE_RANGES.forEach((age) => {
            aggregate[rowKey][age] = (aggregate[rowKey][age] || 0) + (row[age] || 0);
          });
        }
      });
    });
    return aggregate;
  };

  const aggregateSection2 = (): Section2Data => {
    const aggregate = createEmptySection2();
    records.forEach((rec) => {
      if (!rec.section2) return;
      Object.keys(rec.section2).forEach((rowKeyStr) => {
        const rowKey = rowKeyStr as keyof Section2Data;
        const row = rec.section2[rowKey];
        if (row) {
          AGE_RANGES.forEach((age) => {
            if (row[age]) {
              aggregate[rowKey][age].clients = (aggregate[rowKey][age].clients || 0) + (row[age].clients || 0);
              aggregate[rowKey][age].quantity = (aggregate[rowKey][age].quantity || 0) + (row[age].quantity || 0);
            }
          });
        }
      });
    });
    return aggregate;
  };

  // Individual or aggregate form selection
  const isAll = selectedCenterId === "all";
  const displayedSection1 = isAll ? aggregateSection1() : (records.find((r) => r.centerId === selectedCenterId)?.section1 || createEmptySection1());
  const displayedSection2 = isAll ? aggregateSection2() : (records.find((r) => r.centerId === selectedCenterId)?.section2 || createEmptySection2());
  const hasSubmissionForSelected = isAll ? records.length > 0 : records.some((r) => r.centerId === selectedCenterId);

  const displayedAdvisor = isAll ? "الدمج التلقائي الموحد" : (records.find((r) => r.centerId === selectedCenterId)?.advisorName || "");
  const displayedProgramManager = isAll ? "النظام الرقمي" : (records.find((r) => r.centerId === selectedCenterId)?.programManager || "");
  const displayedDirector = isAll ? "بسام محمد ناصر" : (records.find((r) => r.centerId === selectedCenterId)?.directorName || "بسام محمد ناصر");

  // Submissions analytics counts
  const submittedCount = records.length;
  const missingCount = Math.max(0, centers.length - submittedCount);

  // Check if any records have audit mismatches
  const hasAuditErrors = records.some((r) => {
    let hasError = false;
    AGE_RANGES.forEach((age) => {
      const clients = (r.section1.new_client[age] || 0) + (r.section1.secondary_client[age] || 0) + (r.section1.repeat_client[age] || 0);
      const parity = (r.section1.nullipara[age] || 0) + (r.section1.single_child[age] || 0) + (r.section1.two_children[age] || 0) + (r.section1.three_children[age] || 0) + (r.section1.four_plus[age] || 0);
      if (clients !== parity) hasError = true;

      const s1Contra = (r.section1.get_method[age] || 0) + (r.section1.change_method[age] || 0);
      const s2Contra = (r.section2.pills_mini[age]?.clients || 0) + (r.section2.pills_combined[age]?.clients || 0) + (r.section2.iud_loop[age]?.clients || 0) + (r.section2.condom[age]?.clients || 0) + (r.section2.injection_mini[age]?.clients || 0) + (r.section2.vaginal_cream[age]?.clients || 0) + (r.section2.others[age]?.clients || 0);
      if (s1Contra !== s2Contra) hasError = true;

      const s1Consult = r.section1.consultation[age] || 0;
      if (s1Consult !== clients) hasError = true;
    });
    return hasError;
  });

  // Export full detailed spreadsheet CSV matching the two forms
  const handleExportCSV = () => {
    if (records.length === 0) {
      alert("لا يوجد بيانات لتصديرها في هذه الفترة!");
      return;
    }

    if (hasAuditErrors) {
      alert("توجد أخطاء تدقيق في البيانات. يرجى تصحيحها أولاً قبل الترحيل/التصدير.");
      return;
    }

    let csvContent = "\uFEFF"; // UTF-8 BOM so Excel opens Arabic letters correctly!

    csvContent += "الجمهورية العراقية - وزارة الصحة - دائرة صحة بابل - قطاع الحلة الثاني\n";
    csvContent += `تقرير كشف ومطابقة وسائل تنظيم الأسرة - الفترة: ${MONTHS.find(m => m.val === selectedMonth)?.name} سنة ${selectedYear}\n\n`;

    // Section 1 exports
    csvContent += "الجدول الأول: المستفيدات\n";
    csvContent += "الفئة العمرية,Indicator,اقل من 20,24-20,29-25,34-30,فاكثر 35,المجموع المدمج\n";

    const s1RowKeys: Array<{ key: keyof Section1Data; label: string; eng: string }> = [
      { key: "new_client", label: "جديدة أول مرة", eng: "new client" },
      { key: "secondary_client", label: "جديدة بعد انقطاع", eng: "secondary registered client" },
      { key: "repeat_client", label: "مترددة", eng: "-" },
      { key: "get_method", label: "الحصول على وسيلة", eng: "get a method" },
      { key: "change_method", label: "تغيير الوسيلة", eng: "change method" },
      { key: "followup", label: "مضاعفات طبية", eng: "followup" },
      { key: "maintenance", label: "متابعة الوسيلة", eng: "health complications" },
      { key: "remove_loop", label: "رفع لولب", eng: "removal of a loop" },
      { key: "consultation", label: "المشورة", eng: "consultation" },
      { key: "nullipara", label: "لا يوجد طفل", eng: "nullipara" },
      { key: "single_child", label: "طفل واحد", eng: "single baby" },
      { key: "two_children", label: "طفلين", eng: "tow babies" },
      { key: "three_children", label: "ثلاثة اطفال", eng: "three babies" },
      { key: "four_plus", label: "أربعة فأكثر", eng: "four babies and more" }
    ];

    s1RowKeys.forEach((row) => {
      const dataRow = displayedSection1[row.key];
      const sum = AGE_RANGES.reduce((acc, age) => acc + (dataRow[age] || 0), 0);
      csvContent += `${row.label},${row.eng},${dataRow.under_20},${dataRow.age_20_24},${dataRow.age_25_29},${dataRow.age_30_34},${dataRow.over_35},${sum}\n`;
    });

    csvContent += "\n\nالجدول الثاني: الوسائل والكميات الموزعة\n";
    csvContent += "الوسيلة,,اقل من 20,,24-20,,29-25,,34-30,,فاكثر 35,,مجموع المستفيدات,مجموع المصروف\n";
    csvContent += ",,المستفيدات,الكمية,المستفيدات,الكمية,المستفيدات,الكمية,المستفيدات,الكمية,المستفيدات,الكمية,,\n";

    const s2RowKeys: Array<{ key: keyof Section2Data; label: string; eng: string }> = [
      { key: "pills_mini", label: "حبوب أحادية", eng: "mini pills" },
      { key: "pills_combined", label: "حبوب مركبة", eng: "combined pills" },
      { key: "iud_loop", label: "لولب", eng: "loop" },
      { key: "condom", label: "واقي", eng: "condom" },
      { key: "injection_mini", label: "حقن احادية", eng: "mini injections" },
      { key: "vaginal_cream", label: "كريم مهبلي", eng: "vaginal cream" },
      { key: "others", label: "أخرى", eng: "others" },
      { key: "consultation_only", label: "مشورة فقط", eng: "consultation only" }
    ];

    s2RowKeys.forEach((row) => {
      const dataRow = displayedSection2[row.key];
      const rowClients = AGE_RANGES.reduce((acc, age) => acc + (dataRow[age].clients || 0), 0);
      const rowQuantity = AGE_RANGES.reduce((acc, age) => acc + (dataRow[age].quantity || 0), 0);
      
      let cellsStr = `${row.label} (${row.eng}),`;
      AGE_RANGES.forEach((age) => {
        cellsStr += `,${dataRow[age].clients},${dataRow[age].quantity}`;
      });
      csvContent += `${cellsStr},${rowClients},${rowQuantity}\n`;
    });

    // Create file object download trigger
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `family_planning_report_${selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBackup = async () => {
    try {
      const res = await fetch("/api/backup/save-local", { method: "POST" });
      const result = await res.json();
      if (result.success) {
        alert(`✅ تم حفظ النسخة في:\n${result.path}`);
      } else {
        alert("❌ " + (result.error || "فشل الحفظ"));
      }
    } catch {
      alert("❌ فشل الاتصال بالخادم");
    }
  };

  const handleBackupDownload = async () => {
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
      alert("✅ تم تحميل النسخة الاحتياطية بنجاح");
    } catch {
      alert("❌ فشل في تحميل النسخة الاحتياطية");
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
          alert("✅ تمت استعادة البيانات بنجاح. سيتم إعادة تحميل الصفحة.");
          window.location.reload();
        } else {
          alert("❌ " + (result.error || "فشل الاستعادة"));
        }
      } catch {
        alert("❌ ملف غير صالح");
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 dir-rtl text-right" style={{ direction: "rtl" }}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation & Master info header */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print animate-fade-in animate-duration-300">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-gradient-to-tr from-teal-600 to-teal-400 text-white rounded-2xl flex items-center justify-center font-bold shadow-md shadow-teal-500/10">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-500"></span>
                <p className="text-xs font-bold text-teal-600 uppercase tracking-widest">إدارة قطاع الحلة الثاني</p>
              </div>
              <h1 className="text-xl font-black text-slate-900 mt-0.5">لوحة التحكم السحابية الموحدة</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="view-report-view-btn"
              onClick={() => setCurrentView("report")}
              className={`flex items-center gap-2 text-sm font-extrabold px-5 py-2.5 rounded-xl cursor-pointer transition-all ${
                currentView === "report"
                  ? "bg-teal-600 text-white shadow-md shadow-teal-600/10"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>إحصائيات ومطابقة التقارير</span>
            </button>

            <button
              id="view-centers-view-btn"
              onClick={() => setCurrentView("centers")}
              className={`flex items-center gap-2 text-sm font-extrabold px-5 py-2.5 rounded-xl cursor-pointer transition-all ${
                currentView === "centers"
                  ? "bg-teal-600 text-white shadow-md shadow-teal-600/10"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200"
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>إدارة يوزرات المراكز الـ 11</span>
            </button>

            <button
              id="view-reports-view-btn"
              onClick={() => setCurrentView("reports")}
              className={`flex items-center gap-2 text-sm font-extrabold px-5 py-2.5 rounded-xl cursor-pointer transition-all ${
                currentView === "reports"
                  ? "bg-teal-600 text-white shadow-md shadow-teal-600/10"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200"
              }`}
            >
              <Database className="h-4 w-4" />
              <span>تقارير سنوية ورسوم بيانية</span>
            </button>

            <button
              id="logout-btn"
              onClick={onLogout}
              className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all border border-rose-100"
            >
              <LogOut className="h-4 w-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div id="error-message" className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center gap-3 font-bold no-print">
            <AlertCircle className="h-5 w-5 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {currentView === "reports" ? (
          <ReportsView centers={centers} />
        ) : currentView === "report" ? (
          <>
            {/* Filter controls & Selector row */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm no-print space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center font-bold">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">تصفية الفترة والمركز الإحصائي</h3>
                    <p className="text-xs text-slate-400 font-medium">قم باختيار الشهر والمركز المطلوب لمطابقة البيانات الحية</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3.5">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-black text-slate-500">الشهر:</label>
                    <select
                      id="month-select"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="bg-slate-50 border border-slate-200 text-slate-805 text-sm font-bold rounded-xl px-3 py-2 w-40 outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer text-center"
                    >
                      {MONTHS.map((m) => (
                        <option key={m.val} value={m.val}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-black text-slate-500">السنة:</label>
                    <select
                      id="year-select"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="bg-slate-50 border border-slate-200 text-slate-805 text-sm font-bold rounded-xl px-3 py-2 w-28 outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer text-center"
                    >
                      {YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-black text-slate-650 bg-teal-50 px-2 py-1 rounded-md border border-teal-100">عرض التقرير لـ:</label>
                    <select
                      id="center-filter-select"
                      value={selectedCenterId}
                      onChange={(e) => setSelectedCenterId(e.target.value)}
                      className="bg-teal-50/50 border border-teal-200 text-teal-950 text-sm font-black rounded-xl px-4 py-2 w-56 outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    >
                      <option value="all">جميع المراكز (التقرير التجميعي المدمج)</option>
                      {centers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    id="refresh-btn"
                    onClick={fetchData}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-600 transition-all cursor-pointer"
                    title="تحديث التقارير"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Submissions health summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${missingCount === 0 ? "bg-emerald-500" : "bg-amber-500"} animate-pulse`}></span>
                  <p className="text-xs font-bold text-slate-600">
                    تم تسليم الإحصائية من قبل <span className="text-emerald-700 font-extrabold">{submittedCount}</span> مراكز صحية، وبانتظار <span className="text-rose-600 font-extrabold">{missingCount}</span> مراكز.
                  </p>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  {hasAuditErrors && (
                    <span className="text-[10px] text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg font-bold">
                      ⚠ توجد أخطاء تدقيق - الترحيل موقوف
                    </span>
                  )}
                  <button
                    id="export-csv-btn"
                    onClick={handleExportCSV}
                    disabled={hasAuditErrors}
                    className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-black px-3.5 py-2 rounded-xl border border-emerald-200 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>تنزيل كملف Excel/CSV</span>
                  </button>
                  <button
                    id="print-btn"
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black px-3.5 py-2 rounded-xl border border-slate-200 cursor-pointer transition-all"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>طباعة الاستمارة الرسمية</span>
                  </button>
                  <button
                    onClick={handleBackup}
                    className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-black px-3.5 py-2 rounded-xl border border-blue-200 cursor-pointer transition-all"
                  >
                    <Database className="h-3.5 w-3.5" />
                    <span>حفظ في الصيانة والخزن</span>
                  </button>
                  <button
                    onClick={handleBackupDownload}
                    className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-black px-3.5 py-2 rounded-xl border border-indigo-200 cursor-pointer transition-all"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>تحميل نسخة</span>
                  </button>
                  <button
                    onClick={handleRestore}
                    className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-black px-3.5 py-2 rounded-xl border border-amber-200 cursor-pointer transition-all"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>استيراد</span>
                  </button>
                </div>
              </div>

              {/* Interactive Analytics & Graphical Dashboard (No Print) */}
              <div className="no-print grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                
                {/* Bento Card 1: Contraceptives distributed */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm">💊</div>
                        <h3 className="text-xs font-black text-slate-800">توزيع موانع الحمل (الكمية والمستفيدات)</h3>
                      </div>
                      <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold">حجم الصرف المادي</span>
                    </div>
                    
                    <div className="space-y-4">
                      {(() => {
                        const contraceptivesData = [
                          { name: "حقن أحادية (موانع)", key: "injection_mini" as keyof Section2Data, color: "bg-rose-500", label: "Injections" },
                          { name: "اللولب الرحمي (IUD)", key: "iud_loop" as keyof Section2Data, color: "bg-teal-500", label: "IUD Loop" },
                          { name: "حبوب ثنائية (مركبة)", key: "pills_combined" as keyof Section2Data, color: "bg-indigo-500", label: "Pills Combined" },
                          { name: "حبوب أحادية (مرضعات)", key: "pills_mini" as keyof Section2Data, color: "bg-amber-500", label: "Pills Mini" },
                          { name: "الواقي الذكري (Condoms)", key: "condom" as keyof Section2Data, color: "bg-blue-500", label: "Condoms" },
                          { name: "وسائل أخرى", key: "others" as keyof Section2Data, color: "bg-slate-500", label: "Others" },
                        ];

                        const maxQty = Math.max(...contraceptivesData.map(d => 
                          AGE_RANGES.reduce((acc, age) => acc + (displayedSection2[d.key]?.[age]?.quantity || 0), 0)
                        ), 1);

                        return contraceptivesData.map(item => {
                          const qty = AGE_RANGES.reduce((acc, age) => acc + (displayedSection2[item.key]?.[age]?.quantity || 0), 0);
                          const clients = AGE_RANGES.reduce((acc, age) => acc + (displayedSection2[item.key]?.[age]?.clients || 0), 0);
                          const percent = Math.round((qty / maxQty) * 100);

                          return (
                            <div key={item.key} className="space-y-1.5">
                              <div className="flex justify-between items-center text-[11px] font-bold">
                                <span className="text-slate-700">{item.name}</span>
                                <span className="text-slate-500 font-mono">
                                  كمية: <span className="text-slate-800 font-extrabold">{qty}</span> | مستفيدات: <span className="text-indigo-650 font-black">{clients}</span>
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                                <div 
                                  className={`${item.color} h-full rounded-full transition-all duration-1000`} 
                                  style={{ width: `${percent}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-50 mt-4 text-[10px] text-slate-400 text-center font-bold">
                    * البيانات مستخرجة تلقائياً من تقارير وسجلات الجدول الإحصائي الثاني
                  </div>
                </div>

                {/* Bento Card 2: Demographic Profile and visitor distribution */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center font-bold text-sm">📊</div>
                        <h3 className="text-xs font-black text-slate-800">التحليل الديموغرافي للفئات العمرية للمستفيدات</h3>
                      </div>
                      <span className="text-[10px] text-teal-600 bg-teal-50 px-2 py-0.5 rounded font-bold">فئات الأعمار</span>
                    </div>

                    <p className="text-[11px] text-slate-500 font-medium mb-5">توزيع الفئات المراجعة للأطفال وتنظيم الأسرة حسـب أعمار المستفيدات بالقطاع:</p>

                    {(() => {
                      const ageLabelsLocalByGroup = {
                      under_20: "أقل من 20 سنة",
                      age_20_24: "24-20 سنة",
                      age_25_29: "29-25 سنة",
                      age_30_34: "34-30 سنة",
                      over_35: "35 سنة فما فوق",
                      };

                      const ageVisitsList = AGE_RANGES.map(age => {
                        const visits = (displayedSection1.new_client[age] || 0) + 
                                       (displayedSection1.secondary_client[age] || 0) + 
                                       (displayedSection1.repeat_client[age] || 0);
                        return {
                          age,
                          label: ageLabelsLocalByGroup[age],
                          visits
                        };
                      });

                      const totalVisits = ageVisitsList.reduce((acc, item) => acc + item.visits, 0);
                      const maxVisits = Math.max(...ageVisitsList.map(a => a.visits), 1);

                      return (
                        <div className="space-y-4">
                          <div className="flex justify-between items-end h-[110px] pb-1 border-b border-slate-100 px-2">
                            {ageVisitsList.map(item => {
                              const percentHeight = Math.max(Math.round((item.visits / maxVisits) * 100), 4);
                              return (
                                <div key={item.age} className="flex flex-col items-center w-8 group">
                                  <span className="text-[9px] font-black font-mono text-teal-700 opacity-0 group-hover:opacity-100 transition-all mb-1">
                                    {item.visits}
                                  </span>
                                  <div 
                                    className="w-5 bg-teal-500 rounded-t-md hover:bg-teal-600 transition-all duration-700"
                                    style={{ height: `${percentHeight}px` }}
                                    title={`عدد الزيارات: ${item.visits}`}
                                  ></div>
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="grid grid-cols-5 gap-1 text-center">
                            {ageVisitsList.map(item => {
                              const pct = totalVisits > 0 ? Math.round((item.visits / totalVisits) * 100) : 0;
                              return (
                                <div key={item.age} className="space-y-0.5">
                                  <p className="text-[9px] text-slate-400 font-bold leading-tight">{item.label}</p>
                                  <p className="text-[10px] text-slate-800 font-extrabold font-mono">{pct}%</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="pt-3 border-t border-slate-50 mt-4 text-[10px] text-teal-700 text-center font-bold bg-teal-50/40 rounded-xl py-1">
                    إجمالي الزيارات النشطة لهذا الشهر: {
                      AGE_RANGES.reduce((acc, age) => acc + 
                        (displayedSection1.new_client[age] || 0) + 
                        (displayedSection1.secondary_client[age] || 0) + 
                        (displayedSection1.repeat_client[age] || 0), 0)
                    } مستفيدة
                  </div>
                </div>

                {/* Bento Card 3: Sector Data Compliance speedometer */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center font-bold text-sm">🔐</div>
                        <h3 className="text-xs font-black text-slate-800">مؤشر ضبط الجودة الإلكترونية وموازنة البيانات</h3>
                      </div>
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-bold">دقة الإحصائيات</span>
                    </div>

                    {(() => {
                      let perfectCount = 0;
                      records.forEach(r => {
                        let recordOk = true;
                        AGE_RANGES.forEach(age => {
                          const visits = (r.section1.new_client[age] || 0) + (r.section1.secondary_client[age] || 0) + (r.section1.repeat_client[age] || 0);
                          const parity = (r.section1.nullipara[age] || 0) + (r.section1.single_child[age] || 0) + (r.section1.two_children[age] || 0) + (r.section1.three_children[age] || 0) + (r.section1.four_plus[age] || 0);
                          if (visits !== parity) recordOk = false;

                          const s1Contra = (r.section1.get_method[age] || 0) + (r.section1.change_method[age] || 0);
                          const s2Contra = (r.section2.pills_mini[age]?.clients || 0) + 
                                            (r.section2.pills_combined[age]?.clients || 0) + 
                                            (r.section2.iud_loop[age]?.clients || 0) + 
                                            (r.section2.condom[age]?.clients || 0) + 
                                            (r.section2.injection_mini[age]?.clients || 0) + 
                                            (r.section2.vaginal_cream[age]?.clients || 0) + 
                                            (r.section2.others[age]?.clients || 0);
                          if (s1Contra !== s2Contra) recordOk = false;

                          const s1Consult = r.section1.consultation[age] || 0;
                          const totalClients = (r.section1.new_client[age] || 0) + (r.section1.secondary_client[age] || 0) + (r.section1.repeat_client[age] || 0);
                          if (s1Consult !== totalClients) recordOk = false;
                        });
                        if (recordOk) perfectCount++;
                      });

                      const totalSubmitted = records.length;
                      const qaPct = totalSubmitted > 0 ? Math.round((perfectCount / totalSubmitted) * 100) : 100;

                      return (
                        <div className="space-y-4">
                          <div className="flex flex-col items-center justify-center p-3 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            <span className="text-3xl font-black font-mono text-amber-600">{qaPct}%</span>
                            <span className="text-[10px] text-slate-500 font-bold mt-1 text-center">أهليّة ومطابقة التقارير المستلمة ورقياً وإلكترونياً</span>
                          </div>

                          <div className="space-y-2 text-[11px] font-bold">
                            <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                              <span className="text-slate-600">المستلمة المتطابقة بالكامل (100%):</span>
                              <span className="text-emerald-700 font-mono">{perfectCount} مراكز</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                              <span className="text-slate-600">المستلمة التي تحتاج لموازنة وتعديلات:</span>
                              <span className="text-amber-800 font-mono">{totalSubmitted - perfectCount} مراكز</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                              <span className="text-slate-600">إجمالي استجابة القطاع لهذا الشهر:</span>
                              <span className="text-slate-800 font-mono">{totalSubmitted} من أصل {centers.length}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="pt-3 border-t border-slate-50 mt-4 text-[10px] text-slate-400 text-center font-bold">
                    * يقوم النظام بقفل التقارير وتصريحها فترات ترحيل الفحص المالي والمادي
                  </div>
                </div>

              </div>

              {/* Unlock requests section (fetched separately, any month/year) */}
              {unlockRequests.length > 0 && (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Unlock className="h-5 w-5 text-blue-600" />
                    <h4 className="text-sm font-black text-blue-900">طلبات فتح الإحصائيات من المراكز</h4>
                  </div>
                  <div className="space-y-2">
                    {unlockRequests.map((r) => {
                      const center = centers.find(c => c.id === r.centerId);
                      return (
                        <div key={`${r.centerId}-${r.month}-${r.year}`} className="bg-white border border-blue-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-extrabold text-slate-800">{center?.name || r.centerId}</span>
                              <span className="text-slate-500">شهر {r.month} / {r.year}</span>
                            </div>
                            {r.unlockMessage && (
                              <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 text-slate-700">
                                <span className="font-bold text-amber-800">السبب: </span>{r.unlockMessage}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch("/api/records/unlock", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ centerId: r.centerId, month: r.month, year: r.year }),
                                });
                                if (res.ok) {
                                  fetchData();
                                  fetchUnlockRequests();
                                }
                              } catch {}
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl cursor-pointer transition-all text-sm shrink-0"
                          >
                            الموافقة وفتح التعديل
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Badges/Submissions checklist block */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-slate-550">حالة والتزام المراكز الصحية الـ 11 للأطفال وتنظيم الأسرة:</p>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">Month: {selectedMonth} / Year: {selectedYear}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {centers.map((center) => {
                    const hasSubmitted = records.some((r) => r.centerId === center.id);
                    const record = records.find((r) => r.centerId === center.id);
                    const isLocked = record?.locked;
                    const needsUnlock = unlockRequests.some((r) => r.centerId === center.id);
                    return (
                      <span
                        key={center.id}
                        className={`text-[10px]/snug px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all ${
                          hasSubmitted 
                            ? "bg-emerald-55 border border-emerald-100 text-emerald-800"
                            : "bg-rose-50 border border-rose-100 text-rose-800"
                        } ${needsUnlock ? "ring-2 ring-blue-400" : ""}`}
                        onClick={() => {
                          if (hasSubmitted) setSelectedCenterId(center.id);
                        }}
                        title={hasSubmitted ? "انقر لعرض استمارة هذا المركز مباشرة" : "هذا المركز متأخر حالياً"}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${hasSubmitted ? "bg-emerald-500" : "bg-rose-400"}`}></span>
                        {center.name} 
                        {hasSubmitted ? (isLocked ? " (مقفلة)" : " (مفتوحة)") : " (متاخر)"}
                        {needsUnlock && " 🔓"}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Replicated Form frame / PDF view */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 overflow-hidden relative">
              
              {!hasSubmissionForSelected && (
                <div className="bg-amber-50 border-2 border-dashed border-amber-300 rounded-2xl p-8 text-center flex flex-col justify-center items-center gap-2.5 no-print mb-6">
                  <span className="text-3xl">⚠️</span>
                  <h3 className="text-sm font-black text-slate-850">ملاحظة للمطابقة والتحقق</h3>
                  <p className="text-xs text-slate-500 font-semibold max-w-lg leading-relaxed">
                    {isAll 
                      ? "لا يوجد أي سجلات مرفوعة حالياً للقطاع في هذه الفترة الزمنية الإحصائية. جميع المراكز الإحدى عشر لم تنجز الرفع بعد. يظهر التقرير العام كأصفار مؤقتاً لحين تسليم المراكز لتقاريرهم."
                      : "هذا المركز المحدد لم يسلم وثيقة الإحصائية الرقمية الخاصة بالفترة المحددة حتى اللحظة. يرجى إبلاغهم أو الرفع اليدوي باسمهم."
                    }
                  </p>
                </div>
              )}

              {/* PDF Export Button */}
              <div className="flex justify-end mb-3 no-print">
                <button
                  onClick={() => {
                    if (formPdfRef.current) exportFormToPdf(formPdfRef.current, `احصائية-${selectedMonth}-${selectedYear}.pdf`);
                  }}
                  className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl text-sm cursor-pointer transition-all"
                >
                  <Printer className="h-4 w-4" />
                  <span>تصدير PDF</span>
                </button>
              </div>
              {/* Master visual of the authentic Iraqi Family Planning document form layout */}
              <div ref={formPdfRef}>
              <FPReportForm
                section1={displayedSection1}
                section2={displayedSection2}
                advisorName={displayedAdvisor}
                programManager={displayedProgramManager}
                directorName={displayedDirector}
                monthName={MONTHS.find((m) => m.val === selectedMonth)?.name || ""}
                year={selectedYear}
                centerName={isAll ? "جميع المراكز (الدمج التجميعي للقطاع)" : (centers.find(c => c.id === selectedCenterId)?.name || "")}
                readOnly={true}
              />
              </div>

            </div>
          </>
        ) : (
          /* Centers Administration list */
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-150">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">إدارة ودليل يوزرات المراكز الـ 11</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  إضافة مراكز صحية جديدة، إعادة ضبط كلمات المرور، أو تعديل المسميات الرسمية وتفاصيل الدخول.
                </p>
              </div>

              <button
                id="add-center-btn"
                onClick={handleOpenAddCenter}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-teal-650/15"
              >
                <Plus className="h-4 w-4" />
                <span>إضافة رمز لمركز جديد</span>
              </button>
            </div>

            {/* Center editing/add form (Modal-like card) */}
            {showCenterForm && (
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 animate-fade-in animate-duration-300">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-bold text-slate-800">
                    {centerFormMode === "add" ? "إضافة مركز جديد للنظام الموحد" : `تعديل بيانات مركز: ${centerName}`}
                  </h3>
                  <button 
                    onClick={() => setShowCenterForm(false)}
                    className="p-1 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>

                {mgmtStatus && (
                  <div className={`p-3 rounded-lg border text-xs font-bold ${
                    mgmtStatus.type === "success" ? "bg-emerald-50 border-emerald-300 text-emerald-850" : "bg-rose-50 border-rose-300 text-rose-850"
                  }`}>
                    {mgmtStatus.msg}
                  </div>
                )}

                <form onSubmit={saveCenter} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">اسم المركز الصحي:</label>
                    <input
                      id="input-center-name"
                      type="text"
                      required
                      value={centerName}
                      onChange={(e) => setCenterName(e.target.value)}
                      placeholder="مثال: بابل، بابل الجديد"
                      className="w-full bg-white border border-slate-200 text-slate-950 text-sm font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">اسم مستخدم الدخول (اليوزر):</label>
                    <input
                      id="input-center-username"
                      type="text"
                      required
                      value={centerUser}
                      onChange={(e) => setCenterUser(e.target.value)}
                      placeholder="اليوزر (مثلاً: ل)"
                      className="w-full bg-white border border-slate-200 text-slate-950 text-sm font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">كلمة المرور (الباسوورد):</label>
                    <div className="flex gap-2">
                      <input
                        id="input-center-password"
                        type="text"
                        required
                        value={centerPass}
                        onChange={(e) => setCenterPass(e.target.value)}
                        placeholder="الباسورد"
                        className="w-full bg-white border border-slate-200 text-slate-950 text-sm font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <button
                        type="submit"
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-5 rounded-xl cursor-pointer"
                      >
                        حفظ
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Health centers database table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-150">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150">
                    <th className="py-4 px-4 font-bold text-xs text-slate-500 text-center w-20">كود التعريف</th>
                    <th className="py-4 px-4 font-bold text-sm text-slate-800">اسم المركز الصحي</th>
                    <th className="py-4 px-4 font-bold text-sm text-slate-800">اليوزر (Username)</th>
                    <th className="py-4 px-4 font-bold text-sm text-slate-800">الباسوورد (Password)</th>
                    <th className="py-4 px-4 font-bold text-sm text-slate-800 text-center w-36">الإجراءات والتحكم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {centers.map((center) => (
                    <tr key={center.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-xs text-slate-400 font-mono">
                        {center.id}
                      </td>
                      <td className="py-3 px-4 text-slate-900 font-extrabold text-sm">
                        {center.name}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-bold font-mono">
                        {center.username}
                      </td>
                      <td className="py-3 px-4 text-slate-705 font-bold font-mono">
                        {center.password}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => handleOpenEditCenter(center)}
                            className="p-2 bg-slate-100 hover:bg-teal-50 hover:text-teal-600 rounded-lg text-slate-650 transition-colors cursor-pointer"
                            title="تعديل بيانات الدخول"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteCenter(center.id)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="حذف هذا المركز بالكامل"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-950 leading-relaxed font-bold">
                تعديل رموز اليوزر أو الباسورد هنا سوف يتم تطبيقه في نفس اللحظة. يمكن للمركز التابع الدخول فورياً بالرمز الجديد.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
