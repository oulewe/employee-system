"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  calculateAllEmployeesPayroll,
  fetchMonthlyPayroll,
  fetchAllPayroll,
} from "../lib/payrollCalculations";

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

// دالة تنسيق العملة حسب اللغة
const formatCurrency = (amount: number, locale: string): string => {
  // دعم العربية والفرنسية والإنجليزية
  let localeMap: Record<string, string> = {
    ar: "ar-MR",
    fr: "fr-MR",
    en: "en-MR",
  };
  const usedLocale = localeMap[locale] || "ar-MR";
  return new Intl.NumberFormat(usedLocale, {
    style: "currency",
    currency: "MRU",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function PayrollSection() {
  const t = useTranslations("payroll");
  const locale = useLocale();

  const [payrollData, setPayrollData] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // ✅ حساب رواتب جميع الموظفين
  const handleCalculatePayroll = async () => {
    setError("");
    setSuccess("");
    setCalculating(true);

    try {
      const year = new Date().getFullYear();
      const results = await calculateAllEmployeesPayroll(selectedMonth, year);

      if (results.length === 0) {
        setError(t("calculationFailed"));
        return;
      }

      const successCount = results.filter((r) => r.success).length;
      setSuccess(t("calculationSuccess", { count: successCount }));

      // جلب البيانات المحدثة
      await handleFetchPayroll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCalculating(false);
    }
  };

  // ✅ جلب رواتب الشهر المحدد
  const handleFetchPayroll = async () => {
    setError("");
    setLoading(true);

    try {
      const data = await fetchMonthlyPayroll(selectedMonth);
      setPayrollData(data as PayrollRecord[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // تحميل البيانات عند تغيير الشهر
  useEffect(() => {
    handleFetchPayroll();
  }, [selectedMonth]);

  // ✅ حساب إجمالي الرواتب
  const totalSalaries = payrollData.reduce((sum, p) => sum + p.salary, 0);
  const totalHours = payrollData.reduce((sum, p) => sum + p.total_hours, 0);

  return (
    <div
      style={{
        backgroundColor: "white",
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ color: "#2c3e50", marginTop: 0, marginBottom: 20 }}>
        💰 {t("title")}
      </h2>

      {/* الرسائل */}
      {error && (
        <div
          style={{
            backgroundColor: "#f8d7da",
            color: "#721c24",
            padding: 12,
            borderRadius: 6,
            marginBottom: 15,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>❌</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          style={{
            backgroundColor: "#d4edda",
            color: "#155724",
            padding: 12,
            borderRadius: 6,
            marginBottom: 15,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>✅</span>
          <span>{success}</span>
        </div>
      )}

      {/* اختيار الشهر */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "200px 1fr 1fr",
          gap: 15,
          marginBottom: 20,
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              marginBottom: 8,
              fontWeight: "bold",
              color: "#2c3e50",
            }}
          >
            {t("selectMonth")}
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #ddd",
              borderRadius: 4,
              fontSize: 14,
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>
                {new Date(2024, m - 1).toLocaleString(locale === "ar" ? "ar-SA" : locale === "fr" ? "fr-FR" : "en-US", {
                  month: "long",
                })}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCalculatePayroll}
          disabled={calculating}
          style={{
            padding: 10,
            marginTop: 25,
            backgroundColor: calculating ? "#bdc3c7" : "#27ae60",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: calculating ? "not-allowed" : "pointer",
            fontWeight: "bold",
            fontSize: 14,
          }}
        >
          {calculating ? t("calculating") : t("calculateButton")}
        </button>

        <button
          onClick={handleFetchPayroll}
          disabled={loading}
          style={{
            padding: 10,
            marginTop: 25,
            backgroundColor: loading ? "#bdc3c7" : "#3498db",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "bold",
            fontSize: 14,
          }}
        >
          {loading ? t("refreshing") : t("refreshButton")}
        </button>
      </div>

      {/* ملخص الرواتب */}
      {payrollData.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 15,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              backgroundColor: "#e8f5e9",
              padding: 15,
              borderRadius: 8,
              border: "1px solid #4caf50",
            }}
          >
            <div style={{ fontSize: 12, color: "#666", marginBottom: 5 }}>
              {t("totalSalaries")}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: "#27ae60",
              }}
            >
              {formatCurrency(totalSalaries, locale)}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#e3f2fd",
              padding: 15,
              borderRadius: 8,
              border: "1px solid #2196f3",
            }}
          >
            <div style={{ fontSize: 12, color: "#666", marginBottom: 5 }}>
              {t("totalHours")}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: "#2196f3",
              }}
            >
              {totalHours} {t("hoursUnit")}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#fff3e0",
              padding: 15,
              borderRadius: 8,
              border: "1px solid #ff9800",
            }}
          >
            <div style={{ fontSize: 12, color: "#666", marginBottom: 5 }}>
              {t("employeeCount")}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: "#ff9800",
              }}
            >
              {payrollData.length} {t("employeesUnit")}
            </div>
          </div>
        </div>
      )}

      {/* جدول الرواتب */}
      {payrollData.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f0f0f0" }}>
                <th
                  style={{
                    padding: 12,
                    border: "1px solid #ddd",
                    textAlign: "right",
                    fontWeight: "bold",
                  }}
                >
                  {t("employeeName")}
                </th>
                <th
                  style={{
                    padding: 12,
                    border: "1px solid #ddd",
                    textAlign: "right",
                    fontWeight: "bold",
                  }}
                >
                  {t("workedHours")}
                </th>
                <th
                  style={{
                    padding: 12,
                    border: "1px solid #ddd",
                    textAlign: "right",
                    fontWeight: "bold",
                  }}
                >
                  {t("baseSalary")}
                </th>
                <th
                  style={{
                    padding: 12,
                    border: "1px solid #ddd",
                    textAlign: "right",
                    fontWeight: "bold",
                  }}
                >
                  {t("earnedSalary")}
                </th>
                <th
                  style={{
                    padding: 12,
                    border: "1px solid #ddd",
                    textAlign: "right",
                    fontWeight: "bold",
                  }}
                >
                  {t("percentage")}
                </th>
               </tr>
            </thead>
            <tbody>
              {payrollData.map((record) => {
                const percentage = record.employee?.salary
                  ? Math.round((record.salary / record.employee.salary) * 100)
                  : 0;

                return (
                  <tr key={record.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td
                      style={{
                        padding: 12,
                        border: "1px solid #ddd",
                        fontWeight: "bold",
                      }}
                    >
                      {record.employee?.name}
                    </td>
                    <td
                      style={{
                        padding: 12,
                        border: "1px solid #ddd",
                        textAlign: "center",
                      }}
                    >
                      {record.total_hours} {t("hoursUnit")}
                    </td>
                    <td
                      style={{
                        padding: 12,
                        border: "1px solid #ddd",
                        textAlign: "center",
                        color: "#666",
                      }}
                    >
                      {formatCurrency(record.employee?.salary || 0, locale)}
                    </td>
                    <td
                      style={{
                        padding: 12,
                        border: "1px solid #ddd",
                        textAlign: "center",
                        fontWeight: "bold",
                        color: "#27ae60",
                        fontSize: 14,
                      }}
                    >
                      {formatCurrency(record.salary, locale)}
                    </td>
                    <td
                      style={{
                        padding: 12,
                        border: "1px solid #ddd",
                        textAlign: "center",
                        backgroundColor:
                          percentage >= 100
                            ? "#d4edda"
                            : percentage >= 75
                            ? "#fff3cd"
                            : "#f8d7da",
                        color:
                          percentage >= 100
                            ? "#155724"
                            : percentage >= 75
                            ? "#856404"
                            : "#721c24",
                        fontWeight: "bold",
                        borderRadius: 4,
                      }}
                    >
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
        <div
          style={{
            textAlign: "center",
            color: "#999",
            padding: 40,
            backgroundColor: "#f9f9f9",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 10 }}>📊</div>
          {t("noData")}
        </div>
      )}
    </div>
  );
}