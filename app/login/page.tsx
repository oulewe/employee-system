"use client"

import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useRouter } from "next/navigation"

type Employee = {
  id: string
  name: string
  phone?: string
  role?: string
  pin: string
}

export default function EmployeeLoginPage() {
  const router = useRouter()
  const [pinInput, setPinInput] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")
  const [showPassword, setShowPassword] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [lockTimer, setLockTimer] = useState(0)

  // ✅ تنظيف البيانات القديمة عند فتح صفحة تسجيل الدخول
  useEffect(() => {
    console.log("🔄 Clearing old session...")
    localStorage.removeItem("user")
    localStorage.removeItem("rememberMe")
    console.log("✅ Old session cleared")
  }, [])

  // ✅ مؤقت القفل
  useEffect(() => {
    if (isLocked && lockTimer > 0) {
      const timer = setTimeout(() => {
        setLockTimer(lockTimer - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }

    if (lockTimer === 0 && isLocked) {
      setIsLocked(false)
      setLoginAttempts(0)
    }
  }, [isLocked, lockTimer])

  // ✅ تسجيل الدخول
  const login = async () => {
    setError("")
    setSuccess("")

    if (isLocked) {
      setError(`❌ تم قفل الحساب مؤقتاً. يرجى الانتظار ${lockTimer} ثانية`)
      return
    }

    if (!pinInput.trim()) {
      setError("❌ أدخل PIN")
      return
    }

    if (pinInput.trim().length < 4) {
      setError("❌ PIN يجب أن يكون 4 أرقام على الأقل")
      return
    }

    setLoading(true)

    try {
      const startTime = performance.now()
      console.log("🔄 Attempting login with PIN:", pinInput.trim())

      const { data, error } = await supabase
        .from("employees")
        .select("id, name, phone, role, pin")
        .eq("pin", pinInput.trim())
        .single()

      const endTime = performance.now()
      console.log(`✅ Login query took ${(endTime - startTime).toFixed(2)}ms`)

      if (error) {
        console.error("❌ Login error:", error)
        const newAttempts = loginAttempts + 1

        if (newAttempts >= 5) {
          setIsLocked(true)
          setLockTimer(300) // 5 دقائق
          setError("❌ تم قفل الحساب لمدة 5 دقائق بسبب محاولات خاطئة متكررة")
        } else {
          setError(`❌ PIN غير صحيح (محاولة ${newAttempts}/5)`)
        }

        setLoginAttempts(newAttempts)
        return
      }

      if (!data || !data.id) {
        throw new Error("لم يتم العثور على الموظف")
      }

      const employee = data as Employee
      console.log("✅ Login successful for:", employee.name, employee.id)

      // حفظ البيانات
      localStorage.setItem("user", JSON.stringify(employee))
      console.log("✅ User data saved to localStorage")

      setSuccess(`✅ مرحباً ${employee.name}`)
      setPinInput("")
      setLoginAttempts(0)

      // إعادة التوجيه بعد ثانية واحدة
      setTimeout(() => {
        console.log("🔄 Redirecting to employee page...")
        router.push("/employee")
      }, 1000)
    } catch (err: any) {
      console.error("❌ Login failed:", err)
      setError(err.message || "❌ حدث خطأ في تسجيل الدخول")
    } finally {
      setLoading(false)
    }
  }

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
        {/* الشعار والعنوان */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 15 }}>👤</div>
          <h1 style={{ color: "#2c3e50", marginBottom: 10, fontSize: 28 }}>
            تسجيل دخول الموظف
          </h1>
          <p style={{ color: "#7f8c8d", marginBottom: 0, fontSize: 14 }}>
            أدخل رقم التعريف الخاص بك
          </p>
        </div>

        {/* رسالة الخطأ */}
        {error && (
          <div
            style={{
              backgroundColor: "#ffe6e6",
              color: "#c33",
              padding: 14,
              borderRadius: 8,
              marginBottom: 20,
              border: "1px solid #ffcccc",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 18 }}>❌</span>
            <span>{error}</span>
          </div>
        )}

        {/* رسالة النجاح */}
        {success && (
          <div
            style={{
              backgroundColor: "#e6ffe6",
              color: "#3c3",
              padding: 14,
              borderRadius: 8,
              marginBottom: 20,
              border: "1px solid #ccffcc",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 18 }}>✅</span>
            <span>{success}</span>
          </div>
        )}

        {/* حقل PIN */}
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
                setPinInput(e.target.value)
                setError("")
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !loading && !isLocked) {
                  login()
                }
              }}
              disabled={loading || isLocked}
              maxLength={6}
              autoFocus
              style={{
                width: "100%",
                padding: "14px 16px",
                paddingRight: 45,
                border: `2px solid ${error ? "#ff6b6b" : "#e0e0e0"}`,
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
                e.currentTarget.style.borderColor = "#3498db"
                e.currentTarget.style.boxShadow = "0 0 8px rgba(52, 152, 219, 0.2)"
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = error ? "#ff6b6b" : "#e0e0e0"
                e.currentTarget.style.boxShadow = "none"
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

        {/* عرض محاولات الدخول */}
        {loginAttempts > 0 && !isLocked && (
          <div
            style={{
              marginBottom: 20,
              fontSize: 13,
              color: "#e67e22",
              padding: 10,
              backgroundColor: "#fff3cd",
              borderRadius: 6,
              border: "1px solid #ffeaa7",
            }}
          >
            ⚠️ محاولات متبقية: {5 - loginAttempts}/5
          </div>
        )}

        {/* زر الدخول */}
        <button
          onClick={login}
          disabled={loading || !pinInput.trim() || isLocked}
          style={{
            width: "100%",
            padding: 14,
            backgroundColor:
              loading || !pinInput.trim() || isLocked ? "#bdc3c7" : "#27ae60",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            fontWeight: "bold",
            cursor:
              loading || !pinInput.trim() || isLocked ? "not-allowed" : "pointer",
            transition: "background-color 0.3s, transform 0.1s",
            marginBottom: 15,
          }}
          onMouseEnter={(e) => {
            if (!loading && pinInput.trim() && !isLocked) {
              e.currentTarget.style.backgroundColor = "#229954"
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && pinInput.trim() && !isLocked) {
              e.currentTarget.style.backgroundColor = "#27ae60"
            }
          }}
        >
          {loading ? (
            <span>⏳ جاري التحقق...</span>
          ) : isLocked ? (
            <span>🔒 تم قفل الحساب ({lockTimer}s)</span>
          ) : (
            <span>🚀 دخول</span>
          )}
        </button>

        {/* رسالة مساعدة */}
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
            <li>5 محاولات خاطئة = قفل لمدة 5 دقائق</li>
            <li>اضغط Enter للدخول السريع</li>
            <li>تواصل مع المدير إذا نسيت PIN</li>
          </ul>
        </div>
      </div>
    </div>
  )
}