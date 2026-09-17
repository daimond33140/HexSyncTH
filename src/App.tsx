import { GameStatusView } from './GameStatusView';
import { ShieldCheck } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import {
  IconKey,
  IconGamepad,
  IconLaptop,
  IconShield,
  IconSearch,
  IconSparkles,
  IconWallet,
  IconUser,
  IconCopy,
  IconCheck,
  IconExternalLink,
  IconPlusCircle,
  IconHistory,
  IconShoppingBag,
  IconCheckCircle2,
  IconX,
  IconLogOut,
  IconZap,
  IconLayers,
  IconArrowRight,
  IconCart,
  IconDownload,
  IconGift,
  IconLock,
  IconTrash,
  IconSettings,
  IconAlertCircle,
  IconFileText,
  IconUserCheck,
  IconEdit,
  IconUpload,
  IconEye,
  IconPlus,
  IconMinus,
  IconTag,
  IconBarChart,
  IconQrCode,
  IconCreditCard,
  IconMusic,
  IconPlay,
  IconPause,
  IconVolume2,
  IconVolumeX,
  IconInstagram,
  IconClock,
  IconRefreshCw
} from './icons';
import jsQR from 'jsqr';
import { collectFullDeviceInfo, getPersistentDeviceId, type DeviceInfoData } from './deviceInfo';
import './App.css';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface Product {
  id: number;
  name: string;
  categoryId: string;
  price: number;
  originalPrice?: number;
  key?: string;
  downloadUrl: string;
  description: string;
  image: string;
  badge?: string;
  stock: number;
  active: boolean;
  isFeatured?: boolean;
  linkedGameId?: string | null;
  durationHours?: number | null;
  durationDays?: number | null;
}

interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  bannerImage?: string;
  icon?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
  productCount?: number;
}

interface ProductKeyItem {
  id: number;
  productId: number;
  keyString: string;
  isUsed: boolean;
  usedBy?: string;
  usedAt?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface PurchaseRecord {
  id: number;
  productName: string;
  price: number;
  key: string;
  downloadUrl: string;
  purchaseDate: string;
  linkedGameId?: string | null;
  durationHours?: number | null;
  expiresAt?: string | null;
}

interface UserState {
  id: number;
  username: string;
  email: string;
  role: 'member' | 'admin' | 'superadmin';
  balance: number;
  isBanned?: boolean;
  banReason?: string;
  bannedBy?: string;
  bannedAt?: string;
  bannedUntil?: string | null;
}

interface UserBannedInfo {
  username: string;
  bannedBy: string;
  banReason: string;
  bannedAt?: string;
  bannedUntil?: string | null;
}

interface SecurityThreatLogItem {
  id: number;
  threatType: string;
  detail: string;
  username: string;
  ip: string;
  deviceId: string;
  deviceModel: string;
  strikeCount: number;
  banned: boolean;
  bannedUntil?: string | null;
  cookies: string;
  screenshot?: string | null;
  pageUrl?: string;
  userAgent?: string;
  createdAt: string;
}

interface AuditLog {
  id: number;
  action: string;
  detail: string;
  username: string;
  createdAt: string;
}

interface GiftCodeItem {
  id: number;
  code: string;
  creditAmount: number;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

interface CouponItem {
  id: number;
  code: string;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  minSpend: number;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

interface BannedIpItem {
  id: number;
  ip: string;
  reason: string;
  bannedBy: string;
  bannedAt: string;
  bannedUntil?: string | null;
}

interface WhitelistedIpItem {
  id: number;
  ip: string;
  note: string;
  addedBy: string;
  createdAt: string;
}

interface BannedDeviceItem {
  id: number;
  deviceId: string;
  deviceModel: string;
  os?: string;
  browser?: string;
  gpu?: string;
  screenResolution?: string;
  lastIp?: string;
  reason: string;
  bannedBy: string;
  bannedAt: string;
  bannedUntil?: string | null;
}

interface BannedInfo {
  banned: boolean;
  banType?: 'device' | 'ip';
  ip?: string;
  deviceId?: string;
  deviceModel?: string;
  reason: string;
  bannedAt?: string;
  bannedBy?: string;
  bannedUntil?: string | null;
}

interface StoreStats {
  totalSales: string;
  itemsSold: string;
  totalUsers: string;
  isOverride: boolean;
  real: {
    totalSales: number;
    itemsSold: number;
    totalUsers: number;
  };
  custom: {
    sales: string;
    orders: string;
    users: string;
  };
}

// Universal Screen Size & Responsive Device Hook (Mobile, Tablet, iPad, Desktop)
const useScreenSize = () => {
  const [screenInfo, setScreenInfo] = useState(() => {
    if (typeof window === 'undefined') return { width: 1200, isMobile: false, isTablet: false, isDesktop: true };
    const w = window.innerWidth;
    return {
      width: w,
      isMobile: w <= 768,
      isTablet: w > 768 && w <= 1080,
      isDesktop: w > 1080,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const isMob = w <= 768;
      const isTab = w > 768 && w <= 1080;
      const isDesk = w > 1080;
      setScreenInfo({ width: w, isMobile: isMob, isTablet: isTab, isDesktop: isDesk });
      try {
        document.documentElement.setAttribute('data-device', isMob ? 'mobile' : isTab ? 'tablet' : 'desktop');
      } catch {}
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return screenInfo;
};

interface RentalCountdownProps {
  expiresAt?: string | null;
  linkedGameId?: string | null;
  productName: string;
  onGoToGame?: () => void;
}

const RentalCountdown: React.FC<RentalCountdownProps> = ({ expiresAt, linkedGameId, productName, onGoToGame }) => {
  const [timeLeft, setTimeLeft] = useState<{
    totalMs: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } | null>(null);

  useEffect(() => {
    if (!expiresAt) return;

    const calcTime = () => {
      const target = new Date(expiresAt).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return { totalMs: diff, days, hours, minutes, seconds, isExpired: false };
    };

    setTimeLeft(calcTime());
    const interval = setInterval(() => {
      setTimeLeft(calcTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt) {
    if (linkedGameId) {
      return (
        <div style={{
          marginTop: '0.85rem',
          padding: '0.75rem 1rem',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div>
            <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <IconCheckCircle2 size={15} /> สิทธิ์การใช้งานถาวร (ตลอดชีพ)
            </span>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>ปลดล็อกสิทธิ์ดาวน์โหลดในหน้าระบบเช็คสถานะเกมแบบไม่จำกัดเวลา</span>
          </div>
          {onGoToGame && (
            <button
              onClick={onGoToGame}
              className="btn-outline"
              style={{
                fontSize: '0.8rem',
                padding: '0.35rem 0.85rem',
                borderColor: '#10b981',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <IconDownload size={14} /> ไปดาวน์โหลดที่หน้าสถานะเกม
            </button>
          )}
        </div>
      );
    }
    return null;
  }

  if (!timeLeft) return null;

  if (timeLeft.isExpired) {
    return (
      <div style={{
        marginTop: '0.85rem',
        padding: '0.75rem 1rem',
        background: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IconAlertCircle size={16} /> หมดอายุเวลาการเช่าแล้ว (Expired)
          </span>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
            หมดอายุเมื่อ: {new Date(expiresAt).toLocaleString('th-TH')} • ไม่สามารถดาวน์โหลดเกมได้แล้ว
          </span>
        </div>
        <span style={{ fontSize: '0.78rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', padding: '0.25rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
          🔒 สิทธิ์ดาวน์โหลดถูกล็อค
        </span>
      </div>
    );
  }

  return (
    <div style={{
      marginTop: '0.85rem',
      padding: '0.85rem 1.1rem',
      background: 'linear-gradient(135deg, rgba(255, 26, 64, 0.12) 0%, rgba(255, 77, 109, 0.05) 100%)',
      border: '1px solid rgba(255, 26, 64, 0.35)',
      borderRadius: '14px',
      boxShadow: '0 4px 15px rgba(255, 26, 64, 0.08)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ff4d6d', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IconClock size={16} color="#ff1a40" />
            ⏳ สิทธิ์การเช่า ({productName}):
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.2rem 0.65rem', borderRadius: '20px', fontWeight: 600 }}>
          ✅ มีสิทธิ์ดาวน์โหลด
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.4rem', fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
          {timeLeft.days > 0 && (
            <span style={{ background: 'rgba(0,0,0,0.5)', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
              {timeLeft.days}<span style={{ fontSize: '0.75rem', color: '#b89ca2', marginLeft: '2px' }}>วัน</span>
            </span>
          )}
          <span style={{ background: 'rgba(0,0,0,0.5)', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
            {String(timeLeft.hours).padStart(2, '0')}<span style={{ fontSize: '0.75rem', color: '#b89ca2', marginLeft: '2px' }}>ชม.</span>
          </span>
          <span style={{ background: 'rgba(0,0,0,0.5)', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
            {String(timeLeft.minutes).padStart(2, '0')}<span style={{ fontSize: '0.75rem', color: '#b89ca2', marginLeft: '2px' }}>น.</span>
          </span>
          <span style={{ background: 'rgba(255,26,64,0.3)', color: '#ff4d6d', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(255,26,64,0.5)' }}>
            {String(timeLeft.seconds).padStart(2, '0')}<span style={{ fontSize: '0.75rem', color: '#ffaab9', marginLeft: '2px' }}>วิ</span>
          </span>
        </div>

        <span style={{ fontSize: '0.78rem', color: '#9ca3af', marginLeft: 'auto' }}>
          สิ้นสุด: {new Date(expiresAt).toLocaleString('th-TH')}
        </span>
      </div>

      {onGoToGame && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onGoToGame}
            className="btn-primary"
            style={{
              fontSize: '0.8rem',
              padding: '0.45rem 1rem',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <IconDownload size={15} />
            <span>ไปดาวน์โหลดเกมนี้ในหน้าระบบเช็คสถานะ</span>
          </button>
        </div>
      )}
    </div>
  );
};


export interface GameGroup {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  image: string;
  bannerImage: string;
  description: string;
  startingPrice: number;
  maxPrice: number;
  totalStock: number;
  packages: Product[];
}

export function extractDurationLabel(name: string): string {
  if (/1\s*(?:day|วัน)/i.test(name)) return '1 วัน (1 Day)';
  if (/3\s*(?:days?|วัน)/i.test(name)) return '3 วัน (3 Days)';
  if (/7\s*(?:days?|วัน)/i.test(name)) return '7 วัน (7 Days)';
  if (/30\s*(?:days?|วัน)/i.test(name)) return '30 วัน (30 Days)';
  if (/ถาวร/i.test(name)) {
    if (/จบซี/i.test(name)) return 'ถาวร (จนจบซีซั่น)';
    return 'ถาวร (Permanent)';
  }
  const match = name.match(/\(([^)]+)\)/);
  if (match) return match[1].trim();
  return 'แพ็กเกจมาตรฐาน';
}

export function getGameBaseTitle(name: string): string {
  const isVip = /VIP/i.test(name);
  const isCrack = /Crack/i.test(name);

  if (name.includes('ROV กันรายงาน')) return 'ROV กันรายงาน';
  if (name.includes('ROV ไม่กันรายงาน')) return 'ROV ไม่กันรายงาน';
  if (name.includes('FF / FF MAX')) return 'Free Fire / FF MAX';
  if (name.includes('PubgM') && isVip) return 'PUBG Mobile (VIP)';
  if (name.includes('PubgM') && isCrack) return 'PUBG Mobile (Crack)';
  if (name.includes('Src เว็บ')) return 'ระบบเว็บ HexSyncTH (Full Source)';

  return name
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\d+\s*(?:Day|Days|วัน)/gi, '')
    .replace(/\s*ถาวร/gi, '')
    .trim() || name;
}

export function groupProductsByGame(
  productsList: Product[],
  categoriesList: CategoryItem[],
  customImagesJson?: string
): GameGroup[] {
  let customMap: Record<string, { bannerImage?: string; image?: string; description?: string }> = {};
  if (customImagesJson) {
    try {
      customMap = JSON.parse(customImagesJson);
    } catch {}
  }

  const map: Record<string, GameGroup> = {};

  productsList.forEach(p => {
    const baseTitle = getGameBaseTitle(p.name);
    const cat = categoriesList.find(c => c.slug === p.categoryId);
    const catName = cat ? cat.name : p.categoryId;

    const custom = customMap[baseTitle] || {};

    if (!map[baseTitle]) {
      map[baseTitle] = {
        id: baseTitle.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        title: baseTitle,
        categoryId: p.categoryId,
        categoryName: catName,
        image: custom.image || p.image || (cat ? cat.bannerImage : '') || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600',
        bannerImage: custom.bannerImage || (cat && cat.bannerImage) || p.image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
        description: custom.description || p.description || 'โปรเกมคุณภาพสูง ปลอดภัย 100% ส่งออโต้ 24 ชั่วโมง',
        startingPrice: p.price,
        maxPrice: p.price,
        totalStock: 0,
        packages: []
      };
    }

    const grp = map[baseTitle];
    grp.packages.push(p);
    grp.totalStock += (p.stock || 0);
    if (p.price < grp.startingPrice) grp.startingPrice = p.price;
    if (p.price > grp.maxPrice) grp.maxPrice = p.price;
    if (p.image && (!grp.image || grp.image.includes('unsplash'))) grp.image = p.image;
  });

  const orderScore = (pkgName: string) => {
    if (/1\s*(?:day|วัน)/i.test(pkgName)) return 1;
    if (/3\s*(?:days?|วัน)/i.test(pkgName)) return 3;
    if (/7\s*(?:days?|วัน)/i.test(pkgName)) return 7;
    if (/30\s*(?:days?|วัน)/i.test(pkgName)) return 30;
    if (/ถาวร/i.test(pkgName)) return 999;
    return 50;
  };

  return Object.values(map).map(grp => {
    grp.packages.sort((a, b) => orderScore(a.name) - orderScore(b.name));
    return grp;
  });
}

export default function App() {
  useScreenSize();
  const [availableGames, setAvailableGames] = useState<Array<{ id: string; title: string }>>([]);
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem('hexsync_cached_products');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem('hexsync_cached_products');
      return !cached || JSON.parse(cached).length === 0;
    } catch {
      return true;
    }
  });
  
  // Game Packages Storefront & Admin States
  const [selectedGameGroup, setSelectedGameGroup] = useState<GameGroup | null>(null);
  const [selectedPackageTier, setSelectedPackageTier] = useState<Product | null>(null);
  const [packageQty, setPackageQty] = useState<number>(1);
  const [adminProductViewMode, setAdminProductViewMode] = useState<'game' | 'flat'>('game');
  const [managingKeysGameGroup, setManagingKeysGameGroup] = useState<GameGroup | null>(null);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Category management states
  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    try {
      const cached = localStorage.getItem('hexsync_cached_categories');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  // Custom Game Meta State (Banner, Icon, Description)
  const [editingGameMeta, setEditingGameMeta] = useState<GameGroup | null>(null);
  const [gameBannerInput, setGameBannerInput] = useState('');
  const [gameIconInput, setGameIconInput] = useState('');
  const [gameDescInput, setGameDescInput] = useState('');


  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryBanner, setNewCategoryBanner] = useState('');

  // User state (starts as NOT logged in)
  const [user, setUser] = useState<UserState | null>(null);

  // Cart state (persisted to localStorage)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('hexsync_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('hexsync_cart', JSON.stringify(cart));
    } catch { }
  }, [cart]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showConfirm2Step, setShowConfirm2Step] = useState(false);

  // Active View / Modals
  const [userBannedInfo, setUserBannedInfo] = useState<UserBannedInfo | null>(() => {
    try {
      const saved = sessionStorage.getItem('hexsync_user_banned_info') || localStorage.getItem('hexsync_user_banned_info');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [view, setView] = useState<'store' | 'history' | 'admin' | 'banned' | 'status'>(() => {
    try {
      const savedUserBan = sessionStorage.getItem('hexsync_user_banned_info') || localStorage.getItem('hexsync_user_banned_info');
      const savedIpBan = sessionStorage.getItem('hexsync_banned_info') || localStorage.getItem('hexsync_banned_info');
      if (savedUserBan || savedIpBan) return 'banned';
    } catch { }
    return 'store';
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [showAngpaoModal, setShowAngpaoModal] = useState(false);
  const [showDirectBuyConfirm, setShowDirectBuyConfirm] = useState<Product | null>(null);
  const [directBuyQuantity, setDirectBuyQuantity] = useState<number>(1);
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);
  const [detailQty, setDetailQty] = useState<number>(1);

  // History state
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);

  // Auth Form states
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPass, setAuthConfirmPass] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Top-up form states (Bank Transfer, Angpao, Gift Code, Top-Up History)
  const [topupTab, setTopupTab] = useState<'bank' | 'angpao' | 'giftcode' | 'history'>('bank');
  const [bankAmount, setBankAmount] = useState<number>(100);
  const [bankSlipImage, setBankSlipImage] = useState<string>('');
  const [bankSlipUploading, setBankSlipUploading] = useState<boolean>(false);
  const [angpaoUrl, setAngpaoUrl] = useState('');
  const [angpaoPhone, setAngpaoPhone] = useState('0812345678');
  const [giftCodeInput, setGiftCodeInput] = useState('');
  const [redeemingCode, setRedeemingCode] = useState(false);
  const [detectedSlipQr, setDetectedSlipQr] = useState<string | null>(null);
  const [detectedSlipBank, setDetectedSlipBank] = useState<string | null>(null);
  const [detectedSlipTransRef, setDetectedSlipTransRef] = useState<string | null>(null);
  const [detectedSlipAmount, setDetectedSlipAmount] = useState<number | null>(null);
  const topupBodyRef = useRef<HTMLDivElement>(null);

  // Top-Up History States (Website-wide for Admin & Specific User View)
  const [adminTopups, setAdminTopups] = useState<any[]>([]);
  const [adminTopupSummary, setAdminTopupSummary] = useState<any | null>(null);
  const [adminTopupUsersList, setAdminTopupUsersList] = useState<string[]>([]);
  const [adminTopupLoading, setAdminTopupLoading] = useState<boolean>(false);
  const [adminTopupUserFilter, setAdminTopupUserFilter] = useState<string>('');
  const [adminTopupMethodFilter, setAdminTopupMethodFilter] = useState<string>('all');
  const [adminTopupStatusFilter, setAdminTopupStatusFilter] = useState<string>('all');
  const [adminTopupSearch, setAdminTopupSearch] = useState<string>('');
  const [previewTopupSlip, setPreviewTopupSlip] = useState<string | null>(null);

  // User personal top-up history states
  const [userTopups, setUserTopups] = useState<any[]>([]);
  const [userTopupSummary, setUserTopupSummary] = useState<any | null>(null);
  const [userTopupLoading, setUserTopupLoading] = useState<boolean>(false);

  // Dynamic Single-Use PromptPay QR States (30-min expiration & auto-credit)
  const [activeQrOrder, setActiveQrOrder] = useState<{
    orderId: string;
    amount: number;
    qrPayload: string;
    promptpayNumber: string;
    accountName: string;
    bankName: string;
    expiresAt: string;
    durationSeconds?: number;
  } | null>(null);
  const [showDynamicQrModal, setShowDynamicQrModal] = useState<boolean>(false);
  const [qrCountdown, setQrCountdown] = useState<number>(1800);
  const [qrVerifying, setQrVerifying] = useState<boolean>(false);
  const [qrPaymentSuccess, setQrPaymentSuccess] = useState<boolean>(false);
  const [generatingQr, setGeneratingQr] = useState<boolean>(false);
  const [qrSlipImage, setQrSlipImage] = useState<string>('');

  // HexSyncTH Security MAX Entrance Modal State (แสดงผลตลอดทุกครั้งที่รีเว็บ และต้องกดยืนยันก่อน Login)
  const [showSecurityMaxModal, setShowSecurityMaxModal] = useState<boolean>(true);
  const [securityMaxAcknowledged, setSecurityMaxAcknowledged] = useState<boolean>(false);

  const handleAcknowledgeSecurityMax = (goToLogin?: boolean) => {
    setSecurityMaxAcknowledged(true);
    setShowSecurityMaxModal(false);
    if (goToLogin && !user) {
      setAuthTab('login');
      setAuthModalOpen(true);
    }
  };

  const handleOpenAuthModal = (tab: 'login' | 'register' = 'login') => {
    if (!securityMaxAcknowledged) {
      setShowSecurityMaxModal(true);
      return;
    }
    setAuthTab(tab);
    setAuthModalOpen(true);
  };

  // Checkout coupon states
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponItem | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponMsg, setCouponMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin Dashboard states
  const [adminTab, setAdminTab] = useState<'products' | 'categories' | 'users' | 'bannedIps' | 'stats' | 'giftcodes' | 'coupons' | 'theme' | 'slips' | 'logs' | 'threatLogs' | 'banManager' | 'superadmin' | 'topups'>('products');
  // SuperAdmin Account Management & Secret Recovery States
  const [superAdminAccounts, setSuperAdminAccounts] = useState<any[]>([]);
  const [isSuperAdminUnlocked, setIsSuperAdminUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('hexsync_superadmin_unlocked') === 'true';
    } catch {
      return false;
    }
  });
  const [superAdminSecretInput, setSuperAdminSecretInput] = useState<string>('');
  const [superAdminSecretError, setSuperAdminSecretError] = useState<string>('');
  const [savedSuperAdminSecret, setSavedSuperAdminSecret] = useState<string>(() => {
    try {
      return sessionStorage.getItem('hexsync_superadmin_secret') || '';
    } catch {
      return '';
    }
  });
  const [editingSuperAdmin, setEditingSuperAdmin] = useState<any | null>(null);
  const [saEditUsername, setSaEditUsername] = useState<string>('');
  const [saEditEmail, setSaEditEmail] = useState<string>('');
  const [saEditPassword, setSaEditPassword] = useState<string>('');
  const [saEditConfirmPassword, setSaEditConfirmPassword] = useState<string>('');
  const [saEditBalance, setSaEditBalance] = useState<number>(0);
  const [saShowPassword, setSaShowPassword] = useState<boolean>(false);
  const [isSavingSuperAdmin, setIsSavingSuperAdmin] = useState<boolean>(false);
  const [isLoadingSuperAdmin, setIsLoadingSuperAdmin] = useState<boolean>(false);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [bannedIpsList, setBannedIpsList] = useState<BannedIpItem[]>([]);
  const [bannedIpSearch, setBannedIpSearch] = useState('');
  const [newBanIpInput, setNewBanIpInput] = useState('');
  const [newBanReasonInput, setNewBanReasonInput] = useState('');
  const [isBanningIp, setIsBanningIp] = useState(false);
  const [bannedDevicesList, setBannedDevicesList] = useState<BannedDeviceItem[]>([]);
  const [bannedDeviceSearch, setBannedDeviceSearch] = useState('');
  const [newBanDeviceIdInput, setNewBanDeviceIdInput] = useState('');
  const [newBanDeviceModelInput, setNewBanDeviceModelInput] = useState('');
  const [newBanDeviceReasonInput, setNewBanDeviceReasonInput] = useState('');
  const [isBanningDevice, setIsBanningDevice] = useState(false);
  const [myDeviceInfo, setMyDeviceInfo] = useState<DeviceInfoData | null>(null);
  const [viewingUserDevice, setViewingUserDevice] = useState<{ user: any; info: DeviceInfoData | null } | null>(null);
  const [viewingUserMap, setViewingUserMap] = useState<any | null>(null);
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [blacklistSubTab, setBlacklistSubTab] = useState<'ips' | 'devices' | 'whitelist' | 'ddosJail'>('ips');
  const [whitelistedIpsList, setWhitelistedIpsList] = useState<WhitelistedIpItem[]>([]);
  const [whitelistSearch, setWhitelistSearch] = useState('');
  const [newWhitelistIp, setNewWhitelistIp] = useState('');
  const [newWhitelistNote, setNewWhitelistNote] = useState('');
  const [isAddingWhitelist, setIsAddingWhitelist] = useState(false);
  const [jailedIpsList, setJailedIpsList] = useState<{ ip: string; remainingSec: number; expiresAt: string }[]>([]);
  const [isClearingJail, setIsClearingJail] = useState(false);
  const [myCurrentIp, setMyCurrentIp] = useState('');
  const [bannedInfo, setBannedInfo] = useState<BannedInfo | null>(() => {
    try {
      const saved = sessionStorage.getItem('hexsync_banned_info') || localStorage.getItem('hexsync_banned_info');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showEmergencyUnlock, setShowEmergencyUnlock] = useState(false);
  const [emergencyKeyInput, setEmergencyKeyInput] = useState('');
  const [emergencyError, setEmergencyError] = useState('');
  const [adminMasterKey, setAdminMasterKey] = useState<string>('admin1234');
  const [masterKeyInput, setMasterKeyInput] = useState<string>('admin1234');
  const [showMasterKeyPlain, setShowMasterKeyPlain] = useState<boolean>(false);
  const [isSavingMasterKey, setIsSavingMasterKey] = useState<boolean>(false);
  const [securityViolation, setSecurityViolation] = useState<{ reason: string; timestamp: string } | null>(() => {
    try {
      const saved = sessionStorage.getItem('hexsync_security_violation');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Security Threat Logs & Ban Expiration Management states
  const [threatLogsList, setThreatLogsList] = useState<SecurityThreatLogItem[]>([]);
  const [threatLogsLoading, setThreatLogsLoading] = useState(false);
  const [threatUserFilter, setThreatUserFilter] = useState('');
  const [activeBansList, setActiveBansList] = useState<any[]>([]);
  const [activeBansLoading, setActiveBansLoading] = useState(false);
  const [activeBansSearch, setActiveBansSearch] = useState('');
  const [superAdminPasscode, setSuperAdminPasscode] = useState(() => {
    try {
      return sessionStorage.getItem('hexsync_security_passcode') || '';
    } catch {
      return '';
    }
  });
  const [isPasscodeUnlocked, setIsPasscodeUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem('hexsync_passcode_unlocked') === 'true';
    } catch {
      return false;
    }
  });
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [currentMasterPasscode, setCurrentMasterPasscode] = useState('');
  const [showPasscodePlain, setShowPasscodePlain] = useState(false);
  const [viewingScreenshotModal, setViewingScreenshotModal] = useState<SecurityThreatLogItem | null>(null);
  const [viewingCookiesModal, setViewingCookiesModal] = useState<SecurityThreatLogItem | null>(null);
  const [editingBanModal, setEditingBanModal] = useState<any | null>(null);
  const [editBanDateInput, setEditBanDateInput] = useState('');
  const [editBanReasonInput, setEditBanReasonInput] = useState('');
  const [securityWarning, setSecurityWarning] = useState<{
    strikeCount: number;
    reason: string;
    timestamp: string;
    screenshot?: string | null;
  } | null>(null);
  const [banCountdownInfo, setBanCountdownInfo] = useState<{
    expired: boolean;
    years: number;
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    text: string;
  } | null>(null);
  const [viewingUserPurchases, setViewingUserPurchases] = useState<any | null>(null);
  const [userPurchasesList, setUserPurchasesList] = useState<PurchaseRecord[]>([]);
  const [loadingUserPurchases, setLoadingUserPurchases] = useState(false);
  const [editingUserModal, setEditingUserModal] = useState<any | null>(null);
  const [adminLogs, setAdminLogs] = useState<AuditLog[]>([]);
  const [adminSlips, setAdminSlips] = useState<any[]>([]);
  const [viewingSlipImage, setViewingSlipImage] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductImage, setNewProductImage] = useState('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80');

  // Gift Codes & Coupons admin state
  const [giftCodesList, setGiftCodesList] = useState<GiftCodeItem[]>([]);
  const [newGiftCode, setNewGiftCode] = useState({ code: '', creditAmount: 50, maxUses: 1 });
  const [couponsList, setCouponsList] = useState<CouponItem[]>([]);
  const [newCoupon, setNewCoupon] = useState({ code: '', discountType: 'fixed' as 'fixed' | 'percent', discountValue: 50, minSpend: 100, maxUses: 100 });

  // Store & Dashboard Stats
  const [storeStats, setStoreStats] = useState<StoreStats>({
    totalSales: '฿154,200',
    itemsSold: '1,280',
    totalUsers: '450',
    isOverride: false,
    real: { totalSales: 0, itemsSold: 0, totalUsers: 0 },
    custom: { sales: '154,200', orders: '1,280', users: '450' },
  });

  // Stock Keys Management Modal State
  const [managingKeysProduct, setManagingKeysProduct] = useState<Product | null>(null);
  const [productKeysList, setProductKeysList] = useState<ProductKeyItem[]>([]);
  const [inputKeysText, setInputKeysText] = useState('');

  // Site customizer settings (with instant localStorage cache hydration)
  const [siteSettings, setSiteSettings] = useState(() => {
    const defaultVals = {
      site_title: 'HexSyncTH — บริการโปรเเกรมช่วยเล่นที่ดีที่สุดในไทย',
      hero_title: 'HexSyncTH บริการโปรเเกรมช่วยเล่นที่ดีที่สุดในไทย',
      hero_subtitle: 'บริการโปรแกรมช่วยเล่น บอท สคริปต์ และคีย์แท้คุณภาพสูง ส่งออโต้ 24 ชั่วโมง',
      banner_announcement: 'ระบบจัดส่งคีย์อัตโนมัติ 100% รวดเร็วใน 3 วินาที พร้อมรับประกันคีย์ทุกชิ้น',
      brand_name: 'HexSyncTH',
      brand_tag: 'No.1 in TH',
      logo_url: '/logo.png',

      hero_feat_1: 'คีย์แท้ถาวร ส่งคีย์จริงจากสต็อก',
      hero_feat_2: 'รับของทันที มีปุ่มดาวน์โหลด',
      hero_feat_3: 'เติมเงินซองอั่งเปา TrueMoney อัตโนมัติ',

      bank_name: 'ธนาคารกสิกรไทย (KBank)',
      bank_account_name: 'บจก. คีย์ช็อป ดิจิทัล (KeyShop Co., Ltd.)',
      bank_account_number: '123-4-56789-0',
      promptpay_number: '0812345678',
      hexsync_game_custom_images: '{}',

      dashboard_override_enabled: 'false',
      custom_stat_sales: '154,200',
      custom_stat_orders: '1,280',
      custom_stat_users: '450',

      slipok_branch_id: '',
      slipok_api_key: '',
      webhook_secret: 'whsec_keyshop_2026_auto',

      bg_music_enabled: 'true',
      bg_music_url: 'https://youtu.be/h_VCgsWLmY4?si=BvgFsmrHWlMFvwkT&t=8',
      bg_music_title: 'MMM',
      bg_music_volume: 30,
      bg_music_autoplay: 'true',
    };

    try {
      const cached = localStorage.getItem('hexsync_cached_settings');
      if (cached) {
        return { ...defaultVals, ...JSON.parse(cached) };
      }
    } catch {}
    return defaultVals;
  });

  // Grouped products by game (with custom image support)
  const gameGroups = React.useMemo(() => groupProductsByGame(products, categories, (siteSettings as any).hexsync_game_custom_images), [products, categories, (siteSettings as any).hexsync_game_custom_images]);
  const filteredGameGroups = React.useMemo(() => {
    return gameGroups.filter((g: GameGroup) => {
      const matchCat = selectedCategory === 'all' || g.categoryId === selectedCategory;
      const matchQuery = !searchQuery || 
        g.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        g.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.packages.some((pkg: Product) => pkg.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [gameGroups, selectedCategory, searchQuery]);

  // Extract YouTube Video ID helper (Supports youtube.com/watch?v=, youtu.be/, shorts/, embed/)
  const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    const trimmed = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = trimmed.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const ytVideoId = getYouTubeVideoId(siteSettings.bg_music_url);
  const isYouTube = !!ytVideoId;

  // Background Music Player State (Dual Engine: HTML5 Audio & YouTube IFrame API)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const pendingPlayRef = useRef(false);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [musicVolume, setMusicVolume] = useState(30);
  const [showMusicPlayerExpanded, setShowMusicPlayerExpanded] = useState(false);
  const [isMusicPlayerFolded, setIsMusicPlayerFolded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('hexsync_music_folded');
      if (saved !== null) return saved === 'true';
      return typeof window !== 'undefined' && window.innerWidth <= 768;
    } catch {
      return false;
    }
  });
  const hasAttemptedAutoplayRef = useRef(false);

  // Initialize and manage YouTube IFrame API Player
  useEffect(() => {
    if (!isYouTube || !ytVideoId) {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch { }
        ytPlayerRef.current = null;
      }
      return;
    }

    let isSubscribed = true;

    const initYt = () => {
      if (!isSubscribed) return;
      if (!window.YT || !window.YT.Player) return;

      const mountPoint = document.getElementById('hexsync-yt-player');
      if (!mountPoint) {
        setTimeout(initYt, 100);
        return;
      }

      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
        try {
          ytPlayerRef.current.loadVideoById({ videoId: ytVideoId });
          if (pendingPlayRef.current || siteSettings.bg_music_autoplay === 'true') {
            ytPlayerRef.current.playVideo();
          }
        } catch { }
        return;
      }

      try {
        new window.YT.Player('hexsync-yt-player', {
          width: '200',
          height: '200',
          videoId: ytVideoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            fs: 0,
            loop: 1,
            playlist: ytVideoId,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin
          },
          events: {
            onReady: (event: any) => {
              if (!isSubscribed) return;
              ytPlayerRef.current = event.target;
              try {
                event.target.setVolume(musicVolume);
                if (isMusicMuted) {
                  event.target.mute();
                } else {
                  event.target.unMute();
                }
                if (pendingPlayRef.current || siteSettings.bg_music_autoplay === 'true') {
                  event.target.playVideo();
                }
              } catch (e) {
                console.warn(e);
              }
            },
            onStateChange: (event: any) => {
              if (!isSubscribed) return;
              if (event.data === 1) {
                setIsPlayingMusic(true);
              } else if (event.data === 2) {
                setIsPlayingMusic(false);
              } else if (event.data === 0) {
                try {
                  event.target.playVideo();
                } catch { }
              }
            },
            onError: (event: any) => {
              console.warn('YouTube Audio Player Error code:', event.data);
            }
          }
        });
      } catch (err) {
        console.warn('Failed to construct YT.Player:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      initYt();
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === 'function') prevCallback();
        initYt();
      };
      const interval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(interval);
          initYt();
        }
      }, 150);
      return () => {
        isSubscribed = false;
        clearInterval(interval);
      };
    }

    return () => {
      isSubscribed = false;
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch { }
        ytPlayerRef.current = null;
      }
    };
  }, [isYouTube, ytVideoId]);

  // Sync volume with both YouTube and Audio element
  useEffect(() => {
    if (isYouTube && ytPlayerRef.current) {
      try {
        if (isMusicMuted) {
          if (typeof ytPlayerRef.current.mute === 'function') ytPlayerRef.current.mute();
        } else {
          if (typeof ytPlayerRef.current.unMute === 'function') ytPlayerRef.current.unMute();
          if (typeof ytPlayerRef.current.setVolume === 'function') ytPlayerRef.current.setVolume(musicVolume);
        }
      } catch { }
    } else if (audioRef.current) {
      audioRef.current.volume = isMusicMuted ? 0 : musicVolume / 100;
    }
  }, [musicVolume, isMusicMuted, isYouTube]);

  // Handle URL change or setting update
  useEffect(() => {
    if (siteSettings.bg_music_volume) {
      const vol = Number(siteSettings.bg_music_volume);
      if (!isNaN(vol)) setMusicVolume(Math.min(100, Math.max(0, vol)));
    }
    setIsPlayingMusic(false);
    hasAttemptedAutoplayRef.current = false;
  }, [siteSettings.bg_music_volume, siteSettings.bg_music_url]);

  // Autoplay on first user interaction anywhere on the document
  useEffect(() => {
    if (siteSettings.bg_music_enabled !== 'true' || siteSettings.bg_music_autoplay !== 'true') return;

    const startAudioOnInteraction = () => {
      if (hasAttemptedAutoplayRef.current) return;
      hasAttemptedAutoplayRef.current = true;
      pendingPlayRef.current = true;

      if (isYouTube) {
        const player = ytPlayerRef.current;
        if (player && typeof player.playVideo === 'function') {
          try {
            player.unMute();
            player.setVolume(musicVolume);
            player.playVideo();
          } catch { }
        }
      } else if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().then(() => {
          setIsPlayingMusic(true);
        }).catch(() => { });
      }
    };

    window.addEventListener('click', startAudioOnInteraction, { once: true });
    window.addEventListener('touchstart', startAudioOnInteraction, { once: true });
    window.addEventListener('keydown', startAudioOnInteraction, { once: true });

    return () => {
      window.removeEventListener('click', startAudioOnInteraction);
      window.removeEventListener('touchstart', startAudioOnInteraction);
      window.removeEventListener('keydown', startAudioOnInteraction);
    };
  }, [siteSettings.bg_music_enabled, siteSettings.bg_music_autoplay, isYouTube, musicVolume]);

  const togglePlayMusic = () => {
    if (isYouTube) {
      const player = ytPlayerRef.current;
      if (isPlayingMusic) {
        pendingPlayRef.current = false;
        if (player && typeof player.pauseVideo === 'function') {
          player.pauseVideo();
        }
        setIsPlayingMusic(false);
      } else {
        pendingPlayRef.current = true;
        if (player && typeof player.playVideo === 'function') {
          try {
            player.unMute();
            player.setVolume(musicVolume);
            player.playVideo();
            setIsPlayingMusic(true);
          } catch { }
        } else {
          showToast('กำลังเตรียมระบบเสียง YouTube กรุณากดอีกครั้งใน 1 วินาที');
        }
      }
    } else {
      if (!audioRef.current) return;
      if (audioRef.current.paused) {
        audioRef.current.play().then(() => {
          setIsPlayingMusic(true);
        }).catch(() => {
          showToast('ไม่สามารถเล่นเพลงได้ กรุณาตรวจสอบลิงก์ไฟล์เพลง');
        });
      } else {
        audioRef.current.pause();
        setIsPlayingMusic(false);
      }
    }
  };

  const toggleMuteMusic = () => {
    const nextMuted = !isMusicMuted;
    setIsMusicMuted(nextMuted);
    if (isYouTube && ytPlayerRef.current) {
      try {
        if (nextMuted) {
          if (typeof ytPlayerRef.current.mute === 'function') ytPlayerRef.current.mute();
        } else {
          if (typeof ytPlayerRef.current.unMute === 'function') ytPlayerRef.current.unMute();
          if (typeof ytPlayerRef.current.setVolume === 'function') ytPlayerRef.current.setVolume(musicVolume);
        }
      } catch { }
    }
  };

  // UI helpers
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(msg);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
  };

  // Auth & Security helper: Attach JWT Token and Persistent Device ID to Requests
  const getAuthHeaders = () => {
    const token = localStorage.getItem('hexsync_token');
    const deviceId = getPersistentDeviceId();
    return {
      'Content-Type': 'application/json',
      'x-device-id': deviceId,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  // Restore user login session from localStorage on app load
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('hexsync_user');
      const savedToken = localStorage.getItem('hexsync_token');
      if (savedUser && savedToken) {
        setUser(JSON.parse(savedUser));
      }
    } catch {
      localStorage.removeItem('hexsync_user');
      localStorage.removeItem('hexsync_token');
    }
  }, []);

  // Collect full device info and sync to backend heartbeat
  useEffect(() => {
    collectFullDeviceInfo().then((dInfo) => {
      setMyDeviceInfo(dInfo);
      if (user) {
        fetch('/api/devices/heartbeat', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            username: user.username,
            deviceId: dInfo.deviceId,
            deviceModel: dInfo.model,
            deviceInfo: dInfo
          })
        }).catch(() => { });
      }
    });
  }, [user?.username]);

  // Central Logout Handler
  const handleLogout = () => {
    localStorage.removeItem('hexsync_token');
    localStorage.removeItem('hexsync_user');
    try {
      sessionStorage.removeItem('hexsync_user_banned_info');
      localStorage.removeItem('hexsync_user_banned_info');
    } catch { }
    setUser(null);
    setUserBannedInfo(null);
    if (window.location.hash === '#banned') {
      try {
        window.history.replaceState(null, '', window.location.pathname);
      } catch {
        window.location.hash = '';
      }
    }
    setShowAngpaoModal(false);
    setActiveQrOrder(null);
    setShowDynamicQrModal(false);
    setQrPaymentSuccess(false);
    setBankAmount(0);
    setBankSlipImage('');
    setView('store');
    setSecurityMaxAcknowledged(false);
    setShowSecurityMaxModal(true);
    showToast('ออกจากระบบเรียบร้อย');
  };

  // Reset payment QR states when active account changes
  useEffect(() => {
    setActiveQrOrder(null);
    setShowDynamicQrModal(false);
    setQrPaymentSuccess(false);
    setBankAmount(0);
    setBankSlipImage('');
  }, [user?.username]);

  // REAL-TIME USER ACCOUNT BAN VERIFICATION (ตรวจจับการแบนระดับบัญชีผู้ใช้แบบเรียลไทม์)
  useEffect(() => {
    const token = localStorage.getItem('hexsync_token');
    if (!token) return;

    const checkUserAccountBan = async () => {
      try {
        const res = await fetch('/api/auth/check-status', {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          if (data.userBanned || data.isBanned) {
            const bInfo: UserBannedInfo = {
              username: data.username,
              bannedBy: data.bannedBy || 'ผู้ดูแลระบบ (Admin)',
              banReason: data.banReason || 'ละเมิดข้อกำหนดการใช้งานของเว็บไซต์',
              bannedAt: data.bannedAt,
              bannedUntil: data.bannedUntil
            };
            setUserBannedInfo(bInfo);
            try {
              sessionStorage.setItem('hexsync_user_banned_info', JSON.stringify(bInfo));
              localStorage.setItem('hexsync_user_banned_info', JSON.stringify(bInfo));
            } catch { }
            setUser(null);
            localStorage.removeItem('hexsync_user');
            localStorage.removeItem('hexsync_token');
            setView('banned');
            window.location.hash = '#banned';
          } else if (data.loggedIn && !data.isBanned) {
            setUserBannedInfo(null);
            try {
              sessionStorage.removeItem('hexsync_user_banned_info');
              localStorage.removeItem('hexsync_user_banned_info');
            } catch { }
          }
        }
      } catch { }
    };

    checkUserAccountBan();
    const interval = setInterval(checkUserAccountBan, 15000);
    return () => clearInterval(interval);
  }, [user?.username]);

  // REAL-TIME IP & DEVICE BAN VERIFICATION (ตรวจสอบสถานะ IP และเลขเครื่องทุกครั้งที่เข้าเว็บ และตรวจซ้ำแบบเรียลไทม์)
  useEffect(() => {
    const checkClientBanStatus = async () => {
      try {
        const deviceId = getPersistentDeviceId();
        const activeUsername = user?.username || userBannedInfo?.username || '';
        const usernameParam = activeUsername ? `&username=${encodeURIComponent(activeUsername)}` : '';
        const res = await fetch(`/api/devices/check-ban?deviceId=${encodeURIComponent(deviceId)}${usernameParam}`, {
          headers: { 'x-device-id': deviceId }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ip) {
            setMyCurrentIp(data.ip);
          }
          if (data.banned) {
            if (data.userBanned) {
              const uInfo: UserBannedInfo = {
                username: data.username || activeUsername || 'ผู้ใช้งาน',
                bannedBy: data.bannedBy || 'ผู้ดูแลระบบ (Admin)',
                banReason: data.reason || 'ละเมิดข้อกำหนดการใช้งานของเว็บไซต์',
                bannedAt: data.bannedAt,
                bannedUntil: data.bannedUntil
              };
              setUserBannedInfo(uInfo);
              try {
                sessionStorage.setItem('hexsync_user_banned_info', JSON.stringify(uInfo));
                localStorage.setItem('hexsync_user_banned_info', JSON.stringify(uInfo));
              } catch { }
            } else {
              const bInfo: BannedInfo = {
                banned: true,
                banType: data.banType || 'ip',
                ip: data.ip,
                deviceId: data.deviceId,
                deviceModel: data.deviceModel,
                reason: data.reason || 'ละเมิดข้อกำหนดการใช้งานของเว็บไซต์',
                bannedAt: data.bannedAt,
                bannedBy: data.bannedBy,
                bannedUntil: data.bannedUntil
              };
              setBannedInfo(bInfo);
              try {
                sessionStorage.setItem('hexsync_banned_info', JSON.stringify(bInfo));
                localStorage.setItem('hexsync_banned_info', JSON.stringify(bInfo));
              } catch { }
            }
            setView('banned');
            if (window.location.hash !== '#banned') {
              window.location.hash = '#banned';
            }
          } else {
            setBannedInfo(null);
            try {
              sessionStorage.removeItem('hexsync_banned_info');
              localStorage.removeItem('hexsync_banned_info');
              sessionStorage.removeItem('hexsync_sec_strikes');
              localStorage.removeItem('hexsync_sec_strikes');
              sessionStorage.removeItem('hexsync_security_violation');
            } catch { }

            // When neither IP nor user is banned, cleanly restore store view and purge #banned hash
            if (!data.userBanned) {
              setUserBannedInfo(null);
              try {
                sessionStorage.removeItem('hexsync_user_banned_info');
                localStorage.removeItem('hexsync_user_banned_info');
              } catch { }
              if (window.location.hash === '#banned') {
                try {
                  window.history.replaceState(null, '', window.location.pathname + window.location.search);
                } catch {
                  window.location.hash = '';
                }
              }
              setView((prev: any) => (prev === 'banned' ? 'store' : prev));
            }
          }
        }
      } catch (err) {
        // Network fallback
      }
    };

    // Check immediately on load
    checkClientBanStatus();

    // Check again whenever user switches back to this tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkClientBanStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Heartbeat check every 30 seconds
    const interval = setInterval(checkClientBanStatus, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [user?.username]);

  // LOCKOUT GUARD: บังคับให้อยู่หน้า #banned เสมอถ้าถูกแบน ไม่สามารถเข้าเว็บหลักได้
  useEffect(() => {
    const isBanned = Boolean(bannedInfo || userBannedInfo);
    if (isBanned) {
      if (window.location.hash !== '#banned') {
        window.location.hash = '#banned';
      }
    } else {
      if (window.location.hash === '#banned') {
        try {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        } catch {
          window.location.hash = '';
        }
      }
      if (view === 'banned') {
        setView('store');
      }
    }
    const handleHashCheck = () => {
      const isCurrentlyBanned = Boolean(bannedInfo || userBannedInfo);
      if (isCurrentlyBanned) {
        if (window.location.hash !== '#banned') {
          window.location.hash = '#banned';
        }
      } else {
        if (window.location.hash === '#banned') {
          try {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          } catch {
            window.location.hash = '';
          }
        }
        if (view === 'banned') {
          setView('store');
        }
      }
    };
    window.addEventListener('hashchange', handleHashCheck);
    return () => window.removeEventListener('hashchange', handleHashCheck);
  }, [bannedInfo, view, userBannedInfo]);

  // BAN COUNTDOWN TIMER (คำนวณเวลานับถอยหลังการแบนแบบเรียลไทม์ทุกวินาที)
  useEffect(() => {
    const targetUntil = bannedInfo?.bannedUntil || userBannedInfo?.bannedUntil;
    if (!targetUntil) {
      setBanCountdownInfo(null);
      return;
    }

    const calculate = () => {
      const target = new Date(targetUntil).getTime();
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setBanCountdownInfo({
          expired: true,
          years: 0,
          months: 0,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          text: 'ครบกำหนดเวลาการแบนแล้ว กำลังปลดแบนอัตโนมัติ...'
        });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }

      let sec = Math.floor(diff / 1000);
      const years = Math.floor(sec / (365 * 24 * 3600));
      sec %= (365 * 24 * 3600);
      const months = Math.floor(sec / (30 * 24 * 3600));
      sec %= (30 * 24 * 3600);
      const days = Math.floor(sec / (24 * 3600));
      sec %= (24 * 3600);
      const hours = Math.floor(sec / 3600);
      sec %= 3600;
      const minutes = Math.floor(sec / 60);
      const seconds = sec % 60;

      setBanCountdownInfo({
        expired: false,
        years,
        months,
        days,
        hours,
        minutes,
        seconds,
        text: `${years > 0 ? `${years} ปี ` : ''}${months > 0 ? `${months} เดือน ` : ''}${days > 0 ? `${days} วัน ` : ''}${hours} ชม. ${minutes} นาที ${seconds} วิ.`
      });
    };

    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [bannedInfo?.bannedUntil, userBannedInfo?.bannedUntil]);

  // GLOBAL FETCH INTERCEPTOR: ถ้ามี API ใดถูกปฏิเสธด้วย 403 Ban ให้เด้งไปหน้าถูกแบนทันที
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      if (res.status === 403) {
        try {
          const clone = res.clone();
          const data = await clone.json();
          if (data && data.banned) {
            if (data.userBanned) {
              setUserBannedInfo({
                username: data.username,
                bannedBy: data.bannedBy || 'ผู้ดูแลระบบ (Admin)',
                banReason: data.banReason || 'ละเมิดข้อกำหนดการใช้งานของเว็บไซต์',
                bannedAt: data.bannedAt,
                bannedUntil: data.bannedUntil
              });
              setUser(null);
              localStorage.removeItem('hexsync_user');
              localStorage.removeItem('hexsync_token');
              setView('banned');
              window.location.hash = '#banned';
            } else {
              const bInfo: BannedInfo = {
                banned: true,
                banType: data.banType || 'ip',
                ip: data.bannedIp || data.ip,
                deviceId: data.deviceId,
                deviceModel: data.deviceModel,
                reason: data.reason || 'ละเมิดข้อกำหนดการใช้งานของเว็บไซต์',
                bannedAt: data.bannedAt,
                bannedBy: data.bannedBy,
                bannedUntil: data.bannedUntil
              };
              setBannedInfo(bInfo);
              try {
                sessionStorage.setItem('hexsync_banned_info', JSON.stringify(bInfo));
                localStorage.setItem('hexsync_banned_info', JSON.stringify(bInfo));
              } catch { }
              window.location.hash = '#banned';
            }
          }
        } catch { }
      }
      return res;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // SECURITY VIOLATION LISTENER (F12, Inspect, View Source Attempt: 3-Strikes System)
  useEffect(() => {
    const handleViolation = (e: any) => {
      const detail = e.detail;
      if (!detail) return;

      const strikes = detail.strikeCount || 1;
      const isBanned = detail.banned || strikes >= 3;

      if (isBanned) {
        // Strike 3 or banned -> Lock user out with 10-year countdown
        const bInfo: BannedInfo = {
          banned: true,
          banType: 'ip',
          ip: myCurrentIp,
          reason: `ละเมิดความปลอดภัยขั้นสูงครบ 3 ครั้ง: ${detail.reason || 'พยายามเจาะระบบหรือแกะโค้ด'}`,
          bannedAt: detail.timestamp || new Date().toISOString(),
          bannedBy: 'HexSyncTH Anti-Hack 3-Strikes',
          bannedUntil: detail.bannedUntil || new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000).toISOString()
        };
        setBannedInfo(bInfo);
        setView('banned');
        try {
          sessionStorage.setItem('hexsync_banned_info', JSON.stringify(bInfo));
          localStorage.setItem('hexsync_banned_info', JSON.stringify(bInfo));
        } catch { }
        window.location.hash = '#banned';
        setSecurityWarning(null);
      } else {
        // Strike 1 or 2 -> เตือนก่อนรอบแรกและรอบสองด้วย Warning Modal
        setSecurityWarning({
          strikeCount: strikes,
          reason: detail.reason || 'พยายามตรวจสอบโค้ดหรือเปิดเครื่องมือสำหรับนักพัฒนา',
          timestamp: detail.timestamp || new Date().toISOString(),
          screenshot: detail.screenshot
        });
      }
    };

    window.addEventListener('hexsync:security-violation', handleViolation);
    return () => {
      window.removeEventListener('hexsync:security-violation', handleViolation);
    };
  }, [myCurrentIp]);

  // REAL-TIME DOCUMENT TITLE & FAVICON UPDATE (BROWSER TAB)
  useEffect(() => {
    if (siteSettings.site_title) {
      document.title = siteSettings.site_title;
    } else if (siteSettings.brand_name) {
      document.title = `${siteSettings.brand_name} — ร้านขายคีย์เกม ซอฟต์แวร์ และไอเทมดิจิทัล`;
    }

    if (siteSettings.logo_url) {
      let faviconLink = document.getElementById('app-favicon') as HTMLLinkElement;
      if (!faviconLink) {
        faviconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      }
      if (faviconLink) {
        faviconLink.href = siteSettings.logo_url;
      }
    }
  }, [siteSettings.site_title, siteSettings.brand_name, siteSettings.logo_url]);

  // Fetch products
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        if (data.products) {
          setProducts(data.products);
          setIsLoadingProducts(false);
          try { localStorage.setItem('hexsync_cached_products', JSON.stringify(data.products)); } catch {}
        }
      }
    } catch {
      // Backend offline fallback
    }
  };

  // Fetch games list for linked product rental
  const fetchGamesList = async () => {
    try {
      const res = await fetch('/api/games');
      if (res.ok) {
        const data = await res.json();
        if (data.games && Array.isArray(data.games)) {
          setAvailableGames(data.games.map((g: any) => ({ id: g.id, title: g.title })));
        }
      }
    } catch {}
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        if (data.categories) {
          setCategories(data.categories);
          try { localStorage.setItem('hexsync_cached_categories', JSON.stringify(data.categories)); } catch {}
        }
      }
    } catch {
      // Backend offline fallback
    }
  };

  // Toggle featured status for a product (Admin)
  const handleToggleFeatured = async (product: Product) => {
    try {
      const newFeatured = !product.isFeatured;
      setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, isFeatured: newFeatured } : p));
      const res = await fetch(`/api/products/${product.id}/featured`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isFeatured: newFeatured, adminUsername: user?.username }),
      });
      if (res.ok) {
        showToast(newFeatured ? `⭐ ปักหมุด "${product.name}" เป็นสินค้าแนะนำแล้ว` : `ยกเลิกสินค้าแนะนำ "${product.name}" แล้ว`);
        fetchProducts();
      } else {
        fetchProducts();
        showToast('เปลี่ยนสถานะสินค้าแนะนำไม่สำเร็จ');
      }
    } catch {
      fetchProducts();
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // Delete category (Admin)
  const handleDeleteCategory = async (cat: CategoryItem) => {
    if (!window.confirm(`คุณต้องการลบหมวดหมู่ "${cat.name}" หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/categories/${cat.id}?adminUsername=${encodeURIComponent(user?.username || 'Admin')}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        showToast(`ลบหมวดหมู่ "${cat.name}" เรียบร้อยแล้ว`);
        fetchCategories();
        if (selectedCategory === cat.slug) setSelectedCategory('all');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'ลบหมวดหมู่ไม่สำเร็จ');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // Fetch purchases
  const fetchPurchases = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/purchases?username=${encodeURIComponent(user.username)}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.purchases) setPurchases(data.purchases);
      }
    } catch {
      // Fallback
    }
  };

  // Fetch site settings & Angpao config
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSiteSettings(data.settings);
          try { localStorage.setItem('hexsync_cached_settings', JSON.stringify(data.settings)); } catch {}
        }
      }
      const phoneRes = await fetch('/api/topup/config');
      if (phoneRes.ok) {
        const pData = await phoneRes.json();
        if (pData.phone) setAngpaoPhone(pData.phone);
      }
    } catch {
      // Keep defaults
    }
  };

  // Fetch store statistics
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/settings/stats');
      if (res.ok) {
        const data = await res.json();
        setStoreStats(data);
      }
    } catch {
      // Fallback
    }
  };

  // Fetch gift codes (Admin)
  const fetchGiftCodes = async () => {
    try {
      const res = await fetch('/api/gift-codes', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setGiftCodesList(data.giftCodes || []);
      }
    } catch {
      // Fallback
    }
  };

  // Fetch coupons (Admin)
  const fetchCoupons = async () => {
    try {
      const res = await fetch('/api/coupons', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCouponsList(data.coupons || []);
      }
    } catch {
      // Fallback
    }
  };

  // Fetch Slip Transactions (Admin)
  const fetchAdminSlips = async () => {
    try {
      const res = await fetch('/api/topup/slips', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAdminSlips(data.slips || []);
      }
    } catch {
      // Fallback
    }
  };

  // Fetch Unified Top-Up History (Admin: Website-wide & per-user filter)
  const fetchAdminTopupHistory = async (overrideUser?: string) => {
    setAdminTopupLoading(true);
    try {
      const userToQuery = overrideUser !== undefined ? overrideUser : adminTopupUserFilter;
      const query = new URLSearchParams();
      if (userToQuery && userToQuery.trim()) query.set('username', userToQuery.trim());
      if (adminTopupMethodFilter !== 'all') query.set('method', adminTopupMethodFilter);
      if (adminTopupStatusFilter !== 'all') query.set('status', adminTopupStatusFilter);
      if (adminTopupSearch.trim()) query.set('search', adminTopupSearch.trim());
      query.set('limit', '200');

      const res = await fetch(`/api/topup/history?${query.toString()}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAdminTopups(data.history || []);
        setAdminTopupSummary(data.summary || null);
        if (data.usersList) setAdminTopupUsersList(data.usersList);
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการโหลดประวัติการเติมเงิน');
    } finally {
      setAdminTopupLoading(false);
    }
  };

  // Fetch Personal Top-Up History (Customer/User)
  const fetchUserTopupHistory = async () => {
    if (!user) return;
    setUserTopupLoading(true);
    try {
      const res = await fetch(`/api/topup/history?username=${encodeURIComponent(user.username)}&limit=100`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setUserTopups(data.history || []);
        setUserTopupSummary(data.summary || null);
      }
    } catch {
      // Fallback
    } finally {
      setUserTopupLoading(false);
    }
  };

  // Fetch Banned IPs (Admin)
  const fetchBannedIps = async () => {
    try {
      const res = await fetch('/api/banned-ips', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setBannedIpsList(data.bannedIps || []);
      }
    } catch {
      // Fallback
    }
    fetchMasterKey();
    fetchWhitelistedIps();
    fetchJailedIps();
  };

  // Fetch Whitelisted IPs (Admin)
  const fetchWhitelistedIps = async () => {
    try {
      const res = await fetch('/api/banned-ips/whitelist/list', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setWhitelistedIpsList(data.whitelistedIps || []);
      }
    } catch {
      // Fallback
    }
  };

  // Fetch Jailed IPs from Anti-DDoS Shield (Admin)
  const fetchJailedIps = async () => {
    try {
      const res = await fetch('/api/banned-ips/jailed/list', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setJailedIpsList(data.jailedIps || []);
      }
    } catch {
      // Fallback
    }
  };

  // Fetch active Master Key (Admin only)
  const fetchMasterKey = async () => {
    try {
      const res = await fetch('/api/banned-ips/master-key', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.masterKey) {
          setAdminMasterKey(data.masterKey);
          setMasterKeyInput(data.masterKey);
        }
      }
    } catch {
      // Fallback
    }
  };

  // Generate a random secure Master Key
  const handleGenerateRandomMasterKey = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let result = '';
    for (let i = 0; i < 14; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setMasterKeyInput(result);
    setShowMasterKeyPlain(true);
    showToast('🎲 สุ่ม Master Key รหัสใหม่แล้ว อย่าลืมกดปุ่มบันทึก!');
  };

  // Save custom Master Key
  const handleSaveMasterKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!masterKeyInput.trim()) {
      showToast('⚠️ กรุณากรอก Master Key');
      return;
    }
    if (masterKeyInput.trim().length < 4) {
      showToast('⚠️ Master Key ต้องมีอย่างน้อย 4 ตัวอักษร');
      return;
    }
    setIsSavingMasterKey(true);
    try {
      const res = await fetch('/api/banned-ips/master-key', {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ masterKey: masterKeyInput.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminMasterKey(data.masterKey || masterKeyInput.trim());
        showToast('🔑 บันทึก Master Key ฉุกเฉินสำเร็จเรียบร้อยแล้ว!');
      } else {
        showToast(data.message || '⚠️ ไม่สามารถบันทึก Master Key ได้');
      }
    } catch {
      showToast('⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsSavingMasterKey(false);
    }
  };

  // Fetch Banned Devices (Admin)
  const fetchBannedDevices = async () => {
    try {
      const res = await fetch('/api/devices/banned', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setBannedDevicesList(data.bannedDevices || []);
      }
    } catch {
      // Fallback
    }
  };

  // Fetch Current Client IP
  const fetchMyIp = async () => {
    try {
      const res = await fetch('/api/banned-ips/my-ip');
      if (res.ok) {
        const data = await res.json();
        if (data.ip) setMyCurrentIp(data.ip);
      }
    } catch {
      // Fallback
    }
  };

  // Fetch Admin Users & Logs
  const fetchAdminData = async () => {
    if (user?.role !== 'admin' && user?.role !== 'superadmin') return;
    try {
      const [uRes, lRes] = await Promise.all([
        fetch('/api/users', { headers: getAuthHeaders() }),
        fetch('/api/logs', { headers: getAuthHeaders() }),
      ]);
      if (uRes.ok) {
        const uData = await uRes.json();
        setAdminUsers(uData.users || []);
      }
      if (lRes.ok) {
        const lData = await lRes.json();
        setAdminLogs(lData.logs || []);
      }
      fetchStats();
      fetchGiftCodes();
      fetchCoupons();
      fetchAdminSlips();
      fetchBannedIps();
      fetchBannedDevices();
      fetchMyIp();
      if (user?.role === 'superadmin') {
        fetchSuperAdminPasscode();
      }
    } catch {
      // Keep state
    }
  };

  // Fetch Threat Logs (Anti-Hack / F12 / Forensics)
  const fetchThreatLogs = async (usernameFilter?: string) => {
    setThreatLogsLoading(true);
    try {
      const token = localStorage.getItem('hexsync_token');
      const savedPass = sessionStorage.getItem('hexsync_security_passcode') || superAdminPasscode;
      const targetFilter = usernameFilter !== undefined ? usernameFilter : threatUserFilter;
      const url = targetFilter.trim()
        ? `/api/security/threat-logs?username=${encodeURIComponent(targetFilter.trim())}`
        : '/api/security/threat-logs';
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-security-passcode': savedPass
        }
      });
      if (res.ok) {
        const data = await res.json();
        setThreatLogsList(data.threatLogs || []);
      } else if (res.status === 403) {
        setIsPasscodeUnlocked(false);
      }
    } catch {
      // Fallback
    } finally {
      setThreatLogsLoading(false);
    }
  };

  // Fetch All Active Bans (IP, Device, User)
  const fetchActiveBans = async () => {
    setActiveBansLoading(true);
    try {
      const token = localStorage.getItem('hexsync_token');
      const savedPass = sessionStorage.getItem('hexsync_security_passcode') || superAdminPasscode;
      const res = await fetch('/api/security/all-active-bans', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-security-passcode': savedPass
        }
      });
      if (res.ok) {
        const data = await res.json();
        const combined = [
          ...(data.bannedIps || []).map((i: any) => ({
            id: i.id,
            banType: 'ip',
            identifier: i.ip,
            detail: 'IP Address',
            reason: i.reason,
            bannedBy: i.bannedBy,
            bannedAt: i.bannedAt,
            bannedUntil: i.bannedUntil
          })),
          ...(data.bannedDevices || []).map((d: any) => ({
            id: d.id,
            banType: 'device',
            identifier: d.deviceModel ? `${d.deviceModel} (${d.deviceId?.slice(0, 8)}...)` : d.deviceId,
            detail: d.deviceId,
            reason: d.reason,
            bannedBy: d.bannedBy,
            bannedAt: d.bannedAt,
            bannedUntil: d.bannedUntil
          })),
          ...(data.bannedUsers || []).map((u: any) => ({
            id: u.id,
            banType: 'user',
            identifier: `@${u.username}`,
            detail: u.email,
            reason: u.banReason,
            bannedBy: u.bannedBy,
            bannedAt: u.bannedAt,
            bannedUntil: u.bannedUntil
          }))
        ];
        setActiveBansList(combined);
      } else if (res.status === 403) {
        setIsPasscodeUnlocked(false);
      }
    } catch {
      // Fallback
    } finally {
      setActiveBansLoading(false);
    }
  };

  // Fetch SuperAdmin Passcode (SuperAdmin only)
  const fetchSuperAdminPasscode = async () => {
    try {
      const token = localStorage.getItem('hexsync_token');
      const res = await fetch('/api/security/passcode', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentMasterPasscode(data.passcode || '');
      }
    } catch { }
  };

  // Generate New Security Passcode (SuperAdmin only)
  const handleGenerateNewPasscode = async () => {
    try {
      const token = localStorage.getItem('hexsync_token');
      const res = await fetch('/api/security/passcode/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentMasterPasscode(data.passcode || '');
        showToast(`🔑 สร้าง Security Passcode ใหม่สำเร็จ: ${data.passcode}`);
      }
    } catch {
      showToast('ไม่สามารถสร้างรหัสใหม่ได้');
    }
  };

  // Verify Passcode for Regular Admins
  const handleVerifyPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError('');
    if (!passcodeInput.trim()) {
      setPasscodeError('กรุณากรอกรหัส Security Passcode');
      return;
    }
    try {
      const res = await fetch('/api/security/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcodeInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setIsPasscodeUnlocked(true);
        setSuperAdminPasscode(passcodeInput.trim());
        try {
          sessionStorage.setItem('hexsync_passcode_unlocked', 'true');
          sessionStorage.setItem('hexsync_security_passcode', passcodeInput.trim());
        } catch { }
        showToast('🔓 ปลดล็อคระบบความปลอดภัยเรียบร้อยแล้ว');
        if (adminTab === 'threatLogs') {
          fetchThreatLogs();
        } else if (adminTab === 'banManager') {
          fetchActiveBans();
        }
      } else {
        setPasscodeError(data.error || 'รหัส Security Passcode ไม่ถูกต้อง');
      }
    } catch {
      setPasscodeError('เกิดข้อผิดพลาดในการตรวจสอบรหัส');
    }
  };

  // 1-Click Ban from Threat Log
  const handleBanFromLog = async (logItem: SecurityThreatLogItem, banTarget: 'ip' | 'device' | 'both', banYears: number = 10) => {
    if (!window.confirm(`ยืนยันการแบน (${banTarget.toUpperCase()}) เป็นเวลา 10 ปี 9 เดือน 9 วัน 9 ชม 9 นาที 9 วินาที สำหรับ ${logItem.username || logItem.ip}?`)) return;
    try {
      const token = localStorage.getItem('hexsync_token');
      const savedPass = sessionStorage.getItem('hexsync_security_passcode') || superAdminPasscode;
      const res = await fetch('/api/security/ban-from-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-security-passcode': savedPass
        },
        body: JSON.stringify({
          logId: logItem.id,
          banTarget,
          banDurationYears: banYears,
          reason: `แบนจากบันทึกภัยคุกคาม #${logItem.id} (${logItem.threatType}: ${logItem.detail})`
        })
      });
      if (res.ok) {
        showToast('แบนเป้าหมายตาม Log เรียบร้อยแล้ว (10 ปี 9 เดือน 9 วัน 9 ชม 9 นาที 9 วินาที)');
        fetchThreatLogs(threatUserFilter);
      } else {
        const d = await res.json();
        showToast(d.error || 'แบนไม่สำเร็จ');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการสั่งแบน');
    }
  };

  // Update Ban Expiration
  const handleUpdateBanExpiration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanModal) return;
    try {
      const token = localStorage.getItem('hexsync_token');
      const savedPass = sessionStorage.getItem('hexsync_security_passcode') || superAdminPasscode;
      const res = await fetch('/api/security/update-ban-expiration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-security-passcode': savedPass
        },
        body: JSON.stringify({
          banType: editingBanModal.banType,
          id: editingBanModal.id,
          bannedUntil: editBanDateInput ? new Date(editBanDateInput).toISOString() : null,
          reason: editBanReasonInput || editingBanModal.reason
        })
      });
      if (res.ok) {
        showToast('อัปเดตระยะเวลาและเงื่อนไขการแบนสำเร็จ');
        setEditingBanModal(null);
        fetchActiveBans();
      } else {
        const d = await res.json();
        showToast(d.error || 'อัปเดตไม่สำเร็จ');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการอัปเดต');
    }
  };

  // Direct Unban from Active Bans list
  const handleUnbanDirect = async (item: any) => {
    if (!window.confirm(`ต้องการปลดแบน ${item.identifier} (${item.banType}) ทันทีหรือไม่?`)) return;
    try {
      const token = localStorage.getItem('hexsync_token');
      const savedPass = sessionStorage.getItem('hexsync_security_passcode') || superAdminPasscode;
      const res = await fetch('/api/security/update-ban-expiration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-security-passcode': savedPass
        },
        body: JSON.stringify({
          targetType: item.banType,
          targetId: item.id,
          banType: item.banType,
          id: item.id,
          action: 'unban',
          bannedUntil: new Date(Date.now() - 5000).toISOString() // expired = unbanned
        })
      });
      if (res.ok) {
        showToast(`ปลดแบน ${item.identifier} เรียบร้อยแล้ว`);
        fetchActiveBans();
        fetchBannedIps();
        fetchAdminData();
      } else {
        showToast('ปลดแบนไม่สำเร็จ');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการปลดแบน');
    }
  };

  // Download Screenshot File
  const handleDownloadScreenshot = (logItem: SecurityThreatLogItem) => {
    if (!logItem.screenshot) {
      showToast('ไม่มีรูปภาพสกรีนช็อตในบันทึกนี้');
      return;
    }
    const a = document.createElement('a');
    a.href = logItem.screenshot;
    a.download = `threat_screenshot_${logItem.username || 'user'}_${logItem.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('ดาวน์โหลดรูปภาพสกรีนช็อตแล้ว');
  };

  // Download Cookies .txt File
  const handleDownloadCookies = (logItem: SecurityThreatLogItem) => {
    const content = `=== HEXSYNCTH SECURITY FORENSICS: BROWSER COOKIES ===\nLog ID: #${logItem.id}\nTimestamp: ${logItem.createdAt}\nUsername: ${logItem.username}\nIP: ${logItem.ip}\nDevice UDID: ${logItem.deviceId}\nThreat Type: ${logItem.threatType}\nDetail: ${logItem.detail}\nPage URL: ${logItem.pageUrl || 'N/A'}\nUser-Agent: ${logItem.userAgent || 'N/A'}\n\n=== RAW COOKIES ===\n${logItem.cookies || 'NO_COOKIES_FOUND'}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cookies_${logItem.username || 'user'}_${logItem.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('ดาวน์โหลดไฟล์ Cookies (.txt) แล้ว');
  };

  // Format Countdown String
  const formatCountdownShort = (bannedUntilStr?: string | null) => {
    if (!bannedUntilStr) return 'ถาวร (ไม่มีกำหนด)';
    const target = new Date(bannedUntilStr).getTime();
    const diff = target - Date.now();
    if (diff <= 0) return 'หมดอายุแล้ว (พร้อมปลดแบน)';
    let sec = Math.floor(diff / 1000);
    const years = Math.floor(sec / (365 * 24 * 3600));
    sec %= (365 * 24 * 3600);
    const months = Math.floor(sec / (30 * 24 * 3600));
    sec %= (30 * 24 * 3600);
    const days = Math.floor(sec / (24 * 3600));
    sec %= (24 * 3600);
    const hours = Math.floor(sec / 3600);
    sec %= 3600;
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    const parts = [];
    if (years > 0) parts.push(`${years} ปี`);
    if (months > 0) parts.push(`${months} ด.`);
    if (days > 0) parts.push(`${days} ว.`);
    parts.push(`${hours} ชม.`);
    parts.push(`${minutes} น.`);
    parts.push(`${seconds} วิ.`);
    return parts.join(' ');
  };

  // SuperAdmin Master Secret & Account Management Handlers
  const handleVerifySuperAdminSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuperAdminSecretError('');
    const inputSecret = superAdminSecretInput.trim();
    if (!inputSecret) {
      setSuperAdminSecretError('กรุณากรอกรหัสลับ Master Secret 10 หลัก');
      return;
    }
    try {
      const res = await fetch('/api/superadmin/verify-secret', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ secret: inputSecret })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setIsSuperAdminUnlocked(true);
        setSavedSuperAdminSecret(inputSecret);
        try {
          sessionStorage.setItem('hexsync_superadmin_unlocked', 'true');
          sessionStorage.setItem('hexsync_superadmin_secret', inputSecret);
        } catch { }
        showToast('🔓 ยืนยันรหัสลับถูกต้อง ปลดล็อกระบบจัดการ SuperAdmin แล้ว');
        fetchSuperAdminAccounts(inputSecret);
      } else {
        setSuperAdminSecretError(data.message || 'รหัสลับไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
      }
    } catch {
      setSuperAdminSecretError('เกิดข้อผิดพลาดในการตรวจสอบรหัสลับ');
    }
  };

  const fetchSuperAdminAccounts = async (overrideSecret?: string) => {
    setIsLoadingSuperAdmin(true);
    try {
      const secret = overrideSecret || savedSuperAdminSecret || sessionStorage.getItem('hexsync_superadmin_secret') || '';
      const headers: Record<string, string> = {
        ...getAuthHeaders(),
        ...(secret ? { 'x-superadmin-secret': secret } : {})
      };
      const res = await fetch('/api/superadmin/accounts', { headers });
      if (res.ok) {
        const data = await res.json();
        const accs = data.accounts || [];
        setSuperAdminAccounts(accs);
        if (accs.length > 0) {
          const match = accs.find((a: any) => a.id === user?.id) || accs[0];
          handleStartEditSuperAdmin(match);
        }
      } else {
        const d = await res.json();
        if (d.error === 'SUPERADMIN_SECRET_REQUIRED') {
          setIsSuperAdminUnlocked(false);
          try {
            sessionStorage.removeItem('hexsync_superadmin_unlocked');
            sessionStorage.removeItem('hexsync_superadmin_secret');
          } catch { }
        }
      }
    } catch {
      showToast('ไม่สามารถดึงข้อมูลบัญชี SuperAdmin ได้');
    } finally {
      setIsLoadingSuperAdmin(false);
    }
  };

  const handleStartEditSuperAdmin = (account: any) => {
    setEditingSuperAdmin(account);
    setSaEditUsername(account.username || '');
    setSaEditEmail(account.email || '');
    setSaEditPassword('');
    setSaEditConfirmPassword('');
    setSaEditBalance(account.creditBalance !== undefined ? account.creditBalance : 0);
    setSaShowPassword(false);
  };

  const handleSaveSuperAdminAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSuperAdmin) return;
    if (saEditPassword && saEditPassword !== saEditConfirmPassword) {
      showToast('❌ รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    if (saEditPassword && saEditPassword.length < 4) {
      showToast('❌ รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }
    setIsSavingSuperAdmin(true);
    try {
      const secret = savedSuperAdminSecret || sessionStorage.getItem('hexsync_superadmin_secret') || '';
      const headers: Record<string, string> = {
        ...getAuthHeaders(),
        ...(secret ? { 'x-superadmin-secret': secret } : {})
      };
      const bodyPayload: any = {
        username: saEditUsername.trim(),
        email: saEditEmail.trim(),
        creditBalance: saEditBalance,
        masterSecret: secret
      };
      if (saEditPassword.trim()) {
        bodyPayload.password = saEditPassword.trim();
      }
      const res = await fetch(`/api/superadmin/accounts/${editingSuperAdmin.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('👑 ' + (data.message || 'อัปเดตข้อมูล SuperAdmin เรียบร้อยแล้ว'));
        if (user && user.id === editingSuperAdmin.id) {
          setUser({
            ...user,
            username: data.user.username,
            email: data.user.email,
            balance: data.user.creditBalance,
            role: 'superadmin'
          });
          try {
            const savedUser = localStorage.getItem('hexsync_user');
            if (savedUser) {
              const u = JSON.parse(savedUser);
              u.username = data.user.username;
              u.email = data.user.email;
              u.balance = data.user.creditBalance;
              localStorage.setItem('hexsync_user', JSON.stringify(u));
            }
          } catch { }
        }
        setSaEditPassword('');
        setSaEditConfirmPassword('');
        fetchSuperAdminAccounts();
      } else {
        showToast('❌ ' + (data.message || 'บันทึกไม่สำเร็จ'));
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อบันทึก');
    } finally {
      setIsSavingSuperAdmin(false);
    }
  };

  const handleRelockSuperAdmin = () => {
    setIsSuperAdminUnlocked(false);
    setSavedSuperAdminSecret('');
    setSuperAdminSecretInput('');
    try {
      sessionStorage.removeItem('hexsync_superadmin_unlocked');
      sessionStorage.removeItem('hexsync_superadmin_secret');
    } catch { }
    showToast('🔒 ปิดการเข้าถึงฉุกเฉิน SuperAdmin เรียบร้อย');
  };

  // Fetch keys for a specific product
  const fetchProductKeys = async (productId: number) => {
    try {
      const res = await fetch(`/api/products/${productId}/keys`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProductKeysList(data.keys || []);
      }
    } catch {
      showToast('ไม่สามารถดึงข้อมูลคีย์สต็อกได้');
    }
  };


  // Save custom game banner, icon, and description
  const handleSaveGameMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGameMeta) return;

    let customMap: Record<string, { bannerImage?: string; image?: string; description?: string }> = {};
    try {
      if ((siteSettings as any).hexsync_game_custom_images) {
        customMap = JSON.parse((siteSettings as any).hexsync_game_custom_images);
      }
    } catch {}

    customMap[editingGameMeta.title] = {
      bannerImage: gameBannerInput.trim() || editingGameMeta.bannerImage,
      image: gameIconInput.trim() || editingGameMeta.image,
      description: gameDescInput.trim() || editingGameMeta.description,
    };

    const updatedJson = JSON.stringify(customMap);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          hexsync_game_custom_images: updatedJson,
          adminUsername: user?.username
        })
      });

      if (res.ok) {
        setSiteSettings((prev: any) => ({ ...prev, hexsync_game_custom_images: updatedJson }));
        showToast('บันทึกรูปภาพและข้อมูลเกมสำเร็จแล้ว');
        setEditingGameMeta(null);
      } else {
        showToast('บันทึกไม่สำเร็จ');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // Open key manager for product
  const handleOpenKeyManager = (product: Product) => {
    setManagingKeysProduct(product);
    setInputKeysText('');
    fetchProductKeys(product.id);
  };

  // Add stock keys to product
  const handleAddStockKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingKeysProduct || !inputKeysText.trim()) return;

    try {
      const res = await fetch(`/api/products/${managingKeysProduct.id}/keys`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          keysText: inputKeysText,
          adminUsername: user?.username
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        setInputKeysText('');
        fetchProductKeys(managingKeysProduct.id);
        fetchProducts();
      } else {
        showToast(data.message || 'เติมคีย์ไม่สำเร็จ');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // Delete individual key from stock
  const handleDeleteKey = async (keyId: number) => {
    if (!managingKeysProduct) return;
    try {
      const res = await fetch(`/api/products/${managingKeysProduct.id}/keys/${keyId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        showToast('ลบคีย์ออกจากสต็อกเรียบร้อย');
        fetchProductKeys(managingKeysProduct.id);
        fetchProducts();
      }
    } catch {
      showToast('ลบไม่สำเร็จ');
    }
  };

  // Image Upload helper (converts to base64 with smart auto-compression, preserves animated GIF & SVG)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = (file.name || '').toLowerCase();
    const fileType = (file.type || '').toLowerCase();
    const isGif = fileType.includes('gif') || fileName.endsWith('.gif');
    const isSvg = fileType.includes('svg') || fileName.endsWith('.svg');

    if (!file.type.startsWith('image/') && !isGif && !isSvg) {
      showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WebP, GIF, SVG)');
      e.target.value = '';
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      showToast('ขนาดไฟล์รูปภาพใหญ่เกินไป (สูงสุดไม่เกิน 25MB)');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (!result) return;

      // If GIF or SVG, bypass canvas compression completely to preserve full animation / vector fidelity
      if (isGif || isSvg) {
        let finalUrl = result;
        if (isGif && !finalUrl.startsWith('data:image/gif')) {
          finalUrl = finalUrl.replace(/^data:[^;]*;base64,/, 'data:image/gif;base64,');
        }
        callback(finalUrl);
        showToast(isGif ? 'อัปโหลดรูปภาพ GIF เคลื่อนไหวสำเร็จ' : 'อัปโหลดรูปภาพสำเร็จ');
        e.target.value = '';
        return;
      }

      // Auto-compress high-resolution camera/phone photos
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 800;
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
            // Export as JPEG with 0.85 quality for crisp quality and tiny size (<100KB)
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            callback(compressed);
          } else {
            callback(result);
          }
        } catch {
          callback(result);
        }
        showToast('อัปโหลดรูปภาพสำเร็จ');
        e.target.value = '';
      };
      img.onerror = () => {
        callback(result);
        showToast('อัปโหลดรูปภาพสำเร็จ');
        e.target.value = '';
      };
      img.src = result;
    };
    reader.onerror = () => {
      showToast('อ่านไฟล์รูปภาพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  // Parse Thai Slip QR on client side
  const parseSlipQrClient = (qrData: string) => {
    let bankName = 'ธนาคารทั่วไป / พร้อมเพย์';
    let transRef = '';
    let amount: number | null = null;

    const bankMap: { [key: string]: string } = {
      '004': 'ธนาคารกสิกรไทย (KBank)',
      '014': 'ธนาคารไทยพาณิชย์ (SCB)',
      '006': 'ธนาคารกรุงไทย (KTB)',
      '002': 'ธนาคารกรุงเทพ (BBL)',
      '011': 'ธนาคารทหารไทยธนชาต (TTB)',
      '025': 'ธนาคารกรุงศรีอยุธยา (BAY)',
      '030': 'ธนาคารออมสิน (GSB)',
      '069': 'ธนาคารเกียรตินาคินภัทร (KKP)',
      '034': 'ธนาคาร ธ.ก.ส. (BAAC)',
      '073': 'ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)',
      '098': 'พร้อมเพย์ (PromptPay)'
    };

    if (qrData.includes('000001') || qrData.startsWith('00')) {
      const bIdx = qrData.indexOf('0103');
      if (bIdx !== -1) {
        const bCode = qrData.substring(bIdx + 4, bIdx + 7);
        if (bankMap[bCode]) bankName = bankMap[bCode];
      }
      const refIdx = qrData.indexOf('02');
      if (refIdx !== -1) {
        const len = parseInt(qrData.substring(refIdx + 2, refIdx + 4), 10);
        if (!isNaN(len) && len > 0 && len < 50) {
          transRef = qrData.substring(refIdx + 4, refIdx + 4 + len);
        }
      }
      const amtIdx = qrData.indexOf('54');
      if (amtIdx !== -1) {
        const len = parseInt(qrData.substring(amtIdx + 2, amtIdx + 4), 10);
        if (!isNaN(len) && len > 0 && len < 15) {
          const a = parseFloat(qrData.substring(amtIdx + 4, amtIdx + 4 + len));
          if (!isNaN(a) && a > 0) amount = a;
        }
      }
    }

    return { bankName, transRef, amount };
  };

  // Dedicated Slip Upload with Instant QR Scanner
  const handleSlipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');

    if (!file.type.startsWith('image/') && !isGif) {
      showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WebP, GIF)');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (!result) return;

      const img = new Image();
      img.onload = async () => {
        let detectedQr: string | null = null;
        let finalImage = result;

        // 1. Try native BarcodeDetector first on full image
        if ('BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(img);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              detectedQr = barcodes[0].rawValue.trim();
            }
          } catch (err) {
            // fallback
          }
        }

        // 2. Try jsQR on canvas
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          if (!detectedQr) {
            try {
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const qr = jsQR(imgData.data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' });
              if (qr && qr.data) {
                detectedQr = qr.data.trim();
              }
            } catch (err) {
              console.error('jsQR error:', err);
            }
          }

          if (isGif) {
            finalImage = result;
            setBankSlipImage(result);
          } else {
            // Auto-compress for upload size optimization
            let uploadWidth = img.width;
            let uploadHeight = img.height;
            const maxDim = 1200;
            if (uploadWidth > maxDim || uploadHeight > maxDim) {
              if (uploadWidth > uploadHeight) {
                uploadHeight = Math.round((uploadHeight * maxDim) / uploadWidth);
                uploadWidth = maxDim;
              } else {
                uploadWidth = Math.round((uploadWidth * maxDim) / uploadHeight);
                uploadHeight = maxDim;
              }
            }
            const upCanvas = document.createElement('canvas');
            upCanvas.width = uploadWidth;
            upCanvas.height = uploadHeight;
            const upCtx = upCanvas.getContext('2d');
            if (upCtx) {
              upCtx.drawImage(img, 0, 0, uploadWidth, uploadHeight);
              const compressed = upCanvas.toDataURL('image/jpeg', 0.88);
              finalImage = compressed;
              setBankSlipImage(compressed);
            } else {
              setBankSlipImage(result);
            }
          }
        } else {
          setBankSlipImage(result);
        }

        if (detectedQr) {
          setDetectedSlipQr(detectedQr);
          const parsed = parseSlipQrClient(detectedQr);
          setDetectedSlipBank(parsed.bankName);
          setDetectedSlipTransRef(parsed.transRef || null);
          if (parsed.amount) {
            setDetectedSlipAmount(parsed.amount);
            setBankAmount(parsed.amount);
          }
        } else {
          setDetectedSlipQr(null);
          setDetectedSlipBank(null);
          setDetectedSlipTransRef(null);
          setDetectedSlipAmount(null);
        }

        // Call server scan-slip for deep QR and OCR slip amount detection
        try {
          const scanRes = await fetch('/api/topup/scan-slip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slipImage: finalImage,
              clientQrData: detectedQr,
            }),
          });
          if (scanRes.ok) {
            const scanData = await scanRes.json();
            if (scanData.sendingBankName) setDetectedSlipBank(scanData.sendingBankName);
            if (scanData.transRef) setDetectedSlipTransRef(scanData.transRef);
            if (scanData.detectedAmount) {
              setDetectedSlipAmount(scanData.detectedAmount);
              setBankAmount(scanData.detectedAmount);
              showToast(`✅ ตรวจพบยอดเงินโอนจริง ฿${scanData.detectedAmount.toLocaleString()} บาท (ปรับช่องจำนวนเงินให้อัตโนมัติแล้ว)`);
            } else if (scanData.sendingBankName) {
              showToast(`✅ ตรวจพบสลิป ${scanData.sendingBankName} เรียบร้อยแล้ว`);
            }
          }
        } catch {
          // fallback
        }

        setTimeout(() => {
          topupBodyRef.current?.scrollTo({ top: topupBodyRef.current.scrollHeight, behavior: 'smooth' });
        }, 150);

        e.target.value = '';
      };
      img.onerror = () => {
        showToast('อ่านรูปภาพไม่สำเร็จ');
        e.target.value = '';
      };
      img.src = result;
    };
    reader.onerror = () => {
      showToast('อ่านไฟล์ไม่สำเร็จ');
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchGamesList();
    fetchSettings();
    fetchStats();
  }, []);

  useEffect(() => {
    if (user) fetchPurchases();
    if (user?.role === 'admin' || user?.role === 'superadmin') fetchAdminData();
  }, [user]);

  // Countdown timer for OTP
  useEffect(() => {
    let timer: any;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  // Active Category & Featured products
  const _activeCategory = categories.find((c) => c.slug === selectedCategory); void _activeCategory;
  const _featuredProducts = (products || []).filter((p) => p && p.isFeatured && p.active); void _featuredProducts;

  // Filter products
  const _filteredProducts = (products || []).filter((p) => {
    void _filteredProducts;
    if (!p) return false;
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesSearch = (p.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (p.description || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Cart operations
  const addToCart = (product: Product, quantityToAdd: number = 1) => {
    if (!user) {
      showToast('กรุณาเข้าสู่ระบบก่อนเลือกซื้อสินค้า');
      setAuthTab('login');
      setAuthModalOpen(true);
      return;
    }
    if (product.stock <= 0) {
      showToast(`สินค้า "${product.name}" สต็อกหมดชั่วคราว`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + quantityToAdd;
        if (newQty > product.stock) {
          showToast(`ไม่สามารถเพิ่มได้เกินสต็อกคงเหลือ (${product.stock} ชิ้น)`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prev, { product, quantity: Math.min(quantityToAdd, product.stock) }];
    });
    showToast(`เพิ่ม "${product.name}" (${quantityToAdd} ชิ้น) ลงในตะกร้าเรียบร้อย`);
  };

  const updateCartQty = (productId: number, change: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + change;
            if (newQty > item.product.stock) {
              showToast(`สินค้ามีสต็อกคงเหลือ ${item.product.stock} ชิ้น`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // 2-Step Purchase Checkout
  const executePurchase = async (itemsToBuy: { productId: number; quantity: number }[]) => {
    if (!user) {
      setAuthModalOpen(true);
      showToast('กรุณาเข้าสู่ระบบก่อนทำรายการสั่งซื้อ');
      return;
    }

    try {
      const res = await fetch('/api/purchases/checkout', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          username: user.username,
          items: itemsToBuy,
          couponCode: appliedCoupon?.code
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'เกิดข้อผิดพลาดในการสั่งซื้อ');
        return;
      }

      setUser({ ...user, balance: data.newBalance });
      setCart([]);
      setShowCartModal(false);
      setShowConfirm2Step(false);
      setShowDirectBuyConfirm(null);
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setCouponInput('');
      setCouponMsg(null);

      if (data.purchases) {
        setPurchases([...data.purchases, ...purchases]);
      } else {
        await fetchPurchases();
      }

      await fetchProducts();
      fetchStats();
      setView('history');
      showToast('🎉 สั่งซื้อสำเร็จ! ระบบได้ดึงคีย์จริงออกจากสต็อกเรียบร้อยแล้ว');
    } catch (err: any) {
      showToast('การสั่งซื้อไม่สำเร็จ: ' + err.message);
    }
  };

  // Auth Operations
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const devInfo = await collectFullDeviceInfo();

      // Optional GPS Coordinates (Falls back seamlessly to Server IP Geolocation if permission not given)
      let coords: { latitude?: number; longitude?: number } = {};
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          coords = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
              () => resolve({}),
              { timeout: 1500, maximumAge: 60000 }
            );
          });
        } catch { }
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-device-id': devInfo.deviceId },
        body: JSON.stringify({
          username: authUsername,
          password: authPassword,
          deviceId: devInfo.deviceId,
          deviceModel: devInfo.model,
          deviceInfo: devInfo,
          latitude: coords.latitude,
          longitude: coords.longitude
        })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.banned || data.userBanned) {
          const bInfo: UserBannedInfo = {
            username: data.username || authUsername,
            bannedBy: data.bannedBy || 'ผู้ดูแลระบบ (Admin)',
            banReason: data.banReason || 'ละเมิดข้อกำหนดการใช้งานของเว็บไซต์',
            bannedAt: data.bannedAt
          };
          setUserBannedInfo(bInfo);
          try {
            sessionStorage.setItem('hexsync_user_banned_info', JSON.stringify(bInfo));
            localStorage.setItem('hexsync_user_banned_info', JSON.stringify(bInfo));
          } catch { }
          setAuthModalOpen(false);
          setView('banned');
          window.location.hash = '#banned';
          showToast('⚠️ บัญชีของคุณถูกระงับการใช้งาน');
          return;
        }
        showToast(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
        return;
      }
      if (data.token) {
        localStorage.setItem('hexsync_token', data.token);
        localStorage.setItem('hexsync_user', JSON.stringify(data.user));
      }
      setUser(data.user);
      setAuthModalOpen(false);
      showToast(`ยินดีต้อนรับคุณ ${data.user.username}! (ยศ: ${data.user.role})`);
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authPassword !== authConfirmPass) {
      showToast('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    try {
      const devInfo = await collectFullDeviceInfo();
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-device-id': devInfo.deviceId },
        body: JSON.stringify({
          username: authUsername,
          email: authEmail,
          password: authPassword,
          confirmPassword: authConfirmPass,
          deviceId: devInfo.deviceId,
          deviceModel: devInfo.model,
          deviceInfo: devInfo
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'สมัครสมาชิกไม่สำเร็จ');
        return;
      }
      if (data.token) {
        localStorage.setItem('hexsync_token', data.token);
        localStorage.setItem('hexsync_user', JSON.stringify(data.user));
      }
      setUser(data.user);
      setAuthModalOpen(false);
      showToast(`สมัครสมาชิกสำเร็จ! ยินดีต้อนรับ ${data.user.username}`);
    } catch {
      showToast('เกิดข้อผิดพลาดในการสมัคร');
    }
  };

  const handleRequestOtp = async () => {
    if (!authEmail) {
      showToast('กรุณากรอก Gmail ที่ผูกกับบัญชี');
      return;
    }
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'ขอ OTP ไม่สำเร็จ');
        return;
      }
      setOtpSent(true);
      setOtpCountdown(60);
      if (data.mockOtp) setForgotOtp(data.mockOtp);
      showToast(data.message || 'ส่งรหัส OTP เรียบร้อยแล้ว กรุณาตรวจสอบอีเมลหรือติดต่อแอดมิน');
    } catch {
      showToast('ไม่สามารถส่ง OTP ได้');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotNewPass !== forgotConfirmPass) {
      showToast('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authEmail,
          otp: forgotOtp,
          newPassword: forgotNewPass,
          confirmPassword: forgotConfirmPass
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'รีเซ็ตรหัสผ่านไม่สำเร็จ');
        return;
      }
      showToast(data.message);
      setAuthTab('login');
      setOtpSent(false);
    } catch {
      showToast('เกิดข้อผิดพลาด');
    }
  };

  // Open Top-Up Modal (requires authentication)
  const handleOpenTopup = (initialTab?: 'bank' | 'angpao' | 'giftcode' | 'history' | React.MouseEvent) => {
    if (!user) {
      setAuthModalOpen(true);
      showToast('กรุณาเข้าสู่ระบบก่อนทำรายการเติมเงิน');
      return;
    }
    const tab: 'bank' | 'angpao' | 'giftcode' | 'history' =
      typeof initialTab === 'string' && ['bank', 'angpao', 'giftcode', 'history'].includes(initialTab)
        ? (initialTab as any)
        : 'bank';

    setActiveQrOrder(null);
    setShowDynamicQrModal(false);
    setQrPaymentSuccess(false);
    setBankAmount(0);
    setBankSlipImage('');
    setTopupTab(tab);
    setShowAngpaoModal(true);
    if (tab === 'history') {
      fetchUserTopupHistory();
    }
  };

  // Angpao Topup
  const handleAngpaoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthModalOpen(true);
      showToast('กรุณาเข้าสู่ระบบก่อนทำการเติมเงิน');
      return;
    }
    try {
      const res = await fetch('/api/topup/angpao', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ voucherUrl: angpaoUrl, username: user.username })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'เติมเงินไม่สำเร็จ');
        return;
      }
      setUser({ ...user, balance: data.balance });
      setShowAngpaoModal(false);
      setAngpaoUrl('');
      showToast(data.message);
    } catch {
      showToast('เกิดข้อผิดพลาดในการเติมเงิน');
    }
  };

  // 1. Create Dynamic Single-Use PromptPay QR Order (30-min expiration)
  const handleCreateQrOrder = async (amountToTopup: number) => {
    if (!user) {
      setAuthModalOpen(true);
      showToast('กรุณาเข้าสู่ระบบก่อนทำรายการเติมเงิน');
      return;
    }
    const num = Number(amountToTopup);
    if (!num || num < 1) {
      showToast('กรุณาระบุจำนวนเงินอย่างน้อย 1 บาทขึ้นไป');
      return;
    }

    setGeneratingQr(true);
    try {
      const res = await fetch('/api/topup/create-qr-order', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          username: user.username,
          amount: num,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'ไม่สามารถสร้าง QR Code ได้');
        return;
      }

      setActiveQrOrder(data.order);
      setQrCountdown(1800); // 30 minutes in seconds
      setQrPaymentSuccess(false);
      setQrSlipImage('');
      setShowDynamicQrModal(true);
      setShowAngpaoModal(false); // smoothly transition to the dedicated QR payment modal
      showToast(`⚡ สร้าง QR Code ชำระเงิน ฿${data.order.amount.toLocaleString()} สำเร็จ (หมดอายุใน 30 นาที)`);
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setGeneratingQr(false);
    }
  };

  // 2. Confirm Dynamic QR Payment (Single-use auto-credit)
  const handleConfirmQrPayment = async (customSlip?: string) => {
    if (!activeQrOrder || !user) return;
    setQrVerifying(true);
    try {
      const res = await fetch('/api/topup/confirm-qr-payment', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          orderId: activeQrOrder.orderId,
          username: user.username,
          slipImage: customSlip || qrSlipImage || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'การยืนยันยอดเงินไม่สำเร็จ');
        return;
      }

      setQrPaymentSuccess(true);
      const newBalance = data.balance !== undefined ? data.balance : ((user.balance || 0) + activeQrOrder.amount);
      setUser({ ...user, balance: newBalance });
      showToast(data.message || '🎉 เติมเงินสำเร็จ! ยอดเงินเข้ากระเป๋าเรียบร้อยแล้ว');
      fetchStats();
    } catch {
      showToast('เกิดข้อผิดพลาดในการยืนยันรายการ');
    } finally {
      setQrVerifying(false);
    }
  };

  // 3. Dynamic QR Timer & Auto-Polling Effect (Auto-Credit when paid)
  useEffect(() => {
    if (!showDynamicQrModal || !activeQrOrder || qrPaymentSuccess) return;

    // A. 1-second countdown clock
    const countdownTimer = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // B. Real-time 3-second auto polling to detect payment & auto credit
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/topup/qr-order/${activeQrOrder.orderId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'paid') {
          setQrPaymentSuccess(true);
          setUser((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              balance: (prev.balance || 0) + (data.amount || activeQrOrder.amount),
            };
          });
          showToast(`🎉 ชำระเงินสำเร็จ! +฿${(data.amount || activeQrOrder.amount).toLocaleString()} บาท เติมเข้าสู่บัญชีเรียบร้อยแล้ว`);
          fetchStats();
        } else if (data.status === 'expired') {
          showToast('❌ QR Code นี้หมดอายุแล้ว (เกิน 30 นาที)');
        }
      } catch {
        // silence polling errors
      }
    }, 3000);

    return () => {
      clearInterval(countdownTimer);
      clearInterval(pollInterval);
    };
  }, [showDynamicQrModal, activeQrOrder, qrPaymentSuccess]);

  // Bank Transfer Slip Verification Submit
  const handleBankSlipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthModalOpen(true);
      showToast('กรุณาเข้าสู่ระบบก่อนทำรายการเติมเงิน');
      return;
    }
    if (!bankAmount || bankAmount <= 0) {
      showToast('กรุณากรอกจำนวนเงินให้ถูกต้อง (มากกว่า 0 บาท)');
      return;
    }
    if (!bankSlipImage) {
      showToast('กรุณาอัปโหลดรูปภาพสลิปหลักฐานการโอนเงิน');
      return;
    }

    setBankSlipUploading(true);
    try {
      const res = await fetch('/api/topup/bank-slip', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          username: user.username,
          amount: bankAmount,
          slipImage: bankSlipImage,
          clientQrData: detectedSlipQr,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.balance !== undefined) {
          setUser({ ...user, balance: data.balance });
        }
        setShowAngpaoModal(false);
        setBankSlipImage('');
        setDetectedSlipQr(null);
        setDetectedSlipBank(null);
        setDetectedSlipTransRef(null);
        setDetectedSlipAmount(null);
        showToast(data.message || 'เติมเงินสำเร็จ');
        fetchStats();
      } else {
        showToast(data.message || 'เติมเงินไม่สำเร็จ');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการตรวจสอบสลิป');
    } finally {
      setBankSlipUploading(false);
    }
  };

  // Redeem Gift Code
  const handleRedeemGiftCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthModalOpen(true);
      showToast('กรุณาเข้าสู่ระบบก่อนแลกรับโค้ด');
      return;
    }
    if (!giftCodeInput.trim()) {
      showToast('กรุณากรอกรหัสโค้ดเครดิตฟรี');
      return;
    }

    setRedeemingCode(true);
    try {
      const res = await fetch('/api/gift-codes/redeem', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ code: giftCodeInput, username: user.username }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser({ ...user, balance: data.balance });
        setGiftCodeInput('');
        setShowAngpaoModal(false);
        showToast(data.message || 'แลกรับโค้ดสำเร็จ');
        fetchStats();
      } else {
        showToast(data.message || 'แลกรับโค้ดไม่สำเร็จ');
      }
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setRedeemingCode(false);
    }
  };

  // Validate & Apply Coupon
  const handleApplyCoupon = async (totalToDiscount: number) => {
    if (!couponInput.trim()) {
      setCouponMsg({ type: 'error', text: 'กรุณากรอกรหัสคูปอง' });
      return;
    }
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput, cartTotal: totalToDiscount }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCoupon(data.coupon);
        setCouponDiscount(data.discountAmount);
        setCouponMsg({ type: 'success', text: data.message });
        showToast(data.message);
      } else {
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setCouponMsg({ type: 'error', text: data.message || 'คูปองไม่ถูกต้อง' });
      }
    } catch {
      setCouponMsg({ type: 'error', text: 'ไม่สามารถตรวจสอบคูปองได้' });
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponInput('');
    setCouponMsg(null);
  };

  // Admin: Create Gift Code
  const handleCreateGiftCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/gift-codes', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...newGiftCode, adminUsername: user?.username }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        setNewGiftCode({ code: '', creditAmount: 50, maxUses: 1 });
        fetchGiftCodes();
      } else {
        showToast(data.message || 'สร้างโค้ดไม่สำเร็จ');
      }
    } catch {
      showToast('สร้างโค้ดไม่สำเร็จ');
    }
  };

  // Admin: Delete Gift Code
  const handleDeleteGiftCode = async (id: number) => {
    if (!window.confirm('คุณแน่ใจว่าต้องการลบโค้ดนี้?')) return;
    try {
      const res = await fetch(`/api/gift-codes/${id}?adminUsername=${user?.username}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        showToast('ลบโค้ดเรียบร้อย');
        fetchGiftCodes();
      }
    } catch {
      showToast('ลบโค้ดไม่สำเร็จ');
    }
  };

  // Admin: Create Coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...newCoupon, adminUsername: user?.username }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        setNewCoupon({ code: '', discountType: 'fixed', discountValue: 50, minSpend: 100, maxUses: 100 });
        fetchCoupons();
      } else {
        showToast(data.message || 'สร้างคูปองไม่สำเร็จ');
      }
    } catch {
      showToast('สร้างคูปองไม่สำเร็จ');
    }
  };

  // Admin: Delete Coupon
  const handleDeleteCoupon = async (id: number) => {
    if (!window.confirm('คุณแน่ใจว่าต้องการลบคูปองนี้?')) return;
    try {
      const res = await fetch(`/api/coupons/${id}?adminUsername=${user?.username}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        showToast('ลบคูปองเรียบร้อย');
        fetchCoupons();
      }
    } catch {
      showToast('ลบคูปองไม่สำเร็จ');
    }
  };

  // Admin: Save Dashboard Stats Customizer
  const handleSaveDashboardStats = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          settings: {
            dashboard_override_enabled: siteSettings.dashboard_override_enabled,
            custom_stat_sales: siteSettings.custom_stat_sales,
            custom_stat_orders: siteSettings.custom_stat_orders,
            custom_stat_users: siteSettings.custom_stat_users,
          },
          adminUsername: user?.username,
        }),
      });
      if (res.ok) {
        showToast('บันทึกการตั้งค่าสถิติแดชบอร์ดสำเร็จ');
        fetchStats();
      } else {
        showToast('บันทึกสถิติไม่สำเร็จ');
      }
    } catch {
      showToast('บันทึกสถิติไม่สำเร็จ');
    }
  };

  // Copy Key
  const handleCopyKey = (keyString: string) => {
    navigator.clipboard.writeText(keyString);
    setCopiedKey(keyString);
    showToast('คัดลอกรหัสคีย์เรียบร้อยแล้ว');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Admin Actions
  const handleToggleUserRole = async (targetUser: any) => {
    const newRole = targetUser.role === 'admin' ? 'member' : 'admin';
    try {
      const res = await fetch(`/api/users/${targetUser.id}/role`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: newRole, adminUsername: user?.username })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        fetchAdminData();
      }
    } catch {
      showToast('ปรับยศไม่สำเร็จ');
    }
  };

  const handleAdjustBalance = async (targetUser: any) => {
    const amountStr = prompt(`ระบุจำนวนเงินที่ต้องการปรับให้ ${targetUser.username}:`, '100');
    if (!amountStr) return;
    const isDeduct = window.confirm(`กด "ตกลง" เพื่อเพิ่มเงิน (+${amountStr})\nหรือกด "ยกเลิก" เพื่อลดเงิน (-${amountStr})`);
    const type = isDeduct ? 'add' : 'deduct';

    try {
      const res = await fetch(`/api/users/${targetUser.id}/adjust-balance`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount: Number(amountStr), type, adminUsername: user?.username })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        fetchAdminData();
        if (user && targetUser.username === user.username) {
          setUser({ ...user, balance: data.balance });
        }
      }
    } catch {
      showToast('ปรับยอดเงินไม่สำเร็จ');
    }
  };

  const handleOpenUserPurchases = async (targetUser: any) => {
    setViewingUserPurchases(targetUser);
    setLoadingUserPurchases(true);
    setUserPurchasesList([]);
    try {
      const res = await fetch(`/api/purchases?username=${encodeURIComponent(targetUser.username)}`);
      if (res.ok) {
        const data = await res.json();
        setUserPurchasesList(data.purchases || []);
      } else {
        showToast('ไม่สามารถดึงประวัติการซื้อของสมาชิกท่านนี้ได้');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการโหลดประวัติการซื้อ');
    } finally {
      setLoadingUserPurchases(false);
    }
  };

  // Ban / Unban User Account
  const handleToggleBanUser = async (targetUser: any, shouldBan: boolean) => {
    let reason = '';
    let banIpAlso = false;

    if (shouldBan) {
      const inputReason = window.prompt(
        `🚫 สั่งแบนบัญชีผู้ใช้ "${targetUser.username}" (User-Only Ban)\n\nกรุณาระบุเหตุผลในการแบน (ข้อความนี้จะแสดงให้ผู้ใช้เห็นตอนเข้าสู่ระบบ):`,
        'ละเมิดข้อกำหนดการใช้งานของเว็บไซต์ / พฤติกรรมไม่เหมาะสม'
      );
      if (inputReason === null) return;
      reason = inputReason.trim() || 'ละเมิดข้อกำหนดการใช้งานของเว็บไซต์';
      const userIp = targetUser.lastIp || targetUser.registerIp;
      if (userIp && userIp !== '127.0.0.1') {
        if (myCurrentIp && (userIp === myCurrentIp || userIp.trim() === myCurrentIp.trim())) {
          // Self-ban safety: Do not ban admin's own IP
          banIpAlso = false;
        } else {
          banIpAlso = window.confirm(
            `❓ คุณต้องการสั่ง "แบน IP (${userIp})" ควบคู่ไปด้วยหรือไม่?\n\n- กด "ตกลง (OK)" เพื่อแบนทั้งบัญชี User และแบน IP ด้วย\n- กด "ยกเลิก (Cancel)" เพื่อ "แบนเฉพาะ User อย่างเดียว" (อุปกรณ์เครื่องอื่นที่ IP นี้จะยังเข้าดูเว็บได้ แต่จะล็อกอินบัญชีนี้ไม่ได้)`
          );
        }
      }
    } else {
      if (!window.confirm(`ยืนยันการ "ปลดแบน" บัญชีผู้ใช้ "${targetUser.username}" ใช่หรือไม่?`)) return;
    }

    try {
      const res = await fetch(`/api/users/${targetUser.id}/ban`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          isBanned: shouldBan,
          banReason: reason,
          banIpAlso,
          adminUsername: user?.username || 'Admin'
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || (shouldBan ? 'แบนผู้ใช้สำเร็จ' : 'ปลดแบนสำเร็จ'));
        fetchAdminData();
      } else {
        showToast(data.message || 'ดำเนินการไม่สำเร็จ');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  // Direct Ban of User's IP
  const handleBanUserIpDirect = async (targetUser: any) => {
    const targetIp = (targetUser.lastIp || targetUser.registerIp || '').trim();
    if (!targetIp || targetIp === '127.0.0.1') {
      const manualIp = window.prompt(`ผู้ใช้ "${targetUser.username}" ไม่มีประวัติ IP ภายนอก กรุณาระบุ IP ที่ต้องการแบน:`, targetIp || '');
      if (!manualIp) return;
      handleBanIp(manualIp.trim(), `แบนจากผู้ใช้ ${targetUser.username}`);
      return;
    }

    if (myCurrentIp && (targetIp === myCurrentIp || targetIp === myCurrentIp.trim())) {
      alert(`⚠️ ไม่สามารถแบน IP (${targetIp}) ซึ่งเป็น IP เครื่องที่คุณกำลังใช้งานได้!\n\nระบบป้องกันไม่ให้แอดมินล็อกตัวเองออกจากระบบ`);
      return;
    }

    const confirmBan = window.confirm(
      `ยืนยันการแบน IP: ${targetIp} ของผู้ใช้ "${targetUser.username}" ใช่หรือไม่?\n\nเมื่อแบนแล้ว อุปกรณ์ที่ใช้ IP นี้จะไม่สามารถเข้าใช้งานร้านค้าได้ทันที`
    );
    if (!confirmBan) return;

    const reason = window.prompt(`ระบุเหตุผลการแบน IP ${targetIp}:`, `แบนจากผู้ใช้ ${targetUser.username}`) || `แบนจากผู้ใช้ ${targetUser.username}`;
    handleBanIp(targetIp, reason);
  };

  // Add IP to Blacklist
  const handleBanIp = async (ipToBan: string, reasonToBan: string) => {
    if (!ipToBan || !ipToBan.trim()) {
      showToast('กรุณาระบุหมายเลข IP ที่ถูกต้อง');
      return;
    }
    const cleanIp = ipToBan.trim();
    if (myCurrentIp && (cleanIp === myCurrentIp || cleanIp === myCurrentIp.trim() || cleanIp === '127.0.0.1')) {
      alert(`⚠️ ไม่สามารถแบน IP (${cleanIp}) ซึ่งเป็น IP เครื่องของคุณได้!\n\nระบบบล็อกการกระทำนี้เพื่อป้องกันไม่ให้คุณล็อกตัวเองออกจากระบบ`);
      return;
    }

    setIsBanningIp(true);
    try {
      const res = await fetch('/api/banned-ips', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ip: cleanIp,
          reason: reasonToBan || 'แบนโดยแอดมิน',
          bannedBy: user?.username || 'Admin'
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`บันทึกการแบน IP ${cleanIp} เรียบร้อยแล้ว`);
        setNewBanIpInput('');
        setNewBanReasonInput('');
        fetchBannedIps();
      } else {
        showToast(data.message || 'ไม่สามารถแบน IP ได้');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsBanningIp(false);
    }
  };

  // Unban IP
  const handleUnbanIp = async (id: number, ip: string) => {
    if (!window.confirm(`ยืนยันการปลดแบน IP: ${ip} ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/banned-ips/${id}?adminUsername=${encodeURIComponent(user?.username || 'Admin')}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `ปลดแบน IP ${ip} เรียบร้อยแล้ว`);
        fetchBannedIps();
        fetchAdminData();
        if (!myCurrentIp || myCurrentIp === ip || myCurrentIp.trim() === ip.trim() || ip === '127.0.0.1') {
          setBannedInfo(null);
          try {
            sessionStorage.removeItem('hexsync_banned_info');
            localStorage.removeItem('hexsync_banned_info');
            sessionStorage.removeItem('hexsync_user_banned_info');
            localStorage.removeItem('hexsync_user_banned_info');
          } catch { }
          if (window.location.hash === '#banned') {
            try {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            } catch {
              window.location.hash = '';
            }
          }
        }
      } else {
        showToast(data.message || 'ไม่สามารถปลดแบนได้');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  // Clear Anti-DDoS Auto-Jail for all quarantined IPs
  const handleClearAllJail = async () => {
    setIsClearingJail(true);
    try {
      const res = await fetch('/api/banned-ips/clear-jail', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ adminUsername: user?.username || 'Admin' })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || '⚡ ปลดการกักกัน DDoS ทั้งหมดเรียบร้อยแล้ว');
        fetchJailedIps();
      } else {
        showToast(data.message || 'ไม่สามารถเคลียร์การกักกันได้');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsClearingJail(false);
    }
  };

  // Clear Anti-DDoS Auto-Jail for single IP
  const handleClearSingleJail = async (ip: string) => {
    try {
      const res = await fetch('/api/banned-ips/clear-jail', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ip, adminUsername: user?.username || 'Admin' })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `ปลดการกักกัน DDoS IP ${ip} สำเร็จ`);
        fetchJailedIps();
      } else {
        showToast(data.message || 'ไม่สามารถปลดการกักกันได้');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // Add IP to Whitelist (e.g. School, Home, Office)
  const handleAddWhitelist = async (ipToAdd: string, noteToAdd: string) => {
    if (!ipToAdd || !ipToAdd.trim()) {
      showToast('กรุณาระบุหมายเลข IP ที่ต้องการเพิ่มใน Whitelist');
      return;
    }
    setIsAddingWhitelist(true);
    try {
      const res = await fetch('/api/banned-ips/whitelist/add', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ip: ipToAdd.trim(),
          note: noteToAdd.trim() || 'เครือข่ายที่เชื่อถือได้ (School / Office)',
          addedBy: user?.username || 'Admin'
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `เพิ่ม IP ${ipToAdd} ลงใน Whitelist สำเร็จ`);
        setNewWhitelistIp('');
        setNewWhitelistNote('');
        fetchWhitelistedIps();
        fetchBannedIps();
      } else {
        showToast(data.message || 'ไม่สามารถเพิ่มเข้า Whitelist ได้');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsAddingWhitelist(false);
    }
  };

  // Remove IP from Whitelist
  const handleRemoveWhitelist = async (id: number, ip: string) => {
    if (!window.confirm(`ยืนยันการนำ IP: ${ip} ออกจาก Whitelist ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/banned-ips/whitelist/${id}?adminUsername=${encodeURIComponent(user?.username || 'Admin')}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `ลบ IP ${ip} ออกจาก Whitelist เรียบร้อยแล้ว`);
        fetchWhitelistedIps();
      } else {
        showToast(data.message || 'ไม่สามารถลบได้');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // Open User Device Info Modal (Admin)
  const handleOpenUserDeviceModal = (targetUser: any) => {
    let parsedInfo: DeviceInfoData | null = null;
    if (targetUser.deviceInfo) {
      try {
        parsedInfo = typeof targetUser.deviceInfo === 'string' ? JSON.parse(targetUser.deviceInfo) : targetUser.deviceInfo;
      } catch { }
    }
    setViewingUserDevice({
      user: targetUser,
      info: parsedInfo
    });
  };

  // Ban Device ID (Hardware Ban)
  const handleBanDevice = async (deviceIdToBan: string, modelName: string, reasonToBan?: string) => {
    if (!deviceIdToBan || !deviceIdToBan.trim()) {
      showToast('กรุณาระบุรหัสอุปกรณ์ (Device ID / UDID) ที่ต้องการแบน');
      return;
    }
    const cleanDid = deviceIdToBan.trim();
    const myDid = getPersistentDeviceId();
    if (myDid && cleanDid === myDid) {
      alert(`⚠️ ไม่สามารถแบนเลขเครื่อง (${cleanDid}) ซึ่งเป็นเครื่องที่คุณกำลังใช้งานได้!\n\nระบบบล็อกการกระทำนี้เพื่อป้องกันไม่ให้คุณล็อกตัวเองออกจากระบบ`);
      return;
    }

    const defaultReason = reasonToBan || 'แบนเลขเครื่องโดยแอดมิน (Hardware Ban)';
    setIsBanningDevice(true);
    try {
      const res = await fetch('/api/devices/ban', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          deviceId: cleanDid,
          deviceModel: modelName || 'Unknown Device',
          reason: defaultReason
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`บันทึกการแบนเลขเครื่อง ${cleanDid} เรียบร้อยแล้ว`);
        setNewBanDeviceIdInput('');
        setNewBanDeviceModelInput('');
        setNewBanDeviceReasonInput('');
        fetchBannedDevices();
      } else {
        showToast(data.message || 'ไม่สามารถแบนเลขเครื่องได้');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsBanningDevice(false);
    }
  };

  // Unban Device ID
  const handleUnbanDevice = async (id: number, deviceId: string) => {
    if (!window.confirm(`ยืนยันการปลดแบนอุปกรณ์: ${deviceId} ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/devices/ban/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'ปลดแบนอุปกรณ์เรียบร้อยแล้ว');
        fetchBannedDevices();
      } else {
        showToast(data.message || 'ไม่สามารถปลดแบนอุปกรณ์ได้');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserModal) return;
    try {
      const payload: any = {
        username: editingUserModal.username,
        email: editingUserModal.email,
        role: editingUserModal.role,
        creditBalance: Number(editingUserModal.creditBalance),
        adminUsername: user?.username,
      };
      if (editingUserModal.newPassword && editingUserModal.newPassword.trim()) {
        payload.password = editingUserModal.newPassword.trim();
      }

      const res = await fetch(`/api/users/${editingUserModal.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'บันทึกข้อมูลสมาชิกเรียบร้อยแล้ว');
        setEditingUserModal(null);
        fetchAdminData();
        if (user && user.id === editingUserModal.id) {
          setUser({
            ...user,
            username: editingUserModal.username,
            email: editingUserModal.email,
            role: editingUserModal.role,
            balance: Number(editingUserModal.creditBalance),
          });
        }
      } else {
        showToast(data.message || 'แก้ไขข้อมูลไม่สำเร็จ');
      }
    } catch {
      showToast('ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่');
    }
  };

  const handleSaveProductEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...editingProduct, adminUsername: user?.username })
      });
      if (res.ok) {
        showToast('อัปเดตข้อมูล รูปภาพ และลิงก์ดาวน์โหลดสินค้าสำเร็จ');
        setEditingProduct(null);
        fetchProducts();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'อัปเดตสินค้าไม่สำเร็จ');
      }
    } catch {
      showToast('อัปเดตสินค้าไม่สำเร็จ (กรุณาตรวจสอบเซิร์ฟเวอร์)');
    }
  };

  const handleDeleteProduct = (p: Product) => {
    setProductToDelete(p);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    const target = productToDelete;
    setIsDeletingProduct(true);
    try {
      const res = await fetch(`/api/products/${target.id}?adminUsername=${encodeURIComponent(user?.username || 'Admin')}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(`ลบสินค้า "${target.name}" สำเร็จเรียบร้อย`);
        // Optimistic instant removal from products list
        setProducts((prev) => prev.filter((p) => p.id !== target.id));
        setProductToDelete(null);
        if (editingProduct?.id === target.id) {
          setEditingProduct(null);
        }
        fetchProducts();
      } else {
        showToast(data.message || 'ลบสินค้าไม่สำเร็จ');
      }
    } catch {
      showToast('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์เพื่อลบสินค้าได้');
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // Admin: Approve Pending Dynamic PromptPay QR Order
  const handleApproveQrPayment = async (orderId: string, targetUser: string, amount: number) => {
    if (!orderId) return;
    if (!confirm(`ยืนยันอนุมัติยอดเงิน ฿${amount?.toLocaleString()} บาท ให้แก่ผู้ใช้ "${targetUser}" ใช่หรือไม่? (ยอดเงินจะถูกเติมเข้าสู่กระเป๋าผู้ใช้ทันที)`)) {
      return;
    }
    try {
      const res = await fetch(`/api/topup/qr-order/${encodeURIComponent(orderId)}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || '✅ อนุมัติยอดเงินสำเร็จ');
        fetchAdminTopupHistory(adminTopupUserFilter);
        fetchStats();
      } else {
        showToast(data.message || 'อนุมัติไม่สำเร็จ');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  // Admin: Cancel Pending Dynamic PromptPay QR Order
  const handleCancelQrPayment = async (orderId: string) => {
    if (!orderId) return;
    if (!confirm(`คุณต้องการยกเลิกคำสั่งชำระเงินบิล "${orderId}" ใช่หรือไม่?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/topup/qr-order/${encodeURIComponent(orderId)}/cancel`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'ยกเลิกคำสั่งชำระเงินแล้ว');
        fetchAdminTopupHistory(adminTopupUserFilter);
      } else {
        showToast(data.message || 'ยกเลิกไม่สำเร็จ');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const handleSaveSiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ settings: siteSettings, adminUsername: user?.username })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'บันทึกการตั้งค่าไม่สำเร็จ');
        return;
      }
      await fetch('/api/topup/config', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ phone: angpaoPhone, adminUsername: user?.username })
      });
      // Force instant title & favicon update
      document.title = siteSettings.site_title || siteSettings.brand_name;
      let fav = document.getElementById('app-favicon') as HTMLLinkElement;
      if (fav && siteSettings.logo_url) fav.href = siteSettings.logo_url;

      showToast('บันทึกการตกแต่งสำเร็จ! ชื่อเว็บและโลโก้บนแท็บเบราว์เซอร์เปลี่ยนเรียบร้อย');
    } catch {
      showToast('บันทึกไม่สำเร็จ (กรุณาตรวจสอบเซิร์ฟเวอร์)');
    }
  };

  // Emergency Unban Action (ปลดแบนฉุกเฉินสำหรับแอดมิน ทั้ง IP และเลขเครื่อง)
  const handleEmergencyUnban = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmergencyError('');
    if (!emergencyKeyInput.trim()) {
      setEmergencyError('กรุณากรอก Master Key หรือรหัสผ่านแอดมิน');
      return;
    }
    try {
      const [ipRes, devRes] = await Promise.all([
        fetch('/api/banned-ips/emergency-unban', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ masterKey: emergencyKeyInput.trim() })
        }),
        fetch('/api/devices/emergency-unban', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ masterKey: emergencyKeyInput.trim(), deviceId: getPersistentDeviceId() })
        })
      ]);
      const ipData = await ipRes.json().catch(() => ({}));
      const devData = await devRes.json().catch(() => ({}));
      if (ipRes.ok || devRes.ok) {
        alert('ปลดแบนฉุกเฉินสำเร็จแล้ว! เว็บไซต์จะโหลดใหม่อัตโนมัติ');
        try {
          sessionStorage.removeItem('hexsync_banned_info');
          localStorage.removeItem('hexsync_banned_info');
          sessionStorage.removeItem('hexsync_sec_strikes');
          localStorage.removeItem('hexsync_sec_strikes');
          sessionStorage.removeItem('hexsync_security_violation');
        } catch { }
        setBannedInfo(null);
        setShowEmergencyUnlock(false);
        setEmergencyKeyInput('');
        if (window.location.hash === '#banned') {
          try {
            window.history.replaceState(null, '', window.location.pathname);
          } catch {
            window.location.hash = '';
          }
        }
        window.location.reload();
      } else {
        setEmergencyError(ipData.message || devData.message || 'Master Key ไม่ถูกต้อง');
      }
    } catch {
      setEmergencyError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  // Re-check Ban Status and Return to Store Action
  const handleRecheckBanStatus = async () => {
    try {
      const deviceId = getPersistentDeviceId();
      const activeUsername = user?.username || userBannedInfo?.username || '';
      const usernameParam = activeUsername ? `&username=${encodeURIComponent(activeUsername)}` : '';
      const res = await fetch(`/api/devices/check-ban?deviceId=${encodeURIComponent(deviceId)}${usernameParam}`, {
        headers: { 'x-device-id': deviceId }
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.banned && !data.userBanned) {
          setBannedInfo(null);
          setUserBannedInfo(null);
          try {
            sessionStorage.removeItem('hexsync_banned_info');
            localStorage.removeItem('hexsync_banned_info');
            sessionStorage.removeItem('hexsync_user_banned_info');
            localStorage.removeItem('hexsync_user_banned_info');
            sessionStorage.removeItem('hexsync_sec_strikes');
            localStorage.removeItem('hexsync_sec_strikes');
            sessionStorage.removeItem('hexsync_security_violation');
          } catch { }
          if (window.location.hash === '#banned') {
            try {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            } catch {
              window.location.hash = '';
            }
          }
          setView('store');
          showToast('🎉 ตรวจสอบสำเร็จ: ระบบปลดแบนเรียบร้อยแล้ว ยินดีต้อนรับกลับสู่เว็บไซต์!');
          return;
        } else {
          showToast(data.reason || '⚠️ ระบบยังคงตรวจพบสถานะการระงับการใช้งาน');
          return;
        }
      }
    } catch { }
    if (window.location.hash === '#banned') {
      try {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      } catch {
        window.location.hash = '';
      }
    }
    window.location.reload();
  };

  // CHECK BAN STATUS (IP, DEVICE, OR USER ACCOUNT BAN)
  const isClientBanned = Boolean(bannedInfo || userBannedInfo);

  if (isClientBanned) {
    return (
      <div
        className="app-container"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#090204',
          position: 'relative',
          overflow: 'hidden',
          padding: '1.5rem'
        }}
      >
        {/* Ambient Red Glow */}
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '550px',
            height: '380px',
            background: 'radial-gradient(circle, rgba(255, 26, 64, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0
          }}
        />

        {/* Minimal Top Brand Bar */}
        <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
          <img src={siteSettings.logo_url || '/logo.png'} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
          <span style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem', letterSpacing: '0.5px' }}>{siteSettings.brand_name || 'HexSyncTH'}</span>
          <span style={{ fontSize: '0.72rem', color: '#ff4d6d', background: 'rgba(255,26,64,0.15)', border: '1px solid rgba(255,26,64,0.3)', padding: '2px 8px', borderRadius: '12px', marginLeft: '6px' }}>
            🔒 SECURITY FIREWALL
          </span>
        </div>

        {/* Dedicated Banned Card */}
        <div
          style={{
            width: '100%',
            maxWidth: '560px',
            background: 'linear-gradient(180deg, rgba(28, 8, 14, 0.98) 0%, rgba(16, 4, 8, 0.99) 100%)',
            border: '1px solid rgba(255, 26, 64, 0.55)',
            borderRadius: '24px',
            boxShadow: '0 0 60px rgba(255, 26, 64, 0.28), 0 25px 50px rgba(0, 0, 0, 0.85)',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
            backdropFilter: 'blur(20px)',
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          {/* Glowing Red Lock Emblem */}
          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(255, 26, 64, 0.25), rgba(255, 77, 109, 0.1))',
              border: '2px solid #ff1a40',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 0 35px rgba(255, 26, 64, 0.5)'
            }}
          >
            <IconLock size={40} color="#ff1a40" />
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              letterSpacing: '2.5px',
              color: '#ff4d6d',
              textTransform: 'uppercase',
              marginBottom: '0.35rem'
            }}
          >
            ACCESS DENIED
          </div>
          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '0.5rem',
              lineHeight: 1.3
            }}
          >
            {bannedInfo
              ? (bannedInfo.banType === 'device' ? 'อุปกรณ์เครื่องนี้ถูกระงับการใช้งาน' : 'การเข้าถึงเว็บไซต์ถูกระงับ (IP ถูกแบน)')
              : (userBannedInfo ? `บัญชีผู้ใช้ (@${userBannedInfo.username}) ถูกระงับการใช้งาน` : 'การเข้าถึงเว็บไซต์ถูกระงับ')}
          </h1>

          {/* Target Identifier Tag */}
          <div style={{ marginBottom: '1.75rem' }}>
            {bannedInfo ? (
              bannedInfo.banType === 'device' ? (
                <span
                  style={{
                    background: 'rgba(0, 210, 255, 0.12)',
                    border: '1px solid rgba(0, 210, 255, 0.35)',
                    color: '#00d2ff',
                    padding: '0.35rem 0.95rem',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 700
                  }}
                >
                  📱 เครื่อง: {bannedInfo.deviceModel || 'Unknown'} (UDID: {bannedInfo.deviceId || 'ไม่ระบุ'})
                </span>
              ) : (
                <span
                  style={{
                    background: 'rgba(255, 26, 64, 0.15)',
                    border: '1px solid rgba(255, 26, 64, 0.35)',
                    color: '#ff88a3',
                    padding: '0.35rem 0.95rem',
                    borderRadius: '20px',
                    fontSize: '0.88rem',
                    fontWeight: 700
                  }}
                >
                  🌐 หมายเลข IP: {bannedInfo.ip || myCurrentIp || 'ไม่ระบุ'}
                </span>
              )
            ) : (
              <span
                style={{
                  background: 'rgba(255, 26, 64, 0.15)',
                  border: '1px solid rgba(255, 26, 64, 0.35)',
                  color: '#ff88a3',
                  padding: '0.35rem 0.95rem',
                  borderRadius: '20px',
                  fontSize: '0.88rem',
                  fontWeight: 700
                }}
              >
                👤 บัญชีผู้ใช้: @{userBannedInfo?.username || 'ผู้ใช้งาน'}
              </span>
            )}
          </div>

          {/* The Core Banned Information Box: Showing ONLY who banned and what reason */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.45)',
              border: '1px solid rgba(255, 26, 64, 0.3)',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '1.75rem',
              textAlign: 'left'
            }}
          >
            {/* Banned By */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span
                style={{
                  fontSize: '0.78rem',
                  color: '#ff88a3',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'block',
                  marginBottom: '0.35rem'
                }}
              >
                คุณถูกแบนโดย (Banned By):
              </span>
              <div
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#ff4d6d',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <IconShield size={18} color="#ff1a40" />
                <span>
                  {(bannedInfo ? bannedInfo.bannedBy : userBannedInfo?.bannedBy) || 'ผู้ดูแลระบบ (Admin)'}
                </span>
              </div>
            </div>

            {/* Ban Reason */}
            <div>
              <span
                style={{
                  fontSize: '0.78rem',
                  color: '#ff88a3',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'block',
                  marginBottom: '0.35rem'
                }}
              >
                เหตุผลในการแบน (Reason):
              </span>
              <div
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  background: 'rgba(255, 26, 64, 0.08)',
                  borderLeft: '4px solid #ff1a40',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  lineHeight: '1.5',
                  wordBreak: 'break-word'
                }}
              >
                {(bannedInfo ? bannedInfo.reason : userBannedInfo?.banReason) || 'ละเมิดข้อกำหนดการใช้งานของเว็บไซต์'}
              </div>
            </div>

            {/* Timestamp */}
            {((bannedInfo && bannedInfo.bannedAt) || (userBannedInfo && userBannedInfo.bannedAt)) && (
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.78rem', color: '#888' }}>
                <span>ระงับเมื่อ: </span>
                <span style={{ color: '#b89ca2' }}>
                  {new Date((bannedInfo?.bannedAt || userBannedInfo?.bannedAt)!).toLocaleString('th-TH')}
                </span>
              </div>
            )}
          </div>

          {/* Live Ban Countdown Timer */}
          {banCountdownInfo && (
            <div className="ban-countdown-container">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#ff4d6d', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.5px' }}>
                <IconZap size={20} color="#ff1a40" />
                <span>ระยะเวลาคงเหลือในการถูกระงับสิทธิ์ (COUNTDOWN)</span>
              </div>
              {banCountdownInfo.expired ? (
                <div style={{ padding: '1rem', color: '#10b981', fontWeight: 800, fontSize: '1.2rem' }}>
                  🎉 ครบกำหนดระยะเวลาการแบนแล้ว! กำลังปลดแบน...
                </div>
              ) : (
                <>
                  <div className="countdown-grid">
                    <div className="countdown-digit-box">
                      <span className="countdown-digit-value">{String(banCountdownInfo.years).padStart(2, '0')}</span>
                      <span className="countdown-digit-label">ปี (YRS)</span>
                    </div>
                    <div className="countdown-digit-box">
                      <span className="countdown-digit-value">{String(banCountdownInfo.months).padStart(2, '0')}</span>
                      <span className="countdown-digit-label">เดือน (MOS)</span>
                    </div>
                    <div className="countdown-digit-box">
                      <span className="countdown-digit-value">{String(banCountdownInfo.days).padStart(2, '0')}</span>
                      <span className="countdown-digit-label">วัน (DAYS)</span>
                    </div>
                    <div className="countdown-digit-box">
                      <span className="countdown-digit-value">{String(banCountdownInfo.hours).padStart(2, '0')}</span>
                      <span className="countdown-digit-label">ชั่วโมง (HRS)</span>
                    </div>
                    <div className="countdown-digit-box">
                      <span className="countdown-digit-value">{String(banCountdownInfo.minutes).padStart(2, '0')}</span>
                      <span className="countdown-digit-label">นาที (MINS)</span>
                    </div>
                    <div className="countdown-digit-box">
                      <span className="countdown-digit-value">{String(banCountdownInfo.seconds).padStart(2, '0')}</span>
                      <span className="countdown-digit-label">วินาที (SECS)</span>
                    </div>
                  </div>
                  <div style={{ marginTop: '0.85rem', fontSize: '0.82rem', color: '#b89ca2', lineHeight: '1.4' }}>
                    ⏳ ระบบกำลังนับเวลาถอยหลังแบบเรียลไทม์ (กำหนดโทษ: 10 ปี 9 เดือน 9 วัน 9 ชม 9 นาที 9 วินาที)
                  </div>
                </>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '0.85rem 1.5rem',
                fontSize: '0.95rem',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 700,
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)'
              }}
              onClick={handleRecheckBanStatus}
            >
              🔄 ตรวจสอบสถานะการปลดแบน / กลับสู่หน้าร้านค้า
            </button>

            {userBannedInfo && (
              <button
                type="button"
                className="btn-outline"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '0.75rem 1rem',
                  fontSize: '0.88rem',
                  color: '#ff88a3',
                  borderColor: 'rgba(255, 26, 64, 0.4)'
                }}
                onClick={() => {
                  handleLogout();
                }}
              >
                <IconLogOut size={16} />
                <span>ออกจากระบบ / เข้าสู่ระบบด้วยบัญชีอื่น</span>
              </button>
            )}

            {/* Emergency Admin Unlock Trigger */}
            <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.1)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              {!showEmergencyUnlock ? (
                <button
                  type="button"
                  onClick={() => setShowEmergencyUnlock(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ff4d6d',
                    fontSize: '0.82rem',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    opacity: 0.75
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.75')}
                >
                  ⚙️ ปลดแบนฉุกเฉิน (เฉพาะแอดมินเจ้าของร้าน)
                </button>
              ) : (
                <form
                  onSubmit={handleEmergencyUnban}
                  style={{
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid rgba(255, 77, 109, 0.3)',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginTop: '0.5rem',
                    animation: 'fadeIn 0.2s ease-in'
                  }}
                >
                  <div style={{ fontSize: '0.82rem', color: '#ffb3c1', fontWeight: 600, marginBottom: '0.5rem' }}>
                    🔑 ปลดแบนฉุกเฉินด้วย Master Key / รหัสแอดมิน:
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="password"
                      placeholder="ใส่ Master Key ปลดแบนฉุกเฉินของคุณ"
                      value={emergencyKeyInput}
                      onChange={(e) => setEmergencyKeyInput(e.target.value)}
                      className="text-input"
                      style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem', height: '38px' }}
                    />
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{
                        padding: '0.45rem 1rem',
                        fontSize: '0.85rem',
                        height: '38px',
                        whiteSpace: 'nowrap',
                        background: 'linear-gradient(135deg, #10b981, #059669)'
                      }}
                    >
                      ปลดแบนทันที
                    </button>
                  </div>
                  {emergencyError && (
                    <div style={{ color: '#ff3333', fontSize: '0.78rem', marginTop: '0.4rem', textAlign: 'left' }}>
                      ⚠️ {emergencyError}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmergencyUnlock(false);
                      setEmergencyError('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#888',
                      fontSize: '0.75rem',
                      marginTop: '0.5rem',
                      cursor: 'pointer'
                    }}
                  >
                    ยกเลิก
                  </button>
                </form>
              )}
            </div>
          </div>
          )
        </div>
      </div>
    );
  }

  // CHECK SECURITY VIOLATION BLOCK (F12, Inspect, Source Tamper Protection)
  const isSecurityBlocked = Boolean(
    securityViolation ||
    (typeof window !== 'undefined' && window.location.hash === '#security-blocked')
  );

  if (isSecurityBlocked) {
    return (
      <div
        className="app-container"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#090204',
          position: 'relative',
          overflow: 'hidden',
          padding: '1.5rem'
        }}
      >
        {/* Ambient Red Glow */}
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '420px',
            background: 'radial-gradient(circle, rgba(255, 26, 64, 0.3) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0
          }}
        />

        {/* Minimal Top Brand Bar */}
        <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
          <img
            src={siteSettings.logo_url || '/logo.png'}
            alt=""
            style={{ width: 32, height: 32, objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <span style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem', letterSpacing: '0.5px' }}>
            {siteSettings.brand_name || 'HexSyncTH'}
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              color: '#ff4d6d',
              background: 'rgba(255,26,64,0.15)',
              border: '1px solid rgba(255,26,64,0.3)',
              padding: '2px 8px',
              borderRadius: '12px',
              marginLeft: '6px'
            }}
          >
            🛡️ SECURITY MAX ACTIVE
          </span>
        </div>

        {/* Dedicated Security Blocked Card */}
        <div
          style={{
            width: '100%',
            maxWidth: '560px',
            background: 'linear-gradient(180deg, rgba(28, 8, 14, 0.98) 0%, rgba(16, 4, 8, 0.99) 100%)',
            border: '1px solid rgba(255, 26, 64, 0.65)',
            borderRadius: '24px',
            boxShadow: '0 0 65px rgba(255, 26, 64, 0.32), 0 25px 50px rgba(0, 0, 0, 0.85)',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
            backdropFilter: 'blur(20px)',
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          {/* Glowing Red Shield Emblem */}
          <div
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(255, 26, 64, 0.28), rgba(255, 77, 109, 0.12))',
              border: '2px solid #ff1a40',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 0 40px rgba(255, 26, 64, 0.55)'
            }}
          >
            <IconShield size={44} color="#ff1a40" />
          </div>

          {/* Sub Header / Warning Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 26, 64, 0.16)',
              border: '1px solid rgba(255, 26, 64, 0.45)',
              padding: '0.35rem 1rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 800,
              color: '#ff4d6d',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              marginBottom: '0.85rem'
            }}
          >
            <IconAlertCircle size={15} color="#ff4d6d" />
            <span>SECURITY VIOLATION DETECTED</span>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 900,
              color: '#ffffff',
              marginBottom: '0.35rem',
              lineHeight: 1.3,
              letterSpacing: '-0.5px'
            }}
          >
            คุณถูกบล็อกออกจากระบบ
          </h1>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#ff88a3',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>โดย</span>
            <span
              style={{
                color: '#ff1a40',
                background: 'rgba(255, 26, 64, 0.15)',
                padding: '2px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 26, 64, 0.35)',
                fontWeight: 900,
                letterSpacing: '0.5px'
              }}
            >
              HexSyncTH Security MAX
            </span>
          </div>

          {/* Strict Warning Alert Box */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(255, 26, 64, 0.22) 0%, rgba(180, 10, 30, 0.18) 100%)',
              border: '1.5px solid rgba(255, 26, 64, 0.65)',
              borderRadius: '14px',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(255, 26, 64, 0.2)'
            }}
          >
            <div
              style={{
                color: '#ffffff',
                fontSize: '1rem',
                fontWeight: 800,
                lineHeight: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>⚠️</span>
              <span>กรุณาอย่าพยายามทำอะไรที่ไม่ถูกต้อง คุณอาจถูกแบน IP ถาวรได้</span>
            </div>
            <div
              style={{
                color: '#ffb3c1',
                fontSize: '0.8rem',
                marginTop: '0.4rem',
                lineHeight: 1.4,
                opacity: 0.95
              }}
            >
              ระบบตรวจจับการกดปุ่ม F12, แกะซอร์สโค้ด, Inspect Element, หรือการบันทึกหน้าเว็บโดยไม่ได้รับอนุญาต
            </div>
          </div>

          {/* Violation Details Box */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '1.25rem',
              textAlign: 'left',
              marginBottom: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '0.78rem',
                  color: '#ff88a3',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'block',
                  marginBottom: '0.35rem'
                }}
              >
                พฤติกรรมที่ตรวจพบ (Detected Action):
              </span>
              <div
                style={{
                  fontSize: '0.98rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  background: 'rgba(255, 26, 64, 0.1)',
                  borderLeft: '4px solid #ff1a40',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  lineHeight: '1.4'
                }}
              >
                {securityViolation?.reason || 'พยายามกดปุ่ม F12 เพื่อดูซอร์สโค้ดหรือแกะระบบ'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', paddingTop: '0.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '2px' }}>
                  หมายเลข IP ของคุณ:
                </span>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ff4d6d' }}>
                  {myCurrentIp || 'ตรวจพบแล้ว (Logged)'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '2px' }}>
                  เวลาที่ตรวจพบ:
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#b89ca2' }}>
                  {securityViolation?.timestamp ? new Date(securityViolation.timestamp).toLocaleString('th-TH') : new Date().toLocaleString('th-TH')}
                </span>
              </div>
            </div>
          </div>

          {/* Action Button: Return to site */}
          <button
            type="button"
            className="btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '0.85rem 1.5rem',
              fontSize: '0.98rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, rgba(255, 26, 64, 0.9), rgba(180, 10, 30, 0.95))',
              boxShadow: '0 0 25px rgba(255, 26, 64, 0.45)',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onClick={() => {
              try {
                sessionStorage.removeItem('hexsync_security_violation');
              } catch { }
              setSecurityViolation(null);
              if (window.location.hash === '#security-blocked') {
                try {
                  window.history.replaceState(null, '', window.location.pathname);
                } catch {
                  window.location.hash = '';
                }
              }
              window.location.reload();
            }}
          >
            <span>ฉันเข้าใจแล้ว และจะไม่ทำอีก (กลับสู่หน้าหลัก)</span>
          </button>

          {/* Caution footnote */}
          <div
            style={{
              marginTop: '1rem',
              fontSize: '0.74rem',
              color: '#666',
              lineHeight: 1.4
            }}
          >
            * คำเตือน: ประวัติการกระทำนี้ถูกบันทึกไว้ใน Audit Log หากตรวจพบความพยายามเจาะระบบซ้ำ หมายเลข IP ของคุณจะถูกเพิ่มเข้า Blacklist ถาวรทันที
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Active YouTube Audio Player (Mounted via Official YouTube IFrame API) */}
      {siteSettings.bg_music_enabled === 'true' && isYouTube && ytVideoId && (
        <div
          id="hexsync-yt-container"
          ref={(el) => {
            if (el && !el.querySelector('#hexsync-yt-player') && !el.querySelector('iframe')) {
              const ytDiv = document.createElement('div');
              ytDiv.id = 'hexsync-yt-player';
              el.appendChild(ytDiv);
            }
          }}
          style={{
            position: 'fixed',
            bottom: 0,
            right: 0,
            width: '200px',
            height: '200px',
            opacity: 0.001,
            pointerEvents: 'none',
            zIndex: -9999,
            overflow: 'hidden'
          }}
        />
      )}

      {/* Standard HTML5 Background Audio Element */}
      {siteSettings.bg_music_enabled === 'true' && !isYouTube && siteSettings.bg_music_url && (
        <audio
          ref={audioRef}
          src={siteSettings.bg_music_url}
          loop
          preload="auto"
          onPlay={() => setIsPlayingMusic(true)}
          onPause={() => setIsPlayingMusic(false)}
        />
      )}

      {/* Floating Cyberpunk Background Music Player Widget (สามารถพับเก็บเข้ามุมจอได้) */}
      {siteSettings.bg_music_enabled === 'true' && (
        <div className={`floating-music-widget ${isMusicPlayerFolded ? 'folded' : 'unfolded'} ${showMusicPlayerExpanded ? 'expanded' : ''}`}>
          {isMusicPlayerFolded ? (
            <button
              type="button"
              className="btn-music-folded"
              onClick={() => {
                setIsMusicPlayerFolded(false);
                try { localStorage.setItem('hexsync_music_folded', 'false'); } catch { }
              }}
              title="แตะเพื่อเปิดแผงควบคุมเพลง"
            >
              {isPlayingMusic ? (
                <div className="equalizer-icon" style={{ height: '14px' }}>
                  <span className="bar bar-1"></span>
                  <span className="bar bar-2"></span>
                  <span className="bar bar-3"></span>
                </div>
              ) : (
                <IconMusic size={16} color="#ff1a40" />
              )}
              <span className="folded-label">เพลง</span>
              <span className="folded-arrow">❯</span>
            </button>
          ) : (
            <div className="music-widget-content">
              <button
                className="btn-music-toggle"
                onClick={togglePlayMusic}
                title={isPlayingMusic ? 'หยุดเล่นเพลงชั่วคราว' : 'เปิดเพลงประกอบ'}
              >
                {isPlayingMusic ? (
                  <div className="equalizer-icon">
                    <span className="bar bar-1"></span>
                    <span className="bar bar-2"></span>
                    <span className="bar bar-3"></span>
                  </div>
                ) : (
                  <IconMusic size={18} color="#ff1a40" />
                )}
              </button>

              <div className="music-info-pill" onClick={() => setShowMusicPlayerExpanded(!showMusicPlayerExpanded)}>
                <span className="music-tag" style={isYouTube ? { background: '#ff0000' } : {}}>
                  {isYouTube ? 'YOUTUBE' : 'BGM'}
                </span>
                <span className="music-title-text" title={siteSettings.bg_music_title || (isYouTube ? 'YouTube Music' : 'HexSync Beats')}>
                  {siteSettings.bg_music_title || (isYouTube ? 'YouTube Music' : 'HexSync Beats')}
                </span>
              </div>

              <button
                className="btn-music-control"
                onClick={togglePlayMusic}
                title={isPlayingMusic ? 'พักเพลง' : 'เล่นเพลง'}
              >
                {isPlayingMusic ? <IconPause size={14} color="#fff" /> : <IconPlay size={14} color="#ff1a40" />}
              </button>

              <button
                className="btn-music-control"
                onClick={toggleMuteMusic}
                title={isMusicMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
              >
                {isMusicMuted ? <IconVolumeX size={15} color="#ff4d6d" /> : <IconVolume2 size={15} color="#fff" />}
              </button>

              {/* Fold / Collapse Button */}
              <button
                type="button"
                className="btn-music-fold-action"
                onClick={() => {
                  setIsMusicPlayerFolded(true);
                  try { localStorage.setItem('hexsync_music_folded', 'true'); } catch { }
                }}
                title="พับเก็บเข้ามุมจอเพื่อไม่ให้บังจอ"
              >
                <span>❮</span>
              </button>

              {showMusicPlayerExpanded && (
                <div className="music-volume-slider-box">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMusicMuted ? 0 : musicVolume}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMusicVolume(val);
                      if (isMusicMuted && val > 0) setIsMusicMuted(false);
                    }}
                    className="music-volume-range"
                    title={`ระดับเสียง: ${musicVolume}%`}
                  />
                  <span className="music-volume-label">{isMusicMuted ? '0%' : `${musicVolume}%`}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* FLOATING CREATOR CREDITS BUTTON (มุมล่างขวา) */}
      {view !== 'banned' && (
        <button
          type="button"
          className="floating-creator-btn"
          onClick={() => setShowCreatorModal(true)}
          title="คลิกเพื่อดูเครดิตและข้อมูลผู้พัฒนาเว็บไซต์ (IG: mmnnxx._nx)"
        >
          <span style={{ fontSize: '1rem', animation: 'avatarFloatBounce 2.5s ease-in-out infinite', display: 'inline-block' }}>✨</span>
          <span>เครดิตผู้สร้าง</span>
          <span
            style={{
              background: 'linear-gradient(135deg, rgba(255, 26, 64, 0.25), rgba(255, 77, 109, 0.15))',
              color: '#ff4d6d',
              fontSize: '0.68rem',
              padding: '2px 7px',
              borderRadius: '8px',
              fontWeight: 800,
              border: '1px solid rgba(255, 26, 64, 0.4)',
              letterSpacing: '0.5px'
            }}
          >
            DEV
          </span>
        </button>
      )}

      {/* Center Screen Toast Alert Dialog */}
      {toast && (
        <div className="toast-container" onClick={() => setToast(null)}>
          <div className="toast-item" onClick={(e) => e.stopPropagation()}>
            <div className="toast-icon-wrapper">
              <IconSparkles size={20} color="#ff1a40" />
            </div>
            <span className="toast-text">{toast}</span>
            <button
              className="toast-close-btn"
              onClick={() => setToast(null)}
              title="ปิดการแจ้งเตือน"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Navbar */}
      <header className="navbar">
        <div className="brand-logo" onClick={() => setView('store')}>
          <div className="brand-icon-wrapper" style={{ overflow: 'hidden', padding: 0 }}>
            {siteSettings.logo_url ? (
              <img
                src={siteSettings.logo_url}
                alt="Logo"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <IconKey size={22} color="#ffffff" />
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="brand-name">{siteSettings.brand_name || 'HexSyncTH'}</span>
              <span className="brand-tag">{siteSettings.brand_tag || 'No.1 in TH'}</span>
            </div>
          </div>
        </div>

        {view === 'store' && (
          <div className="nav-search-container">
            <IconSearch size={18} className="search-icon-nav" />
            <input
              type="text"
              className="nav-search-input"
              placeholder="ค้นหาคีย์ ROV, วินโดว์, เกม, ซอฟต์แวร์..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        <div className="nav-actions">
          

          {/* Cart Button */}
          <button className="btn-cart desktop-only-btn" onClick={() => setShowCartModal(true)} title="ตะกร้าสินค้า">
            <IconCart size={20} />
            {cart.length > 0 && (
              <span className="cart-badge-count">{cart.reduce((s, i) => s + i.quantity, 0)}</span>
            )}
          </button>

          {user ? (
            <>
              <button className="btn-balance" onClick={handleOpenTopup}>
                <IconWallet size={16} />
                <span>฿{user.balance.toLocaleString()}</span>
              </button>

                            <button
                className={`btn-outline desktop-only-btn ${view === 'history' ? 'active' : ''}`}
                onClick={() => setView('history')}
              >
                <IconHistory size={16} />
                <span>ประวัติการซื้อ</span>
              </button>

              {/* GAME STATUS & DOWNLOAD HUB - VISIBLE ONLY AFTER LOGIN */}
              <button
                className={`btn-outline desktop-only-btn ${view === 'status' ? 'active' : ''}`}
                onClick={() => setView('status')}
                style={{
                  background: view === 'status' ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.2))' : 'rgba(16, 185, 129, 0.1)',
                  borderColor: view === 'status' ? '#10b981' : 'rgba(16, 185, 129, 0.35)',
                  color: '#10b981',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ShieldCheck size={16} color="#10b981" />
                <span>สถานะเกม & ดาวน์โหลด</span>
              </button>

              {view !== 'store' && (
                <button
                  className="btn-outline desktop-only-btn"
                  onClick={() => setView('store')}
                >
                  <IconGamepad size={16} />
                  <span>หน้าร้านค้า</span>
                </button>
              )}

              {/* ADMIN DASHBOARD BUTTON - VISIBLE FOR ADMIN & SUPERADMIN */}
              {(user.role === 'admin' || user.role === 'superadmin') && (
                <button
                  className={`btn-admin ${view === 'admin' ? 'active' : ''}`}
                  onClick={() => {
                    setView('admin');
                    fetchAdminData();
                  }}
                >
                  <IconSettings size={16} />
                  <span>{user.role === 'superadmin' ? 'ระบบหลังบ้าน 👑' : 'ระบบหลังบ้าน'}</span>
                </button>
              )}

              <button
                className="btn-nav-logout"
                title="ออกจากระบบ"
                onClick={() => {
                  if (window.confirm('คุณต้องการออกจากระบบหรือไม่?')) {
                    handleLogout();
                  }
                }}
              >
                <IconLogOut size={16} />
                <span className="logout-text">ออกจากระบบ</span>
              </button>
            </>
          ) : (
            <button
              className="btn-primary"
              onClick={() => handleOpenAuthModal('login')}
            >
              <IconUser size={16} />
              <span>เข้าสู่ระบบ / สมัคร</span>
            </button>
          )}
        </div>
      </header>

      {/* VIEW: STORE */}
      {view === 'store' && (
        <>
          {/* Hero Banner */}
          <section className="hero-banner">
            <div className="hero-glass-card">
              <div className="hero-glow-blob" />
              <div className="hero-content">
                <div className="hero-badge-hot">
                  <IconZap size={14} />
                  <span>{siteSettings.banner_announcement}</span>
                </div>
                <h1 className="hero-title">
                  {(siteSettings.hero_title || 'HexSyncTH บริการโปรเเกรมช่วยเล่นที่ดีที่สุดในไทย').split(' ').map((word: string, idx: number) =>
                    idx === 1 ? <span key={idx}>{word} </span> : word + ' '
                  )}
                </h1>
                <p className="hero-desc">{siteSettings.hero_subtitle}</p>
                <div className="hero-features">
                  <div className="hero-feat-item">
                    <IconCheckCircle2 size={18} />
                    <span>{siteSettings.hero_feat_1 || 'คีย์แท้ถาวร ส่งคีย์จริงจากสต็อก'}</span>
                  </div>
                  <div className="hero-feat-item">
                    <IconCheckCircle2 size={18} />
                    <span>{siteSettings.hero_feat_2 || 'รับของทันที มีปุ่มดาวน์โหลด'}</span>
                  </div>
                  <div className="hero-feat-item">
                    <IconCheckCircle2 size={18} />
                    <span>{siteSettings.hero_feat_3 || 'เติมเงินซองอั่งเปา TrueMoney อัตโนมัติ'}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* STORE FRONT-END STATS DASHBOARD (Mobile & Desktop) */}
          <section className="store-stats-section">
            <div className="store-stats-grid">
              <div className="stat-card">
                <div className="stat-icon-wrapper stat-icon-sales">
                  <IconCreditCard size={22} color="#ff1a40" />
                </div>
                <div className="stat-info">
                  <span className="stat-label">ยอดขายสะสมทั้งหมด</span>
                  <div className="stat-value text-glow-red">{storeStats.totalSales}</div>
                  <span className="stat-sub">ปลอดภัย รวดเร็ว 100%</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper stat-icon-orders">
                  <IconShoppingBag size={22} color="#ff8800" />
                </div>
                <div className="stat-info">
                  <span className="stat-label">สินค้าที่ส่งมอบแล้ว</span>
                  <div className="stat-value text-glow-orange">{storeStats.itemsSold} <span className="stat-unit">ชิ้น</span></div>
                  <span className="stat-sub">ส่งคีย์ออโต้ใน 3 วิ</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper stat-icon-users">
                  <IconUserCheck size={22} color="#00e676" />
                </div>
                <div className="stat-info">
                  <span className="stat-label">สมาชิก</span>
                  <div className="stat-value text-glow-green">{storeStats.totalUsers} <span className="stat-unit">คน</span></div>
                  <span className="stat-sub">ออนไลน์ดูแล 24 ชม.</span>
                </div>
              </div>
            </div>
          </section>

          {/* Game Category Banners Grid (Shown on Homepage when not searching) */}
          
          {/* Main Storefront: Game Packages Section (fahbtc.online style) */}
          <main id="products-section" className="main-content" style={{ maxWidth: '1280px', margin: '1.5rem auto 3rem', padding: '0 1rem' }}>
            <div className="section-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div className="section-title-group">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.45rem', fontWeight: 800 }}>
                  <IconGamepad size={26} color="#ff1a40" />
                  <span style={{ background: 'linear-gradient(135deg, #fff, #ff8da1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    เลือกเกมที่ต้องการเช่าใช้งาน (Game Packages)
                  </span>
                </h2>
                <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '0.88rem' }}>
                  ระบบจัดส่งคีย์ดิจิทัลอัตโนมัติ 24 ชั่วโมง เลือกแพ็กเกจระยะเวลาได้ตามต้องการ
                </p>
              </div>

              {/* Quick Search */}
              <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
                <IconSearch size={16} color="#ff4d6d" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="text-input"
                  style={{ paddingLeft: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,77,109,0.25)', height: '40px', fontSize: '0.88rem' }}
                  placeholder="ค้นหาชื่อเกม เช่น ROV, PUBG..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Products / Game Packages Grid (fahbtc.online style) */}
            <div className="products-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {filteredGameGroups.map((group) => {
                const isOutOfStock = group.totalStock <= 0;
                return (
                  <div
                    key={group.id}
                    className="game-package-card"
                    onClick={() => {
                      setSelectedGameGroup(group);
                      setSelectedPackageTier(group.packages[0] || null);
                      setPackageQty(1);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Banner Header with Status pill */}
                    <div className="game-card-banner-wrapper">
                      <img
                        src={group.bannerImage || group.image}
                        alt={group.title}
                        className="game-card-banner-img"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600';
                        }}
                      />
                      <div className={`game-card-status-tag ${!isOutOfStock ? 'in-stock' : 'out-of-stock'}`}>
                        <span className="pulse-dot" />
                        <span>{!isOutOfStock ? 'พร้อมส่ง' : 'สินค้าหมด'}</span>
                      </div>
                    </div>

                    <div className="game-card-body">
                      {/* Header row: Game square icon + Subtitle & Title */}
                      <div className="game-card-header">
                        <img
                          src={group.image}
                          alt=""
                          className="game-card-icon"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100';
                          }}
                        />
                        <div className="game-card-title-group">
                          <span className="game-card-tag">GAME KEY · คีย์ดิจิทัล</span>
                          <h3 className="game-card-title">{group.title}</h3>
                        </div>
                      </div>

                      {/* Description text */}
                      <p className="game-card-desc">{group.description}</p>

                      {/* Badges / Guarantees row */}
                      <div className="game-card-badges">
                        <span className="game-badge-pill">
                          <IconCheck size={13} color="#10b981" />
                          <span>ยืนยันก่อนส่ง</span>
                        </span>
                        <span className="game-badge-pill">
                          <IconKey size={13} color="#3b82f6" />
                          <span>คีย์ดิจิทัล</span>
                        </span>
                        <span className="game-badge-pill">
                          <IconShield size={13} color="#f59e0b" />
                          <span>ปลอดภัย 100%</span>
                        </span>
                      </div>

                      {/* Stock line */}
                      <div className="game-card-stock-line">
                        <IconShoppingBag size={14} color="#9ca3af" />
                        <span>
                          พร้อมส่ง <strong className="stock-count">{group.totalStock} คีย์</strong> ({group.packages.length} แพ็กเกจ)
                        </span>
                      </div>

                      {/* Footer row: Starting price & Choose package button */}
                      <div className="game-card-footer">
                        <div className="game-card-price-block">
                          <span className="price-label">เริ่มต้น</span>
                          <span className="price-val">฿{group.startingPrice.toFixed(2)}</span>
                        </div>

                        <button
                          className="btn-select-package"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGameGroup(group);
                            setSelectedPackageTier(group.packages[0] || null);
                            setPackageQty(1);
                          }}
                        >
                          <span>เลือกแพ็กเกจ</span>
                          <IconArrowRight size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredGameGroups.length === 0 && (
              isLoadingProducts ? (
                <div className="products-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', width: '100%' }}>
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="game-package-card skeleton-pulse-card">
                      <div className="skeleton-box" style={{ height: '180px', width: '100%', background: 'rgba(255,255,255,0.04)' }} />
                      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <div className="skeleton-box" style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)' }} />
                          <div style={{ flex: 1 }}>
                            <div className="skeleton-box" style={{ height: '12px', width: '40%', marginBottom: '8px', background: 'rgba(255,255,255,0.05)' }} />
                            <div className="skeleton-box" style={{ height: '20px', width: '70%', background: 'rgba(255,255,255,0.08)' }} />
                          </div>
                        </div>
                        <div className="skeleton-box" style={{ height: '36px', width: '100%', background: 'rgba(255,255,255,0.04)' }} />
                        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px' }}>
                          <div className="skeleton-box" style={{ height: '28px', width: '30%', background: 'rgba(255,255,255,0.06)' }} />
                          <div className="skeleton-box" style={{ height: '40px', width: '40%', borderRadius: '12px', background: 'rgba(255,255,255,0.06)' }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '18px', border: '1px solid var(--border-subtle)', width: '100%', marginTop: '1rem' }}>
                  <IconShoppingBag size={48} color="#ff1a40" style={{ margin: '0 auto 1rem', opacity: 0.7 }} />
                  <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>ยังไม่มีรายการเกมในระบบ</h3>
                  <p style={{ color: '#b89ca2', fontSize: '0.9rem', marginBottom: '1.25rem' }}>กำลังทยอยอัปเดตสต็อกสินค้าใหม่</p>
                  <button className="btn-primary" onClick={() => fetchProducts()} style={{ margin: '0 auto', display: 'inline-flex' }}>
                    <span>🔄 รีเฟรชข้อมูล</span>
                  </button>
                </div>
              )
            )}
          </main>
        </>
      )}

      {/* VIEW: PURCHASE HISTORY */}

      {view === 'history' && (
        <main className="main-content" style={{ maxWidth: '1000px', marginTop: '2rem' }}>
          <div className="section-header">
            <div className="section-title-group">
              <h2>
                <IconHistory size={26} color="#ff1a40" />
                <span>ประวัติการซื้อของคุณ</span>
              </h2>
              <p>คีย์เฉพาะของคุณที่ดึงออกจากสต็อก พร้อมปุ่มดาวน์โหลดไฟล์/โปรแกรม</p>
            </div>
            <button className="btn-outline" onClick={() => setView('store')}>
              ← กลับไปหน้าร้านค้า
            </button>
          </div>

          {purchases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#7a6368' }}>
              <IconShoppingBag size={50} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <h3>ยังไม่มีประวัติการสั่งซื้อ</h3>
              <p style={{ marginTop: '0.5rem' }}>เมื่อคุณสั่งซื้อสินค้า คีย์และปุ่มดาวน์โหลดจะปรากฏที่นี่ทันที</p>
              <button
                className="btn-primary"
                style={{ margin: '1.5rem auto 0 auto' }}
                onClick={() => setView('store')}
              >
                ไปเลือกซื้อสินค้า
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {purchases.map((rec) => (
                <div
                  key={rec.id}
                  style={{
                    background: 'rgba(25, 7, 12, 0.85)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '16px',
                    padding: '1.25rem 1.5rem',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', color: '#fff' }}>{rec.productName}</h3>
                      <span style={{ fontSize: '0.8rem', color: '#7a6368' }}>
                        สั่งซื้อเมื่อ: {new Date(rec.purchaseDate).toLocaleString('th-TH')}
                      </span>
                    </div>
                    <span style={{ color: '#ff4d6d', fontWeight: 800, fontSize: '1.2rem' }}>
                      ฿{rec.price?.toLocaleString()}
                    </span>
                  </div>

                  {/* Real Unique License Key */}
                  <div className="key-box" style={{ margin: '0.5rem 0 1rem 0' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#b89ca2', display: 'block', marginBottom: '2px' }}>รหัสคีย์ของคุณ (Unique License Key):</span>
                      <span className="key-text">{rec.key}</span>
                    </div>
                    <button
                      className="btn-outline"
                      style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}
                      onClick={() => handleCopyKey(rec.key)}
                    >
                      {copiedKey === rec.key ? <IconCheck size={16} color="#10b981" /> : <IconCopy size={16} />}
                      <span>{copiedKey === rec.key ? 'คัดลอกแล้ว' : 'คัดลอกคีย์'}</span>
                    </button>
                  </div>

                  {/* LIVE RENTAL COUNTDOWN TIMER */}
                  <RentalCountdown
                    expiresAt={rec.expiresAt}
                    linkedGameId={rec.linkedGameId}
                    productName={rec.productName}
                    onGoToGame={() => setView('status')}
                  />

                  {/* DIRECT DOWNLOAD BUTTON WITH EXPIRY ACCESS CONTROL */}
                  {(() => {
                    const isRentalExpired = rec.expiresAt ? new Date(rec.expiresAt).getTime() <= Date.now() : false;
                    if (isRentalExpired) {
                      return (
                        <div
                          style={{
                            marginTop: '0.75rem',
                            padding: '0.75rem 1rem',
                            background: 'rgba(255, 26, 64, 0.08)',
                            border: '1px dashed rgba(255, 26, 64, 0.3)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            color: '#ff4d6d',
                            fontSize: '0.85rem',
                            fontWeight: 600
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <IconLock size={16} /> สิทธิ์การดาวน์โหลดหมดอายุแล้ว (เวลาเช่าสิ้นสุด)
                          </span>
                          <button
                            className="btn-primary"
                            style={{ fontSize: '0.78rem', padding: '0.35rem 0.8rem' }}
                            onClick={() => setView('store')}
                          >
                            เช่าต่อเวลา
                          </button>
                        </div>
                      );
                    }

                    if (rec.linkedGameId) {
                      return (
                        <button
                          onClick={() => setView('status')}
                          className="btn-download"
                          style={{
                            marginTop: '0.75rem',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <IconDownload size={18} />
                          <span>ไปดาวน์โหลดเกมนี้ในหน้าระบบเช็คสถานะ & ดาวน์โหลด</span>
                          <IconExternalLink size={15} />
                        </button>
                      );
                    }

                    if (rec.downloadUrl) {
                      return (
                        <a
                          href={rec.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-download"
                          style={{ marginTop: '0.75rem' }}
                        >
                          <IconDownload size={18} />
                          <span>ดาวน์โหลดไฟล์ / โปรแกรม (คลิกเพื่อดาวน์โหลดทันที)</span>
                          <IconExternalLink size={15} />
                        </a>
                      );
                    }
                    return null;
                  })()}
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* VIEW: GAME STATUS & DOWNLOAD HUB (ONLY FOR LOGGED IN USERS) */}
      {view === 'status' && user && (
        <main className="main-content">
          <GameStatusView user={user} onBackToStore={() => setView('store')} />
        </main>
      )}

      {/* VIEW: ADMIN DASHBOARD */}
      {view === 'admin' && (user?.role === 'admin' || user?.role === 'superadmin') && (
        <main className="main-content admin-main-content">
          <div className="section-header">
            <div className="section-title-group">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <IconSettings size={28} color="#ff1a40" />
                <span>แดชบอร์ดหลังบ้าน (Admin Panel)</span>
              </h2>
              <p>ควบคุมระบบจัดการผู้ใช้ ยศ เครดิต สต็อกคีย์แบบรายชิ้น ลิงก์ดาวน์โหลด รูปภาพสินค้า และโลโก้ร้านค้า</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn-outline" onClick={() => setView('store')}>
                ← กลับไปหน้าร้านค้า
              </button>
              <button
                className="btn-nav-logout"
                title="ออกจากระบบ"
                onClick={() => {
                  if (window.confirm('คุณต้องการออกจากระบบหรือไม่?')) {
                    setUser(null);
                    setShowAngpaoModal(false);
                    setView('store');
                    showToast('ออกจากระบบเรียบร้อย');
                  }
                }}
              >
                <IconLogOut size={16} />
                <span className="logout-text">ออกจากระบบ</span>
              </button>
            </div>
          </div>

          {/* Admin Mobile Quick Dropdown Selector for Phones & Tablets */}
          <div className="admin-mobile-tab-selector-wrap">
            <label className="admin-mobile-tab-label">
              <IconSettings size={14} color="#ff1a40" />
              <span>เลือกหมวดหมู่การจัดการหลังบ้าน:</span>
            </label>
            <select
              className="admin-mobile-tab-select"
              value={adminTab}
              onChange={(e) => {
                const tab = e.target.value as any;
                setAdminTab(tab);
                if (tab === 'categories') fetchCategories();
                if (tab === 'bannedIps') { fetchBannedIps(); fetchBannedDevices(); }
                if (tab === 'stats') fetchStats();
                if (tab === 'giftcodes') fetchGiftCodes();
                if (tab === 'coupons') fetchCoupons();
                if (tab === 'slips') fetchAdminSlips();
              }}
            >
              <option value="products">🛍️ จัดการสินค้า & สต็อกคีย์</option>
              <option value="categories">🎮 หมวดหมู่เกม & แบนเนอร์ ({categories.length})</option>
              <option value="users">👥 จัดการสมาชิก & ยศ ({adminUsers.length})</option>
              <option value="bannedIps">🛡️ รายชื่อ IP & อุปกรณ์ที่ถูกแบน ({bannedIpsList.length + bannedDevicesList.length})</option>
              <option value="stats">📊 สถิติยอดขาย & ยอดสั่งซื้อ</option>
              <option value="giftcodes">🎁 ซองของขวัญ / Gift Codes</option>
              <option value="coupons">🎟️ โค้ดส่วนลด / คูปอง</option>
              <option value="theme">🎨 ตกแต่งธีม & โลโก้ร้านค้า</option>
              <option value="slips">🧾 ตรวจสอบสลิปโอนเงิน</option>
              <option value="topups">💰 สรุปประวัติการเติมเงิน</option>
              <option value="logs">📜 บันทึกประวัติการทำงาน (Logs)</option>
              <option value="threatLogs">🚨 รายงานภัยคุกคาม (Security Threats)</option>
              <option value="banManager">⛔ เครื่องมือจัดการแบนด่วน</option>
              {user?.role === 'superadmin' && <option value="superadmin">👑 SuperAdmin Dashboard</option>}
            </select>
          </div>

          {/* Admin Navigation Tabs */}
          <div className="admin-tabs">
            <button
              className={`admin-tab-btn ${adminTab === 'products' ? 'active' : ''}`}
              onClick={() => setAdminTab('products')}
            >
              <IconShoppingBag size={16} />
              <span>จัดการสินค้า & สต็อกคีย์</span>
            </button>
            <button
              className={`admin-tab-btn ${adminTab === 'categories' ? 'active' : ''}`}
              onClick={() => { setAdminTab('categories'); fetchCategories(); }}
            >
              <IconGamepad size={16} />
              <span>หมวดหมู่เกม & แบนเนอร์ ({categories.length})</span>
            </button>
            <button
              className={`admin-tab-btn ${adminTab === 'users' ? 'active' : ''}`}
              onClick={() => setAdminTab('users')}
            >
              <IconUserCheck size={16} />
              <span>จัดการสมาชิก & ยศ</span>
            </button>
            <button
              className={`admin-tab-btn ${adminTab === 'bannedIps' ? 'active' : ''}`}
              onClick={() => { setAdminTab('bannedIps'); fetchBannedIps(); fetchBannedDevices(); }}
              style={bannedIpsList.length + bannedDevicesList.length > 0 ? { borderColor: 'rgba(255, 26, 64, 0.6)' } : {}}
            >
              <IconShield size={16} color="#ff1a40" />
              <span>แบน IP & เครื่อง ({bannedIpsList.length + bannedDevicesList.length})</span>
            </button>
            <button
              className={`admin-tab-btn ${adminTab === 'stats' ? 'active' : ''}`}
              onClick={() => { setAdminTab('stats'); fetchStats(); }}
            >
              <IconBarChart size={16} />
              <span>แดชบอร์ดสถิติ & ยอดขาย</span>
            </button>
            <button
              className={`admin-tab-btn ${adminTab === 'giftcodes' ? 'active' : ''}`}
              onClick={() => { setAdminTab('giftcodes'); fetchGiftCodes(); }}
            >
              <IconGift size={16} />
              <span>โค้ดแจกเครดิตฟรี</span>
            </button>
            <button
              className={`admin-tab-btn ${adminTab === 'coupons' ? 'active' : ''}`}
              onClick={() => { setAdminTab('coupons'); fetchCoupons(); }}
            >
              <IconTag size={16} />
              <span>คูปองส่วนลด</span>
            </button>
            <button
              className={`admin-tab-btn ${adminTab === 'theme' ? 'active' : ''}`}
              onClick={() => setAdminTab('theme')}
            >
              <IconEdit size={16} />
              <span>โลโก้, จุดเด่น & ธนาคาร</span>
            </button>
            <button
              className={`admin-tab-btn ${adminTab === 'slips' ? 'active' : ''}`}
              onClick={() => { setAdminTab('slips'); fetchAdminSlips(); }}
            >
              <IconCheck size={16} />
              <span>สลิปเติมเงิน ({adminSlips.length})</span>
            </button>
            <button
              className={`admin-tab-btn ${adminTab === 'topups' ? 'active' : ''}`}
              onClick={() => {
                setAdminTab('topups');
                fetchAdminTopupHistory();
              }}
              style={{
                borderColor: adminTab === 'topups' ? '#10b981' : 'rgba(16, 185, 129, 0.4)',
                background: adminTab === 'topups' ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.25))' : 'rgba(16, 185, 129, 0.08)',
                color: adminTab === 'topups' ? '#10b981' : '#a7f3d0'
              }}
            >
              <IconCreditCard size={16} color="#10b981" />
              <span>ประวัติการเติมเงิน {adminTopupSummary?.totalRecords ? `(${adminTopupSummary.totalRecords})` : ''}</span>
            </button>
            <button
              className={`admin-tab-btn ${adminTab === 'logs' ? 'active' : ''}`}
              onClick={() => setAdminTab('logs')}
            >
              <IconFileText size={16} />
              <span>ประวัติการทำงาน (Logs)</span>
            </button>
            <button
              className={`admin-tab-btn ${adminTab === 'threatLogs' ? 'active' : ''}`}
              onClick={() => {
                setAdminTab('threatLogs');
                if (user?.role === 'superadmin' || isPasscodeUnlocked) {
                  fetchThreatLogs();
                }
              }}
              style={{
                borderColor: 'rgba(255, 26, 64, 0.7)',
                background: adminTab === 'threatLogs' ? 'rgba(255, 26, 64, 0.25)' : 'rgba(255, 26, 64, 0.08)'
              }}
            >
              <IconAlertCircle size={16} color="#ff4d6d" />
              <span>บันทึกสุ่มเสี่ยง & ถอดรหัส {threatLogsList.length > 0 ? `(${threatLogsList.length})` : ''} 🔒</span>
            </button>
            <button
              className={`admin-tab-btn ${adminTab === 'banManager' ? 'active' : ''}`}
              onClick={() => {
                setAdminTab('banManager');
                if (user?.role === 'superadmin' || isPasscodeUnlocked) {
                  fetchActiveBans();
                }
              }}
              style={{
                borderColor: 'rgba(255, 170, 0, 0.7)',
                background: adminTab === 'banManager' ? 'rgba(255, 170, 0, 0.25)' : 'rgba(255, 170, 0, 0.08)'
              }}
            >
              <IconShield size={16} color="#ffaa00" />
              <span>จัดการระยะเวลาปลดแบน 🔒</span>
            </button>
            {user?.role === 'superadmin' && (
              <button
                className={`admin-tab-btn ${adminTab === 'superadmin' ? 'active' : ''}`}
                onClick={() => {
                  setAdminTab('superadmin');
                  fetchSuperAdminAccounts();
                }}
                style={{
                  borderColor: 'rgba(255, 215, 0, 0.9)',
                  background: adminTab === 'superadmin' ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.35), rgba(217, 119, 6, 0.25))' : 'rgba(255, 215, 0, 0.1)',
                  boxShadow: adminTab === 'superadmin' ? '0 0 15px rgba(255, 215, 0, 0.5)' : 'none'
                }}
              >
                <span style={{ fontSize: '1.05rem' }}>👑</span>
                <span style={{ color: '#ffd700', fontWeight: 800 }}>จัดการ SuperAdmin</span>
              </button>
            )}
            {user?.role === 'admin' && (
              <button
                className={`admin-tab-btn ${adminTab === 'superadmin' ? 'active' : ''}`}
                onClick={() => {
                  setAdminTab('superadmin');
                  if (isSuperAdminUnlocked) {
                    fetchSuperAdminAccounts();
                  }
                }}
                style={{
                  borderColor: 'rgba(239, 68, 68, 0.8)',
                  background: adminTab === 'superadmin' ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(185, 28, 28, 0.2))' : 'rgba(239, 68, 68, 0.08)',
                  boxShadow: adminTab === 'superadmin' ? '0 0 15px rgba(239, 68, 68, 0.4)' : 'none'
                }}
                title="สำหรับกรณี SuperAdmin ลืมรหัสผ่าน (ปลดล็อกด้วยรหัสลับ Master Secret)"
              >
                <span style={{ fontSize: '1.05rem' }}>🔑</span>
                <span style={{ color: '#fca5a5', fontWeight: 700 }}>กู้คืน SuperAdmin (รหัสลับ)</span>
              </button>
            )}
          </div>

          {/* TAB 1: PRODUCTS & KEY STOCK POOL */}
          {adminTab === 'products' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconShoppingBag size={22} color="#10b981" />
                    <span>จัดการสินค้า & สต็อกคีย์แยกตามเกม</span>
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#b89ca2' }}>
                    กดที่เกมเพื่อเลือกเติมสต็อกคีย์ให้แต่ละแพ็กเกจ (1วัน, 3วัน, 7วัน, 30วัน, ถาวร) ได้สะดวกรวดเร็ว
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* View Mode Toggle */}
                  <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                      type="button"
                      className={`tab-btn ${adminProductViewMode === 'game' ? 'active' : ''}`}
                      style={{ padding: '6px 14px', fontSize: '0.82rem', borderRadius: '8px', border: 'none' }}
                      onClick={() => setAdminProductViewMode('game')}
                    >
                      <IconGamepad size={15} />
                      <span>แสดงแบบกลุ่มเกม ({gameGroups.length})</span>
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${adminProductViewMode === 'flat' ? 'active' : ''}`}
                      style={{ padding: '6px 14px', fontSize: '0.82rem', borderRadius: '8px', border: 'none' }}
                      onClick={() => setAdminProductViewMode('flat')}
                    >
                      <IconLayers size={15} />
                      <span>ตารางรายการแยกชิ้น ({products.length})</span>
                    </button>
                  </div>

                  <button className="btn-primary" onClick={() => setShowAddProductModal(true)}>
                    <IconPlusCircle size={16} />
                    <span>เพิ่มรายการสินค้าใหม่</span>
                  </button>
                </div>
              </div>

              {/* GAME BASED VIEW (fahbtc.online style) */}
              {adminProductViewMode === 'game' && (
                <div className="admin-game-grid">
                  {gameGroups.map((group) => {
                    const hasStock = group.totalStock > 0;
                    return (
                      <div key={group.id} className="admin-game-card">
                        <div className="admin-game-card-header">
                          <img
                            src={group.image}
                            alt=""
                            className="admin-game-card-icon"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100';
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                              <span className="category-pill-badge" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                                {group.categoryName}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  color: hasStock ? '#10b981' : '#ef4444',
                                  background: hasStock ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                  padding: '2px 6px',
                                  borderRadius: '4px'
                                }}
                              >
                                {hasStock ? `สต็อก ${group.totalStock} คีย์` : 'สินค้าหมด'}
                              </span>
                            </div>
                            <h4 className="admin-game-card-title">{group.title}</h4>
                            <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '2px' }}>
                              ราคา: <strong style={{ color: '#ff4d6d' }}>฿{group.startingPrice} - ฿{group.maxPrice}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Package Chips */}
                        <div className="admin-game-pkgs-chips">
                          <span style={{ fontSize: '0.75rem', color: '#9ca3af', width: '100%', marginBottom: '2px' }}>
                            แพ็กเกจระยะเวลา ({group.packages.length} แพ็กเกจ):
                          </span>
                          {group.packages.map((pkg) => {
                            const isOut = (pkg.stock || 0) <= 0;
                            const durLabel = extractDurationLabel(pkg.name);
                            return (
                              <span
                                key={pkg.id}
                                className={`admin-game-pkg-chip ${!isOut ? 'in-stock' : 'out'}`}
                                title={`${pkg.name} | ฿${pkg.price}`}
                              >
                                <span>{durLabel}:</span>
                                <strong>{pkg.stock} คีย์</strong>
                              </span>
                            );
                          })}
                        </div>

                        {/* Card Actions */}
                        <div className="admin-game-card-footer">
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem', justifyContent: 'center', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                            onClick={() => {
                              setManagingKeysGameGroup(group);
                              handleOpenKeyManager(group.packages[0]);
                            }}
                          >
                            <IconKey size={15} />
                            <span>📦 เติมสต็อกคีย์ ({group.totalStock})</span>
                          </button>

                          <button
                            type="button"
                            className="btn-outline"
                            style={{ padding: '8px 12px', fontSize: '0.82rem', borderColor: 'rgba(255, 77, 109, 0.4)', color: '#ff4d6d' }}
                            onClick={() => {
                              setEditingGameMeta(group);
                              setGameBannerInput(group.bannerImage);
                              setGameIconInput(group.image);
                              setGameDescInput(group.description);
                            }}
                            title="ตั้งค่ารูปภาพพื้นหลัง/แบนเนอร์ และไอคอนเกมนี้"
                          >
                            <IconEdit size={14} />
                            <span>🖼️ แต่งรูป & แบนเนอร์</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* FLAT TABLE VIEW */}
              {adminProductViewMode === 'flat' && (
                <div className="admin-table-container">
                  <div className="mobile-table-tip">👈 เลื่อนซ้าย-ขวาเพื่อดูตารางทั้งหมด 👉</div>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>รูปสินค้า</th>
                        <th>ชื่อสินค้า</th>
                        <th>หมวดหมู่</th>
                        <th>ราคา</th>
                        <th>สต็อกคีย์คงเหลือ</th>
                        <th>สินค้าแนะนำ (หน้าแรก) ⭐</th>
                        <th>ลิงก์ดาวน์โหลด</th>
                        <th>การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <img
                              src={p.image}
                              alt=""
                              style={{ width: 45, height: 45, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-subtle)' }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100';
                              }}
                            />
                          </td>
                          <td style={{ fontWeight: 700 }}>{p.name}</td>
                          <td>
                            <span className="category-pill-badge">
                              {categories.find((c) => c.slug === p.categoryId)?.name || p.categoryId}
                            </span>
                          </td>
                          <td style={{ color: '#ff4d6d', fontWeight: 700 }}>฿{p.price}</td>
                          <td>
                            <span
                              style={{
                                padding: '0.25rem 0.6rem',
                                borderRadius: '6px',
                                background: p.stock > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(255,26,64,0.15)',
                                color: p.stock > 0 ? '#10b981' : '#ff3333',
                                fontWeight: 700,
                                fontSize: '0.85rem'
                              }}
                            >
                              {p.stock} คีย์
                            </span>
                          </td>
                          <td>
                            <button
                              className={`btn-featured-toggle ${p.isFeatured ? 'active' : ''}`}
                              onClick={() => handleToggleFeatured(p)}
                              title={p.isFeatured ? 'คลิกเพื่อยกเลิกสินค้าแนะนำ' : 'คลิกเพื่อตั้งเป็นสินค้าแนะนำที่หน้าแรก'}
                            >
                              {p.isFeatured ? (
                                <>
                                  <IconSparkles size={13} color="#ffb703" />
                                  <span>⭐ แนะนำ (เปิด)</span>
                                </>
                              ) : (
                                <span>☆ ทั่วไป (กดเปิด)</span>
                              )}
                            </button>
                          </td>
                          <td>
                            <a
                              href={p.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#ff6b8b', textDecoration: 'underline', fontSize: '0.82rem' }}
                            >
                              {p.downloadUrl ? (p.downloadUrl.length > 20 ? p.downloadUrl.substring(0, 20) + '...' : p.downloadUrl) : 'ไม่มีลิงก์'}
                            </a>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <button
                                className="btn-primary"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                                onClick={() => {
                                  setManagingKeysGameGroup(null);
                                  handleOpenKeyManager(p);
                                }}
                              >
                                <IconKey size={14} />
                                <span>เติม/ดูคีย์ ({p.stock})</span>
                              </button>
                              <button
                                className="btn-outline"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                                onClick={() => setEditingProduct(p)}
                              >
                                <IconEdit size={13} />
                                <span>แก้ไขรูป/ลิงก์</span>
                              </button>
                              <button
                                className="btn-outline"
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  fontSize: '0.78rem',
                                  color: '#ff3333',
                                  borderColor: 'rgba(255, 51, 51, 0.35)',
                                  background: 'rgba(255, 51, 51, 0.08)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}
                                onClick={() => handleDeleteProduct(p)}
                                title={`ลบสินค้า ${p.name}`}
                              >
                                <IconTrash size={13} />
                                <span>ลบ</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {adminTab === 'categories' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <IconGamepad size={20} color="#ff1a40" />
                    <span>จัดการหมวดหมู่เกม & แบนเนอร์ (Game Categories)</span>
                  </h3>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#b89ca2' }}>
                    สร้างหมวดหมู่เกม แต่งแบนเนอร์เองได้ ใส่รูป Banner สวยงาม เมื่อลูกค้ากด Banner หน้าร้านจะเข้าสู่หมวดหมู่นั้นทันที
                  </p>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setNewCategoryBanner('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80');
                    setShowAddCategoryModal(true);
                  }}
                >
                  <IconPlusCircle size={16} />
                  <span>เพิ่มหมวดหมู่เกมใหม่</span>
                </button>
              </div>

              <div className="admin-table-container">
              <div className="mobile-table-tip">👈 เลื่อนซ้าย-ขวาเพื่อดูตารางทั้งหมด 👉</div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>รูปแบนเนอร์</th>
                      <th>ชื่อหมวดหมู่</th>
                      <th>รหัส Slug</th>
                      <th>คำอธิบาย</th>
                      <th>สินค้าในหมวด</th>
                      <th>ลำดับ</th>
                      <th>การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => (
                      <tr key={cat.id}>
                        <td>
                          <img
                            src={cat.bannerImage || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200'}
                            alt={cat.name}
                            className="cat-admin-banner-thumb"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200';
                            }}
                          />
                        </td>
                        <td style={{ fontWeight: 700, color: '#fff' }}>{cat.name}</td>
                        <td>
                          <code style={{ background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.45rem', borderRadius: 4, color: '#ff4d6d' }}>
                            {cat.slug}
                          </code>
                        </td>
                        <td style={{ fontSize: '0.83rem', color: '#cbd5e1', maxWidth: 220 }}>
                          {cat.description || '-'}
                        </td>
                        <td>
                          <span style={{ padding: '0.25rem 0.6rem', borderRadius: 6, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}>
                            {cat.productCount || 0} ชิ้น
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{cat.displayOrder || 0}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              className="btn-outline"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                              onClick={() => setEditingCategory(cat)}
                            >
                              <IconEdit size={13} />
                              <span>แก้ไขรูป/ข้อมูล</span>
                            </button>
                            <button
                              className="btn-outline"
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.78rem',
                                color: '#ff3333',
                                borderColor: 'rgba(255, 51, 51, 0.35)',
                                background: 'rgba(255, 51, 51, 0.08)'
                              }}
                              onClick={() => handleDeleteCategory(cat)}
                              title={`ลบหมวดหมู่ ${cat.name}`}
                            >
                              <IconTrash size={13} />
                              <span>ลบ</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: USERS & ROLES */}
          {adminTab === 'users' && (
            <div>
              {/* Search & Stats Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.25rem',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  background: 'rgba(25, 7, 12, 0.7)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '0.85rem 1.25rem'
                }}
              >
                <div style={{ position: 'relative', flex: '1', minWidth: '260px', maxWidth: '480px' }}>
                  <IconSearch
                    size={18}
                    style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#ff4d6d' }}
                  />
                  <input
                    type="text"
                    className="text-input"
                    style={{ paddingLeft: '2.7rem', paddingRight: adminUserSearch ? '2.5rem' : '1rem', margin: 0 }}
                    placeholder="🔍 ค้นหายูสเซอร์ ด้วย ID, ชื่อผู้ใช้ หรือ Gmail..."
                    value={adminUserSearch}
                    onChange={(e) => setAdminUserSearch(e.target.value)}
                  />
                  {adminUserSearch && (
                    <button
                      type="button"
                      onClick={() => setAdminUserSearch('')}
                      style={{
                        position: 'absolute',
                        right: '0.85rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#b89ca2',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        padding: '0 4px'
                      }}
                      title="ล้างคำค้นหา"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div style={{ color: '#b89ca2', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>สมาชิกทั้งหมด:</span>
                  <span style={{ color: '#ff1a40', fontWeight: 800, fontSize: '1.1rem' }}>
                    {
                      adminUsers.filter((u) => {
                        const q = adminUserSearch.toLowerCase().trim();
                        if (!q) return true;
                        return (
                          u.id?.toString().includes(q) ||
                          u.username?.toLowerCase().includes(q) ||
                          u.email?.toLowerCase().includes(q) ||
                          u.role?.toLowerCase().includes(q)
                        );
                      }).length
                    }
                  </span>
                  <span>/ {adminUsers.length} คน</span>
                </div>
              </div>

              <div className="admin-table-container">
              <div className="mobile-table-tip">👈 เลื่อนซ้าย-ขวาเพื่อดูตารางทั้งหมด 👉</div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>ชื่อผู้ใช้ (คลิกดูประวัติซื้อ)</th>
                      <th>Gmail</th>
                      <th>ยศ (Role)</th>
                      <th>IP & พิกัดที่อยู่ (Location)</th>
                      <th>สถานะ</th>
                      <th>ยอดเงิน (Credit)</th>
                      <th style={{ minWidth: '230px', textAlign: 'center' }}>การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers
                      .filter((u) => {
                        const q = adminUserSearch.toLowerCase().trim();
                        if (!q) return true;
                        return (
                          u.id?.toString().includes(q) ||
                          u.username?.toLowerCase().includes(q) ||
                          u.email?.toLowerCase().includes(q) ||
                          u.role?.toLowerCase().includes(q) ||
                          u.lastIp?.toLowerCase().includes(q) ||
                          u.city?.toLowerCase().includes(q) ||
                          u.country?.toLowerCase().includes(q) ||
                          u.registerIp?.toLowerCase().includes(q)
                        );
                      })
                      .map((u) => (
                        <tr key={u.id}>
                          <td>#{u.id}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => handleOpenUserPurchases(u)}
                              title="คลิกเพื่อดูประวัติการซื้อและคีย์ทั้งหมดของยูสเซอร์นี้"
                              style={{
                                background: 'rgba(255, 26, 64, 0.08)',
                                border: '1px solid rgba(255, 26, 64, 0.35)',
                                borderRadius: '8px',
                                padding: '0.4rem 0.75rem',
                                color: '#fff',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s ease',
                                textAlign: 'left'
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.background = 'rgba(255, 26, 64, 0.2)';
                                (e.currentTarget as HTMLElement).style.borderColor = '#ff1a40';
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.background = 'rgba(255, 26, 64, 0.08)';
                                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255, 26, 64, 0.35)';
                              }}
                            >
                              <IconUser size={15} color="#ff4d6d" />
                              <span style={{ color: '#ffffff', textDecoration: 'underline' }}>{u.username}</span>
                              <span style={{ fontSize: '0.72rem', color: '#ff4d6d', background: 'rgba(255,26,64,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                                📜 ดูประวัติซื้อ
                              </span>
                            </button>
                          </td>
                          <td style={{ color: '#d0c0c5' }}>{u.email}</td>
                          <td>
                            <span className={u.role === 'superadmin' ? 'role-badge-superadmin' : (u.role === 'admin' ? 'role-badge-admin' : 'role-badge-member')}>
                              {u.role === 'superadmin' ? '👑 SUPERADMIN' : u.role.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                <span className="ip-badge" title={`IP ล่าสุด: ${u.lastIp || '127.0.0.1'}`}>
                                  {u.lastIp || '127.0.0.1'}
                                </span>
                                {u.lastIp && (
                                  <button
                                    type="button"
                                    className="btn-ip-action"
                                    onClick={() => {
                                      navigator.clipboard.writeText(u.lastIp);
                                      showToast(`คัดลอก IP ${u.lastIp} แล้ว`);
                                    }}
                                    title="คัดลอก IP นี้"
                                  >
                                    <IconCopy size={11} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn-ip-action"
                                  style={{ color: '#ff1a40', background: 'rgba(255,26,64,0.15)', borderColor: 'rgba(255,26,64,0.4)' }}
                                  onClick={() => handleBanUserIpDirect(u)}
                                  title="กดเพื่อแบน IP นี้ทันที"
                                >
                                  🛡️ แบน IP
                                </button>
                              </div>
                              {/* Location Badge */}
                              {(u.city || u.country || u.latitude) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                  <span
                                    onClick={() => setViewingUserMap(u)}
                                    style={{
                                      fontSize: '0.72rem',
                                      color: '#34d399',
                                      background: 'rgba(16, 185, 129, 0.12)',
                                      border: '1px solid rgba(16, 185, 129, 0.35)',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease'
                                    }}
                                    title={`คลิกเพื่อดู Google Map\nพิกัด: ${u.latitude || 13.7563}, ${u.longitude || 100.5018} (${u.city || ''} ${u.country || ''})`}
                                  >
                                    📍 {u.city || 'Bangkok'}{u.country ? `, ${u.country}` : ''}
                                  </span>
                                </div>
                              )}
                              {u.lastDeviceModel && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                  <span
                                    onClick={() => handleOpenUserDeviceModal(u)}
                                    style={{ fontSize: '0.72rem', color: '#00d2ff', background: 'rgba(0, 210, 255, 0.1)', border: '1px solid rgba(0, 210, 255, 0.25)', padding: '2px 6px', borderRadius: '4px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                                    title={`คลิกดูข้อมูลเครื่อง\n${u.lastDeviceModel}`}
                                  >
                                    📱 {u.lastDeviceModel}
                                  </span>
                                </div>
                              )}
                              {u.registerIp && u.registerIp !== u.lastIp && (
                                <span style={{ fontSize: '0.7rem', color: '#888' }}>
                                  สมัครจาก: {u.registerIp}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            {u.isBanned ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <span className="user-banned-badge" title={`เหตุผล: ${u.banReason || 'ระงับโดยแอดมิน'}\nแบนโดย: ${u.bannedBy || 'Admin'}`}>
                                  <IconLock size={12} /> ถูกแบน User
                                </span>
                                {u.bannedBy && (
                                  <span style={{ fontSize: '0.68rem', color: '#ff88a3' }}>
                                    โดย: {u.bannedBy}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="user-active-badge">
                                <IconCheck size={12} /> ปกติ
                              </span>
                            )}
                          </td>
                          <td style={{ color: '#ff4d6d', fontWeight: 700, fontSize: '1rem' }}>฿{u.creditBalance?.toLocaleString()}</td>
                          <td style={{ minWidth: '230px' }}>
                            {u.role === 'superadmin' && user?.role !== 'superadmin' ? (
                              <div style={{ color: '#ffd700', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center', padding: '0.5rem', background: 'rgba(255, 215, 0, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
                                👑 SuperAdmin (สงวนสิทธิ์แก้ไข)
                              </div>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.35rem' }}>
                                {/* VIEW GOOGLE MAP LOCATION BUTTON */}
                                <button
                                  type="button"
                                  className="btn-outline"
                                  style={{
                                    padding: '0.35rem 0.5rem',
                                    fontSize: '0.75rem',
                                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(5, 150, 105, 0.22))',
                                    borderColor: 'rgba(16, 185, 129, 0.5)',
                                    color: '#34d399',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.3rem',
                                    whiteSpace: 'nowrap'
                                  }}
                                  onClick={() => setViewingUserMap(u)}
                                  title="คลิกเพื่อเปิดดูตำแหน่งพิกัดของยูสเซอร์นี้บน Google Maps แบบโต้ตอบได้"
                                >
                                  <span>📍 พิกัด Map</span>
                                </button>

                                {/* VIEW DEVICE INFO BUTTON */}
                                <button
                                  type="button"
                                  className="btn-outline"
                                  style={{
                                    padding: '0.35rem 0.5rem',
                                    fontSize: '0.75rem',
                                    background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.15), rgba(120, 0, 255, 0.15))',
                                    borderColor: 'rgba(0, 210, 255, 0.4)',
                                    color: '#00d2ff',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.3rem',
                                    whiteSpace: 'nowrap'
                                  }}
                                  onClick={() => handleOpenUserDeviceModal(u)}
                                  title="ดูข้อมูลอุปกรณ์มือถือ/คอม และเลขเครื่อง UDID ล่าสุด"
                                >
                                  <span>📱 ดูเครื่อง</span>
                                </button>

                                {/* VIEW USER TOPUP HISTORY */}
                                <button
                                  type="button"
                                  className="btn-outline"
                                  style={{
                                    padding: '0.35rem 0.5rem',
                                    fontSize: '0.75rem',
                                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(0, 210, 255, 0.15))',
                                    borderColor: 'rgba(16, 185, 129, 0.45)',
                                    color: '#10b981',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.3rem',
                                    whiteSpace: 'nowrap'
                                  }}
                                  onClick={() => {
                                    setAdminTopupUserFilter(u.username);
                                    setAdminTab('topups');
                                    fetchAdminTopupHistory(u.username);
                                  }}
                                  title={`คลิกเพื่อดูประวัติการเติมเงินทั้งหมดของ ${u.username}`}
                                >
                                  <IconCreditCard size={13} color="#10b981" />
                                  <span>💳 ดูเติมเงิน</span>
                                </button>

                                {/* FULL EDIT USER (USER, PASS, MAIL, ROLE, BALANCE) */}
                                <button
                                  type="button"
                                  className="btn-outline"
                                  style={{
                                    padding: '0.35rem 0.5rem',
                                    fontSize: '0.75rem',
                                    background: 'linear-gradient(135deg, rgba(255, 26, 64, 0.2), rgba(255, 85, 0, 0.15))',
                                    borderColor: '#ff1a40',
                                    color: '#fff',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.3rem',
                                    whiteSpace: 'nowrap'
                                  }}
                                  onClick={() => setEditingUserModal({ ...u, newPassword: '' })}
                                >
                                  <IconEdit size={13} color="#ff4d6d" />
                                  <span>แก้ไข User</span>
                                </button>

                                <button
                                  type="button"
                                  className="btn-outline"
                                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', color: '#ff6b8b', whiteSpace: 'nowrap', textAlign: 'center', justifyContent: 'center' }}
                                  onClick={() => handleAdjustBalance(u)}
                                >
                                  💰 ปรับเงิน
                                </button>

                                <button
                                  type="button"
                                  className="btn-outline"
                                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', whiteSpace: 'nowrap', textAlign: 'center', justifyContent: 'center' }}
                                  onClick={() => handleToggleUserRole(u)}
                                >
                                  {u.role === 'admin' ? '👤 เป็น User' : '⭐ เป็น Admin'}
                                </button>

                                {/* BAN / UNBAN USER */}
                                {u.isBanned ? (
                                  <button
                                    type="button"
                                    className="btn-outline"
                                    style={{
                                      padding: '0.35rem 0.5rem',
                                      fontSize: '0.75rem',
                                      color: '#10b981',
                                      borderColor: 'rgba(16,185,129,0.4)',
                                      background: 'rgba(16,185,129,0.1)',
                                      whiteSpace: 'nowrap',
                                      justifyContent: 'center'
                                    }}
                                    onClick={() => handleToggleBanUser(u, false)}
                                  >
                                    ✅ ปลดแบน
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn-outline"
                                    style={{
                                      padding: '0.35rem 0.5rem',
                                      fontSize: '0.75rem',
                                      color: '#ff4d6d',
                                      borderColor: 'rgba(255,26,64,0.4)',
                                      background: 'rgba(255,26,64,0.1)',
                                      whiteSpace: 'nowrap',
                                      justifyContent: 'center'
                                    }}
                                    onClick={() => handleToggleBanUser(u, true)}
                                  >
                                    🚫 แบนผู้ใช้
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    {adminUsers.filter((u) => {
                      const q = adminUserSearch.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        u.id?.toString().includes(q) ||
                        u.username?.toLowerCase().includes(q) ||
                        u.email?.toLowerCase().includes(q) ||
                        u.role?.toLowerCase().includes(q) ||
                        u.lastIp?.toLowerCase().includes(q) ||
                        u.registerIp?.toLowerCase().includes(q)
                      );
                    }).length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: '#7a6368' }}>
                            🔍 ไม่พบสมาชิกที่ตรงกับคำค้นหา "{adminUserSearch}"
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: BANNED IPS & BANNED DEVICES FIREWALL */}
          {adminTab === 'bannedIps' && (
            <div style={{ background: 'rgba(25, 7, 12, 0.85)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
                <div>
                  <h3 style={{ color: '#ff4d6d', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <IconShield size={22} color="#ff1a40" />
                    <span>ระบบความปลอดภัย & บัญชีดำ (Security Firewall)</span>
                  </h3>
                  <p style={{ color: '#b89ca2', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                    ควบคุมและตัดสิทธิ์การเข้าถึงร้านค้า ทั้งระดับ IP Address และระดับเลขเครื่องอุปกรณ์ (Hardware UDID)
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {myCurrentIp && (
                    <span className="ip-badge" title="IP ของเครื่องที่คุณกำลังใช้งาน">
                      🌐 IP คุณ: <strong style={{ color: '#10b981' }}>{myCurrentIp}</strong>
                    </span>
                  )}
                  {myDeviceInfo && (
                    <span className="ip-badge" style={{ borderColor: 'rgba(0,210,255,0.4)', color: '#00d2ff' }} title={`รหัสเครื่องคุณ: ${myDeviceInfo.deviceId}`}>
                      📱 เครื่องคุณ: <strong>{myDeviceInfo.model}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Emergency Master Key Configuration Card */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 179, 0, 0.08) 0%, rgba(255, 77, 109, 0.06) 100%)',
                  border: '1px solid rgba(255, 209, 102, 0.35)',
                  borderRadius: '14px',
                  padding: '1.25rem 1.5rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '1.3rem' }}>🔑</span>
                      <h4 style={{ color: '#ffd166', fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                        กุญแจปลดแบนฉุกเฉิน (Emergency Master Key)
                      </h4>
                      <span style={{ fontSize: '0.72rem', background: 'rgba(255, 209, 102, 0.15)', color: '#ffd166', border: '1px solid rgba(255, 209, 102, 0.4)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                        ADMIN RESCUE KEY
                      </span>
                    </div>
                    <p style={{ color: '#e2cad0', fontSize: '0.83rem', margin: 0, lineHeight: 1.5 }}>
                      <strong>Master Key คืออะไร?</strong> คือรหัสลับฉุกเฉินระดับสูงสุดของแอดมิน ใช้สำหรับกรอกในหน้า <em>"ถูกแบน (Access Denied)"</em> เพื่อปลดแบน IP หรือเครื่องของตัวเองได้ทันทีในกรณีที่เผลอกดแบนตัวเอง โดยที่คุณสามารถ<strong>กำหนดเองหรือสุ่มรหัสใหม่</strong>ได้ที่นี่
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleSaveMasterKey}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    background: 'rgba(0, 0, 0, 0.4)',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 209, 102, 0.2)'
                  }}
                >
                  <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                    <input
                      type={showMasterKeyPlain ? 'text' : 'password'}
                      value={masterKeyInput}
                      onChange={(e) => setMasterKeyInput(e.target.value)}
                      placeholder="ตั้งรหัส Master Key ของคุณ (อย่างน้อย 4 ตัวอักษร)"
                      className="text-input"
                      style={{
                        paddingRight: '45px',
                        borderColor: 'rgba(255, 209, 102, 0.4)',
                        color: '#fff',
                        fontFamily: showMasterKeyPlain ? 'monospace' : 'inherit',
                        fontSize: '0.95rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowMasterKeyPlain(!showMasterKeyPlain)}
                      title={showMasterKeyPlain ? 'ซ่อนรหัส' : 'แสดงรหัส'}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#ffd166',
                        cursor: 'pointer',
                        padding: '4px',
                        fontSize: '1rem',
                        lineHeight: 1
                      }}
                    >
                      {showMasterKeyPlain ? '👁️' : '🙈'}
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn-outline"
                    onClick={handleGenerateRandomMasterKey}
                    title="สุ่มรหัสผ่าน Master Key ใหม่ที่มีความปลอดภัยสูง"
                    style={{
                      borderColor: 'rgba(255, 209, 102, 0.5)',
                      color: '#ffd166',
                      fontSize: '0.85rem',
                      padding: '0.55rem 0.95rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    🎲 สุ่มรหัสใหม่
                  </button>

                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => {
                      if (!masterKeyInput) return;
                      navigator.clipboard.writeText(masterKeyInput);
                      showToast('📋 คัดลอก Master Key ลงในคลิปบอร์ดแล้ว');
                    }}
                    title="คัดลอก Master Key"
                    style={{
                      fontSize: '0.85rem',
                      padding: '0.55rem 0.85rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    📋 คัดลอก
                  </button>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isSavingMasterKey}
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      border: 'none',
                      fontSize: '0.85rem',
                      padding: '0.55rem 1.25rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {isSavingMasterKey ? 'กำลังบันทึก...' : '💾 บันทึก Master Key'}
                  </button>
                </form>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.78rem', color: '#10b981' }}>
                  <span>✓ รหัสที่ใช้งานอยู่ในระบบปัจจุบัน:</span>
                  <strong style={{ fontFamily: 'monospace', color: '#ffd166', background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '6px' }}>
                    {showMasterKeyPlain ? adminMasterKey : '••••••••••••'}
                  </strong>
                </div>
              </div>

              {/* Quick Anti-DDoS Unjail & Network Defense Card */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 26, 64, 0.08) 0%, rgba(255, 171, 0, 0.05) 100%)',
                  border: '1px solid rgba(255, 77, 109, 0.25)',
                  borderRadius: '16px',
                  padding: '1.25rem 1.5rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🛡️</span>
                    <strong style={{ color: '#fff', fontSize: '1rem' }}>ระบบ Anti-DDoS & ความปลอดภัยเครือข่าย</strong>
                    {jailedIpsList.length > 0 ? (
                      <span style={{ background: '#ff1a40', color: '#fff', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                        ติดกักกัน {jailedIpsList.length} IP
                      </span>
                    ) : (
                      <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                        สถานะปกติ
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
                    ป้องกันการยิงถล่มคำขอ (Flood) และรองรับเน็ตแชร์ เช่น คอมโรงเรียน/มหาวิทยาลัย หากผู้ใช้โดน DDoS บล็อก สามารถกดปลดล็อกได้ทันที
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={isClearingJail}
                    onClick={handleClearAllJail}
                    style={{
                      background: 'linear-gradient(135deg, #ff1a40, #ff4d6d)',
                      fontSize: '0.85rem',
                      padding: '0.6rem 1.15rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <IconZap size={15} />
                    <span>{isClearingJail ? 'กำลังปลด...' : '⚡ ปลดบล็อก DDoS ทุก IP ทันที'}</span>
                  </button>
                </div>
              </div>

              {/* Sub Tabs Selector: Banned IPs vs Banned Devices vs Whitelist vs DDoS Jail */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.85rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`tab-btn ${blacklistSubTab === 'ips' ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
                  onClick={() => setBlacklistSubTab('ips')}
                >
                  <IconShield size={16} />
                  <span>รายการ IP ที่ถูกแบน ({bannedIpsList.length})</span>
                </button>
                <button
                  type="button"
                  className={`tab-btn ${blacklistSubTab === 'devices' ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
                  onClick={() => { setBlacklistSubTab('devices'); fetchBannedDevices(); }}
                >
                  <IconLaptop size={16} />
                  <span>รายการเลขเครื่องที่ถูกแบน ({bannedDevicesList.length})</span>
                </button>
                <button
                  type="button"
                  className={`tab-btn ${blacklistSubTab === 'whitelist' ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1.25rem', fontSize: '0.9rem', ...(blacklistSubTab === 'whitelist' ? { borderColor: '#10b981', color: '#10b981' } : {}) }}
                  onClick={() => { setBlacklistSubTab('whitelist'); fetchWhitelistedIps(); }}
                >
                  <IconCheckCircle2 size={16} color="#10b981" />
                  <span>⚡ IP ที่อนุญาตพิเศษ / โรงเรียน ({whitelistedIpsList.length})</span>
                </button>
                <button
                  type="button"
                  className={`tab-btn ${blacklistSubTab === 'ddosJail' ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1.25rem', fontSize: '0.9rem', ...(jailedIpsList.length > 0 ? { borderColor: '#ff4d6d', color: '#ff4d6d' } : {}) }}
                  onClick={() => { setBlacklistSubTab('ddosJail'); fetchJailedIps(); }}
                >
                  <IconZap size={16} color={jailedIpsList.length > 0 ? '#ff4d6d' : 'inherit'} />
                  <span>🛡️ การกักกัน DDoS ({jailedIpsList.length})</span>
                </button>
              </div>

              {/* SUB-TAB 1: BANNED IPS */}
              {blacklistSubTab === 'ips' && (
                <div>
                  {/* Form to ban new IP */}
                  <div style={{ background: 'rgba(255, 26, 64, 0.04)', border: '1px solid rgba(255, 26, 64, 0.25)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.75rem' }}>
                    <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <IconPlusCircle size={17} color="#ff1a40" />
                      <span>สั่งแบน IP ใหม่เข้าสู่ระบบ (Manual IP Ban)</span>
                    </h4>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newBanIpInput.trim()) return;
                        handleBanIp(newBanIpInput.trim(), newBanReasonInput.trim() || 'แบนโดยแอดมิน');
                      }}
                      style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr auto', gap: '0.75rem', alignItems: 'flex-end' }}
                    >
                      <div className="input-field-group" style={{ marginBottom: 0 }}>
                        <label className="input-label" style={{ fontSize: '0.78rem' }}>หมายเลข IP (IPv4 หรือ IPv6)</label>
                        <input
                          type="text"
                          required
                          placeholder="เช่น 110.168.10.5 หรือ ::1"
                          className="text-input"
                          value={newBanIpInput}
                          onChange={(e) => setNewBanIpInput(e.target.value)}
                        />
                      </div>

                      <div className="input-field-group" style={{ marginBottom: 0 }}>
                        <label className="input-label" style={{ fontSize: '0.78rem' }}>เหตุผลในการแบน (Reason)</label>
                        <input
                          type="text"
                          placeholder="เช่น สแปม, ยิงบอท, พยายามเจาะระบบ, หลอกลวง"
                          className="text-input"
                          value={newBanReasonInput}
                          onChange={(e) => setNewBanReasonInput(e.target.value)}
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={isBanningIp}
                        style={{ padding: '0.65rem 1.25rem', gap: '0.4rem', height: '42px', flexShrink: 0 }}
                      >
                        <IconLock size={15} />
                        <span>{isBanningIp ? 'กำลังบันทึก...' : '🚫 สั่งแบน IP นี้'}</span>
                      </button>
                    </form>
                  </div>

                  {/* Search & List */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
                      <input
                        type="text"
                        className="text-input"
                        style={{ paddingLeft: '2.25rem', height: '38px', fontSize: '0.85rem' }}
                        placeholder="🔍 ค้นหาในรายการ IP ที่แบน..."
                        value={bannedIpSearch}
                        onChange={(e) => setBannedIpSearch(e.target.value)}
                      />
                      {bannedIpSearch && (
                        <button
                          type="button"
                          onClick={() => setBannedIpSearch('')}
                          style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn-outline"
                      onClick={fetchBannedIps}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                    >
                      🔄 รีเฟรชรายการ IP
                    </button>
                  </div>

                  {/* Table of Banned IPs */}
                  <div className="admin-table-container">
              <div className="mobile-table-tip">👈 เลื่อนซ้าย-ขวาเพื่อดูตารางทั้งหมด 👉</div>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th style={{ width: '60px' }}>ID</th>
                          <th>หมายเลข IP</th>
                          <th>เหตุผลที่แบน</th>
                          <th>แบนโดย</th>
                          <th>วันที่ / เวลาที่แบน</th>
                          <th style={{ textAlign: 'center' }}>การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bannedIpsList
                          .filter((b) => {
                            const q = bannedIpSearch.toLowerCase().trim();
                            if (!q) return true;
                            return (
                              b.ip?.toLowerCase().includes(q) ||
                              b.reason?.toLowerCase().includes(q) ||
                              b.bannedBy?.toLowerCase().includes(q)
                            );
                          })
                          .map((b) => (
                            <tr key={b.id}>
                              <td>#{b.id}</td>
                              <td>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <span className="ip-badge" style={{ color: '#ff4d6d', borderColor: 'rgba(255,26,64,0.4)', background: 'rgba(255,26,64,0.08)' }}>
                                    <IconLock size={12} color="#ff1a40" />
                                    {b.ip}
                                  </span>
                                  <button
                                    type="button"
                                    className="btn-ip-action"
                                    onClick={() => {
                                      navigator.clipboard.writeText(b.ip);
                                      showToast(`คัดลอก IP ${b.ip} แล้ว`);
                                    }}
                                    title="คัดลอก IP"
                                  >
                                    <IconCopy size={11} />
                                  </button>
                                </div>
                              </td>
                              <td style={{ color: '#d8c4c8' }}>{b.reason || 'ละเมิดกฎของเว็บไซต์'}</td>
                              <td>
                                <span style={{ fontSize: '0.78rem', color: '#ff758f', background: 'rgba(255,26,64,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                  {b.bannedBy || 'Admin'}
                                </span>
                              </td>
                              <td style={{ color: '#998387', fontSize: '0.8rem' }}>
                                {new Date(b.bannedAt).toLocaleString('th-TH')}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="btn-outline"
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', color: '#10b981', borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.08)' }}
                                  onClick={() => handleUnbanIp(b.id, b.ip)}
                                >
                                  ✅ ปลดแบน IP
                                </button>
                              </td>
                            </tr>
                          ))}
                        {bannedIpsList.filter((b) => {
                          const q = bannedIpSearch.toLowerCase().trim();
                          if (!q) return true;
                          return (
                            b.ip?.toLowerCase().includes(q) ||
                            b.reason?.toLowerCase().includes(q) ||
                            b.bannedBy?.toLowerCase().includes(q)
                          );
                        }).length === 0 && (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#7a6368' }}>
                                {bannedIpsList.length === 0
                                  ? '🛡️ ขณะนี้ยังไม่มี IP ใดถูกแบนในระบบ ระบบความปลอดภัยทำงานปกติ'
                                  : `🔍 ไม่พบรายการ IP ที่ตรงกับ "${bannedIpSearch}"`}
                              </td>
                            </tr>
                          )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: BANNED DEVICES (HARDWARE BAN) */}
              {blacklistSubTab === 'devices' && (
                <div>
                  {/* Form to ban new Device manually */}
                  <div style={{ background: 'rgba(0, 210, 255, 0.04)', border: '1px solid rgba(0, 210, 255, 0.25)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.75rem' }}>
                    <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <IconPlusCircle size={17} color="#00d2ff" />
                      <span>สั่งแบนเลขเครื่องใหม่ (Manual Device Hardware Ban)</span>
                    </h4>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newBanDeviceIdInput.trim()) return;
                        handleBanDevice(newBanDeviceIdInput.trim(), newBanDeviceModelInput.trim(), newBanDeviceReasonInput.trim());
                      }}
                      style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.5fr auto', gap: '0.75rem', alignItems: 'flex-end' }}
                    >
                      <div className="input-field-group" style={{ marginBottom: 0 }}>
                        <label className="input-label" style={{ fontSize: '0.78rem' }}>รหัสเครื่อง / UDID (เช่น HEX-DID-...)</label>
                        <input
                          type="text"
                          required
                          placeholder="วางรหัส HEX-DID-..."
                          className="text-input"
                          value={newBanDeviceIdInput}
                          onChange={(e) => setNewBanDeviceIdInput(e.target.value)}
                          style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}
                        />
                      </div>

                      <div className="input-field-group" style={{ marginBottom: 0 }}>
                        <label className="input-label" style={{ fontSize: '0.78rem' }}>รุ่นเครื่อง (Model)</label>
                        <input
                          type="text"
                          placeholder="เช่น iPhone 15 Pro, S24"
                          className="text-input"
                          value={newBanDeviceModelInput}
                          onChange={(e) => setNewBanDeviceModelInput(e.target.value)}
                        />
                      </div>

                      <div className="input-field-group" style={{ marginBottom: 0 }}>
                        <label className="input-label" style={{ fontSize: '0.78rem' }}>เหตุผลการแบนเครื่อง</label>
                        <input
                          type="text"
                          placeholder="เช่น ปั๊มโค้ด, พยายามเจาะระบบ"
                          className="text-input"
                          value={newBanDeviceReasonInput}
                          onChange={(e) => setNewBanDeviceReasonInput(e.target.value)}
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={isBanningDevice}
                        style={{ padding: '0.65rem 1.25rem', gap: '0.4rem', height: '42px', flexShrink: 0, background: 'linear-gradient(135deg, #ef4444, #991b1b)' }}
                      >
                        <IconLock size={15} />
                        <span>{isBanningDevice ? 'กำลังบันทึก...' : '🚫 แบนเครื่องนี้'}</span>
                      </button>
                    </form>
                  </div>

                  {/* Search & Refresh */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
                      <input
                        type="text"
                        className="text-input"
                        style={{ paddingLeft: '2.25rem', height: '38px', fontSize: '0.85rem' }}
                        placeholder="🔍 ค้นหาเลขเครื่อง, รุ่นมือถือ หรือเหตุผล..."
                        value={bannedDeviceSearch}
                        onChange={(e) => setBannedDeviceSearch(e.target.value)}
                      />
                      {bannedDeviceSearch && (
                        <button
                          type="button"
                          onClick={() => setBannedDeviceSearch('')}
                          style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn-outline"
                      onClick={fetchBannedDevices}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                    >
                      🔄 รีเฟรชรายการเครื่อง
                    </button>
                  </div>

                  {/* Table of Banned Devices */}
                  <div className="admin-table-container">
              <div className="mobile-table-tip">👈 เลื่อนซ้าย-ขวาเพื่อดูตารางทั้งหมด 👉</div>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th style={{ width: '50px' }}>ID</th>
                          <th>รหัสเครื่อง (UDID)</th>
                          <th>รุ่นอุปกรณ์ (Model)</th>
                          <th>เหตุผลที่แบน</th>
                          <th>แบนโดย</th>
                          <th>วันที่ / เวลา</th>
                          <th style={{ textAlign: 'center' }}>การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bannedDevicesList
                          .filter((d) => {
                            const q = bannedDeviceSearch.toLowerCase().trim();
                            if (!q) return true;
                            return (
                              d.deviceId?.toLowerCase().includes(q) ||
                              d.deviceModel?.toLowerCase().includes(q) ||
                              d.reason?.toLowerCase().includes(q) ||
                              d.bannedBy?.toLowerCase().includes(q)
                            );
                          })
                          .map((d) => (
                            <tr key={d.id}>
                              <td>#{d.id}</td>
                              <td>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ color: '#00e676', fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700 }}>
                                    {d.deviceId}
                                  </span>
                                  <button
                                    type="button"
                                    className="btn-ip-action"
                                    onClick={() => {
                                      navigator.clipboard.writeText(d.deviceId);
                                      showToast(`คัดลอกรหัสเครื่อง ${d.deviceId} แล้ว`);
                                    }}
                                    title="คัดลอกรหัสเครื่อง"
                                  >
                                    <IconCopy size={11} />
                                  </button>
                                </div>
                              </td>
                              <td>
                                <span style={{ color: '#00d2ff', fontWeight: 700, fontSize: '0.85rem' }}>
                                  📱 {d.deviceModel}
                                </span>
                              </td>
                              <td style={{ color: '#d8c4c8' }}>{d.reason || 'แบนเลขเครื่องโดยแอดมิน'}</td>
                              <td>
                                <span style={{ fontSize: '0.78rem', color: '#ff758f', background: 'rgba(255,26,64,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                  {d.bannedBy || 'Admin'}
                                </span>
                              </td>
                              <td style={{ color: '#998387', fontSize: '0.8rem' }}>
                                {new Date(d.bannedAt).toLocaleString('th-TH')}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="btn-outline"
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', color: '#10b981', borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.08)' }}
                                  onClick={() => handleUnbanDevice(d.id, d.deviceId)}
                                >
                                  ✅ ปลดแบนเครื่อง
                                </button>
                              </td>
                            </tr>
                          ))}
                        {bannedDevicesList.filter((d) => {
                          const q = bannedDeviceSearch.toLowerCase().trim();
                          if (!q) return true;
                          return (
                            d.deviceId?.toLowerCase().includes(q) ||
                            d.deviceModel?.toLowerCase().includes(q) ||
                            d.reason?.toLowerCase().includes(q) ||
                            d.bannedBy?.toLowerCase().includes(q)
                          );
                        }).length === 0 && (
                            <tr>
                              <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#7a6368' }}>
                                {bannedDevicesList.length === 0
                                  ? '🛡️ ขณะนี้ยังไม่มีอุปกรณ์ใดถูกแบนในระบบ'
                                  : `🔍 ไม่พบรายการเครื่องที่ตรงกับ "${bannedDeviceSearch}"`}
                              </td>
                            </tr>
                          )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: WHITELISTED IPS */}
              {blacklistSubTab === 'whitelist' && (
                <div>
                  {/* Form to add IP to Whitelist */}
                  <div style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.75rem' }}>
                    <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <IconPlusCircle size={17} color="#10b981" />
                      <span>เพิ่ม IP ที่อนุญาตพิเศษ (IP Whitelist Bypass)</span>
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>
                      IP ที่อยู่ในรายการนี้จะได้รับการยกเว้นจากการตรวจสอบ Anti-DDoS, Flood Shield, Rate Limit และ WAF ทั้งหมด เหมาะสำหรับ IP โรงเรียน มหาวิทยาลัย หรือคอมพิวเตอร์แอดมิน
                    </p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newWhitelistIp.trim()) return;
                        handleAddWhitelist(newWhitelistIp.trim(), newWhitelistNote.trim() || 'เครือข่ายที่เชื่อถือได้ (School/Office)');
                      }}
                      style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr auto', gap: '0.75rem', alignItems: 'flex-end' }}
                    >
                      <div className="input-field-group" style={{ marginBottom: 0 }}>
                        <label className="input-label" style={{ fontSize: '0.78rem' }}>หมายเลข IP (IPv4 หรือ IPv6)</label>
                        <input
                          type="text"
                          required
                          placeholder="เช่น 158.108.113.65 หรือ IP โรงเรียน"
                          className="text-input"
                          value={newWhitelistIp}
                          onChange={(e) => setNewWhitelistIp(e.target.value)}
                        />
                      </div>

                      <div className="input-field-group" style={{ marginBottom: 0 }}>
                        <label className="input-label" style={{ fontSize: '0.78rem' }}>ชื่อสถานที่ / หมายเหตุ (Note)</label>
                        <input
                          type="text"
                          placeholder="เช่น ห้องคอมโรงเรียน, เน็ตบ้านแอดมิน, มหาวิทยาลัย"
                          className="text-input"
                          value={newWhitelistNote}
                          onChange={(e) => setNewWhitelistNote(e.target.value)}
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={isAddingWhitelist}
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', padding: '0.65rem 1.25rem', gap: '0.4rem', height: '42px', flexShrink: 0 }}
                      >
                        <IconCheckCircle2 size={15} />
                        <span>{isAddingWhitelist ? 'กำลังบันทึก...' : '✅ เพิ่มเข้า Whitelist'}</span>
                      </button>
                    </form>
                  </div>

                  {/* Search & Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
                      <input
                        type="text"
                        className="text-input"
                        style={{ paddingLeft: '2.25rem', height: '38px', fontSize: '0.85rem' }}
                        placeholder="🔍 ค้นหาในรายการ Whitelist..."
                        value={whitelistSearch}
                        onChange={(e) => setWhitelistSearch(e.target.value)}
                      />
                      {whitelistSearch && (
                        <button
                          type="button"
                          onClick={() => setWhitelistSearch('')}
                          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                        ทั้งหมด <strong style={{ color: '#10b981' }}>{whitelistedIpsList.length}</strong> รายการ
                      </span>
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                        onClick={fetchWhitelistedIps}
                      >
                        🔄 รีเฟรช
                      </button>
                    </div>
                  </div>

                  {/* Whitelist Table */}
                  <div className="admin-table-container">
              <div className="mobile-table-tip">👈 เลื่อนซ้าย-ขวาเพื่อดูตารางทั้งหมด 👉</div>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th style={{ width: '60px' }}>#</th>
                          <th>หมายเลข IP</th>
                          <th>สถานะ</th>
                          <th>สถานที่ / หมายเหตุ</th>
                          <th>ผู้เพิ่ม</th>
                          <th>วันที่เพิ่ม</th>
                          <th style={{ textAlign: 'center', width: '130px' }}>จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {whitelistedIpsList
                          .filter((w) => {
                            const q = whitelistSearch.toLowerCase().trim();
                            if (!q) return true;
                            return (
                              w.ip?.toLowerCase().includes(q) ||
                              w.note?.toLowerCase().includes(q) ||
                              w.addedBy?.toLowerCase().includes(q)
                            );
                          })
                          .map((w, index) => (
                            <tr key={w.id}>
                              <td style={{ color: '#888', fontSize: '0.8rem' }}>{index + 1}</td>
                              <td>
                                <strong style={{ fontFamily: 'monospace', color: '#10b981', fontSize: '0.95rem' }}>
                                  {w.ip}
                                </strong>
                              </td>
                              <td>
                                <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.35)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>
                                  ✓ ยกเว้น DDoS & บล็อก
                                </span>
                              </td>
                              <td style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>
                                {w.note || 'เครือข่ายที่เชื่อถือได้'}
                              </td>
                              <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                                👤 {w.addedBy || 'Admin'}
                              </td>
                              <td style={{ color: '#888', fontSize: '0.78rem' }}>
                                {w.createdAt ? new Date(w.createdAt).toLocaleString('th-TH') : '-'}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="btn-outline"
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', color: '#ff4d6d', borderColor: 'rgba(255,77,109,0.4)', background: 'rgba(255,77,109,0.08)' }}
                                  onClick={() => handleRemoveWhitelist(w.id, w.ip)}
                                >
                                  🗑️ นำออก
                                </button>
                              </td>
                            </tr>
                          ))}
                        {whitelistedIpsList.filter((w) => {
                          const q = whitelistSearch.toLowerCase().trim();
                          if (!q) return true;
                          return (
                            w.ip?.toLowerCase().includes(q) ||
                            w.note?.toLowerCase().includes(q) ||
                            w.addedBy?.toLowerCase().includes(q)
                          );
                        }).length === 0 && (
                            <tr>
                              <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#7a6368' }}>
                                {whitelistedIpsList.length === 0
                                  ? '🛡️ ยังไม่มี IP ในรายการ Whitelist (ระบบ Anti-DDoS รุ่นใหม่รองรับเน็ตโรงเรียนอัตโนมัติอยู่แล้ว หรือสามารถเพิ่ม IP โรงเรียนไว้ตรงนี้เพื่อยกเว้นถาวร)'
                                  : `🔍 ไม่พบรายการ Whitelist ที่ตรงกับ "${whitelistSearch}"`}
                              </td>
                            </tr>
                          )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-TAB 4: DDOS AUTO-JAIL (IN-MEMORY QUARANTINE) */}
              {blacklistSubTab === 'ddosJail' && (
                <div>
                  <div style={{ background: 'rgba(255, 26, 64, 0.04)', border: '1px solid rgba(255, 77, 109, 0.25)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <IconZap size={17} color="#ff4d6d" />
                        <span>การกักกันชั่วคราวอัตโนมัติ (Anti-DDoS In-Memory Jail)</span>
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                        แสดงรายการหมายเลข IP ที่ถูกระบบกักกันชั่วคราว (Jail) โดยอัตโนมัติเนื่องจากตรวจพบการส่งคำขอถี่ผิดปกติ (เกิน 200 คำขอใน 3 วินาที) เป็นเวลา 2 นาที
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ padding: '0.5rem 0.95rem', fontSize: '0.82rem' }}
                        onClick={fetchJailedIps}
                      >
                        🔄 ตรวจสอบสถานะ
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={isClearingJail || jailedIpsList.length === 0}
                        onClick={handleClearAllJail}
                        style={{ background: 'linear-gradient(135deg, #ff1a40, #ff4d6d)', padding: '0.5rem 1rem', fontSize: '0.82rem', gap: '6px' }}
                      >
                        <IconZap size={14} />
                        <span>{isClearingJail ? 'กำลังปลด...' : '⚡ ปลดการกักกันทั้งหมด'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Jailed Table */}
                  <div className="admin-table-container">
              <div className="mobile-table-tip">👈 เลื่อนซ้าย-ขวาเพื่อดูตารางทั้งหมด 👉</div>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th style={{ width: '60px' }}>#</th>
                          <th>หมายเลข IP</th>
                          <th>สถานะการกักกัน</th>
                          <th>ระยะเวลาที่เหลือ</th>
                          <th>เวลาหมดการกักกัน</th>
                          <th style={{ textAlign: 'center', width: '150px' }}>การดำเนินการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jailedIpsList.map((j, index) => (
                          <tr key={j.ip}>
                            <td style={{ color: '#888', fontSize: '0.8rem' }}>{index + 1}</td>
                            <td>
                              <strong style={{ fontFamily: 'monospace', color: '#ff4d6d', fontSize: '0.95rem' }}>
                                {j.ip}
                              </strong>
                            </td>
                            <td>
                              <span style={{ background: 'rgba(255, 26, 64, 0.15)', color: '#ff4d6d', border: '1px solid rgba(255,26,64,0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>
                                🚨 ติดกักกัน DDoS
                              </span>
                            </td>
                            <td style={{ color: '#ffd166', fontSize: '0.85rem', fontWeight: 600 }}>
                              ⏳ เหลืออีกประมาณ {j.remainingSec} วินาที
                            </td>
                            <td style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                              {j.expiresAt ? new Date(j.expiresAt).toLocaleTimeString('th-TH') : '-'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn-primary"
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', padding: '0.35rem 0.85rem', fontSize: '0.78rem', gap: '4px' }}
                                onClick={() => handleClearSingleJail(j.ip)}
                              >
                                ⚡ ปลดบล็อกทันที
                              </button>
                            </td>
                          </tr>
                        ))}
                        {jailedIpsList.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#10b981' }}>
                              <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>🟢</div>
                              <strong style={{ fontSize: '1rem', color: '#fff', display: 'block', marginBottom: '0.25rem' }}>
                                ไม่มี IP ใดถูกระบบกักกัน DDoS อยู่ในขณะนี้
                              </strong>
                              <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                                ระบบ Anti-DDoS พร้อมรองรับการเข้าใช้งานจากคอมพิวเตอร์โรงเรียนและเครือข่ายทุกประเภทอย่างราบรื่น
                              </span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AUDIT LOGS */}
          {adminTab === 'logs' && (
            <div className="admin-table-container">
              <div className="mobile-table-tip">👈 เลื่อนซ้าย-ขวาเพื่อดูตารางทั้งหมด 👉</div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>เวลา</th>
                    <th>การกระทำ (Action)</th>
                    <th>ผู้กระทำ</th>
                    <th>รายละเอียด (Detail)</th>
                  </tr>
                </thead>
                <tbody>
                  {adminLogs.map((l) => (
                    <tr key={l.id}>
                      <td style={{ fontSize: '0.8rem', color: '#7a6368', whiteSpace: 'nowrap' }}>
                        {new Date(l.createdAt).toLocaleString('th-TH')}
                      </td>
                      <td>
                        <span style={{ color: '#ff4d6d', fontWeight: 700, fontSize: '0.82rem' }}>
                          {l.action}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{l.username}</td>
                      <td>{l.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: DASHBOARD STATS & SALES */}
          {adminTab === 'stats' && (
            <div style={{ maxWidth: '840px' }}>
              <div style={{ marginBottom: '1.5rem', background: 'rgba(25, 7, 12, 0.85)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ color: '#ff4d6d', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <IconBarChart size={20} color="#ff1a40" />
                      <span>ภาพรวมสถิติหน้าร้าน & แดชบอร์ด (Store & Admin Dashboard)</span>
                    </h3>
                    <p style={{ color: '#b89ca2', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      แสดงสถิติยอดขาย จำนวนชิ้นที่ส่งมอบ และจำนวนสมาชิก ทั้งเวอร์ชันคอมและมือถือ
                    </p>
                  </div>
                  <button type="button" className="btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }} onClick={fetchStats}>
                    🔄 รีเฟรชสถิติ
                  </button>
                </div>

                {/* 3 Real vs Display Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
                  <div style={{ background: 'rgba(255, 26, 64, 0.08)', border: '1px solid rgba(255, 26, 64, 0.25)', borderRadius: '12px', padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#ff6b8b', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                      <span>ยอดขายสะสม</span>
                      <IconCreditCard size={18} />
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', margin: '0.5rem 0' }}>
                      {storeStats.totalSales}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#b89ca2' }}>
                      จากฐานข้อมูลจริง: <strong style={{ color: '#10b981' }}>฿{storeStats.real.totalSales.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255, 136, 0, 0.08)', border: '1px solid rgba(255, 136, 0, 0.25)', borderRadius: '12px', padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#ffa94d', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                      <span>สินค้าที่ส่งมอบ</span>
                      <IconShoppingBag size={18} />
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', margin: '0.5rem 0' }}>
                      {storeStats.itemsSold} <span style={{ fontSize: '0.9rem', color: '#ffa94d' }}>ชิ้น</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#b89ca2' }}>
                      จากฐานข้อมูลจริง: <strong style={{ color: '#10b981' }}>{storeStats.real.itemsSold.toLocaleString()} ชิ้น</strong>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0, 230, 118, 0.08)', border: '1px solid rgba(0, 230, 118, 0.25)', borderRadius: '12px', padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#69f0ae', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                      <span>สมาชิกที่ลงทะเบียน</span>
                      <IconUserCheck size={18} />
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', margin: '0.5rem 0' }}>
                      {storeStats.totalUsers} <span style={{ fontSize: '0.9rem', color: '#69f0ae' }}>คน</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#b89ca2' }}>
                      จากฐานข้อมูลจริง: <strong style={{ color: '#10b981' }}>{storeStats.real.totalUsers.toLocaleString()} คน</strong>
                    </div>
                  </div>
                </div>

                {/* Dashboard Override Settings Form */}
                <form onSubmit={handleSaveDashboardStats} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1.25rem' }}>
                  <h4 style={{ color: '#ff4d6d', fontSize: '1rem', marginBottom: '0.75rem' }}>
                    ⚙️ จัดการและปรับแต่งตัวเลขสถิติแดชบอร์ด (Custom Stats)
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#b89ca2', marginBottom: '1.25rem' }}>
                    คุณสามารถเลือกเปิดระบบปรับแต่งตัวเลขสถิติ (Custom Boost) เพื่อกำหนดตัวเลขยอดขายและสมาชิกให้ดูน่าเชื่อถือได้ตามต้องการ
                  </p>

                  <div className="input-field-group">
                    <label className="input-label">โหมดการแสดงสถิติหน้าร้าน (Stats Display Mode)</label>
                    <select
                      className="text-input"
                      value={siteSettings.dashboard_override_enabled}
                      onChange={(e) => setSiteSettings({ ...siteSettings, dashboard_override_enabled: e.target.value })}
                    >
                      <option value="false">✅ แสดงตามฐานข้อมูลจริงอัตโนมัติ (Real Database Stats)</option>
                      <option value="true">🚀 กำหนดตัวเลขสถิติเอง (Custom Boost Numbers)</option>
                    </select>
                  </div>

                  {siteSettings.dashboard_override_enabled === 'true' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                      <div className="input-field-group">
                        <label className="input-label">ยอดขายที่ต้องการโชว์ (฿)</label>
                        <input
                          type="text"
                          className="text-input"
                          placeholder="เช่น 154,200"
                          value={siteSettings.custom_stat_sales}
                          onChange={(e) => setSiteSettings({ ...siteSettings, custom_stat_sales: e.target.value })}
                        />
                      </div>
                      <div className="input-field-group">
                        <label className="input-label">จำนวนชิ้นที่ส่งมอบแล้ว (ชิ้น)</label>
                        <input
                          type="text"
                          className="text-input"
                          placeholder="เช่น 1,280"
                          value={siteSettings.custom_stat_orders}
                          onChange={(e) => setSiteSettings({ ...siteSettings, custom_stat_orders: e.target.value })}
                        />
                      </div>
                      <div className="input-field-group">
                        <label className="input-label">จำนวนสมาชิกทั้งหมด (คน)</label>
                        <input
                          type="text"
                          className="text-input"
                          placeholder="เช่น 450"
                          value={siteSettings.custom_stat_users}
                          onChange={(e) => setSiteSettings({ ...siteSettings, custom_stat_users: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  <button type="submit" className="btn-primary" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}>
                    บันทึกการตั้งค่าสถิติแดชบอร์ด
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB: GIFT CODES (GEN CODE แจกเครดิต) */}
          {adminTab === 'giftcodes' && (
            <div style={{ maxWidth: '840px' }}>
              <div style={{ background: 'rgba(25, 7, 12, 0.85)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ color: '#ff4d6d', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconGift size={20} color="#ff1a40" />
                    <span>ระบบสร้างโค้ดแจกเครดิตฟรี (Gift / Redeem Codes)</span>
                  </h3>
                  <p style={{ color: '#b89ca2', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    สร้างโค้ดสำหรับแจกเครดิตเงินฟรีให้สมาชิกนำไปแลกรับในหน้าเติมเงิน
                  </p>
                </div>

                <form onSubmit={handleCreateGiftCode} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div className="input-field-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="input-label">รหัสโค้ด (Gift Code)</label>
                        <button
                          type="button"
                          className="btn-outline"
                          style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem', marginBottom: '4px' }}
                          onClick={() => {
                            const rand = 'GIFT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                            setNewGiftCode({ ...newGiftCode, code: rand });
                          }}
                        >
                          🎲 สุ่มโค้ด
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        className="text-input"
                        placeholder="เช่น FREE50 หรือ GIFT-XXXX"
                        value={newGiftCode.code}
                        onChange={(e) => setNewGiftCode({ ...newGiftCode, code: e.target.value.toUpperCase() })}
                      />
                    </div>

                    <div className="input-field-group">
                      <label className="input-label">จำนวนเครดิตที่จะได้รับ (฿ บาท)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        className="text-input"
                        placeholder="50"
                        value={newGiftCode.creditAmount}
                        onChange={(e) => setNewGiftCode({ ...newGiftCode, creditAmount: Number(e.target.value) })}
                      />
                    </div>

                    <div className="input-field-group">
                      <label className="input-label">จำนวนครั้งที่ใช้ได้สูงสุด (ครั้ง)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        className="text-input"
                        placeholder="1 (ใช้ได้คนเดียว) หรือมากกว่า"
                        value={newGiftCode.maxUses}
                        onChange={(e) => setNewGiftCode({ ...newGiftCode, maxUses: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.75rem', background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                    <IconPlusCircle size={16} />
                    <span>สร้างโค้ดแจกเครดิตทันที (+ สร้างโค้ด)</span>
                  </button>
                </form>

                {/* Table of active gift codes */}
                <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                  รายการโค้ดแจกเครดิตทั้งหมด ({giftCodesList.length} โค้ด)
                </h4>
                <div className="admin-table-container">
              <div className="mobile-table-tip">👈 เลื่อนซ้าย-ขวาเพื่อดูตารางทั้งหมด 👉</div>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>รหัสโค้ด</th>
                        <th>เครดิต (฿)</th>
                        <th>การใช้งาน</th>
                        <th>สถานะ</th>
                        <th>สร้างเมื่อ</th>
                        <th>จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {giftCodesList.map((g) => {
                        const isExpired = g.usedCount >= g.maxUses;
                        return (
                          <tr key={g.id}>
                            <td>
                              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#ff4d6d', letterSpacing: '0.5px' }}>
                                {g.code}
                              </span>
                            </td>
                            <td>
                              <strong style={{ color: '#10b981' }}>+฿{g.creditAmount}</strong>
                            </td>
                            <td>
                              {g.usedCount} / {g.maxUses} ครั้ง
                            </td>
                            <td>
                              <span style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: isExpired ? 'rgba(255,51,51,0.15)' : 'rgba(16,185,129,0.15)',
                                color: isExpired ? '#ff3333' : '#10b981'
                              }}>
                                {isExpired ? 'ใช้ครบแล้ว' : 'พร้อมใช้งาน'}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.8rem', color: '#7a6368' }}>
                              {new Date(g.createdAt).toLocaleDateString('th-TH')}
                            </td>
                            <td>
                              <button
                                className="btn-outline"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#ff3333' }}
                                onClick={() => handleDeleteGiftCode(g.id)}
                              >
                                ลบ
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {giftCodesList.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#7a6368' }}>
                            ยังไม่มีโค้ดแจกเครดิต กดสร้างโค้ดด้านบนได้เลย
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: COUPONS (คูปองส่วนลด) */}
          {adminTab === 'coupons' && (
            <div style={{ maxWidth: '840px' }}>
              <div style={{ background: 'rgba(25, 7, 12, 0.85)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ color: '#ff4d6d', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconTag size={20} color="#ff1a40" />
                    <span>ระบบคูปองส่วนลดสินค้า (Discount Coupons)</span>
                  </h3>
                  <p style={{ color: '#b89ca2', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    สร้างคูปองส่วนลดแบบระบุยอดเงิน (฿) หรือเปอร์เซ็นต์ (%) สำหรับใช้งานในตะกร้าและชำระเงิน
                  </p>
                </div>

                <form onSubmit={handleCreateCoupon} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div className="input-field-group">
                      <label className="input-label">รหัสคูปอง (Coupon Code)</label>
                      <input
                        type="text"
                        required
                        className="text-input"
                        placeholder="เช่น ROV20 หรือ SAVE10"
                        value={newCoupon.code}
                        onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                      />
                    </div>

                    <div className="input-field-group">
                      <label className="input-label">รูปแบบส่วนลด</label>
                      <select
                        className="text-input"
                        value={newCoupon.discountType}
                        onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value as any })}
                      >
                        <option value="fixed">ลดเป็นบาท (฿)</option>
                        <option value="percent">ลดเป็นเปอร์เซ็นต์ (%)</option>
                      </select>
                    </div>

                    <div className="input-field-group">
                      <label className="input-label">
                        มูลค่าส่วนลด ({newCoupon.discountType === 'fixed' ? '฿ บาท' : '%'})
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        className="text-input"
                        placeholder="20"
                        value={newCoupon.discountValue}
                        onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: Number(e.target.value) })}
                      />
                    </div>

                    <div className="input-field-group">
                      <label className="input-label">ยอดสั่งซื้อขั้นต่ำ (฿)</label>
                      <input
                        type="number"
                        min="0"
                        required
                        className="text-input"
                        placeholder="0 (ไม่มีขั้นต่ำ)"
                        value={newCoupon.minSpend}
                        onChange={(e) => setNewCoupon({ ...newCoupon, minSpend: Number(e.target.value) })}
                      />
                    </div>

                    <div className="input-field-group">
                      <label className="input-label">สิทธิ์การใช้งานสูงสุด</label>
                      <input
                        type="number"
                        min="1"
                        required
                        className="text-input"
                        placeholder="100"
                        value={newCoupon.maxUses}
                        onChange={(e) => setNewCoupon({ ...newCoupon, maxUses: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.75rem' }}>
                    <IconPlusCircle size={16} />
                    <span>สร้างคูปองส่วนลด (+ เพิ่มคูปอง)</span>
                  </button>
                </form>

                {/* Table of active coupons */}
                <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                  รายการคูปองส่วนลดทั้งหมด ({couponsList.length} รายการ)
                </h4>
                <div className="admin-table-container">
              <div className="mobile-table-tip">👈 เลื่อนซ้าย-ขวาเพื่อดูตารางทั้งหมด 👉</div>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>รหัสคูปอง</th>
                        <th>ส่วนลด</th>
                        <th>ยอดซื้อขั้นต่ำ</th>
                        <th>การใช้งาน</th>
                        <th>สถานะ</th>
                        <th>จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {couponsList.map((c) => {
                        const isExpired = c.usedCount >= c.maxUses;
                        return (
                          <tr key={c.id}>
                            <td>
                              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#ff4d6d' }}>
                                {c.code}
                              </span>
                            </td>
                            <td>
                              <strong style={{ color: '#ff8800' }}>
                                {c.discountType === 'fixed' ? `฿${c.discountValue}` : `${c.discountValue}%`}
                              </strong>
                            </td>
                            <td>
                              {c.minSpend > 0 ? `฿${c.minSpend}` : 'ไม่มีขั้นต่ำ'}
                            </td>
                            <td>
                              {c.usedCount} / {c.maxUses} สิทธิ์
                            </td>
                            <td>
                              <span style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: isExpired ? 'rgba(255,51,51,0.15)' : 'rgba(16,185,129,0.15)',
                                color: isExpired ? '#ff3333' : '#10b981'
                              }}>
                                {isExpired ? 'หมดสิทธิ์แล้ว' : 'เปิดใช้งาน'}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn-outline"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#ff3333' }}
                                onClick={() => handleDeleteCoupon(c.id)}
                              >
                                ลบ
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {couponsList.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#7a6368' }}>
                            ยังไม่มีคูปองส่วนลด กดสร้างคูปองใหม่ด้านบนได้เลย
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SITE CUSTOMIZER, LOGO & BROWSER TAB */}
          {adminTab === 'theme' && (
            <div style={{ background: 'rgba(25, 7, 12, 0.85)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '1.5rem', maxWidth: '780px' }}>
              <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                <h3 style={{ color: '#ff4d6d', fontSize: '1.2rem' }}>ปรับแต่งโลโก้ร้าน และชื่อเว็บไซต์ (Browser Tab Title & Favicon)</h3>
                <p style={{ color: '#b89ca2', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  เมื่อแก้ไขโลโก้ รูปโลโก้ร้านและไอคอนบนแท็บเว็บ (Favicon ที่เดิมเป็นรูป Vite) จะเปลี่ยนทันที
                </p>
              </div>

              <form onSubmit={handleSaveSiteSettings}>
                {/* 1. LOGO IMAGE CUSTOMIZATION & PREVIEW */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <label className="input-label" style={{ color: '#ff4d6d', fontWeight: 700, fontSize: '0.95rem' }}>
                    🎨 โลโก้ร้านค้าและไอคอนบนแท็บเว็บ (Logo & Favicon)
                  </label>

                  <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', margin: '0.75rem 0' }}>
                    <div
                      style={{
                        width: 65,
                        height: 65,
                        borderRadius: 14,
                        border: '2px dashed #ff1a40',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        background: '#0c0406',
                        flexShrink: 0
                      }}
                    >
                      {siteSettings.logo_url ? (
                        <img
                          src={siteSettings.logo_url}
                          alt="Logo Preview"
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/favicon.svg';
                          }}
                        />
                      ) : (
                        <IconKey size={28} color="#ff1a40" />
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.82rem', color: '#b89ca2', marginBottom: '0.35rem' }}>
                        ตัวอย่างการแสดงผลบน Navbar และหัวแท็บเบราว์เซอร์
                      </div>
                      <label className="btn-outline" style={{ display: 'inline-flex', cursor: 'pointer', fontSize: '0.8rem', padding: '0.4rem 0.8rem', gap: '0.4rem' }}>
                        <IconUpload size={14} />
                        <span>เลือกรูปภาพจากเครื่องของคุณ</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handleFileUpload(e, (url) => setSiteSettings({ ...siteSettings, logo_url: url }))}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="input-field-group">
                    <label className="input-label">หรือวางลิงก์รูปภาพโลโก้ (Image URL)</label>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="https://... หรือ /favicon.svg"
                      value={siteSettings.logo_url}
                      onChange={(e) => setSiteSettings({ ...siteSettings, logo_url: e.target.value })}
                    />
                  </div>

                  {/* Preset Logos */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#7a6368' }}>โลโก้สำเร็จรูป:</span>
                    {[
                      { label: '🔴 คีย์นีออนแดง', url: '/favicon.svg' },
                      { label: '🎮 จอยเกมแดง', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150' },
                      { label: '⚡ ดิจิทัลไซเบอร์', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=150' },
                      { label: '👑 ไอคอนพรีเมียม', url: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=150' },
                    ].map((pre) => (
                      <button
                        key={pre.label}
                        type="button"
                        className="btn-outline"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => setSiteSettings({ ...siteSettings, logo_url: pre.url })}
                      >
                        {pre.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. BROWSER TAB TITLE */}
                <div className="input-field-group">
                  <label className="input-label" style={{ color: '#ff4d6d', fontWeight: 700 }}>
                    ชื่อเว็บไซต์บนแท็บเบราว์เซอร์ (Browser Tab Title / document.title)
                  </label>
                  <input
                    type="text"
                    required
                    className="text-input"
                    placeholder="เช่น KeyShop — ร้านขายคีย์เกม ซอฟต์แวร์"
                    value={siteSettings.site_title}
                    onChange={(e) => setSiteSettings({ ...siteSettings, site_title: e.target.value })}
                  />
                  <small style={{ color: '#7a6368', display: 'block', marginTop: '4px' }}>
                    *ชื่อนี้จะแสดงผลบนหัวแท็บของเบราว์เซอร์ด้านบนสุดแบบเรียลไทม์
                  </small>
                </div>

                <div className="input-field-group">
                  <label className="input-label">ชื่อแบรนด์ร้านค้า (Brand Logo Name)</label>
                  <input
                    type="text"
                    className="text-input"
                    value={siteSettings.brand_name}
                    onChange={(e) => setSiteSettings({ ...siteSettings, brand_name: e.target.value })}
                  />
                </div>

                <div className="input-field-group">
                  <label className="input-label">แท็กต่อท้ายแบรนด์ (Brand Tag)</label>
                  <input
                    type="text"
                    className="text-input"
                    value={siteSettings.brand_tag}
                    onChange={(e) => setSiteSettings({ ...siteSettings, brand_tag: e.target.value })}
                  />
                </div>

                <div className="input-field-group">
                  <label className="input-label">หัวข้อใหญ่แบนเนอร์ (Hero Headline)</label>
                  <input
                    type="text"
                    className="text-input"
                    value={siteSettings.hero_title}
                    onChange={(e) => setSiteSettings({ ...siteSettings, hero_title: e.target.value })}
                  />
                </div>

                <div className="input-field-group">
                  <label className="input-label">คำบรรยายแบนเนอร์ (Hero Subtitle)</label>
                  <textarea
                    rows={2}
                    className="text-input"
                    value={siteSettings.hero_subtitle}
                    onChange={(e) => setSiteSettings({ ...siteSettings, hero_subtitle: e.target.value })}
                  />
                </div>

                <div className="input-field-group">
                  <label className="input-label">ข้อความแถบประกาศด้านบน (Banner Announcement)</label>
                  <input
                    type="text"
                    className="text-input"
                    value={siteSettings.banner_announcement}
                    onChange={(e) => setSiteSettings({ ...siteSettings, banner_announcement: e.target.value })}
                  />
                </div>

                <div className="input-field-group">
                  <label className="input-label">เบอร์โทรศัพท์สำหรับรับเงินซองอั่งเปา (TrueMoney Receiver Phone)</label>
                  <input
                    type="text"
                    className="text-input"
                    value={angpaoPhone}
                    onChange={(e) => setAngpaoPhone(e.target.value)}
                  />
                </div>

                {/* 3. HERO FEATURES (3 BULLET POINTS FROM USER PHOTO) */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', marginTop: '1rem' }}>
                  <label className="input-label" style={{ color: '#ff4d6d', fontWeight: 700, fontSize: '0.95rem' }}>
                    🎯 ข้อความจุดเด่น 3 ข้อบนแบนเนอร์ (Hero Bullet Points)
                  </label>
                  <p style={{ color: '#b89ca2', fontSize: '0.8rem', marginBottom: '1rem' }}>
                    แก้ไขข้อความ 3 หัวข้อจุดเด่นใต้แบนเนอร์หลักของหน้าร้าน
                  </p>

                  <div className="input-field-group">
                    <label className="input-label">จุดเด่นข้อที่ 1 (Bullet 1)</label>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="คีย์แท้ถาวร ส่งคีย์จริงจากสต็อก"
                      value={siteSettings.hero_feat_1}
                      onChange={(e) => setSiteSettings({ ...siteSettings, hero_feat_1: e.target.value })}
                    />
                  </div>

                  <div className="input-field-group">
                    <label className="input-label">จุดเด่นข้อที่ 2 (Bullet 2)</label>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="รับของทันที มีปุ่มดาวน์โหลด"
                      value={siteSettings.hero_feat_2}
                      onChange={(e) => setSiteSettings({ ...siteSettings, hero_feat_2: e.target.value })}
                    />
                  </div>

                  <div className="input-field-group">
                    <label className="input-label">จุดเด่นข้อที่ 3 (Bullet 3)</label>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="เติมเงินซองอั่งเปา TrueMoney อัตโนมัติ"
                      value={siteSettings.hero_feat_3}
                      onChange={(e) => setSiteSettings({ ...siteSettings, hero_feat_3: e.target.value })}
                    />
                  </div>
                </div>

                {/* 4. BANK TRANSFER & SLIP CONFIGURATION */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <label className="input-label" style={{ color: '#ff4d6d', fontWeight: 700, fontSize: '0.95rem' }}>
                    🏦 ข้อมูลบัญชีธนาคารสำหรับรับเงินโอน (Bank Transfer & PromptPay)
                  </label>
                  <p style={{ color: '#b89ca2', fontSize: '0.8rem', marginBottom: '1rem' }}>
                    ข้อมูลนี้จะแสดงในหน้าต่างเติมเงิน เพื่อให้ลูกค้าโอนเงินและแนบสลิป
                  </p>

                  <div className="responsive-grid-2col">
                    <div className="input-field-group">
                      <label className="input-label">ชื่อธนาคาร</label>
                      <input
                        type="text"
                        className="text-input"
                        placeholder="เช่น ธนาคารกสิกรไทย (KBank)"
                        value={siteSettings.bank_name}
                        onChange={(e) => setSiteSettings({ ...siteSettings, bank_name: e.target.value })}
                      />
                    </div>
                    <div className="input-field-group">
                      <label className="input-label">ชื่อบัญชีรับเงิน</label>
                      <input
                        type="text"
                        className="text-input"
                        placeholder="เช่น นาย สมชาย ใจดี"
                        value={siteSettings.bank_account_name}
                        onChange={(e) => setSiteSettings({ ...siteSettings, bank_account_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="responsive-grid-2col">
                    <div className="input-field-group">
                      <label className="input-label">เลขที่บัญชีธนาคาร</label>
                      <input
                        type="text"
                        className="text-input"
                        placeholder="เช่น 123-4-56789-0"
                        value={siteSettings.bank_account_number}
                        onChange={(e) => setSiteSettings({ ...siteSettings, bank_account_number: e.target.value })}
                      />
                    </div>
                    <div className="input-field-group">
                      <label className="input-label">เบอร์พร้อมเพย์ (PromptPay)</label>
                      <input
                        type="text"
                        className="text-input"
                        placeholder="เช่น 0812345678"
                        value={siteSettings.promptpay_number}
                        onChange={(e) => setSiteSettings({ ...siteSettings, promptpay_number: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* 5. SLIPOK BANK VERIFICATION CONFIGURATION */}
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <label className="input-label" style={{ color: '#10b981', fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>
                      🛡️ ตรวจสอบยอดเงินจริงจากธนาคาร 100% (SlipOK API Integration)
                    </label>
                    <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', background: siteSettings.slipok_api_key && siteSettings.slipok_branch_id ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)', color: siteSettings.slipok_api_key && siteSettings.slipok_branch_id ? '#10b981' : '#888', fontWeight: 600 }}>
                      {siteSettings.slipok_api_key && siteSettings.slipok_branch_id ? '🟢 เปิดใช้งานตรวจยอดจริง' : '⚪ ปิดใช้งาน (รอใส่ API Key)'}
                    </span>
                  </div>
                  <p style={{ color: '#b89ca2', fontSize: '0.8rem', marginBottom: '0.85rem' }}>
                    ป้องกันการโกง: ลูกค้าเลือก 100 บาท แต่กดคัดลอกเลขไปโอนจริง 1 บาท ระบบจะดึงยอดจริงจากธนาคารมาเติมเท่านั้น (สมัครรับฟรี/แพ็กเกจได้ที่ <a href="https://slipok.com" target="_blank" rel="noreferrer" style={{ color: '#10b981', textDecoration: 'underline' }}>slipok.com</a>)
                  </p>

                  <div className="responsive-grid-2col">
                    <div className="input-field-group">
                      <label className="input-label">SlipOK Branch ID</label>
                      <input
                        type="text"
                        className="text-input"
                        placeholder="เช่น 12345 หรือ Branch ID ใน SlipOK"
                        value={siteSettings.slipok_branch_id || ''}
                        onChange={(e) => setSiteSettings({ ...siteSettings, slipok_branch_id: e.target.value })}
                      />
                    </div>
                    <div className="input-field-group">
                      <label className="input-label">SlipOK API Key</label>
                      <input
                        type="password"
                        className="text-input"
                        placeholder="เช่น slpk_live_..."
                        value={siteSettings.slipok_api_key || ''}
                        onChange={(e) => setSiteSettings({ ...siteSettings, slipok_api_key: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#7a6368', marginTop: '6px' }}>
                    *ระบบจะตรวจสอบรหัสอ้างอิงสลิป (transRef) และค่าแฮชรูปภาพอัตโนมัติ เพื่อป้องกันการนำสลิปเดิมมาใช้ซ้ำ 100% เสมอ
                  </div>
                </div>

                {/* 5.5 BANK / GATEWAY WEBHOOK AUTO-CREDIT (NO-SLIP) */}
                <div style={{ background: 'rgba(0, 230, 118, 0.05)', border: '1px solid rgba(0, 230, 118, 0.3)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <label className="input-label" style={{ color: '#00e676', fontWeight: 700, fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IconZap size={18} color="#00e676" />
                      <span>ระบบ Webhook รับเงินโอนธนาคารอัตโนมัติ (Real Auto-Credit ไม่ต้องแนบสลิป)</span>
                    </label>
                    <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', background: 'rgba(0,230,118,0.2)', color: '#00e676', fontWeight: 600 }}>
                      🟢 พร้อมรับ Webhook ทันที
                    </span>
                  </div>
                  <p style={{ color: '#b89ca2', fontSize: '0.8rem', marginBottom: '0.85rem' }}>
                    เมื่อมีเงินโอนเข้าบัญชีธนาคาร ระบบ Webhook จะตรวจจับยอดเงินจริงและเติมเครดิตเข้ากระเป๋าให้ลูกค้าอัตโนมัติทันทีภายใน 1-3 วินาที โดยที่ลูกค้าบนคอมไม่ต้องส่งสลิป! (รองรับ SlipOK Webhook, ChillPay, GBPrimePay, Opn, PromptPay SMS Listener)
                  </p>

                  <div className="responsive-grid-2col">
                    <div className="input-field-group">
                      <label className="input-label">URL สำหรับรับ Webhook (นำไปใส่ที่ธนาคาร/Gateway)</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          readOnly
                          className="text-input"
                          value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/topup/webhook`}
                          style={{ background: 'rgba(0,0,0,0.4)', color: '#00e676', fontFamily: 'monospace', fontSize: '0.82rem' }}
                        />
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '0.5rem 0.85rem', whiteSpace: 'nowrap' }}
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/api/topup/webhook`);
                            showToast('คัดลอก Webhook URL เรียบร้อย');
                          }}
                        >
                          <IconCopy size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="input-field-group">
                      <label className="input-label">Webhook Secret Key (รหัสลับยืนยันความปลอดภัย)</label>
                      <input
                        type="text"
                        className="text-input"
                        placeholder="เช่น whsec_..."
                        value={siteSettings.webhook_secret || ''}
                        onChange={(e) => setSiteSettings({ ...siteSettings, webhook_secret: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#7a6368', marginTop: '6px' }}>
                    *หากลูกค้าไม่ได้โอนเงินจริง ระบบจะขึ้นสถานะ "รอชำระ (Pending)" และป้องกันการปั๊มเครดิตฟรี 100% (แอดมินสามารถกดปุ่ม "อนุมัติ" ได้เองในแท็บประวัติการเติมเงิน)
                  </div>
                </div>

                {/* 6. BACKGROUND MUSIC CONFIGURATION */}
                <div style={{ background: 'rgba(255, 26, 64, 0.05)', border: '1px solid rgba(255, 26, 64, 0.25)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <label className="input-label" style={{ color: '#ff4d6d', fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>
                      🎵 เพลงประกอบเว็บไซต์ (Background Music Player)
                    </label>
                    <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', background: siteSettings.bg_music_enabled === 'true' ? 'rgba(255,26,64,0.2)' : 'rgba(255,255,255,0.08)', color: siteSettings.bg_music_enabled === 'true' ? '#ff4d6d' : '#888', fontWeight: 600 }}>
                      {siteSettings.bg_music_enabled === 'true' ? '🟢 เปิดใช้งานเพลง' : '⚪ ปิดเพลง'}
                    </span>
                  </div>
                  <p style={{ color: '#b89ca2', fontSize: '0.8rem', marginBottom: '1rem' }}>
                    สามารถใส่ลิงก์ไฟล์เพลง (Direct MP3, M4A, OGG หรือลิงก์สตรีมเสียง) เพื่อให้เปิดคลอในเว็บไซต์แบบอัตโนมัติ
                  </p>

                  <div className="responsive-grid-2col" style={{ marginBottom: '0.85rem' }}>
                    <div className="input-field-group">
                      <label className="input-label">สถานะการเปิดเพลง</label>
                      <select
                        className="text-input"
                        value={siteSettings.bg_music_enabled}
                        onChange={(e) => setSiteSettings({ ...siteSettings, bg_music_enabled: e.target.value })}
                      >
                        <option value="true">เปิดใช้งานเพลง (Enabled)</option>
                        <option value="false">ปิดเพลง (Disabled)</option>
                      </select>
                    </div>

                    <div className="input-field-group">
                      <label className="input-label">เล่นอัตโนมัติเมื่อลูกค้าแตะหน้าเว็บ</label>
                      <select
                        className="text-input"
                        value={siteSettings.bg_music_autoplay}
                        onChange={(e) => setSiteSettings({ ...siteSettings, bg_music_autoplay: e.target.value })}
                      >
                        <option value="true">เล่นอัตโนมัติ (Autoplay On)</option>
                        <option value="false">ต้องกดเล่นเอง (Manual Play)</option>
                      </select>
                    </div>
                  </div>

                  <div className="input-field-group" style={{ marginBottom: '0.85rem' }}>
                    <label className="input-label">ชื่อเพลง / ศิลปินที่แสดง</label>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="เช่น Cyberpunk Synthwave Beats หรือ HexSync Gaming"
                      value={siteSettings.bg_music_title}
                      onChange={(e) => setSiteSettings({ ...siteSettings, bg_music_title: e.target.value })}
                    />
                  </div>

                  <div className="input-field-group" style={{ marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="input-label">ลิงก์เพลง (รองรับ YouTube และไฟล์ MP3/Audio ทุกชนิด)</label>
                      {isYouTube && (
                        <span style={{ color: '#ff4d6d', fontSize: '0.75rem', fontWeight: 700 }}>
                          ▶ ตรวจพบคลิป YouTube (ID: {ytVideoId})
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="วางลิงก์ YouTube (เช่น https://www.youtube.com/watch?v=...) หรือลิงก์ .mp3"
                      value={siteSettings.bg_music_url}
                      onChange={(e) => setSiteSettings({ ...siteSettings, bg_music_url: e.target.value })}
                    />
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>เพลงแนะนำกดเลือกได้ทันที:</span>
                      <button
                        type="button"
                        className="btn-badge"
                        style={{ fontSize: '0.72rem', padding: '3px 8px', cursor: 'pointer', background: 'rgba(255,0,0,0.15)', color: '#ff4d6d', border: '1px solid rgba(255,0,0,0.3)', borderRadius: '6px' }}
                        onClick={() => setSiteSettings({
                          ...siteSettings,
                          bg_music_url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
                          bg_music_title: 'Lofi Girl - beats to relax/study to'
                        })}
                      >
                        🔴 Lofi Girl (YouTube)
                      </button>
                      <button
                        type="button"
                        className="btn-badge"
                        style={{ fontSize: '0.72rem', padding: '3px 8px', cursor: 'pointer', background: 'rgba(255,26,64,0.15)', color: '#ff1a40', border: '1px solid rgba(255,26,64,0.3)', borderRadius: '6px' }}
                        onClick={() => setSiteSettings({
                          ...siteSettings,
                          bg_music_url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Tours/Enthusiast/Tours_-_01_-_Enthusiast.mp3',
                          bg_music_title: 'Cyberpunk Synthwave Beats'
                        })}
                      >
                        ⚡ Cyberpunk Synthwave (MP3)
                      </button>
                    </div>
                  </div>

                  <div className="input-field-group" style={{ marginBottom: '0.5rem' }}>
                    <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>ระดับเสียงเริ่มต้น (Default Volume)</span>
                      <span style={{ color: '#ff4d6d' }}>{siteSettings.bg_music_volume || 30}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={siteSettings.bg_music_volume || 30}
                      onChange={(e) => setSiteSettings({ ...siteSettings, bg_music_volume: e.target.value })}
                      style={{ width: '100%', accentColor: '#ff1a40', cursor: 'pointer' }}
                    />
                  </div>

                  {/* Test play button in admin panel */}
                  <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={togglePlayMusic}
                      style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', gap: '0.4rem' }}
                    >
                      {isPlayingMusic ? <IconPause size={14} color="#ff4d6d" /> : <IconPlay size={14} color="#ff4d6d" />}
                      <span>{isPlayingMusic ? 'พักเพลงตัวอย่าง' : '▶ ทดลองฟังเพลงนี้'}</span>
                    </button>
                    <span style={{ color: '#888', fontSize: '0.75rem' }}>
                      (กดเพื่อฟังเสียงตัวอย่างจริงได้ทันที)
                    </span>
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}>
                  บันทึกการตกแต่งทั้งหมด (อัปเดตโลโก้, จุดเด่น, เพลงในเว็บ, ข้อมูลธนาคาร และ SlipOK ทันที)
                </button>
              </form>
            </div>
          )}

          {/* TAB: SLIP VERIFICATION & ANTI-DUPLICATE AUDIT */}
          {adminTab === 'slips' && (
            <div style={{ maxWidth: '960px' }}>
              <div style={{ background: 'rgba(25, 7, 12, 0.85)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ color: '#10b981', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <IconCheck size={20} color="#10b981" />
                      <span>รายการตรวจสอบสลิปธนาคาร (Bank Slips & Anti-Fraud Audit)</span>
                    </h3>
                    <p style={{ color: '#b89ca2', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      ประวัติการเติมเงินผ่านสลิปธนาคาร พร้อมระบบป้องกันสลิปซ้ำ 100% ด้วย SHA-256 และรหัสธุรกรรม TransRef
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={fetchAdminSlips}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                  >
                    🔄 รีเฟรชข้อมูล
                  </button>
                </div>

                {/* Verification Mode Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#b89ca2' }}>สลิปทั้งหมดในระบบ</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{adminSlips.length} รายการ</div>
                  </div>
                  <div style={{ background: 'rgba(255, 183, 3, 0.08)', border: '1px solid rgba(255, 183, 3, 0.2)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#b89ca2' }}>สถานะ SlipOK API</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: siteSettings.slipok_api_key && siteSettings.slipok_branch_id ? '#10b981' : '#ffb703', marginTop: '4px' }}>
                      {siteSettings.slipok_api_key && siteSettings.slipok_branch_id ? '🟢 ตรวจยอดจริงอัตโนมัติ' : '⚪ ยังไม่ตั้งค่า SlipOK'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255, 26, 64, 0.08)', border: '1px solid rgba(255, 26, 64, 0.2)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#b89ca2' }}>ระบบป้องกันสลิปซ้ำ</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
                      🛡️ SHA-256 + TransRef Active
                    </div>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>วัน/เวลา</th>
                        <th>ผู้ใช้งาน</th>
                        <th>ยอดเงินเติม</th>
                        <th>ธนาคารผู้โอน</th>
                        <th>รหัสอ้างอิงธุรกรรม (TransRef)</th>
                        <th>การตรวจสอบ</th>
                        <th>รูปสลิป</th>
                        <th>สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminSlips.map((s) => (
                        <tr key={s.id}>
                          <td style={{ fontSize: '0.78rem', color: '#7a6368' }}>
                            {new Date(s.createdAt).toLocaleString('th-TH')}
                          </td>
                          <td style={{ fontWeight: 700, color: '#fff' }}>
                            {s.username}
                          </td>
                          <td style={{ color: '#10b981', fontWeight: 800, fontSize: '0.95rem' }}>
                            ฿{Number(s.amount).toLocaleString()}
                          </td>
                          <td style={{ fontSize: '0.82rem', color: '#e0d0d5' }}>
                            {s.sendingBank || 'พร้อมเพย์ / ไม่ระบุ'}
                          </td>
                          <td style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#ffb703' }}>
                            {s.transRef || (s.slipHash ? s.slipHash.slice(0, 14) + '...' : '-')}
                          </td>
                          <td>
                            <span style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              background: s.verifiedVia === 'slipok_bank_verified' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)',
                              color: s.verifiedVia === 'slipok_bank_verified' ? '#10b981' : '#ccc'
                            }}>
                              {s.verifiedVia === 'slipok_bank_verified' ? '🛡️ SlipOK Bank' : s.verifiedVia === 'qr_tag54_verified' ? '📱 BOT QR Tag54' : '🔐 Anti-Duplicate'}
                            </span>
                          </td>
                          <td>
                            {s.slipImageUrl && (s.slipImageUrl.startsWith('data:image') || s.slipImageUrl.startsWith('http')) ? (
                              <button
                                type="button"
                                className="btn-outline"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => setViewingSlipImage(s.slipImageUrl)}
                              >
                                🔍 ดูสลิป
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#7a6368' }}>-</span>
                            )}
                          </td>
                          <td>
                            <span style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: 'rgba(16,185,129,0.15)',
                              color: '#10b981'
                            }}>
                              {s.status === 'approved' ? 'อนุมัติแล้ว' : s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {adminSlips.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#7a6368' }}>
                            ยังไม่มีรายการสลิปเติมเงินในระบบ
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: UNIFIED TOP-UP HISTORY (WEBSITE-WIDE & SPECIFIC USER AUDIT) */}
          {adminTab === 'topups' && (
            <div style={{ maxWidth: '1080px' }}>
              <div style={{ background: 'rgba(25, 7, 12, 0.85)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ color: '#10b981', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                      <IconCreditCard size={22} color="#10b981" />
                      <span>ประวัติการเติมเงินของเว็บไซต์ (Website Top-Up Records)</span>
                    </h3>
                    <p style={{ color: '#b89ca2', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      บันทึกรายการเติมเงินทุกช่องทาง (พร้อมเพย์ Dynamic QR, สลิปธนาคาร, ซองอั่งเปา TrueMoney, โค้ดฟรี) พร้อมตัวกรองดูเฉพาะยูสเซอร์ที่ต้องการ
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {adminTopupUserFilter && (
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', color: '#ff4d6d', borderColor: 'rgba(255, 77, 109, 0.4)' }}
                        onClick={() => {
                          setAdminTopupUserFilter('');
                          fetchAdminTopupHistory('');
                        }}
                      >
                        ❌ ดูของทั้งเว็บ (ล้างฟิลเตอร์)
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => fetchAdminTopupHistory()}
                      disabled={adminTopupLoading}
                      style={{ fontSize: '0.85rem', padding: '0.45rem 1rem', background: 'linear-gradient(135deg, #10b981, #059669)', fontWeight: 700 }}
                    >
                      🔄 {adminTopupLoading ? 'กำลังโหลด...' : 'รีเฟรชข้อมูล'}
                    </button>
                  </div>
                </div>

                {/* KPI Summary Cards */}
                {adminTopupSummary && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
                    <div style={{ background: 'radial-gradient(circle at top left, rgba(16, 185, 129, 0.15) 0%, rgba(25, 7, 12, 0.7) 100%)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '0.9rem 1.15rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#a7f3d0', fontWeight: 600 }}>
                        {adminTopupUserFilter ? `ยอดเติมเงินของ ${adminTopupUserFilter}` : 'ยอดเติมเงินรวมทั้งเว็บ (สำเร็จ)'}
                      </div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#00e676', letterSpacing: '0.5px', marginTop: '2px' }}>
                        ฿{adminTopupSummary.totalSuccessAmount.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#b89ca2', marginTop: '4px' }}>
                        สำเร็จทั้งหมด {adminTopupSummary.breakdown ? (adminTopupSummary.breakdown.promptpay.count + adminTopupSummary.breakdown.slip.count + adminTopupSummary.breakdown.angpao.count + adminTopupSummary.breakdown.giftcode.count) : 0} รายการ
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0, 210, 255, 0.08)', border: '1px solid rgba(0, 210, 255, 0.25)', borderRadius: '12px', padding: '0.9rem 1.15rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#b8e6ff', fontWeight: 600 }}>ยอดเติมเงินวันนี้ (Today)</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#00d2ff', letterSpacing: '0.5px', marginTop: '2px' }}>
                        ฿{adminTopupSummary.todaySuccessAmount.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#b89ca2', marginTop: '4px' }}>
                        คำนวณจากยอดที่เข้าบัญชีวันนี้
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255, 183, 3, 0.08)', border: '1px solid rgba(255, 183, 3, 0.25)', borderRadius: '12px', padding: '0.9rem 1.15rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#ffe194', fontWeight: 600 }}>ยอดรอดำเนินการ / รอชำระ</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffb703', letterSpacing: '0.5px', marginTop: '2px' }}>
                        ฿{adminTopupSummary.totalPendingAmount.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#b89ca2', marginTop: '4px' }}>
                        บิลที่กำลังรอการชำระเงิน
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255, 26, 64, 0.08)', border: '1px solid rgba(255, 26, 64, 0.25)', borderRadius: '12px', padding: '0.9rem 1.15rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#ff88a3', fontWeight: 600 }}>จำนวนธุรกรรมทั้งหมด</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', letterSpacing: '0.5px', marginTop: '2px' }}>
                        {adminTopupSummary.totalRecords.toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#b89ca2', fontWeight: 500 }}>รายการ</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#b89ca2', marginTop: '4px' }}>
                        จากสมาชิก {adminTopupUsersList.length} บัญชี
                      </div>
                    </div>
                  </div>
                )}

                {/* Channel Breakdown Quick Pills */}
                {adminTopupSummary && adminTopupSummary.breakdown && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem', padding: '0.75rem', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.8rem', color: '#b89ca2', alignSelf: 'center', marginRight: '4px' }}>สัดส่วนช่องทาง:</div>
                    <span style={{ fontSize: '0.76rem', background: 'rgba(0, 230, 118, 0.12)', border: '1px solid rgba(0, 230, 118, 0.3)', padding: '3px 9px', borderRadius: '20px', color: '#00e676', fontWeight: 600 }}>
                      ⚡ พร้อมเพย์ QR: ฿{adminTopupSummary.breakdown.promptpay.amount.toLocaleString()} ({adminTopupSummary.breakdown.promptpay.count})
                    </span>
                    <span style={{ fontSize: '0.76rem', background: 'rgba(0, 210, 255, 0.12)', border: '1px solid rgba(0, 210, 255, 0.3)', padding: '3px 9px', borderRadius: '20px', color: '#00d2ff', fontWeight: 600 }}>
                      🏦 สลิปธนาคาร: ฿{adminTopupSummary.breakdown.slip.amount.toLocaleString()} ({adminTopupSummary.breakdown.slip.count})
                    </span>
                    <span style={{ fontSize: '0.76rem', background: 'rgba(255, 183, 3, 0.12)', border: '1px solid rgba(255, 183, 3, 0.3)', padding: '3px 9px', borderRadius: '20px', color: '#ffb703', fontWeight: 600 }}>
                      🧧 อั่งเปา TrueMoney: ฿{adminTopupSummary.breakdown.angpao.amount.toLocaleString()} ({adminTopupSummary.breakdown.angpao.count})
                    </span>
                    <span style={{ fontSize: '0.76rem', background: 'rgba(255, 77, 109, 0.12)', border: '1px solid rgba(255, 77, 109, 0.3)', padding: '3px 9px', borderRadius: '20px', color: '#ff4d6d', fontWeight: 600 }}>
                      🎁 โค้ดของขวัญ: ฿{adminTopupSummary.breakdown.giftcode.amount.toLocaleString()} ({adminTopupSummary.breakdown.giftcode.count})
                    </span>
                  </div>
                )}

                {/* Filter Controls Bar */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* USER SELECTOR DROPDOWN */}
                    <div style={{ flex: '1 1 240px' }}>
                      <label style={{ fontSize: '0.75rem', color: '#b89ca2', marginBottom: '4px', display: 'block', fontWeight: 700 }}>
                        👤 เลือกดูประวัติของยูสเซอร์:
                      </label>
                      <select
                        className="text-input"
                        style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem', background: '#0a0305', color: adminTopupUserFilter ? '#00e676' : '#fff', fontWeight: adminTopupUserFilter ? 700 : 400 }}
                        value={adminTopupUserFilter}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAdminTopupUserFilter(val);
                          fetchAdminTopupHistory(val);
                        }}
                      >
                        <option value="">👥 สมาชิกทุกคน (ทั้งเว็บไซต์)</option>
                        {adminTopupUsersList.map(u => (
                          <option key={u} value={u}>👤 {u}</option>
                        ))}
                      </select>
                    </div>

                    {/* CHANNEL FILTER */}
                    <div style={{ flex: '1 1 180px' }}>
                      <label style={{ fontSize: '0.75rem', color: '#b89ca2', marginBottom: '4px', display: 'block', fontWeight: 700 }}>
                        💳 ช่องทางการเติม:
                      </label>
                      <select
                        className="text-input"
                        style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem', background: '#0a0305' }}
                        value={adminTopupMethodFilter}
                        onChange={(e) => {
                          setAdminTopupMethodFilter(e.target.value);
                        }}
                      >
                        <option value="all">ทุกช่องทาง (All)</option>
                        <option value="promptpay">พร้อมเพย์ Dynamic QR</option>
                        <option value="slip">สลิปธนาคาร (Slip)</option>
                        <option value="angpao">ซองอั่งเปา TrueMoney</option>
                        <option value="giftcode">โค้ดเครดิตฟรี</option>
                      </select>
                    </div>

                    {/* STATUS FILTER */}
                    <div style={{ flex: '1 1 160px' }}>
                      <label style={{ fontSize: '0.75rem', color: '#b89ca2', marginBottom: '4px', display: 'block', fontWeight: 700 }}>
                        📌 สถานะ:
                      </label>
                      <select
                        className="text-input"
                        style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem', background: '#0a0305' }}
                        value={adminTopupStatusFilter}
                        onChange={(e) => {
                          setAdminTopupStatusFilter(e.target.value);
                        }}
                      >
                        <option value="all">ทุกสถานะ (All)</option>
                        <option value="paid">✅ สำเร็จ (Approved/Paid)</option>
                        <option value="pending">⏳ รอดำเนินการ (Pending)</option>
                        <option value="expired">❌ หมดอายุ/ยกเลิก</option>
                      </select>
                    </div>

                    {/* TEXT SEARCH */}
                    <div style={{ flex: '2 1 240px' }}>
                      <label style={{ fontSize: '0.75rem', color: '#b89ca2', marginBottom: '4px', display: 'block', fontWeight: 700 }}>
                        🔍 ค้นหา (ยูสเซอร์ / รหัสบิล / Ref):
                      </label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          type="text"
                          className="text-input"
                          placeholder="พิมพ์ชื่อยูสเซอร์, รหัส QR, หรือ TransRef..."
                          style={{ flex: 1, padding: '0.55rem', fontSize: '0.85rem', background: '#0a0305' }}
                          value={adminTopupSearch}
                          onChange={(e) => setAdminTopupSearch(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') fetchAdminTopupHistory();
                          }}
                        />
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: '0.55rem 0.85rem', fontSize: '0.8rem' }}
                          onClick={() => fetchAdminTopupHistory()}
                        >
                          ค้นหา
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Active Filter Banner */}
                  {adminTopupUserFilter && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0, 230, 118, 0.08)', border: '1px solid rgba(0, 230, 118, 0.25)', borderRadius: '8px', padding: '0.5rem 0.85rem', fontSize: '0.82rem' }}>
                      <div style={{ color: '#00e676', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IconUserCheck size={16} />
                        <span>กำลังแสดงประวัติการเติมเงินเฉพาะของ: <strong style={{ color: '#fff', textDecoration: 'underline' }}>{adminTopupUserFilter}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminTopupUserFilter('');
                          fetchAdminTopupHistory('');
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#ff4d6d', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                      >
                        ✕ ยกเลิกการกรอง (ดูทั้งเว็บ)
                      </button>
                    </div>
                  )}
                </div>

                {/* Table Data */}
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: '130px' }}>วัน-เวลา</th>
                        <th style={{ width: '140px' }}>ผู้ใช้งาน</th>
                        <th style={{ width: '160px' }}>ช่องทาง</th>
                        <th style={{ width: '120px' }}>ยอดเงิน</th>
                        <th>รหัสอ้างอิง / บิล</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>สถานะ</th>
                        <th style={{ width: '90px', textAlign: 'center' }}>สลิป</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminTopups.map((t: any) => (
                        <tr key={t.id}>
                          <td style={{ fontSize: '0.78rem', color: '#b89ca2', whiteSpace: 'nowrap' }}>
                            {new Date(t.date || t.createdAt).toLocaleString('th-TH', {
                              year: 'numeric', month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => {
                                setAdminTopupUserFilter(t.username);
                                fetchAdminTopupHistory(t.username);
                              }}
                              title={`คลิกเพื่อดูเฉพาะประวัติของ ${t.username}`}
                              style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#00d2ff',
                                borderRadius: '6px',
                                padding: '2px 8px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span>👤 {t.username}</span>
                            </button>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {t.type === 'promptpay' && <IconQrCode size={15} color="#00e676" />}
                              {t.type === 'slip' && <IconCreditCard size={15} color="#00d2ff" />}
                              {t.type === 'angpao' && <IconGift size={15} color="#ffb703" />}
                              {t.type === 'giftcode' && <IconTag size={15} color="#ff4d6d" />}
                              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: t.type === 'promptpay' ? '#00e676' : (t.type === 'slip' ? '#00d2ff' : (t.type === 'angpao' ? '#ffb703' : '#ff4d6d')) }}>
                                {t.channelName}
                              </span>
                            </div>
                          </td>
                          <td>
                            <strong style={{ fontSize: '0.98rem', color: (t.status === 'approved' || t.status === 'paid') ? '#00e676' : '#b89ca2' }}>
                              +฿{Number(t.amount || 0).toLocaleString()}
                            </strong>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.78rem', color: '#ffb703', fontFamily: 'monospace' }}>
                              {t.orderId || t.refNumber || '-'}
                            </div>
                            {t.detail && (
                              <div style={{ fontSize: '0.7rem', color: '#7a6368', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.detail}>
                                {t.detail}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {(t.status === 'approved' || t.status === 'paid') && (
                              <span style={{ background: 'rgba(0, 230, 118, 0.15)', color: '#00e676', border: '1px solid rgba(0, 230, 118, 0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>
                                สำเร็จ
                              </span>
                            )}
                            {t.status === 'pending' && (
                              <span style={{ background: 'rgba(255, 183, 3, 0.15)', color: '#ffb703', border: '1px solid rgba(255, 183, 3, 0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>
                                รอชำระ
                              </span>
                            )}
                            {(t.status === 'expired' || t.status === 'cancelled') && (
                              <span style={{ background: 'rgba(255, 77, 109, 0.12)', color: '#ff4d6d', border: '1px solid rgba(255, 77, 109, 0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>
                                {t.statusLabel || 'หมดอายุ'}
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {t.slipImageUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewTopupSlip(t.slipImageUrl)}
                                style={{ background: 'rgba(0, 210, 255, 0.15)', border: '1px solid rgba(0, 210, 255, 0.3)', borderRadius: '6px', padding: '3px 8px', color: '#00d2ff', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                🖼️ สลิป
                              </button>
                            ) : (
                              <span style={{ color: '#555', fontSize: '0.75rem' }}>-</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {t.status === 'pending' && t.type === 'promptpay' ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleApproveQrPayment(t.orderId, t.username, t.amount)}
                                  title="ตรวจสอบยอดเงินเข้าธนาคารแล้ว อนุมัติทันที"
                                  style={{
                                    background: 'rgba(0, 230, 118, 0.18)',
                                    border: '1px solid rgba(0, 230, 118, 0.4)',
                                    borderRadius: '6px',
                                    padding: '3px 8px',
                                    color: '#00e676',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  ✅ อนุมัติ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelQrPayment(t.orderId)}
                                  title="ยกเลิกคำสั่งซื้อนี้"
                                  style={{
                                    background: 'rgba(255, 77, 109, 0.12)',
                                    border: '1px solid rgba(255, 77, 109, 0.3)',
                                    borderRadius: '6px',
                                    padding: '3px 6px',
                                    color: '#ff4d6d',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  ❌
                                </button>
                              </div>
                            ) : (t.status === 'approved' || t.status === 'paid') ? (
                              <span style={{ color: '#00e676', fontSize: '0.75rem', fontWeight: 600 }}>สำเร็จแล้ว</span>
                            ) : (
                              <span style={{ color: '#555', fontSize: '0.75rem' }}>-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {adminTopups.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: '#7a6368' }}>
                            {adminTopupLoading ? 'กำลังโหลดประวัติการเติมเงิน...' : 'ไม่พบประวัติการเติมเงินตามเงื่อนไขที่เลือก'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: AUDIT LOGS */}
          {adminTab === 'logs' && (
            <div style={{ maxWidth: '960px' }}>
              <div style={{ background: 'rgba(25, 7, 12, 0.85)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '1.5rem' }}>
                <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ color: '#ff4d6d', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconFileText size={20} color="#ff1a40" />
                    <span>ประวัติการทำงานของระบบ (System & Audit Logs)</span>
                  </h3>
                  <p style={{ color: '#b89ca2', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    บันทึกประวัติกิจกรรมทั้งหมด เช่น การเติมเงิน ซื้อสินค้า ปรับเงิน แลกโค้ด และสิทธิ์แอดมิน
                  </p>
                </div>

                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>เวลา</th>
                        <th>ผู้ดำเนินการ</th>
                        <th>กิจกรรม (Action)</th>
                        <th>รายละเอียด (Detail)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminLogs.map((l) => (
                        <tr key={l.id}>
                          <td style={{ fontSize: '0.78rem', color: '#7a6368', whiteSpace: 'nowrap' }}>
                            {new Date(l.createdAt).toLocaleString('th-TH')}
                          </td>
                          <td style={{ fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                            {l.username || 'ระบบ'}
                          </td>
                          <td>
                            <span style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: 'rgba(255,26,64,0.15)',
                              color: '#ff4d6d'
                            }}>
                              {l.action}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.82rem', color: '#ccc' }}>
                            {l.detail}
                          </td>
                        </tr>
                      ))}
                      {adminLogs.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#7a6368' }}>
                            ยังไม่มีประวัติการทำงานในระบบ
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: THREAT LOGS (สุ่มเสี่ยง & ถอดรหัส & เจาะระบบ) */}
          {adminTab === 'threatLogs' && (
            <div>
              {user?.role !== 'superadmin' && !isPasscodeUnlocked ? (
                <div className="passcode-gate-card">
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255, 26, 64, 0.2)', border: '2px solid #ff1a40', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 0 25px rgba(255, 26, 64, 0.5)' }}>
                    <IconLock size={32} color="#ff1a40" />
                  </div>
                  <h3 style={{ color: '#fff', fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                    หน้านี้ถูกเข้ารหัสความปลอดภัย (Security Area)
                  </h3>
                  <p style={{ color: '#b89ca2', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                    สงวนสิทธิ์การเข้าถึงสำหรับ <strong>SuperAdmin</strong> โดยตรง หรือแอดมินที่ได้รับ <strong>Security Passcode</strong> จาก SuperAdmin เท่านั้น
                  </p>
                  <form onSubmit={handleVerifyPasscode}>
                    <input
                      type="password"
                      className="text-input"
                      style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '4px', padding: '0.85rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.6)', borderColor: passcodeError ? '#ff1a40' : 'rgba(255,77,109,0.4)' }}
                      placeholder="กรอกรหัส Passcode..."
                      value={passcodeInput}
                      onChange={(e) => { setPasscodeInput(e.target.value); setPasscodeError(''); }}
                      autoFocus
                    />
                    {passcodeError && (
                      <div style={{ color: '#ff4d6d', fontSize: '0.82rem', marginBottom: '1rem', fontWeight: 700 }}>
                        ⚠️ {passcodeError}
                      </div>
                    )}
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}
                    >
                      <IconKey size={18} />
                      <span>ยืนยันรหัส Passcode เพื่อเข้าใช้งาน</span>
                    </button>
                  </form>
                </div>
              ) : (
                <div style={{ background: 'rgba(20, 5, 10, 0.9)', border: '1px solid rgba(255, 26, 64, 0.35)', borderRadius: '16px', padding: '1.5rem' }}>
                  {/* Top Header & SuperAdmin Widget */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
                    <div>
                      <h3 style={{ color: '#ff4d6d', fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <IconAlertCircle size={24} color="#ff1a40" />
                        <span>บันทึกความปลอดภัย & สุ่มเสี่ยง (Security Threat Forensics)</span>
                      </h3>
                      <p style={{ color: '#b89ca2', fontSize: '0.85rem', marginTop: '0.35rem', marginBottom: 0 }}>
                        แยกกับ Log ปกติ: บันทึกการกด F12, Inspect, แกะโค้ด พร้อมภาพหน้าจอ (Screenshot) และ Cookies อัตโนมัติ
                      </p>
                    </div>

                    {user?.role === 'superadmin' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 215, 0, 0.12)', border: '1px solid rgba(255, 215, 0, 0.35)', padding: '0.5rem 1rem', borderRadius: '12px' }}>
                        <span style={{ fontSize: '0.82rem', color: '#ffd700', fontWeight: 800 }}>👑 รหัสความปลอดภัย (Passcode):</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 800, color: '#fff', letterSpacing: showPasscodePlain ? '2px' : '4px' }}>
                          {showPasscodePlain ? (currentMasterPasscode || '123456') : '••••••••'}
                        </span>
                        <button
                          type="button"
                          className="btn-ip-action"
                          onClick={() => setShowPasscodePlain(!showPasscodePlain)}
                          title={showPasscodePlain ? "ซ่อนรหัส" : "แสดงรหัส"}
                        >
                          <IconEye size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-ip-action"
                          onClick={() => {
                            navigator.clipboard.writeText(currentMasterPasscode || '123456');
                            showToast('คัดลอก Passcode แล้ว');
                          }}
                          title="คัดลอก Passcode"
                        >
                          <IconCopy size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-outline"
                          style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', borderColor: '#ffd700', color: '#ffd700' }}
                          onClick={handleGenerateNewPasscode}
                          title="สุ่มรหัส Passcode ใหม่ให้แอดมินคนอื่นใช้เข้าดูหน้านี้"
                        >
                          🎲 สุ่มรหัสใหม่
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Filter by Username & Action Bar */}
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '400px' }}>
                      <IconSearch size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#ff4d6d' }} />
                      <input
                        type="text"
                        className="text-input"
                        style={{ paddingLeft: '2.5rem', margin: 0 }}
                        placeholder="🔍 กรองดู Log เฉพาะ User (เช่น admin, member)..."
                        value={threatUserFilter}
                        onChange={(e) => setThreatUserFilter(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') fetchThreatLogs(threatUserFilter);
                        }}
                      />
                    </div>
                    <button
                      className="btn-outline"
                      onClick={() => fetchThreatLogs(threatUserFilter)}
                      style={{ padding: '0.65rem 1rem' }}
                    >
                      🔍 ค้นหาตาม User
                    </button>
                    {threatUserFilter && (
                      <button
                        className="btn-outline"
                        onClick={() => { setThreatUserFilter(''); fetchThreatLogs(''); }}
                        style={{ padding: '0.65rem 1rem', color: '#b89ca2' }}
                      >
                        ✕ ล้างตัวกรอง
                      </button>
                    )}
                    <button
                      className="btn-primary"
                      onClick={() => fetchThreatLogs(threatUserFilter)}
                      style={{ marginLeft: 'auto', padding: '0.65rem 1.25rem' }}
                      disabled={threatLogsLoading}
                    >
                      {threatLogsLoading ? 'กำลังโหลด...' : `🔄 รีเฟรช (${threatLogsList.length})`}
                    </button>
                  </div>

                  {/* Table */}
                  <div className="table-responsive">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>เวลา</th>
                          <th>ผู้ใช้งาน / IP / เครื่อง</th>
                          <th>การกระทำ (Threat Action)</th>
                          <th>ครั้งที่ (Strike)</th>
                          <th>หลักฐาน (Forensics)</th>
                          <th style={{ textAlign: 'center' }}>สั่งแบนผ่าน Log ทันที</th>
                        </tr>
                      </thead>
                      <tbody>
                        {threatLogsList.map((item) => (
                          <tr key={item.id}>
                            <td style={{ fontSize: '0.78rem', color: '#998086', whiteSpace: 'nowrap' }}>
                              {new Date(item.createdAt).toLocaleString('th-TH')}
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontWeight: 800, color: item.username === 'Anonymous' ? '#888' : '#fff' }}>
                                    👤 {item.username}
                                  </span>
                                  {item.username && item.username !== 'Anonymous' && (
                                    <button
                                      type="button"
                                      className="btn-ip-action"
                                      style={{ padding: '1px 5px', fontSize: '0.68rem', color: '#ff4d6d' }}
                                      onClick={() => {
                                        setThreatUserFilter(item.username);
                                        fetchThreatLogs(item.username);
                                      }}
                                      title="กรองดูเฉพาะ Log ของยูสเซอร์นี้"
                                    >
                                      กรอง User นี้
                                    </button>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span className="ip-badge" style={{ fontSize: '0.72rem' }}>
                                    🌐 {item.ip}
                                  </span>
                                  <button
                                    type="button"
                                    className="btn-ip-action"
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.ip);
                                      showToast(`คัดลอก IP ${item.ip} แล้ว`);
                                    }}
                                    title="คัดลอก IP"
                                  >
                                    <IconCopy size={10} />
                                  </button>
                                </div>
                                {item.deviceModel && (
                                  <span style={{ fontSize: '0.7rem', color: '#00d2ff' }}>
                                    📱 {item.deviceModel} (UDID: {item.deviceId?.slice(0, 10)}...)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span className={`threat-badge ${item.threatType?.includes('F12') ? 'threat-badge-danger' : 'threat-badge-warning'}`}>
                                  ⚠️ {item.threatType}
                                </span>
                                <span style={{ fontSize: '0.82rem', color: '#ddd' }}>
                                  {item.detail}
                                </span>
                                {item.pageUrl && (
                                  <span style={{ fontSize: '0.68rem', color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px', whiteSpace: 'nowrap' }}>
                                    URL: {item.pageUrl}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                                <span className="threat-badge-strike">
                                  ครั้งที่ {item.strikeCount}/3
                                </span>
                                {item.banned ? (
                                  <span style={{ fontSize: '0.7rem', color: '#ff4d6d', fontWeight: 800 }}>
                                    ⛔ แบนแล้ว
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.7rem', color: '#10b981' }}>
                                    🟡 เตือนก่อน
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {item.screenshot ? (
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                      type="button"
                                      className="btn-outline"
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', borderColor: 'rgba(255,26,64,0.4)', color: '#ff88a3' }}
                                      onClick={() => setViewingScreenshotModal(item)}
                                    >
                                      📷 ดูภาพแคป
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-outline"
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                                      onClick={() => handleDownloadScreenshot(item)}
                                      title="ดาวน์โหลดไฟล์ภาพหน้าจอ .jpg"
                                    >
                                      💾 โหลด
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.72rem', color: '#777' }}>ไม่มีรูป</span>
                                )}
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button
                                    type="button"
                                    className="btn-outline"
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', borderColor: 'rgba(0,210,255,0.4)', color: '#00d2ff' }}
                                    onClick={() => setViewingCookiesModal(item)}
                                  >
                                    🍪 ดู Cookie
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-outline"
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                                    onClick={() => handleDownloadCookies(item)}
                                    title="ดาวน์โหลดไฟล์ Cookies .txt"
                                  >
                                    💾 โหลด
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {item.banned ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                  <span style={{ fontSize: '0.72rem', background: 'rgba(255,26,64,0.15)', border: '1px solid rgba(255,26,64,0.35)', color: '#ff4d6d', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                                    ⛔ แบน 10 ปี 9 ด. เรียบร้อย
                                  </span>
                                  {item.bannedUntil && (
                                    <span style={{ fontSize: '0.68rem', color: '#b89ca2' }}>
                                      เหลือ: {formatCountdownShort(item.bannedUntil)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    className="btn-primary"
                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', background: 'linear-gradient(135deg, #ff1a40, #b40a1e)', width: '100%', justifyContent: 'center' }}
                                    onClick={() => handleBanFromLog(item, 'both', 10)}
                                    title="สั่งแบนทั้ง IP และ เครื่อง ทันที 10 ปี 9 เดือน 9 วัน 9 ชม 9 นาที 9 วินาที"
                                  >
                                    🚨 แบน 10 ปี 9 เดือน (ทั้งคู่)
                                  </button>
                                  <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                                    <button
                                      type="button"
                                      className="btn-outline"
                                      style={{ padding: '0.25rem 0.4rem', fontSize: '0.68rem', flex: 1, borderColor: '#ff4d6d', color: '#ff88a3' }}
                                      onClick={() => handleBanFromLog(item, 'ip', 10)}
                                      title="แบนเฉพาะ IP"
                                    >
                                      🌐 แบน IP
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-outline"
                                      style={{ padding: '0.25rem 0.4rem', fontSize: '0.68rem', flex: 1, borderColor: '#00d2ff', color: '#00d2ff' }}
                                      onClick={() => handleBanFromLog(item, 'device', 10)}
                                      title="แบนเฉพาะเครื่อง UDID"
                                    >
                                      📱 แบนเครื่อง
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                        {threatLogsList.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#7a6368' }}>
                              <IconCheck color="#10b981" size={32} style={{ margin: '0 auto 0.5rem', display: 'block' }} />
                              ยังไม่มีบันทึกภัยคุกคามหรือการพยายามเจาะระบบในขณะนี้ (ระบบปลอดภัยสมบูรณ์)
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: BAN EXPIRATION MANAGER (จัดการวันเวลาปลดแบน) */}
          {adminTab === 'banManager' && (
            <div>
              {user?.role !== 'superadmin' && !isPasscodeUnlocked ? (
                <div className="passcode-gate-card">
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255, 170, 0, 0.2)', border: '2px solid #ffaa00', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 0 25px rgba(255, 170, 0, 0.5)' }}>
                    <IconLock size={32} color="#ffaa00" />
                  </div>
                  <h3 style={{ color: '#fff', fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                    ระบบจัดการวันเวลาปลดแบน (Protected Area)
                  </h3>
                  <p style={{ color: '#b89ca2', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                    สงวนสิทธิ์สำหรับ <strong>SuperAdmin</strong> หรือผู้ถือ <strong>Security Passcode</strong> เท่านั้น
                  </p>
                  <form onSubmit={handleVerifyPasscode}>
                    <input
                      type="password"
                      className="text-input"
                      style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '4px', padding: '0.85rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.6)', borderColor: passcodeError ? '#ff1a40' : 'rgba(255,170,0,0.4)' }}
                      placeholder="กรอกรหัส Passcode..."
                      value={passcodeInput}
                      onChange={(e) => { setPasscodeInput(e.target.value); setPasscodeError(''); }}
                      autoFocus
                    />
                    {passcodeError && (
                      <div style={{ color: '#ff4d6d', fontSize: '0.82rem', marginBottom: '1rem', fontWeight: 700 }}>
                        ⚠️ {passcodeError}
                      </div>
                    )}
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', background: 'linear-gradient(135deg, #ffaa00, #d97706)' }}
                    >
                      <IconKey size={18} />
                      <span>ยืนยันรหัสความปลอดภัย</span>
                    </button>
                  </form>
                </div>
              ) : (
                <div style={{ background: 'rgba(20, 8, 12, 0.9)', border: '1px solid rgba(255, 170, 0, 0.35)', borderRadius: '16px', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
                    <div>
                      <h3 style={{ color: '#ffaa00', fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <IconShield size={24} color="#ffaa00" />
                        <span>ศูนย์จัดการระยะเวลาปลดแบน (Ban Expiration Manager)</span>
                      </h3>
                      <p style={{ color: '#b89ca2', fontSize: '0.85rem', marginTop: '0.35rem', marginBottom: 0 }}>
                        ดูรายการแบน IP, เครื่อง และผู้ใช้ทั้งหมด พร้อมเวลานับถอยหลัง ปรับเปลี่ยนวันหมดอายุ หรือสั่งปลดแบนได้ทันที
                      </p>
                    </div>

                    <button
                      className="btn-primary"
                      onClick={fetchActiveBans}
                      style={{ padding: '0.65rem 1.25rem', background: 'linear-gradient(135deg, #ffaa00, #d97706)' }}
                      disabled={activeBansLoading}
                    >
                      {activeBansLoading ? 'กำลังโหลด...' : `🔄 รีเฟรชรายการ (${activeBansList.length})`}
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div style={{ position: 'relative', maxWidth: '400px', marginBottom: '1.25rem' }}>
                    <IconSearch size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#ffaa00' }} />
                    <input
                      type="text"
                      className="text-input"
                      style={{ paddingLeft: '2.5rem', margin: 0 }}
                      placeholder="ค้นหา IP, UDID หรือชื่อผู้ใช้..."
                      value={activeBansSearch}
                      onChange={(e) => setActiveBansSearch(e.target.value)}
                    />
                  </div>

                  {/* Table of Active Bans */}
                  <div className="table-responsive">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ประเภท (Type)</th>
                          <th>ข้อมูลเป้าหมาย (Identifier)</th>
                          <th>เหตุผล & ผู้สั่งแบน</th>
                          <th>วันที่เริ่มแบน</th>
                          <th>กำหนดวันหมดอายุ / เวลาที่เหลือ</th>
                          <th style={{ textAlign: 'center' }}>การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeBansList
                          .filter((b) => {
                            const q = activeBansSearch.toLowerCase().trim();
                            if (!q) return true;
                            return (
                              b.identifier?.toLowerCase().includes(q) ||
                              b.reason?.toLowerCase().includes(q) ||
                              b.bannedBy?.toLowerCase().includes(q) ||
                              b.banType?.toLowerCase().includes(q)
                            );
                          })
                          .map((b) => (
                            <tr key={`${b.banType}-${b.id}`}>
                              <td>
                                <span style={{
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  background: b.banType === 'ip' ? 'rgba(255,26,64,0.15)' : (b.banType === 'device' ? 'rgba(0,210,255,0.15)' : 'rgba(255,170,0,0.15)'),
                                  color: b.banType === 'ip' ? '#ff4d6d' : (b.banType === 'device' ? '#00d2ff' : '#ffaa00'),
                                  border: `1px solid ${b.banType === 'ip' ? 'rgba(255,26,64,0.4)' : (b.banType === 'device' ? 'rgba(0,210,255,0.4)' : 'rgba(255,170,0,0.4)')}`
                                }}>
                                  {b.banType === 'ip' ? '🌐 IP BAN' : (b.banType === 'device' ? '📱 DEVICE BAN' : '👤 USER BAN')}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.92rem' }}>
                                    {b.identifier}
                                  </span>
                                  {b.detail && (
                                    <span style={{ fontSize: '0.72rem', color: '#b89ca2' }}>
                                      {b.detail}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontSize: '0.82rem', color: '#ddd' }}>
                                    {b.reason || 'ละเมิดข้อกำหนด'}
                                  </span>
                                  <span style={{ fontSize: '0.7rem', color: '#ff88a3' }}>
                                    โดย: {b.bannedBy || 'Admin'}
                                  </span>
                                </div>
                              </td>
                              <td style={{ fontSize: '0.78rem', color: '#888', whiteSpace: 'nowrap' }}>
                                {b.bannedAt ? new Date(b.bannedAt).toLocaleString('th-TH') : 'ไม่ระบุ'}
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  {b.bannedUntil ? (
                                    <>
                                      <span style={{ fontSize: '0.82rem', color: '#ff4d6d', fontWeight: 800 }}>
                                        ⏳ {formatCountdownShort(b.bannedUntil)}
                                      </span>
                                      <span style={{ fontSize: '0.7rem', color: '#888' }}>
                                        ปลดเมื่อ: {new Date(b.bannedUntil).toLocaleString('th-TH')}
                                      </span>
                                    </>
                                  ) : (
                                    <span style={{ fontSize: '0.82rem', color: '#888', fontStyle: 'italic' }}>
                                      ถาวร (ไม่มีกำหนดเวลา)
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                  <button
                                    type="button"
                                    className="btn-outline"
                                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderColor: '#ffaa00', color: '#ffaa00' }}
                                    onClick={() => {
                                      setEditingBanModal(b);
                                      setEditBanDateInput(b.bannedUntil ? new Date(b.bannedUntil).toISOString().slice(0, 16) : '');
                                      setEditBanReasonInput(b.reason || '');
                                    }}
                                    title="แก้ไขวันเวลาปลดแบน"
                                  >
                                    ✏️ ปรับเวลา
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-outline"
                                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderColor: '#10b981', color: '#10b981' }}
                                    onClick={() => handleUnbanDirect(b)}
                                    title="สั่งปลดแบนทันที"
                                  >
                                    🔓 ปลดแบน
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        {activeBansList.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#7a6368' }}>
                              ไม่มีรายการแบนใดๆ ในระบบขณะนี้
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: SUPERADMIN MANAGER & MASTER SECRET RECOVERY */}
          {adminTab === 'superadmin' && (
            <div>
              {user?.role !== 'superadmin' && !isSuperAdminUnlocked ? (
                /* SECRET VAULT LOCK SCREEN */
                <div className="passcode-gate-card" style={{ maxWidth: '560px', borderColor: 'rgba(255, 215, 0, 0.4)', background: 'linear-gradient(145deg, rgba(20, 8, 12, 0.95), rgba(35, 15, 10, 0.95))' }}>
                  <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(255, 215, 0, 0.15)', border: '2px solid #ffd700', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 0 30px rgba(255, 215, 0, 0.45)' }}>
                    <span style={{ fontSize: '2rem' }}>👑</span>
                  </div>
                  <h3 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span>🔐 กู้คืนสิทธิ์ SuperAdmin</span>
                  </h3>
                  <div style={{ display: 'inline-block', background: 'rgba(255, 215, 0, 0.15)', border: '1px solid rgba(255, 215, 0, 0.4)', borderRadius: '20px', padding: '0.25rem 0.85rem', fontSize: '0.78rem', color: '#ffd700', fontWeight: 700, marginBottom: '1.25rem' }}>
                    MASTER SECRET RECOVERY VAULT
                  </div>
                  <p style={{ color: '#d1b2b8', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                    หน้านี้สงวนสิทธิ์สำหรับ <strong>SuperAdmin</strong> เท่านั้น<br />
                    หากลืมรหัสผ่าน ให้เข้าด้วยบัญชี Admin แล้วกรอก <strong>รหัสลับ 10 หลัก</strong> เพื่อปลดล็อกระบบแก้ไขรหัสผ่านและข้อมูล SuperAdmin
                  </p>
                  <form onSubmit={handleVerifySuperAdminSecret}>
                    <div style={{ position: 'relative', marginBottom: '1rem' }}>
                      <input
                        type="password"
                        className="text-input"
                        style={{
                          textAlign: 'center',
                          fontSize: '1.25rem',
                          letterSpacing: '4px',
                          padding: '0.9rem',
                          background: 'rgba(0,0,0,0.65)',
                          borderColor: superAdminSecretError ? '#ff1a40' : 'rgba(255,215,0,0.5)',
                          color: '#ffd700',
                          fontWeight: 700
                        }}
                        placeholder="กรอกรหัสลับ 10 หลัก..."
                        value={superAdminSecretInput}
                        onChange={(e) => { setSuperAdminSecretInput(e.target.value); setSuperAdminSecretError(''); }}
                        autoFocus
                      />
                    </div>
                    {superAdminSecretError && (
                      <div style={{ color: '#ff4d6d', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 700 }}>
                        ⚠️ {superAdminSecretError}
                      </div>
                    )}
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ width: '100%', justifyContent: 'center', padding: '0.9rem', fontSize: '1rem', fontWeight: 800, background: 'linear-gradient(135deg, #ffd700, #b45309)', color: '#000', border: 'none', boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)' }}
                    >
                      <IconKey size={18} />
                      <span>ยืนยันรหัสลับเพื่อปลดล็อก</span>
                    </button>
                  </form>
                </div>
              ) : (
                /* UNLOCKED SUPERADMIN EDITOR PANEL */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Top Header Card */}
                  <div style={{ background: 'linear-gradient(135deg, rgba(30, 20, 10, 0.9), rgba(20, 8, 12, 0.9))', border: '1px solid rgba(255, 215, 0, 0.4)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 0 25px rgba(255, 215, 0, 0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(255, 215, 0, 0.15)', border: '2px solid #ffd700', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', boxShadow: '0 0 20px rgba(255, 215, 0, 0.4)' }}>
                          👑
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <h2 style={{ color: '#fff', fontSize: '1.35rem', fontWeight: 900, margin: 0 }}>
                              จัดการข้อมูล & เปลี่ยนรหัสผ่าน SuperAdmin
                            </h2>
                            <span style={{ background: 'linear-gradient(135deg, #ffd700, #f59e0b)', color: '#000', fontSize: '0.72rem', fontWeight: 900, padding: '0.2rem 0.6rem', borderRadius: '20px', textTransform: 'uppercase' }}>
                              HIGHEST PRIVILEGE
                            </span>
                          </div>
                          <p style={{ color: '#d1b2b8', fontSize: '0.85rem', margin: '0.35rem 0 0', lineHeight: '1.4' }}>
                            คุณสามารถแก้รหัสผ่านของบัญชี SuperAdmin ได้เอง เปลี่ยนชื่อผู้ใช้ อีเมล หรือปรับยอดเครดิตได้ที่นี่
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                          type="button"
                          className="btn-outline"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderColor: 'rgba(255, 215, 0, 0.4)', color: '#ffd700' }}
                          onClick={() => fetchSuperAdminAccounts()}
                          disabled={isLoadingSuperAdmin}
                        >
                          🔄 {isLoadingSuperAdmin ? 'กำลังโหลด...' : 'รีเฟรชข้อมูล'}
                        </button>
                        {user?.role !== 'superadmin' && isSuperAdminUnlocked && (
                          <button
                            type="button"
                            className="btn-outline"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderColor: '#ff4d6d', color: '#ff4d6d' }}
                            onClick={handleRelockSuperAdmin}
                          >
                            🔒 ล็อกกลับทันที
                          </button>
                        )}
                      </div>
                    </div>

                    {user?.role !== 'superadmin' && isSuperAdminUnlocked && (
                      <div style={{ marginTop: '1rem', padding: '0.65rem 1rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#10b981', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>⚡</span>
                        <span>เข้าถึงด้วยรหัสลับฉุกเฉิน Master Secret เรียบร้อยแล้ว สิทธิ์นี้จะคงอยู่จนกว่าจะปิดเบราว์เซอร์หรือกด "ล็อกกลับทันที"</span>
                      </div>
                    )}
                  </div>

                  {/* Accounts List & Editor Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
                    {/* Left: Accounts List */}
                    <div style={{ background: 'rgba(20, 8, 12, 0.85)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ color: '#ffd700', fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>
                          👑 บัญชี SuperAdmin ในระบบ ({superAdminAccounts.length})
                        </h4>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {superAdminAccounts.map((sa) => {
                          const isSelected = editingSuperAdmin?.id === sa.id;
                          return (
                            <div
                              key={sa.id}
                              onClick={() => handleStartEditSuperAdmin(sa)}
                              style={{
                                padding: '1rem',
                                borderRadius: '12px',
                                border: `1px solid ${isSelected ? '#ffd700' : 'rgba(255,255,255,0.08)'}`,
                                background: isSelected ? 'rgba(255, 215, 0, 0.12)' : 'rgba(0, 0, 0, 0.3)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: isSelected ? '0 0 15px rgba(255, 215, 0, 0.2)' : 'none'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '1.2rem' }}>👑</span>
                                  <div>
                                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem' }}>
                                      {sa.username}
                                    </div>
                                    <div style={{ color: '#888', fontSize: '0.75rem' }}>
                                      ID: #{sa.id} | สิทธิ์: <span style={{ color: '#ffd700', fontWeight: 700 }}>SuperAdmin</span>
                                    </div>
                                  </div>
                                </div>
                                <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                                  ฿{Number(sa.creditBalance || 0).toLocaleString()}
                                </span>
                              </div>

                              <div style={{ fontSize: '0.8rem', color: '#b89ca2', lineHeight: '1.5' }}>
                                <div>✉️ {sa.email || 'ไม่มีอีเมล'}</div>
                                {sa.lastIp && <div style={{ fontSize: '0.75rem', color: '#888' }}>🌐 IP ล่าสุด: {sa.lastIp}</div>}
                              </div>

                              <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                                <span style={{ fontSize: '0.78rem', color: isSelected ? '#ffd700' : '#888', fontWeight: 700 }}>
                                  {isSelected ? '✓ กำลังแก้ไข' : '✏️ กดเพื่อแก้ไข'}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {superAdminAccounts.length === 0 && !isLoadingSuperAdmin && (
                          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#888', fontSize: '0.88rem' }}>
                            ไม่พบบัญชี SuperAdmin ในระบบ
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Edit Form Card */}
                    <div style={{ background: 'rgba(20, 8, 12, 0.85)', border: '1px solid rgba(255, 215, 0, 0.3)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 0 20px rgba(0,0,0,0.4)' }}>
                      {editingSuperAdmin ? (
                        <form onSubmit={handleSaveSuperAdminAccount}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '1.3rem' }}>✏️</span>
                              <div>
                                <h3 style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                                  แก้ไขข้อมูล SuperAdmin: <span style={{ color: '#ffd700' }}>{editingSuperAdmin.username}</span>
                                </h3>
                                <div style={{ color: '#888', fontSize: '0.78rem' }}>บัญชี ID #{editingSuperAdmin.id}</div>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            {/* Username */}
                            <div>
                              <label style={{ display: 'block', color: '#d1b2b8', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                                ชื่อผู้ใช้ (Username) *
                              </label>
                              <input
                                type="text"
                                className="text-input"
                                value={saEditUsername}
                                onChange={(e) => setSaEditUsername(e.target.value)}
                                required
                                placeholder="Username SuperAdmin"
                              />
                            </div>

                            {/* Email */}
                            <div>
                              <label style={{ display: 'block', color: '#d1b2b8', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                                อีเมล (Email) *
                              </label>
                              <input
                                type="email"
                                className="text-input"
                                value={saEditEmail}
                                onChange={(e) => setSaEditEmail(e.target.value)}
                                required
                                placeholder="email@example.com"
                              />
                            </div>
                          </div>

                          {/* New Password Section */}
                          <div style={{ background: 'rgba(255, 215, 0, 0.05)', border: '1px solid rgba(255, 215, 0, 0.25)', borderRadius: '12px', padding: '1.1rem', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                              <span style={{ color: '#ffd700', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>🔑</span> แก้ไขรหัสผ่านใหม่ (Password)
                              </span>
                              <button
                                type="button"
                                onClick={() => setSaShowPassword(!saShowPassword)}
                                style={{ background: 'none', border: 'none', color: '#b89ca2', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <IconEye size={14} />
                                <span>{saShowPassword ? 'ซ่อนรหัส' : 'แสดงรหัส'}</span>
                              </button>
                            </div>
                            <p style={{ color: '#b89ca2', fontSize: '0.78rem', margin: '0 0 0.85rem', lineHeight: '1.4' }}>
                              * หากไม่ต้องการเปลี่ยนรหัสผ่าน ให้เว้นว่างช่องรหัสผ่านไว้
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <div>
                                <label style={{ display: 'block', color: '#d1b2b8', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                                  รหัสผ่านใหม่
                                </label>
                                <input
                                  type={saShowPassword ? 'text' : 'password'}
                                  className="text-input"
                                  value={saEditPassword}
                                  onChange={(e) => setSaEditPassword(e.target.value)}
                                  placeholder="กรอกรหัสผ่านใหม่..."
                                  autoComplete="new-password"
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', color: '#d1b2b8', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                                  ยืนยันรหัสผ่านใหม่อีกครั้ง
                                </label>
                                <input
                                  type={saShowPassword ? 'text' : 'password'}
                                  className="text-input"
                                  value={saEditConfirmPassword}
                                  onChange={(e) => setSaEditConfirmPassword(e.target.value)}
                                  placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง..."
                                  autoComplete="new-password"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Balance */}
                          <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', color: '#d1b2b8', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                              ยอดเงินเครดิตคงเหลือ (฿ Balance)
                            </label>
                            <input
                              type="number"
                              className="text-input"
                              value={saEditBalance}
                              onChange={(e) => setSaEditBalance(Number(e.target.value))}
                              min={0}
                              step="any"
                              placeholder="0"
                            />
                          </div>

                          {/* Form Buttons */}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button
                              type="button"
                              className="btn-outline"
                              onClick={() => handleStartEditSuperAdmin(editingSuperAdmin)}
                              disabled={isSavingSuperAdmin}
                            >
                              รีเซ็ตค่า
                            </button>
                            <button
                              type="submit"
                              className="btn-primary"
                              style={{ background: 'linear-gradient(135deg, #ffd700, #b45309)', color: '#000', fontWeight: 800, padding: '0.75rem 1.75rem', border: 'none', boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)' }}
                              disabled={isSavingSuperAdmin}
                            >
                              <IconCheck size={18} />
                              <span>{isSavingSuperAdmin ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}</span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#888' }}>
                          กรุณาเลือกบัญชี SuperAdmin จากรายการด้านซ้ายเพื่อแก้ไข
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* ================= MODALS ================= */}

      {/* SECURITY WARNING MODAL (STRIKE 1 & 2 WARNING BEFORE 10-YEAR BAN) */}
      {securityWarning && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: '520px',
              border: '2px solid #ff1a40',
              boxShadow: '0 0 50px rgba(255, 26, 64, 0.6), inset 0 0 20px rgba(255, 26, 64, 0.2)',
              animation: 'fadeIn 0.25s ease-out',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'rgba(255, 26, 64, 0.25)',
                border: '2px solid #ff1a40',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '1.5rem auto 1rem',
                boxShadow: '0 0 30px rgba(255, 26, 64, 0.6)'
              }}
            >
              <IconAlertCircle size={38} color="#ff1a40" />
            </div>

            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ff4d6d', letterSpacing: '2px', textTransform: 'uppercase' }}>
              SECURITY VIOLATION WARNING
            </div>
            <h2 style={{ color: '#ffffff', fontSize: '1.45rem', fontWeight: 900, margin: '0.35rem 0 1rem' }}>
              ⚠️ คำเตือนความปลอดภัยครั้งที่ {securityWarning.strikeCount} / 3
            </h2>

            <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,26,64,0.3)', borderRadius: '12px', padding: '1rem', margin: '0 1.5rem 1.25rem', textAlign: 'left' }}>
              <div style={{ fontSize: '0.78rem', color: '#ff88a3', fontWeight: 700, marginBottom: '0.25rem' }}>
                พฤติกรรมที่ตรวจพบ:
              </div>
              <div style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 700, lineHeight: '1.4' }}>
                {securityWarning.reason}
              </div>
              <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px dashed rgba(255,255,255,0.1)', fontSize: '0.75rem', color: '#888' }}>
                📸 ข้อมูลflagของคุณถูกส่งเข้าเซิฟเวอร์เเล้ว
              </div>
            </div>

            <div style={{ padding: '0 1.5rem 1.5rem', color: '#ff88a3', fontSize: '0.88rem', lineHeight: '1.5' }}>
              🚨 <strong>คำเตือน:</strong> หากพยายามแกะโค้ดหรือเจาะระบบซ้ำครบ <strong>3 ครั้ง</strong><br />
              IP และอุปกรณ์ของคุณจะถูกแบนเป็นเวลา <strong>10 ปี 9 เดือน 9 วัน 9 ชม 9 นาที 9 วินาที</strong> ทันที!
            </div>

            <div style={{ padding: '0 1.5rem 1.5rem' }}>
              <button
                type="button"
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.85rem 1.5rem', fontSize: '0.95rem', background: 'linear-gradient(135deg, #ff1a40, #b40a1e)' }}
                onClick={() => setSecurityWarning(null)}
              >
                รับทราบและเข้าใจแล้ว (เหลือโอกาสอีก {3 - securityWarning.strikeCount} ครั้ง)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORENSIC SCREENSHOT PREVIEW MODAL */}
      {viewingScreenshotModal && (
        <div className="modal-overlay" onClick={() => setViewingScreenshotModal(null)}>
          <div className="modal-content" style={{ maxWidth: '820px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <IconEye color="#ff4d6d" size={20} />
                <span>ภาพสกรีนช็อตหลักฐาน (Forensic Screenshot #{viewingScreenshotModal.id})</span>
              </div>
              <button className="btn-close-modal" onClick={() => setViewingScreenshotModal(null)}>
                <IconX size={18} />
              </button>
            </div>
            <div style={{ padding: '1rem', background: '#0b0204', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', fontSize: '0.82rem', color: '#b89ca2' }}>
                <span>ผู้ใช้: <strong>{viewingScreenshotModal.username}</strong> | IP: <strong>{viewingScreenshotModal.ip}</strong></span>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem' }}
                  onClick={() => handleDownloadScreenshot(viewingScreenshotModal)}
                >
                  💾 ดาวน์โหลดภาพ (.jpg)
                </button>
              </div>
              <div style={{ maxHeight: '520px', overflow: 'auto', border: '1px solid rgba(255,26,64,0.3)', borderRadius: '8px' }}>
                <img
                  src={viewingScreenshotModal.screenshot || ''}
                  alt="Security Screenshot"
                  style={{ width: '100%', display: 'block', objectFit: 'contain' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORENSIC COOKIES VIEWER MODAL */}
      {viewingCookiesModal && (
        <div className="modal-overlay" onClick={() => setViewingCookiesModal(null)}>
          <div className="modal-content" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <IconShield color="#00d2ff" size={20} />
                <span>ข้อมูล Cookies ของเบราว์เซอร์เป้าหมาย (Forensic Cookies #{viewingCookiesModal.id})</span>
              </div>
              <button className="btn-close-modal" onClick={() => setViewingCookiesModal(null)}>
                <IconX size={18} />
              </button>
            </div>
            <div style={{ padding: '1.25rem', background: '#0b0204' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', fontSize: '0.82rem', color: '#b89ca2' }}>
                <span>ผู้ใช้: <strong>{viewingCookiesModal.username}</strong> | วันที่: <strong>{new Date(viewingCookiesModal.createdAt).toLocaleString('th-TH')}</strong></span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem' }}
                    onClick={() => {
                      navigator.clipboard.writeText(viewingCookiesModal.cookies || '');
                      showToast('คัดลอกคุกกี้แล้ว');
                    }}
                  >
                    <IconCopy size={13} />
                    <span>คัดลอก</span>
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem' }}
                    onClick={() => handleDownloadCookies(viewingCookiesModal)}
                  >
                    💾 ดาวน์โหลดไฟล์ (.txt)
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                className="text-input"
                style={{ height: '280px', fontFamily: 'monospace', fontSize: '0.78rem', background: 'rgba(0,0,0,0.8)', color: '#00d2ff', padding: '0.85rem', wordBreak: 'break-all' }}
                value={viewingCookiesModal.cookies || 'ไม่มีข้อมูลคุกกี้'}
              />
            </div>
          </div>
        </div>
      )}

      {/* EDIT BAN EXPIRATION MODAL */}
      {editingBanModal && (
        <div className="modal-overlay" onClick={() => setEditingBanModal(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <IconShield color="#ffaa00" size={20} />
                <span>แก้ไขระยะเวลาการแบน: {editingBanModal.identifier}</span>
              </div>
              <button className="btn-close-modal" onClick={() => setEditingBanModal(null)}>
                <IconX size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateBanExpiration} style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="input-label">ประเภทการแบน</label>
                <input
                  type="text"
                  className="text-input"
                  value={editingBanModal.banType?.toUpperCase()}
                  disabled
                  style={{ opacity: 0.7 }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="input-label">กำหนดวันหมดอายุการแบน (วัน/เดือน/ปี เวลา)</label>
                <input
                  type="datetime-local"
                  className="text-input"
                  value={editBanDateInput}
                  onChange={(e) => setEditBanDateInput(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                    onClick={() => {
                      const d = new Date();
                      d.setFullYear(d.getFullYear() + 10);
                      d.setMonth(d.getMonth() + 9);
                      d.setDate(d.getDate() + 9);
                      d.setHours(d.getHours() + 9);
                      d.setMinutes(d.getMinutes() + 9);
                      d.setSeconds(d.getSeconds() + 9);
                      setEditBanDateInput(d.toISOString().slice(0, 16));
                    }}
                  >
                    10 ปี 9 ด. 9 ว.
                  </button>
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 7);
                      setEditBanDateInput(d.toISOString().slice(0, 16));
                    }}
                  >
                    7 วัน
                  </button>
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                    onClick={() => {
                      const d = new Date();
                      d.setMonth(d.getMonth() + 1);
                      setEditBanDateInput(d.toISOString().slice(0, 16));
                    }}
                  >
                    1 เดือน
                  </button>
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', color: '#888' }}
                    onClick={() => setEditBanDateInput('')}
                  >
                    ถาวร (ไม่มีกำหนด)
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="input-label">เหตุผลในการแบน</label>
                <input
                  type="text"
                  className="text-input"
                  value={editBanReasonInput}
                  onChange={(e) => setEditBanReasonInput(e.target.value)}
                  placeholder="ระบุเหตุผล..."
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setEditingBanModal(null)}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 2, justifyContent: 'center', background: 'linear-gradient(135deg, #ffaa00, #d97706)' }}
                >
                  บันทึกการเปลี่ยนแปลง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 0. SLIP IMAGE FULL PREVIEW MODAL */}
      {viewingSlipImage && (
        <div className="modal-overlay" onClick={() => setViewingSlipImage(null)}>
          <div className="modal-content" style={{ maxWidth: '440px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <IconCheck color="#10b981" size={20} />
                <span>ภาพสลิปหลักฐานการโอนเงิน</span>
              </div>
              <button className="btn-close-modal" onClick={() => setViewingSlipImage(null)}>
                <IconX size={18} />
              </button>
            </div>
            <div style={{ padding: '1rem', background: '#0b0204', borderRadius: '0 0 16px 16px' }}>
              <img src={viewingSlipImage} alt="Slip Full" style={{ width: '100%', maxHeight: '550px', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }} />
            </div>
          </div>
        </div>
      )}

      {/* 1. STOCK KEYS POOL MANAGER MODAL */}
      {managingKeysProduct && (
        <div className="modal-overlay" onClick={() => setManagingKeysProduct(null)}>
          <div className="modal-content" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <IconKey color="#10b981" size={22} />
                <span>จัดการสต็อกคีย์: {managingKeysProduct.name}</span>
              </div>
              <button className="btn-close-modal" onClick={() => setManagingKeysProduct(null)}>
                <IconX size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Duration Tabs for the Game Group */}
              {(() => {
                const currentGroup = managingKeysGameGroup || gameGroups.find(g => g.packages.some(pkg => pkg.id === managingKeysProduct.id));
                if (!currentGroup || currentGroup.packages.length <= 1) return null;
                return (
                  <div style={{ marginBottom: '1.25rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontSize: '0.82rem', color: '#9ca3af', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IconGamepad size={15} color="#10b981" />
                      <span>เลือกแพ็กเกจระยะเวลาของ <strong>{currentGroup.title}</strong> ที่ต้องการเติมสต็อกคีย์:</span>
                    </div>
                    <div className="admin-pkg-tabs-row" style={{ margin: 0, paddingBottom: 0 }}>
                      {currentGroup.packages.map((pkg) => {
                        const isActive = managingKeysProduct.id === pkg.id;
                        const label = extractDurationLabel(pkg.name);
                        return (
                          <button
                            key={pkg.id}
                            type="button"
                            className={`admin-pkg-tab-btn ${isActive ? 'active' : ''}`}
                            onClick={() => {
                              setManagingKeysProduct(pkg);
                              setInputKeysText('');
                              fetchProductKeys(pkg.id);
                            }}
                          >
                            <span>{label}</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>({pkg.stock} คีย์)</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#b89ca2' }}>
                  สต็อกคงเหลือปัจจุบัน: <strong style={{ color: '#10b981' }}>{productKeysList.filter(k => !k.isUsed).length} คีย์</strong> (ขายแล้ว: {productKeysList.filter(k => k.isUsed).length} คีย์)
                </span>
              </div>

              {/* Add Multiple Keys Form */}
              <form onSubmit={handleAddStockKeys} style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1rem' }}>
                <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>เติมคีย์ใหม่เข้าสต็อก (วางได้หลายคีย์ 1 บรรทัด = 1 คีย์)</span>
                </label>
                <textarea
                  rows={4}
                  required
                  className="text-input"
                  placeholder={`ตัวอย่างเช่น:\nROV-KEY-123\nROV-KEY-4124\nROV-KEY-8891`}
                  value={inputKeysText}
                  onChange={(e) => setInputKeysText(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.88rem' }}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ marginTop: '0.75rem', width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  <IconPlusCircle size={16} />
                  <span>เติมคีย์เข้าสต็อกทันที (+ เพิ่มคีย์)</span>
                </button>
              </form>

              {/* List of Keys in Pool */}
              <h4 style={{ fontSize: '0.95rem', color: '#ff4d6d', marginBottom: '0.75rem' }}>รายการคีย์ทั้งหมดในระบบ:</h4>
              {productKeysList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#7a6368' }}>
                  ยังไม่มีคีย์ในสต็อก กรุณากรอกคีย์ด้านบนเพื่อเติมสินค้า
                </div>
              ) : (
                <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {productKeysList.map((k, idx) => (
                    <div
                      key={k.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.85rem',
                        background: k.isUsed ? 'rgba(0,0,0,0.4)' : 'rgba(16,185,129,0.08)',
                        border: `1px solid ${k.isUsed ? 'rgba(255,255,255,0.05)' : 'rgba(16,185,129,0.3)'}`,
                        borderRadius: '8px',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: '#7a6368', fontSize: '0.75rem' }}>#{idx + 1}</span>
                        <code style={{ color: k.isUsed ? '#888' : '#10b981', fontWeight: 700 }}>{k.keyString}</code>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {k.isUsed ? (
                          <span style={{ fontSize: '0.72rem', color: '#ff6b8b' }}>
                            ขายแล้ว ({k.usedBy})
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#10b981', background: 'rgba(16,185,129,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                            พร้อมขาย
                          </span>
                        )}

                        {!k.isUsed && (
                          <button
                            className="btn-outline"
                            style={{ padding: '0.25rem 0.4rem', color: '#ff3333' }}
                            title="ลบคีย์นี้"
                            onClick={() => handleDeleteKey(k.id)}
                          >
                            <IconTrash size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. AUTH MODAL (LOGIN / REGISTER / FORGOT OTP) WITH ANIMATED RGB BORDER */}
      {authModalOpen && (
        <div className="modal-overlay" onClick={() => setAuthModalOpen(false)}>
          <div className="modal-rgb-border-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="modal-rgb-inner">
              <div className="modal-header">
                <div className="modal-title">
                  <IconLock color="#ff1a40" size={20} />
                  <span>
                    {authTab === 'login' && 'เข้าสู่ระบบ'}
                    {authTab === 'register' && 'สมัครสมาชิกใหม่'}
                    {authTab === 'forgot' && 'กู้คืนรหัสผ่านด้วย OTP'}
                  </span>
                </div>
                <button className="btn-close-modal" onClick={() => setAuthModalOpen(false)}>
                  <IconX size={18} />
                </button>
              </div>

              <div className="modal-body">
                {/* Mode Selector */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                  <button
                    type="button"
                    className={`tab-btn ${authTab === 'login' ? 'active' : ''}`}
                    onClick={() => setAuthTab('login')}
                  >
                    เข้าสู่ระบบ
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${authTab === 'register' ? 'active' : ''}`}
                    onClick={() => setAuthTab('register')}
                  >
                    สมัครสมาชิก
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${authTab === 'forgot' ? 'active' : ''}`}
                    onClick={() => setAuthTab('forgot')}
                  >
                    ลืมรหัสผ่าน?
                  </button>
                </div>

                {/* LOGIN FORM */}
                {authTab === 'login' && (
                  <form onSubmit={handleLogin}>
                    <div className="input-field-group">
                      <label className="input-label">ชื่อผู้ใช้ (Username)</label>
                      <input
                        type="text"
                        required
                        className="text-input"
                        placeholder="กรอกชื่อผู้ใช้ของคุณ"
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value)}
                      />
                    </div>

                    <div className="input-field-group">
                      <label className="input-label">รหัสผ่าน (Password)</label>
                      <input
                        type="password"
                        required
                        className="text-input"
                        placeholder="กรอกรหัสผ่านของคุณ"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                      />
                    </div>

                    <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                      เข้าสู่ระบบ
                    </button>
                  </form>
                )}

                {/* REGISTER FORM */}
                {authTab === 'register' && (
                  <form onSubmit={handleRegister}>
                    <div className="input-field-group">
                      <label className="input-label">ชื่อผู้ใช้ (Username)</label>
                      <input
                        type="text"
                        required
                        className="text-input"
                        placeholder="ตั้งชื่อผู้ใช้ของคุณ"
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value)}
                      />
                    </div>

                    <div className="input-field-group">
                      <label className="input-label">อีเมล (Gmail)</label>
                      <input
                        type="email"
                        required
                        className="text-input"
                        placeholder="yourname@gmail.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                      />
                    </div>

                    <div className="input-field-group">
                      <label className="input-label">รหัสผ่าน (Password)</label>
                      <input
                        type="password"
                        required
                        className="text-input"
                        placeholder="••••••••"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                      />
                    </div>

                    <div className="input-field-group">
                      <label className="input-label">ยืนยันรหัสผ่าน (Confirm Password)</label>
                      <input
                        type="password"
                        required
                        className="text-input"
                        placeholder="••••••••"
                        value={authConfirmPass}
                        onChange={(e) => setAuthConfirmPass(e.target.value)}
                      />
                    </div>

                    <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                      ยืนยันการสมัครสมาชิก
                    </button>
                  </form>
                )}

                {/* FORGOT PASSWORD */}
                {authTab === 'forgot' && (
                  <form onSubmit={handleResetPassword}>
                    <div className="input-field-group">
                      <label className="input-label">ระบุ Gmail ของคุณเพื่อรับ OTP</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="email"
                          required
                          className="text-input"
                          placeholder="yourname@gmail.com"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn-outline"
                          style={{ whiteSpace: 'nowrap' }}
                          onClick={handleRequestOtp}
                          disabled={otpCountdown > 0}
                        >
                          {otpCountdown > 0 ? `รอ (${otpCountdown}s)` : 'ขอรหัส OTP'}
                        </button>
                      </div>
                    </div>

                    {otpSent && (
                      <>
                        <div className="input-field-group">
                          <label className="input-label">รหัส OTP (6 หลัก)</label>
                          <input
                            type="text"
                            required
                            className="text-input"
                            placeholder="ระบุรหัส OTP ที่ได้รับ"
                            value={forgotOtp}
                            onChange={(e) => setForgotOtp(e.target.value)}
                          />
                        </div>

                        <div className="input-field-group">
                          <label className="input-label">รหัสผ่านใหม่ (New Password)</label>
                          <input
                            type="password"
                            required
                            className="text-input"
                            placeholder="••••••••"
                            value={forgotNewPass}
                            onChange={(e) => setForgotNewPass(e.target.value)}
                          />
                        </div>

                        <div className="input-field-group">
                          <label className="input-label">ยืนยันรหัสผ่านใหม่ (Confirm Password)</label>
                          <input
                            type="password"
                            required
                            className="text-input"
                            placeholder="••••••••"
                            value={forgotConfirmPass}
                            onChange={(e) => setForgotConfirmPass(e.target.value)}
                          />
                        </div>

                        <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                          บันทึกรหัสผ่านใหม่
                        </button>
                      </>
                    )}
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. SHOPPING CART DRAWER / MODAL */}
      {showCartModal && (
        <div className="modal-overlay" onClick={() => setShowCartModal(false)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <IconCart color="#ff1a40" size={22} />
                <span>ตะกร้าสินค้าของคุณ ({cart.length} รายการ)</span>
              </div>
              <button className="btn-close-modal" onClick={() => setShowCartModal(false)}>
                <IconX size={18} />
              </button>
            </div>

            <div className="modal-body">
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: '#7a6368' }}>
                  <IconCart size={45} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                  <p>ไม่มีสินค้าในตะกร้า</p>
                </div>
              ) : (
                <>
                  <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1.25rem' }}>
                    {cart.map((item) => (
                      <div key={item.product.id} className="cart-item-row">
                        <img
                          src={item.product.image}
                          alt=""
                          style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'cover' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.product.name}</div>
                          <div style={{ color: '#ff4d6d', fontSize: '0.85rem' }}>฿{item.product.price} / ชิ้น</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div className="cart-qty-ctrl">
                            <button className="btn-qty" onClick={() => updateCartQty(item.product.id, -1)}>-</button>
                            <span>{item.quantity}</span>
                            <button className="btn-qty" onClick={() => updateCartQty(item.product.id, 1)}>+</button>
                          </div>
                          <button
                            className="btn-outline"
                            style={{ padding: '0.35rem', color: '#ff3333' }}
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <IconTrash size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Coupon Input Box */}
                  <div className="coupon-box" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '0.85rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.82rem', color: '#ff4d6d', fontWeight: 600, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IconTag size={15} />
                      <span>โค้ดส่วนลด (Coupon Code)</span>
                    </div>

                    {appliedCoupon ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                        <div>
                          <strong style={{ color: '#10b981', fontSize: '0.9rem' }}>{appliedCoupon.code}</strong>
                          <span style={{ fontSize: '0.8rem', color: '#b89ca2', marginLeft: '8px' }}>
                            (ลด {appliedCoupon.discountType === 'fixed' ? `฿${appliedCoupon.discountValue}` : `${appliedCoupon.discountValue}%`})
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn-outline"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: '#ff3333' }}
                          onClick={handleRemoveCoupon}
                        >
                          ยกเลิก
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          className="text-input"
                          style={{ margin: 0, padding: '0.45rem 0.75rem', textTransform: 'uppercase', fontFamily: 'monospace' }}
                          placeholder="กรอกโค้ดส่วนลด เช่น ROV20"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        />
                        <button
                          type="button"
                          className="btn-outline"
                          style={{ whiteSpace: 'nowrap', padding: '0.45rem 0.85rem' }}
                          onClick={() => handleApplyCoupon(cartTotal)}
                        >
                          ใช้โค้ด
                        </button>
                      </div>
                    )}

                    {couponMsg && (
                      <div style={{ fontSize: '0.75rem', marginTop: '0.35rem', color: couponMsg.type === 'success' ? '#10b981' : '#ff3333' }}>
                        {couponMsg.text}
                      </div>
                    )}
                  </div>

                  {/* Pricing Breakdown */}
                  <div style={{ padding: '0.75rem 0', borderTop: '1px solid var(--border-subtle)', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.9rem', color: '#b89ca2' }}>
                      <span>ยอดรวมสินค้า:</span>
                      <span>฿{cartTotal.toLocaleString()}</span>
                    </div>

                    {appliedCoupon && couponDiscount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.9rem', color: '#10b981', fontWeight: 600 }}>
                        <span>ส่วนลดจากคูปอง ({appliedCoupon.code}):</span>
                        <span>-฿{couponDiscount.toLocaleString()}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-subtle)' }}>
                      <span style={{ fontSize: '1rem', color: '#fff', fontWeight: 700 }}>ยอดชำระสุทธิ:</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ff1a40' }}>
                        ฿{Math.max(0, cartTotal - couponDiscount).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <button
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => {
                      if (!user) {
                        setShowCartModal(false);
                        showToast('กรุณาเข้าสู่ระบบก่อนดำเนินการสั่งซื้อ');
                        setAuthTab('login');
                        setAuthModalOpen(true);
                        return;
                      }
                      setShowCartModal(false);
                      setShowConfirm2Step(true);
                    }}
                  >
                    ดำเนินการสั่งซื้อ (กดยืนยัน 2 ชั้น)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. 2-STEP PURCHASE CONFIRMATION MODAL */}
      {(showConfirm2Step || showDirectBuyConfirm) && (() => {
        const subtotal = showDirectBuyConfirm ? (showDirectBuyConfirm.price * directBuyQuantity) : cartTotal;
        const discount = appliedCoupon ? couponDiscount : 0;
        const netToPay = Math.max(0, subtotal - discount);

        return (
          <div className="modal-overlay" onClick={() => { setShowConfirm2Step(false); setShowDirectBuyConfirm(null); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">
                  <IconAlertCircle color="#ff1a40" size={24} />
                  <span>ยืนยันการสั่งซื้อ (ขั้นตอนยืนยัน 2 ชั้น)</span>
                </div>
                <button className="btn-close-modal" onClick={() => { setShowConfirm2Step(false); setShowDirectBuyConfirm(null); }}>
                  <IconX size={18} />
                </button>
              </div>

              <div className="modal-body">
                <p style={{ color: '#b89ca2', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                  ระบบจะดึงคีย์จริงออกจากสต็อกตามจำนวนที่สั่งซื้อ ตัดยอดเครดิต และแสดงคีย์พร้อมปุ่มดาวน์โหลดทันที:
                </p>

                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
                  {showDirectBuyConfirm ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{showDirectBuyConfirm.name} (x{directBuyQuantity})</strong>
                      <span style={{ color: '#ff4d6d', fontWeight: 700 }}>฿{(showDirectBuyConfirm.price * directBuyQuantity).toLocaleString()}</span>
                    </div>
                  ) : (
                    cart.map((i) => (
                      <div key={i.product.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span>{i.product.name} (x{i.quantity})</span>
                        <span style={{ color: '#ff4d6d' }}>฿{(i.product.price * i.quantity).toLocaleString()}</span>
                      </div>
                    ))
                  )}

                  {appliedCoupon && discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 600, marginTop: '0.4rem' }}>
                      <span>ส่วนลดคูปอง ({appliedCoupon.code}):</span>
                      <span>-฿{discount.toLocaleString()}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                    <strong>ยอดที่ต้องชำระสุทธิ:</strong>
                    <strong style={{ color: '#ff1a40', fontSize: '1.2rem' }}>
                      ฿{netToPay.toLocaleString()}
                    </strong>
                  </div>
                </div>

                {/* Direct buy coupon code box if not yet applied */}
                {showDirectBuyConfirm && !appliedCoupon && (
                  <div style={{ marginBottom: '1.25rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.8rem', color: '#b89ca2', marginBottom: '4px' }}>มีคูปองส่วนลดหรือไม่?</div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input
                        type="text"
                        className="text-input"
                        style={{ margin: 0, padding: '0.4rem 0.6rem', fontSize: '0.85rem', textTransform: 'uppercase' }}
                        placeholder="กรอกรหัสคูปอง"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      />
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', whiteSpace: 'nowrap' }}
                        onClick={() => handleApplyCoupon(subtotal)}
                      >
                        ใช้คูปอง
                      </button>
                    </div>
                    {couponMsg && (
                      <div style={{ fontSize: '0.72rem', marginTop: '4px', color: couponMsg.type === 'success' ? '#10b981' : '#ff3333' }}>
                        {couponMsg.text}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ fontSize: '0.85rem', color: '#b89ca2', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                  <div>ยอดเงินของคุณปัจจุบัน: <strong>฿{user?.balance.toLocaleString() || 0}</strong></div>
                  <div>ยอดเงินคงเหลือหลังสั่งซื้อ: <strong style={{ color: (user?.balance || 0) >= netToPay ? '#10b981' : '#ff3333' }}>฿{((user?.balance || 0) - netToPay).toLocaleString()}</strong></div>
                  {(user?.balance || 0) < netToPay && (
                    <div style={{ color: '#ff3333', fontSize: '0.8rem', marginTop: '4px' }}>
                      ⚠️ ยอดเงินในบัญชีของคุณไม่เพียงพอ กรุณาเติมเงินก่อนทำรายการ
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    className="btn-outline"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => { setShowConfirm2Step(false); setShowDirectBuyConfirm(null); setDirectBuyQuantity(1); }}
                  >
                    ยกเลิก
                  </button>
                  <button
                    className="btn-primary"
                    style={{ flex: 2, justifyContent: 'center' }}
                    onClick={() => {
                      if (!user) {
                        setShowConfirm2Step(false);
                        setShowDirectBuyConfirm(null);
                        showToast('กรุณาเข้าสู่ระบบก่อนทำการสั่งซื้อ');
                        setAuthTab('login');
                        setAuthModalOpen(true);
                        return;
                      }
                      if (showDirectBuyConfirm) {
                        executePurchase([{ productId: showDirectBuyConfirm.id, quantity: directBuyQuantity }]);
                      } else {
                        executePurchase(cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })));
                      }
                    }}
                  >
                    ยืนยันการชำระเงินทันที
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}


      
      
      {/* GAME BANNER & META CUSTOMIZER MODAL */}
      {editingGameMeta && (
        <div className="modal-overlay" onClick={() => setEditingGameMeta(null)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IconEdit color="#ff1a40" size={20} />
                <span>ตั้งค่ารูปภาพพื้นหลัง & ข้อมูลเกม: {editingGameMeta.title}</span>
              </div>
              <button className="btn-close-modal" onClick={() => setEditingGameMeta(null)}>
                <IconX size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveGameMeta} className="modal-body">
              {/* Preview Banner */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="input-label" style={{ marginBottom: '6px' }}>รูปภาพพื้นหลัง / แบนเนอร์ด้านบน (Banner Image):</label>
                <div style={{ width: '100%', height: '140px', borderRadius: '12px', overflow: 'hidden', background: '#111', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '8px' }}>
                  <img
                    src={gameBannerInput || editingGameMeta.bannerImage}
                    alt="Banner Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800';
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="URL รูปแบนเนอร์ (https://...)"
                    value={gameBannerInput}
                    onChange={(e) => setGameBannerInput(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <label className="btn-outline" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                    <IconUpload size={14} />
                    <span>อัปโหลดรูป</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileUpload(e, (url) => setGameBannerInput(url))}
                    />
                  </label>
                </div>
              </div>

              {/* Preview Icon */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="input-label" style={{ marginBottom: '6px' }}>รูปไอคอนเกม (Game Icon):</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={gameIconInput || editingGameMeta.image}
                    alt="Icon Preview"
                    style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.15)' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100';
                    }}
                  />
                  <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="URL รูปไอคอน (https://...)"
                      value={gameIconInput}
                      onChange={(e) => setGameIconInput(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <label className="btn-outline" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                      <IconUpload size={14} />
                      <span>อัปโหลด</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileUpload(e, (url) => setGameIconInput(url))}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="input-label" style={{ marginBottom: '6px' }}>คำอธิบาย / จุดเด่นของเกมนี้ (แสดงในการ์ด):</label>
                <textarea
                  rows={3}
                  className="text-input"
                  placeholder="เช่น [+] มอง ESP [+] ล็อคเป้า [+] กันแบน 100%"
                  value={gameDescInput}
                  onChange={(e) => setGameDescInput(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setEditingGameMeta(null)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 2, justifyContent: 'center', background: 'linear-gradient(135deg, #ff1a40, #d90429)' }}>
                  <IconCheck size={16} />
                  <span>บันทึกรูปภาพ & ข้อมูลเกม</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GAME PACKAGE SELECTION MODAL (fahbtc.online style) */}
      {selectedGameGroup && (
        <div className="modal-overlay" onClick={() => setSelectedGameGroup(null)}>
          <div className="modal-content game-package-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={selectedGameGroup.image}
                  alt=""
                  style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.15)' }}
                />
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>{selectedGameGroup.title}</div>
                  <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>เลือกระยะเวลาการใช้งานที่ต้องการ ({selectedGameGroup.packages.length} แพ็กเกจ)</div>
                </div>
              </div>
              <button className="btn-close-modal" onClick={() => setSelectedGameGroup(null)}>
                <IconX size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Duration Options */}
              <label className="input-label" style={{ marginBottom: '8px', color: '#cbd5e1' }}>
                เลือกระยะเวลาการใช้งาน:
              </label>
              <div className="package-tiers-grid">
                {selectedGameGroup.packages.map((pkg) => {
                  const isSelected = selectedPackageTier?.id === pkg.id;
                  const isOut = (pkg.stock || 0) <= 0;
                  const durationLabel = extractDurationLabel(pkg.name);
                  return (
                    <div
                      key={pkg.id}
                      className={`package-tier-item ${isSelected ? 'selected' : ''} ${isOut ? 'out' : ''}`}
                      onClick={() => {
                        setSelectedPackageTier(pkg);
                        setPackageQty(1);
                      }}
                    >
                      <div className="tier-radio-col">
                        <span className={`tier-radio-dot ${isSelected ? 'active' : ''}`} />
                      </div>
                      <div className="tier-info-col">
                        <div className="tier-name">{durationLabel}</div>
                        <div className="tier-subname">{pkg.name}</div>
                      </div>
                      <div className="tier-price-col">
                        <div className="tier-price">฿{pkg.price.toFixed(2)}</div>
                        <div className={`tier-stock ${isOut ? 'out' : ''}`}>
                          {isOut ? 'สินค้าหมด' : `พร้อมส่ง ${pkg.stock} คีย์`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Package Details */}
              {selectedPackageTier && (
                <div className="selected-tier-detail-box">
                  <div className="tier-detail-desc">
                    <span style={{ color: '#9ca3af', fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>รายละเอียดแพ็กเกจนี้:</span>
                    <p style={{ margin: 0, fontSize: '0.86rem', color: '#e5e7eb', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                      {selectedPackageTier.description || 'โปรเกมระบบ VIP คุณภาพสูง เสถียร ปลอดภัย 100%'}
                    </p>
                  </div>

                  {/* Quantity Counter if in stock */}
                  {selectedPackageTier.stock > 0 && (
                    <div className="tier-qty-row">
                      <span style={{ fontSize: '0.88rem', color: '#cbd5e1' }}>จำนวนที่ต้องการ:</span>
                      <div className="qty-counter">
                        <button type="button" onClick={() => setPackageQty(Math.max(1, packageQty - 1))}>-</button>
                        <span>{packageQty}</span>
                        <button type="button" onClick={() => setPackageQty(Math.min(selectedPackageTier.stock, packageQty + 1))}>+</button>
                      </div>
                      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>รวมทั้งสิ้น: </span>
                        <strong style={{ fontSize: '1.2rem', color: '#60a5fa' }}>฿{(selectedPackageTier.price * packageQty).toFixed(2)}</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-outline"
                  disabled={!selectedPackageTier || selectedPackageTier.stock <= 0}
                  style={{ flex: 1, padding: '12px' }}
                  onClick={() => {
                    if (!user) {
                      showToast('กรุณาเข้าสู่ระบบก่อนเลือกซื้อสินค้า');
                      setAuthTab('login');
                      setAuthModalOpen(true);
                      return;
                    }
                    if (selectedPackageTier) {
                      for (let i = 0; i < packageQty; i++) {
                        addToCart(selectedPackageTier);
                      }
                      showToast(`เพิ่ม ${selectedPackageTier.name} (${packageQty} ชิ้น) ลงตะกร้าแล้ว`);
                      setSelectedGameGroup(null);
                    }
                  }}
                >
                  <IconCart size={18} />
                  <span>เพิ่มลงตะกร้า</span>
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  disabled={!selectedPackageTier || selectedPackageTier.stock <= 0}
                  style={{ flex: 2, justifyContent: 'center', padding: '12px', background: 'linear-gradient(135deg, #ff1a40, #d90429)', boxShadow: '0 4px 18px rgba(255, 26, 64, 0.45)' }}
                  onClick={() => {
                    if (!user) {
                      showToast('กรุณาเข้าสู่ระบบก่อนสั่งซื้อสินค้า');
                      setAuthTab('login');
                      setAuthModalOpen(true);
                      return;
                    }
                    if (selectedPackageTier) {
                      setDirectBuyQuantity(packageQty);
                      setShowDirectBuyConfirm(selectedPackageTier);
                      setSelectedGameGroup(null);
                    }
                  }}
                >
                  <span>{selectedPackageTier && selectedPackageTier.stock <= 0 ? 'สินค้านี้หมดสต็อก' : 'เช่าทันที (Buy Now)'}</span>
                  <IconArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

{/* 4.5 PRODUCT DETAIL MODAL (Cyberpunk Deep Crimson Layer) */}
      {selectedProductDetail && (
        <div className="modal-overlay" onClick={() => setSelectedProductDetail(null)}>
          <div className="modal-content detail-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <IconSparkles color="#ff1a40" size={20} />
                <span>รายละเอียดสินค้า</span>
              </div>
              <button className="btn-close-modal" onClick={() => setSelectedProductDetail(null)}>
                <IconX size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-layout-grid">
                {/* Left Media Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div className="detail-media-card">
                    <img
                      src={selectedProductDetail.image}
                      alt={selectedProductDetail.name}
                      className="detail-media-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400';
                      }}
                    />
                    {selectedProductDetail.badge && (
                      <div className="detail-badge-pill">
                        {selectedProductDetail.badge}
                      </div>
                    )}
                  </div>

                  <div
                    className="detail-stock-indicator"
                    style={{
                      color: selectedProductDetail.stock > 0 ? '#00e676' : '#ff3333',
                      borderColor: selectedProductDetail.stock > 0 ? 'rgba(0, 230, 118, 0.3)' : 'rgba(255, 51, 51, 0.3)'
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: selectedProductDetail.stock > 0 ? '#00e676' : '#ff3333',
                        boxShadow: selectedProductDetail.stock > 0 ? '0 0 8px #00e676' : '0 0 8px #ff3333'
                      }}
                    />
                    <span>
                      {selectedProductDetail.stock > 0
                        ? `มีสินค้าในสต็อก ${selectedProductDetail.stock} ชิ้น (พร้อมส่ง)`
                        : 'สินค้าหมดชั่วคราว'}
                    </span>
                  </div>
                </div>

                {/* Right Info Section */}
                <div className="detail-info-col">
                  <div className="detail-category-tag">
                    หมวดหมู่: {selectedProductDetail.categoryId}
                  </div>
                  <h2 className="detail-product-title">{selectedProductDetail.name}</h2>

                  {/* Price */}
                  <div className="detail-price-strip">
                    <div className="detail-price-main">
                      <span style={{ fontSize: '1.1rem', marginRight: 2 }}>฿</span>
                      {selectedProductDetail.price.toLocaleString()}
                    </div>
                    {selectedProductDetail.originalPrice && selectedProductDetail.originalPrice > selectedProductDetail.price && (
                      <>
                        <span className="detail-price-old">
                          ฿{selectedProductDetail.originalPrice.toLocaleString()}
                        </span>
                        <span className="detail-discount-tag">
                          ประหยัด ฿{(selectedProductDetail.originalPrice - selectedProductDetail.price).toLocaleString()}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Trust guarantees */}
                  <div className="detail-trust-grid">
                    <div className="detail-trust-item">
                      <IconZap size={14} color="#ff1a40" />
                      <span>ส่งคีย์ออโต้ 3 วิ</span>
                    </div>
                    <div className="detail-trust-item">
                      <IconDownload size={14} color="#00e676" />
                      <span>มีลิงก์โหลดตัวเกม</span>
                    </div>
                    <div className="detail-trust-item">
                      <IconShield size={14} color="#3b82f6" />
                      <span>ประกันคีย์แท้ 100%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Description Box */}
              <div className="detail-desc-card">
                <div className="detail-desc-title">
                  <IconFileText size={16} color="#ff4d6d" />
                  <span>ข้อมูลรายละเอียดสินค้า</span>
                </div>
                <div className="detail-desc-body">
                  {selectedProductDetail.description || 'ไม่มีข้อมูลรายละเอียดเพิ่มเติมสำหรับสินค้านี้'}
                </div>
              </div>

              {/* Quantity Selector & Subtotal */}
              <div className="detail-qty-row">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>จำนวนที่ต้องการ:</span>
                  <span style={{ fontSize: '0.78rem', color: '#ff4d6d' }}>
                    ราคารวม: ฿{(selectedProductDetail.price * detailQty).toLocaleString()} บาท
                  </span>
                </div>

                <div className="detail-qty-btns">
                  <button
                    className="btn-qty"
                    disabled={detailQty <= 1}
                    onClick={() => setDetailQty((q) => Math.max(1, q - 1))}
                  >
                    <IconMinus size={14} />
                  </button>
                  <span className="qty-number">{detailQty}</span>
                  <button
                    className="btn-qty"
                    disabled={detailQty >= selectedProductDetail.stock}
                    onClick={() => setDetailQty((q) => Math.min(selectedProductDetail.stock, q + 1))}
                  >
                    <IconPlus size={14} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="detail-actions-row">
                <button
                  className="btn-outline"
                  disabled={selectedProductDetail.stock <= 0}
                  style={{
                    padding: '0.75rem 1rem',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    opacity: selectedProductDetail.stock <= 0 ? 0.4 : 1
                  }}
                  onClick={() => {
                    if (!user) {
                      setSelectedProductDetail(null);
                      showToast('กรุณาเข้าสู่ระบบก่อนเลือกซื้อสินค้า');
                      setAuthTab('login');
                      setAuthModalOpen(true);
                      return;
                    }
                    addToCart(selectedProductDetail, detailQty);
                    setSelectedProductDetail(null);
                  }}
                >
                  <IconCart size={18} />
                  <span>เพิ่มลงตะกร้า ({detailQty})</span>
                </button>

                <button
                  className="btn-buy"
                  disabled={selectedProductDetail.stock <= 0}
                  style={{
                    padding: '0.75rem 1rem',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.95rem',
                    opacity: selectedProductDetail.stock <= 0 ? 0.4 : 1
                  }}
                  onClick={() => {
                    if (!user) {
                      setSelectedProductDetail(null);
                      showToast('กรุณาเข้าสู่ระบบก่อนทำการสั่งซื้อสินค้า');
                      setAuthTab('login');
                      setAuthModalOpen(true);
                      return;
                    }
                    if (selectedProductDetail.stock <= 0) {
                      showToast('สินค้านี้หมดสต็อกชั่วคราว');
                      return;
                    }
                    setDirectBuyQuantity(detailQty);
                    setShowDirectBuyConfirm(selectedProductDetail);
                    setSelectedProductDetail(null);
                  }}
                >
                  <span>{selectedProductDetail.stock <= 0 ? 'สินค้าหมด' : '⚡ สั่งซื้อทันที'}</span>
                  {selectedProductDetail.stock > 0 && <IconArrowRight size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TOP-UP MODAL (BANK TRANSFER + SLIP, ANGPAO, GIFT CODE) */}
      {showAngpaoModal && user && (
        <div className="modal-overlay" onClick={() => setShowAngpaoModal(false)}>
          <div className="modal-content topup-modal-content" style={{ maxWidth: '560px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <IconWallet color="#10b981" size={22} />
                <span>ระบบเติมเงินอัตโนมัติ (Top-Up Balance)</span>
              </div>
              <button className="btn-close-modal" onClick={() => setShowAngpaoModal(false)}>
                <IconX size={18} />
              </button>
            </div>

            <div className="modal-body" ref={topupBodyRef} style={{ overflowY: 'auto', flex: 1, padding: '1.25rem' }}>
              {/* Tab Selector */}
              <div className="topup-tabs">
                <button
                  type="button"
                  className={`topup-tab-btn ${topupTab === 'bank' ? 'active' : ''}`}
                  onClick={() => setTopupTab('bank')}
                >
                  <IconCreditCard size={16} />
                  <span>โอนธนาคาร & สลิป</span>
                </button>
                <button
                  type="button"
                  className={`topup-tab-btn ${topupTab === 'angpao' ? 'active' : ''}`}
                  onClick={() => setTopupTab('angpao')}
                >
                  <IconGift size={16} />
                  <span>ซองอั่งเปา TrueMoney</span>
                </button>
                <button
                  type="button"
                  className={`topup-tab-btn ${topupTab === 'giftcode' ? 'active' : ''}`}
                  onClick={() => setTopupTab('giftcode')}
                >
                  <IconTag size={16} />
                  <span>โค้ดเครดิตฟรี</span>
                </button>
                <button
                  type="button"
                  className={`topup-tab-btn ${topupTab === 'history' ? 'active' : ''}`}
                  onClick={() => {
                    setTopupTab('history');
                    fetchUserTopupHistory();
                  }}
                >
                  <IconClock size={16} />
                  <span>ประวัติเติมเงิน</span>
                </button>
              </div>

              {/* TAB 1: BANK TRANSFER & SLIP VERIFICATION */}
              {topupTab === 'bank' && (
                <div>
                  {/* Step 1: Input Amount */}
                  <div className="input-field-group">
                    <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>1. ระบุจำนวนเงินที่ต้องการเติม (฿ บาท)</span>
                      <strong style={{ color: '#10b981' }}>฿{Number(bankAmount || 0).toLocaleString()}</strong>
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="text-input"
                      style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}
                      placeholder="ระบุจำนวนเงิน เช่น 100"
                      value={bankAmount || ''}
                      onChange={(e) => setBankAmount(Number(e.target.value))}
                    />

                    {/* Quick Amount Buttons */}
                    <div className="quick-amount-grid">
                      {[50, 100, 300, 500, 1000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          className={`quick-amount-btn ${bankAmount === amt ? 'selected' : ''}`}
                          onClick={() => setBankAmount(amt)}
                        >
                          ฿{amt.toLocaleString()}
                        </button>
                      ))}
                    </div>

                    {/* Primary Action: Confirm & Generate 30-min Dynamic Single-Use QR */}
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleCreateQrOrder(bankAmount)}
                      disabled={generatingQr || !bankAmount || bankAmount < 1}
                      style={{
                        width: '100%',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #00e676, #00b0ff)',
                        color: '#050c14',
                        fontSize: '1rem',
                        fontWeight: 800,
                        padding: '0.9rem 1.25rem',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(0, 230, 118, 0.4)',
                        cursor: (generatingQr || !bankAmount || bankAmount < 1) ? 'not-allowed' : 'pointer',
                        marginTop: '0.85rem',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <IconQrCode size={20} />
                      <span>{generatingQr ? 'กำลังสร้าง QR Code...' : `⚡ ยืนยัน / สร้าง QR ชำระเงิน ฿${Number(bankAmount || 0).toLocaleString()} (ใช้ครั้งเดียว 30 นาที)`}</span>
                    </button>
                  </div>

                  <div style={{ textAlign: 'center', margin: '0.75rem 0', color: '#7a6368', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                    <span>หรือ โอนเข้าเลขที่บัญชีธนาคารโดยตรง</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                  </div>

                  {/* Step 2: Bank Account Details Card */}
                  <div className="bank-info-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="bank-icon-badge">🏦</div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>
                            {siteSettings.bank_name || 'ธนาคารกสิกรไทย (KBank)'}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#b89ca2' }}>
                            ชื่อบัญชี: {siteSettings.bank_account_name || 'บจก. คีย์ช็อป ดิจิทัล'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bank-account-strip">
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#7a6368' }}>เลขที่บัญชี:</div>
                        <div className="bank-acc-num">
                          {siteSettings.bank_account_number || '123-4-56789-0'}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-copy-acc"
                        onClick={() => {
                          navigator.clipboard.writeText(siteSettings.bank_account_number?.replace(/-/g, '') || '');
                          showToast('คัดลอกเลขที่บัญชีแล้ว');
                        }}
                      >
                        <IconCopy size={14} />
                        <span>คัดลอก</span>
                      </button>
                    </div>

                    {/* PromptPay Info Strip */}
                    {siteSettings.promptpay_number && (
                      <div className="bank-qr-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'rgba(0, 230, 118, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <IconQrCode size={20} color="#00e676" />
                          </div>
                          <div>
                            <div style={{ color: '#00e676', fontWeight: 700, fontSize: '0.88rem' }}>
                              พร้อมเพย์ (PromptPay)
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 700 }}>
                              {siteSettings.promptpay_number}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-copy-acc"
                          onClick={() => {
                            navigator.clipboard.writeText(siteSettings.promptpay_number?.replace(/-/g, '') || '');
                            showToast('คัดลอกเบอร์พร้อมเพย์แล้ว');
                          }}
                        >
                          <IconCopy size={14} />
                          <span>คัดลอก</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Step 3: Slip Upload & Submission */}
                  <form onSubmit={handleBankSlipSubmit}>
                    <div className="input-field-group">
                      <label className="input-label" style={{ color: '#ff4d6d', fontWeight: 700 }}>
                        2. แนบรูปสลิปหลักฐานการโอนเงิน (Slip Verification & ป้องกันสลิปซ้ำ)
                      </label>

                      <div className="slip-upload-area">
                        {bankSlipImage ? (
                          <div className="slip-preview-box">
                            <img src={bankSlipImage} alt="Slip" className="slip-preview-img" />

                            {/* Scanned Slip Bank & TransRef Badge */}
                            {detectedSlipBank && (
                              <div style={{ marginTop: '0.6rem', padding: '0.6rem 0.8rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '8px', fontSize: '0.8rem', textAlign: 'left', width: '100%' }}>
                                <div style={{ color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <IconCheck size={15} /> ตรวจพบ QR Code สลิปธนาคาร
                                </div>
                                <div style={{ color: '#fff', marginTop: '3px' }}>ธนาคาร: <strong>{detectedSlipBank}</strong></div>
                                {detectedSlipTransRef && <div style={{ color: '#b89ca2', fontSize: '0.75rem', marginTop: '2px' }}>รหัสอ้างอิงธุรกรรม (TransRef): <code style={{ color: '#ffb703' }}>{detectedSlipTransRef}</code></div>}
                                {detectedSlipAmount ? (
                                  <div style={{ color: '#00e676', fontWeight: 700, marginTop: '3px' }}>
                                    💰 ยอดเงินในสลิป: ฿{detectedSlipAmount.toLocaleString()} บาท (อัปเดตช่องจำนวนเงินอัตโนมัติแล้ว)
                                  </div>
                                ) : (
                                  <div style={{ color: '#aaa', fontSize: '0.72rem', marginTop: '3px' }}>
                                    *ระบบตรวจสอบรหัสธุรกรรมธนาคาร ป้องกันการใช้สลิปเดิมซ้ำ 100%
                                  </div>
                                )}
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                              <label className="btn-outline" style={{ cursor: 'pointer', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                                เปลี่ยนสลิป
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  onChange={handleSlipUpload}
                                />
                              </label>
                              <button
                                type="button"
                                className="btn-outline"
                                style={{ color: '#ff3333', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                                onClick={() => {
                                  setBankSlipImage('');
                                  setDetectedSlipQr(null);
                                  setDetectedSlipBank(null);
                                  setDetectedSlipTransRef(null);
                                  setDetectedSlipAmount(null);
                                }}
                              >
                                ลบสลิป
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="slip-drop-zone">
                            <IconUpload size={28} color="#ff1a40" />
                            <span style={{ fontWeight: 600, color: '#fff', marginTop: '4px', fontSize: '0.88rem' }}>
                              คลิกเพื่อเลือกไฟล์รูปภาพสลิป
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#7a6368' }}>
                              ระบบจะสแกน QR Code ตรวจสอบธนาคารและป้องกันสลิปซ้ำอัตโนมัติ
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={handleSlipUpload}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={bankSlipUploading || !bankSlipImage}
                      style={{
                        width: '100%',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        opacity: (!bankSlipImage || bankSlipUploading) ? 0.6 : 1,
                        marginTop: '1rem',
                        padding: '0.85rem 1.25rem',
                        fontSize: '1rem',
                        fontWeight: 700,
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
                        cursor: (!bankSlipImage || bankSlipUploading) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <IconCheck size={18} />
                      <span>{bankSlipUploading ? 'กำลังตรวจสอบสลิปกับระบบ...' : `ยืนยันและเติมเงิน ฿${bankAmount || 0} เข้ากระเป๋า`}</span>
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 2: ANGPAO TRUEMONEY */}
              {topupTab === 'angpao' && (
                <div>
                  <div style={{ background: 'rgba(255, 80, 0, 0.1)', border: '1px solid rgba(255, 80, 0, 0.3)', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#ff9e42', fontWeight: 600 }}>เบอร์โทรศัพท์สำหรับรับเงินอัตโนมัติ:</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', letterSpacing: '1px' }}>{angpaoPhone}</div>
                    <div style={{ fontSize: '0.75rem', color: '#b89ca2', marginTop: '0.2rem' }}>*กรุณาสร้างซองของขวัญและเลือกแบ่งเงินให้เบอร์นี้ระบบจะดึงยอดอัตโนมัติ</div>
                  </div>

                  <form onSubmit={handleAngpaoSubmit}>
                    <div className="input-field-group">
                      <label className="input-label">วางลิงก์ซองของขวัญ (TrueMoney Voucher URL)</label>
                      <input
                        type="text"
                        required
                        className="text-input"
                        placeholder="https://gift.truemoney.com/campaign/?v=..."
                        value={angpaoUrl}
                        onChange={(e) => setAngpaoUrl(e.target.value)}
                      />
                    </div>

                    <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #ff5500, #cc2200)' }}>
                      ตรวจสอบและเติมเงินเข้าบัญชีทันที
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 3: REDEEM GIFT CODE */}
              {topupTab === 'giftcode' && (
                <div>
                  <div style={{ background: 'rgba(255, 26, 64, 0.08)', border: '1px solid rgba(255, 26, 64, 0.25)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.9rem', color: '#ff4d6d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IconGift size={18} />
                      <span>แลกรับโค้ดแจกเครดิตฟรี (Gift Code)</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#b89ca2', marginTop: '0.25rem' }}>
                      ใส่รหัสโค้ดที่ได้รับจากแอดมินหรือกิจกรรม เพื่อรับเครดิตเงินฟรีเข้ากระเป๋าทันที
                    </div>
                  </div>

                  <form onSubmit={handleRedeemGiftCode}>
                    <div className="input-field-group">
                      <label className="input-label">รหัสโค้ดเครดิตฟรี (Code)</label>
                      <input
                        type="text"
                        required
                        className="text-input"
                        placeholder="เช่น FREE50 หรือ GIFT-XXXX"
                        style={{ fontFamily: 'monospace', fontSize: '1.05rem', letterSpacing: '1px', textTransform: 'uppercase' }}
                        value={giftCodeInput}
                        onChange={(e) => setGiftCodeInput(e.target.value.toUpperCase())}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={redeemingCode || !giftCodeInput.trim()}
                      className="btn-primary"
                      style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #ff1a40, #ff4d6d)' }}
                    >
                      <IconSparkles size={16} />
                      <span>{redeemingCode ? 'กำลังตรวจสอบโค้ด...' : 'แลกรับเครดิตเข้ากระเป๋าทันที'}</span>
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 4: PERSONAL TOP-UP HISTORY (CUSTOMER VIEW) */}
              {topupTab === 'history' && (
                <div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IconCreditCard size={18} color="#10b981" />
                        <span>ประวัติการเติมเงินของคุณ ({user.username})</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#b89ca2', marginTop: '0.25rem' }}>
                        รายการเติมเงินทั้งหมดของคุณทั้งผ่าน PromptPay QR, สลิปธนาคาร, อั่งเปา และโค้ดเครดิตฟรี
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={fetchUserTopupHistory}
                      disabled={userTopupLoading}
                      style={{ background: 'transparent', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', borderRadius: '8px', padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700 }}
                    >
                      🔄 รีเฟรช
                    </button>
                  </div>

                  {userTopupSummary && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      <div style={{ background: 'rgba(0, 230, 118, 0.08)', border: '1px solid rgba(0, 230, 118, 0.2)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#b89ca2' }}>ยอดเติมเงินสำเร็จทั้งหมด</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#00e676', marginTop: '2px' }}>
                          ฿{userTopupSummary.totalSuccessAmount.toLocaleString()}
                        </div>
                      </div>
                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#b89ca2' }}>จำนวนรายการทั้งหมด</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', marginTop: '2px' }}>
                          {userTopupSummary.totalRecords} <span style={{ fontSize: '0.85rem', color: '#b89ca2', fontWeight: 500 }}>รายการ</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                    {userTopups.map((item: any) => (
                      <div
                        key={item.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.07)',
                          borderRadius: '10px',
                          padding: '0.75rem 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '8px',
                            background: item.type === 'promptpay' ? 'rgba(0, 230, 118, 0.15)' : (item.type === 'slip' ? 'rgba(0, 210, 255, 0.15)' : (item.type === 'angpao' ? 'rgba(255, 183, 3, 0.15)' : 'rgba(255, 77, 109, 0.15)')),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {item.type === 'promptpay' && <IconQrCode size={18} color="#00e676" />}
                            {item.type === 'slip' && <IconCreditCard size={18} color="#00d2ff" />}
                            {item.type === 'angpao' && <IconGift size={18} color="#ffb703" />}
                            {item.type === 'giftcode' && <IconTag size={18} color="#ff4d6d" />}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>
                              {item.channelName}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#b89ca2', marginTop: '2px' }}>
                              {new Date(item.date || item.createdAt).toLocaleString('th-TH', {
                                year: 'numeric', month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </div>
                            {item.orderId && (
                              <div style={{ fontSize: '0.7rem', color: '#ffb703', fontFamily: 'monospace', marginTop: '1px' }}>
                                บิล: {item.orderId}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: (item.status === 'approved' || item.status === 'paid') ? '#00e676' : '#b89ca2' }}>
                            +฿{Number(item.amount || 0).toLocaleString()}
                          </div>
                          <div style={{ marginTop: '3px' }}>
                            {(item.status === 'approved' || item.status === 'paid') && (
                              <span style={{ background: 'rgba(0, 230, 118, 0.15)', color: '#00e676', border: '1px solid rgba(0, 230, 118, 0.3)', padding: '1px 7px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 700 }}>
                                สำเร็จ
                              </span>
                            )}
                            {item.status === 'pending' && (
                              <span style={{ background: 'rgba(255, 183, 3, 0.15)', color: '#ffb703', border: '1px solid rgba(255, 183, 3, 0.3)', padding: '1px 7px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 700 }}>
                                รอชำระ
                              </span>
                            )}
                            {(item.status === 'expired' || item.status === 'cancelled') && (
                              <span style={{ background: 'rgba(255, 77, 109, 0.12)', color: '#ff4d6d', border: '1px solid rgba(255, 77, 109, 0.3)', padding: '1px 7px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 700 }}>
                                {item.statusLabel || 'หมดอายุ'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {userTopups.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#7a6368' }}>
                        {userTopupLoading ? 'กำลังโหลดประวัติการเติมเงิน...' : 'คุณยังไม่มีประวัติการเติมเงิน'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5.45 SLIP IMAGE PREVIEW MODAL */}
      {previewTopupSlip && (
        <div className="modal-overlay" style={{ zIndex: 999999 }} onClick={() => setPreviewTopupSlip(null)}>
          <div className="modal-content" style={{ maxWidth: '420px', padding: '1.25rem', background: '#0a0305', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>🖼️ รูปสลิปหลักฐานการโอน</span>
              <button className="btn-close-modal" onClick={() => setPreviewTopupSlip(null)}>
                <IconX size={16} />
              </button>
            </div>
            <img
              src={previewTopupSlip}
              alt="Slip Receipt"
              style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px', background: '#000' }}
            />
            <button
              type="button"
              className="btn-outline"
              onClick={() => setPreviewTopupSlip(null)}
              style={{ width: '100%', marginTop: '0.85rem', justifyContent: 'center' }}
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* 5.5 DYNAMIC PROMPTPAY QR PAYMENT MODAL (SINGLE-USE, 30-MIN TIMER & AUTO-CREDIT) */}
      {showDynamicQrModal && activeQrOrder && (
        <div
          className="modal-overlay"
          style={{ zIndex: 99999 }}
          onClick={() => {
            if (qrPaymentSuccess || confirm('คุณต้องการปิดหน้าต่างชำระเงินนี้หรือไม่? (หากโอนแล้วยอดเงินจะยังคงเข้าบัญชีของคุณอัตโนมัติ)')) {
              setShowDynamicQrModal(false);
              setActiveQrOrder(null);
              setQrPaymentSuccess(false);
            }
          }}
        >
          <div
            className="modal-content"
            style={{
              maxWidth: '520px',
              maxHeight: '94vh',
              display: 'flex',
              flexDirection: 'column',
              border: qrPaymentSuccess ? '1px solid #00e676' : '1px solid rgba(0, 230, 118, 0.35)',
              boxShadow: qrPaymentSuccess ? '0 0 40px rgba(0, 230, 118, 0.3)' : '0 0 35px rgba(0, 230, 118, 0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.85rem' }}>
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: qrPaymentSuccess ? 'rgba(0, 230, 118, 0.2)' : 'linear-gradient(135deg, rgba(0, 230, 118, 0.2), rgba(0, 176, 255, 0.2))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {qrPaymentSuccess ? <IconCheck size={18} color="#00e676" /> : <IconQrCode size={18} color="#00e676" />}
                </div>
                <div>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                    {qrPaymentSuccess ? 'เติมเงินเข้าบัญชีสำเร็จ!' : 'สแกนชำระเงิน PromptPay QR'}
                  </span>
                  <div style={{ fontSize: '0.72rem', color: '#00e676', fontWeight: 600 }}>
                    คิวอาร์แบบใช้ครั้งเดียว (Single-Use QR) • เติมเงินอัตโนมัติ
                  </div>
                </div>
              </div>
              <button
                className="btn-close-modal"
                onClick={() => {
                  if (qrPaymentSuccess || confirm('คุณต้องการปิดหน้าต่างชำระเงินนี้หรือไม่?')) {
                    setShowDynamicQrModal(false);
                    setActiveQrOrder(null);
                    setQrPaymentSuccess(false);
                  }
                }}
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '1.25rem' }}>
              {qrPaymentSuccess ? (
                /* SUCCESS VIEW */
                <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
                  <div
                    style={{
                      width: '84px',
                      height: '84px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(0, 230, 118, 0.25) 0%, rgba(0, 230, 118, 0.05) 70%)',
                      border: '2px solid #00e676',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1.25rem',
                      boxShadow: '0 0 35px rgba(0, 230, 118, 0.5)',
                      animation: 'pulse 2s infinite'
                    }}
                  >
                    <IconCheck size={48} color="#00e676" />
                  </div>

                  <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
                    🎉 ชำระเงินสำเร็จเรียบร้อย!
                  </h3>
                  <div style={{ fontSize: '0.9rem', color: '#b89ca2', marginBottom: '1.25rem' }}>
                    ระบบได้ทำการเติมเงินเข้ากระเป๋าของคุณอัตโนมัติแล้ว
                  </div>

                  <div style={{
                    background: 'rgba(0, 230, 118, 0.08)',
                    border: '1px solid rgba(0, 230, 118, 0.3)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: '#b89ca2', marginBottom: '4px' }}>ยอดเงินที่เติมเข้าบัญชี:</div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: '#00e676', letterSpacing: '1px' }}>
                      +฿{activeQrOrder.amount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#fff', marginTop: '6px' }}>
                      ยอดเงินคงเหลือปัจจุบัน: <strong style={{ color: '#00e676' }}>฿{user?.balance?.toLocaleString() || '0'} บาท</strong>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#7a6368', marginTop: '6px' }}>
                      เลขที่บิล: <code style={{ color: '#ffb703' }}>{activeQrOrder.orderId}</code> (QR ใช้งานเสร็จสิ้น)
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setShowDynamicQrModal(false);
                      setActiveQrOrder(null);
                      setQrPaymentSuccess(false);
                    }}
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #00e676, #00b0ff)',
                      color: '#050c14',
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      padding: '0.85rem',
                      borderRadius: '10px',
                      boxShadow: '0 4px 20px rgba(0, 230, 118, 0.4)'
                    }}
                  >
                    <IconShoppingBag size={18} />
                    <span>เสร็จสิ้น / เริ่มเลือกซื้อสินค้า</span>
                  </button>
                </div>
              ) : (
                /* ACTIVE PAYMENT VIEW */
                <div>
                  {/* 30-Minute Real-time Countdown Timer Bar */}
                  <div style={{
                    background: qrCountdown <= 300 ? 'rgba(255, 77, 109, 0.12)' : 'rgba(0, 230, 118, 0.1)',
                    border: qrCountdown <= 300 ? '1px solid rgba(255, 77, 109, 0.4)' : '1px solid rgba(0, 230, 118, 0.3)',
                    borderRadius: '10px',
                    padding: '0.65rem 0.85rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: qrCountdown <= 300 ? '#ff4d6d' : '#00e676' }}>
                      <IconClock size={18} />
                      <span>{qrCountdown === 0 ? 'หมดเวลาการชำระเงิน' : 'กรุณาชำระเงินภายใน:'}</span>
                    </div>
                    <div style={{
                      fontFamily: 'monospace',
                      fontSize: '1.2rem',
                      fontWeight: 900,
                      color: qrCountdown <= 300 ? '#ff1a40' : '#00e676',
                      letterSpacing: '1px'
                    }}>
                      {Math.floor(qrCountdown / 60).toString().padStart(2, '0')}:{(qrCountdown % 60).toString().padStart(2, '0')} นาที
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{
                    width: '100%',
                    height: '4px',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    marginTop: '-0.65rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      width: `${Math.max(0, Math.min(100, (qrCountdown / 1800) * 100))}%`,
                      height: '100%',
                      background: qrCountdown <= 300 ? 'linear-gradient(90deg, #ff1a40, #ff4d6d)' : 'linear-gradient(90deg, #00e676, #00b0ff)',
                      transition: 'width 1s linear'
                    }} />
                  </div>

                  {/* Amount Badge */}
                  <div style={{
                    textAlign: 'center',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px',
                    padding: '1rem 0.75rem',
                    marginBottom: '1.15rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: '#b89ca2', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      ยอดชำระที่ต้องโอน (โอนยอดนี้เท่านั้น)
                    </div>
                    <div style={{
                      fontSize: '2.4rem',
                      fontWeight: 900,
                      color: '#00e676',
                      letterSpacing: '0.5px',
                      textShadow: '0 0 25px rgba(0, 230, 118, 0.4)',
                      margin: '0.2rem 0'
                    }}>
                      ฿{activeQrOrder.amount.toLocaleString()}.00
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(0, 230, 118, 0.12)', padding: '2px 8px', borderRadius: '20px', fontSize: '0.72rem', color: '#00e676', fontWeight: 600 }}>
                      <IconZap size={12} /> ยอดเงินเข้าบัญชีทันทีเมื่อโอนเสร็จ
                    </div>
                  </div>

                  {/* QR Code Container */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                    marginBottom: '1rem',
                    position: 'relative'
                  }}>
                    {/* PromptPay Top Logo Banner */}
                    <div style={{
                      background: '#113566',
                      color: '#fff',
                      padding: '4px 14px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      letterSpacing: '1px',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>PROMPTPAY • พร้อมเพย์</span>
                    </div>

                    {/* QR Code Image */}
                    {qrCountdown > 0 ? (
                      <div style={{ position: 'relative', width: '250px', height: '250px' }}>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=4&data=${encodeURIComponent(activeQrOrder.qrPayload)}`}
                          alt="Dynamic PromptPay QR"
                          style={{
                            width: '250px',
                            height: '250px',
                            display: 'block',
                            borderRadius: '8px'
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{
                        width: '250px',
                        height: '250px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f8d7da',
                        borderRadius: '8px',
                        color: '#721c24',
                        textAlign: 'center',
                        padding: '1rem'
                      }}>
                        <IconAlertCircle size={40} color="#dc3545" />
                        <div style={{ fontWeight: 800, marginTop: '8px', fontSize: '0.95rem' }}>
                          QR Code หมดอายุแล้ว
                        </div>
                        <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                          (เกินกำหนด 30 นาที)
                        </div>
                      </div>
                    )}

                    {/* Single-Use Warning Footer */}
                    <div style={{
                      marginTop: '10px',
                      fontSize: '0.72rem',
                      color: '#444',
                      fontWeight: 600,
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <IconShield size={13} color="#007bff" />
                      <span>Single-Use: สแกนชำระได้เพียงครั้งเดียว ปลอดภัย 100%</span>
                    </div>
                  </div>

                  {/* Account Information Strip */}
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    fontSize: '0.82rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ color: '#b89ca2' }}>ชื่อบัญชีผู้รับ:</span>
                      <strong style={{ color: '#fff' }}>{activeQrOrder.accountName}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ color: '#b89ca2' }}>เบอร์พร้อมเพย์:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <code style={{ color: '#00e676', fontWeight: 700, fontSize: '0.9rem' }}>{activeQrOrder.promptpayNumber}</code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(activeQrOrder.promptpayNumber.replace(/-/g, ''));
                            showToast('คัดลอกเบอร์พร้อมเพย์แล้ว');
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#b89ca2',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex'
                          }}
                          title="คัดลอกเบอร์พร้อมเพย์"
                        >
                          <IconCopy size={13} />
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#b89ca2' }}>รหัสคำสั่งชำระเงิน:</span>
                      <code style={{ color: '#ffb703', fontSize: '0.75rem' }}>{activeQrOrder.orderId}</code>
                    </div>
                  </div>

                  {/* Auto-Polling Live Status Indicator */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '0.5rem',
                    fontSize: '0.8rem',
                    color: '#00e676',
                    background: 'rgba(0, 230, 118, 0.06)',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#00e676',
                      boxShadow: '0 0 10px #00e676',
                      animation: 'pulse 1.5s infinite'
                    }} />
                    <span>ระบบกำลังตรวจจับยอดเงินเข้าบัญชีอัตโนมัติ (ไม่ต้องส่งสลิป)...</span>
                  </div>

                  {/* Action Buttons */}
                  {qrCountdown > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {/* Primary: Instant Verification / Auto-Credit Check */}
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={qrVerifying}
                        onClick={() => handleConfirmQrPayment()}
                        style={{
                          width: '100%',
                          justifyContent: 'center',
                          background: 'linear-gradient(135deg, #00e676, #00b0ff)',
                          color: '#050c14',
                          fontSize: '1rem',
                          fontWeight: 800,
                          padding: '0.85rem 1rem',
                          borderRadius: '10px',
                          boxShadow: '0 4px 20px rgba(0, 230, 118, 0.4)',
                          cursor: qrVerifying ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <IconZap size={18} />
                        <span>{qrVerifying ? 'กำลังตรวจสอบยอดเงิน...' : '⚡ ฉันโอนเงินเรียบร้อยแล้ว (ตรวจสอบยอดเงินทันที)'}</span>
                      </button>

                      {/* Optional: Upload Slip Quick Scan */}
                      <div style={{ textAlign: 'center' }}>
                        <label style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.8rem',
                          color: '#b89ca2',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: '4px 8px'
                        }}>
                          <IconUpload size={14} color="#ff4d6d" />
                          <span>หรือ แนบรูปสลิปเพื่อตรวจสอบด่วน</span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (uploadEvt) => {
                                const dataUrl = uploadEvt.target?.result as string;
                                if (dataUrl) {
                                  setQrSlipImage(dataUrl);
                                  handleConfirmQrPayment(dataUrl);
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    /* Expired: Regenerate QR Button */
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleCreateQrOrder(activeQrOrder.amount)}
                      style={{
                        width: '100%',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #ff1a40, #ff4d6d)',
                        fontSize: '1rem',
                        fontWeight: 700,
                        padding: '0.85rem',
                        borderRadius: '10px'
                      }}
                    >
                      <IconRefreshCw size={18} />
                      <span>🔄 สร้าง QR Code ใหม่ (ต่อเวลา 30 นาที)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5.6 HEXSYNCTH SECURITY MAX ENTRANCE VERIFICATION MODAL */}
      {showSecurityMaxModal && (
        <div
          className="modal-overlay"
          style={{
            zIndex: 1000000,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            background: 'rgba(5, 2, 4, 0.88)'
          }}
        >
          <div
            className="modal-content"
            style={{
              maxWidth: '540px',
              border: '1.5px solid rgba(255, 26, 64, 0.45)',
              boxShadow: '0 0 50px rgba(255, 26, 64, 0.35), 0 25px 60px rgba(0, 0, 0, 0.9)',
              background: 'linear-gradient(160deg, #13060a 0%, #0c0407 100%)',
              borderRadius: '18px',
              padding: '1.75rem',
              textAlign: 'center',
              animation: 'fadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Shield Cyber Badge */}
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 26, 64, 0.25) 0%, rgba(255, 26, 64, 0.05) 70%)',
              border: '2px solid #ff1a40',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 0 30px rgba(255, 26, 64, 0.5)'
            }}>
              <IconShield size={38} color="#ff1a40" />
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 26, 64, 0.12)',
              border: '1px solid rgba(255, 26, 64, 0.35)',
              borderRadius: '20px',
              padding: '3px 12px',
              color: '#ff4d6d',
              fontSize: '0.74rem',
              fontWeight: 800,
              letterSpacing: '1px',
              marginBottom: '0.75rem',
              textTransform: 'uppercase'
            }}>
              <span>SECURITY VERIFICATION GATEWAY</span>
            </div>

            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 900,
              color: '#ffffff',
              marginBottom: '0.35rem',
              letterSpacing: '0.5px'
            }}>
              ป้องกันโดย <span style={{ color: '#ff1a40', textShadow: '0 0 15px rgba(255, 26, 64, 0.6)' }}>HexSyncTH Security MAX</span>
            </h2>

            <p style={{
              color: '#b89ca2',
              fontSize: '0.84rem',
              lineHeight: 1.5,
              marginBottom: '1.25rem',
              maxWidth: '440px',
              margin: '0 auto 1.25rem'
            }}>
              เว็บไซต์นี้ได้รับการปกป้องด้วยสถาปัตยกรรมความปลอดภัยระดับสูง ตรวจจับและคัดกรองภัยคุกคามแบบเรียลไทม์ 24 ชม.
            </p>

            {/* Concise Security Protection Details */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              textAlign: 'left',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '10px',
                padding: '0.75rem 0.9rem'
              }}>
                <div style={{ background: 'rgba(255, 26, 64, 0.2)', padding: '5px', borderRadius: '7px', color: '#ff1a40', marginTop: '2px', display: 'flex' }}>
                  <IconShield size={16} />
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.86rem' }}>ระบบ Anti-Tamper & DevTools Realtime Defense</div>
                  <div style={{ color: '#b89ca2', fontSize: '0.75rem', marginTop: '2px', lineHeight: 1.4 }}>
                    ป้องกันการส่อง ดัดแปลงซอร์สโค้ด และปิดกั้นเครื่องมือตรวจสอบระบบเบราว์เซอร์แบบเรียลไทม์
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '10px',
                padding: '0.75rem 0.9rem'
              }}>
                <div style={{ background: 'rgba(0, 230, 118, 0.2)', padding: '5px', borderRadius: '7px', color: '#00e676', marginTop: '2px', display: 'flex' }}>
                  <IconZap size={16} />
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.86rem' }}>ระบบ Intelligent Anti-DDoS & Traffic Guard</div>
                  <div style={{ color: '#b89ca2', fontSize: '0.75rem', marginTop: '2px', lineHeight: 1.4 }}>
                    วิเคราะห์และคัดกรองการรับ-ส่งข้อมูล ป้องกันการโจมตีและการส่งคำขอผิดปกติเข้าสู่เซิร์ฟเวอร์
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '10px',
                padding: '0.75rem 0.9rem'
              }}>
                <div style={{ background: 'rgba(0, 176, 255, 0.2)', padding: '5px', borderRadius: '7px', color: '#00b0ff', marginTop: '2px', display: 'flex' }}>
                  <IconLock size={16} />
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.86rem' }}>ระบบ Data Encryption & Account Integrity</div>
                  <div style={{ color: '#b89ca2', fontSize: '0.75rem', marginTop: '2px', lineHeight: 1.4 }}>
                    เข้ารหัสข้อมูลความปลอดภัย ปกป้องกระเป๋าเงิน ยอดเงิน และประวัติการทำรายการทุกขั้นตอน
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '10px',
                padding: '0.75rem 0.9rem'
              }}>
                <div style={{ background: 'rgba(255, 183, 3, 0.2)', padding: '5px', borderRadius: '7px', color: '#ffb703', marginTop: '2px', display: 'flex' }}>
                  <IconCheckCircle2 size={16} />
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.86rem' }}>ระบบ Forensic Threat Detection & 3-Strikes</div>
                  <div style={{ color: '#b89ca2', fontSize: '0.75rem', marginTop: '2px', lineHeight: 1.4 }}>
                    ตรวจจับและบันทึกพฤติกรรมความเสี่ยง พร้อมระงับสิทธิ์การใช้งานทันทีเมื่อพบการฝ่าฝืน
                  </div>
                </div>
              </div>
            </div>

            {/* Acknowledge Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => handleAcknowledgeSecurityMax(false)}
                className="btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #ff1a40, #b3001e)',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: 800,
                  padding: '0.95rem 1.25rem',
                  borderRadius: '12px',
                  boxShadow: '0 4px 25px rgba(255, 26, 64, 0.45)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <IconCheck size={18} />
                <span>ฉันเข้าใจและยอมรับ (เข้าสู่เว็บไซต์)</span>
              </button>

              {!user && (
                <button
                  type="button"
                  onClick={() => handleAcknowledgeSecurityMax(true)}
                  className="btn-outline"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    padding: '0.8rem 1.25rem',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <IconUser size={16} color="#ff4d6d" />
                  <span>ฉันเข้าใจและยอมรับ (ไปหน้าเข้าสู่ระบบ / Login)</span>
                </button>
              )}
            </div>

            <div style={{ fontSize: '0.72rem', color: '#7a6368', marginTop: '0.85rem' }}>
              *ระบบจะแสดงการยืนยันนี้ทุกครั้งที่รีเฟรชหน้าเว็บหรือก่อนเข้าสู่ระบบ เพื่อความปลอดภัยสูงสุด
            </div>
          </div>
        </div>
      )}
      {editingProduct && (
        <div className="modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="modal-content" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <IconEdit color="#ff1a40" size={20} />
                <span>แก้ไขสินค้า รูปภาพ & ลิงก์ดาวน์โหลด</span>
              </div>
              <button className="btn-close-modal" onClick={() => setEditingProduct(null)}>
                <IconX size={18} />
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSaveProductEdit}>
                {/* Product Image Preview & Customizer */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
                  <label className="input-label" style={{ color: '#ff4d6d', fontWeight: 700 }}>
                    🖼️ รูปภาพสินค้า (Product Image)
                  </label>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', margin: '0.5rem 0' }}>
                    <img
                      src={editingProduct.image}
                      alt="Preview"
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '1px solid #ff1a40' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100';
                      }}
                    />

                    <div style={{ flex: 1 }}>
                      <label className="btn-outline" style={{ display: 'inline-flex', cursor: 'pointer', fontSize: '0.8rem', padding: '0.4rem 0.8rem', gap: '0.4rem' }}>
                        <IconUpload size={14} />
                        <span>อัปโหลดรูปภาพใหม่จากเครื่อง</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handleFileUpload(e, (url) => setEditingProduct({ ...editingProduct, image: url }))}
                        />
                      </label>
                      <div style={{ fontSize: '0.75rem', color: '#7a6368', marginTop: '4px' }}>
                        รองรับไฟล์ JPG, PNG, WebP, GIF (ภาพเคลื่อนไหว), SVG หรือวาง URL ด้านล่าง
                      </div>
                    </div>
                  </div>

                  <div className="input-field-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">หรือใส่ลิงก์รูปภาพ (Image URL)</label>
                    <input
                      type="text"
                      className="text-input"
                      value={editingProduct.image}
                      onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                    />
                  </div>
                </div>

                <div className="input-field-group">
                  <label className="input-label">ชื่อสินค้า</label>
                  <input
                    type="text"
                    required
                    className="text-input"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  />
                </div>

                <div className="responsive-grid-2col">
                  <div className="input-field-group">
                    <label className="input-label">หมวดหมู่สินค้า</label>
                    <select
                      className="text-input"
                      value={editingProduct.categoryId}
                      onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                    >
                      {categories.map((c) => (
                        <option key={c.slug} value={c.slug}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="input-field-group">
                    <label className="input-label">ป้ายกำกับ (Badge)</label>
                    <select
                      className="text-input"
                      value={editingProduct.badge || 'HOT'}
                      onChange={(e) => setEditingProduct({ ...editingProduct, badge: e.target.value })}
                    >
                      <option value="HOT">🔥 HOT</option>
                      <option value="VIP">👑 VIP</option>
                      <option value="BESTSELLER">⭐ BESTSELLER</option>
                      <option value="NEW">✨ NEW</option>
                      <option value="PROMO">💥 SALE</option>
                    </select>
                  </div>
                </div>

                <div style={{ margin: '0.6rem 0', background: 'rgba(255,183,3,0.06)', border: '1px solid rgba(255,183,3,0.3)', borderRadius: 10, padding: '0.65rem 0.85rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', color: '#ffb703', fontWeight: 700, fontSize: '0.88rem' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(editingProduct.isFeatured)}
                      onChange={(e) => setEditingProduct({ ...editingProduct, isFeatured: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: '#ff1a40' }}
                    />
                    <span>⭐ แสดงเป็นสินค้าแนะนำที่หน้าหลัก (Featured Product)</span>
                  </label>
                </div>

                <div className="responsive-grid-2col">
                  <div className="input-field-group">
                    <label className="input-label">ราคาขายปัจจุบัน (฿)</label>
                    <input
                      type="number"
                      required
                      className="text-input"
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    />
                  </div>

                  <div className="input-field-group">
                    <label className="input-label">ราคาเต็มเดิม (฿) - ถ้ามี</label>
                    <input
                      type="number"
                      className="text-input"
                      placeholder="เช่น 100"
                      value={editingProduct.originalPrice || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, originalPrice: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>
                </div>

                {/* EDIT DOWNLOAD URL FOR PRODUCT */}
                <div className="input-field-group">
                  <label className="input-label">ลิงก์ของปุ่มดาวน์โหลด (Download URL)</label>
                  <input
                    type="text"
                    required
                    className="text-input"
                    placeholder="https://... (ลิงก์ที่ผู้ซื้อจะได้รับหลังสั่งซื้อ)"
                    value={editingProduct.downloadUrl}
                    onChange={(e) => setEditingProduct({ ...editingProduct, downloadUrl: e.target.value })}
                  />
                </div>

                {/* GAME RENTAL LINKAGE & DURATION (ADMIN) */}
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '1rem', margin: '1rem 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#10b981', fontWeight: 700, fontSize: '0.92rem' }}>
                    <IconGamepad size={18} />
                    <span>🎮 กำหนดสิทธิ์เช่าเกม & ปลดล็อกดาวน์โหลด (Rental System)</span>
                  </div>

                  <div className="responsive-grid-2col">
                    <div className="input-field-group">
                      <label className="input-label">เกมที่ต้องการปลดล็อกในหน้าเช็คสถานะ</label>
                      <select
                        className="text-input"
                        value={editingProduct.linkedGameId || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, linkedGameId: e.target.value || null })}
                      >
                        <option value="">-- ไม่ผูกกับเกม (สินค้าทั่วไป) --</option>
                        {availableGames.map((g) => (
                          <option key={g.id} value={g.id}>
                            🎮 {g.title} ({g.id})
                          </option>
                        ))}
                      </select>
                      <span style={{ fontSize: '0.72rem', color: '#7a6368', marginTop: '4px', display: 'block' }}>
                        เมื่อลูกค้าซื้อ จะปลดล็อกปุ่มดาวน์โหลดของเกมนี้ในหน้าเช็คสถานะเกม
                      </span>
                    </div>

                    <div className="input-field-group">
                      <label className="input-label">ระยะเวลาเช่า (จำนวนวัน)</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="number"
                          min="0"
                          className="text-input"
                          placeholder="เช่น 1, 3, 7, 30 (0 = ถาวร)"
                          value={editingProduct.durationDays !== undefined && editingProduct.durationDays !== null ? editingProduct.durationDays : ''}
                          onChange={(e) => {
                            const days = e.target.value === '' ? null : Number(e.target.value);
                            setEditingProduct({
                              ...editingProduct,
                              durationDays: days,
                              durationHours: days ? days * 24 : 0
                            });
                          }}
                        />
                        <select
                          className="text-input"
                          style={{ width: '130px' }}
                          value={editingProduct.durationDays !== undefined && editingProduct.durationDays !== null ? editingProduct.durationDays : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const days = val === '' ? 0 : Number(val);
                            setEditingProduct({
                              ...editingProduct,
                              durationDays: days,
                              durationHours: days * 24
                            });
                          }}
                        >
                          <option value="">เลือกสำเร็จ</option>
                          <option value="1">1 วัน (24 ชม.)</option>
                          <option value="3">3 วัน (72 ชม.)</option>
                          <option value="7">7 วัน (1 สัปดาห์)</option>
                          <option value="15">15 วัน</option>
                          <option value="30">30 วัน (1 เดือน)</option>
                          <option value="0">ถาวร (ตลอดชีพ)</option>
                        </select>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#7a6368', marginTop: '4px', display: 'block' }}>
                        {editingProduct.durationDays ? ('⏳ นับถอยหลัง ' + editingProduct.durationDays + ' วัน (' + (editingProduct.durationDays * 24) + ' ชม.) หลังซื้อ') : 'ถาวร (ไม่จำกัดเวลา)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* EDIT FULL DESCRIPTION */}
                <div className="input-field-group">
                  <label className="input-label">รายละเอียดสินค้า (Description & Features)</label>
                  <textarea
                    rows={4}
                    className="text-input"
                    placeholder="กรอกรายละเอียดสินค้า คุณสมบัติ วิธีใช้งาน หรือข้อมูลการรับประกัน..."
                    value={editingProduct.description || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 2, minWidth: '180px', justifyContent: 'center' }}>
                    บันทึกการเปลี่ยนแปลงทั้งหมด
                  </button>
                  <button
                    type="button"
                    className="btn-outline"
                    style={{
                      flex: 1,
                      minWidth: '120px',
                      justifyContent: 'center',
                      borderColor: 'rgba(255, 51, 51, 0.4)',
                      color: '#ff3333',
                      background: 'rgba(255, 51, 51, 0.08)',
                      gap: '0.4rem'
                    }}
                    onClick={() => {
                      if (editingProduct) {
                        setProductToDelete(editingProduct);
                      }
                    }}
                  >
                    <IconTrash size={15} />
                    <span>ลบสินค้านี้</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE PRODUCT MODAL */}
      {productToDelete && (
        <div className="modal-overlay" onClick={() => !isDeletingProduct && setProductToDelete(null)} style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '450px', border: '1px solid rgba(255, 26, 64, 0.4)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(255, 26, 64, 0.2)' }}>
              <div className="modal-title" style={{ color: '#ff3333' }}>
                <IconTrash size={20} color="#ff3333" />
                <span>ยืนยันการลบสินค้า</span>
              </div>
              <button
                className="btn-close-modal"
                disabled={isDeletingProduct}
                onClick={() => setProductToDelete(null)}
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255, 26, 64, 0.08)', border: '1px solid rgba(255, 26, 64, 0.2)', borderRadius: '12px', padding: '0.85rem' }}>
                <img
                  src={productToDelete.image}
                  alt=""
                  style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100';
                  }}
                />
                <div style={{ textAlign: 'left', flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.98rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{productToDelete.name}</div>
                  <div style={{ color: '#ff4d6d', fontWeight: 700, fontSize: '0.9rem', marginTop: 2 }}>฿{productToDelete.price}</div>
                  <div style={{ fontSize: '0.78rem', color: '#b89ca2', marginTop: 2 }}>สต็อกคีย์คงเหลือ: {productToDelete.stock} คีย์</div>
                </div>
              </div>

              <div style={{ color: '#e2d2d5', fontSize: '0.92rem', lineHeight: 1.5, textAlign: 'center' }}>
                คุณแน่ใจหรือไม่ว่าต้องการลบสินค้ารายการนี้? <br />
                <span style={{ color: '#ff6b8b', fontSize: '0.85rem', display: 'block', marginTop: '0.35rem' }}>
                  ⚠️ รหัสคีย์ทั้งหมดในสต็อกที่ผูกกับสินค้านี้จะถูกลบออกทั้งหมด และไม่สามารถกู้คืนได้
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-outline"
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={isDeletingProduct}
                  onClick={() => setProductToDelete(null)}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{
                    flex: 1.4,
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #ff1a40, #b3001e)',
                    borderColor: '#ff1a40',
                    boxShadow: '0 4px 15px rgba(255, 26, 64, 0.4)',
                    gap: '0.4rem'
                  }}
                  disabled={isDeletingProduct}
                  onClick={confirmDeleteProduct}
                >
                  {isDeletingProduct ? (
                    <span>กำลังลบ...</span>
                  ) : (
                    <>
                      <IconTrash size={16} />
                      <span>ยืนยันลบสินค้า</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. ADD PRODUCT MODAL (WITH IMAGE CUSTOMIZER & PREVIEW) */}
      {showAddProductModal && (
        <div className="modal-overlay" onClick={() => setShowAddProductModal(false)}>
          <div className="modal-content" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <IconPlusCircle color="#ff1a40" size={20} />
                <span>เพิ่มสินค้าใหม่เข้าร้าน</span>
              </div>
              <button className="btn-close-modal" onClick={() => setShowAddProductModal(false)}>
                <IconX size={18} />
              </button>
            </div>

            <div className="modal-body">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const target = e.target as any;
                  const durationDaysVal = Number(target.durationDays?.value || 0);
                  const newProduct = {
                    name: target.name.value,
                    categoryId: target.categoryId.value,
                    price: Number(target.price.value),
                    image: newProductImage,
                    downloadUrl: target.downloadUrl.value,
                    initialKeys: target.initialKeys.value,
                    description: target.description.value,
                    isFeatured: Boolean(target.isFeatured?.checked),
                    linkedGameId: target.linkedGameId?.value || null,
                    durationDays: durationDaysVal,
                    durationHours: durationDaysVal > 0 ? durationDaysVal * 24 : 0,
                    adminUsername: user?.username,
                  };

                  try {
                    const res = await fetch('/api/products', {
                      method: 'POST',
                      headers: getAuthHeaders(),
                      body: JSON.stringify(newProduct),
                    });
                    if (res.ok) {
                      showToast('เพิ่มสินค้าใหม่เรียบร้อยแล้ว');
                      setShowAddProductModal(false);
                      fetchProducts();
                    } else {
                      const err = await res.json().catch(() => ({}));
                      showToast(err.message || 'เพิ่มสินค้าไม่สำเร็จ');
                    }
                  } catch {
                    showToast('เพิ่มสินค้าไม่สำเร็จ (กรุณาตรวจสอบเซิร์ฟเวอร์)');
                  }
                }}
              >
                {/* Image Section */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
                  <label className="input-label" style={{ color: '#ff4d6d', fontWeight: 700 }}>
                    🖼️ รูปภาพสินค้า
                  </label>
                  <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', margin: '0.4rem 0' }}>
                    <img
                      src={newProductImage}
                      alt="Preview"
                      style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-subtle)' }}
                    />
                    <div style={{ flex: 1 }}>
                      <label className="btn-outline" style={{ display: 'inline-flex', cursor: 'pointer', fontSize: '0.78rem', padding: '0.35rem 0.75rem', gap: '0.4rem' }}>
                        <IconUpload size={14} />
                        <span>อัปโหลดรูปภาพจากเครื่อง</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handleFileUpload(e, (url) => setNewProductImage(url))}
                        />
                      </label>
                      <div style={{ fontSize: '0.72rem', color: '#7a6368', marginTop: '4px' }}>
                        รองรับไฟล์ JPG, PNG, WebP, GIF (ภาพเคลื่อนไหว)
                      </div>
                    </div>
                  </div>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="หรือใส่ URL รูปภาพสินค้า"
                    value={newProductImage}
                    onChange={(e) => setNewProductImage(e.target.value)}
                  />
                </div>

                <div className="input-field-group">
                  <label className="input-label">ชื่อสินค้า</label>
                  <input name="name" type="text" required className="text-input" placeholder="เช่น ROV 1D (รหัสคีย์ 1 วัน)" />
                </div>

                <div className="responsive-grid-2col">
                  <div className="input-field-group">
                    <label className="input-label">หมวดหมู่</label>
                    <select name="categoryId" className="text-input">
                      {categories.map((c) => (
                        <option key={c.slug} value={c.slug}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-field-group">
                    <label className="input-label">ราคา (฿)</label>
                    <input name="price" type="number" required className="text-input" defaultValue={50} />
                  </div>
                </div>

                <div style={{ margin: '0.25rem 0 0.85rem', background: 'rgba(255,183,3,0.06)', border: '1px solid rgba(255,183,3,0.3)', borderRadius: 10, padding: '0.65rem 0.85rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', color: '#ffb703', fontWeight: 700, fontSize: '0.88rem' }}>
                    <input
                      name="isFeatured"
                      type="checkbox"
                      style={{ width: 18, height: 18, accentColor: '#ff1a40' }}
                    />
                    <span>⭐ แสดงเป็นสินค้าแนะนำที่หน้าหลัก (Featured Product)</span>
                  </label>
                </div>

                <div className="input-field-group">
                  <label className="input-label">ลิงก์ของปุ่มดาวน์โหลด (Download URL)</label>
                  <input name="downloadUrl" type="text" required className="text-input" defaultValue="https://rov.in.th" />
                </div>

                {/* GAME RENTAL LINKAGE & DURATION (ADMIN) */}
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '1rem', margin: '0.85rem 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#10b981', fontWeight: 700, fontSize: '0.92rem' }}>
                    <IconGamepad size={18} />
                    <span>🎮 กำหนดสิทธิ์เช่าเกม & ปลดล็อกดาวน์โหลด (Rental System)</span>
                  </div>

                  <div className="responsive-grid-2col">
                    <div className="input-field-group">
                      <label className="input-label">เกมที่ต้องการปลดล็อกในหน้าเช็คสถานะ</label>
                      <select name="linkedGameId" className="text-input">
                        <option value="">-- ไม่ผูกกับเกม (สินค้าทั่วไป) --</option>
                        {availableGames.map((g) => (
                          <option key={g.id} value={g.id}>
                            🎮 {g.title} ({g.id})
                          </option>
                        ))}
                      </select>
                      <span style={{ fontSize: '0.72rem', color: '#7a6368', marginTop: '4px', display: 'block' }}>
                        เมื่อลูกค้าซื้อ จะปลดล็อกปุ่มดาวน์โหลดของเกมนี้ในหน้าเช็คสถานะเกม
                      </span>
                    </div>

                    <div className="input-field-group">
                      <label className="input-label">ระยะเวลาเช่า (จำนวนวัน)</label>
                      <select name="durationDays" className="text-input" defaultValue="1">
                        <option value="1">1 วัน (24 ชั่วโมง)</option>
                        <option value="3">3 วัน (72 ชั่วโมง)</option>
                        <option value="7">7 วัน (1 สัปดาห์)</option>
                        <option value="15">15 วัน</option>
                        <option value="30">30 วัน (1 เดือน)</option>
                        <option value="0">ถาวร (ตลอดชีพ / ไม่จำกัดเวลา)</option>
                      </select>
                      <span style={{ fontSize: '0.72rem', color: '#7a6368', marginTop: '4px', display: 'block' }}>
                        ระบบจะเริ่มนับถอยหลังทันทีเมื่อลูกค้าทำรายการสั่งซื้อสำเร็จ
                      </span>
                    </div>
                  </div>
                </div>

                <div className="input-field-group">
                  <label className="input-label">สต็อกคีย์เริ่มต้น (1 บรรทัด = 1 คีย์)</label>
                  <textarea
                    name="initialKeys"
                    rows={3}
                    className="text-input"
                    placeholder={`ROV1D-KEY-123\nROV1D-KEY-4124\nROV1D-KEY-8831`}
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>

                <div className="input-field-group">
                  <label className="input-label">คำอธิบาย</label>
                  <input name="description" type="text" className="text-input" placeholder="คีย์แท้ใช้งานได้ทันที" />
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  บันทึกสินค้าใหม่
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ADD CATEGORY MODAL (ADMIN) */}
      {showAddCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowAddCategoryModal(false)}>
          <div className="modal-content" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <IconGamepad color="#ff1a40" size={20} />
                <span>เพิ่มหมวดหมู่เกมใหม่</span>
              </div>
              <button className="btn-close-modal" onClick={() => setShowAddCategoryModal(false)}>
                <IconX size={18} />
              </button>
            </div>

            <div className="modal-body">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const target = e.target as any;
                  const newCat = {
                    name: target.catName.value,
                    slug: target.catSlug.value,
                    bannerImage: newCategoryBanner,
                    description: target.catDesc.value,
                    displayOrder: Number(target.displayOrder.value) || 0,
                    adminUsername: user?.username,
                  };

                  try {
                    const res = await fetch('/api/categories', {
                      method: 'POST',
                      headers: getAuthHeaders(),
                      body: JSON.stringify(newCat),
                    });
                    if (res.ok) {
                      showToast('สร้างหมวดหมู่ใหม่เรียบร้อยแล้ว');
                      setShowAddCategoryModal(false);
                      fetchCategories();
                    } else {
                      const err = await res.json().catch(() => ({}));
                      showToast(err.message || 'สร้างหมวดหมู่ไม่สำเร็จ');
                    }
                  } catch {
                    showToast('สร้างหมวดหมู่ไม่สำเร็จ (กรุณาตรวจสอบเซิร์ฟเวอร์)');
                  }
                }}
              >
                {/* Banner Section */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
                  <label className="input-label" style={{ color: '#ff4d6d', fontWeight: 700 }}>
                    🖼️ รูปแบนเนอร์หมวดหมู่ (Banner Image)
                  </label>
                  <div style={{ margin: '0.5rem 0' }}>
                    <div style={{ width: '100%', height: '140px', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-subtle)', background: '#110507', position: 'relative', marginBottom: '0.6rem' }}>
                      <img
                        src={newCategoryBanner}
                        alt="Banner Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800';
                        }}
                      />
                    </div>
                    <label className="btn-outline" style={{ display: 'inline-flex', cursor: 'pointer', fontSize: '0.8rem', padding: '0.4rem 0.8rem', gap: '0.4rem' }}>
                      <IconUpload size={14} />
                      <span>อัปโหลดรูปภาพแบนเนอร์จากเครื่อง</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileUpload(e, (url) => setNewCategoryBanner(url))}
                      />
                    </label>
                    <span style={{ fontSize: '0.72rem', color: '#7a6368', marginLeft: '0.6rem' }}>
                      รองรับ JPG, PNG, WebP, GIF (ภาพเคลื่อนไหว)
                    </span>
                  </div>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="หรือใส่ URL รูปภาพแบนเนอร์"
                    value={newCategoryBanner}
                    onChange={(e) => setNewCategoryBanner(e.target.value)}
                  />
                </div>

                <div className="input-field-group">
                  <label className="input-label">ชื่อหมวดหมู่ / ชื่อเกม</label>
                  <input name="catName" type="text" required className="text-input" placeholder="เช่น ROV, Valorant, Free Fire" />
                </div>

                <div className="responsive-grid-2col">
                  <div className="input-field-group">
                    <label className="input-label">รหัสหมวดหมู่ (Slug อังกฤษ)</label>
                    <input name="catSlug" type="text" className="text-input" placeholder="เช่น rov, valorant (เว้นว่างเพื่อสร้างออโต้)" />
                  </div>
                  <div className="input-field-group">
                    <label className="input-label">ลำดับการแสดง (Order)</label>
                    <input name="displayOrder" type="number" className="text-input" defaultValue={categories.length + 1} />
                  </div>
                </div>

                <div className="input-field-group">
                  <label className="input-label">คำอธิบายหมวดหมู่</label>
                  <textarea name="catDesc" rows={2} className="text-input" placeholder="เช่น โปร ROV ล็อคเป้า มองแมพ แอนตี้แบน 100%" />
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  บันทึกหมวดหมู่ใหม่
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CATEGORY MODAL (ADMIN) */}
      {editingCategory && (
        <div className="modal-overlay" onClick={() => setEditingCategory(null)}>
          <div className="modal-content" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <IconEdit color="#ff1a40" size={20} />
                <span>แก้ไขหมวดหมู่เกม: {editingCategory.name}</span>
              </div>
              <button className="btn-close-modal" onClick={() => setEditingCategory(null)}>
                <IconX size={18} />
              </button>
            </div>

            <div className="modal-body">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const res = await fetch(`/api/categories/${editingCategory.id}`, {
                      method: 'PUT',
                      headers: getAuthHeaders(),
                      body: JSON.stringify({ ...editingCategory, adminUsername: user?.username }),
                    });
                    if (res.ok) {
                      showToast('อัปเดตหมวดหมู่เรียบร้อยแล้ว');
                      setEditingCategory(null);
                      fetchCategories();
                    } else {
                      const err = await res.json().catch(() => ({}));
                      showToast(err.message || 'อัปเดตหมวดหมู่ไม่สำเร็จ');
                    }
                  } catch {
                    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ');
                  }
                }}
              >
                {/* Banner Section */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
                  <label className="input-label" style={{ color: '#ff4d6d', fontWeight: 700 }}>
                    🖼️ รูปแบนเนอร์หมวดหมู่ (Banner Image)
                  </label>
                  <div style={{ margin: '0.5rem 0' }}>
                    <div style={{ width: '100%', height: '140px', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-subtle)', background: '#110507', position: 'relative', marginBottom: '0.6rem' }}>
                      <img
                        src={editingCategory.bannerImage}
                        alt="Banner Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800';
                        }}
                      />
                    </div>
                    <label className="btn-outline" style={{ display: 'inline-flex', cursor: 'pointer', fontSize: '0.8rem', padding: '0.4rem 0.8rem', gap: '0.4rem' }}>
                      <IconUpload size={14} />
                      <span>อัปโหลดรูปภาพใหม่จากเครื่อง</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileUpload(e, (url) => setEditingCategory({ ...editingCategory, bannerImage: url }))}
                      />
                    </label>
                    <span style={{ fontSize: '0.72rem', color: '#7a6368', marginLeft: '0.6rem' }}>
                      รองรับ JPG, PNG, WebP, GIF (ภาพเคลื่อนไหว)
                    </span>
                  </div>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="หรือใส่ URL รูปภาพแบนเนอร์"
                    value={editingCategory.bannerImage || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, bannerImage: e.target.value })}
                  />
                </div>

                <div className="input-field-group">
                  <label className="input-label">ชื่อหมวดหมู่ / ชื่อเกม</label>
                  <input
                    type="text"
                    required
                    className="text-input"
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  />
                </div>

                <div className="responsive-grid-2col">
                  <div className="input-field-group">
                    <label className="input-label">รหัสหมวดหมู่ (Slug)</label>
                    <input
                      type="text"
                      required
                      className="text-input"
                      value={editingCategory.slug}
                      onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                    />
                  </div>
                  <div className="input-field-group">
                    <label className="input-label">ลำดับการแสดง (Order)</label>
                    <input
                      type="number"
                      className="text-input"
                      value={editingCategory.displayOrder || 0}
                      onChange={(e) => setEditingCategory({ ...editingCategory, displayOrder: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="input-field-group">
                  <label className="input-label">คำอธิบายหมวดหมู่</label>
                  <textarea
                    rows={2}
                    className="text-input"
                    value={editingCategory.description || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  บันทึกการแก้ไขหมวดหมู่
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 8. USER PURCHASES HISTORY MODAL (FOR ADMIN) */}
      {viewingUserPurchases && (
        <div className="modal-overlay" onClick={() => setViewingUserPurchases(null)}>
          <div className="modal-content" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <IconHistory color="#ff1a40" size={20} />
                <span>ประวัติการซื้อของสมาชิก: <strong style={{ color: '#fff' }}>{viewingUserPurchases.username}</strong></span>
              </div>
              <button className="btn-close-modal" onClick={() => setViewingUserPurchases(null)}>
                <IconX size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* User Stats Card */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '0.85rem 1rem'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#888' }}>ID สมาชิก</div>
                  <div style={{ fontWeight: 700, color: '#fff' }}>#{viewingUserPurchases.id}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#888' }}>อีเมล / Gmail</div>
                  <div style={{ fontWeight: 600, color: '#d0c0c5', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                    {viewingUserPurchases.email}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#888' }}>ยอดเงินคงเหลือ</div>
                  <div style={{ fontWeight: 700, color: '#10b981' }}>
                    ฿{viewingUserPurchases.creditBalance?.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#888' }}>จำนวนครั้งที่ซื้อ</div>
                  <div style={{ fontWeight: 700, color: '#ff4d6d' }}>{userPurchasesList.length} รายการ</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#888' }}>ยอดสั่งซื้อรวม</div>
                  <div style={{ fontWeight: 700, color: '#ff1a40', fontSize: '1.05rem' }}>
                    ฿{userPurchasesList.reduce((sum, p) => sum + (p.price || 0), 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {loadingUserPurchases ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#b89ca2' }}>
                  ⏳ กำลังโหลดประวัติการซื้อของ {viewingUserPurchases.username}...
                </div>
              ) : userPurchasesList.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2.5rem 1rem',
                    color: '#7a6368',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '12px',
                    border: '1px dashed var(--border-subtle)'
                  }}
                >
                  สมาชิกท่านนี้ยังไม่มีประวัติการสั่งซื้อสินค้าในระบบ
                </div>
              ) : (
                <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '4px' }}>
                  {userPurchasesList.map((rec) => (
                    <div
                      key={rec.id}
                      style={{
                        background: 'rgba(25, 7, 12, 0.9)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '12px',
                        padding: '1rem',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.4)'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                          marginBottom: '0.65rem'
                        }}
                      >
                        <div>
                          <strong style={{ color: '#fff', fontSize: '1rem' }}>{rec.productName}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#7a6368', display: 'block', marginTop: '2px' }}>
                            วันที่ซื้อ: {new Date(rec.purchaseDate).toLocaleString('th-TH')}
                          </span>
                        </div>
                        <span style={{ color: '#ff4d6d', fontWeight: 800, fontSize: '1.1rem' }}>
                          ฿{rec.price?.toLocaleString()}
                        </span>
                      </div>

                      {/* Real License Key Box */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          background: 'rgba(0, 0, 0, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '0.5rem 0.75rem'
                        }}
                      >
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <span style={{ fontSize: '0.7rem', color: '#b89ca2', display: 'block' }}>รหัสคีย์ที่ได้รับ:</span>
                          <code style={{ color: '#10b981', fontWeight: 700, fontSize: '0.9rem', wordBreak: 'break-all' }}>
                            {rec.key}
                          </code>
                        </div>
                        <button
                          className="btn-outline"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          onClick={() => handleCopyKey(rec.key)}
                          title="คัดลอกคีย์"
                        >
                          {copiedKey === rec.key ? <IconCheck size={14} color="#10b981" /> : <IconCopy size={14} />}
                          <span>{copiedKey === rec.key ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                        </button>
                      </div>

                      {/* RENTAL EXPIRY INFO IN ADMIN */}
                      <RentalCountdown
                        expiresAt={rec.expiresAt}
                        linkedGameId={rec.linkedGameId}
                        productName={rec.productName}
                      />

                      {rec.downloadUrl && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#888' }}>
                          <span>ลิงก์ดาวน์โหลด: </span>
                          <a href={rec.downloadUrl} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline' }}>
                            {rec.downloadUrl}
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 9. FULL EDIT USER MODAL (USER, PASS, MAIL, ROLE, BALANCE) */}
      {editingUserModal && (
        <div className="modal-overlay" onClick={() => setEditingUserModal(null)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <IconEdit color="#ff1a40" size={20} />
                <span>แก้ไขข้อมูลสมาชิก #{editingUserModal.id}</span>
              </div>
              <button className="btn-close-modal" onClick={() => setEditingUserModal(null)}>
                <IconX size={18} />
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSaveUserEdit}>
                {/* IP & Status Info Box */}
                <div style={{ background: 'rgba(255, 26, 64, 0.05)', border: '1px solid rgba(255, 26, 64, 0.25)', borderRadius: '10px', padding: '0.85rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#b89ca2', display: 'block' }}>IP ล่าสุดที่เข้าสู่ระบบ:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span className="ip-badge" style={{ color: '#ff4d6d', fontWeight: 700 }}>
                          {editingUserModal.lastIp || '127.0.0.1'}
                        </span>
                        {editingUserModal.lastIp && (
                          <button
                            type="button"
                            className="btn-ip-action"
                            onClick={() => {
                              navigator.clipboard.writeText(editingUserModal.lastIp);
                              showToast(`คัดลอก IP ${editingUserModal.lastIp} แล้ว`);
                            }}
                            title="คัดลอก IP"
                          >
                            <IconCopy size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#b89ca2', display: 'block' }}>สถานะบัญชี:</span>
                      <div style={{ marginTop: '2px' }}>
                        {editingUserModal.isBanned ? (
                          <span className="user-banned-badge">
                            <IconLock size={12} /> ถูกแบนอยู่
                          </span>
                        ) : (
                          <span className="user-active-badge">
                            <IconCheck size={12} /> ปกติ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {editingUserModal.registerIp && editingUserModal.registerIp !== editingUserModal.lastIp && (
                    <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '4px' }}>
                      IP ที่ใช้ตอนสมัครสมาชิก: <strong style={{ color: '#ccc' }}>{editingUserModal.registerIp}</strong>
                    </div>
                  )}
                  {editingUserModal.isBanned && editingUserModal.banReason && (
                    <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px' }}>
                      เหตุผลที่ถูกแบน: {editingUserModal.banReason}
                    </div>
                  )}
                  <div style={{ marginTop: '0.65rem', display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn-ip-action"
                      style={{ color: '#ff1a40', background: 'rgba(255,26,64,0.15)', borderColor: 'rgba(255,26,64,0.4)', padding: '0.3rem 0.65rem' }}
                      onClick={() => handleBanUserIpDirect(editingUserModal)}
                    >
                      🛡️ สั่งแบน IP นี้
                    </button>
                    <button
                      type="button"
                      className="btn-ip-action"
                      style={editingUserModal.isBanned ? { color: '#10b981', background: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.4)', padding: '0.3rem 0.65rem' } : { color: '#ef4444', background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.4)', padding: '0.3rem 0.65rem' }}
                      onClick={() => {
                        handleToggleBanUser(editingUserModal, !editingUserModal.isBanned);
                        setEditingUserModal(null);
                      }}
                    >
                      {editingUserModal.isBanned ? '✅ ปลดแบนผู้ใช้' : '🚫 สั่งแบนผู้ใช้นี้'}
                    </button>
                  </div>
                </div>

                <div className="input-field-group">
                  <label className="input-label">ชื่อผู้ใช้ (Username)</label>
                  <input
                    type="text"
                    required
                    className="text-input"
                    value={editingUserModal.username}
                    onChange={(e) => setEditingUserModal({ ...editingUserModal, username: e.target.value })}
                  />
                </div>

                <div className="input-field-group">
                  <label className="input-label">อีเมล (Gmail / Mail)</label>
                  <input
                    type="email"
                    required
                    className="text-input"
                    value={editingUserModal.email}
                    onChange={(e) => setEditingUserModal({ ...editingUserModal, email: e.target.value })}
                  />
                </div>

                <div className="input-field-group">
                  <label className="input-label">
                    เปลี่ยนรหัสผ่านใหม่ (Password)
                    <span style={{ fontSize: '0.75rem', color: '#7a6368', fontWeight: 'normal', marginLeft: '6px' }}>
                      (เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยนรหัสผ่าน)
                    </span>
                  </label>
                  <input
                    type="password"
                    className="text-input"
                    placeholder="กรอกรหัสผ่านใหม่ที่ต้องการตั้ง..."
                    value={editingUserModal.newPassword || ''}
                    onChange={(e) => setEditingUserModal({ ...editingUserModal, newPassword: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="input-field-group">
                    <label className="input-label">ยศ (Role)</label>
                    <select
                      className="text-input"
                      value={editingUserModal.role}
                      onChange={(e) => setEditingUserModal({ ...editingUserModal, role: e.target.value })}
                    >
                      <option value="member">MEMBER (สมาชิก)</option>
                      <option value="admin">ADMIN (แอดมิน)</option>
                    </select>
                  </div>

                  <div className="input-field-group">
                    <label className="input-label">ยอดเงินคงเหลือ (฿)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      className="text-input"
                      value={editingUserModal.creditBalance}
                      onChange={(e) => setEditingUserModal({ ...editingUserModal, creditBalance: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => setEditingUserModal(null)}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 2, justifyContent: 'center' }}
                  >
                    บันทึกข้อมูลสมาชิกทันที
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 10. USER DEVICE & HARDWARE INFO MODAL (INSPECT PHONE MODEL, UDID, GPU, RAM, SPECS & HARDWARE BAN) */}
      {viewingUserDevice && (
        <div className="modal-overlay" onClick={() => setViewingUserDevice(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title">
                <IconLaptop color="#00d2ff" size={22} />
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                    ข้อมูลอุปกรณ์ & สเปกเครื่อง (Device Info & Hardware)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#b89ca2', fontWeight: 400 }}>
                    สมาชิก: <strong style={{ color: '#fff' }}>@{viewingUserDevice.user.username}</strong> (ID: #{viewingUserDevice.user.id})
                  </div>
                </div>
              </div>
              <button className="btn-close-modal" onClick={() => setViewingUserDevice(null)}>
                <IconX size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Highlight Card: Model & UDID */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.08), rgba(120, 0, 255, 0.08))',
                  border: '1px solid rgba(0, 210, 255, 0.3)',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#b89ca2', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      รุ่นอุปกรณ์ที่เข้าใช้งานล่าสุด
                    </span>
                    <h3 style={{ fontSize: '1.35rem', color: '#00d2ff', fontWeight: 800, margin: '0.2rem 0' }}>
                      {viewingUserDevice.info?.deviceType === 'mobile' ? '📱' : viewingUserDevice.info?.deviceType === 'tablet' ? '📟' : '💻'}{' '}
                      {viewingUserDevice.info?.model || viewingUserDevice.user.lastDeviceModel || 'ไม่ทราบรุ่นอุปกรณ์'}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: '#998387' }}>
                      แบรนด์: <strong style={{ color: '#fff' }}>{viewingUserDevice.info?.brand || 'ตรวจจับตามระบบ'}</strong> • ประเภท:{' '}
                      <span style={{ textTransform: 'capitalize', color: '#ff758f' }}>
                        {viewingUserDevice.info?.deviceType || 'คอมพิวเตอร์ / โน้ตบุ๊ก'}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.72rem', color: '#b89ca2', display: 'block' }}>IP ล่าสุด:</span>
                    <span className="ip-badge" style={{ color: '#ff4d6d', fontWeight: 700 }}>
                      {viewingUserDevice.user.lastIp || '127.0.0.1'}
                    </span>
                  </div>
                </div>

                {/* Persistent UDID / Device ID Box */}
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ minWidth: '200px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#b89ca2', marginBottom: '2px' }}>
                      🔑 เลขประจำเครื่อง / Hardware Fingerprint (UDID):
                    </div>
                    <code
                      style={{
                        fontFamily: 'monospace',
                        color: '#00e676',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        wordBreak: 'break-all'
                      }}
                    >
                      {viewingUserDevice.info?.deviceId || viewingUserDevice.user.deviceFingerprint || 'ยังไม่มีรหัส UDID บันทึกไว้'}
                    </code>
                  </div>

                  {(viewingUserDevice.info?.deviceId || viewingUserDevice.user.deviceFingerprint) && (
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      onClick={() => {
                        const did = viewingUserDevice.info?.deviceId || viewingUserDevice.user.deviceFingerprint;
                        navigator.clipboard.writeText(did);
                        showToast(`คัดลอกรหัสเครื่อง ${did} เรียบร้อยแล้ว`);
                      }}
                    >
                      <IconCopy size={13} />
                      <span>คัดลอกเลขเครื่อง</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Hardware & Environment Specs Grid */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: '#ff4d6d', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconZap size={16} color="#ff1a40" />
                  <span>สเปกเครื่อง & สิ่งแวดล้อมระบบ (Deep Hardware Specs)</span>
                </h4>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '0.65rem'
                  }}
                >
                  {/* OS */}
                  <div style={{ background: 'rgba(25, 7, 12, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#888' }}>ระบบปฏิบัติการ (OS)</div>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem', marginTop: '2px' }}>
                      🖥️ {viewingUserDevice.info?.os || 'ไม่ระบุ'}
                    </div>
                  </div>

                  {/* Browser */}
                  <div style={{ background: 'rgba(25, 7, 12, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#888' }}>เบราว์เซอร์ (Browser)</div>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem', marginTop: '2px' }}>
                      🌐 {viewingUserDevice.info?.browser || 'ไม่ระบุ'}
                    </div>
                  </div>

                  {/* GPU Renderer */}
                  <div style={{ background: 'rgba(25, 7, 12, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.75rem', gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '0.72rem', color: '#888' }}>การ์ดจอ / ชิปประมวลผลกราฟิก (GPU Renderer & Vendor)</div>
                    <div style={{ fontWeight: 600, color: '#00d2ff', fontSize: '0.88rem', marginTop: '2px' }}>
                      🎮 {viewingUserDevice.info?.gpuRenderer || 'ไม่ระบุ'}
                      {viewingUserDevice.info?.gpuVendor && viewingUserDevice.info?.gpuVendor !== viewingUserDevice.info?.gpuRenderer && (
                        <span style={{ color: '#b89ca2', fontSize: '0.78rem', marginLeft: '6px' }}>
                          ({viewingUserDevice.info.gpuVendor})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Screen */}
                  <div style={{ background: 'rgba(25, 7, 12, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#888' }}>ความละเอียดหน้าจอ (Screen Resolution)</div>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem', marginTop: '2px' }}>
                      📐 {viewingUserDevice.info?.screenResolution || 'ไม่ระบุ'}
                      {viewingUserDevice.info?.colorDepth && (
                        <span style={{ color: '#888', fontSize: '0.75rem', marginLeft: '4px' }}>
                          ({viewingUserDevice.info.colorDepth})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CPU Cores & RAM */}
                  <div style={{ background: 'rgba(25, 7, 12, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#888' }}>สเปก CPU & RAM</div>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem', marginTop: '2px' }}>
                      ⚡ {viewingUserDevice.info?.cpuCores ? `${viewingUserDevice.info.cpuCores} Cores` : 'ไม่ระบุ'} • RAM:{' '}
                      <span style={{ color: '#00e676' }}>{viewingUserDevice.info?.ramGb || 'ไม่ระบุ'}</span>
                    </div>
                  </div>

                  {/* Touch Points */}
                  <div style={{ background: 'rgba(25, 7, 12, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#888' }}>จุดสัมผัสหน้าจอ (Touch Points)</div>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem', marginTop: '2px' }}>
                      👆 {viewingUserDevice.info?.touchPoints !== undefined ? `${viewingUserDevice.info.touchPoints} จุด` : '0 จุด (เมาส์)'}
                    </div>
                  </div>

                  {/* Timezone & Language */}
                  <div style={{ background: 'rgba(25, 7, 12, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#888' }}>โซนเวลา & ภาษา (Timezone & Lang)</div>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem', marginTop: '2px' }}>
                      🌍 {viewingUserDevice.info?.timezone || 'ไม่ระบุ'} ({viewingUserDevice.info?.language || 'th-TH'})
                    </div>
                  </div>

                  {/* Connection */}
                  <div style={{ background: 'rgba(25, 7, 12, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#888' }}>ประเภทอินเทอร์เน็ต (Connection)</div>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem', marginTop: '2px' }}>
                      📶 {viewingUserDevice.info?.connectionType || 'Broadband / Wi-Fi'}
                    </div>
                  </div>

                  {/* Captured At */}
                  <div style={{ background: 'rgba(25, 7, 12, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#888' }}>บันทึกสเปกล่าสุดเมื่อ</div>
                    <div style={{ fontWeight: 600, color: '#b89ca2', fontSize: '0.82rem', marginTop: '2px' }}>
                      ⏰ {viewingUserDevice.info?.capturedAt ? new Date(viewingUserDevice.info.capturedAt).toLocaleString('th-TH') : 'บันทึกพร้อมประวัติบัญชี'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Hardware Ban & Close */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button
                  type="button"
                  className="btn-outline"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setViewingUserDevice(null)}
                >
                  ปิดหน้าต่าง
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  style={{
                    flex: 1.5,
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #b91c1c, #dc2626)',
                    borderColor: '#ef4444'
                  }}
                  onClick={() => {
                    const targetDid = viewingUserDevice.info?.deviceId || viewingUserDevice.user.deviceFingerprint;
                    if (!targetDid) {
                      showToast('ผู้ใช้รายนี้ยังไม่มีรหัสเครื่องที่สามารถสั่งแบนได้');
                      return;
                    }
                    const modelName = viewingUserDevice.info?.model || viewingUserDevice.user.lastDeviceModel || 'Unknown Device';
                    const confirmBan = window.confirm(
                      `⚠️ ยืนยันการสั่งแบนเลขเครื่อง (Hardware Ban) นี้ใช่หรือไม่?\n\n- เลขเครื่อง: ${targetDid}\n- รุ่นอุปกรณ์: ${modelName}\n- ผู้ใช้: @${viewingUserDevice.user.username}\n\nเมื่อแบนแล้ว อุปกรณ์เครื่องนี้จะไม่สามารถเข้าสู่เว็บไซต์ได้ทุกบัญชี`
                    );
                    if (!confirmBan) return;
                    handleBanDevice(targetDid, modelName, `แบนเลขเครื่องจากผู้ใช้ @${viewingUserDevice.user.username}`);
                    setViewingUserDevice(null);
                  }}
                >
                  <IconLock size={15} />
                  <span>🚫 สั่งแบนเลขเครื่องนี้ (Hardware Ban)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* USER LOCATION & GOOGLE MAPS MODAL */}
      {viewingUserMap && (
        <div className="modal-overlay" onClick={() => setViewingUserMap(null)}>
          <div
            className="modal-content"
            style={{
              maxWidth: '820px',
              width: '95%',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: 'linear-gradient(180deg, #16080d 0%, #0d0407 100%)',
              border: '1px solid rgba(16, 185, 129, 0.45)',
              boxShadow: '0 0 50px rgba(16, 185, 129, 0.25), 0 25px 50px rgba(0, 0, 0, 0.9)',
              borderRadius: '24px',
              padding: '1.75rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.28), rgba(5, 150, 105, 0.15))',
                    border: '1.5px solid #10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    boxShadow: '0 0 20px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  🗺️
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>ตำแหน่งพิกัดบน Google Map</span>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.18)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                      LIVE GPS
                    </span>
                  </h3>
                  <div style={{ fontSize: '0.84rem', color: '#b89ca2', marginTop: '3px' }}>
                    ยูสเซอร์: <strong style={{ color: '#fff' }}>@{viewingUserMap.username}</strong> (ID: #{viewingUserMap.id}) • {viewingUserMap.email}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingUserMap(null)}
                style={{ background: 'none', border: 'none', color: '#888', fontSize: '1.6rem', cursor: 'pointer', padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            {/* Quick Meta Cards & Google Map */}
            {(() => {
              const lat = Number(viewingUserMap.latitude) || 13.7563;
              const lon = Number(viewingUserMap.longitude) || 100.5018;
              const cityName = viewingUserMap.city || 'กรุงเทพมหานคร (Bangkok)';
              const countryName = viewingUserMap.country || 'Thailand';
              const ispName = viewingUserMap.isp || 'อินเทอร์เน็ต';
              const lastIp = viewingUserMap.lastIp || '127.0.0.1';

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Grid info stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
                    <div style={{ background: 'rgba(0,0,0,0.45)', padding: '0.85rem 1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.74rem', color: '#888', display: 'block', marginBottom: '2px' }}>📌 พิกัด (Coordinates):</span>
                      <span style={{ fontSize: '0.95rem', color: '#34d399', fontWeight: 800 }}>
                        {lat.toFixed(4)}, {lon.toFixed(4)}
                      </span>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.45)', padding: '0.85rem 1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.74rem', color: '#888', display: 'block', marginBottom: '2px' }}>🏙️ เมือง / พื้นที่:</span>
                      <span style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: 700 }}>
                        {cityName}
                      </span>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.45)', padding: '0.85rem 1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.74rem', color: '#888', display: 'block', marginBottom: '2px' }}>🌐 ประเทศ & ผู้ให้บริการ:</span>
                      <span style={{ fontSize: '0.88rem', color: '#ffffff', fontWeight: 600 }}>
                        {countryName} ({ispName})
                      </span>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.45)', padding: '0.85rem 1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.74rem', color: '#888', display: 'block', marginBottom: '2px' }}>🌐 หมายเลข IP ล่าสุด:</span>
                      <span style={{ fontSize: '0.95rem', color: '#ff4d6d', fontWeight: 800 }}>
                        {lastIp}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Google Map Embed */}
                  <div style={{ position: 'relative', width: '100%', borderRadius: '18px', overflow: 'hidden', border: '1.5px solid rgba(16, 185, 129, 0.45)', boxShadow: '0 10px 35px rgba(0, 0, 0, 0.8)' }}>
                    <iframe
                      title={`Google Map - ${viewingUserMap.username}`}
                      width="100%"
                      height="400"
                      style={{ border: 'none', display: 'block' }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://maps.google.com/maps?q=${lat},${lon}&hl=th&z=13&output=embed`}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-primary"
                        style={{
                          textDecoration: 'none',
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          padding: '0.6rem 1.25rem',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          boxShadow: '0 0 15px rgba(16, 185, 129, 0.35)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>🌍 เปิดบน Google Maps (เต็มจอ)</span>
                        <IconExternalLink size={15} />
                      </a>

                      <button
                        type="button"
                        className="btn-outline"
                        style={{ fontSize: '0.88rem', padding: '0.6rem 1.15rem' }}
                        onClick={() => {
                          navigator.clipboard.writeText(`${lat}, ${lon}`);
                          showToast(`คัดลอกพิกัด ${lat}, ${lon} เรียบร้อยแล้ว`);
                        }}
                      >
                        <IconCopy size={15} />
                        <span>คัดลอกพิกัด (Lat, Lon)</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      className="btn-outline"
                      style={{ fontSize: '0.88rem', padding: '0.6rem 1.5rem' }}
                      onClick={() => setViewingUserMap(null)}
                    >
                      ✕ ปิดหน้าต่าง
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ANIMATED CREATOR CREDITS MODAL (เด้งมากลางจอ) */}
      {showCreatorModal && (
        <div className="modal-overlay" onClick={() => setShowCreatorModal(false)}>
          <div
            className="modal-content"
            style={{
              maxWidth: '520px',
              width: '92%',
              background: 'linear-gradient(180deg, #18080f 0%, #0d0306 100%)',
              border: '1.5px solid rgba(255, 26, 64, 0.55)',
              boxShadow: '0 0 60px rgba(255, 26, 64, 0.35), 0 25px 60px rgba(0, 0, 0, 0.9)',
              borderRadius: '24px',
              padding: '2.25rem 1.75rem',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              animation: 'creatorModalPop 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              backdropFilter: 'blur(20px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Radial Glow */}
            <div
              style={{
                position: 'absolute',
                top: '-20%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '320px',
                height: '240px',
                background: 'radial-gradient(circle, rgba(255, 26, 64, 0.28) 0%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 0
              }}
            />

            {/* Close Button Top Right */}
            <button
              type="button"
              onClick={() => setShowCreatorModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1.1rem',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#aaa',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                zIndex: 2
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255, 26, 64, 0.3)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.08)'; (e.currentTarget as HTMLElement).style.color = '#aaa'; }}
            >
              ✕
            </button>

            {/* Animated Avatar Container (Website Logo as Creator Avatar with Spinning Gradient Aura) */}
            <div
              style={{
                position: 'relative',
                width: '120px',
                height: '120px',
                margin: '0 auto 1.5rem',
                zIndex: 1
              }}
            >
              {/* Outer Spinning Gradient Ring */}
              <div
                style={{
                  position: 'absolute',
                  inset: '-5px',
                  borderRadius: '50%',
                  background: 'conic-gradient(from 0deg, #ff1a40, #ff0077, #f09433, #00d2ff, #ff1a40)',
                  animation: 'avatarSpinAura 6s linear infinite',
                  opacity: 0.85,
                  filter: 'blur(2px)'
                }}
              />
              {/* Inner Avatar Frame */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: '#0d0306',
                  padding: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 30px rgba(255, 26, 64, 0.5)',
                  animation: 'avatarFloatBounce 3s ease-in-out infinite'
                }}
              >
                <img
                  src={siteSettings.logo_url || '/logo.png'}
                  alt="Creator Avatar"
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'contain',
                    background: 'rgba(255, 26, 64, 0.1)'
                  }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              {/* Verified Dev Badge */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  right: '2px',
                  background: '#00d2ff',
                  color: '#000',
                  borderRadius: '50%',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 900,
                  boxShadow: '0 0 12px rgba(0, 210, 255, 0.8)',
                  border: '2px solid #0d0306'
                }}
                title="Verified Project Creator"
              >
                ✓
              </div>
            </div>

            {/* Title & Subtitle */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255, 26, 64, 0.15)',
                  border: '1px solid rgba(255, 26, 64, 0.4)',
                  padding: '0.3rem 0.9rem',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#ff4d6d',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  marginBottom: '0.65rem'
                }}
              >
                <IconSparkles size={14} color="#ff4d6d" />
                <span>PROJECT CREATOR & LEAD DEV</span>
              </div>

              <h2
                style={{
                  fontSize: '1.65rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  margin: '0 0 0.35rem',
                  letterSpacing: '-0.5px'
                }}
              >
                ผู้สร้างเว็บไซต์ {siteSettings.brand_name || 'HexSyncTH'}
              </h2>

              {/* Instagram Highlight Tag */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '0.45rem 1rem',
                  margin: '0.75rem 0 1.25rem'
                }}
              >
                <span style={{ color: '#b89ca2', fontSize: '0.9rem' }}>Instagram (IG):</span>
                <span style={{ color: '#ff4d6d', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.5px' }}>
                  mmnnxx._nx
                </span>
              </div>

              {/* Action Buttons: IG Direct Link & Copy */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <a
                  href="https://www.instagram.com/mmnnxx._nx"
                  target="_blank"
                  rel="noreferrer"
                  className="creator-ig-btn"
                  title="คลิกเพื่อเปิดไปยัง Instagram: mmnnxx._nx"
                >
                  <IconInstagram size={20} color="#fff" />
                  <span>ติดตาม IG : mmnnxx._nx</span>
                  <IconExternalLink size={15} color="#fff" />
                </a>

                <button
                  type="button"
                  className="btn-outline"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '0.65rem',
                    fontSize: '0.85rem',
                    color: '#d0c0c5',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onClick={() => {
                    navigator.clipboard.writeText('mmnnxx._nx');
                    showToast('คัดลอกชื่อ Instagram: mmnnxx._nx แล้ว!');
                  }}
                >
                  <IconCopy size={15} />
                  <span>คัดลอกชื่อไอจี (mmnnxx._nx)</span>
                </button>
              </div>

              {/* Badges / Tech Highlights */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.45rem',
                  justifyContent: 'center',
                  paddingTop: '1rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <span style={{ fontSize: '0.74rem', background: 'rgba(255,26,64,0.12)', border: '1px solid rgba(255,26,64,0.3)', color: '#ff88a3', padding: '3px 9px', borderRadius: '12px' }}>
                  ⚡ Full-Stack Architect
                </span>
                <span style={{ fontSize: '0.74rem', background: 'rgba(0,210,255,0.1)', border: '1px solid rgba(0,210,255,0.3)', color: '#00d2ff', padding: '3px 9px', borderRadius: '12px' }}>
                  🛡️ Security MAX & WAF
                </span>
                <span style={{ fontSize: '0.74rem', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', padding: '3px 9px', borderRadius: '12px' }}>
                  🤖 Auto-Delivery 24h
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer & Mobile Nav (Hidden when viewing dedicated banned page) */}
      {view !== 'banned' && (
        <>
          <footer className="footer">
            <div className="footer-content">
              <div className="footer-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>© 2026 {siteSettings.brand_name || 'HexSyncTH'}. ระบบร้านค้าออนไลน์และจัดส่งคีย์อัตโนมัติ</span>
                <span style={{ opacity: 0.3 }}>•</span>
                <button
                  type="button"
                  onClick={() => setShowCreatorModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ff4d6d',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="คลิกเพื่อดูเครดิตผู้สร้างเว็บไซต์"
                >
                  ✨ เครดิตผู้สร้าง (IG: mmnnxx._nx)
                </button>
              </div>
              <div className="footer-badges">
                <span>🛡️ ปลอดภัย 100%</span>
                <span>⚡ จัดส่งคีย์ออโต้ 24 ชม.</span>
                <span>🎁 เติมเงินระบบออโต้เข้าทันที</span>
              </div>
            </div>
          </footer>

          {/* MOBILE BOTTOM NAVIGATION BAR (iOS / Android Native App Bar) */}
          <nav className="mobile-bottom-nav">
            <button
              className={`mobile-nav-item ${view === 'store' ? 'active' : ''}`}
              onClick={() => setView('store')}
            >
              <IconShoppingBag size={20} />
              <span>หน้าร้าน</span>
            </button>

            <button
              className={`mobile-nav-item ${view === 'history' ? 'active' : ''}`}
              onClick={() => {
                if (!user) {
                  setAuthTab('login');
                  setAuthModalOpen(true);
                } else {
                  setView('history');
                }
              }}
            >
              <IconHistory size={20} />
              <span>ประวัติ</span>
            </button>

            {user && (
              <button
                className={`mobile-nav-item ${view === 'status' ? 'active' : ''}`}
                onClick={() => setView('status')}
              >
                <ShieldCheck size={20} color={view === 'status' ? '#10b981' : 'currentColor'} />
                <span>สถานะเกม</span>
              </button>
            )}

            <button
              className="mobile-nav-item mobile-nav-highlight"
              onClick={handleOpenTopup}
              title="เติมเงินซองอั่งเปา & ธนาคาร"
            >
              <div className="mobile-highlight-icon">
                <IconGift size={22} />
              </div>
              <span>เติมเงิน</span>
            </button>

            <button
              className="mobile-nav-item"
              onClick={() => setShowCartModal(true)}
            >
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <IconCart size={20} />
                {cart.length > 0 && (
                  <span className="mobile-cart-badge">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </div>
              <span>ตะกร้า</span>
            </button>

            {(user?.role === 'admin' || user?.role === 'superadmin') ? (
              view === 'admin' ? (
                <button
                  className="mobile-nav-item"
                  onClick={() => {
                    if (window.confirm('คุณต้องการออกจากระบบหรือไม่?')) {
                      handleLogout();
                    }
                  }}
                  style={{ color: '#ff4d6d' }}
                  title="ออกจากระบบ"
                >
                  <IconLogOut size={20} />
                  <span>ออกระบบ</span>
                </button>
              ) : (
                <button
                  className="mobile-nav-item"
                  onClick={() => {
                    setView('admin');
                    fetchAdminData();
                  }}
                >
                  <IconSettings size={20} />
                  <span>หลังบ้าน</span>
                </button>
              )
            ) : user ? (
              <button
                className="mobile-nav-item"
                onClick={() => {
                  if (window.confirm('คุณต้องการออกจากระบบหรือไม่?')) {
                    handleLogout();
                  }
                }}
              >
                <IconLogOut size={20} />
                <span>ออกระบบ</span>
              </button>
            ) : (
              <button
                className="mobile-nav-item"
                onClick={() => {
                  setAuthTab('login');
                  setAuthModalOpen(true);
                }}
              >
                <IconUser size={20} />
                <span>เข้าสู่ระบบ</span>
              </button>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
