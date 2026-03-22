import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const email = 'malekbrahim463@gmail.com';
    const plainPassword = 'BM48633611';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const { error } = await supabase.from('admins').insert({
      email,
      password_hash: hashedPassword,
    });

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Admin created' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}