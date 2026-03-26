"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
        className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-5"
      >
        <div
          className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Image 
                src="https://www.rimatel.mr/images/about/RIMATEL.png"
                alt="شعار Rimatel"
                width={60}
                height={60}
                className="object-contain"
                unoptimized
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              تسجيل دخول الموظف
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
              أدخل رقم التعريف الخاص بك
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2 font-bold">
              🔐 رقم التعريف (PIN)
            </label>
            <div className="relative">
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
                className="w-full p-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-center tracking-wider font-bold"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <button
            onClick={login}
            disabled={loading || !pinInput.trim()}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition disabled:opacity-50"
          >
            {loading ? "⏳ جاري التحقق..." : "🚀 تسجيل الدخول"}
          </button>

          <div className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
            <p>💡 احتفظ برقم التعريف آمناً</p>
            <p>5 محاولات خاطئة = قفل لمدة 5 دقائق</p>
          </div>
        </div>
      </div>
    );
  }

  // ===== واجهة الموظف بعد تسجيل الدخول =====
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-5 font-sans">
      {/* رأس الصفحة */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image 
              src="https://www.rimatel.mr/images/about/RIMATEL.png"
              alt="شعار Rimatel"
              width={50}
              height={50}
              className="object-contain"
              unoptimized
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">👋 مرحباً {user.name}</h1>
              <p className="text-gray-600 dark:text-gray-400">{user.role && `الوظيفة: ${user.role}`}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                User ID: {user.id} | Admin ID: {user.admin_id || "غير متوفر"}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
          >
            🚪 خروج
          </button>
        </div>
      </div>

      {/* حالة الحضور الحالية */}
      <div
        className={`p-5 rounded-lg shadow-md mb-6 text-center ${
          currentCheckIn 
            ? "bg-green-50 dark:bg-green-900 border border-green-500" 
            : "bg-purple-50 dark:bg-purple-900 border border-purple-500"
        }`}
      >
        <div className="text-2xl font-bold mb-2">
          {currentCheckIn ? "🟢 مسجل دخول" : "🔴 غير مسجل دخول"}
        </div>
        {currentCheckIn && (
          <div className="text-gray-600 dark:text-gray-300">
            وقت الدخول: {new Date(currentCheckIn.check_in).toLocaleString("ar-SA")}
          </div>
        )}
      </div>

      {/* إحصائيات اليوم */}
      {todayStats.checkInTime && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg text-center">
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">وقت الدخول</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-300">{todayStats.checkInTime}</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg text-center">
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">وقت الخروج</div>
            <div className="text-xl font-bold text-orange-600 dark:text-orange-300">{todayStats.checkOutTime}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg text-center">
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">ساعات العمل</div>
            <div className="text-xl font-bold text-green-600 dark:text-green-300">
              {todayStats.totalHours > 0 ? `${todayStats.totalHours.toFixed(2)}h` : "-"}
            </div>
          </div>
        </div>
      )}

      {/* قسم رفع الصورة */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3">📷 رفع صورة العمل (اختياري)</h3>

        {imagePreview && (
          <div className="mb-4 text-center">
            <img
              src={imagePreview}
              alt="معاينة الصورة"
              className="max-w-full max-h-64 rounded-lg border-2 border-gray-300 dark:border-gray-600 mx-auto"
            />
            <p className="text-green-600 dark:text-green-400 mt-2">✅ تم اختيار الصورة: {image?.name}</p>
            <button
              onClick={() => {
                setImage(null);
                setImagePreview("");
              }}
              className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded-lg transition"
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
          className="w-full p-3 border-2 border-dashed border-blue-500 dark:border-blue-400 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">الحد الأقصى لحجم الصورة: 5MB</p>
      </div>

      {/* أزرار الحضور والخروج */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={checkIn}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg transition disabled:opacity-50"
        >
          {loading ? "⏳ جاري التسجيل..." : "🟢 تسجيل الحضور"}
        </button>
        <button
          onClick={checkOut}
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg transition disabled:opacity-50"
        >
          {loading ? "⏳ جاري التسجيل..." : "🔴 تسجيل الخروج"}
        </button>
      </div>

      {/* معلومات المساعدة */}
      <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
        <strong className="text-blue-800 dark:text-blue-200">💡 نصائح مهمة:</strong>
        <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 list-disc list-inside">
          <li>✅ تأكد من تفعيل خدمة GPS قبل تسجيل الحضور</li>
          <li>✅ الصور اختيارية ولكنها تساعد في توثيق العمل</li>
          <li>✅ تسجيل الخروج ضروري لحساب ساعات العمل</li>
          <li>✅ احفظ PIN الخاص بك في مكان آمن</li>
          <li>✅ سيتم حساب راتبك بناءً على الساعات المسجلة</li>
        </ul>
      </div>

      {/* معلومات التصحيح */}
      {debugInfo && (
        <div className="mt-4 p-2 bg-gray-200 dark:bg-gray-700 rounded text-xs text-blue-600 dark:text-blue-400">
          ℹ️ {debugInfo}
        </div>
      )}
    </div>
  );
}