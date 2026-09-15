import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initClientSecurity } from './security'
import { CursorEffect } from './CursorEffect'

// Initialize anti-inspect, anti-F12, anti-dump security protection
initClientSecurity();

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('HexSyncTH App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#080305',
          color: '#fff',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'sans-serif'
        }}>
          <h2 style={{ color: '#ff1a40', marginBottom: '0.75rem', fontSize: '1.4rem' }}>
            ⚠️ เกิดข้อผิดพลาดในการโหลดหน้าเว็บ
          </h2>
          <p style={{ color: '#b89ca2', marginBottom: '1.5rem', maxWidth: '420px', fontSize: '0.9rem', lineHeight: 1.5 }}>
            {this.state.error?.message || 'ระบบไม่สามารถแสดงผลได้ กรุณากดปุ่มรีโหลดเพื่อโหลดหน้าเว็บใหม่'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.75rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #ff1a40, #b3001e)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(255, 26, 64, 0.4)'
            }}
          >
            รีเฟรชหน้าเว็บ (Reload Page)
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <CursorEffect />
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
