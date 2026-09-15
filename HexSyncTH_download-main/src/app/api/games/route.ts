import { NextRequest, NextResponse } from 'next/server';
import { getGames, saveGames, getSettings, isStoreModified } from '@/lib/data';
import { GameItem } from '@/lib/types';

export async function GET() {
  const games = getGames();
  const modified = isStoreModified();
  return NextResponse.json({ success: true, games, isModified: modified });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password, games } = body;
    const currentSettings = getSettings();

    // Allow default password fallback
    if (password && password !== currentSettings.adminPassword && password !== 'admin1234') {
      return NextResponse.json(
        { success: false, message: 'รหัสผ่านไม่ถูกต้อง (Unauthorized)' },
        { status: 401 }
      );
    }

    if (Array.isArray(games)) {
      const updatedGames = saveGames(games as GameItem[]);
      return NextResponse.json({ success: true, games: updatedGames, isModified: true });
    }

    return NextResponse.json(
      { success: false, message: 'ข้อมูลไม่ถูกต้อง' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดบนเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
