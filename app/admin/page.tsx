"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import PayrollSection from "../components/PayrollSection";

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

  // جلب الموظفين
  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
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

  // إضافة موظف جديد
  const addEmployee = async () => {
    if (!name || !phone || !role || !teamName || salary <= 0 || !pin) {
      alert("❌ أدخل جميع البيانات بشكل صحيح");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("employees").insert([
        {
          name,
          phone,
          role,
          salary: parseFloat(salary.toString()),
          pin,
          team_name: teamName,
        },
      ]);

      if (error) throw error;

      alert("✅ تم إضافة الموظف بنجاح");
      setName("");
      setPhone("");
      setRole("");
      setTeamName("");
      setSalary(0);
      setPin("");

      await fetchEmployees();
      await fetchAttendance();
    } catch (err: any) {
      alert("❌ خطأ: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // تحديث يدوي فوري
  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchEmployees(), fetchAttendance()]);
      alert("✅ تم تحديث البيانات بنجاح");
    } catch (err: any) {
      alert("❌ خطأ في التحديث: " + err.message);
    } finally {
      setRefreshing(false);
    }
  };

  // حساب ساعات العمل
  const calculateWorkHours = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return "جارٍ";
    const start = new Date(checkIn).getTime();
    const end = new Date(checkOut).getTime();
    const hours = ((end - start) / (1000 * 60 * 60)).toFixed(2);
    return `${hours} ساعة`;
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
    fetchEmployees();
    fetchAttendance();

    const interval = setInterval(() => {
      fetchAttendance();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

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
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <h1 style={{ color: "#333", marginBottom: 10 }}>📊 لوحة تحكم المدير</h1>
        <p style={{ color: "#666" }}>نظام إدارة فرق العمل الميدانية</p>
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
          👥 الموظفين
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
          📍 الحضور
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
          💰 الرواتب
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
              ➕ إضافة موظف جديد
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
                placeholder="الاسم"
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
                placeholder="رقم الهاتف"
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
                placeholder="الوظيفة"
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
                placeholder="الفريق"
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
                placeholder="الراتب (أوقية)"
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
                placeholder="PIN"
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
              {loading ? "⏳ جاري الإضافة..." : "✅ إضافة الموظف"}
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
              👥 الموظفين ({employees.length})
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
                    <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>الاسم</th>
                    <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>الهاتف</th>
                    <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>الوظيفة</th>
                    <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>الفريق</th>
                    <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>الراتب</th>
                    <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>PIN</th>
                   </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#999" }}>
                        لا توجد موظفين حالياً
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp) => (
                      <tr key={emp.id} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: 10, border: "1px solid #ddd" }}>{emp.name}</td>
                        <td style={{ padding: 10, border: "1px solid #ddd" }}>{emp.phone}</td>
                        <td style={{ padding: 10, border: "1px solid #ddd" }}>{emp.role}</td>
                        <td style={{ padding: 10, border: "1px solid #ddd" }}>{emp.team_name}</td>
                        <td style={{ padding: 10, border: "1px solid #ddd" }}>{emp.salary} أوقية</td>
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
              <div style={{ color: "#666", marginTop: 5 }}>إجمالي الموظفين</div>
            </div>
            <div style={{ backgroundColor: "#f3e5f5", padding: 20, borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#7b1fa2" }}>{attendance.filter((a) => !a.check_out).length}</div>
              <div style={{ color: "#666", marginTop: 5 }}>عاملون حالياً</div>
            </div>
            <div style={{ backgroundColor: "#e8f5e9", padding: 20, borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#388e3c" }}>{attendance.filter((a) => a.check_out).length}</div>
              <div style={{ color: "#666", marginTop: 5 }}>انتهوا من العمل</div>
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
              📍 سجلات الحضور ({filteredAttendance.length})
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
              {refreshing ? "🔄 جاري التحديث..." : "🔄 تحديث الآن"}
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
              placeholder="ابحث عن موظف..."
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
                  <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>الموظف</th>
                  <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>الدخول</th>
                  <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>الخروج</th>
                  <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>ساعات العمل</th>
                  <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>الموقع</th>
                  <th style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>الصورة</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#999" }}>
                      لا توجد سجلات حضور
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((att) => (
                    <tr key={att.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: 10, border: "1px solid #ddd", fontWeight: "bold" }}>
                        {att.employee?.name ?? "مجهول"}
                      </td>
                      <td style={{ padding: 10, border: "1px solid #ddd" }}>
                        {new Date(att.check_in).toLocaleString()}
                      </td>
                      <td style={{ padding: 10, border: "1px solid #ddd" }}>
                        {att.check_out
                          ? new Date(att.check_out).toLocaleString()
                          : "🔴 لم يسجل خروج"}
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
                            📍 الموقع
                          </a>
                        ) : (
                          "لا يوجد"
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
                              alt="صورة العمل"
                            />
                          </a>
                        ) : (
                          "لا توجد"
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
      {activeTab === "payroll" && <PayrollSection />}
    </div>
  );
}