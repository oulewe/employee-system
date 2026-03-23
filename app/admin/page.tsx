"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getCookie } from "cookies-next";
import { supabase } from "../lib/supabase";
import PayrollSection from "../components/PayrollSection";
import LanguageSwitcher from "../components/LanguageSwitcher";

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

  // دالة تسجيل الخروج (مسح الكوكيز وإعادة التوجيه)
  const logout = () => {
    document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    document.cookie = 'admin_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    window.location.href = '/admin/login';
  };

  // قراءة admin_id من الكوكي
  useEffect(() => {
    const id = getCookie('admin_id');
    console.log("🔍 Admin ID from cookie:", id);
    if (id && typeof id === 'string') {
      setAdminId(id);
    } else {
      console.warn("⚠️ Admin ID not found in cookie. Please log in again.");
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
    }
  };

  // إضافة موظف جديد (محسّنة مع رسائل خطأ)
  const addEmployee = async () => {
    console.log("🔍 addEmployee called. adminId =", adminId);
    if (!adminId) {
      alert("❌ لم يتم العثور على معرف المدير. يرجى تسجيل الخروج والدخول مرة أخرى.");
      return;
    }
    if (!name || !phone || !role || !teamName || salary <= 0 || !pin) {
      alert(t("validationError"));
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
        .select(); // .select() ليعيد السجل المُضاف

      if (error) {
        console.error("❌ Supabase insert error:", error);
        alert(`❌ فشل الإضافة: ${error.message}\n${error.details || ''}`);
        return;
      }

      if (!data || data.length === 0) {
        alert("❌ تم الإدراج ولكن لم يتم إرجاع البيانات.");
        return;
      }

      console.log("✅ Employee inserted:", data[0]);
      alert(t("addSuccess"));
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
      alert(`❌ خطأ غير متوقع: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // تحديث يدوي فوري
  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchEmployees(), fetchAttendance()]);
      alert(t("refreshSuccess"));
    } catch (err: any) {
      alert(t("refreshError") + err.message);
    } finally {
      setRefreshing(false);
    }
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
    <div
      style={{
        padding: 20,
        fontFamily: "Arial",
        backgroundColor: "#f9f9f9",
        minHeight: "100vh",
      }}
    >
      {/* ===== رأس الصفحة ===== */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <div style={{ textAlign: "center", flex: 1 }}>
          <h1 style={{ color: "#333", marginBottom: 10 }}>📊 {t("title")}</h1>
          <p style={{ color: "#666" }}>{t("subtitle")}</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <LanguageSwitcher />
          <button
            onClick={logout}
            style={{
              padding: "8px 16px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🚪 خروج
          </button>
        </div>
      </div>

      {/* ===== التبويبات ===== */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 30,
          borderBottom: "2px solid #ddd",
          backgroundColor: "white",
          padding: "0 20px",
          borderRadius: "8px 8px 0 0",
        }}
      >
        <button
          onClick={() => setActiveTab("employees")}
          style={{
            padding: "15px 25px",
            backgroundColor: activeTab === "employees" ? "#007bff" : "transparent",
            color: activeTab === "employees" ? "white" : "#666",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: "bold",
            borderBottom: activeTab === "employees" ? "3px solid #007bff" : "none",
          }}
        >
          👥 {t("employees")}
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          style={{
            padding: "15px 25px",
            backgroundColor: activeTab === "attendance" ? "#007bff" : "transparent",
            color: activeTab === "attendance" ? "white" : "#666",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: "bold",
            borderBottom: activeTab === "attendance" ? "3px solid #007bff" : "none",
          }}
        >
          📍 {t("attendance")}
        </button>
        <button
          onClick={() => setActiveTab("payroll")}
          style={{
            padding: "15px 25px",
            backgroundColor: activeTab === "payroll" ? "#007bff" : "transparent",
            color: activeTab === "payroll" ? "white" : "#666",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: "bold",
            borderBottom: activeTab === "payroll" ? "3px solid #007bff" : "none",
          }}
        >
          💰 {t("payroll")}
        </button>
      </div>

      {/* ===== تبويب الموظفين ===== */}
      {activeTab === "employees" && (
        <>
          {/* قسم إضافة موظف */}
          <div
            style={{
              backgroundColor: "white",
              padding: 20,
              borderRadius: 8,
              marginBottom: 30,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <h2
              style={{
                color: "#333",
                borderBottom: "2px solid #007bff",
                paddingBottom: 10,
              }}
            >
              ➕ {t("addEmployee")}
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 15,
                marginTop: 20,
              }}
            >
              <input
                type="text"
                placeholder={t("name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  padding: 10,
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: 14,
                }}
              />
              <input
                type="text"
                placeholder={t("phone")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  padding: 10,
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: 14,
                }}
              />
              <input
                type="text"
                placeholder={t("role")}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  padding: 10,
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: 14,
                }}
              />
              <input
                type="text"
                placeholder={t("team")}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                style={{
                  padding: 10,
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: 14,
                }}
              />
              <input
                type="number"
                placeholder={`${t("salary")} (${currency})`}
                value={salary}
                onChange={(e) => setSalary(parseFloat(e.target.value))}
                style={{
                  padding: 10,
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: 14,
                }}
              />
              <input
                type="password"
                placeholder={t("pin")}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                style={{
                  padding: 10,
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: 14,
                }}
              />
            </div>

            <button
              onClick={addEmployee}
              disabled={loading}
              style={{
                marginTop: 20,
                padding: "12px 30px",
                backgroundColor: loading ? "#ccc" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: 4,
                fontSize: 16,
                fontWeight: "bold",
                cursor: loading ? "not-allowed" : "pointer",
                width: "100%",
              }}
            >
              {loading ? t("loading") : `✅ ${t("save")}`}
            </button>
          </div>

          {/* قسم الموظفين */}
          <div
            style={{
              backgroundColor: "white",
              padding: 20,
              borderRadius: 8,
              marginBottom: 30,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <h3
              style={{
                color: "#333",
                borderBottom: "2px solid #007bff",
                paddingBottom: 10,
              }}
            >
              👥 {t("employees")} ({employees.length})
            </h3>

            <div style={{ overflowX: "auto", marginTop: 15 }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f0f0f0" }}>
                    <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>{t("name")}</th>
                    <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>{t("phone")}</th>
                    <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>{t("role")}</th>
                    <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>{t("team")}</th>
                    <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>{t("salary")}</th>
                    <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>{t("pin")}</th>
                   </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#999" }}>
                        {t("noData")}
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp) => (
                      <tr key={emp.id} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: 10, border: "1px solid #ddd" }}>{emp.name}</td>
                        <td style={{ padding: 10, border: "1px solid #ddd" }}>{emp.phone}</td>
                        <td style={{ padding: 10, border: "1px solid #ddd" }}>{emp.role}</td>
                        <td style={{ padding: 10, border: "1px solid #ddd" }}>{emp.team_name}</td>
                        <td style={{ padding: 10, border: "1px solid #ddd" }}>{emp.salary} {currency}</td>
                        <td style={{ padding: 10, border: "1px solid #ddd" }}>
                          <code style={{ backgroundColor: "#f0f0f0", padding: 4, borderRadius: 3 }}>{emp.pin}</code>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* إحصائيات */}
          <div
            style={{
              marginTop: 30,
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 15,
            }}
          >
            <div style={{ backgroundColor: "#e3f2fd", padding: 20, borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#1976d2" }}>{employees.length}</div>
              <div style={{ color: "#666", marginTop: 5 }}>{t("totalEmployees")}</div>
            </div>
            <div style={{ backgroundColor: "#f3e5f5", padding: 20, borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#7b1fa2" }}>{attendance.filter((a) => !a.check_out).length}</div>
              <div style={{ color: "#666", marginTop: 5 }}>{t("currentlyWorking")}</div>
            </div>
            <div style={{ backgroundColor: "#e8f5e9", padding: 20, borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#388e3c" }}>{attendance.filter((a) => a.check_out).length}</div>
              <div style={{ color: "#666", marginTop: 5 }}>{t("finishedWork")}</div>
            </div>
          </div>
        </>
      )}

      {/* ===== تبويب الحضور ===== */}
      {activeTab === "attendance" && (
        <div
          style={{
            backgroundColor: "white",
            padding: 20,
            borderRadius: 8,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            <h3
              style={{
                color: "#333",
                borderBottom: "2px solid #007bff",
                paddingBottom: 10,
                flex: 1,
              }}
            >
              📍 {t("attendanceRecords")} ({filteredAttendance.length})
            </h3>
            <button
              onClick={refreshData}
              disabled={refreshing}
              style={{
                padding: "10px 20px",
                backgroundColor: refreshing ? "#ccc" : "#17a2b8",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: refreshing ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: "bold",
              }}
            >
              {refreshing ? `🔄 ${t("refreshing")}` : `🔄 ${t("refresh")}`}
            </button>
          </div>

          {/* فلاتر البحث */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 15,
              marginBottom: 20,
            }}
          >
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 4,
                fontSize: 14,
              }}
            />
            <input
              type="text"
              placeholder={t("searchEmployee")}
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              style={{
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 4,
                fontSize: 14,
              }}
            />
          </div>

          {/* الجدول */}
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
                  <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>{t("employee")}</th>
                  <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>{t("checkIn")}</th>
                  <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>{t("checkOut")}</th>
                  <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>{t("workHours")}</th>
                  <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>{t("location")}</th>
                  <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>{t("image")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#999" }}>
                      {t("noData")}
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((att) => (
                    <tr key={att.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: 10, border: "1px solid #ddd", fontWeight: "bold" }}>
                        {att.employee?.name ?? t("noData")}
                      </td>
                      <td style={{ padding: 10, border: "1px solid #ddd" }}>
                        {new Date(att.check_in).toLocaleString()}
                      </td>
                      <td style={{ padding: 10, border: "1px solid #ddd" }}>
                        {att.check_out
                          ? new Date(att.check_out).toLocaleString()
                          : t("noCheckOut")}
                      </td>
                      <td
                        style={{
                          padding: 10,
                          border: "1px solid #ddd",
                          fontWeight: "bold",
                          color: att.check_out ? "#28a745" : "#ff6b6b",
                        }}
                      >
                        {calculateWorkHours(att.check_in, att.check_out)}
                      </td>
                      <td style={{ padding: 10, border: "1px solid #ddd", fontSize: 12 }}>
                        {att.latitude && att.longitude ? (
                          <a
                            href={`https://maps.google.com/?q=${att.latitude},${att.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#007bff", textDecoration: "none" }}
                          >
                            📍 {t("locationLink")}
                          </a>
                        ) : (
                          t("noLocation")
                        )}
                      </td>
                      <td style={{ padding: 10, border: "1px solid #ddd" }}>
                        {att.image_url ? (
                          <a href={att.image_url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={att.image_url}
                              width={50}
                              height={50}
                              style={{ borderRadius: 4, cursor: "pointer" }}
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