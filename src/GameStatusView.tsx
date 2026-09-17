import React, { useState, useEffect } from 'react';
import {
  Upload,
  
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
  X,
  Gamepad2,
  Bell,
  Clock,
  Copy,
  CheckCircle2,
  Edit3,
  Plus,
  Trash2,
  Save
} from 'lucide-react';

export type GameStatus = 'undetected' | 'detected' | 'updating';

export interface GameItem {
  id: string;
  title: string;
  subtitle: string;
  version: string;
  status: GameStatus;
  downloadUrl: string;
  isDownloadEnabled: boolean;
  category: string;
  updatedAt: string;
  bannerUrl: string;
  downloadCount: number;
  driveNote: string;
}

export interface StatusSettings {
  globalMaintenance: boolean;
  maintenanceMessage: string;
  announcementText: string;
  announcementActive: boolean;
}

const DEFAULT_GAMES: GameItem[] = [
  {
    id: 'game-1',
    title: 'GAME XX1 (VIP)',
    subtitle: 'ระบบเช็คสถานะ & เมนูช่วยเล่น VIP',
    version: 'v2.4.1 (Latest)',
    status: 'undetected',
    downloadUrl: 'https://drive.google.com',
    isDownloadEnabled: true,
    category: 'FPS / Action',
    updatedAt: '2026-09-15',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
    downloadCount: 12450,
    driveNote: 'รหัสแตกไฟล์ zip คือ: xx1vip (แนะนำปิด Antivirus ชั่วคราวก่อนแตกไฟล์)',
  },
  {
    id: 'game-2',
    title: 'GAME XX2 (Mod Menu)',
    subtitle: 'Mod Menu & Script Loader',
    version: 'v1.8.0',
    status: 'detected',
    downloadUrl: 'https://drive.google.com',
    isDownloadEnabled: false,
    category: 'Battle Royale',
    updatedAt: '2026-09-14',
    bannerUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
    downloadCount: 8930,
    driveNote: 'สถานะตอนนี้ Detected! ห้ามใช้งานเด็ดขาด ทีมงานกำลังแก้ปัญหาอยู่',
  },
  {
    id: 'game-3',
    title: 'GAME XX3 (Auto Farm)',
    subtitle: 'Auto Farm & Quest Helper',
    version: 'v3.1.0',
    status: 'updating',
    downloadUrl: 'https://drive.google.com',
    isDownloadEnabled: false,
    category: 'MMORPG / RPG',
    updatedAt: '2026-09-15',
    bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
    downloadCount: 5410,
    driveNote: 'อยู่ระหว่างปรับปรุงระบบ รองรับแพตช์เกมเวอร์ชันล่าสุด',
  },
  {
    id: 'game-4',
    title: 'GAME XX4 (Skin / Tool)',
    subtitle: 'Skin Changer & Crosshair Tool',
    version: 'v1.0.5',
    status: 'undetected',
    downloadUrl: 'https://drive.google.com',
    isDownloadEnabled: true,
    category: 'Utilities',
    updatedAt: '2026-09-13',
    bannerUrl: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=600&q=80',
    downloadCount: 3200,
    driveNote: 'ใช้งานได้ปลอดภัย 100% ปลดล็อกสกินทันที รหัสแตกไฟล์: hexsync',
  }
];

const DEFAULT_SETTINGS: StatusSettings = {
  globalMaintenance: false,
  maintenanceMessage: 'ระบบดาวน์โหลดปิดปรับปรุงชั่วคราว เพื่ออัปเดตความปลอดภัยสูงสุด กรุณาลองใหม่อีกครั้งในภายหลัง',
  announcementText: '🔥 ข่าวสารล่าสุด: ระบบอัปเดตเวอร์ชันใหม่เรียบร้อยแล้ว! ทุกเกมปลอดภัย 100%',
  announcementActive: true,
};

interface GameStatusViewProps {
  user: {
    username: string;
    role?: string;
  } | null;
  onBackToStore: () => void;
}

export const GameStatusView: React.FC<GameStatusViewProps> = ({ user, onBackToStore }) => {
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const [games, setGames] = useState<GameItem[]>(() => {
    try {
      const saved = localStorage.getItem('hexsync_games_status');
      return saved ? JSON.parse(saved) : DEFAULT_GAMES;
    } catch {
      return DEFAULT_GAMES;
    }
  });

  const [settings, setSettings] = useState<StatusSettings>(() => {
    try {
      const saved = localStorage.getItem('hexsync_status_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | GameStatus>('all');
  const [selectedGameForDownload, setSelectedGameForDownload] = useState<GameItem | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeLicenses, setActiveLicenses] = useState<Record<string, { gameId: string; productName: string; expiresAt: string; remainingMs: number }>>({});
  const [isLicenseAdmin, setIsLicenseAdmin] = useState(false);
  const [lockedModalGame, setLockedModalGame] = useState<GameItem | null>(null);

  // Admin edit states
  const [editingGame, setEditingGame] = useState<GameItem | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

    // Fetch games & settings from server / Supabase on mount
  useEffect(() => {
    fetch('/api/games')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && Array.isArray(data.games)) {
          setGames(data.games);
          localStorage.setItem('hexsync_games_status', JSON.stringify(data.games));
        }
      })
      .catch(() => {});

    
    const token = localStorage.getItem('hexsync_token');
    if (token) {
      fetch('/api/purchases/active-licenses', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            setIsLicenseAdmin(Boolean(data.isAdmin));
            if (data.licenses) setActiveLicenses(data.licenses);
          }
        })
        .catch(() => {});
    }

    fetch('/api/games/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.settings) {
          setSettings(data.settings);
          localStorage.setItem('hexsync_status_settings', JSON.stringify(data.settings));
        }
      })
      .catch(() => {});
  }, []);

  // Save to Database (Supabase Cloud) and localStorage
  const handleSaveGames = async (newGames: GameItem[]) => {
    setGames(newGames);
    localStorage.setItem('hexsync_games_status', JSON.stringify(newGames));
    try {
      const token = localStorage.getItem('hexsync_token');
      await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ games: newGames })
      });
    } catch (err) {
      console.error('Failed to sync games to server:', err);
    }
  };

  const handleSaveSettings = async (newSettings: StatusSettings) => {
    setSettings(newSettings);
    localStorage.setItem('hexsync_status_settings', JSON.stringify(newSettings));
    try {
      const token = localStorage.getItem('hexsync_token');
      await fetch('/api/games/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ settings: newSettings })
      });
    } catch (err) {
      console.error('Failed to sync settings to server:', err);
    }
  };

  
  const formatRemaining = (targetDateStr: string) => {
    const diff = new Date(targetDateStr).getTime() - Date.now();
    if (diff <= 0) return 'หมดอายุแล้ว';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    if (days > 0) return `เหลือ ${days} วัน ${hours} ชม.`;
    if (hours > 0) return `เหลือ ${hours} ชม. ${mins} นาที`;
    return `เหลือ ${mins} นาที`;
  };

  const handleCopyNote = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Image Upload helper from computer files (auto-compress to base64)
  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = (file.name || '').toLowerCase();
    const fileType = (file.type || '').toLowerCase();
    const isGif = fileType.includes('gif') || fileName.endsWith('.gif');
    const isSvg = fileType.includes('svg') || fileName.endsWith('.svg');

    if (!file.type.startsWith('image/') && !isGif && !isSvg) {
      alert('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (JPG, PNG, WebP, GIF, SVG)');
      e.target.value = '';
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert('ไฟล์รูปภาพมีขนาดใหญ่เกินไป (จำกัดไม่เกิน 20MB)');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (!result) return;

      if (isGif || isSvg) {
        if (editingGame) {
          setEditingGame({ ...editingGame, bannerUrl: result });
        }
        e.target.value = '';
        return;
      }

      // Auto-compress for crisp quality and fast web loading
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.88);
            if (editingGame) {
              setEditingGame({ ...editingGame, bannerUrl: compressed });
            }
          } else {
            if (editingGame) {
              setEditingGame({ ...editingGame, bannerUrl: result });
            }
          }
        } catch {
          if (editingGame) {
            setEditingGame({ ...editingGame, bannerUrl: result });
          }
        }
        e.target.value = '';
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const filteredGames = games.filter(game => {
    const matchesFilter = selectedFilter === 'all' || game.status === selectedFilter;
    const matchesSearch = 
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts = {
    all: games.length,
    undetected: games.filter(g => g.status === 'undetected').length,
    updating: games.filter(g => g.status === 'updating').length,
    detected: games.filter(g => g.status === 'detected').length,
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ 
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <ShieldCheck size={14} /> สมาชิกเข้าถึงแล้ว (Member Verified)
            </span>
            {isAdmin && (
              <button
                onClick={() => setShowAdminPanel(!showAdminPanel)}
                style={{
                  background: showAdminPanel ? '#ef4444' : '#374151',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Settings size={14} /> {showAdminPanel ? 'ปิดระบบจัดการ' : '⚙️ จัดการสถานะเกม (Admin)'}
              </button>
            )}
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '8px 0 4px', color: '#fff' }}>
            🎮 ระบบเช็คสถานะ & ศูนย์ดาวน์โหลดเกม
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.95rem', margin: 0 }}>
            ตรวจสอบความปลอดภัยแบบเรียลไทม์ ดาวน์โหลดไฟล์เวอร์ชันล่าสุดพร้อมคำแนะนำการใช้งาน
          </p>
        </div>

        <button
          onClick={onBackToStore}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#e5e7eb',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '10px 18px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
        >
          ← กลับหน้าร้านค้า
        </button>
      </div>

      {/* Admin Panel Drawer */}
      {isAdmin && showAdminPanel && (
        <div style={{
          background: 'rgba(24, 24, 27, 0.95)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '14px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
        }}>
          <h3 style={{ color: '#ef4444', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
            <Settings size={18} /> แผงควบคุมระบบหลังบ้าน (Admin Status Controller)
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            {/* Global Maintenance Toggle */}
            <div style={{ background: '#18181b', padding: '1rem', borderRadius: '10px', border: '1px solid #27272a' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>⚠️ ปิดปรับปรุงทั้งระบบ (Maintenance)</span>
                <input
                  type="checkbox"
                  checked={settings.globalMaintenance}
                  onChange={(e) => handleSaveSettings({ ...settings, globalMaintenance: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>
              <input
                type="text"
                value={settings.maintenanceMessage}
                onChange={(e) => handleSaveSettings({ ...settings, maintenanceMessage: e.target.value })}
                placeholder="ข้อความแจ้งปิดปรับปรุง..."
                style={{
                  width: '100%',
                  background: '#09090b',
                  border: '1px solid #3f3f46',
                  color: '#fff',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            {/* Announcement Editor */}
            <div style={{ background: '#18181b', padding: '1rem', borderRadius: '10px', border: '1px solid #27272a' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>📢 แถบประกาศแจ้งเตือน</span>
                <input
                  type="checkbox"
                  checked={settings.announcementActive}
                  onChange={(e) => handleSaveSettings({ ...settings, announcementActive: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>
              <input
                type="text"
                value={settings.announcementText}
                onChange={(e) => handleSaveSettings({ ...settings, announcementText: e.target.value })}
                placeholder="ข้อความแถบประกาศ..."
                style={{
                  width: '100%',
                  background: '#09090b',
                  border: '1px solid #3f3f46',
                  color: '#fff',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                const newGame: GameItem = {
                  id: 'game-' + Date.now(),
                  title: 'เกมใหม่',
                  subtitle: 'คำอธิบายเกมสั้นๆ',
                  version: 'v1.0.0',
                  status: 'undetected',
                  downloadUrl: 'https://drive.google.com',
                  isDownloadEnabled: true,
                  category: 'Action',
                  updatedAt: new Date().toISOString().split('T')[0],
                  bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
                  downloadCount: 0,
                  driveNote: 'รหัสแตกไฟล์: hexsync',
                };
                handleSaveGames([newGame, ...games]);
                setEditingGame(newGame);
              }}
              style={{
                background: '#10b981',
                color: '#fff',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} /> เพิ่มเกมใหม่ในระบบ
            </button>
            <button
              onClick={() => {
                if (confirm('คุณต้องการรีเซ็ตข้อมูลเกมทั้งหมดกลับเป็นค่าเริ่มต้นหรือไม่?')) {
                  handleSaveGames(DEFAULT_GAMES);
                  handleSaveSettings(DEFAULT_SETTINGS);
                }
              }}
              style={{
                background: '#374151',
                color: '#d1d5db',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              🔄 รีเซ็ตเป็นค่าเริ่มต้น
            </button>
          </div>
        </div>
      )}

      {/* Global Maintenance Alert */}
      {settings.globalMaintenance && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid #ef4444',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertTriangle size={24} color="#ef4444" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '1rem' }}>แจ้งเตือน: ปิดปรับปรุงระบบดาวน์โหลด</div>
            <div style={{ color: '#fca5a5', fontSize: '0.9rem' }}>{settings.maintenanceMessage}</div>
          </div>
        </div>
      )}

      {/* Announcement Banner */}
      {settings.announcementActive && !settings.globalMaintenance && settings.announcementText && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(255, 26, 64, 0.15), rgba(16, 185, 129, 0.15))',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '0.75rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Bell size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
          <span style={{ color: '#f3f4f6', fontSize: '0.9rem', fontWeight: 500 }}>{settings.announcementText}</span>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        gap: '1rem', 
        marginBottom: '1.5rem', 
        flexWrap: 'wrap' 
      }}>
        {/* Filter Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedFilter('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: selectedFilter === 'all' ? '1px solid #ff1a40' : '1px solid rgba(255, 255, 255, 0.1)',
              background: selectedFilter === 'all' ? 'rgba(255, 26, 64, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: selectedFilter === 'all' ? '#ff4d6d' : '#9ca3af',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            ทั้งหมด ({counts.all})
          </button>
          <button
            onClick={() => setSelectedFilter('undetected')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: selectedFilter === 'undetected' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
              background: selectedFilter === 'undetected' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: selectedFilter === 'undetected' ? '#34d399' : '#9ca3af',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
            ปลอดภัย / Undetected ({counts.undetected})
          </button>
          <button
            onClick={() => setSelectedFilter('updating')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: selectedFilter === 'updating' ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
              background: selectedFilter === 'updating' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: selectedFilter === 'updating' ? '#fbbf24' : '#9ca3af',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span>
            กำลังอัปเดต ({counts.updating})
          </button>
          <button
            onClick={() => setSelectedFilter('detected')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: selectedFilter === 'detected' ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
              background: selectedFilter === 'detected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: selectedFilter === 'detected' ? '#f87171' : '#9ca3af',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
            ตรวจพบความเสี่ยง ({counts.detected})
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', minWidth: '240px', flex: '1 1 auto', maxWidth: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
          <input
            type="text"
            placeholder="ค้นหาชื่อเกมหรือประเภท..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '8px 14px 8px 36px',
              color: '#fff',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Games Cards Grid */}
      {filteredGames.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 1rem',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '16px',
          border: '1px dashed rgba(255, 255, 255, 0.1)'
        }}>
          <Gamepad2 size={48} style={{ color: '#6b7280', marginBottom: '12px' }} />
          <h3 style={{ color: '#e5e7eb', margin: '0 0 6px' }}>ไม่พบรายการเกมตามเงื่อนไข</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0 }}>ลองเปลี่ยนคำค้นหาหรือเลือกดูหมวดหมู่อื่น</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem'
        }}>
          {filteredGames.map(game => {
            const isUndetected = game.status === 'undetected';
            const isDetected = game.status === 'detected';
            const isUpdating = game.status === 'updating';

            const hasAdminPrivilege = isAdmin || isLicenseAdmin || user?.role === 'admin' || user?.role === 'superadmin';
            const licenseInfo = activeLicenses[game.id];
            const hasRentalAccess = hasAdminPrivilege || Boolean(licenseInfo && new Date(licenseInfo.expiresAt).getTime() > Date.now());
            const canDownload = game.isDownloadEnabled && !settings.globalMaintenance && isUndetected && hasRentalAccess;

            return (
              <div
                key={game.id}
                style={{
                  background: 'rgba(20, 20, 25, 0.85)',
                  border: isUndetected 
                    ? '1px solid rgba(16, 185, 129, 0.3)' 
                    : isDetected 
                    ? '1px solid rgba(239, 68, 68, 0.3)' 
                    : '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
                }}
              >
                {/* Card Banner */}
                <div style={{ position: 'relative', height: '140px', background: '#111' }}>
                  <img
                    src={game.bannerUrl}
                    alt={game.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(20, 20, 25, 1) 0%, rgba(20, 20, 25, 0.3) 100%)'
                  }}></div>

                  {/* Status Badge */}
                  <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                    {isUndetected && (
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.9)',
                        color: '#fff',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 0 12px rgba(16, 185, 129, 0.6)'
                      }}>
                        <ShieldCheck size={14} /> UNDETECTED
                      </span>
                    )}
                    {isUpdating && (
                      <span style={{
                        background: 'rgba(245, 158, 11, 0.9)',
                        color: '#fff',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 0 12px rgba(245, 158, 11, 0.6)'
                      }}>
                        <RefreshCw size={14} /> UPDATING
                      </span>
                    )}
                    {isDetected && (
                      <span style={{
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: '#fff',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 0 12px rgba(239, 68, 68, 0.6)'
                      }}>
                        <ShieldAlert size={14} /> DETECTED
                      </span>
                    )}
                  </div>

                  <div style={{ position: 'absolute', bottom: '10px', left: '14px' }}>
                    <span style={{
                      background: 'rgba(0, 0, 0, 0.6)',
                      color: '#d1d5db',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 500
                    }}>
                      {game.category}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                        {game.title}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#9ca3af', lineHeight: 1.4 }}>
                        {game.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Version & Date Meta */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '1rem',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: '#9ca3af'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Sparkles size={14} color="#60a5fa" /> {game.version}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={14} /> {game.updatedAt}
                    </span>
                  </div>

                  {/* Drive note preview if any */}
                  {game.driveNote && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px dashed rgba(255, 255, 255, 0.08)',
                      fontSize: '0.8rem',
                      color: '#cbd5e1'
                    }}>
                      💡 {game.driveNote}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* License Access Status Badge */}
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: hasRentalAccess ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.1)',
                      border: hasRentalAccess ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.25)',
                      color: hasRentalAccess ? '#10b981' : '#f87171'
                    }}>
                      {hasAdminPrivilege ? (
                        <><span>👑</span> <span>สิทธิ์แอดมิน (เข้าถึงได้ทุกเกม)</span></>
                      ) : hasRentalAccess ? (
                        <><span>✅</span> <span>สิทธิ์เช่าพร้อมใช้งาน ({formatRemaining(licenseInfo.expiresAt)})</span></>
                      ) : (
                        <><span>🔒</span> <span>ต้องเช่าเกมเพื่อปลดล็อกดาวน์โหลด</span></>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!hasRentalAccess ? (
                        <button
                          onClick={() => setLockedModalGame(game)}
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: '#f87171',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 10px rgba(239, 68, 68, 0.2)'
                          }}
                        >
                          <Lock size={15} />
                          <span>เช่าเกมเพื่อปลดล็อกดาวน์โหลด</span>
                        </button>
                      ) : (
                        <button
                          disabled={!canDownload}
                          onClick={() => setSelectedGameForDownload(game)}
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: 'none',
                            background: canDownload
                              ? 'linear-gradient(135deg, #10b981, #059669)'
                              : 'rgba(255, 255, 255, 0.08)',
                            color: canDownload ? '#fff' : '#6b7280',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            cursor: canDownload ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: canDownload ? '0 4px 14px rgba(16, 185, 129, 0.35)' : 'none'
                          }}
                        >
                          {canDownload ? (
                            <>
                              <Download size={16} /> ดาวน์โหลดไฟล์
                            </>
                          ) : isDetected ? (
                            <>
                              <Lock size={16} /> ปิดดาวน์โหลด (Detected)
                            </>
                          ) : isUpdating ? (
                            <>
                              <RefreshCw size={16} /> อยู่ระหว่างอัปเดต
                            </>
                          ) : (
                            <>
                              <Lock size={16} /> ปิดดาวน์โหลดชั่วคราว
                            </>
                          )}
                        </button>
                      )}

                    {/* Admin Quick Action */}
                    {isAdmin && (
                      <button
                        onClick={() => setEditingGame(game)}
                        title="แก้ไขข้อมูลเกมนี้"
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#fff',
                          borderRadius: '10px',
                          padding: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Edit3 size={16} />
                      </button>
                    )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Locked Game Modal (Requires Rental) */}
      {lockedModalGame && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#18181b',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '18px',
            maxWidth: '480px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(239, 68, 68, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Lock size={20} color="#ef4444" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>
                    ต้องเช่าเกมเพื่อปลดล็อกดาวน์โหลด
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#9ca3af' }}>
                    {lockedModalGame.title} ({lockedModalGame.category})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLockedModalGame(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.25rem',
                fontSize: '0.88rem',
                lineHeight: 1.6,
                color: '#cbd5e1'
              }}>
                🔒 คุณยังไม่มีสิทธิ์เช่าเกม <strong>{lockedModalGame.title}</strong> หรือเวลาเช่าเดิมของคุณหมดอายุแล้ว
                <div style={{ marginTop: '0.5rem', color: '#9ca3af', fontSize: '0.8rem' }}>
                  ระบบจำกัดสิทธิ์ให้เฉพาะผู้ที่เช่าเกมจริงเท่านั้น จึงจะสามารถดาวน์โหลดไฟล์และดูวิธีติดตั้งได้
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  onClick={() => {
                    setLockedModalGame(null);
                    onBackToStore();
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #ff1a40, #ff4d6d)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 15px rgba(255, 26, 64, 0.4)'
                  }}
                >
                  <Sparkles size={18} />
                  <span>ไปเลือกเช่าเกมนี้ที่หน้าร้านค้า</span>
                </button>

                <button
                  onClick={() => setLockedModalGame(null)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'transparent',
                    color: '#9ca3af',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download Modal */}
      {selectedGameForDownload && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#18181b',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '18px',
            maxWidth: '500px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #27272a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  padding: '8px',
                  borderRadius: '10px'
                }}>
                  <Download size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>
                    ดาวน์โหลด: {selectedGameForDownload.title}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{selectedGameForDownload.version}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedGameForDownload(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem' }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                <ShieldCheck size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.85rem', color: '#d1fae5', lineHeight: 1.5 }}>
                  ไฟล์นี้ผ่านการตรวจสอบสถานะ <strong>Undetected</strong> และปลอดภัยสำหรับการใช้งาน ณ เวลาปัจจุบัน
                </div>
              </div>

              {/* Password / Note Box */}
              {selectedGameForDownload.driveNote && (
                <div style={{
                  background: '#09090b',
                  border: '1px solid #27272a',
                  borderRadius: '10px',
                  padding: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '6px' }}>
                    📝 ข้อมูลและรหัสผ่านแตกไฟล์:
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}>
                    <code style={{
                      color: '#fbbf24',
                      fontSize: '0.95rem',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all'
                    }}>
                      {selectedGameForDownload.driveNote}
                    </code>
                    <button
                      onClick={() => handleCopyNote(selectedGameForDownload.driveNote)}
                      style={{
                        background: '#27272a',
                        color: copySuccess ? '#10b981' : '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0
                      }}
                    >
                      {copySuccess ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                      {copySuccess ? 'คัดลอกแล้ว!' : 'คัดลอก'}
                    </button>
                  </div>
                </div>
              )}

              {/* Download Action */}
              <a
                href={selectedGameForDownload.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  // Increment download count
                  const updated = games.map(g => 
                    g.id === selectedGameForDownload.id ? { ...g, downloadCount: g.downloadCount + 1 } : g
                  );
                  handleSaveGames(updated);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '1rem',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)'
                }}
              >
                <ExternalLink size={18} /> ไปยังหน้าดาวน์โหลด (Google Drive)
              </a>

              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#6b7280', marginTop: '10px', marginBottom: 0 }}>
                * ลิงก์ดาวน์โหลดจะเปิดในแท็บใหม่ผ่านระบบเก็บไฟล์ที่ปลอดภัย
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Admin Game Editor Modal */}
      {isAdmin && editingGame && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#18181b',
            border: '1px solid #3f3f46',
            borderRadius: '16px',
            maxWidth: '550px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }}>
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid #27272a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>⚙️ แก้ไขข้อมูลเกม: {editingGame.title}</h3>
              <button
                onClick={() => setEditingGame(null)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>ชื่อเกม (Title)</label>
                <input
                  type="text"
                  value={editingGame.title}
                  onChange={(e) => setEditingGame({ ...editingGame, title: e.target.value })}
                  style={{ width: '100%', background: '#09090b', border: '1px solid #3f3f46', color: '#fff', padding: '8px 10px', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>คำอธิบายใต้ชื่อเกม (Subtitle)</label>
                <input
                  type="text"
                  placeholder="เช่น ระบบเช็คสถานะ & เมนูช่วยเล่น VIP"
                  value={editingGame.subtitle || ''}
                  onChange={(e) => setEditingGame({ ...editingGame, subtitle: e.target.value })}
                  style={{ width: '100%', background: '#09090b', border: '1px solid #3f3f46', color: '#fff', padding: '8px 10px', borderRadius: '6px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>สถานะความปลอดภัย</label>
                  <select
                    value={editingGame.status}
                    onChange={(e) => setEditingGame({ ...editingGame, status: e.target.value as GameStatus })}
                    style={{ width: '100%', background: '#09090b', border: '1px solid #3f3f46', color: '#fff', padding: '8px 10px', borderRadius: '6px' }}
                  >
                    <option value="undetected">🟢 Undetected (ปลอดภัย)</option>
                    <option value="updating">🟡 Updating (กำลังอัปเดต)</option>
                    <option value="detected">🔴 Detected (ตรวจพบ/เสี่ยง)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>เปิดให้ดาวน์โหลด</label>
                  <select
                    value={editingGame.isDownloadEnabled ? 'true' : 'false'}
                    onChange={(e) => setEditingGame({ ...editingGame, isDownloadEnabled: e.target.value === 'true' })}
                    style={{ width: '100%', background: '#09090b', border: '1px solid #3f3f46', color: '#fff', padding: '8px 10px', borderRadius: '6px' }}
                  >
                    <option value="true">เปิดดาวน์โหลด</option>
                    <option value="false">ปิดดาวน์โหลด</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>ลิงก์ดาวน์โหลด (Google Drive / Direct URL)</label>
                <input
                  type="text"
                  value={editingGame.downloadUrl}
                  onChange={(e) => setEditingGame({ ...editingGame, downloadUrl: e.target.value })}
                  style={{ width: '100%', background: '#09090b', border: '1px solid #3f3f46', color: '#fff', padding: '8px 10px', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>บันทึกรหัสผ่าน / วิธีแตกไฟล์ (Drive Note)</label>
                <input
                  type="text"
                  value={editingGame.driveNote}
                  onChange={(e) => setEditingGame({ ...editingGame, driveNote: e.target.value })}
                  style={{ width: '100%', background: '#09090b', border: '1px solid #3f3f46', color: '#fff', padding: '8px 10px', borderRadius: '6px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>เวอร์ชัน</label>
                  <input
                    type="text"
                    value={editingGame.version}
                    onChange={(e) => setEditingGame({ ...editingGame, version: e.target.value })}
                    style={{ width: '100%', background: '#09090b', border: '1px solid #3f3f46', color: '#fff', padding: '8px 10px', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>หมวดหมู่</label>
                  <input
                    type="text"
                    value={editingGame.category}
                    onChange={(e) => setEditingGame({ ...editingGame, category: e.target.value })}
                    style={{ width: '100%', background: '#09090b', border: '1px solid #3f3f46', color: '#fff', padding: '8px 10px', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
                  รูปภาพปกเกม (Banner)
                </label>
                
                {/* Upload Button from PC */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <label
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Upload size={15} />
                    <span>📁 อัปโหลดรูปภาพจากเครื่องคอมพิวเตอร์</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleBannerUpload}
                    />
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#71717a' }}>หรือวาง URL ด้านล่าง</span>
                </div>

                <input
                  type="text"
                  placeholder="https://... หรือกดอัปโหลดจากคอมด้านบน"
                  value={editingGame.bannerUrl}
                  onChange={(e) => setEditingGame({ ...editingGame, bannerUrl: e.target.value })}
                  style={{ width: '100%', background: '#09090b', border: '1px solid #3f3f46', color: '#fff', padding: '8px 10px', borderRadius: '6px', fontSize: '0.85rem' }}
                />

                {/* Banner Preview */}
                {editingGame.bannerUrl && (
                  <div style={{ marginTop: '8px', position: 'relative', height: '110px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #27272a', background: '#111' }}>
                    <img
                      src={editingGame.bannerUrl}
                      alt="Banner Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div style={{ position: 'absolute', bottom: '4px', right: '6px', background: 'rgba(0,0,0,0.75)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>
                      ✓ ตัวอย่างภาพปก
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                <button
                  onClick={() => {
                    if (confirm(`ลบเกม "${editingGame.title}" ออกจากระบบ?`)) {
                      const updated = games.filter(g => g.id !== editingGame.id);
                      handleSaveGames(updated);
                      setEditingGame(null);
                    }
                  }}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Trash2 size={16} /> ลบเกมนี้
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setEditingGame(null)}
                    style={{ background: '#27272a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => {
                      const updated = games.map(g => g.id === editingGame.id ? editingGame : g);
                      handleSaveGames(updated);
                      setEditingGame(null);
                    }}
                    style={{
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 18px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Save size={16} /> บันทึกข้อมูล
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
