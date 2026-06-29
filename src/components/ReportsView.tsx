import React, { useState, useEffect } from "react";
import { HealthCenter, SubmissionRecord, Section1Data, Section2Data, AGE_RANGES } from "../types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";

interface ReportsViewProps {
  centers: HealthCenter[];
}

const MONTH_NAMES = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];

export default function ReportsView({ centers }: ReportsViewProps) {
  const [selectedCenterId, setSelectedCenterId] = useState("all");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [allRecords, setAllRecords] = useState<SubmissionRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const YEARS = Array.from({ length: 8 }, (_, i) => 2026 - i);

  const fetchAllRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/records");
      const data = await res.json();
      setAllRecords(data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAllRecords(); }, []);

  // Filter records by year
  const yearRecords = allRecords.filter(r => r.year === selectedYear && (selectedCenterId === "all" || r.centerId === selectedCenterId));

  // Annual aggregated data
  const monthsWithData = new Set(yearRecords.map(r => r.month));
  const annualData = (() => {
    if (yearRecords.length === 0) return null;
    const s1: any = {};
    const s2: any = {};
    const keys1 = ["new_client", "secondary_client", "repeat_client", "get_method", "change_method", "followup", "maintenance", "remove_loop", "consultation", "nullipara", "single_child", "two_children", "three_children", "four_plus"];
    keys1.forEach(k => {
      s1[k] = {};
      AGE_RANGES.forEach(a => { s1[k][a] = 0; });
    });
    const s2keys = ["pills_mini", "pills_combined", "iud_loop", "condom", "injection_mini", "vaginal_cream", "others", "consultation_only"];
    s2keys.forEach(k => {
      s2[k] = {};
      AGE_RANGES.forEach(a => { s2[k][a] = { clients: 0, quantity: 0 }; });
    });
    yearRecords.forEach(r => {
      keys1.forEach(k => {
        AGE_RANGES.forEach(a => { s1[k][a] = (s1[k][a] || 0) + ((r.section1 as any)[k]?.[a] || 0); });
      });
      s2keys.forEach(k => {
        AGE_RANGES.forEach(a => {
          s2[k][a] = {
            clients: (s2[k][a]?.clients || 0) + ((r.section2 as any)[k]?.[a]?.clients || 0),
            quantity: (s2[k][a]?.quantity || 0) + ((r.section2 as any)[k]?.[a]?.quantity || 0),
          };
        });
      });
    });
    // Calculate totals
    const totalClients = AGE_RANGES.reduce((acc, a) => acc + (s1.new_client[a] || 0) + (s1.secondary_client[a] || 0) + (s1.repeat_client[a] || 0), 0);
    const totalConsult = AGE_RANGES.reduce((acc, a) => acc + (s1.consultation[a] || 0), 0);
    return { s1, s2, totalClients, totalConsult, monthsCount: monthsWithData.size };
  })();

  // Monthly trend data for charts
  const trendData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const recs = yearRecords.filter(r => r.month === month);
    const clients = recs.reduce((sum, r) => sum + AGE_RANGES.reduce((a2, a) => a2 + (r.section1.new_client[a] || 0) + (r.section1.secondary_client[a] || 0) + (r.section1.repeat_client[a] || 0), 0), 0);
    const consult = recs.reduce((sum, r) => sum + AGE_RANGES.reduce((a2, a) => a2 + (r.section1.consultation[a] || 0), 0), 0);
    const pillsMini = recs.reduce((sum, r) => sum + AGE_RANGES.reduce((a2, a) => a2 + (r.section2.pills_mini[a]?.clients || 0), 0), 0);
    const pillsCombined = recs.reduce((sum, r) => sum + AGE_RANGES.reduce((a2, a) => a2 + (r.section2.pills_combined[a]?.clients || 0), 0), 0);
    const iud = recs.reduce((sum, r) => sum + AGE_RANGES.reduce((a2, a) => a2 + (r.section2.iud_loop[a]?.clients || 0), 0), 0);
    return { name: MONTH_NAMES[i], clients, consult, "حبوب أحادية": pillsMini, "حبوب مركبة": pillsCombined, لولب: iud, hasData: recs.length > 0 };
  });

  // Comparison across years for a selected month
  const [compareMonth, setCompareMonth] = useState(new Date().getMonth() + 1);
  const comparisonYears = [selectedYear - 2, selectedYear - 1, selectedYear].filter(y => y >= 2019);
  const comparisonData = comparisonYears.map(year => {
    const recs = allRecords.filter(r => r.month === compareMonth && r.year === year && (selectedCenterId === "all" || r.centerId === selectedCenterId));
    const clients = recs.reduce((sum, r) => sum + AGE_RANGES.reduce((a2, a) => a2 + (r.section1.new_client[a] || 0) + (r.section1.secondary_client[a] || 0) + (r.section1.repeat_client[a] || 0), 0), 0);
    return { year, clients, records: recs.length };
  });

  return (
    <div className="space-y-6" style={{ direction: "rtl" }}>
      {/* Controls */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">المركز:</label>
          <select value={selectedCenterId} onChange={e => setSelectedCenterId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none">
            <option value="all">جميع المراكز</option>
            {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">السنة:</label>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={fetchAllRecords}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-5 py-2 rounded-xl text-sm cursor-pointer transition-all">
          تحديث
        </button>
      </div>

      {loading && <div className="text-center text-slate-500">جاري التحميل...</div>}

      {/* Annual Summary */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <h3 className="text-lg font-black text-slate-900 mb-4">التقرير السنوي — {selectedYear}</h3>
        {annualData ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-teal-50 rounded-2xl p-4 border border-teal-100">
              <p className="text-xs text-teal-700 font-bold">إجمالي المستفيدات</p>
              <p className="text-2xl font-black text-teal-800 mt-1">{annualData.totalClients.toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <p className="text-xs text-blue-700 font-bold">إجمالي المشورة</p>
              <p className="text-2xl font-black text-blue-800 mt-1">{annualData.totalConsult.toLocaleString()}</p>
            </div>
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <p className="text-xs text-amber-700 font-bold">الأشهر المرفوعة</p>
              <p className="text-2xl font-black text-amber-800 mt-1">{annualData.monthsCount} / 12</p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
              <p className="text-xs text-purple-700 font-bold">عدد السجلات</p>
              <p className="text-2xl font-black text-purple-800 mt-1">{yearRecords.length}</p>
            </div>
          </div>
        ) : (
          <p className="text-slate-500">لا توجد بيانات للسنة المحددة.</p>
        )}
      </div>

      {/* Charts */}
      {trendData.some(t => t.hasData) && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-4">الرسوم البيانية — {selectedYear}</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-2xl p-4">
              <h4 className="text-sm font-bold text-slate-700 mb-3">المستفيدات شهرياً</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={trendData.filter(t => t.hasData)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="clients" name="المستفيدات" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <h4 className="text-sm font-bold text-slate-700 mb-3">المشورة شهرياً</h4>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData.filter(t => t.hasData)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="consult" name="المشورة" stroke="#0891b2" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="clients" name="المستفيدات" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 lg:col-span-2">
              <h4 className="text-sm font-bold text-slate-700 mb-3">الوسائل الموزعة شهرياً</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={trendData.filter(t => t.hasData)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="حبوب أحادية" name="حبوب أحادية" fill="#0d9488" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="حبوب مركبة" name="حبوب مركبة" fill="#0891b2" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="لولب" name="لولب" fill="#7c3aed" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Month Comparison Across Years */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <h3 className="text-lg font-black text-slate-900 mb-4">مقارنة شهر عبر السنوات</h3>
        <div className="flex items-center gap-4 mb-4">
          <label className="text-xs font-bold text-slate-500">الشهر:</label>
          <select value={compareMonth} onChange={e => setCompareMonth(Number(e.target.value))}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none">
            {MONTH_NAMES.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-2 border border-slate-300">السنة</th>
                <th className="p-2 border border-slate-300">المستفيدات</th>
                <th className="p-2 border border-slate-300">عدد السجلات</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map(d => (
                <tr key={d.year} className="hover:bg-slate-50">
                  <td className="p-2 border border-slate-300 font-bold">{d.year}</td>
                  <td className="p-2 border border-slate-300">{d.clients.toLocaleString()}</td>
                  <td className="p-2 border border-slate-300">{d.records}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {comparisonData.every(d => d.records === 0) && (
          <p className="text-sm text-slate-500 mt-2">لا توجد بيانات للمقارنة.</p>
        )}
      </div>
    </div>
  );
}
