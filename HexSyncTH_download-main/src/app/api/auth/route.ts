import { NextRequest, NextResponse } from 'next/server';
import { getSettings } from '@/lib/data';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const currentSettings = getSettings();

    if (password === currentSettings.adminPassword) {
      return NextResponse.json({ success: true, token: 'admin-authorized-session' });
    }

    return NextResponse.json(
      { success: false, message: 'รหัสผ่าน Admin ไม่ถูกต้อง' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน' },
      { status: 500 }
    );
  }
}
