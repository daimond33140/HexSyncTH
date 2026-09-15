import fs from 'fs';
import path from 'path';
import { GameItem, SiteSettings } from './types';
import { INITIAL_GAMES, INITIAL_SETTINGS } from './constants';

export { INITIAL_GAMES, INITIAL_SETTINGS };

// Try writing to server storage file (tmp or local)
const getStorageFilePath = () => {
  try {
    const tmpDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), '.next');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return path.join(tmpDir, 'hexsync_store.json');
  } catch (e) {
    return null;
  }
};

interface StoreFileFormat {
  games: GameItem[];
  settings: SiteSettings;
  isModified?: boolean;
}

function readStoreFromFile(): StoreFileFormat {
  const filePath = getStorageFilePath();
  if (filePath && fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed.games && parsed.settings) {
        return parsed;
      }
    } catch (e) {
      console.error('File store read error:', e);
    }
  }
  return { games: INITIAL_GAMES, settings: INITIAL_SETTINGS, isModified: false };
}

function writeStoreToFile(data: StoreFileFormat) {
  const filePath = getStorageFilePath();
  if (filePath) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('File store write error:', e);
    }
  }
}

export function getGames(): GameItem[] {
  const data = readStoreFromFile();
  return data.games;
}

export function saveGames(newGames: GameItem[]): GameItem[] {
  const current = readStoreFromFile();
  const updatedData = { ...current, games: newGames, isModified: true };
  writeStoreToFile(updatedData);
  return newGames;
}

export function getSettings(): SiteSettings {
  const data = readStoreFromFile();
  return data.settings;
}

export function saveSettings(newSettings: Partial<SiteSettings>): SiteSettings {
  const current = readStoreFromFile();
  const updatedSettings = { ...current.settings, ...newSettings };
  const updatedData = { ...current, settings: updatedSettings, isModified: true };
  writeStoreToFile(updatedData);
  return updatedSettings;
}

export function isStoreModified(): boolean {
  const data = readStoreFromFile();
  return !!data.isModified;
}
