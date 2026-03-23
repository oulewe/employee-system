import { supabase } from "./supabase";

type AttendanceRecord = {
  id: string;
  employee_id: string;
  check_in: string;
  check_out: string | null;
};

type Employee = {
  id: string;
  name: string;
  salary: number;
};

type PayrollRecord = {
  id: string;
  employee_id: string;
  month: number;
  total_hours: number;
  salary: number;
};

// ✅ حساب ساعات العمل بين دخول وخروج
export const calculateWorkHours = (checkIn: string, checkOut: string | null): number => {
  if (!checkOut) return 0;
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  return Math.round((end - start) / (1000 * 60 * 60)); // تحويل إلى ساعات
};

// ✅ حساب إجمالي ساعات الموظف في شهر معين (مع adminId)
export const calculateMonthlyHours = async (
  employeeId: string,
  month: number,
  year: number,
  adminId: string
): Promise<number> => {
  try {
    const firstDay = new Date(year, month - 1, 1).toISOString();
    const lastDay = new Date(year, month, 0, 23, 59, 59).toISOString();

    const { data, error } = await supabase
      .from("attendance")
      .select("check_in, check_out")
      .eq("employee_id", employeeId)
      .eq("admin_id", adminId) // ← هام: تصفية حسب المدير
      .gte("check_in", firstDay)
      .lte("check_in", lastDay);

    if (error) throw error;

    let totalHours = 0;
    data?.forEach((record) => {
      totalHours += calculateWorkHours(record.check_in, record.check_out);
    });

    console.log(
      `✅ Total hours for ${employeeId} in ${month}/${year}: ${totalHours}`
    );
    return totalHours;
  } catch (err: any) {
    console.error("❌ Error calculating monthly hours:", err);
    return 0;
  }
};

// ✅ حساب راتب الموظف للشهر (مع adminId)
export const calculateEmployeePayroll = async (
  employee: Employee,
  month: number,
  year: number,
  adminId: string
) => {
  try {
    console.log(`🔄 Calculating payroll for ${employee.name}...`);

    // حساب الساعات
    const totalHours = await calculateMonthlyHours(employee.id, month, year, adminId);

    // حساب الراتب (الراتب الشهري مقسوم على عدد ساعات العمل المتوقعة)
    const monthlyExpectedHours = 240;
    const hourlyRate = employee.salary / monthlyExpectedHours;
    const totalSalary = Math.round(totalHours * hourlyRate);

    return {
      employee_id: employee.id,
      month,
      total_hours: totalHours,
      salary: totalSalary,
      admin_id: adminId, // ← مهم: ربط الراتب بالمدير
    };
  } catch (err: any) {
    console.error("❌ Error calculating payroll:", err);
    return null;
  }
};

// ✅ حفظ الرواتب في قاعدة البيانات
export const savePayroll = async (payrollData: any) => {
  try {
    // تحقق إذا كان الراتب موجود بالفعل
    const { data: existing } = await supabase
      .from("payroll")
      .select("id")
      .eq("employee_id", payrollData.employee_id)
      .eq("month", payrollData.month)
      .eq("admin_id", payrollData.admin_id) // ← تصفية حسب admin_id
      .single();

    if (existing) {
      // تحديث الراتب الموجود
      const { error } = await supabase
        .from("payroll")
        .update({
          total_hours: payrollData.total_hours,
          salary: payrollData.salary,
        })
        .eq("id", existing.id);

      if (error) throw error;
      console.log("✅ Payroll updated successfully");
      return { success: true, action: "updated" };
    } else {
      // إدراج راتب جديد
      const { error } = await supabase.from("payroll").insert([payrollData]);

      if (error) throw error;
      console.log("✅ Payroll saved successfully");
      return { success: true, action: "created" };
    }
  } catch (err: any) {
    console.error("❌ Error saving payroll:", err);
    return { success: false, error: err.message };
  }
};

// ✅ حساب رواتب جميع الموظفين للشهر (مع adminId)
export const calculateAllEmployeesPayroll = async (
  month: number,
  year: number,
  adminId: string
) => {
  try {
    console.log(`🔄 Calculating payroll for all employees for ${month}/${year}...`);

    // جلب جميع الموظفين التابعين للمدير
    const { data: employees, error } = await supabase
      .from("employees")
      .select("id, name, salary")
      .eq("admin_id", adminId); // ← هام: تصفية حسب المدير

    if (error) throw error;

    const results = [];

    for (const employee of employees || []) {
      const payrollData = await calculateEmployeePayroll(employee, month, year, adminId);
      if (payrollData) {
        const result = await savePayroll(payrollData);
        results.push({
          employee: employee.name,
          ...result,
        });
      }
    }

    console.log("✅ All payrolls calculated and saved");
    return results;
  } catch (err: any) {
    console.error("❌ Error calculating all payrolls:", err);
    return [];
  }
};

// ✅ جلب رواتب شهر معين (مع adminId)
export const fetchMonthlyPayroll = async (month: number, adminId: string) => {
  try {
    const { data, error } = await supabase
      .from("payroll")
      .select(
        `
        *,
        employee:employee_id (
          id,
          name,
          phone,
          role,
          salary
        )
      `
      )
      .eq("month", month)
      .eq("admin_id", adminId) // ← هام: تصفية حسب المدير
      .order("created_at", { ascending: false });

    if (error) throw error;

    console.log(`✅ Fetched ${data?.length || 0} payroll records`);
    return data || [];
  } catch (err: any) {
    console.error("❌ Error fetching payroll:", err);
    return [];
  }
};

// ✅ جلب رواتب موظف معين (مع adminId)
export const fetchEmployeePayroll = async (employeeId: string, adminId: string) => {
  try {
    const { data, error } = await supabase
      .from("payroll")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("admin_id", adminId) // ← تصفية حسب المدير
      .order("month", { ascending: false });

    if (error) throw error;

    console.log(`✅ Fetched ${data?.length || 0} payroll records for employee`);
    return data || [];
  } catch (err: any) {
    console.error("❌ Error fetching employee payroll:", err);
    return [];
  }
};

// ✅ جلب جميع الرواتب (مع adminId)
export const fetchAllPayroll = async (adminId: string) => {
  try {
    const { data, error } = await supabase
      .from("payroll")
      .select(
        `
        *,
        employee:employee_id (
          id,
          name,
          phone,
          role,
          salary
        )
      `
      )
      .eq("admin_id", adminId) // ← هام: تصفية حسب المدير
      .order("month", { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (err: any) {
    console.error("❌ Error fetching all payroll:", err);
    return [];
  }
}