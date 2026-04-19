"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/app/lib/supabase";
import { getCookie } from "cookies-next";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

type ReportingRecord = {
  id: string;
  numero: number;
  centre: string;
  vehicule_complet: string;
  chauffeur_nom: string;
  chauffeur_telephone: string;
  nature_intervention: string;
  type_point: string;
  gps: string;
  observation: string;
  created_at: string;
};

type VoitureRecord = {
  id: string;
  numero: number;
  centre: string;
  vehicule_complet: string;
  chauffeur_nom: string;
  chauffeur_telephone: string;
  created_at: string;
};

export default function NightReportsPage() {
  const t = useTranslations("nightReports");
  const [adminId, setAdminId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"reporting" | "stationnee" | "panne">("reporting");

  const [reportingData, setReportingData] = useState<ReportingRecord[]>([]);
  const [reportingInput, setReportingInput] = useState("");
  const [parsedReporting, setParsedReporting] = useState<any[]>([]);
  const [reportingLoading, setReportingLoading] = useState(false);

  const [stationneeData, setStationneeData] = useState<VoitureRecord[]>([]);
  const [stationneeInput, setStationneeInput] = useState("");
  const [parsedStationnee, setParsedStationnee] = useState<any[]>([]);
  const [stationneeLoading, setStationneeLoading] = useState(false);

  const [panneData, setPanneData] = useState<VoitureRecord[]>([]);
  const [panneInput, setPanneInput] = useState("");
  const [parsedPanne, setParsedPanne] = useState<any[]>([]);
  const [panneLoading, setPanneLoading] = useState(false);

  useEffect(() => {
    const id = getCookie("admin_id");
    if (id && typeof id === "string") setAdminId(id);
  }, []);

  const fetchReportingData = async () => {
    if (!adminId) return;
    const { data } = await supabase
      .from("reporting_service_nocturne")
      .select("*")
      .eq("admin_id", adminId)
      .order("created_at", { ascending: false });
    if (data) setReportingData(data as ReportingRecord[]);
  };

  const fetchStationneeData = async () => {
    if (!adminId) return;
    const { data } = await supabase
      .from("voiture_stationnee")
      .select("*")
      .eq("admin_id", adminId)
      .order("created_at", { ascending: false });
    if (data) setStationneeData(data as VoitureRecord[]);
  };

  const fetchPanneData = async () => {
    if (!adminId) return;
    const { data } = await supabase
      .from("voiture_en_panne")
      .select("*")
      .eq("admin_id", adminId)
      .order("created_at", { ascending: false });
    if (data) setPanneData(data as VoitureRecord[]);
  };

  useEffect(() => {
    if (adminId) {
      fetchReportingData();
      fetchStationneeData();
      fetchPanneData();
    }
  }, [adminId]);

  // دالة تحليل سطر Reporting Service (9 أعمدة)
  const parseReportingLine = (line: string) => {
    let cleanLine = line.replace(/^\*\s*/, "").trim();
    
    // محاولة استخراج البيانات باستخدام تعبيرات منتظمة
    // مثال: "Hilux 2315AZOO suivi les antenne chauffeur ebah tel 43330054"
    
    const parts = cleanLine.split(/\s+/);
    if (parts.length < 3) return null;

    // نوع المركبة ورقم التسجيل
    const vehicule_complet = `${parts[0]} ${parts[1]}`;
    let remaining = parts.slice(2).join(" ");

    // استخراج رقم الهاتف (بعد كلمة tel)
    let chauffeur_telephone = "";
    const telMatch = remaining.match(/tel\s+(\d+)/i);
    if (telMatch) {
      chauffeur_telephone = telMatch[1];
      remaining = remaining.replace(/tel\s+\d+/i, "").trim();
    }

    // استخراج اسم السائق (بعد كلمة chauffeur)
    let chauffeur_nom = "";
    const chauffeurMatch = remaining.match(/chauffeur\s+(.+?)(?:\s+suivi|\s+dérangement|\s+FTTH|\s+SAWI|\s+BLR|$)/i);
    if (chauffeurMatch) {
      chauffeur_nom = chauffeurMatch[1].trim();
      remaining = remaining.replace(/chauffeur\s+.+?(?=\s+suivi|\s+dérangement|\s+FTTH|\s+SAWI|\s+BLR|$)/i, "").trim();
    } else {
      // إذا لم يذكر "chauffeur"، نعتبر أول كلمة بعد الرقم هي الاسم
      const words = remaining.split(/\s+/);
      if (words.length > 0) {
        chauffeur_nom = words[0];
        remaining = words.slice(1).join(" ");
      }
    }

    // باقي النص هو Nature intervention
    let nature_intervention = remaining;

    return {
      vehicule_complet,
      chauffeur_nom,
      chauffeur_telephone,
      nature_intervention,
    };
  };

  // دالة تحليل سطر Voiture
  const parseVoitureLine = (line: string) => {
    let cleanLine = line.replace(/^\*\s*/, "").trim();
    const parts = cleanLine.split(/\s+/);
    if (parts.length < 3) return null;

    const vehicule_complet = `${parts[0]} ${parts[1]}`;
    let remaining = parts.slice(2).join(" ");

    let chauffeur_telephone = "";
    const telMatch = remaining.match(/tel\s+(\d+)/i);
    if (telMatch) {
      chauffeur_telephone = telMatch[1];
      remaining = remaining.replace(/tel\s+\d+/i, "").trim();
    }

    let chauffeur_nom = "";
    const chauffeurMatch = remaining.match(/chauffeur\s+(.+)/i);
    if (chauffeurMatch) {
      chauffeur_nom = chauffeurMatch[1].trim();
    } else {
      chauffeur_nom = remaining;
    }

    return { vehicule_complet, chauffeur_nom, chauffeur_telephone };
  };

  const handleReportingInputChange = (value: string) => {
    setReportingInput(value);
    const lines = value.split("\n").filter((line) => line.trim());
    const parsed = lines.map(parseReportingLine).filter((p) => p !== null);
    console.log("Parsed reporting lines:", parsed);
    setParsedReporting(parsed);
  };

  const handleStationneeInputChange = (value: string) => {
    setStationneeInput(value);
    const lines = value.split("\n").filter((line) => line.trim());
    const parsed = lines.map(parseVoitureLine).filter((p) => p !== null);
    setParsedStationnee(parsed);
  };

  const handlePanneInputChange = (value: string) => {
    setPanneInput(value);
    const lines = value.split("\n").filter((line) => line.trim());
    const parsed = lines.map(parseVoitureLine).filter((p) => p !== null);
    setParsedPanne(parsed);
  };

  const handleSaveReporting = async () => {
    if (!adminId) {
      toast.error("لم يتم العثور على معرف المدير");
      return;
    }
    if (parsedReporting.length === 0) {
      toast.error("لا توجد بيانات للحفظ. تأكد من لصق البيانات بشكل صحيح.");
      return;
    }
    
    setReportingLoading(true);
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of parsedReporting) {
      const { error } = await supabase.from("reporting_service_nocturne").insert({
        numero: successCount + 1,
        centre: "NKC",
        vehicule_complet: item.vehicule_complet,
        chauffeur_nom: item.chauffeur_nom,
        chauffeur_telephone: item.chauffeur_telephone,
        nature_intervention: item.nature_intervention || "",
        type_point: "",
        gps: "",
        observation: "",
        admin_id: adminId,
      });
      if (error) {
        console.error("Error saving:", error);
        errorCount++;
      } else {
        successCount++;
      }
    }
    
    if (successCount > 0) {
      toast.success(`✅ تم حفظ ${successCount} سجل`);
    }
    if (errorCount > 0) {
      toast.error(`❌ فشل حفظ ${errorCount} سجل`);
    }
    
    setReportingInput("");
    setParsedReporting([]);
    await fetchReportingData();
    setReportingLoading(false);
  };

  const handleSaveStationnee = async () => {
    if (!adminId || parsedStationnee.length === 0) {
      toast.error("لا توجد بيانات للحفظ");
      return;
    }
    setStationneeLoading(true);
    let successCount = 0;
    for (const item of parsedStationnee) {
      const { error } = await supabase.from("voiture_stationnee").insert({
        numero: successCount + 1,
        centre: "NKC",
        vehicule_complet: item.vehicule_complet,
        chauffeur_nom: item.chauffeur_nom,
        chauffeur_telephone: item.chauffeur_telephone,
        admin_id: adminId,
      });
      if (!error) successCount++;
    }
    toast.success(`✅ تم حفظ ${successCount} سجل`);
    setStationneeInput("");
    setParsedStationnee([]);
    await fetchStationneeData();
    setStationneeLoading(false);
  };

  const handleSavePanne = async () => {
    if (!adminId || parsedPanne.length === 0) {
      toast.error("لا توجد بيانات للحفظ");
      return;
    }
    setPanneLoading(true);
    let successCount = 0;
    for (const item of parsedPanne) {
      const { error } = await supabase.from("voiture_en_panne").insert({
        numero: successCount + 1,
        centre: "NKC",
        vehicule_complet: item.vehicule_complet,
        chauffeur_nom: item.chauffeur_nom,
        chauffeur_telephone: item.chauffeur_telephone,
        admin_id: adminId,
      });
      if (!error) successCount++;
    }
    toast.success(`✅ تم حفظ ${successCount} سجل`);
    setPanneInput("");
    setParsedPanne([]);
    await fetchPanneData();
    setPanneLoading(false);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // ورقة Reporting Service Nocturne (9 أعمدة)
    const reportingSheetData = reportingData.map((r, idx) => ({
      "N°": idx + 1,
      "Centre": r.centre,
      "Véhicule (Type / Matricule)": r.vehicule_complet,
      "Nom du Chauffeur": r.chauffeur_nom,
      "Numéro du Chauffeur": r.chauffeur_telephone,
      "Nature intervention": r.nature_intervention,
      "Type de point": r.type_point,
      "Coordonnées GPS (Latitude / Longitude)": r.gps,
      "Observation": r.observation,
    }));
    const reportingSheet = XLSX.utils.json_to_sheet(reportingSheetData);
    XLSX.utils.book_append_sheet(workbook, reportingSheet, "Reporting Service Nocturne");

    // ورقة Voiture Stationnee
    const stationneeSheetData = stationneeData.map((s, idx) => ({
      "N°": idx + 1,
      "Centre": s.centre,
      "Véhicule (Type / Matricule)": s.vehicule_complet,
      "Chauffeur": s.chauffeur_nom,
      "Numéro de Telephone": s.chauffeur_telephone,
    }));
    const stationneeSheet = XLSX.utils.json_to_sheet(stationneeSheetData);
    XLSX.utils.book_append_sheet(workbook, stationneeSheet, "VOITURE STATIONNEE");

    // ورقة Voiture En Panne
    const panneSheetData = panneData.map((p, idx) => ({
      "N°": idx + 1,
      "Centre": p.centre,
      "Véhicule (Type / Matricule)": p.vehicule_complet,
      "Chauffeur": p.chauffeur_nom,
      "Numéro de Telephone": p.chauffeur_telephone,
    }));
    const panneSheet = XLSX.utils.json_to_sheet(panneSheetData);
    XLSX.utils.book_append_sheet(workbook, panneSheet, "Voiture En Panne");

    XLSX.writeFile(workbook, `REPORTING_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("تم تصدير جميع التقارير بنجاح");
  };

  return (
    <div className="p-5 bg-gray-100 min-h-screen dark:bg-gray-900">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">📋 التقارير الليلية</h1>
        <button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
          📊 تصدير الكل إلى Excel
        </button>
      </div>

      <div className="flex gap-2 mb-6 border-b dark:border-gray-700">
        <button onClick={() => setActiveTab("reporting")} className={`py-2 px-4 font-bold ${activeTab === "reporting" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}>
          📡 Reporting Service Nocturne
        </button>
        <button onClick={() => setActiveTab("stationnee")} className={`py-2 px-4 font-bold ${activeTab === "stationnee" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}>
          🚗 VOITURE STATIONNEE
        </button>
        <button onClick={() => setActiveTab("panne")} className={`py-2 px-4 font-bold ${activeTab === "panne" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}>
          ⚠️ Voiture En Panne
        </button>
      </div>

      {/* ===== TAB 1: Reporting Service Nocturne (9 أعمدة) ===== */}
      {activeTab === "reporting" && (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">➕ إضافة تقارير الخدمة الليلية</h2>
          <textarea
            rows={6}
            placeholder={`الصق البيانات هنا...\nمثال: Hilux 2315AZ00 suivi les antenne chauffeur ebah tel 43330054\nأو:\nHilux 0423AZ00 dérangements FTTH chauffeur mouhamedou tel 46772963\nأو:\nVerso 1007BC00 dérangement SAWI chauffeur med tel 46576565`}
            value={reportingInput}
            onChange={(e) => handleReportingInputChange(e.target.value)}
            className="w-full p-3 border rounded dark:bg-gray-700"
          />
          
          {parsedReporting.length > 0 && (
            <div className="mt-4">
              <h3 className="text-md font-bold mb-2">📊 المعاينة (البيانات المستخرجة):</h3>
              <div className="overflow-x-auto border rounded">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 border">Véhicule (Type / Matricule)</th>
                      <th className="p-2 border">Nom du Chauffeur</th>
                      <th className="p-2 border">Numéro du Chauffeur</th>
                      <th className="p-2 border">Nature intervention</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedReporting.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2 border">{item.vehicule_complet}</td>
                        <td className="p-2 border">{item.chauffeur_nom}</td>
                        <td className="p-2 border">{item.chauffeur_telephone}</td>
                        <td className="p-2 border">{item.nature_intervention}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button onClick={handleSaveReporting} disabled={reportingLoading} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50">
            {reportingLoading ? "جاري الحفظ..." : "💾 حفظ البيانات"}
          </button>

          <h3 className="text-lg font-bold mt-8 mb-3">📋 السجلات المسجلة</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">N°</th>
                  <th className="p-2 border">Centre</th>
                  <th className="p-2 border">Véhicule (Type / Matricule)</th>
                  <th className="p-2 border">Nom du Chauffeur</th>
                  <th className="p-2 border">Numéro du Chauffeur</th>
                  <th className="p-2 border">Nature intervention</th>
                  <th className="p-2 border">Type de point</th>
                  <th className="p-2 border">Coordonnées GPS</th>
                  <th className="p-2 border">Observation</th>
                </tr>
              </thead>
              <tbody>
                {reportingData.map((r, idx) => (
                  <tr key={r.id}>
                    <td className="p-2 border">{idx + 1}</td>
                    <td className="p-2 border">{r.centre}</td>
                    <td className="p-2 border">{r.vehicule_complet}</td>
                    <td className="p-2 border">{r.chauffeur_nom}</td>
                    <td className="p-2 border">{r.chauffeur_telephone}</td>
                    <td className="p-2 border">{r.nature_intervention}</td>
                    <td className="p-2 border">{r.type_point}</td>
                    <td className="p-2 border">{r.gps}</td>
                    <td className="p-2 border">{r.observation}</td>
                  </tr>
                ))}
                {reportingData.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-gray-500">لا توجد بيانات</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== TAB 2: VOITURE STATIONNEE ===== */}
      {activeTab === "stationnee" && (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">➕ إضافة سيارات متوقفة</h2>
          <textarea
            rows={6}
            placeholder="الصق البيانات هنا...\nمثال: Hilux 0423AZ00 chauffeur mouhamedou tel 46772963"
            value={stationneeInput}
            onChange={(e) => handleStationneeInputChange(e.target.value)}
            className="w-full p-3 border rounded dark:bg-gray-700"
          />
          
          {parsedStationnee.length > 0 && (
            <div className="mt-4">
              <h3 className="text-md font-bold mb-2">📊 المعاينة (البيانات المستخرجة):</h3>
              <div className="overflow-x-auto border rounded">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 border">Véhicule (Type / Matricule)</th>
                      <th className="p-2 border">Chauffeur</th>
                      <th className="p-2 border">Numéro de Telephone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedStationnee.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2 border">{item.vehicule_complet}</td>
                        <td className="p-2 border">{item.chauffeur_nom}</td>
                        <td className="p-2 border">{item.chauffeur_telephone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button onClick={handleSaveStationnee} disabled={stationneeLoading} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50">
            {stationneeLoading ? "جاري الحفظ..." : "💾 حفظ البيانات"}
          </button>

          <h3 className="text-lg font-bold mt-8 mb-3">📋 السجلات المسجلة</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">N°</th>
                  <th className="p-2 border">Centre</th>
                  <th className="p-2 border">Véhicule (Type / Matricule)</th>
                  <th className="p-2 border">Chauffeur</th>
                  <th className="p-2 border">Numéro de Telephone</th>
                </tr>
              </thead>
              <tbody>
                {stationneeData.map((s, idx) => (
                  <tr key={s.id}>
                    <td className="p-2 border">{idx + 1}</td>
                    <td className="p-2 border">{s.centre}</td>
                    <td className="p-2 border">{s.vehicule_complet}</td>
                    <td className="p-2 border">{s.chauffeur_nom}</td>
                    <td className="p-2 border">{s.chauffeur_telephone}</td>
                  </tr>
                ))}
                {stationneeData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-500">لا توجد بيانات</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== TAB 3: Voiture En Panne ===== */}
      {activeTab === "panne" && (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">➕ إضافة سيارات معطلة</h2>
          <textarea
            rows={6}
            placeholder="الصق البيانات هنا...\nمثال: Verso 1007BC00 dérangement SAWI chauffeur med tel 46576565"
            value={panneInput}
            onChange={(e) => handlePanneInputChange(e.target.value)}
            className="w-full p-3 border rounded dark:bg-gray-700"
          />
          
          {parsedPanne.length > 0 && (
            <div className="mt-4">
              <h3 className="text-md font-bold mb-2">📊 المعاينة (البيانات المستخرجة):</h3>
              <div className="overflow-x-auto border rounded">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 border">Véhicule (Type / Matricule)</th>
                      <th className="p-2 border">Chauffeur</th>
                      <th className="p-2 border">Numéro de Telephone</th>
                    </tr>
                  </thead>
                  <tbody>
                   {parsedPanne.map((item, idx) => (
  <tr key={idx}>
    <td className="p-2 border">{item.vehicule_complet}</td>
    <td className="p-2 border">{item.chauffeur_nom}</td>
    <td className="p-2 border">{item.chauffeur_telephone}</td>
  </tr>
))} 
                  
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button onClick={handleSavePanne} disabled={panneLoading} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50">
            {panneLoading ? "جاري الحفظ..." : "💾 حفظ البيانات"}
          </button>

          <h3 className="text-lg font-bold mt-8 mb-3">📋 السجلات المسجلة</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">N°</th>
                  <th className="p-2 border">Centre</th>
                  <th className="p-2 border">Véhicule (Type / Matricule)</th>
                  <th className="p-2 border">Chauffeur</th>
                  <th className="p-2 border">Numéro de Telephone</th>
                </tr>
              </thead>
              <tbody>
                {panneData.map((p, idx) => (
                  <tr key={p.id}>
                    <td className="p-2 border">{idx + 1}</td>
                    <td className="p-2 border">{p.centre}</td>
                    <td className="p-2 border">{p.vehicule_complet}</td>
                    <td className="p-2 border">{p.chauffeur_nom}</td>
                    <td className="p-2 border">{p.chauffeur_telephone}</td>
                  </tr>
                ))}
                {panneData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-500">لا توجد بيانات</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}