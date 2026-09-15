'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  ArrowLeft, 
  Key, 
  Settings, 
  HardDrive, 
  Check, 
  X, 
  Bell, 
  AlertTriangle,
  ExternalLink,
  Gamepad2,
  LogOut,
  Sliders,
  Layers,
  Eye,
  EyeOff,
  Globe
} from 'lucide-react';
import { GameItem, SiteSettings, GameStatus } from '@/lib/types';
import { INITIAL_GAMES, INITIAL_SETTINGS } from '@/lib/constants';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [showInputPassword, setShowInputPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const [games, setGames] = useState<GameItem[]>(INITIAL_GAMES);
  const [settings, setSettings] = useState<SiteSettings>(INITIAL_SETTINGS);

  // Admin Site Settings & Password Change Form state
  const [siteTitleInput, setSiteTitleInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Modals state
  const [editingGame, setEditingGame] = useState<GameItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // New/Edit Form state
  const [formData, setFormData] = useState<Partial<GameItem>>({
    title: '',
    subtitle: '',
    version: 'v1.0.0',
    status: 'undetected',
    downloadUrl: '',
    isDownloadEnabled: true,
    category: 'FPS / Action',
    bannerUrl: '',
    driveNote: '',
  });

  // Load data & session
  useEffect(() => {
    const isAuth = sessionStorage.getItem('xx1_admin_auth') === 'true';
    if (isAuth) {
      setIsAuthenticated(true);
    }

    const savedGames = localStorage.getItem('xx1_games');
    const savedSettings = localStorage.getItem('xx1_settings');

    if (savedGames) {
      try { setGames(JSON.parse(savedGames)); } catch (e) {}
    }
    if (savedSettings) {
      try { 
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        setSiteTitleInput(parsed.siteTitle || 'XX1 GAME HUB');
      } catch (e) {}
    }

    // Fetch latest from API
    Promise.all([
      fetch('/api/games').then(r => r.json()).catch(() => null),
      fetch('/api/settings').then(r => r.json()).catch(() => null)
    ]).then(([gRes, sRes]) => {
      const hasLocalCustom = localStorage.getItem('xx1_has_custom_data') === 'true';

      if (gRes?.success && gRes.games) {
        if (gRes.isModified || !hasLocalCustom) {
          setGames(gRes.games);
          localStorage.setItem('xx1_games', JSON.stringify(gRes.games));
        }
      }
      if (sRes?.success && sRes.settings) {
        if (sRes.isModified || !hasLocalCustom) {
          setSettings(prev => ({ ...prev, ...sRes.settings }));
          setSiteTitleInput(sRes.settings.siteTitle || 'XX1 GAME HUB');
          localStorage.setItem('xx1_settings', JSON.stringify({ ...settings, ...sRes.settings }));
        }
      }
    });
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPassword === settings.adminPassword || inputPassword === 'admin1234') {
      setIsAuthenticated(true);
      sessionStorage.setItem('xx1_admin_auth', 'true');
      setAuthError('');
      showToast('เข้าสู่ระบบ Admin สำเร็จ');
    } else {
      setAuthError('รหัสผ่านไม่ถูกต้อง โปรดลองอีกครั้ง');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('xx1_admin_auth');
    showToast('ออกจากระบบเรียบร้อย');
  };

  // Sync state to API & LocalStorage
  const syncGames = async (updatedGames: GameItem[]) => {
    setGames(updatedGames);
    localStorage.setItem('xx1_games', JSON.stringify(updatedGames));
    localStorage.setItem('xx1_has_custom_data', 'true');
    window.dispatchEvent(new Event('storage'));

    try {
      await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: settings.adminPassword || 'admin1234', games: updatedGames }),
      });
    } catch (e) {
      console.error('API sync error:', e);
    }
  };

  const syncSettings = async (updatedSettings: SiteSettings) => {
    setSettings(updatedSettings);
    localStorage.setItem('xx1_settings', JSON.stringify(updatedSettings));
    localStorage.setItem('xx1_has_custom_data', 'true');
    window.dispatchEvent(new Event('storage'));

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: settings.adminPassword || 'admin1234', settings: updatedSettings }),
      });
    } catch (e) {
      console.error('API settings sync error:', e);
    }
  };

  // Save Site Title & Password Change Handler
  const handleSaveSiteSettings = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPasswordInput && newPasswordInput !== confirmPasswordInput) {
      showToast('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน', 'error');
      return;
    }

    const updatedSettings: SiteSettings = {
      ...settings,
      siteTitle: siteTitleInput.trim() || settings.siteTitle || 'XX1 GAME HUB',
      adminPassword: newPasswordInput.trim() ? newPasswordInput.trim() : settings.adminPassword,
    };

    syncSettings(updatedSettings);
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    showToast('บันทึกการตั้งค่าชื่อเว็บและรหัสผ่านใหม่เรียบร้อยแล้ว!');
  };

  // Quick Game Actions
  const handleToggleGameDownload = (gameId: string) => {
    const updated = games.map(g => g.id === gameId ? { ...g, isDownloadEnabled: !g.isDownloadEnabled } : g);
    syncGames(updated);
    showToast('สลับสถานะเปิด/ปิด ดาวน์โหลดเรียบร้อย');
  };

  const handleStatusChange = (gameId: string, status: GameStatus) => {
    const updated = games.map(g => g.id === gameId ? { ...g, status } : g);
    syncGames(updated);
    showToast(`เปลี่ยนสถานะเป็น ${status.toUpperCase()} เรียบร้อย`);
  };

  const handleDeleteGame = (gameId: string, title: string) => {
    if (confirm(`คุณต้องการลบรายการเกม "${title}" ใช่หรือไม่?`)) {
      const updated = games.filter(g => g.id !== gameId);
      syncGames(updated);
      showToast(`ลบ "${title}" เรียบร้อยแล้ว`);
    }
  };

  // Modal Submit (Create / Edit)
  const handleSaveGameForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.downloadUrl) {
      showToast('กรุณากรอกชื่อเกม และ ลิงก์ Google Drive', 'error');
      return;
    }

    if (isAddingNew) {
      const newGameItem: GameItem = {
        id: `game-${Date.now()}`,
        title: formData.title || 'GAME UNNAMED',
        subtitle: formData.subtitle || '',
        version: formData.version || 'v1.0.0',
        status: formData.status || 'undetected',
        downloadUrl: formData.downloadUrl || '',
        isDownloadEnabled: formData.isDownloadEnabled ?? true,
        category: formData.category || 'General',
        updatedAt: new Date().toISOString().split('T')[0],
        bannerUrl: formData.bannerUrl || '',
        downloadCount: 0,
        driveNote: formData.driveNote || '',
      };
      const updated = [newGameItem, ...games];
      syncGames(updated);
      showToast('เพิ่มรายการเกมใหม่สำเร็จ');
    } else if (editingGame) {
      const updated = games.map(g => g.id === editingGame.id ? {
        ...g,
        title: formData.title || g.title,
        subtitle: formData.subtitle || '',
        version: formData.version || g.version,
        status: formData.status || g.status,
        downloadUrl: formData.downloadUrl || g.downloadUrl,
        isDownloadEnabled: formData.isDownloadEnabled ?? g.isDownloadEnabled,
        category: formData.category || g.category,
        bannerUrl: formData.bannerUrl || '',
        driveNote: formData.driveNote || '',
        updatedAt: new Date().toISOString().split('T')[0],
      } : g);
      syncGames(updated);
      showToast('อัปเดตข้อมูลเกมสำเร็จ');
    }

    setIsAddingNew(false);
    setEditingGame(null);
  };

  const openEditModal = (game: GameItem) => {
    setEditingGame(game);
    setIsAddingNew(false);
    setFormData({ ...game });
  };

  const openAddModal = () => {
    setEditingGame(null);
    setIsAddingNew(true);
    setFormData({
      title: '',
      subtitle: '',
      version: 'v1.0.0',
      status: 'undetected',
      downloadUrl: '',
      isDownloadEnabled: true,
      category: 'FPS / Action',
      bannerUrl: '',
      driveNote: '',
    });
  };

  // 1. Password Protection View
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-dark-900 text-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern opacity-40 pointer-events-none"></div>

        <div className="w-full max-w-md p-8 rounded-3xl glass-panel border border-purple-500/30 shadow-2xl relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-400 p-0.5 mx-auto shadow-lg shadow-purple-500/30 flex items-center justify-center">
              <div className="w-full h-full bg-dark-900 rounded-[14px] flex items-center justify-center">
                <Key className="w-7 h-7 text-cyan-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white">ระบบหลังบ้าน Admin Login</h2>
            <p className="text-xs text-gray-400">กรุณาใส่รหัสผ่านเพื่อเข้าสู่ระบบจัดการเว็บ</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">รหัสผ่าน Admin Password</label>
              <div className="relative">
                <input
                  type={showInputPassword ? 'text' : 'password'}
                  placeholder="กรอกรหัสผ่าน Admin"
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-3 rounded-xl glass-input text-sm text-white placeholder-gray-500 focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowInputPassword(!showInputPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showInputPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/30 transition-all"
            >
              เข้าสู่ระบบหลังบ้าน
            </button>
          </form>

          <div className="text-center pt-2">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-purple-300 transition-colors">
              <ArrowLeft className="w-4 h-4" /> กลับสู่หน้าแรก (หน้าบ้าน)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authenticated Admin Dashboard View
  return (
    <div className="min-h-screen bg-dark-900 text-gray-100 flex flex-col relative">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-xs font-bold border shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 ${
          notification.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40 shadow-emerald-900/40' 
            : 'bg-red-950/90 text-red-300 border-red-500/40 shadow-red-900/40'
        }`}>
          {notification.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Admin Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-dark-900/80 border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                แผงควบคุมหลังบ้าน Admin Dashboard
              </h1>
              <p className="text-xs text-purple-300">ควบคุมสถานะไฟล์ ปุ่มดาวน์โหลด และการปิดปรับปรุงระบบ</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-dark-800 text-gray-300 border border-gray-700 hover:text-white hover:border-purple-500/40 flex items-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-4 h-4 text-cyan-400" />
              <span>ดูหน้าเว็บจริง (หน้าบ้าน)</span>
            </Link>

            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-600 hover:text-white flex items-center gap-1.5 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Global Control Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Site Title & Admin Password Settings */}
          <div className="rounded-2xl glass-panel p-6 border border-purple-500/20 space-y-4 col-span-1 md:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
              <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">ตั้งค่าชื่อเว็บ & รหัสผ่านหลังบ้าน</h3>
                <p className="text-xs text-gray-400">เปลี่ยนชื่อโลโก้เว็บและรหัสผ่านเข้าหลังบ้าน</p>
              </div>
            </div>

            <form onSubmit={handleSaveSiteSettings} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-300 mb-1">ชื่อเว็บไซต์ (Site Title):</label>
                <input
                  type="text"
                  required
                  value={siteTitleInput}
                  onChange={(e) => setSiteTitleInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
                  placeholder="เช่น HexSyncTH Download Hub"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">เปลี่ยนรหัสผ่าน Admin ใหม่ (เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน):</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl glass-input text-xs text-white"
                    placeholder="กรอกรหัสผ่านใหม่..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {newPasswordInput && (
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">ยืนยันรหัสผ่านใหม่:</label>
                  <input
                    type="password"
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
                    placeholder="กรอกยืนยันรหัสผ่านใหม่อีกครั้ง..."
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 shadow-md shadow-cyan-600/20 flex items-center justify-center gap-2 transition-all mt-2"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกชื่อเว็บ & รหัสผ่านใหม่</span>
              </button>
            </form>
          </div>

          {/* Card 2: Global Maintenance Switch */}
          <div className="rounded-2xl glass-panel p-6 border border-purple-500/20 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${settings.globalMaintenance ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {settings.globalMaintenance ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">ระบบปิดปรับปรุงทั้งเว็บ (Global Maintenance)</h3>
                  <p className="text-xs text-gray-400">ปิดดาวน์โหลดทุกรายการชั่วคราวพร้อมขึ้นป้ายเตือน</p>
                </div>
              </div>

              {/* Master Switch Button */}
              <button
                onClick={() => {
                  const updated = { ...settings, globalMaintenance: !settings.globalMaintenance };
                  syncSettings(updated);
                  showToast(updated.globalMaintenance ? 'เปิดโหมดปิดปรับปรุงทั้งเว็บแล้ว' : 'เปิดใช้งานระบบดาวน์โหลดปกติแล้ว');
                }}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                  settings.globalMaintenance ? 'bg-amber-500' : 'bg-gray-700'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  settings.globalMaintenance ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">ข้อความแจ้งเตือนตอนปิดปรับปรุง:</label>
              <input
                type="text"
                value={settings.maintenanceMessage}
                onChange={(e) => {
                  const updated = { ...settings, maintenanceMessage: e.target.value };
                  syncSettings(updated);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
                placeholder="ระบุข้อความแจ้งเตือน..."
              />
            </div>
          </div>

          {/* Card 3: Marquee Announcement Editor */}
          <div className="rounded-2xl glass-panel p-6 border border-purple-500/20 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">ข้อความประกาศข่าวสาร (Announcement Banner)</h3>
                  <p className="text-xs text-gray-400">แสดงข้อความส่วนหัวบนสุดของหน้าเว็บ</p>
                </div>
              </div>

              <button
                onClick={() => {
                  const updated = { ...settings, announcementActive: !settings.announcementActive };
                  syncSettings(updated);
                  showToast(updated.announcementActive ? 'เปิดแสดงข้อความประกาศแล้ว' : 'ซ่อนข้อความประกาศแล้ว');
                }}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                  settings.announcementActive ? 'bg-purple-600' : 'bg-gray-700'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  settings.announcementActive ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">เนื้อหาข้อความประกาศ:</label>
              <input
                type="text"
                value={settings.announcementText}
                onChange={(e) => {
                  const updated = { ...settings, announcementText: e.target.value };
                  syncSettings(updated);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
                placeholder="ระบุข้อความประกาศข่าวสาร..."
              />
            </div>
          </div>
        </div>

        {/* Game List Section Table & Toolbar */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                รายการเกมทั้งหมด ({games.length} รายการ)
              </h2>
              <p className="text-xs text-gray-400">จัดการสถานะ (Undetected/Detected), สลับสวิตช์ดาวน์โหลด และแก้ไขลิงก์ Google Drive</p>
            </div>

            <button
              onClick={openAddModal}
              className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มเกมใหม่ (Add Game)</span>
            </button>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl glass-panel border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-dark-800/90 text-gray-400 uppercase font-mono text-[11px] border-b border-gray-800">
                  <tr>
                    <th className="py-4 px-4">ชื่อเกม / ข้อมูล</th>
                    <th className="py-4 px-4">สถานะ (Status)</th>
                    <th className="py-4 px-4">สวิตช์ดาวน์โหลด</th>
                    <th className="py-4 px-4">ลิงก์ Google Drive</th>
                    <th className="py-4 px-4 text-right">เครื่องมือ (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {games.map((game) => (
                    <tr key={game.id} className="hover:bg-dark-800/40 transition-colors">
                      {/* Title & Details */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-dark-800 border border-gray-700 overflow-hidden shrink-0">
                            {game.bannerUrl ? (
                              <img src={game.bannerUrl} alt={game.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-purple-400">
                                <Gamepad2 className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-white text-sm block">{game.title}</span>
                            <span className="text-[11px] text-gray-400">{game.version} • {game.category}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-4 px-4">
                        <select
                          value={game.status}
                          onChange={(e) => handleStatusChange(game.id, e.target.value as GameStatus)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border focus:outline-none cursor-pointer ${
                            game.status === 'undetected'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : game.status === 'detected'
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          <option value="undetected" className="bg-dark-900 text-emerald-400">🟢 Undetected</option>
                          <option value="detected" className="bg-dark-900 text-red-400">🔴 Detected</option>
                          <option value="updating" className="bg-dark-900 text-amber-400">🟡 Updating</option>
                          <option value="maintenance" className="bg-dark-900 text-orange-400">🟠 Maintenance</option>
                        </select>
                      </td>

                      {/* Download Toggle Switch */}
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleGameDownload(game.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs border transition-all ${
                            game.isDownloadEnabled
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                          }`}
                        >
                          {game.isDownloadEnabled ? <Unlock className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
                          <span>{game.isDownloadEnabled ? 'เปิดดาวน์โหลด' : 'ปิดดาวน์โหลด'}</span>
                        </button>
                      </td>

                      {/* Download URL */}
                      <td className="py-4 px-4 max-w-xs">
                        <a
                          href={game.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:underline truncate block font-mono text-[11px]"
                        >
                          {game.downloadUrl}
                        </a>
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(game)}
                            className="p-2 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600 hover:text-white transition-all"
                            title="แก้ไขข้อมูล"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteGame(game.id, game.title)}
                            className="p-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-600 hover:text-white transition-all"
                            title="ลบเกม"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Add / Edit Game Modal Dialog */}
      {(isAddingNew || editingGame) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl glass-panel border border-purple-500/30 p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={() => { setIsAddingNew(false); setEditingGame(null); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-purple-400" />
              {isAddingNew ? 'เพิ่มรายการเกมใหม่' : `แก้ไขข้อมูล: ${editingGame?.title}`}
            </h3>

            <form onSubmit={handleSaveGameForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">ชื่อเกม (Game Name) *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="เช่น GAME XX1"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">เวอร์ชั่น (Version)</label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="เช่น v2.4.1"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">คำอธิบายย่อ (Subtitle)</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="เช่น VIP Cheat & Status Monitor System"
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">สถานะเกม (Status)</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as GameStatus })}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white bg-dark-900"
                  >
                    <option value="undetected">🟢 Undetected (ปลอดภัย)</option>
                    <option value="detected">🔴 Detected (งดใช้งาน)</option>
                    <option value="updating">🟡 Updating (กำลังอัปเดต)</option>
                    <option value="maintenance">🟠 Maintenance (ปิดปรับปรุง)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">หมวดหมู่ (Category)</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="เช่น FPS / Battle Royale"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">ลิงก์ดาวน์โหลด Google Drive *</label>
                <input
                  type="url"
                  required
                  value={formData.downloadUrl}
                  onChange={(e) => setFormData({ ...formData, downloadUrl: e.target.value })}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">ลิงก์รูปภาพประกอบ (Banner Image URL)</label>
                <input
                  type="url"
                  value={formData.bannerUrl}
                  onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">รหัสแตกไฟล์ หรือ คำแนะนำ (Note / Password)</label>
                <textarea
                  rows={2}
                  value={formData.driveNote}
                  onChange={(e) => setFormData({ ...formData, driveNote: e.target.value })}
                  placeholder="เช่น รหัสแตกไฟล์คือ xx1vip"
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isDownloadEnabled"
                  checked={formData.isDownloadEnabled}
                  onChange={(e) => setFormData({ ...formData, isDownloadEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-dark-900 border-gray-700"
                />
                <label htmlFor="isDownloadEnabled" className="font-semibold text-gray-300 cursor-pointer">
                  เปิดปุ่มดาวน์โหลดสำหรับเกมนี้ (Allow Download)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => { setIsAddingNew(false); setEditingGame(null); }}
                  className="px-4 py-2.5 rounded-xl font-semibold bg-gray-800 text-gray-300 hover:bg-gray-700"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/30 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกข้อมูล</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
