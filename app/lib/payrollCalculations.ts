import { supabase } from "./supabase"

type AttendanceRecord = {
  id: string
  employee_id: string
  check_in: string
  check_out: string | null
}

type Employee = {
  id: string
  name: string
  salary: number
}

type PayrollRecord = {
  id: string
  employee_id: string
  month: number
  total_hours: number
  salary: number
}

// ✅ حساب ساعات العمل بين دخول وخروج
export const calculateWorkHours = (checkIn: string, checkOut: string | null): number => {
  if (!checkOut) return 0
  const start = new Date(checkIn).getTime()
  const end = new Date(checkOut).getTime()
  return Math.round((end - start) / (1000 * 60 * 60)) // تحويل إلى ساعات
}

// ✅ حساب إجمالي ساعات الموظف في شهر معين
export const calculateMonthlyHours = async (
  employeeId: string,
  month: number,
  year: number
): Promise<number> => {
  try {
    const firstDay = new Date(year, month - 1, 1).toISOString()
    const lastDay = new Date(year, month, 0, 23, 59, 59).toISOString()

    const { data, error } = await supabase
      .from("attendance")
      .select("check_in, check_out")
      .eq("employee_id", employeeId)
      .gte("check_in", firstDay)
      .lte("check_in", lastDay)

    if (error) throw error

    let totalHours = 0
    data?.forEach((record) => {
      totalHours += calculateWorkHours(record.check_in, record.check_out)
    })

    console.log(
      `✅ Total hours for ${employeeId} in ${month}/${year}: ${totalHours}`
    )
    return totalHours
  } catch (err: any) {
    console.error("❌ Error calculating monthly hours:", err)
    return 0
  }
}

// ✅ حساب راتب الموظف للشهر (الأوقية الموريتانية)
export const calculateEmployeePayroll = async (
  employee: Employee,
  month: number,
  year: number
) => {
  try {
    console.log(`🔄 Calculating payroll for ${employee.name}...`)

    // حساب الساعات
    const totalHours = await calculateMonthlyHours(employee.id, month, year)

    // حساب الراتب (الراتب الشهري مقسوم على عدد ساعات العمل المتوقعة)
    // نفترض 240 ساعة عمل شهرياً (30 يوم × 8 ساعات)
    const monthlyExpectedHours = 240
    const hourlyRate = employee.salary / monthlyExpectedHours
    const totalSalary = Math.round(totalHours * hourlyRate)

    return {
      employee_id: employee.id,
      month,
      total_hours: totalHours,
      salary: totalSalary,
    }
  } catch (err: any) {
    console.error("❌ Error calculating payroll:", err)
    return null
  }
}

// ✅ حفظ الرواتب في قاعدة البيانات
export const savePayroll = async (payrollData: any) => {
  try {
    // تحقق إذا كان الراتب موجود بالفعل
    const { data: existing } = await supabase
      .from("payroll")
      .select("id")
      .eq("employee_id", payrollData.employee_id)
      .eq("month", payrollData.month)
      .single()

    if (existing) {
      // تحديث الراتب الموجود
      const { error } = await supabase
        .from("payroll")
        .update({
          total_hours: payrollData.total_hours,
          salary: payrollData.salary,
        })
        .eq("id", existing.id)

      if (error) throw error
      console.log("✅ Payroll updated successfully")
      return { success: true, action: "updated" }
    } else {
      // إدراج راتب جديد
      const { error } = await supabase
        .from("payroll")
        .insert([payrollData])

      if (error) throw error
      console.log("✅ Payroll saved successfully")
      return { success: true, action: "created" }
    }
  } catch (err: any) {
    console.error("❌ Error saving payroll:", err)
    return { success: false, error: err.message }
  }
}

// ✅ حساب رواتب جميع الموظفين للشهر
export const calculateAllEmployeesPayroll = async (month: number, year: number) => {
  try {
    console.log(`🔄 Calculating payroll for all employees for ${month}/${year}...`)

    // جلب جميع الموظفين
    const { data: employees, error } = await supabase
      .from("employees")
      .select("id, name, salary")

    if (error) throw error

    const results = []

    for (const employee of employees || []) {
      const payrollData = await calculateEmployeePayroll(employee, month, year)
      if (payrollData) {
        const result = await savePayroll(payrollData)
        results.push({
          employee: employee.name,
          ...result,
        })
      }
    }

    console.log("✅ All payrolls calculated and saved")
    return results
  } catch (err: any) {
    console.error("❌ Error calculating all payrolls:", err)
    return []
  }
}

// ✅ جلب رواتب شهر معين
export const fetchMonthlyPayroll = async (month: number, year?: number) => {
  try {
    const { data, error } = await supabase
      .from("payroll")
      .select(`
        *,
        employee:employee_id (
          id,
          name,
          phone,
          role,
          salary
        )
      `)
      .eq("month", month)
      .order("created_at", { ascending: false })

    if (error) throw error

    console.log(`✅ Fetched ${data?.length || 0} payroll records`)
    return data || []
  } catch (err: any) {
    console.error("❌ Error fetching payroll:", err)
    return []
  }
}

// ✅ جلب رواتب موظف معين
export const fetchEmployeePayroll = async (employeeId: string) => {
  try {
    const { data, error } = await supabase
      .from("payroll")
      .select("*")
      .eq("employee_id", employeeId)
      .order("month", { ascending: false })

    if (error) throw error

    console.log(`✅ Fetched ${data?.length || 0} payroll records for employee`)
    return data || []
  } catch (err: any) {
    console.error("❌ Error fetching employee payroll:", err)
    return []
  }
}

// ✅ جلب جميع الرواتب
export const fetchAllPayroll = async () => {
  try {
    const { data, error } = await supabase
      .from("payroll")
      .select(`
        *,
        employee:employee_id (
          id,
          name,
          phone,
          role,
          salary
        )
      `)
      .order("month", { ascending: false })

    if (error) throw error

    return data || []
  } catch (err: any) {
    console.error("❌ Error fetching all payroll:", err)
    return []
  }
}