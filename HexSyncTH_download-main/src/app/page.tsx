'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  Download, 
  Lock, 
  Search, 
  Sparkles, 
  AlertTriangle, 
  Settings, 
  ExternalLink, 
  Info, 
  CheckCircle2, 
  X, 
  Gamepad2,
  Bell,
  Clock,
  HardDrive
} from 'lucide-react';
import { GameItem, SiteSettings, GameStatus } from '@/lib/types';
import { INITIAL_GAMES, INITIAL_SETTINGS } from '@/lib/constants';

export default function HomePage() {
  const [games, setGames] = useState<GameItem[]>(INITIAL_GAMES);
  const [settings, setSettings] = useState<SiteSettings>(INITIAL_SETTINGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | GameStatus>('all');
  const [selectedGameForDownload, setSelectedGameForDownload] = useState<GameItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamic Browser Tab Title Update
  useEffect(() => {
    if (settings.siteTitle) {
      document.title = settings.siteTitle;
    }
  }, [settings.siteTitle]);

  // Sync data from API and LocalStorage on mount & on storage change
  useEffect(() => {
    function readLocalState() {
      const savedGamesStr = localStorage.getItem('xx1_games');
      const savedSettingsStr = localStorage.getItem('xx1_settings');

      if (savedGamesStr) {
        try { setGames(JSON.parse(savedGamesStr)); } catch (e) { }
      }
      if (savedSettingsStr) {
        try { setSettings(JSON.parse(savedSettingsStr)); } catch (e) { }
      }
    }

    async function loadData() {
      // 1. Load LocalStorage first
      readLocalState();

      // 2. Fetch latest from API
      try {
        const [gamesRes, settingsRes] = await Promise.all([
          fetch('/api/games').then(res => res.json()).catch(() => null),
          fetch('/api/settings').then(res => res.json()).catch(() => null)
        ]);

        const hasLocalCustom = localStorage.getItem('xx1_has_custom_data') === 'true';

        if (gamesRes?.success && gamesRes.games) {
          if (gamesRes.isModified || !hasLocalCustom) {
            setGames(gamesRes.games);
            localStorage.setItem('xx1_games', JSON.stringify(gamesRes.games));
          }
        }

        if (settingsRes?.success && settingsRes.settings) {
          if (settingsRes.isModified || !hasLocalCustom) {
            setSettings(prev => ({ ...prev, ...settingsRes.settings }));
            localStorage.setItem('xx1_settings', JSON.stringify({ ...settings, ...settingsRes.settings }));
          }
        }
      } catch (err) {
        console.error('Data load error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();

    // Listen to changes from Admin tab in real-time
    const handleStorageChange = () => {
      readLocalState();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Filter games based on query and status filter
  const filteredGames = games.filter(game => {
    const matchesQuery = game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' ? true : game.status === selectedFilter;
    return matchesQuery && matchesFilter;
  });

  const undetectedCount = games.filter(g => g.status === 'undetected').length;
  const detectedCount = games.filter(g => g.status === 'detected').length;

  const renderStatusBadge = (status: GameStatus) => {
    switch (status) {
      case 'undetected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-status-pulse"></span>
            <ShieldCheck className="w-3.5 h-3.5" />
            Undetected (ปลอดภัย)
          </span>
        );
      case 'detected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.25)]">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <ShieldAlert className="w-3.5 h-3.5" />
            Detected (งดใช้งาน)
          </span>
        );
      case 'updating':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Updating (กำลังอัปเดต)
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
            <Lock className="w-3.5 h-3.5" />
            Maintenance (ปิดปรับปรุง)
          </span>
        );
      default:
        return null;
    }
  };

  const handleDownloadClick = (game: GameItem) => {
    const isAllowed = !settings.globalMaintenance && game.isDownloadEnabled && game.status === 'undetected';
    if (!isAllowed) return;

    setSelectedGameForDownload(game);
  };

  return (
    <div className="min-h-screen bg-dark-900 text-gray-100 flex flex-col relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-hero-pattern pointer-events-none opacity-60 z-0"></div>

      {/* Announcement Marquee Bar */}
      {settings.announcementActive && settings.announcementText && (
        <div className="bg-gradient-to-r from-purple-900/80 via-indigo-900/80 to-purple-900/80 border-b border-purple-500/20 py-2.5 px-4 text-xs font-medium flex items-center justify-center gap-2 text-purple-200 z-10">
          <Bell className="w-4 h-4 text-purple-400 animate-bounce shrink-0" />
          <span className="truncate">{settings.announcementText}</span>
        </div>
      )}

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-dark-900/80 border-b border-gray-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-purple-500/20">
              <div className="w-full h-full bg-dark-900 rounded-[10px] flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
                {settings.siteTitle || 'XX1 GAME HUB'}
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30">PRO</span>
              </h1>
              <p className="text-xs text-gray-400">ระบบเช็คสถานะ & แจกไฟล์ดาวน์โหลด Google Drive</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Status Stats Pill */}
            <div className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-dark-800/80 border border-gray-700/60 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Undetected: {undetectedCount}</span>
              </div>
              <span className="text-gray-600">|</span>
              <div className="flex items-center gap-1.5 text-red-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                <span>Detected: {detectedCount}</span>
              </div>
            </div>

            {/* Admin Dashboard Button */}
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600 hover:text-white transition-all shadow-sm"
            >
              <Settings className="w-4 h-4" />
              <span>จัดการหลังบ้าน (Admin)</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10 space-y-8">

        {/* Global Maintenance Alert Banner */}
        {settings.globalMaintenance && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 shadow-lg shadow-amber-950/20 flex flex-col sm:flex-row items-start sm:items-center gap-4 text-amber-200">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <AlertTriangle className="w-7 h-7 animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-amber-300">ระบบปิดปรับปรุงการดาวน์โหลดชั่วคราว (Global Maintenance Mode)</h3>
              <p className="text-xs text-amber-200/80 mt-1">{settings.maintenanceMessage}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 border border-amber-500/30 text-amber-300 self-start sm:self-center">
              ปิดปรับปรุงทั้งเว็บ
            </span>
          </div>
        )}

        {/* Hero Banner Section */}
        <div className="relative rounded-3xl p-6 sm:p-10 glass-panel border border-purple-500/20 overflow-hidden shadow-2xl">
          <div className="max-w-2xl relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Live Status Check & Google Drive Fast Downloads
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {settings.siteTitle || 'ศูนย์รวมดาวน์โหลดไฟล์'} & <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-cyan-400 via-purple-300 to-pink-500 bg-clip-text text-transparent">
                เช็คสถานะการใช้งาน Real-time
              </span>
            </h2>
            <p className="text-sm text-gray-300 mt-3 leading-relaxed">
              ตรวจสอบสถานะไฟล์เกม อัปเดตล่าสุดทุกวัน ดึงลิงก์จาก Google Drive โดยตรง ปุ่มดาวน์โหลดพร้อมสวิตช์ปิดปรับปรุงปลอดภัย 100%
            </p>

            {/* Search Input Bar */}
            <div className="mt-6 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อเกม หรือหมวดหมู่..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl glass-input text-sm text-white placeholder-gray-400 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Decorative graphic background element */}
          <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
            <HardDrive className="w-80 h-80 text-purple-400" />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${selectedFilter === 'all'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-dark-800 text-gray-400 hover:text-white hover:bg-dark-700'
                }`}
            >
              ทั้งหมด ({games.length})
            </button>
            <button
              onClick={() => setSelectedFilter('undetected')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${selectedFilter === 'undetected'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-dark-800 text-gray-400 hover:text-emerald-400 hover:bg-dark-700'
                }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Undetected ({games.filter(g => g.status === 'undetected').length})
            </button>
            <button
              onClick={() => setSelectedFilter('detected')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${selectedFilter === 'detected'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-dark-800 text-gray-400 hover:text-red-400 hover:bg-dark-700'
                }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Detected ({games.filter(g => g.status === 'detected').length})
            </button>
            <button
              onClick={() => setSelectedFilter('updating')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${selectedFilter === 'updating'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                  : 'bg-dark-800 text-gray-400 hover:text-amber-400 hover:bg-dark-700'
                }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Updating ({games.filter(g => g.status === 'updating' || g.status === 'maintenance').length})
            </button>
          </div>

          <div className="text-xs text-gray-400 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span>อัปเดตข้อมูลล่าสุด: {new Date().toLocaleDateString('th-TH')}</span>
          </div>
        </div>

        {/* Games Grid Display */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-64 rounded-2xl bg-dark-800/50 animate-pulse border border-gray-800"></div>
            ))}
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="text-center py-16 rounded-2xl glass-panel border border-gray-800">
            <Gamepad2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-300">ไม่พบรายการเกมที่คุณค้นหา</h3>
            <p className="text-xs text-gray-500 mt-1">ลองเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองสถานะ</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedFilter('all'); }}
              className="mt-4 px-4 py-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 text-xs font-medium"
            >
              ดูรายการเกมทั้งหมด
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGames.map((game) => {
              const isGlobalMaint = settings.globalMaintenance;
              const isGameDisabled = !game.isDownloadEnabled;
              const isStatusForbidden = game.status === 'detected' || game.status === 'maintenance' || game.status === 'updating';
              const canDownload = !isGlobalMaint && !isGameDisabled && !isStatusForbidden;

              return (
                <div
                  key={game.id}
                  className="rounded-2xl glass-panel glass-panel-hover overflow-hidden flex flex-col justify-between border border-gray-800 relative group"
                >
                  {/* Card Header & Banner Image (if available) */}
                  <div>
                    {game.bannerUrl ? (
                      <div className="h-36 w-full relative overflow-hidden bg-dark-800">
                        <img
                          src={game.bannerUrl}
                          alt={game.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/40 to-transparent"></div>
                        <div className="absolute top-3 right-3 z-10">
                          {renderStatusBadge(game.status)}
                        </div>
                        <div className="absolute bottom-3 left-4 right-4 z-10">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded border border-cyan-500/30">
                            {game.category}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 border-b border-gray-800/60 flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded border border-cyan-500/30">
                            {game.category}
                          </span>
                        </div>
                        <div>{renderStatusBadge(game.status)}</div>
                      </div>
                    )}

                    {/* Card Content Body */}
                    <div className="p-5 space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                            {game.title}
                          </h3>
                          <span className="text-xs font-mono text-gray-400 bg-dark-800 px-2 py-0.5 rounded border border-gray-700">
                            {game.version}
                          </span>
                        </div>
                        {game.subtitle && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{game.subtitle}</p>
                        )}
                      </div>

                      {/* File Details & Note */}
                      <div className="text-xs text-gray-400 space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                          <span>เซิร์ฟเวอร์ดาวน์โหลด:</span>
                          <span className="text-purple-300 font-medium flex items-center gap-1">
                            <HardDrive className="w-3 h-3 text-cyan-400" /> Google Drive
                          </span>
                        </div>
                        {game.driveNote && (
                          <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-[11px] text-purple-200/90 flex items-start gap-2">
                            <Info className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                            <span>{game.driveNote}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer Button */}
                  <div className="p-5 pt-0 mt-2">
                    {canDownload ? (
                      <button
                        onClick={() => handleDownloadClick(game)}
                        className="w-full py-3 px-4 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                      >
                        <Download className="w-4 h-4" />
                        <span>ดาวน์โหลด Download (Google Drive)</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <button
                          disabled
                          className="w-full py-3 px-4 rounded-xl font-semibold text-xs text-gray-400 bg-gray-800/80 border border-gray-700 cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <Lock className="w-4 h-4 text-amber-400" />
                          <span>
                            {isGlobalMaint
                              ? 'ปิดปรับปรุงทั้งเว็บ'
                              : isGameDisabled
                                ? 'ปิดระบบดาวน์โหลดเกมนี้'
                                : game.status === 'detected'
                                  ? 'Detected - งดดาวน์โหลด'
                                  : 'กำลังอัปเดตไฟล์ระบบ'}
                          </span>
                        </button>
                        <p className="text-[10px] text-center text-amber-400/90 font-medium">
                          ⚠️ {isGlobalMaint ? settings.maintenanceMessage : 'ขณะนี้ไม่อนุญาตให้กดดาวน์โหลด โปรดรอแจ้งอัปเดตเพิ่มเติม'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Download Modal Popup */}
      {selectedGameForDownload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl glass-panel border border-purple-500/30 p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setSelectedGameForDownload(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{selectedGameForDownload.title}</h3>
                <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> สถานะ: Undetected (พร้อมใช้งาน)
                </p>
              </div>
            </div>

            <div className="space-y-3 bg-dark-800/80 p-4 rounded-xl border border-gray-800 text-xs text-gray-300">
              <div className="flex justify-between py-1 border-b border-gray-700/50">
                <span className="text-gray-400">เวอร์ชั่น:</span>
                <span className="font-mono text-purple-300">{selectedGameForDownload.version}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-700/50">
                <span className="text-gray-400">แหล่งเก็บไฟล์:</span>
                <span className="text-cyan-400 flex items-center gap-1 font-medium">
                  <HardDrive className="w-3 h-3" /> Google Drive Server
                </span>
              </div>
              {selectedGameForDownload.driveNote && (
                <div className="pt-1">
                  <span className="text-amber-400 font-medium block mb-1">คำแนะนำ / รหัสผ่าน:</span>
                  <p className="text-gray-300 bg-dark-900 p-2.5 rounded border border-gray-700/80 font-mono text-[11px]">
                    {selectedGameForDownload.driveNote}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <a
                href={selectedGameForDownload.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  const updated = games.map(g => g.id === selectedGameForDownload.id ? { ...g, downloadCount: g.downloadCount + 1 } : g);
                  setGames(updated);
                  localStorage.setItem('xx1_games', JSON.stringify(updated));
                  localStorage.setItem('xx1_has_custom_data', 'true');
                  setSelectedGameForDownload(null);
                }}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-5 h-5" />
                <span>ไปยังหน้าดาวน์โหลด Google Drive</span>
                <ExternalLink className="w-4 h-4 opacity-80" />
              </a>

              <p className="text-[10px] text-center text-gray-400">
                * ระบบจะเปิดลิงก์ Google Drive ในแท็บใหม่เพื่อความเร็วในการดาวน์โหลดสูงสุด
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-800/80 bg-dark-900/90 py-8 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-purple-400" />
            <span>© 2026 {settings.siteTitle || 'XX1 GAME HUB'}. All rights reserved. Vercel Ready Build.</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Undetected = ปลอดภัย
            </span>
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-400"></span> Detected = งดใช้งาน
            </span>
            <Link href="/admin" className="text-purple-400 hover:underline">
              ระบบหลังบ้าน Admin Panel
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
