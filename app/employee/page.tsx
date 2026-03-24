"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import toast from 'react-hot-toast';

type Employee = {
  id: string;
  name: string;
  phone?: string;
  role?: string;
  pin: string;
  admin_id?: string;
};

type AttendanceRecord = {
  id: string;
  employee_id: string;
  check_in: string;
  check_out: string | null;
};

export default function EmployeePage() {
  const router = useRouter();
  const [user, setUser] = useState<Employee | null>(null);
  const [pinInput, setPinInput] = useState<string>("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentCheckIn, setCurrentCheckIn] = useState<AttendanceRecord | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [locationError, setLocationError] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [todayStats, setTodayStats] = useState({
    checkInTime: "",
    checkOutTime: "",
    totalHours: 0,
  });

  // ✅ تحميل بيانات الموظف من localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsedUser = JSON.parse(stored);
        console.log("✅ User loaded from localStorage:", parsedUser.id);
        console.log("✅ User data:", parsedUser);
        setUser(parsedUser);
        setDebugInfo(`User ID: ${parsedUser.id} | Admin ID: ${parsedUser.admin_id || "غير متوفر"}`);

        if (parsedUser.id) {
          checkOpenAttendance(parsedUser.id);
          loadTodayStats(parsedUser.id);
        }
      } catch (err) {
        console.error("❌ Error parsing stored user:", err);
        localStorage.removeItem("user");
      }
    }
  }, []);

  // ✅ التحقق من وجود تسجيل حضور مفتوح
  const checkOpenAttendance = async (employeeId: string) => {
    try {
      console.log("🔍 Checking open attendance for:", employeeId);

      const { data, error } = await supabase
        .from("attendance")
        .select("id, employee_id, check_in, check_out")
        .eq("employee_id", employeeId)
        .is("check_out", null)
        .limit(1);

      if (error) {
        console.error("❌ Error checking attendance:", error);
        throw error;
      }

      if (data && data.length > 0) {
        setCurrentCheckIn(data[0] as AttendanceRecord);
        console.log("✅ Open attendance found:", data[0].id);
      } else {
        console.log("ℹ️ No open attendance record found");
        setCurrentCheckIn(null);
      }
    } catch (err: any) {
      console.error("❌ Error checking open attendance:", err);
    }
  };

  // ✅ تحميل إحصائيات اليوم
  const loadTodayStats = async (employeeId: string) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

      console.log(`📊 Loading today stats for ${today}`);

      const { data, error } = await supabase
        .from("attendance")
        .select("check_in, check_out")
        .eq("employee_id", employeeId)
        .gte("check_in", today)
        .lt("check_in", tomorrow)
        .order("check_in", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const record = data[0];
        const checkInTime = new Date(record.check_in).toLocaleTimeString("ar-SA", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const checkOutTime = record.check_out
          ? new Date(record.check_out).toLocaleTimeString("ar-SA", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-";

        let totalHours = 0;
        if (record.check_out) {
          const start = new Date(record.check_in).getTime();
          const end = new Date(record.check_out).getTime();
          totalHours = Math.round((end - start) / (1000 * 60 * 60) * 100) / 100;
        }

        setTodayStats({
          checkInTime,
          checkOutTime,
          totalHours,
        });

        console.log("✅ Today stats loaded:", { checkInTime, checkOutTime, totalHours });
      }
    } catch (err: any) {
      console.error("❌ Error loading today stats:", err);
    }
  };

  // ✅ جلب الموقع الجغرافي
  const getLocation = (): Promise<{ lat: string; lng: string }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS غير مدعوم في هذا الجهاز"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          console.log("✅ Location acquired:", { latitude, longitude });
          resolve({
            lat: latitude.toString(),
            lng: longitude.toString(),
          });
        },
        (err) => {
          console.error("❌ Geolocation error:", err);
          const errorMsg =
            err.code === 1
              ? "تم رفض الوصول للموقع الجغرافي"
              : err.code === 2
              ? "تعذر الحصول على الموقع"
              : "خطأ في الوصول للموقع";
          setLocationError(errorMsg);
          reject(new Error(errorMsg));
        }
      );
    });
  };

  // ✅ تسجيل الدخول بواسطة PIN
  const login = async () => {
    if (!pinInput.trim()) {
      toast.error("❌ أدخل PIN");
      return;
    }

    if (pinInput.trim().length < 4) {
      toast.error("❌ PIN يجب أن يكون 4 أرقام على الأقل");
      return;
    }

    setLoading(true);

    try {
      const startTime = performance.now();
      console.log("🔐 Login attempt with PIN:", pinInput.trim());

      const { data, error } = await supabase
        .from("employees")
        .select("id, name, phone, role, pin, admin_id")
        .eq("pin", pinInput.trim())
        .single();

      const endTime = performance.now();
      console.log(`✅ Login query took ${(endTime - startTime).toFixed(2)}ms`);

      if (error) {
        console.error("❌ Login error:", error);
        toast.error("PIN غير صحيح");
        return;
      }

      if (!data || !data.id) {
        toast.error("لم يتم العثور على الموظف");
        return;
      }

      const employee = data as Employee;
      console.log("🔐 Login successful - Employee data:", employee);
      console.log("🔐 Employee UUID:", employee.id);
      console.log("🔐 Admin ID:", employee.admin_id);

      setUser(employee);
      localStorage.setItem("user", JSON.stringify(employee));
      setDebugInfo(`✅ User ID: ${employee.id} | Admin ID: ${employee.admin_id || "غير متوفر"}`);
      toast.success(`✅ مرحباً ${employee.name}`);
      setPinInput("");

      await checkOpenAttendance(employee.id);
      await loadTodayStats(employee.id);
    } catch (err: any) {
      console.error("❌ Login failed:", err);
      toast.error(err.message || "❌ حدث خطأ في تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  // ✅ معالجة اختيار الصورة
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("❌ حجم الصورة كبير جداً (الحد الأقصى 5MB)");
      return;
    }

    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    console.log("📷 Image selected:", file.name);
  };

  // ✅ رفع الصورة إلى Supabase Storage
  const uploadImage = async (employeeId: string): Promise<string> => {
    if (!image) return "";

    try {
      const fileName = `${employeeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
      console.log("📤 Uploading image:", fileName);

      const { error: uploadError } = await supabase.storage
        .from("work-images")
        .upload(fileName, image);

      if (uploadError) {
        console.error("❌ Upload error:", uploadError);
        throw new Error("خطأ في رفع الصورة: " + uploadError.message);
      }

      const { data } = supabase.storage.from("work-images").getPublicUrl(fileName);
      console.log("✅ Image uploaded:", fileName);
      return data.publicUrl;
    } catch (err: any) {
      console.error("❌ Image upload failed:", err);
      throw new Error("فشل رفع الصورة: " + err.message);
    }
  };

  // ✅ تسجيل الحضور
  const checkIn = async () => {
    if (!user) {
      toast.error("❌ لم يتم تسجيل الدخول");
      return;
    }

    setLoading(true);

    try {
      console.log("📍 Check In - Employee ID:", user.id);
      console.log("📍 Admin ID:", user.admin_id);

      // التحقق من عدم وجود سجل مفتوح
      const { data: existing, error: checkError } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", user.id)
        .is("check_out", null);

      if (checkError) {
        console.error("❌ Error checking existing attendance:", checkError);
        throw checkError;
      }

      if (existing && existing.length > 0) {
        toast.error("❌ أنت مسجل بالفعل، يجب تسجيل الخروج أولاً");
        setCurrentCheckIn(existing[0] as AttendanceRecord);
        return;
      }

      // جلب الموقع
      let loc: { lat: string; lng: string };
      try {
        loc = await getLocation();
      } catch (locErr: any) {
        console.warn("⚠️ Location error:", locErr);
        setLocationError(locErr.message);
        const proceed = window.confirm(
          `${locErr.message}\n\nهل تريد المتابعة بدون موقع جغرافي؟`
        );
        if (!proceed) return;
        loc = { lat: "0", lng: "0" };
      }

      let imageUrl = "";
      if (image) {
        imageUrl = await uploadImage(user.id);
      }

      const attendanceData = {
        employee_id: user.id,
        admin_id: user.admin_id,
        check_in: new Date().toISOString(),
        latitude: loc.lat,
        longitude: loc.lng,
        image_url: imageUrl || null,
      };

      console.log("📤 Inserting attendance record:", attendanceData);

      const { data: insertedData, error } = await supabase
        .from("attendance")
        .insert([attendanceData])
        .select("id, employee_id, check_in, check_out");

      if (error) {
        console.error("❌ Insert error:", error);
        throw error;
      }

      console.log("✅ Attendance record inserted:", insertedData);
      toast.success("✅ تم تسجيل الحضور بنجاح");
      setImage(null);
      setImagePreview("");

      if (insertedData && insertedData.length > 0) {
        setCurrentCheckIn(insertedData[0] as AttendanceRecord);
      }

      await loadTodayStats(user.id);
    } catch (err: any) {
      console.error("❌ Check-in failed:", err);
      toast.error(err.message || "❌ حدث خطأ في تسجيل الحضور");
    } finally {
      setLoading(false);
    }
  };

  // ✅ تسجيل الخروج
  const checkOut = async () => {
    if (!user) {
      toast.error("❌ لم يتم تسجيل الدخول");
      return;
    }

    setLoading(true);

    try {
      console.log("🔓 Check Out - Finding record for employee_id:", user.id);

      const { data, error: selectError } = await supabase
        .from("attendance")
        .select("id, employee_id, check_in")
        .eq("employee_id", user.id)
        .is("check_out", null)
        .limit(1);

      if (selectError) {
        console.error("❌ Error finding attendance:", selectError);
        throw selectError;
      }

      if (!data || data.length === 0) {
        console.warn("⚠️ No open attendance record found for:", user.id);
        toast.error("❌ لا يوجد تسجيل حضور لتسجيل الخروج");
        setCurrentCheckIn(null);
        return;
      }

      console.log("📌 Found attendance record:", data[0]);

      const attendanceId = data[0].id;
      const checkInTime = new Date(data[0].check_in);
      const now = new Date();
      const workHours = (
        (now.getTime() - checkInTime.getTime()) /
        (1000 * 60 * 60)
      ).toFixed(2);

      console.log(`✅ Updating check-out for ID: ${attendanceId}, worked hours: ${workHours}`);

      const { error: updateError } = await supabase
        .from("attendance")
        .update({ check_out: now.toISOString() })
        .eq("id", attendanceId);

      if (updateError) {
        console.error("❌ Update error:", updateError);
        throw updateError;
      }

      toast.success(`✅ تم تسجيل الخروج بنجاح (ساعات العمل: ${workHours}h)`);
      setCurrentCheckIn(null);
      console.log("✅ Check-out successful");

      await loadTodayStats(user.id);
    } catch (err: any) {
      console.error("❌ Check-out failed:", err);
      toast.error(err.message || "❌ حدث خطأ في تسجيل الخروج");
    } finally {
      setLoading(false);
    }
  };

  // ✅ تسجيل الخروج من النظام
  const logout = () => {
    if (window.confirm("هل أنت متأكد من رغبتك في تسجيل الخروج؟")) {
      setUser(null);
      localStorage.removeItem("user");
      setPinInput("");
      setImage(null);
      setImagePreview("");
      setCurrentCheckIn(null);
      toast.success("✅ تم تسجيل الخروج بنجاح");
      setDebugInfo("");
      console.log("✅ User logged out");
    }
  };

  // ===== واجهة تسجيل الدخول =====
  if (!user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f0f2f5",
          padding: 20,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: 50,
            borderRadius: 15,
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            maxWidth: 450,
            width: "100%",
            border: "1px solid #e0e0e0",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 15 }}>👤</div>
            <h1 style={{ color: "#2c3e50", marginBottom: 10, fontSize: 28 }}>
              تسجيل دخول الموظف
            </h1>
            <p style={{ color: "#7f8c8d", marginBottom: 0, fontSize: 14 }}>
              أدخل رقم التعريف الخاص بك
            </p>
          </div>

          <div style={{ marginBottom: 25 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                color: "#2c3e50",
                fontSize: 14,
                fontWeight: "bold",
              }}
            >
              🔐 رقم التعريف (PIN)
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="أدخل 4 أرقام أو أكثر"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !loading) {
                    login();
                  }
                }}
                disabled={loading}
                maxLength={6}
                autoFocus
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  paddingRight: 45,
                  border: `2px solid #e0e0e0`,
                  borderRadius: 8,
                  fontSize: 16,
                  boxSizing: "border-box",
                  transition: "border-color 0.3s, box-shadow 0.3s",
                  direction: "ltr",
                  textAlign: "center",
                  letterSpacing: 3,
                  fontWeight: "bold",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#3498db";
                  e.currentTarget.style.boxShadow = "0 0 8px rgba(52, 152, 219, 0.2)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e0e0e0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 15,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  fontSize: 18,
                  cursor: "pointer",
                  color: "#7f8c8d",
                  padding: 5,
                }}
                title={showPassword ? "إخفاء" : "عرض"}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <button
            onClick={login}
            disabled={loading || !pinInput.trim()}
            style={{
              width: "100%",
              padding: 14,
              backgroundColor: loading || !pinInput.trim() ? "#bdc3c7" : "#27ae60",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: "bold",
              cursor: loading || !pinInput.trim() ? "not-allowed" : "pointer",
              transition: "background-color 0.3s, transform 0.1s",
              marginBottom: 15,
            }}
            onMouseEnter={(e) => {
              if (!loading && pinInput.trim()) {
                e.currentTarget.style.backgroundColor = "#229954";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && pinInput.trim()) {
                e.currentTarget.style.backgroundColor = "#27ae60";
              }
            }}
          >
            {loading ? <span>⏳ جاري التحقق...</span> : <span>🚀 تسجيل الدخول</span>}
          </button>

          <div
            style={{
              backgroundColor: "#e3f2fd",
              padding: 14,
              borderRadius: 8,
              fontSize: 12,
              color: "#1565c0",
              border: "1px solid #bbdefb",
              lineHeight: 1.6,
            }}
          >
            <strong>💡 ملاحظات مهمة:</strong>
            <ul style={{ margin: "8px 0 0 20px", paddingLeft: 0 }}>
              <li>احتفظ برقم التعريف آمناً</li>
              <li>اضغط Enter للدخول السريع</li>
              <li>تواصل مع المدير إذا نسيت PIN</li>
              <li>تأكد من تفعيل GPS للحصول على الموقع الدقيق</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ===== واجهة الموظف بعد تسجيل الدخول =====
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f0f2f5",
        padding: 20,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: 20,
          borderRadius: 12,
          marginBottom: 20,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          border: "1px solid #e0e0e0",
        }}
      >
        <div>
          <h1 style={{ color: "#2c3e50", margin: 0, marginBottom: 5 }}>
            👋 مرحباً {user.name}
          </h1>
          <p style={{ color: "#7f8c8d", margin: 0, fontSize: 14 }}>
            {user.role && `الوظيفة: ${user.role}`}
          </p>
          <p style={{ color: "#0066cc", fontSize: 12, margin: "5px 0 0 0" }}>
            User ID: {user.id} | Admin ID: {user.admin_id || "غير متوفر"}
          </p>
        </div>
        <button
          onClick={logout}
          style={{
            padding: "10px 20px",
            backgroundColor: "#e74c3c",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: "bold",
            transition: "background-color 0.3s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#c0392b";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#e74c3c";
          }}
        >
          🚪 خروج
        </button>
      </div>

      {/* حالة الحضور الحالية */}
      <div
        style={{
          backgroundColor: currentCheckIn ? "#e8f5e9" : "#f3e5f5",
          padding: 20,
          borderRadius: 12,
          marginBottom: 20,
          border: `2px solid ${currentCheckIn ? "#4caf50" : "#9c27b0"}`,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 15 }}>
          {currentCheckIn ? "🟢 مسجل دخول" : "🔴 غير مسجل دخول"}
        </div>
        {currentCheckIn && (
          <div style={{ color: "#666", fontSize: 14 }}>
            وقت الدخول: {new Date(currentCheckIn.check_in).toLocaleString("ar-SA")}
          </div>
        )}
      </div>

      {/* إحصائيات اليوم */}
      {todayStats.checkInTime && (
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
              backgroundColor: "#e3f2fd",
              padding: 15,
              borderRadius: 8,
              border: "1px solid #2196f3",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
              وقت الدخول
            </div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#2196f3" }}>
              {todayStats.checkInTime}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#fff3e0",
              padding: 15,
              borderRadius: 8,
              border: "1px solid #ff9800",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
              وقت الخروج
            </div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#ff9800" }}>
              {todayStats.checkOutTime}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#e8f5e9",
              padding: 15,
              borderRadius: 8,
              border: "1px solid #4caf50",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
              ساعات العمل
            </div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#27ae60" }}>
              {todayStats.totalHours > 0 ? `${todayStats.totalHours.toFixed(2)}h` : "-"}
            </div>
          </div>
        </div>
      )}

      {/* قسم رفع الصورة */}
      <div
        style={{
          backgroundColor: "white",
          padding: 20,
          borderRadius: 12,
          marginBottom: 20,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          border: "1px solid #e0e0e0",
        }}
      >
        <h3 style={{ color: "#2c3e50", marginTop: 0, marginBottom: 15 }}>
          📷 رفع صورة العمل (اختياري)
        </h3>

        {imagePreview && (
          <div style={{ marginBottom: 15, textAlign: "center" }}>
            <img
              src={imagePreview}
              alt="معاينة الصورة"
              style={{
                maxWidth: "100%",
                maxHeight: 300,
                borderRadius: 8,
                border: "2px solid #ddd",
              }}
            />
            <p style={{ color: "green", marginTop: 10 }}>
              ✅ تم اختيار الصورة: {image?.name}
            </p>
            <button
              onClick={() => {
                setImage(null);
                setImagePreview("");
              }}
              style={{
                marginTop: 10,
                padding: "8px 16px",
                backgroundColor: "#e74c3c",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ❌ حذف الصورة
            </button>
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          disabled={loading}
          style={{
            width: "100%",
            padding: 15,
            border: "2px dashed #3498db",
            borderRadius: 8,
            cursor: loading ? "not-allowed" : "pointer",
            backgroundColor: "#f9f9f9",
            fontSize: 14,
          }}
        />
        <p style={{ fontSize: 12, color: "#7f8c8d", marginTop: 10 }}>
          الحد الأقصى لحجم الصورة: 5MB
        </p>
      </div>

      {/* أزرار الحضور والخروج */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginBottom: 20 }}>
        <button
          onClick={checkIn}
          disabled={loading}
          style={{
            padding: 20,
            backgroundColor: loading ? "#bdc3c7" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background-color 0.3s, transform 0.1s",
            width: "100%",
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = "#229954";
              e.currentTarget.style.transform = "scale(1.02)";
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = "#28a745";
              e.currentTarget.style.transform = "scale(1)";
            }
          }}
        >
          {loading ? "⏳ جاري التسجيل..." : "🟢 تسجيل الحضور"}
        </button>

        <button
          onClick={checkOut}
          disabled={loading}
          style={{
            padding: 20,
            backgroundColor: loading ? "#bdc3c7" : "#dc3545",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background-color 0.3s, transform 0.1s",
            width: "100%",
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = "#c82333";
              e.currentTarget.style.transform = "scale(1.02)";
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = "#dc3545";
              e.currentTarget.style.transform = "scale(1)";
            }
          }}
        >
          {loading ? "⏳ جاري التسجيل..." : "🔴 تسجيل الخروج"}
        </button>
      </div>

      {/* معلومات المساعدة */}
      <div
        style={{
          backgroundColor: "#e3f2fd",
          padding: 15,
          borderRadius: 8,
          fontSize: 13,
          color: "#1565c0",
          border: "1px solid #bbdefb",
          marginBottom: 15,
        }}
      >
        <strong>💡 نصائح مهمة:</strong>
        <ul style={{ margin: "10px 0 0 20px" }}>
          <li>✅ تأكد من تفعيل خدمة GPS قبل تسجيل الحضور</li>
          <li>✅ الصور اختيارية ولكنها تساعد في توثيق العمل</li>
          <li>✅ تسجيل الخروج ضروري لحساب ساعات العمل</li>
          <li>✅ احفظ PIN الخاص بك في مكان آمن</li>
          <li>✅ سيتم حساب راتبك بناءً على الساعات المسجلة</li>
        </ul>
      </div>

      {/* معلومات التصحيح */}
      {debugInfo && (
        <div
          style={{
            backgroundColor: "#f0f0f0",
            padding: 10,
            borderRadius: 6,
            fontSize: 12,
            color: "#0066cc",
            border: "1px solid #ddd",
            marginTop: 15,
          }}
        >
          <strong>ℹ️ معلومات التصحيح:</strong> {debugInfo}
        </div>
      )}
    </div>
  );
}