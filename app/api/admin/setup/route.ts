import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const email = 'admin@example.com';
    const password = 'your-secure-password'; // غيّره
    const hashedPassword = await bcrypt.hash(password, 10);

    const { error } = await supabase.from('admins').insert({
      email,
      password_hash: hashedPassword
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}