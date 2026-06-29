/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Section1Data, Section2Data, AgeRange, AGE_RANGES, MethodCell } from "../types";

interface FPReportFormProps {
  section1: Section1Data;
  section2: Section2Data;
  onChangeSection1?: (data: Section1Data) => void;
  onChangeSection2?: (data: Section2Data) => void;
  readOnly?: boolean;
  advisorName?: string;
  onChangeAdvisorName?: (val: string) => void;
  programManager?: string;
  onChangeProgramManager?: (val: string) => void;
  directorName?: string;
  onChangeDirectorName?: (val: string) => void;
  monthName: string;
  year: number;
  centerName: string;
  category?: "all" | "new" | "secondary" | "repeat";
}

// Arabic display names for age ranges
const AGE_LABELS: Record<AgeRange, string> = {
  under_20: "اقل من 20",
  age_20_24: "24-20",
  age_25_29: "29-25",
  age_30_34: "34-30",
  over_35: "فاكثر 35",
};

const CLIENT_ROW_CONFIG: Record<string, { label: string; english: string }> = {
  new_client: { label: "جديدة أول مرة", english: "new client" },
  secondary_client: { label: "جديدة بعد انقطاع", english: "secondry registered client" },
  repeat_client: { label: "مترددة", english: "-" },
};

export default function FPReportForm({
  section1,
  section2,
  onChangeSection1,
  onChangeSection2,
  readOnly = false,
  advisorName = "",
  onChangeAdvisorName,
  programManager = "",
  onChangeProgramManager,
  directorName = "بسام محمد ناصر",
  onChangeDirectorName,
  monthName,
  year,
  centerName,
  category = "all",
}: FPReportFormProps) {

  // Helper to handle Section 1 cell values
  const handleS1Change = (rowKey: keyof Section1Data, age: AgeRange, valueStr: string) => {
    if (readOnly || !onChangeSection1) return;
    const value = parseInt(valueStr.replace(/[^\d]/g, "")) || 0;
    
    const updated = {
      ...section1,
      [rowKey]: {
        ...section1[rowKey],
        [age]: value,
      },
    };
    onChangeSection1(updated);
  };

  // Helper to handle Section 2 cell values
  const handleS2Change = (rowKey: keyof Section2Data, age: AgeRange, field: keyof MethodCell, valueStr: string) => {
    if (readOnly || !onChangeSection2) return;
    const value = parseInt(valueStr.replace(/[^\d]/g, "")) || 0;

    const updated = {
      ...section2,
      [rowKey]: {
        ...section2[rowKey],
        [age]: {
          ...section2[rowKey][age],
          [field]: value,
        },
      },
    };
    onChangeSection2(updated);
  };

  // Section 1 auto-calculated totals
  const getS1RowTotal = (rowKey: keyof Section1Data) => {
    const row = section1[rowKey];
    return (row.under_20 || 0) + (row.age_20_24 || 0) + (row.age_25_29 || 0) + (row.age_30_34 || 0) + (row.over_35 || 0);
  };

  // Group sums for Section 1
  const getS1GroupTotal = (rows: Array<keyof Section1Data>, age: AgeRange) => {
    return rows.reduce((acc, rowKey) => acc + (section1[rowKey][age] || 0), 0);
  };

  const getS1GroupGrandTotal = (rows: Array<keyof Section1Data>) => {
    return AGE_RANGES.reduce((acc, age) => acc + getS1GroupTotal(rows, age), 0);
  };

  // Row lists for Section 1 groups
  const clientsRows: Array<keyof Section1Data> = ["new_client", "secondary_client", "repeat_client"];
  const servicesRows: Array<keyof Section1Data> = ["get_method", "change_method", "followup", "maintenance", "remove_loop"];
  const parityRows: Array<keyof Section1Data> = ["nullipara", "single_child", "two_children", "three_children", "four_plus"];
  const visibleClientsRows: Array<keyof Section1Data> = 
    category === "all" ? clientsRows 
    : category === "new" ? ["new_client"]
    : category === "secondary" ? ["secondary_client"]
    : ["repeat_client"];

  // Section 2 auto-calculated totals
  const getS2RowTotal = (rowKey: keyof Section2Data, field: keyof MethodCell) => {
    const row = section2[rowKey];
    return (row.under_20[field] || 0) + (row.age_20_24[field] || 0) + (row.age_25_29[field] || 0) + (row.age_30_34[field] || 0) + (row.over_35[field] || 0);
  };

  // Sum for total pills (mini pills + combined pills)
  const getPillsTotal = (age: AgeRange, field: keyof MethodCell) => {
    return (section2.pills_mini[age][field] || 0) + (section2.pills_combined[age][field] || 0);
  };

  const getPillsGrandTotal = (field: keyof MethodCell) => {
    return getS2RowTotal("pills_mini", field) + getS2RowTotal("pills_combined", field);
  };

  // Grand total for Section 2
  const getS2GrandTotal = (age: AgeRange, field: keyof MethodCell) => {
    const pills = getPillsTotal(age, field);
    const loop = section2.iud_loop[age][field] || 0;
    const condom = section2.condom[age][field] || 0;
    const injection = section2.injection_mini[age][field] || 0;
    const cream = section2.vaginal_cream[age][field] || 0;
    const others = section2.others[age][field] || 0;
    const consultation = section2.consultation_only[age][field] || 0;
    return pills + loop + condom + injection + cream + others + consultation;
  };

  const getS2OverallGrandTotal = (field: keyof MethodCell) => {
    return AGE_RANGES.reduce((acc, age) => acc + getS2GrandTotal(age, field), 0);
  };

  // Core Audit Computations
  const getAgeClients = (age: AgeRange) => {
    return (section1.new_client[age] || 0) + (section1.secondary_client[age] || 0) + (section1.repeat_client[age] || 0);
  };

  const getAgeParity = (age: AgeRange) => {
    return (section1.nullipara[age] || 0) + (section1.single_child[age] || 0) + (section1.two_children[age] || 0) + (section1.three_children[age] || 0) + (section1.four_plus[age] || 0);
  };

  const getAgeContraceptivesS1 = (age: AgeRange) => {
    return (section1.get_method[age] || 0) + (section1.change_method[age] || 0);
  };

  const getAgeContraceptivesS2 = (age: AgeRange) => {
    return (section2.pills_mini[age]?.clients || 0) + 
           (section2.pills_combined[age]?.clients || 0) + 
           (section2.iud_loop[age]?.clients || 0) + 
           (section2.condom[age]?.clients || 0) + 
           (section2.injection_mini[age]?.clients || 0) + 
           (section2.vaginal_cream[age]?.clients || 0) + 
           (section2.others[age]?.clients || 0);
  };

  const getAgeConsultationS1 = (age: AgeRange) => {
    return (section1.consultation[age] || 0);
  };

  // Build mismatches array
  const auditMismatches = AGE_RANGES.map((age) => {
    const clients = getAgeClients(age);
    const parity = getAgeParity(age);
    const s1Contra = getAgeContraceptivesS1(age);
    const s2Contra = getAgeContraceptivesS2(age);
    const s1Consult = getAgeConsultationS1(age);

    return {
      age,
      label: AGE_LABELS[age],
      clients,
      parity,
      s1Contra,
      s2Contra,
      s1Consult,
      parityMismatch: clients !== parity,
      contraMismatch: s1Contra !== s2Contra,
      consultMismatch: s1Consult !== clients,
    };
  });

  return (
    <div className="w-full font-sans text-slate-900 leading-normal select-none" style={{ direction: "rtl" }}>
      
      {/* Official Sheet Header replica */}
      <div className="border border-slate-700 p-4 bg-white space-y-4 mb-4">
        {/* Top bar */}
        <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-right gap-3 border-b border-dashed border-slate-300 pb-3">
          <div className="text-sm font-bold space-y-1">
            <p>دائرة صحة بابل</p>
            <p>قطاع الحلة الثاني</p>
            <p className="flex items-center justify-center md:justify-start gap-1">
              <span>اسم المركز الصحي / </span>
              <span className="text-teal-700 border-b border-teal-600 px-3 py-0.5 font-extrabold bg-teal-50/50 rounded-md">
                {centerName}
              </span>
            </p>
          </div>
          
          <div className="text-center">
            <h1 className="text-2xl font-black text-slate-905 tracking-tight">احصائية التنزيل اليومي الشهرية</h1>
            <h2 className="text-base font-bold text-slate-700 mt-1">استمارة تنظيم الاسرة لسنة 2026</h2>
          </div>

          <div className="text-sm font-bold text-center md:text-left space-y-1">
            <p>سنة {year}</p>
            <p className="flex items-center justify-center md:justify-end gap-1">
              <span>الشهر:</span>
              <span className="text-teal-700 bg-teal-50 px-2 py-0.5 border border-teal-100 rounded-md">{monthName}</span>
            </p>
          </div>
        </div>
      </div>

      {/* TABLE 1: المستفيدات */}
      <div className="overflow-x-auto border border-b-0 border-slate-700 bg-white mb-6 shadow-sm">
        <table className="w-full text-center border-collapse text-xs min-w-[700px] table-fixed">
          <colgroup>
            <col style={{width:'112px'}} />
            <col style={{width:'155px'}} />
            <col />
            <col />
            <col />
            <col />
            <col />
            <col style={{width:'200px'}} />
          </colgroup>
          <thead>
            {/* Orange Sector Title Banner */}
            <tr className="bg-gradient-to-l from-amber-500 to-orange-500 text-white">
              <th colSpan={8} className="py-2.5 px-3 font-extrabold text-base tracking-wide shadow-inner text-center">
                المستفيدات
              </th>
            </tr>
            {/* Real column headers */}
            <tr className="bg-slate-100 border-b border-slate-700 font-bold text-slate-800">
              <th className="py-2.5 px-2 border-l border-slate-700 text-center w-[112px] text-[11px]">العنوان</th>
              <th className="py-2.5 px-2 border-l border-slate-700 text-center w-[96px] font-mono text-slate-500 text-[10px]">Indicator</th>
              {AGE_RANGES.map((age) => {
                const matchObj = auditMismatches.find((m) => m.age === age);
                const isErr = matchObj ? (matchObj.parityMismatch || matchObj.contraMismatch || matchObj.consultMismatch) : false;
                return (
                  <th
                    key={age}
                    className={`py-2.5 px-2 border-l border-slate-700 text-center w-16 transition-all ${
                      isErr ? "bg-amber-100/90 text-amber-900 border-b-[3px] border-b-amber-500 font-extrabold" : ""
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <span>{AGE_LABELS[age]}</span>
                      {isErr && <span className="text-[8px] text-amber-600 block leading-tight font-sans">⚠️ خلل رقمي</span>}
                    </div>
                  </th>
                );
              })}
              <th className="py-2.5 px-2 text-center font-extrabold w-28 min-w-[100px] bg-slate-200">المجموع</th>
            </tr>
          </thead>
          <tbody>
            {/* Part A: نوع المستفيدة — dynamic rows based on category */}
            {visibleClientsRows.map((rowKey) => {
              const cfg = CLIENT_ROW_CONFIG[rowKey];
              return (
                <tr key={rowKey} className="border-b border-slate-700 hover:bg-slate-50/40">
                  <td className="py-1.5 px-2 border-l border-slate-700 text-right font-medium">{cfg?.label || rowKey}</td>
                  <td className="py-1.5 px-2 border-l border-slate-700 font-mono text-slate-500 text-[10px]/tight text-center">{cfg?.english || ""}</td>
                  {AGE_RANGES.map((age) => (
                    <td key={age} className="py-1 px-1 border-l border-slate-700">
                      <FormInput
                        value={section1[rowKey][age]}
                        onChange={(val) => handleS1Change(rowKey, age, val)}
                        readOnly={readOnly}
                      />
                    </td>
                  ))}
                  <td className="py-1.5 px-2 font-bold bg-slate-100 text-slate-800 font-mono">{getS1RowTotal(rowKey)}</td>
                </tr>
              );
            })}

            {/* Total Row A */}
            <tr className="border-b border-slate-700 bg-slate-200/65 font-bold">
              <td className="py-2 px-2 border-l border-slate-700 text-right font-black">
                {category === "all" ? "المجموع" : `مجموع ${CLIENT_ROW_CONFIG[visibleClientsRows[0]]?.label || ""}`}
              </td>
              <td className="py-2 px-2 border-l border-slate-700 font-mono text-center">total</td>
              {AGE_RANGES.map((age) => (
                <td key={age} className="py-2 px-1 border-l border-slate-700 font-black font-mono">
                  {getS1GroupTotal(visibleClientsRows, age)}
                </td>
              ))}
              <td className="py-2 px-2 font-black bg-slate-300 font-mono">{getS1GroupGrandTotal(visibleClientsRows)}</td>
            </tr>


            {/* Part B: الحصول على وسيلة */}
            {/* Row 4 */}
            <tr className="border-b border-slate-700 hover:bg-slate-50/40">
              <td className="py-1.5 px-2 border-l border-slate-700 text-right font-medium">الحصول على وسيلة</td>
              <td className="py-1.5 px-2 border-l border-slate-700 font-mono text-slate-500 text-[10px]/tight text-center">get a method</td>
              {AGE_RANGES.map((age) => (
                <td key={age} className="py-1 px-1 border-l border-slate-700">
                  <FormInput
                    value={section1.get_method[age]}
                    onChange={(val) => handleS1Change("get_method", age, val)}
                    readOnly={readOnly}
                  />
                </td>
              ))}
              <td className="py-1.5 px-2 font-bold bg-slate-100 text-slate-800 font-mono">{getS1RowTotal("get_method")}</td>
            </tr>

            {/* Row 5 */}
            <tr className="border-b border-slate-700 hover:bg-slate-50/40">
              <td className="py-1.5 px-2 border-l border-slate-700 text-right font-medium">تغيير الوسيلة</td>
              <td className="py-1.5 px-2 border-l border-slate-700 font-mono text-slate-500 text-[10px]/tight text-center">change method</td>
              {AGE_RANGES.map((age) => (
                <td key={age} className="py-1 px-1 border-l border-slate-700">
                  <FormInput
                    value={section1.change_method[age]}
                    onChange={(val) => handleS1Change("change_method", age, val)}
                    readOnly={readOnly}
                  />
                </td>
              ))}
              <td className="py-1.5 px-2 font-bold bg-slate-100 text-slate-800 font-mono">{getS1RowTotal("change_method")}</td>
            </tr>

            {/* Row 6 */}
            <tr className="border-b border-slate-700 hover:bg-slate-50/40">
              <td className="py-1.5 px-2 border-l border-slate-700 text-right font-medium">مضاعفات طبية</td>
              <td className="py-1.5 px-2 border-l border-slate-700 font-mono text-slate-500 text-[10px]/tight text-center font-bold">followup</td>
              {AGE_RANGES.map((age) => (
                <td key={age} className="py-1 px-1 border-l border-slate-700">
                  <FormInput
                    value={section1.followup[age]}
                    onChange={(val) => handleS1Change("followup", age, val)}
                    readOnly={readOnly}
                  />
                </td>
              ))}
              <td className="py-1.5 px-2 font-bold bg-slate-100 text-slate-800 font-mono">{getS1RowTotal("followup")}</td>
            </tr>

            {/* Row 7 */}
            <tr className="border-b border-slate-700 hover:bg-slate-50/40">
              <td className="py-1.5 px-2 border-l border-slate-700 text-right font-medium">متابعة الوسيلة</td>
              <td className="py-1.5 px-2 border-l border-slate-700 font-mono text-slate-500 text-[10px]/tight text-center">health complications</td>
              {AGE_RANGES.map((age) => (
                <td key={age} className="py-1 px-1 border-l border-slate-700">
                  <FormInput
                    value={section1.maintenance[age]}
                    onChange={(val) => handleS1Change("maintenance", age, val)}
                    readOnly={readOnly}
                  />
                </td>
              ))}
              <td className="py-1.5 px-2 font-bold bg-slate-100 text-slate-800 font-mono">{getS1RowTotal("maintenance")}</td>
            </tr>

            {/* Row 8 */}
            <tr className="border-b border-slate-700 hover:bg-slate-50/40">
              <td className="py-1.5 px-2 border-l border-slate-700 text-right font-medium">رفع لولب</td>
              <td className="py-1.5 px-2 border-l border-slate-700 font-mono text-slate-500 text-[10px]/tight text-center">removal of a loop</td>
              {AGE_RANGES.map((age) => (
                <td key={age} className="py-1 px-1 border-l border-slate-700">
                  <FormInput
                    value={section1.remove_loop[age]}
                    onChange={(val) => handleS1Change("remove_loop", age, val)}
                    readOnly={readOnly}
                  />
                </td>
              ))}
              <td className="py-1.5 px-2 font-bold bg-slate-100 text-slate-800 font-mono">{getS1RowTotal("remove_loop")}</td>
            </tr>

            {/* Total Row B */}
            <tr className="border-b border-slate-700 bg-slate-200/65 font-bold">
              <td className="py-2 px-2 border-l border-slate-700 text-right font-black">المجموع</td>
              <td className="py-2 px-2 border-l border-slate-700 font-mono text-center">total</td>
              {AGE_RANGES.map((age) => (
                <td key={age} className="py-2 px-1 border-l border-slate-700 font-black font-mono">
                  {getS1GroupTotal(servicesRows, age)}
                </td>
              ))}
              <td className="py-2 px-2 font-black bg-slate-300 font-mono">{getS1GroupGrandTotal(servicesRows)}</td>
            </tr>

            {/* Consultation Row */}
            <tr className="border-b border-slate-700 hover:bg-slate-50/40">
              <td className="py-1.5 px-2 border-l border-slate-700 text-right font-bold text-teal-800 bg-teal-50/25">المشورة</td>
              <td className="py-1.5 px-2 border-l border-slate-700 font-mono text-slate-500 text-[10px]/tight text-center bg-teal-50/15">consultation</td>
              {AGE_RANGES.map((age) => (
                <td key={age} className="py-1 px-1 border-l border-slate-700">
                  <FormInput
                    value={section1.consultation[age]}
                    onChange={(val) => handleS1Change("consultation", age, val)}
                    readOnly={readOnly}
                  />
                </td>
              ))}
              <td className="py-1.5 px-2 font-bold bg-slate-100 text-slate-800 font-mono">{getS1RowTotal("consultation")}</td>
            </tr>


            {/* Part C: الولادات / عدد الاطفال */}
            {/* Row 9 */}
            <tr className="border-b border-slate-700 hover:bg-slate-50/40">
              <td className="py-1.5 px-2 border-l border-slate-700 text-right font-medium">لا يوجد طفل</td>
              <td className="py-1.5 px-2 border-l border-slate-700 font-mono text-slate-500 text-[10px]/tight text-center">nullipara</td>
              {AGE_RANGES.map((age) => (
                <td key={age} className="py-1 px-1 border-l border-slate-700">
                  <FormInput
                    value={section1.nullipara[age]}
                    onChange={(val) => handleS1Change("nullipara", age, val)}
                    readOnly={readOnly}
                  />
                </td>
              ))}
              <td className="py-1.5 px-2 font-bold bg-slate-100 text-slate-800 font-mono">{getS1RowTotal("nullipara")}</td>
            </tr>

            {/* Row 10 */}
            <tr className="border-b border-slate-700 hover:bg-slate-50/40">
              <td className="py-1.5 px-2 border-l border-slate-700 text-right font-medium">طفل واحد</td>
              <td className="py-1.5 px-2 border-l border-slate-700 font-mono text-slate-500 text-[10px]/tight text-center">single baby</td>
              {AGE_RANGES.map((age) => (
                <td key={age} className="py-1 px-1 border-l border-slate-700">
                  <FormInput
                    value={section1.single_child[age]}
                    onChange={(val) => handleS1Change("single_child", age, val)}
                    readOnly={readOnly}
                  />
                </td>
              ))}
              <td className="py-1.5 px-2 font-bold bg-slate-100 text-slate-800 font-mono">{getS1RowTotal("single_child")}</td>
            </tr>

            {/* Row 11 */}
            <tr className="border-b border-slate-700 hover:bg-slate-50/40">
              <td className="py-1.5 px-2 border-l border-slate-700 text-right font-medium">طفلين</td>
              <td className="py-1.5 px-2 border-l border-slate-700 font-mono text-slate-500 text-[10px]/tight text-center">tow babies</td>
              {AGE_RANGES.map((age) => (
                <td key={age} className="py-1 px-1 border-l border-slate-700">
                  <FormInput
                    value={section1.two_children[age]}
                    onChange={(val) => handleS1Change("two_children", age, val)}
                    readOnly={readOnly}
                  />
                </td>
              ))}
              <td className="py-1.5 px-2 font-bold bg-slate-100 text-slate-800 font-mono">{getS1RowTotal("two_children")}</td>
            </tr>

            {/* Row 12 */}
            <tr className="border-b border-slate-700 hover:bg-slate-50/40">
              <td className="py-1.5 px-2 border-l border-slate-700 text-right font-medium">ثلاثة اطفال</td>
              <td className="py-1.5 px-2 border-l border-slate-700 font-mono text-slate-500 text-[10px]/tight text-center">three babies</td>
              {AGE_RANGES.map((age) => (
                <td key={age} className="py-1 px-1 border-l border-slate-700">
                  <FormInput
                    value={section1.three_children[age]}
                    onChange={(val) => handleS1Change("three_children", age, val)}
                    readOnly={readOnly}
                  />
                </td>
              ))}
              <td className="py-1.5 px-2 font-bold bg-slate-100 text-slate-800 font-mono">{getS1RowTotal("three_children")}</td>
            </tr>

            {/* Row 13 */}
            <tr className="border-b border-slate-700 hover:bg-slate-50/40">
              <td className="py-1.5 px-2 border-l border-slate-700 text-right font-medium">أربعة فأكثر</td>
              <td className="py-1.5 px-2 border-l border-slate-700 font-mono text-slate-500 text-[10px]/tight text-center">four babies and more</td>
              {AGE_RANGES.map((age) => (
                <td key={age} className="py-1 px-1 border-l border-slate-700">
                  <FormInput
                    value={section1.four_plus[age]}
                    onChange={(val) => handleS1Change("four_plus", age, val)}
                    readOnly={readOnly}
                  />
                </td>
              ))}
              <td className="py-1.5 px-2 font-bold bg-slate-100 text-slate-800 font-mono">{getS1RowTotal("four_plus")}</td>
            </tr>

            {/* Total Row D */}
            <tr className="bg-slate-200/85 font-bold">
              <td className="py-2.5 px-2 border-l border-slate-700 text-right font-black">المجموع</td>
              <td className="py-2.5 px-2 border-l border-slate-700 font-mono text-center">total</td>
              {AGE_RANGES.map((age) => (
                <td key={age} className="py-2.5 px-1 border-l border-slate-700 font-black font-mono">
                  {getS1GroupTotal(parityRows, age)}
                </td>
              ))}
              <td className="py-2.5 px-2 font-black bg-slate-300 font-mono">{getS1GroupGrandTotal(parityRows)}</td>
            </tr>
          </tbody>
        </table>
      </div>


      {/* TABLE 2: الوسائل والكميات الموزعة */}
      <div className="overflow-x-auto border border-b-0 border-slate-700 bg-white shadow-sm mb-6">
        <table className="w-full text-center border-collapse text-[11px] min-w-[900px] table-fixed">
          <colgroup>
            <col style={{width:'95px'}} />
            <col style={{width:'110px'}} />
            <col style={{width:'48px'}} />
            <col style={{width:'48px'}} />
            <col style={{width:'48px'}} />
            <col style={{width:'48px'}} />
            <col style={{width:'48px'}} />
            <col style={{width:'48px'}} />
            <col style={{width:'48px'}} />
            <col style={{width:'48px'}} />
            <col style={{width:'48px'}} />
            <col style={{width:'48px'}} />
            <col style={{width:'80px'}} />
            <col style={{width:'80px'}} />
          </colgroup>
          <thead>
            {/* Dark banner for materials */}
            <tr className="bg-gradient-to-l from-slate-700 to-slate-800 text-white">
              <th colSpan={14} className="py-2.5 px-3 font-extrabold text-sm tracking-wide shadow-inner text-center">
                الوسائل والكميات الموزعة والمستفيدات لكل وسيلة
              </th>
            </tr>
            {/* Header Row 1: Age Groups */}
            <tr className="bg-slate-100 border-b border-slate-700 font-bold text-slate-800">
              <th rowSpan={2} className="py-3 px-2 border-l border-slate-700 text-center w-[170px] text-xs">الوسائل</th>
              <th rowSpan={2} className="py-3 px-2 border-l border-slate-700 text-center w-[130px] font-mono text-slate-500 text-[10px]">Methods</th>
              {AGE_RANGES.map((age) => {
                const matchObj = auditMismatches.find((m) => m.age === age);
                const isErr = matchObj ? (matchObj.parityMismatch || matchObj.contraMismatch || matchObj.consultMismatch) : false;
                return (
                  <th
                    key={age}
                    colSpan={2}
                    className={`py-1.5 px-2 border-l border-slate-700 text-center border-b transition-all ${
                      isErr ? "bg-amber-100/90 text-amber-900 font-extrabold border-b-2 border-b-amber-500" : "bg-slate-50/70"
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <span>{AGE_LABELS[age]}</span>
                      {isErr && <span className="text-[8px] text-amber-600 block leading-tight font-sans">⚠️ تدقيق</span>}
                    </div>
                  </th>
                );
              })}
              <th colSpan={2} className="py-1.5 px-2 text-center bg-slate-250 font-black">المجموع الكلي</th>
            </tr>
            {/* Header Row 2: Sub-columns */}
            <tr className="bg-slate-200/40 border-b border-slate-700 font-semibold text-slate-600">
              {/* Columns for Ages */}
              {AGE_RANGES.map((age) => (
                <React.Fragment key={`${age}-sub`}>
                  <th className="py-1 px-1 border-l border-slate-700 text-center w-12 text-[10px]">المستفيدات</th>
                  <th className="py-1 px-1 border-l border-slate-700 text-center w-12 text-[10px] bg-slate-50/50">الكمية</th>
                </React.Fragment>
              ))}
              {/* Columns for Totals */}
              <th className="py-1 px-2 border-l border-slate-700 text-center w-20 font-bold bg-slate-200 text-slate-850">مجموع المستفيدات</th>
              <th className="py-1 px-2 text-center w-20 font-bold bg-slate-300 text-slate-900">مجموع المصروف</th>
            </tr>
          </thead>
          <tbody>
            
            {/* Row 1: حبوب احادية */}
            <tr className="border-b border-slate-700 hover:bg-slate-50/40">
              <td className="py-1 px-2 border-l border-slate-700 text-right font-bold text-slate-740 text-xs">حبوب أحادية</td>
              <td className="py-1 px-2 border-l border-slate-700 font-mono text-slate-500 text-[10px]/tight text-center">mini pills</td>
              {AGE_RANGES.map((age) => (
                <React.Fragment key={`${age}-pills-mini`}>
                  <td className="py-1 px-0.5 border-l border-slate-700">
                    <FormInput
                      value={section2.pills_mini[age].clients}
                      onChange={(val) => handleS2Change("pills_mini", age, "clients", val)}
                      readOnly={readOnly}
                    />
                  </td>
                  <td className="py-1 px-0.5 border-l border-slate-700 bg-slate-50/15">
                    <FormInput
                      value={section2.pills_mini[age].quantity}
                      onChange={(val) => handleS2Change("pills_mini", age, "quantity", val)}
                      readOnly={readOnly}
                    />
                  </td>
                </React.Fragment>
              ))}
              <td className="py-1 px-1 border-l border-slate-700 font-bold bg-slate-100 font-mono text-center">
                {getS2RowTotal("pills_mini", "clients")}
              </td>
              <td className="py-1 px-1 font-bold bg-slate-200 font-mono text-center">
                {getS2RowTotal("pills_mini", "quantity")}
              </td>
            </tr>

            {/* Row 2: حبوب مركبة */}
            <tr className="border-b border-slate-700 hover:bg-slate-50/40">
              <td className="py-1 px-2 border-l border-slate-700 text-right font-bold text-slate-740 text-xs">حبوب مركبة</td>
              <td className="py-1 px-2 border-l border-slate-700 font-mono text-slate-500 text-[10px]/tight text-center">combined pills</td>
              {AGE_RANGES.map((age) => (
                <React.Fragment key={`${age}-pills-comb`}>
                  <td className="py-1 px-0.5 border-l border-slate-700">
                    <FormInput
                      value={section2.pills_combined[age].clients}
                      onChange={(val) => handleS2Change("pills_combined", age, "clients", val)}
                      readOnly={readOnly}
                    />
                  </td>
                  <td className="py-1 px-0.5 border-l border-slate-700 bg-slate-50/15">
                    <FormInput
                      value={section2.pills_combined[age].quantity}
                      onChange={(val) => handleS2Change("pills_combined", age, "quantity", val)}
                      readOnly={readOnly}
                    />
                  </td>
                </React.Fragment>
              ))}
              <td className="py-1 px-1 border-l border-slate-700 font-bold bg-slate-100 font-mono text-center">
                {getS2RowTotal("pills_combined", "clients")}
              </td>
              <td className="py-1 px-1 font-bold bg-slate-200 font-mono text-center">
                {getS2RowTotal("pills_combined", "quantity")}
              </td>
            </tr>

            {/* Sum Row: مجموع الحبوب */}
            <tr className="border-b border-slate-700 bg-slate-100 font-bold">
              <td className="py-1.5 px-2 border-l border-slate-700 text-right text-teal-800 text-xs font-black">مجموع الحبوب</td>
              <td className="py-1.5 px-2 border-l border-slate-700 font-mono text-teal-600 text-[10px]/tight text-center font-semibold">pills total</td>
              {AGE_RANGES.map((age) => (
                <React.Fragment key={`${age}-pills-sum`}>
                  <td className="py-1.5 px-1 border-l border-slate-700 font-mono text-slate-800 text-center text-[10px]">
                    {getPillsTotal(age, "clients")}
                  </td>
                  <td className="py-1.5 px-1 border-l border-slate-700 font-mono text-slate-800 text-center text-[10px] bg-slate-200/30">
                    {getPillsTotal(age, "quantity")}
                  </td>
                </React.Fragment>
              ))}
              <td className="py-1.5 px-1 border-l border-slate-700 font-extrabold bg-slate-200 font-mono text-center">
                {getPillsGrandTotal("clients")}
              </td>
              <td className="py-1.5 px-1 font-extrabold bg-slate-300 font-mono text-center">
                {getPillsGrandTotal("quantity")}
              </td>
            </tr>

            {/* Row 3: لولب */}
            <tr className="border-b border-slate-700 hover:bg-slate-50/40">
              <td className="py-1 px-2 border-l border-slate-700 text-right font-bold text-slate-740 text-xs">لولب</td>
              <td className="py-1 px-2 border-l border-slate-700 font-mono text-slate-500 text-[10px]/tight text-center">loop</td>
              {AGE_RANGES.map((age) => (
                <React.Fragment key={`${age}-loop`}>
                  <td className="py-1 px-0.5 border-l border-slate-700">
                    <FormInput
                      value={section2.iud_loop[age].clients}
                      onChange={(val) => handleS2Change("iud_loop", age, "clients", val)}
                      readOnly={readOnly}
                    />
                  </td>
                  <td className="py-1 px-0.5 border-l border-slate-700 bg-slate-50/15">
                    <FormInput
                      value={section2.iud_loop[age].quantity}
                      onChange={(val) => handleS2Change("iud_loop", age, "quantity", val)}
                      readOnly={readOnly}
                    />
                  </td>
                </React.Fragment>
              ))}
              <td className="py-1 px-1 border-l border-slate-700 font-bold bg-slate-100 font-mono text-center">
                {getS2RowTotal("iud_loop", "clients")}
              </td>
              <td className="py-1 px-1 font-bold bg-slate-200 font-mono text-center">
                {getS2RowTotal("iud_loop", "quantity")}
              </td>
            </tr>

            {/* Row 4: واقي */}
            <tr className="border-b border-slate-700 hover:bg-slate-50/40">
              <td className="py-1 px-2 border-l border-slate-700 text-right font-bold text-slate-740 text-xs">واقي</td>
              <td className="py-1 px-2 border-l border-slate-700 font-mono text-slate-500 text-[10px]/tight text-center">condom</td>
              {AGE_RANGES.map((age) => (
                <React.Fragment key={`${age}-condom`}>
                  <td className="py-1 px-0.5 border-l border-slate-700">
                    <FormInput
                      value={section2.condom[age].clients}
                      onChange={(val) => handleS2Change("condom", age, "clients", val)}
                      readOnly={readOnly}
                    />
                  </td>
                  <td className="py-1 px-0.5 border-l border-slate-700 bg-slate-50/15">
                    <FormInput
                      value={section2.condom[age].quantity}
                      onChange={(val) => handleS2Change("condom", age, "quantity", val)}
                      readOnly={readOnly}
                    />
                  </td>
                </React.Fragment>
              ))}
              <td className="py-1 px-1 border-l border-slate-700 font-bold bg-slate-100 font-mono text-center">
                {getS2RowTotal("condom", "clients")}
              </td>
              <td className="py-1 px-1 font-bold bg-slate-200 font-mono text-center">
                {getS2RowTotal("condom", "quantity")}
              </td>
            </tr>

            {/* Row 5: حقن احادية */}
            <tr className="border-b border-slate-700 hover:bg-slate-50/40">
              <td className="py-1 px-2 border-l border-slate-700 text-right font-bold text-slate-740 text-xs">حقن احادية</td>
              <td className="py-1 px-2 border-l border-slate-700 font-mono text-slate-500 text-[10px]/tight text-center">mini injections</td>
              {AGE_RANGES.map((age) => (
                <React.Fragment key={`${age}-injection`}>
                  <td className="py-1 px-0.5 border-l border-slate-700">
                    <FormInput
                      value={section2.injection_mini[age].clients}
                      onChange={(val) => handleS2Change("injection_mini", age, "clients", val)}
                      readOnly={readOnly}
                    />
                  </td>
                  <td className="py-1 px-0.5 border-l border-slate-700 bg-slate-50/15">
                    <FormInput
                      value={section2.injection_mini[age].quantity}
                      onChange={(val) => handleS2Change("injection_mini", age, "quantity", val)}
                      readOnly={readOnly}
                    />
                  </td>
                </React.Fragment>
              ))}
              <td className="py-1 px-1 border-l border-slate-700 font-bold bg-slate-100 font-mono text-center">
                {getS2RowTotal("injection_mini", "clients")}
              </td>
              <td className="py-1 px-1 font-bold bg-slate-200 font-mono text-center">
                {getS2RowTotal("injection_mini", "quantity")}
              </td>
            </tr>

            {/* Row 6: كريم مهبلي */}
            <tr className="border-b border-slate-700 hover:bg-slate-50/40">
              <td className="py-1 px-2 border-l border-slate-700 text-right font-bold text-slate-740 text-xs">كريم مهبلي</td>
              <td className="py-1 px-2 border-l border-slate-700 font-mono text-slate-500 text-[10px]/tight text-center">vaginal cream</td>
              {AGE_RANGES.map((age) => (
                <React.Fragment key={`${age}-cream`}>
                  <td className="py-1 px-0.5 border-l border-slate-700">
                    <FormInput
                      value={section2.vaginal_cream[age].clients}
                      onChange={(val) => handleS2Change("vaginal_cream", age, "clients", val)}
                      readOnly={readOnly}
                    />
                  </td>
                  <td className="py-1 px-0.5 border-l border-slate-700 bg-slate-50/15">
                    <FormInput
                      value={section2.vaginal_cream[age].quantity}
                      onChange={(val) => handleS2Change("vaginal_cream", age, "quantity", val)}
                      readOnly={readOnly}
                    />
                  </td>
                </React.Fragment>
              ))}
              <td className="py-1 px-1 border-l border-slate-700 font-bold bg-slate-100 font-mono text-center">
                {getS2RowTotal("vaginal_cream", "clients")}
              </td>
              <td className="py-1 px-1 font-bold bg-slate-200 font-mono text-center">
                {getS2RowTotal("vaginal_cream", "quantity")}
              </td>
            </tr>

            {/* Row 7: اخرى */}
            <tr className="border-b border-slate-700 hover:bg-slate-50/40">
              <td className="py-1 px-2 border-l border-slate-700 text-right font-bold text-slate-740 text-xs">أخرى</td>
              <td className="py-1 px-2 border-l border-slate-700 font-mono text-slate-500 text-[10px]/tight text-center">others</td>
              {AGE_RANGES.map((age) => (
                <React.Fragment key={`${age}-others`}>
                  <td className="py-1 px-0.5 border-l border-slate-700">
                    <FormInput
                      value={section2.others[age].clients}
                      onChange={(val) => handleS2Change("others", age, "clients", val)}
                      readOnly={readOnly}
                    />
                  </td>
                  <td className="py-1 px-0.5 border-l border-slate-700 bg-slate-50/15">
                    <FormInput
                      value={section2.others[age].quantity}
                      onChange={(val) => handleS2Change("others", age, "quantity", val)}
                      readOnly={readOnly}
                    />
                  </td>
                </React.Fragment>
              ))}
              <td className="py-1 px-1 border-l border-slate-700 font-bold bg-slate-100 font-mono text-center">
                {getS2RowTotal("others", "clients")}
              </td>
              <td className="py-1 px-1 font-bold bg-slate-200 font-mono text-center">
                {getS2RowTotal("others", "quantity")}
              </td>
            </tr>

            {/* Row 8: مشورة فقط */}
            <tr className="border-b border-slate-700 hover:bg-slate-50/40">
              <td className="py-1 px-2 border-l border-slate-700 text-right font-bold text-teal-800 text-xs bg-teal-50/20">مشورة فقط</td>
              <td className="py-1 px-2 border-l border-slate-700 font-mono text-teal-600 text-[10px]/tight text-center bg-teal-50/15">consultation only</td>
              {AGE_RANGES.map((age) => (
                <React.Fragment key={`${age}-consult`}>
                  <td className="py-1 px-0.5 border-l border-slate-700">
                    <FormInput
                      value={section2.consultation_only[age].clients}
                      onChange={(val) => handleS2Change("consultation_only", age, "clients", val)}
                      readOnly={readOnly}
                    />
                  </td>
                  <td className="py-1 px-0.5 border-l border-slate-700 bg-slate-50/15">
                    <FormInput
                      value={section2.consultation_only[age].quantity}
                      onChange={(val) => handleS2Change("consultation_only", age, "quantity", val)}
                      readOnly={readOnly}
                    />
                  </td>
                </React.Fragment>
              ))}
              <td className="py-1 px-1 border-l border-slate-700 font-bold bg-slate-100 font-mono text-center">
                {getS2RowTotal("consultation_only", "clients")}
              </td>
              <td className="py-1 px-1 font-bold bg-slate-200 font-mono text-center">
                {getS2RowTotal("consultation_only", "quantity")}
              </td>
            </tr>

            {/* GRAND TOTAL: المجموع */}
            <tr className="bg-slate-350/90 font-bold bg-slate-200">
              <td className="py-2.5 px-2 border-l border-slate-700 text-right text-xs font-black">المجموع الكلي</td>
              <td className="py-2.5 px-2 border-l border-slate-700 font-mono text-slate-600 text-[10px]/tight text-center font-black">Grand Total</td>
              {AGE_RANGES.map((age) => (
                <React.Fragment key={`${age}-grand-total`}>
                  <td className="py-2.5 px-1 border-l border-slate-700 font-black font-mono text-slate-900 text-center">
                    {getS2GrandTotal(age, "clients")}
                  </td>
                  <td className="py-2.5 px-1 border-l border-slate-700 font-black font-mono text-slate-950 text-center bg-slate-300/40">
                    {getS2GrandTotal(age, "quantity")}
                  </td>
                </React.Fragment>
              ))}
              <td className="py-2.5 px-1 border-l border-slate-700 font-black font-mono text-center bg-slate-300 text-slate-950">
                {getS2OverallGrandTotal("clients")}
              </td>
              <td className="py-2.5 px-1 font-black font-mono text-center bg-teal-600 text-white shadow-md">
                {getS2OverallGrandTotal("quantity")}
              </td>
            </tr>

          </tbody>
        </table>
      </div>

      {/* Official Bottom Signatures grid */}
      <div className="border border-slate-700 bg-white p-5 mt-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-bold no-print-flex">
        <div className="flex flex-col items-center justify-end text-center space-y-2">
          <p className="text-slate-550">مسؤول البرنامج</p>
          {readOnly ? (
            <p className="border-b border-dashed border-slate-400 px-6 py-1 font-extrabold text-slate-800 text-sm h-7">
              {programManager || "..........................."}
            </p>
          ) : (
            <input
              id="program-manager"
              type="text"
              placeholder="اكتب اسم مسؤول البرنامج هنا"
              value={programManager}
              onChange={(e) => onChangeProgramManager?.(e.target.value)}
              className="text-center w-full max-w-[200px] border-b border-dashed border-teal-500 focus:border-teal-600 focus:ring-0 text-slate-800 font-bold outline-none bg-transparent"
            />
          )}
        </div>
        
        <div className="flex flex-col items-center justify-end text-center space-y-2">
          <p className="text-slate-550">منظم الاستمارة</p>
          {readOnly ? (
            <p className="border-b border-dashed border-slate-400 px-6 py-1 font-extrabold text-slate-800 text-sm h-7">
              {advisorName || "..........................."}
            </p>
          ) : (
            <input
              id="advisor-name"
              type="text"
              placeholder="اكتب اسم منظم الاستمارة هنا"
              value={advisorName}
              onChange={(e) => onChangeAdvisorName?.(e.target.value)}
              className="text-center w-full max-w-[200px] border-b border-dashed border-teal-500 focus:border-teal-600 focus:ring-0 text-slate-800 font-bold outline-none bg-transparent"
            />
          )}
        </div>

        <div className="flex flex-col items-center justify-end text-center space-y-2">
          <p className="text-slate-550">مدير المركز / طبيب الأسنان</p>
          {readOnly ? (
            <p className="border-b border-dashed border-slate-400 px-6 py-1 font-extrabold text-slate-800 text-sm h-7">
              {directorName || "بسام محمد ناصر"}
            </p>
          ) : (
            <input
              id="director-name"
              type="text"
              placeholder="طبيب الأسنان / بسام محمد ناصر"
              value={directorName}
              onChange={(e) => onChangeDirectorName?.(e.target.value)}
              className="text-center w-full max-w-[230px] border-b border-dashed border-teal-500 focus:border-teal-600 focus:ring-0 text-slate-800 font-bold outline-none bg-transparent"
            />
          )}
        </div>
      </div>

      {/* Signature section ONLY FOR PRINT (High high fidelity) */}
      <div className="hidden print-only-block w-full border border-t-0 border-slate-700 bg-white p-6 justify-between items-end text-xs font-bold pt-14">
        <div className="text-center space-y-6">
          <p>مسؤول البرنامج</p>
          <p className="font-extrabold text-slate-800 text-sm border-b border-slate-400 pb-1 px-8 min-w-[120px]">
            {programManager || "..........................."}
          </p>
        </div>
        <div className="text-center space-y-6">
          <p>منظم الاستمارة</p>
          <p className="font-extrabold text-slate-800 text-sm border-b border-slate-400 pb-1 px-8 min-w-[120px]">
            {advisorName || "..........................."}
          </p>
        </div>
        <div className="text-center space-y-6">
          <p>مدير المركز / طبيب الأسنان</p>
          <p className="font-extrabold text-slate-800 text-sm border-b border-slate-400 pb-1 px-8 min-w-[120px]">
            {directorName || "بسام محمد ناصر"}
          </p>
        </div>
      </div>
    </div>
  );
}

// Minimalized elegant inline cell components for numeric statistics entry.
interface FormInputProps {
  value: number;
  onChange: (val: string) => void;
  readOnly?: boolean;
}

function FormInput({ value, onChange, readOnly = false }: FormInputProps) {
  if (readOnly) {
    return <span className="font-mono text-center block w-full text-slate-800 text-xs font-bold">{value === 0 ? "" : value.toLocaleString("en-US")}</span>;
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value === 0 ? "" : value}
      onChange={(e) => onChange(e.target.value)}
      placeholder=""
      className="w-full text-center bg-teal-50/10 hover:bg-teal-50/20 focus:bg-amber-50/50 text-slate-900 border-0 focus:ring-1 focus:ring-amber-500/80 rounded font-mono text-xs font-bold p-1 outline-none transition-all"
    />
  );
}
