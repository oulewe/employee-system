"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import toast from "react-hot-toast";

type ReportData = {
  date: string;
  hours: number;
  employees: number;
};

type PayrollData = {
  month: number;
  totalSalary: number;
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

interface ReportsSectionProps {
  adminId: string | null;
}

export default function ReportsSection({ adminId }: ReportsSectionProps) {
  const t = useTranslations("reports");
  const [attendanceData, setAttendanceData] = useState<ReportData[]>([]);
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeChart, setActiveChart] = useState<"attendance" | "payroll">("attendance");

  const fetchAttendanceReport = async () => {
    if (!adminId) return;
    setLoading(true);
    try {
      // جلب آخر 7 أيام
      const today = new Date();
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        return d.toISOString().split("T")[0];
      }).reverse();

      const { data, error } = await supabase
        .from("attendance")
        .select("check_in, total_hours")
        .eq("admin_id", adminId)
        .gte("check_in", last7Days[0])
        .lte("check_in", last7Days[6] + "T23:59:59");

      if (error) throw error;

      const grouped: Record<string, { hours: number; employees: number }> = {};
      last7Days.forEach((date) => {
        grouped[date] = { hours: 0, employees: 0 };
      });

      data?.forEach((record) => {
        const date = record.check_in.split("T")[0];
        if (grouped[date]) {
          grouped[date].hours += record.total_hours || 0;
          grouped[date].employees += 1;
        }
      });

      const formatted = Object.entries(grouped).map(([date, values]) => ({
        date,
        hours: values.hours,
        employees: values.employees,
      }));

      setAttendanceData(formatted);
    } catch (err: any) {
      toast.error("خطأ في جلب تقرير الحضور");
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollReport = async () => {
    if (!adminId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payroll")
        .select("month, salary")
        .eq("admin_id", adminId)
        .order("month", { ascending: true });

      if (error) throw error;

      const grouped: Record<number, number> = {};
      data?.forEach((record) => {
        grouped[record.month] = (grouped[record.month] || 0) + record.salary;
      });

      const formatted = Object.entries(grouped).map(([month, totalSalary]) => ({
        month: parseInt(month),
        totalSalary,
      }));

      setPayrollData(formatted);
    } catch (err: any) {
      toast.error("خطأ في جلب تقرير الرواتب");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminId) {
      fetchAttendanceReport();
      fetchPayrollReport();
    }
  }, [adminId]);

  return (
    <div className="bg-white p-5 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">📊 {t("title")}</h2>

      <div className="flex gap-2 mb-4 border-b">
        <button
          onClick={() => setActiveChart("attendance")}
          className={`py-2 px-4 ${activeChart === "attendance" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
        >
          {t("attendance")}
        </button>
        <button
          onClick={() => setActiveChart("payroll")}
          className={`py-2 px-4 ${activeChart === "payroll" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
        >
          {t("payroll")}
        </button>
      </div>

      {loading && <div className="text-center py-8">⏳ جاري التحميل...</div>}

      {activeChart === "attendance" && attendanceData.length > 0 && (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="hours" fill="#8884d8" name={t("totalHours")} />
              <Bar yAxisId="right" dataKey="employees" fill="#82ca9d" name={t("employeesCount")} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeChart === "payroll" && payrollData.length > 0 && (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={payrollData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="totalSalary" stroke="#8884d8" name={t("totalSalaries")} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeChart === "attendance" && attendanceData.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-8">{t("noData")}</div>
      )}
    </div>
  );
}