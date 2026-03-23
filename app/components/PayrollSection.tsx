"use client";

import { useState, useEffect } from "react";
import {
  calculateAllEmployeesPayroll,
  fetchMonthlyPayroll,
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

// دالة تنسيق العملة (أوقية موريتانية)
const formatMRU = (amount: number): string => {
  return new Intl.NumberFormat("ar-MR", {
    style: "currency",
    currency: "MRU",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

interface PayrollSectionProps {
  adminId: string | null;
}

export default function PayrollSection({ adminId }: PayrollSectionProps) {
  const [payrollData, setPayrollData] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // حساب رواتب جميع الموظفين
  const handleCalculatePayroll = async () => {
    if (!adminId) return;
    setError("");
    setSuccess("");
    setCalculating(true);

    try {
      const year = new Date().getFullYear();
      const results = await calculateAllEmployeesPayroll(selectedMonth, year, adminId);

      if (results.length === 0) {
        setError("فشل حساب الرواتب");
        return;
      }

      const successCount = results.filter((r) => r.success).length;
      setSuccess(`✅ تم حساب رواتب ${successCount} موظف بنجاح`);

      await handleFetchPayroll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCalculating(false);
    }
  };

  // جلب رواتب الشهر المحدد
  const handleFetchPayroll = async () => {
    if (!adminId) return;
    setError("");
    setLoading(true);

    try {
      const data = await fetchMonthlyPayroll(selectedMonth, adminId);
      setPayrollData(data as PayrollRecord[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminId) {
      handleFetchPayroll();
    }
  }, [selectedMonth, adminId]);

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
        💰 إدارة الرواتب (أوقية موريتانية)
      </h2>

      {error && (
        <div
          style={{
            backgroundColor: "#f8d7da",
            color: "#721c24",
            padding: 12,
            borderRadius: 6,
            marginBottom: 15,
          }}
        >
          ❌ {error}
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
          }}
        >
          ✅ {success}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "200px 1fr 1fr",
          gap: 15,
          marginBottom: 20,
        }}
      >
        <div>
          <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
            اختر الشهر
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #ddd",
              borderRadius: 4,
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>
                {new Date(2024, m - 1).toLocaleString("ar-SA", { month: "long" })}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCalculatePayroll}
          disabled={calculating || !adminId}
          style={{
            padding: 10,
            marginTop: 25,
            backgroundColor: (calculating || !adminId) ? "#bdc3c7" : "#27ae60",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: (calculating || !adminId) ? "not-allowed" : "pointer",
          }}
        >
          {calculating ? "⏳ جاري الحساب..." : "🧮 حساب الرواتب"}
        </button>

        <button
          onClick={handleFetchPayroll}
          disabled={loading || !adminId}
          style={{
            padding: 10,
            marginTop: 25,
            backgroundColor: (loading || !adminId) ? "#bdc3c7" : "#3498db",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: (loading || !adminId) ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "⏳ جاري التحديث..." : "🔄 تحديث"}
        </button>
      </div>

      {payrollData.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 15,
            marginBottom: 20,
          }}
        >
          <div style={{ backgroundColor: "#e8f5e9", padding: 15, borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#666" }}>إجمالي الرواتب</div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#27ae60" }}>
              {formatMRU(totalSalaries)}
            </div>
          </div>
          <div style={{ backgroundColor: "#e3f2fd", padding: 15, borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#666" }}>إجمالي الساعات</div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#2196f3" }}>
              {totalHours} ساعة
            </div>
          </div>
          <div style={{ backgroundColor: "#fff3e0", padding: 15, borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#666" }}>عدد الموظفين</div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#ff9800" }}>
              {payrollData.length} موظف
            </div>
          </div>
        </div>
      )}

      {payrollData.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: "#f0f0f0" }}>
                <th style={{ padding: 12, border: "1px solid #ddd", textAlign: "right" }}>الموظف</th>
                <th style={{ padding: 12, border: "1px solid #ddd", textAlign: "right" }}>الساعات المعمول بها</th>
                <th style={{ padding: 12, border: "1px solid #ddd", textAlign: "right" }}>الراتب الشهري الأساسي</th>
                <th style={{ padding: 12, border: "1px solid #ddd", textAlign: "right" }}>الراتب المستحق</th>
                <th style={{ padding: 12, border: "1px solid #ddd", textAlign: "right" }}>النسبة المئوية</th>
                </tr>
            </thead>
            <tbody>
              {payrollData.map((record) => {
                const percentage = record.employee?.salary
                  ? Math.round((record.salary / record.employee.salary) * 100)
                  : 0;
                return (
                  <tr key={record.id}>
                    <td style={{ padding: 12, border: "1px solid #ddd", fontWeight: "bold" }}>
                      {record.employee?.name}
                    </td>
                    <td style={{ padding: 12, border: "1px solid #ddd", textAlign: "center" }}>
                      {record.total_hours} ساعة
                    </td>
                    <td style={{ padding: 12, border: "1px solid #ddd", textAlign: "center", color: "#666" }}>
                      {formatMRU(record.employee?.salary || 0)}
                    </td>
                    <td style={{ padding: 12, border: "1px solid #ddd", textAlign: "center", fontWeight: "bold", color: "#27ae60" }}>
                      {formatMRU(record.salary)}
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
        <div style={{ textAlign: "center", color: "#999", padding: 40 }}>
          📊 لا توجد بيانات رواتب للشهر المحدد
        </div>
      )}
    </div>
  );
}