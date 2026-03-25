"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";

type Employee = {
  id: string;
  name: string;
  phone?: string;
  role?: string;
  pin: string;
  admin_id?: string;
};

export default function EmployeeLoginPage() {
  const router = useRouter();
  const [pinInput, setPinInput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  useEffect(() => {
    console.log("🔄 Clearing old session...");
    localStorage.removeItem("user");
    localStorage.removeItem("rememberMe");
    console.log("✅ Old session cleared");
  }, []);

  useEffect(() => {
    if (isLocked && lockTimer > 0) {
      const timer = setTimeout(() => {
        setLockTimer(lockTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
    if (lockTimer === 0 && isLocked) {
      setIsLocked(false);
      setLoginAttempts(0);
    }
  }, [isLocked, lockTimer]);

  const login = async () => {
    setError("");
    setSuccess("");

    if (isLocked) {
      setError(`❌ تم قفل الحساب مؤقتاً. يرجى الانتظار ${lockTimer} ثانية`);
      return;
    }

    if (!pinInput.trim()) {
      setError("❌ أدخل PIN");
      return;
    }

    if (pinInput.trim().length < 4) {
      setError("❌ PIN يجب أن يكون 4 أرقام على الأقل");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, phone, role, pin, admin_id")
        .eq("pin", pinInput.trim())
        .single();

      if (error) {
        const newAttempts = loginAttempts + 1;
        if (newAttempts >= 5) {
          setIsLocked(true);
          setLockTimer(300);
          setError("❌ تم قفل الحساب لمدة 5 دقائق بسبب محاولات خاطئة متكررة");
        } else {
          setError(`❌ PIN غير صحيح (محاولة ${newAttempts}/5)`);
        }
        setLoginAttempts(newAttempts);
        return;
      }

      if (!data || !data.id) {
        throw new Error("لم يتم العثور على الموظف");
      }

      const employee = data as Employee;
      localStorage.setItem("user", JSON.stringify(employee));
      setSuccess(`✅ مرحباً ${employee.name}`);
      setPinInput("");
      setLoginAttempts(0);

      setTimeout(() => {
        router.push("/employee");
      }, 1000);
    } catch (err: any) {
      setError(err.message || "❌ حدث خطأ في تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-5">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-center flex-1 text-gray-800 dark:text-white">
            تسجيل دخول الموظف
          </h1>
          <LanguageSwitcher />
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-center">
            {success}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300 mb-2">
            🔐 رقم التعريف (PIN)
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="أدخل 4 أرقام أو أكثر"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setError("");
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !loading && !isLocked) {
                  login();
                }
              }}
              disabled={loading || isLocked}
              maxLength={6}
              autoFocus
              className="w-full p-2 pr-10 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-center tracking-wider font-bold"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              type="button"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
            >
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>
        </div>

        {loginAttempts > 0 && !isLocked && (
          <div className="mb-4 text-sm text-orange-600 dark:text-orange-400 text-center">
            ⚠️ محاولات متبقية: {5 - loginAttempts}/5
          </div>
        )}

        <button
          onClick={login}
          disabled={loading || !pinInput.trim() || isLocked}
          className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded transition disabled:opacity-50"
        >
          {loading ? "⏳ جاري التحقق..." : isLocked ? `🔒 تم قفل الحساب (${lockTimer}s)` : "🚀 دخول"}
        </button>

        <div className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
          <p>💡 احتفظ برقم التعريف آمناً</p>
          <p>5 محاولات خاطئة = قفل لمدة 5 دقائق</p>
        </div>
      </div>
    </div>
  );
}