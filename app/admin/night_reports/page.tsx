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
  vehicule_type: string;
  vehicule_matricule: string;
  chauffeur_nom: string;
  chauffeur_telephone: string;
  nature_intervention: string;
  type_point: string;
  gps_latitude: number;
  gps_longitude: number;
  observation: string;
  created_at: string;
};

type VoitureRecord = {
  id: string;
  numero: number;
  centre: string;
  vehicule_type: string;
  vehicule_matricule: string;
  chauffeur_nom: string;
  chauffeur_telephone: string;
  created_at: string;
};

// دالة تحليل سطر Reporting Service
const parseReportingLine = (line: string) => {
  // تنظيف السطر: إزالة النجمة والمسافات الزائدة
  let cleanLine = line.replace(/^\*\s*/, "").trim();
  const parts = cleanLine.split(/\s+/);

  if (parts.length < 3) return null;

  const vehicule_type = parts[0];
  const vehicule_matricule = parts[1];
  let remaining = parts.slice(2).join(" ");

  // استخراج رقم الهاتف
  let chauffeur_telephone = "";
  let telIndex = remaining.toLowerCase().indexOf("tel");
  if (telIndex !== -1) {
    const telPart = remaining.slice(telIndex).split(/\s+/);
    chauffeur_telephone = telPart[1] || "";
    remaining = remaining.slice(0, telIndex).trim();
  }

  // استخراج اسم السائق
  let chauffeur_nom = "";
  let chauffeurIndex = remaining.toLowerCase().indexOf("chauffeur");
  if (chauffeurIndex !== -1) {
    chauffeur_nom = remaining.slice(chauffeurIndex + 8).trim();
    remaining = remaining.slice(0, chauffeurIndex).trim();
  } else {
    // إذا لم يذكر "chauffeur"، نعتبر باقي النص هو اسم السائق
    chauffeur_nom = remaining;
    remaining = "";
  }

  // تحديد نوع التدخل
  const interventionTypes = ["suivi", "FTTH", "dérangement", "SAWI", "BLR"];
  let nature_intervention = "";
  for (const it of interventionTypes) {
    if (remaining.toLowerCase().includes(it.toLowerCase())) {
      nature_intervention = it;
      break;
    }
  }

  // ملاحظة
  let observation = remaining.replace(new RegExp(nature_intervention, "i"), "").trim();

  return {
    vehicule_type,
    vehicule_matricule,
    chauffeur_nom,
    chauffeur_telephone,
    nature_intervention,
    observation,
  };
};

// دالة تحليل سطر Voiture (Stationnee / Panne)
const parseVoitureLine = (line: string) => {
  let cleanLine = line.replace(/^\*\s*/, "").trim();
  const parts = cleanLine.split(/\s+/);

  if (parts.length < 3) return null;

  const vehicule_type = parts[0];
  const vehicule_matricule = parts[1];
  let remaining = parts.slice(2).join(" ");

  let chauffeur_telephone = "";
  let telIndex = remaining.toLowerCase().indexOf("tel");
  if (telIndex !== -1) {
    const telPart = remaining.slice(telIndex).split(/\s+/);
    chauffeur_telephone = telPart[1] || "";
    remaining = remaining.slice(0, telIndex).trim();
  }

  let chauffeur_nom = "";
  let chauffeurIndex = remaining.toLowerCase().indexOf("chauffeur");
  if (chauffeurIndex !== -1) {
    chauffeur_nom = remaining.slice(chauffeurIndex + 8).trim();
  } else {
    chauffeur_nom = remaining;
  }

  return {
    vehicule_type,
    vehicule_matricule,
    chauffeur_nom,
    chauffeur_telephone,
  };
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
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const { data } = await supabase
      .from("reporting_service_nocturne")
      .select("*")
      .eq("admin_id", adminId)
      .gte("created_at", yesterday.toISOString())
      .order("created_at", { ascending: false });
    if (data) setReportingData(data as ReportingRecord[]);
  };

  const fetchStationneeData = async () => {
    if (!adminId) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const { data } = await supabase
      .from("voiture_stationnee")
      .select("*")
      .eq("admin_id", adminId)
      .gte("created_at", yesterday.toISOString())
      .order("created_at", { ascending: false });
    if (data) setStationneeData(data as VoitureRecord[]);
  };

  const fetchPanneData = async () => {
    if (!adminId) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const { data } = await supabase
      .from("voiture_en_panne")
      .select("*")
      .eq("admin_id", adminId)
      .gte("created_at", yesterday.toISOString())
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

  // تحليل النص عند التغيير (للعرض فقط)
  const handleReportingInputChange = (value: string) => {
    setReportingInput(value);
    const lines = value.split("\n").filter((line) => line.trim());
    const parsed = lines.map(parseReportingLine).filter((p) => p !== null);
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

  // حفظ البيانات المحللة
  const handleSaveReporting = async () => {
    if (!adminId) return;
    if (parsedReporting.length === 0) {
      toast.error("لا توجد بيانات للحفظ");
      return;
    }
    setReportingLoading(true);
    let successCount = 0;
    for (const item of parsedReporting) {
      const { error } = await supabase.from("reporting_service_nocturne").insert({
        numero: successCount + 1,
        centre: "Centre par défaut",
        vehicule_type: item.vehicule_type,
        vehicule_matricule: item.vehicule_matricule,
        chauffeur_nom: item.chauffeur_nom,
        chauffeur_telephone: item.chauffeur_telephone,
        nature_intervention: item.nature_intervention || "",
        type_point: "Non spécifié",
        gps_latitude: 0,
        gps_longitude: 0,
        observation: item.observation || "",
        admin_id: adminId,
      });
      if (!error) successCount++;
    }
    toast.success(t("successSaved", { count: successCount }));
    setReportingInput("");
    setParsedReporting([]);
    await fetchReportingData();
    setReportingLoading(false);
  };

  const handleSaveStationnee = async () => {
    if (!adminId) return;
    if (parsedStationnee.length === 0) {
      toast.error("لا توجد بيانات للحفظ");
      return;
    }
    setStationneeLoading(true);
    let successCount = 0;
    for (const item of parsedStationnee) {
      const { error } = await supabase.from("voiture_stationnee").insert({
        numero: successCount + 1,
        centre: "Centre par défaut",
        vehicule_type: item.vehicule_type,
        vehicule_matricule: item.vehicule_matricule,
        chauffeur_nom: item.chauffeur_nom,
        chauffeur_telephone: item.chauffeur_telephone,
        admin_id: adminId,
      });
      if (!error) successCount++;
    }
    toast.success(t("successSaved", { count: successCount }));
    setStationneeInput("");
    setParsedStationnee([]);
    await fetchStationneeData();
    setStationneeLoading(false);
  };

  const handleSavePanne = async () => {
    if (!adminId) return;
    if (parsedPanne.length === 0) {
      toast.error("لا توجد بيانات للحفظ");
      return;
    }
    setPanneLoading(true);
    let successCount = 0;
    for (const item of parsedPanne) {
      const { error } = await supabase.from("voiture_en_panne").insert({
        numero: successCount + 1,
        centre: "Centre par défaut",
        vehicule_type: item.vehicule_type,
        vehicule_matricule: item.vehicule_matricule,
        chauffeur_nom: item.chauffeur_nom,
        chauffeur_telephone: item.chauffeur_telephone,
        admin_id: adminId,
      });
      if (!error) successCount++;
    }
    toast.success(t("successSaved", { count: successCount }));
    setPanneInput("");
    setParsedPanne([]);
    await fetchPanneData();
    setPanneLoading(false);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    const reportingSheet = XLSX.utils.json_to_sheet(reportingData.map((r) => ({
      [t("columns.numero")]: r.numero,
      [t("columns.centre")]: r.centre,
      [t("columns.vehiculeType")]: r.vehicule_type,
      [t("columns.matricule")]: r.vehicule_matricule,
      [t("columns.chauffeurName")]: r.chauffeur_nom,
      [t("columns.chauffeurPhone")]: r.chauffeur_telephone,
      [t("columns.natureIntervention")]: r.nature_intervention,
      [t("columns.typePoint")]: r.type_point,
      [t("columns.gps")]: `${r.gps_latitude},${r.gps_longitude}`,
      [t("columns.observation")]: r.observation,
      [t("columns.date")]: new Date(r.created_at).toLocaleString(),
    })));
    XLSX.utils.book_append_sheet(workbook, reportingSheet, t("reportingService"));

    const stationneeSheet = XLSX.utils.json_to_sheet(stationneeData.map((s) => ({
      [t("columns.numero")]: s.numero,
      [t("columns.centre")]: s.centre,
      [t("columns.vehiculeType")]: s.vehicule_type,
      [t("columns.matricule")]: s.vehicule_matricule,
      [t("columns.chauffeurName")]: s.chauffeur_nom,
      [t("columns.chauffeurPhone")]: s.chauffeur_telephone,
      [t("columns.date")]: new Date(s.created_at).toLocaleString(),
    })));
    XLSX.utils.book_append_sheet(workbook, stationneeSheet, t("stationnee"));

    const panneSheet = XLSX.utils.json_to_sheet(panneData.map((p) => ({
      [t("columns.numero")]: p.numero,
      [t("columns.centre")]: p.centre,
      [t("columns.vehiculeType")]: p.vehicule_type,
      [t("columns.matricule")]: p.vehicule_matricule,
      [t("columns.chauffeurName")]: p.chauffeur_nom,
      [t("columns.chauffeurPhone")]: p.chauffeur_telephone,
      [t("columns.date")]: new Date(p.created_at).toLocaleString(),
    })));
    XLSX.utils.book_append_sheet(workbook, panneSheet, t("panne"));

    XLSX.writeFile(workbook, `night_reports_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(t("exportAll"));
  };

  return (
    <div className="p-5 bg-gray-100 min-h-screen dark:bg-gray-900">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">📋 {t("title")}</h1>
        <button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
          📊 {t("exportAll")}
        </button>
      </div>

      <div className="flex gap-2 mb-6 border-b dark:border-gray-700">
        <button onClick={() => setActiveTab("reporting")} className={`py-2 px-4 font-bold ${activeTab === "reporting" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}>
          📡 {t("reportingService")}
        </button>
        <button onClick={() => setActiveTab("stationnee")} className={`py-2 px-4 font-bold ${activeTab === "stationnee" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}>
          🚗 {t("stationnee")}
        </button>
        <button onClick={() => setActiveTab("panne")} className={`py-2 px-4 font-bold ${activeTab === "panne" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}>
          ⚠️ {t("panne")}
        </button>
      </div>

      {activeTab === "reporting" && (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">➕ {t("addData")}</h2>
          <textarea
            rows={6}
            placeholder={`${t("pasteData")}\nمثال:\nHilux 2315AZ00 suivi les antenne chauffeur ebah tel 43330054`}
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
                      <th className="p-2 border">نوع المركبة</th>
                      <th className="p-2 border">رقم التسجيل</th>
                      <th className="p-2 border">اسم السائق</th>
                      <th className="p-2 border">رقم السائق</th>
                      <th className="p-2 border">طبيعة التدخل</th>
                      <th className="p-2 border">ملاحظة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedReporting.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2 border">{item.vehicule_type}</td>
                        <td className="p-2 border">{item.vehicule_matricule}</td>
                        <td className="p-2 border">{item.chauffeur_nom}</td>
                        <td className="p-2 border">{item.chauffeur_telephone}</td>
                        <td className="p-2 border">{item.nature_intervention}</td>
                        <td className="p-2 border">{item.observation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button onClick={handleSaveReporting} disabled={reportingLoading || parsedReporting.length === 0} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50">
            {reportingLoading ? t("saving") : `💾 ${t("save")}`}
          </button>

          <h3 className="text-lg font-bold mt-8 mb-3">📋 السجلات المسجلة (آخر 24 ساعة)</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">{t("columns.numero")}</th>
                  <th className="p-2 border">{t("columns.centre")}</th>
                  <th className="p-2 border">{t("columns.vehiculeType")}</th>
                  <th className="p-2 border">{t("columns.matricule")}</th>
                  <th className="p-2 border">{t("columns.chauffeurName")}</th>
                  <th className="p-2 border">{t("columns.chauffeurPhone")}</th>
                  <th className="p-2 border">{t("columns.natureIntervention")}</th>
                  <th className="p-2 border">{t("columns.typePoint")}</th>
                  <th className="p-2 border">{t("columns.gps")}</th>
                  <th className="p-2 border">{t("columns.observation")}</th>
                  <th className="p-2 border">{t("columns.date")}</th>
                </tr>
              </thead>
              <tbody>
                {reportingData.map((r) => (
                  <tr key={r.id}>
                    <td className="p-2 border">{r.numero}</td>
                    <td className="p-2 border">{r.centre}</td>
                    <td className="p-2 border">{r.vehicule_type}</td>
                    <td className="p-2 border">{r.vehicule_matricule}</td>
                    <td className="p-2 border">{r.chauffeur_nom}</td>
                    <td className="p-2 border">{r.chauffeur_telephone}</td>
                    <td className="p-2 border">{r.nature_intervention}</td>
                    <td className="p-2 border">{r.type_point}</td>
                    <td className="p-2 border">{r.gps_latitude},{r.gps_longitude}</td>
                    <td className="p-2 border">{r.observation}</td>
                    <td className="p-2 border">{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {reportingData.length === 0 && (
                  <tr>
                    <td colSpan={11} className="p-4 text-center text-gray-500">{t("noData")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "stationnee" && (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">➕ {t("addData")}</h2>
          <textarea
            rows={6}
            placeholder={`${t("pasteData")}\nمثال:\nHilux 0423AZ00 chauffeur mouhamedou tel 46772963`}
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
                      <th className="p-2 border">نوع المركبة</th>
                      <th className="p-2 border">رقم التسجيل</th>
                      <th className="p-2 border">اسم السائق</th>
                      <th className="p-2 border">رقم السائق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedStationnee.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2 border">{item.vehicule_type}</td>
                        <td className="p-2 border">{item.vehicule_matricule}</td>
                        <td className="p-2 border">{item.chauffeur_nom}</td>
                        <td className="p-2 border">{item.chauffeur_telephone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button onClick={handleSaveStationnee} disabled={stationneeLoading || parsedStationnee.length === 0} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50">
            {stationneeLoading ? t("saving") : `💾 ${t("save")}`}
          </button>

          <h3 className="text-lg font-bold mt-8 mb-3">📋 السجلات المسجلة (آخر 24 ساعة)</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">{t("columns.numero")}</th>
                  <th className="p-2 border">{t("columns.centre")}</th>
                  <th className="p-2 border">{t("columns.vehiculeType")}</th>
                  <th className="p-2 border">{t("columns.matricule")}</th>
                  <th className="p-2 border">{t("columns.chauffeurName")}</th>
                  <th className="p-2 border">{t("columns.chauffeurPhone")}</th>
                  <th className="p-2 border">{t("columns.date")}</th>
                </tr>
              </thead>
              <tbody>
                {stationneeData.map((s) => (
                  <tr key={s.id}>
                    <td className="p-2 border">{s.numero}</td>
                    <td className="p-2 border">{s.centre}</td>
                    <td className="p-2 border">{s.vehicule_type}</td>
                    <td className="p-2 border">{s.vehicule_matricule}</td>
                    <td className="p-2 border">{s.chauffeur_nom}</td>
                    <td className="p-2 border">{s.chauffeur_telephone}</td>
                    <td className="p-2 border">{new Date(s.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {stationneeData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-gray-500">{t("noData")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "panne" && (
  <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md">
    <h2 className="text-xl font-bold mb-4">➕ {t("addData")}</h2>
    <textarea
      rows={6}
      placeholder={`${t("pasteData")}\nمثال:\nVerso 1007BC00 dérangement SAWI chauffeur med tel 46576565`}
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
                <th className="p-2 border">نوع المركبة</th>
                <th className="p-2 border">رقم التسجيل</th>
                <th className="p-2 border">اسم السائق</th>
                <th className="p-2 border">رقم السائق</th>
              </tr>
            </thead>
            <tbody>
              {parsedPanne.map((item, idx) => (
                <tr key={idx}>
                  <td className="p-2 border">{item.vehicule_type}</td>
                  <td className="p-2 border">{item.vehicule_matricule}</td>
                  <td className="p-2 border">{item.chauffeur_nom}</td>
                  <td className="p-2 border">{item.chauffeur_telephone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    <button onClick={handleSavePanne} disabled={panneLoading || parsedPanne.length === 0} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50">
      {panneLoading ? t("saving") : `💾 ${t("save")}`}
    </button>

    <h3 className="text-lg font-bold mt-8 mb-3">📋 السجلات المسجلة (آخر 24 ساعة)</h3>
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">{t("columns.numero")}</th>
            <th className="p-2 border">{t("columns.centre")}</th>
            <th className="p-2 border">{t("columns.vehiculeType")}</th>
            <th className="p-2 border">{t("columns.matricule")}</th>
            <th className="p-2 border">{t("columns.chauffeurName")}</th>
            <th className="p-2 border">{t("columns.chauffeurPhone")}</th>
            <th className="p-2 border">{t("columns.date")}</th>
          </tr>
        </thead>
        <tbody>
          {panneData.map((p) => (
            <tr key={p.id}>
              <td className="p-2 border">{p.numero}</td>
              <td className="p-2 border">{p.centre}</td>
              <td className="p-2 border">{p.vehicule_type}</td>
              <td className="p-2 border">{p.vehicule_matricule}</td>
              <td className="p-2 border">{p.chauffeur_nom}</td>
              <td className="p-2 border">{p.chauffeur_telephone}</td>
              <td className="p-2 border">{new Date(p.created_at).toLocaleString()}</td>
            </tr>
          ))}
          {panneData.length === 0 && (
            <tr>
              <td colSpan={7} className="p-4 text-center text-gray-500">{t("noData")}</td>
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