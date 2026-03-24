"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "../lib/supabase";
import PayrollSection from "../components/PayrollSection";
import LanguageSwitcher from "../components/LanguageSwitcher";
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

type Employee = {
  id: string;
  name: string;
  phone: string;
  role: string;
  salary: number;
  pin: string;
  team_name: string;
  created_at: string;
};

type Attendance = {
  id: string;
  check_in: string;
  check_out: string | null;
  latitude: string | null;
  longitude: string | null;
  image_url: string | null;
  employee: Employee | null;
};

export default function AdminPage() {
  const t = useTranslations('admin');
  const currency = useTranslations('common')('currency');

  const [adminId, setAdminId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [activeTab, setActiveTab] = useState<"employees" | "attendance" | "payroll">("employees");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [teamName, setTeamName] = useState("");
  const [salary, setSalary] = useState<number>(0);
  const [pin, setPin] = useState("");

  // دالة تسجيل الخروج (مسح الكوكيز و localStorage)
  const logout = () => {
    document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    document.cookie = 'admin_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    localStorage.removeItem('admin_id');
    window.location.href = '/admin/login';
  };

  // قراءة admin_id من localStorage
  useEffect(() => {
    const storedAdminId = localStorage.getItem('admin_id');
    console.log("🔍 Admin ID from localStorage:", storedAdminId);
    if (storedAdminId && typeof storedAdminId === 'string') {
      setAdminId(storedAdminId);
    } else {
      console.warn("⚠️ Admin ID not found in localStorage. Please log in again.");
    }
  }, []);

  // جلب الموظفين
  const fetchEmployees = async () => {
    if (!adminId) {
      console.warn("fetchEmployees: adminId is null");
      return;
    }
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("admin_id", adminId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEmployees(data as Employee[]);
      console.log("✅ Employees fetched:", data?.length || 0);
    } catch (err: any) {
      console.error("❌ Error fetching employees:", err);
      toast.error("خطأ في جلب الموظفين");
    }
  };

  // جلب سجلات الحضور
  const fetchAttendance = async () => {
    if (!adminId) return;
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select(
          `
          id,
          check_in,
          check_out,
          latitude,
          longitude,
          image_url,
          employee:employee_id (
            id,
            name,
            phone,
            role,
            salary,
            pin,
            team_name
          )
        `
        )
        .eq("admin_id", adminId)
        .order("check_in", { ascending: false });

      if (error) throw error;

      const formatted: Attendance[] = (data ?? []).map((att: any) => ({
        id: att.id,
        check_in: att.check_in,
        check_out: att.check_out,
        latitude: att.latitude ?? null,
        longitude: att.longitude ?? null,
        image_url: att.image_url ?? null,
        employee: att.employee ?? null,
      }));

      setAttendance(formatted);
      console.log("✅ Attendance records fetched:", formatted.length);
    } catch (err: any) {
      console.error("❌ Error fetching attendance:", err);
      toast.error("خطأ في جلب الحضور");
    }
  };

  // إضافة موظف جديد
  const addEmployee = async () => {
    console.log("🔍 addEmployee called. adminId =", adminId);
    if (!adminId) {
      toast.error("❌ لم يتم العثور على معرف المدير. يرجى تسجيل الخروج والدخول مرة أخرى.");
      return;
    }
    if (!name || !phone || !role || !teamName || salary <= 0 || !pin) {
      toast.error(t("validationError"));
      return;
    }

    setLoading(true);

    const employeeData = {
      name,
      phone,
      role,
      salary: parseFloat(salary.toString()),
      pin,
      team_name: teamName,
      admin_id: adminId,
    };
    console.log("📤 Attempting to insert:", employeeData);

    try {
      const { data, error } = await supabase
        .from("employees")
        .insert([employeeData])
        .select();

      if (error) {
        console.error("❌ Supabase insert error:", error);
        toast.error(`❌ فشل الإضافة: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        toast.error("❌ تم الإدراج ولكن لم يتم إرجاع البيانات.");
        return;
      }

      console.log("✅ Employee inserted:", data[0]);
      toast.success(t("addSuccess"));
      // تفريغ الحقول
      setName("");
      setPhone("");
      setRole("");
      setTeamName("");
      setSalary(0);
      setPin("");

      await fetchEmployees();
      await fetchAttendance();
    } catch (err: any) {
      console.error("❌ Unexpected error:", err);
      toast.error(`❌ خطأ غير متوقع: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // تحديث يدوي فوري
  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchEmployees(), fetchAttendance()]);
      toast.success(t("refreshSuccess"));
    } catch (err: any) {
      toast.error(t("refreshError") + err.message);
    } finally {
      setRefreshing(false);
    }
  };

  // تصدير attendance إلى Excel
  const exportAttendanceToExcel = () => {
    if (filteredAttendance.length === 0) {
      toast.error("لا توجد بيانات حضور لتصديرها");
      return;
    }
    const dataToExport = filteredAttendance.map(att => ({
      'الموظف': att.employee?.name,
      'الدخول': new Date(att.check_in).toLocaleString(),
      'الخروج': att.check_out ? new Date(att.check_out).toLocaleString() : 'لم يسجل خروج',
      'ساعات العمل': calculateWorkHours(att.check_in, att.check_out),
      'الموقع': att.latitude && att.longitude ? `${att.latitude}, ${att.longitude}` : 'لا يوجد',
      'الصورة': att.image_url || 'لا توجد'
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `attendance_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success("تم تصدير الحضور بنجاح");
  };

  // حساب ساعات العمل
  const calculateWorkHours = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return t("ongoing");
    const start = new Date(checkIn).getTime();
    const end = new Date(checkOut).getTime();
    const hours = ((end - start) / (1000 * 60 * 60)).toFixed(2);
    return `${hours} ${t("workHoursUnit")}`;
  };

  // تصفية السجلات
  const filteredAttendance = attendance.filter((att) => {
    const matchDate = !filterDate || att.check_in.startsWith(filterDate);
    const matchEmployee =
      !filterEmployee || att.employee?.name.includes(filterEmployee);
    return matchDate && matchEmployee;
  });

  // التحديث التلقائي كل 10 ثواني
  useEffect(() => {
    if (adminId) {
      fetchEmployees();
      fetchAttendance();
      const interval = setInterval(() => {
        fetchAttendance();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [adminId]);

  return (
    <div className="p-5 bg-gray-100 min-h-screen font-sans">
      {/* ===== رأس الصفحة ===== */}
      <div className="flex justify-between items-center mb-8">
        <div className="text-center flex-1">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">📊 {t("title")}</h1>
          <p className="text-gray-600">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2 items-center">
          <LanguageSwitcher />
          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition"
          >
            🚪 خروج
          </button>
        </div>
      </div>

      {/* ===== التبويبات ===== */}
      <div className="flex gap-2 mb-6 bg-white border-b border-gray-200 rounded-t-lg px-4">
        <button
          onClick={() => setActiveTab("employees")}
          className={`py-3 px-6 font-bold transition ${
            activeTab === "employees"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-blue-500"
          }`}
        >
          👥 {t("employees")}
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={`py-3 px-6 font-bold transition ${
            activeTab === "attendance"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-blue-500"
          }`}
        >
          📍 {t("attendance")}
        </button>
        <button
          onClick={() => setActiveTab("payroll")}
          className={`py-3 px-6 font-bold transition ${
            activeTab === "payroll"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-blue-500"
          }`}
        >
          💰 {t("payroll")}
        </button>
      </div>

      {/* ===== تبويب الموظفين ===== */}
      {activeTab === "employees" && (
        <>
          {/* قسم إضافة موظف */}
          <div className="bg-white p-5 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-bold border-b-2 border-blue-600 pb-2 mb-4">
              ➕ {t("addEmployee")}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder={t("name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="p-2 border border-gray-300 rounded"
              />
              <input
                type="text"
                placeholder={t("phone")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="p-2 border border-gray-300 rounded"
              />
              <input
                type="text"
                placeholder={t("role")}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="p-2 border border-gray-300 rounded"
              />
              <input
                type="text"
                placeholder={t("team")}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="p-2 border border-gray-300 rounded"
              />
              <input
                type="number"
                placeholder={`${t("salary")} (${currency})`}
                value={salary}
                onChange={(e) => setSalary(parseFloat(e.target.value))}
                className="p-2 border border-gray-300 rounded"
              />
              <input
                type="password"
                placeholder={t("pin")}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="p-2 border border-gray-300 rounded"
              />
            </div>

            <button
              onClick={addEmployee}
              disabled={loading}
              className={`w-full py-2 px-4 rounded font-bold text-white ${
                loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
              } transition`}
            >
              {loading ? t("loading") : `✅ ${t("save")}`}
            </button>
          </div>

          {/* قسم الموظفين */}
          <div className="bg-white p-5 rounded-lg shadow-md">
            <h3 className="text-lg font-bold border-b-2 border-blue-600 pb-2 mb-4">
              👥 {t("employees")} ({employees.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 border text-right">{t("name")}</th>
                    <th className="p-2 border text-right">{t("phone")}</th>
                    <th className="p-2 border text-right">{t("role")}</th>
                    <th className="p-2 border text-right">{t("team")}</th>
                    <th className="p-2 border text-right">{t("salary")}</th>
                    <th className="p-2 border text-right">{t("pin")}</th>
                   </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-gray-500">
                        {t("noData")}
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp) => (
                      <tr key={emp.id} className="border-b">
                        <td className="p-2 border">{emp.name}</td>
                        <td className="p-2 border">{emp.phone}</td>
                        <td className="p-2 border">{emp.role}</td>
                        <td className="p-2 border">{emp.team_name}</td>
                        <td className="p-2 border">{emp.salary} {currency}</td>
                        <td className="p-2 border">
                          <code className="bg-gray-100 p-1 rounded">{emp.pin}</code>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* إحصائيات */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-100 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-800">{employees.length}</div>
              <div className="text-gray-700">{t("totalEmployees")}</div>
            </div>
            <div className="bg-purple-100 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-800">
                {attendance.filter((a) => !a.check_out).length}
              </div>
              <div className="text-gray-700">{t("currentlyWorking")}</div>
            </div>
            <div className="bg-green-100 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-800">
                {attendance.filter((a) => a.check_out).length}
              </div>
              <div className="text-gray-700">{t("finishedWork")}</div>
            </div>
          </div>
        </>
      )}

      {/* ===== تبويب الحضور ===== */}
      {activeTab === "attendance" && (
        <div className="bg-white p-5 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold border-b-2 border-blue-600 pb-2">
              📍 {t("attendanceRecords")} ({filteredAttendance.length})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={refreshData}
                disabled={refreshing}
                className={`py-1 px-3 rounded text-white ${
                  refreshing ? "bg-gray-400" : "bg-teal-600 hover:bg-teal-700"
                } transition`}
              >
                {refreshing ? `🔄 ${t("refreshing")}` : `🔄 ${t("refresh")}`}
              </button>
              <button
                onClick={exportAttendanceToExcel}
                className="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded transition"
              >
                📊 تصدير Excel
              </button>
            </div>
          </div>

          {/* فلاتر البحث */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="p-2 border border-gray-300 rounded"
            />
            <input
              type="text"
              placeholder={t("searchEmployee")}
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="p-2 border border-gray-300 rounded"
            />
          </div>

          {/* الجدول */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border text-right">{t("employee")}</th>
                  <th className="p-2 border text-right">{t("checkIn")}</th>
                  <th className="p-2 border text-right">{t("checkOut")}</th>
                  <th className="p-2 border text-right">{t("workHours")}</th>
                  <th className="p-2 border text-right">{t("location")}</th>
                  <th className="p-2 border text-right">{t("image")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-500">
                      {t("noData")}
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((att) => (
                    <tr key={att.id} className="border-b">
                      <td className="p-2 border font-bold">{att.employee?.name ?? t("noData")}</td>
                      <td className="p-2 border">{new Date(att.check_in).toLocaleString()}</td>
                      <td className="p-2 border">
                        {att.check_out ? new Date(att.check_out).toLocaleString() : t("noCheckOut")}
                      </td>
                      <td className="p-2 border font-bold" style={{ color: att.check_out ? "#28a745" : "#ff6b6b" }}>
                        {calculateWorkHours(att.check_in, att.check_out)}
                      </td>
                      <td className="p-2 border text-sm">
                        {att.latitude && att.longitude ? (
                          <a
                            href={`https://maps.google.com/?q=${att.latitude},${att.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            📍 {t("locationLink")}
                          </a>
                        ) : (
                          t("noLocation")
                        )}
                      </td>
                      <td className="p-2 border">
                        {att.image_url ? (
                          <a href={att.image_url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={att.image_url}
                              width={50}
                              height={50}
                              className="rounded cursor-pointer"
                              alt={t("workImageAlt")}
                            />
                          </a>
                        ) : (
                          t("noImage")
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== تبويب الرواتب ===== */}
      {activeTab === "payroll" && <PayrollSection adminId={adminId} />}
    </div>
  );
}