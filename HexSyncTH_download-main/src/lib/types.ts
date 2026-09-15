export type GameStatus = 'undetected' | 'detected' | 'maintenance' | 'updating';

export interface GameItem {
  id: string;
  title: string;
  subtitle?: string;
  version: string;
  status: GameStatus;
  downloadUrl: string;
  isDownloadEnabled: boolean;
  category: string;
  updatedAt: string;
  bannerUrl?: string;
  downloadCount: number;
  driveNote?: string;
}

export interface SiteSettings {
  globalMaintenance: boolean;
  maintenanceMessage: string;
  announcementText: string;
  announcementActive: boolean;
  siteTitle: string;
  adminPassword: string;
}

export interface AppState {
  games: GameItem[];
  settings: SiteSettings;
}
