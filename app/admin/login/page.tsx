"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";

export default function AdminLoginPage() {
  const t = useTranslations('login');
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t('invalidCredentials'));
      }

      // ✅ تخزين admin_id في localStorage
      if (data.adminId) {
        localStorage.setItem('admin_id', data.adminId);
        console.log("✅ Admin ID saved to localStorage:", data.adminId);
      } else {
        console.warn("⚠️ Admin ID not returned from API");
      }

      router.push("/admin");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-5">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md"
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-center flex-1 text-gray-800 dark:text-white">
            {t('title')}
          </h1>
          <LanguageSwitcher />
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-center">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300 mb-2">
            {t('email')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 dark:text-gray-300 mb-2">
            {t('password')}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition disabled:opacity-50"
        >
          {loading ? t('loading') : t('loginButton')}
        </button>
      </form>
    </div>
  );
}