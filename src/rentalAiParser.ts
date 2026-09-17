// src/rentalAiParser.ts
// AI Smart Auto-Detect & Parsing Engine for Game Rentals and Unlock Durations

export interface ParsedRentalInfo {
  durationDays: number;
  durationHours: number;
  durationLabel: string;
  matchedGameIds: string[];
  matchedGameNames: string[];
  isPermanent: boolean;
  confidence: number;
  detectedPattern: string;
}

export interface GameInfo {
  id: string;
  title: string;
}

/**
 * AI Smart Parser: Extracts rental duration and matching games from product title
 * Examples:
 *   "ROV 7 วัน VIP" -> 7 days, ROV game
 *   "ROV ถาวร (จนเกมปิด)" -> 0 (permanent / lifetime), ROV game
 *   "PUBG Mobile 30 Days" -> 30 days, PUBG game
 *   "แพ็กคู่ ROV + Free Fire 15 วัน" -> 15 days, [ROV, Free Fire] (multiple games)
 *   "Valorant 12 ชม." -> 0.5 days (12 hours), Valorant game
 */
export function parseProductRentalAI(
  productName: string,
  availableGames: GameInfo[] = []
): ParsedRentalInfo {
  const name = (productName || '').toLowerCase().trim();

  let durationDays = 1;
  let durationHours = 24;
  let durationLabel = '1 วัน (24 ชม.)';
  let isPermanent = false;
  let confidence = 0.5;
  let detectedPattern = 'ค่าเริ่มต้น';

  // 1. Detect Permanent / Lifetime
  if (
    name.includes('ถาวร') ||
    name.includes('ตลอดชีพ') ||
    name.includes('lifetime') ||
    name.includes('permanent') ||
    name.includes('จนเกมปิด') ||
    name.includes('life time') ||
    name.includes('ไม่จำกัดเวลา') ||
    name.includes('ไม่จำกัด')
  ) {
    isPermanent = true;
    durationDays = 0; // 0 represents permanent in HexSyncTH
    durationHours = 3650 * 24; // 10 years fallback for calculations
    durationLabel = 'ถาวร (ตลอดชีพ / 10 ปี)';
    confidence = 0.99;
    detectedPattern = 'ถาวร / ตลอดชีพ';
  }
  // 2. Detect Hours (ชม. / ชั่วโมง / hr / hours)
  else if (/(\d+(?:\.\d+)?)\s*(ชั่วโมง|ชม\.|ชม|hr|hrs|hour|hours)/i.test(name)) {
    const match = name.match(/(\d+(?:\.\d+)?)\s*(ชั่วโมง|ชม\.|ชม|hr|hrs|hour|hours)/i);
    const hrs = match ? parseFloat(match[1]) : 24;
    durationHours = hrs;
    durationDays = parseFloat((hrs / 24).toFixed(3));
    durationLabel = `${hrs} ชั่วโมง (${durationDays} วัน)`;
    confidence = 0.95;
    detectedPattern = `${hrs} ชม.`;
  }
  // 3. Detect Months (เดือน / month / months)
  else if (/(\d+)\s*(เดือน|month|months)/i.test(name)) {
    const match = name.match(/(\d+)\s*(เดือน|month|months)/i);
    const months = match ? parseInt(match[1], 10) : 1;
    durationDays = months * 30;
    durationHours = durationDays * 24;
    durationLabel = `${months} เดือน (${durationDays} วัน)`;
    confidence = 0.96;
    detectedPattern = `${months} เดือน`;
  }
  // 4. Detect Years (ปี / year / years)
  else if (/(\d+)\s*(ปี|year|years)/i.test(name)) {
    const match = name.match(/(\d+)\s*(ปี|year|years)/i);
    const years = match ? parseInt(match[1], 10) : 1;
    durationDays = years * 365;
    durationHours = durationDays * 24;
    durationLabel = `${years} ปี (${durationDays} วัน)`;
    confidence = 0.96;
    detectedPattern = `${years} ปี`;
  }
  // 5. Detect Weeks (สัปดาห์ / อาทิตย์ / week / weeks)
  else if (
    /(\d+)\s*(สัปดาห์|อาทิตย์|week|weeks)/i.test(name) ||
    name.includes('1 สัปดาห์') ||
    name.includes('1 อาทิตย์') ||
    name.includes('1 week')
  ) {
    const match = name.match(/(\d+)\s*(สัปดาห์|อาทิตย์|week|weeks)/i);
    const weeks = match ? parseInt(match[1], 10) : 1;
    durationDays = weeks * 7;
    durationHours = durationDays * 24;
    durationLabel = `${weeks} สัปดาห์ (${durationDays} วัน)`;
    confidence = 0.95;
    detectedPattern = `${weeks} สัปดาห์`;
  }
  // 6. Detect Days with Thai / English keywords (e.g. 1 วัน, 3 วัน, 7 วัน, 15 วัน, 30 วัน, 1 day, 7 days)
  else if (/(\d+)\s*(วัน|day|days)/i.test(name)) {
    const match = name.match(/(\d+)\s*(วัน|day|days)/i);
    const days = match ? parseInt(match[1], 10) : 1;
    durationDays = days;
    durationHours = days * 24;
    durationLabel = `${days} วัน (${days * 24} ชม.)`;
    confidence = 0.98;
    detectedPattern = `${days} วัน`;
  }
  // 7. Detect shorthand like "1d", "3d", "7d", "14d", "15d", "30d", "60d"
  else if (/\b(\d+)\s*d\b/i.test(name)) {
    const match = name.match(/\b(\d+)\s*d\b/i);
    const days = match ? parseInt(match[1], 10) : 1;
    durationDays = days;
    durationHours = days * 24;
    durationLabel = `${days} วัน (${days * 24} ชม.)`;
    confidence = 0.92;
    detectedPattern = `${days}d`;
  }
  // Fallback defaults
  else {
    durationDays = 1;
    durationHours = 24;
    durationLabel = '1 วัน (24 ชม. - ค่าเริ่มต้น)';
    confidence = 0.4;
    detectedPattern = 'ค่าเริ่มต้น 1 วัน';
  }

  // 8. Game Matching Engine: Detect which game(s) this product unlocks
  const matchedGameIds: string[] = [];
  const matchedGameNames: string[] = [];

  for (const g of availableGames) {
    const gTitle = (g.title || '').toLowerCase();
    const gId = (g.id || '').toLowerCase();

    // Standard gaming keywords
    const keywords: string[] = [];

    // ROV
    if (gTitle.includes('rov') || gId.includes('rov')) {
      keywords.push('rov', 'อาร์โอวี', 'realm of valor');
    }
    // PUBG
    if (gTitle.includes('pubg') || gId.includes('pubg')) {
      keywords.push('pubg', 'พับจี', 'pubgm', 'pubg mobile', 'bgmi');
    }
    // Free Fire
    if (gTitle.includes('free fire') || gTitle.includes('freefire') || gId.includes('freefire') || gId.includes('ff')) {
      keywords.push('free fire', 'freefire', 'ฟีฟาย', 'ff');
    }
    // Valorant
    if (gTitle.includes('valorant') || gId.includes('valorant') || gId.includes('valo')) {
      keywords.push('valorant', 'วาโล', 'valo', 'vanguard');
    }
    // FiveM / GTA
    if (gTitle.includes('fivem') || gTitle.includes('gta') || gId.includes('fivem') || gId.includes('gta')) {
      keywords.push('fivem', 'gta', 'ไฟว์เอ็ม', 'จีทีเอ');
    }

    // Add individual significant words from title (>= 3 chars)
    const titleWords = gTitle.split(/[\s+\-_/()]+/).filter(w => w.length >= 3);
    keywords.push(...titleWords);

    const isMatch = keywords.some(k => name.includes(k));

    if (isMatch && !matchedGameIds.includes(g.id)) {
      matchedGameIds.push(g.id);
      matchedGameNames.push(g.title);
    }
  }

  return {
    durationDays,
    durationHours,
    durationLabel,
    matchedGameIds,
    matchedGameNames,
    isPermanent,
    confidence,
    detectedPattern
  };
}

/**
 * Format linked game IDs into a readable summary of names
 */
export function formatLinkedGamesSummary(
  linkedGameId: string | null | undefined,
  availableGames: GameInfo[] = []
): Array<{ id: string; title: string }> {
  if (!linkedGameId) return [];

  const ids = linkedGameId
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  return ids.map(id => {
    const found = availableGames.find(g => g.id === id);
    return {
      id,
      title: found ? found.title : id
    };
  });
}
