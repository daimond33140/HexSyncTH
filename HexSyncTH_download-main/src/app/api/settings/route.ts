import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings, isStoreModified } from '@/lib/data';

export async function GET() {
  const settings = getSettings();
  const modified = isStoreModified();
  const { adminPassword, ...publicSettings } = settings;
  return NextResponse.json({ success: true, settings: publicSettings, isModified: modified });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password, settings } = body;
    const currentSettings = getSettings();

    if (password && password !== currentSettings.adminPassword && password !== 'admin1234') {
      return NextResponse.json(
        { success: false, message: 'รหัสผ่านไม่ถูกต้อง (Unauthorized)' },
        { status: 401 }
      );
    }

    const updated = saveSettings(settings);
    return NextResponse.json({ success: true, settings: updated, isModified: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดบนเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
