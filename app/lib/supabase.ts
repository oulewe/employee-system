import { createClient } from "@supabase/supabase-js"

// ✅ استخدام متغيرات البيئة
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ✅ معالجة الخطأ بشكل آمن
if (!supabaseUrl) {
  throw new Error(
    "❌ NEXT_PUBLIC_SUPABASE_URL is not set. Check your .env.local file"
  )
}

if (!supabaseKey) {
  throw new Error(
    "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Check your .env.local file"
  )
}

// ✅ إنشاء عميل Supabase
export const supabase = createClient(supabaseUrl, supabaseKey)

// ✅ تسجيل نجاح الاتصال
console.log("✅ Supabase client initialized successfully")
console.log(`✅ URL: ${supabaseUrl.substring(0, 30)}...`)