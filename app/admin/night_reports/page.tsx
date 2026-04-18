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

export default function NightReportsPage() {
  const t = useTranslations("nightReports");
  const [adminId, setAdminId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"reporting" | "stationnee" | "panne">("reporting");

  const [reportingData, setReportingData] = useState<ReportingRecord[]>([]);
  const [reportingInput, setReportingInput] = useState("");
  const [reportingLoading, setReportingLoading] = useState(false);

  const [stationneeData, setStationneeData] = useState<VoitureRecord[]>([]);
  const [stationneeInput, setStationneeInput] = useState("");
  const [stationneeLoading, setStationneeLoading] = useState(false);

  const [panneData, setPanneData] = useState<VoitureRecord[]>([]);
  const [panneInput, setPanneInput] = useState("");
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

  const handleReportingSubmit = async () => {
    if (!adminId) return;
    setReportingLoading(true);
    const lines = reportingInput.split("\n").filter((line) => line.trim());
    let successCount = 0;
    for (const line of lines) {
      const parts = line.split(";").map((p) => p.trim());
      if (parts.length < 10) {
        toast.error(t("incompleteRow", { line }));
        continue;
      }
      const [numero, centre, vehicule_type, vehicule_matricule, chauffeur_nom, chauffeur_telephone, nature_intervention, type_point, gps, observation] = parts;
      let gps_latitude = 0, gps_longitude = 0;
      if (gps && gps.includes(",")) {
        const [lat, lng] = gps.split(",");
        gps_latitude = parseFloat(lat);
        gps_longitude = parseFloat(lng);
      }
      const { error } = await supabase.from("reporting_service_nocturne").insert({
        numero: parseInt(numero), centre, vehicule_type, vehicule_matricule, chauffeur_nom, chauffeur_telephone,
        nature_intervention, type_point, gps_latitude, gps_longitude, observation, admin_id: adminId,
      });
      if (!error) successCount++;
    }
    toast.success(t("successSaved", { count: successCount }));
    setReportingInput("");
    fetchReportingData();
    setReportingLoading(false);
  };

  const handleStationneeSubmit = async () => {
    if (!adminId) return;
    setStationneeLoading(true);
    const lines = stationneeInput.split("\n").filter((line) => line.trim());
    let successCount = 0;
    for (const line of lines) {
      const parts = line.split(";").map((p) => p.trim());
      if (parts.length < 5) {
        toast.error(t("incompleteRow", { line }));
        continue;
      }
      const [numero, centre, vehicule_type, vehicule_matricule, chauffeur_nom, chauffeur_telephone] = parts;
      const { error } = await supabase.from("voiture_stationnee").insert({
        numero: parseInt(numero), centre, vehicule_type, vehicule_matricule, chauffeur_nom, chauffeur_telephone, admin_id: adminId,
      });
      if (!error) successCount++;
    }
    toast.success(t("successSaved", { count: successCount }));
    setStationneeInput("");
    fetchStationneeData();
    setStationneeLoading(false);
  };

  const handlePanneSubmit = async () => {
    if (!adminId) return;
    setPanneLoading(true);
    const lines = panneInput.split("\n").filter((line) => line.trim());
    let successCount = 0;
    for (const line of lines) {
      const parts = line.split(";").map((p) => p.trim());
      if (parts.length < 5) {
        toast.error(t("incompleteRow", { line }));
        continue;
      }
      const [numero, centre, vehicule_type, vehicule_matricule, chauffeur_nom, chauffeur_telephone] = parts;
      const { error } = await supabase.from("voiture_en_panne").insert({
        numero: parseInt(numero), centre, vehicule_type, vehicule_matricule, chauffeur_nom, chauffeur_telephone, admin_id: adminId,
      });
      if (!error) successCount++;
    }
    toast.success(t("successSaved", { count: successCount }));
    setPanneInput("");
    fetchPanneData();
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
            placeholder={`${t("pasteData")}\n${t("example")}: 1;Centre A;Camion;123-ABC;Ahmed;0612345678;Installation;Client;18.1234,-5.1234;ملاحظة`}
            value={reportingInput}
            onChange={(e) => setReportingInput(e.target.value)}
            className="w-full p-3 border rounded dark:bg-gray-700"
          />
          <button onClick={handleReportingSubmit} disabled={reportingLoading} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded">
            {reportingLoading ? t("saving") : `💾 ${t("save")}`}
          </button>
          <h3 className="text-lg font-bold mt-8 mb-3">📋 {t("recordsLast24h")}</h3>
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
            placeholder={`${t("pasteData")}\n${t("example")}: 1;Centre A;Camion;123-ABC;Ahmed;0612345678`}
            value={stationneeInput}
            onChange={(e) => setStationneeInput(e.target.value)}
            className="w-full p-3 border rounded dark:bg-gray-700"
          />
          <button onClick={handleStationneeSubmit} disabled={stationneeLoading} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded">
            {stationneeLoading ? t("saving") : `💾 ${t("save")}`}
          </button>
          <h3 className="text-lg font-bold mt-8 mb-3">📋 {t("recordsLast24h")}</h3>
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
            placeholder={`${t("pasteData")}\n${t("example")}: 1;Centre A;Camion;123-ABC;Ahmed;0612345678`}
            value={panneInput}
            onChange={(e) => setPanneInput(e.target.value)}
            className="w-full p-3 border rounded dark:bg-gray-700"
          />
          <button onClick={handlePanneSubmit} disabled={panneLoading} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded">
            {panneLoading ? t("saving") : `💾 ${t("save")}`}
          </button>
          <h3 className="text-lg font-bold mt-8 mb-3">📋 {t("recordsLast24h")}</h3>
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