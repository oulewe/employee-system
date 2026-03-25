"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { getCookie } from "cookies-next";
import {
  calculateAllEmployeesPayroll,
  fetchMonthlyPayroll,
} from "../lib/payrollCalculations";
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

type PayrollRecord = {
  id: string;
  employee_id: string;
  month: number;
  total_hours: number;
  salary: number;
  employee: {
    id: string;
    name: string;
    phone: string;
    role: string;
    salary: number;
  };
};

// دوال تنسيق العملات المختلفة
const formatMRU = (amount: number): string => {
  return new Intl.NumberFormat("ar-MR", {
    style: "currency",
    currency: "MRU",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatEUR = (amount: number): string => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatUSD = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

interface PayrollSectionProps {
  adminId: string | null;
}

export default function PayrollSection({ adminId }: PayrollSectionProps) {
  const t = useTranslations("payroll");
  const locale = useLocale();

  const [payrollData, setPayrollData] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [currency, setCurrency] = useState("MRU");

  // قراءة العملة المختارة من الكوكي
  useEffect(() => {
    const c = getCookie("currency");
    if (c && typeof c === "string") {
      setCurrency(c);
    }
  }, []);

  // تنسيق المبلغ حسب العملة المختارة
  const formatAmount = (amount: number): string => {
    if (currency === "MRU") return formatMRU(amount);
    if (currency === "EUR") return formatEUR(amount);
    return formatUSD(amount);
  };

  const handleCalculatePayroll = async () => {
    if (!adminId) return;
    setError("");
    setSuccess("");
    setCalculating(true);

    try {
      const year = new Date().getFullYear();
      const results = await calculateAllEmployeesPayroll(selectedMonth, year, adminId);

      if (results.length === 0) {
        toast.error(t("calculationFailed"));
        return;
      }

      const successCount = results.filter((r) => r.success).length;
      toast.success(t("calculationSuccess", { count: successCount }));

      await handleFetchPayroll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCalculating(false);
    }
  };

  const handleFetchPayroll = async () => {
    if (!adminId) return;
    setError("");
    setLoading(true);

    try {
      const data = await fetchMonthlyPayroll(selectedMonth, adminId);
      setPayrollData(data as PayrollRecord[]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportPayrollToExcel = () => {
    if (payrollData.length === 0) {
      toast.error("لا توجد بيانات رواتب لتصديرها");
      return;
    }
    const dataToExport = payrollData.map(record => ({
      'الموظف': record.employee?.name,
      'الساعات المعمول بها': record.total_hours,
      'الراتب الشهري الأساسي': record.employee?.salary,
      'الراتب المستحق': record.salary,
      'النسبة المئوية': record.employee?.salary ? Math.round((record.salary / record.employee.salary) * 100) : 0
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
    XLSX.writeFile(wb, `payroll_${selectedMonth}_${new Date().getFullYear()}.xlsx`);
    toast.success("تم تصدير الرواتب بنجاح");
  };

  useEffect(() => {
    if (adminId) handleFetchPayroll();
  }, [selectedMonth, adminId]);

  const totalSalaries = payrollData.reduce((sum, p) => sum + p.salary, 0);
  const totalHours = payrollData.reduce((sum, p) => sum + p.total_hours, 0);

  return (
    <div className="bg-white p-5 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">💰 {t("title")}</h2>
        <button
          onClick={exportPayrollToExcel}
          className="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded transition"
        >
          📊 تصدير Excel
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          ❌ {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 text-green-700 p-3 rounded mb-4">
          ✅ {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block font-bold mb-1">{t("selectMonth")}</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>
                {new Date(2024, m - 1).toLocaleString(
                  locale === "ar" ? "ar-SA" : locale === "fr" ? "fr-FR" : "en-US",
                  { month: "long" }
                )}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCalculatePayroll}
          disabled={calculating || !adminId}
          className={`mt-6 p-2 rounded font-bold text-white ${
            (calculating || !adminId) ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
          } transition`}
        >
          {calculating ? t("calculating") : t("calculateButton")}
        </button>

        <button
          onClick={handleFetchPayroll}
          disabled={loading || !adminId}
          className={`mt-6 p-2 rounded font-bold text-white ${
            (loading || !adminId) ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          } transition`}
        >
          {loading ? t("refreshing") : t("refreshButton")}
        </button>
      </div>

      {payrollData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-green-50 p-3 rounded border border-green-300 text-center">
            <div className="text-sm text-gray-600">{t("totalSalaries")}</div>
            <div className="text-xl font-bold text-green-700">{formatAmount(totalSalaries)}</div>
          </div>
          <div className="bg-blue-50 p-3 rounded border border-blue-300 text-center">
            <div className="text-sm text-gray-600">{t("totalHours")}</div>
            <div className="text-xl font-bold text-blue-700">{totalHours} {t("hoursUnit")}</div>
          </div>
          <div className="bg-orange-50 p-3 rounded border border-orange-300 text-center">
            <div className="text-sm text-gray-600">{t("employeeCount")}</div>
            <div className="text-xl font-bold text-orange-700">{payrollData.length} {t("employeesUnit")}</div>
          </div>
        </div>
      )}

      {payrollData.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border text-right">{t("employeeName")}</th>
                <th className="p-2 border text-right">{t("workedHours")}</th>
                <th className="p-2 border text-right">{t("baseSalary")}</th>
                <th className="p-2 border text-right">{t("earnedSalary")}</th>
                <th className="p-2 border text-right">{t("percentage")}</th>
               </tr>
            </thead>
            <tbody>
              {payrollData.map((record) => {
                const percentage = record.employee?.salary ? Math.round((record.salary / record.employee.salary) * 100) : 0;
                return (
                  <tr key={record.id} className="border-b">
                    <td className="p-2 border font-bold">{record.employee?.name}</td>
                    <td className="p-2 border text-center">{record.total_hours} {t("hoursUnit")}</td>
                    <td className="p-2 border text-center text-gray-600">{formatAmount(record.employee?.salary || 0)}</td>
                    <td className="p-2 border text-center font-bold text-green-700">{formatAmount(record.salary)}</td>
                    <td className={`p-2 border text-center font-bold ${
                      percentage >= 100 ? "bg-green-100 text-green-800" :
                      percentage >= 75 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                    }`}>
                      {percentage}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {payrollData.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-8">📊 {t("noData")}</div>
      )}
    </div>
  );
}