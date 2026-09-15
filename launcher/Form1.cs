using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Net.Http;
using System.Net.NetworkInformation;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace HexSyncLauncher;

public class SiteConfig
{
    public string Domain { get; set; } = "hexsyncth.site";
    public string TunnelToken { get; set; } = "eyJhIjoiMzk2MmRhMTY4YjAwZmZhNDM3ZjY1NjkyNTY3ODU0MDYiLCJ0IjoiYTM4YTE4NzUtZmUzZS00Mjc2LTlmZWYtMTRkMzVhMmIyMmE2IiwicyI6Ik9UQXlZbVl6WVRNdE5EQTFNQzAwTWpnd0xUZzVORFV0TmpFNU5URTBObVl5TW1WaiJ9";
    public int BackendPort { get; set; } = 4000;
    public int FrontendPort { get; set; } = 5173;
}

public partial class Form1 : Form
{
    // --- WIN32 WINDOW DRAGGING & ANTI-DEBUGGING APIS ---
    [DllImport("user32.dll")]
    public static extern bool ReleaseCapture();

    [DllImport("user32.dll")]
    public static extern int SendMessage(IntPtr hWnd, int Msg, int wParam, int lParam);

    private const int WM_NCLBUTTONDOWN = 0xA1;
    private const int HT_CAPTION = 0x2;

    private void EnableWindowDrag(Control ctrl)
    {
        ctrl.MouseDown += (s, e) =>
        {
            if (e.Button == MouseButtons.Left)
            {
                ReleaseCapture();
                SendMessage(this.Handle, WM_NCLBUTTONDOWN, HT_CAPTION, 0);
            }
        };
    }

    [DllImport("kernel32.dll", SetLastError = true, ExactSpelling = true)]
    private static extern bool CheckRemoteDebuggerPresent(IntPtr hProcess, ref bool isDebuggerPresent);

    [DllImport("kernel32.dll", SetLastError = true, ExactSpelling = true)]
    private static extern bool IsDebuggerPresent();

    // --- STATE VARIABLES ---
    private bool isAuthenticated = false;
    private SiteConfig siteConfig = new SiteConfig();

    // --- ANIMATION ENGINE ---
    private System.Windows.Forms.Timer animTimer = null!;
    private List<CyberParticle> particles = new List<CyberParticle>();
    private float pulseRadius = 0f;
    private bool pulseGrowing = true;

    // --- CUSTOM TITLE BAR CONTROLS ---
    private Panel pnlTitleBar = null!;
    private CyberButton btnTitleClose = null!;
    private CyberButton btnTitleMin = null!;

    // --- VIEW PANELS ---
    private CyberPanel pnlLoginContainer = null!;
    private CyberPanel pnlModeContainer = null!;
    private CyberPanel pnlNewSetupContainer = null!;
    private CyberPanel pnlGuideModal = null!;
    private Panel pnlDashboardContainer = null!;

    // --- KEYAUTH LOGIN CONTROLS ---
    private CyberInputBox txtCyberLicenseKey = null!;
    private CheckBox chkRememberKey = null!;
    private Label lblLoginMsg = null!;
    private CyberButton btnLoginSubmit = null!;

    // --- MODE SELECTION CONTROLS ---
    private Label lblLicenseBadge = null!;

    // --- NEW SETUP CONTROLS ---
    private CyberInputBox txtNewDomain = null!;
    private CyberInputBox txtNewTunnelToken = null!;
    private CyberInputBox txtNewBackendPort = null!;
    private CyberInputBox txtNewFrontendPort = null!;
    private Label lblNewSetupMsg = null!;

    // --- DASHBOARD CONTROLS ---
    private CyberStatusPill pillOverall = null!;
    private CyberPanel pnlBackendCard = null!;
    private CyberStatusPill pillBackendStatus = null!;
    private CyberPanel pnlFrontendCard = null!;
    private CyberStatusPill pillFrontendStatus = null!;
    private CyberPanel pnlTunnelCard = null!;
    private CyberStatusPill pillTunnelStatus = null!;

    private string _currentAppVersion = "9.1.2";
    public string CurrentAppVersion
    {
        get => GetInstalledVersion();
        set => SetInstalledVersion(value);
    }

    private string GetInstalledVersion()
    {
        try
        {
            string root = GetAppRoot();
            string vFile = Path.Combine(root, "version.json");
            if (File.Exists(vFile))
            {
                string json = File.ReadAllText(vFile).TrimStart('\uFEFF');
                using JsonDocument doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("version", out var vProp))
                {
                    string? vStr = vProp.GetString();
                    if (!string.IsNullOrEmpty(vStr))
                    {
                        _currentAppVersion = vStr.Trim().TrimStart('v', 'V');
                        return _currentAppVersion;
                    }
                }
            }
        }
        catch { }
        return _currentAppVersion;
    }

    private void SetInstalledVersion(string newVersion)
    {
        _currentAppVersion = newVersion.Trim().TrimStart('v', 'V');
        try
        {
            string root = GetAppRoot();
            string vFile = Path.Combine(root, "version.json");
            var vObj = new
            {
                version = _currentAppVersion,
                updatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
            };
            string json = JsonSerializer.Serialize(vObj, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(vFile, json, new UTF8Encoding(false));

            if (this.IsHandleCreated)
            {
                this.Invoke(() =>
                {
                    this.Text = $"HexSyncTH — Web Controller & Server Orchestrator (Version {_currentAppVersion})";
                    if (lblVersionWatermark != null)
                    {
                        lblVersionWatermark.Text = $"Version {_currentAppVersion} By : HexSyncTH";
                        lblVersionWatermark.Invalidate();
                    }
                });
            }
        }
        catch { }
    }
    private CyberButton btnStartAll = null!;
    private CyberButton btnStopAll = null!;
    private CyberButton btnRestart = null!;
    private CyberButton btnOpenWeb = null!;
    private CyberButton btnOpenLocal = null!;
    private CyberButton btnCheckUpdate = null!;
    private CyberButton btnClearLogs = null!;
    private CyberButton btnLogout = null!;

    private CyberPanel pnlConsoleContainer = null!;
    private RichTextBox txtConsole = null!;
    private System.Windows.Forms.Timer statusTimer = null!;
    private System.Windows.Forms.Timer antiCrackTimer = null!;

    private bool isBackendOnline = false;
    private bool isFrontendOnline = false;
    private bool isTunnelOnline = false;

    // Watermark label fixed in bottom left
    private Label lblVersionWatermark = null!;

    public Form1()
    {
        InitializeComponent();

        this.DoubleBuffered = true;
        this.SetStyle(ControlStyles.ResizeRedraw, true);

        this.Load += (s, e) => File.AppendAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "app_debug_log.txt"), $"[{DateTime.Now}] Form1 Load event\n");
        this.Shown += (s, e) => File.AppendAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "app_debug_log.txt"), $"[{DateTime.Now}] Form1 Shown event\n");
        this.FormClosing += (s, e) => File.AppendAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "app_debug_log.txt"), $"[{DateTime.Now}] Form1 Closing reason: {e.CloseReason}\n");

        LoadSiteConfig();
        InitWindowProperties();
        InitParticleEngine();
        BuildUI();
        StartSecurityGuard();
        StartMonitorTimer();
    }

    private void InitWindowProperties()
    {
        this.Text = "HexSyncTH — Web Controller & Server Orchestrator (Version 9.1.2)";
        this.Size = new Size(960, 750);
        this.MinimumSize = new Size(960, 750);
        this.StartPosition = FormStartPosition.CenterScreen;
        this.FormBorderStyle = FormBorderStyle.None;
        this.BackColor = Color.FromArgb(12, 6, 9);
        this.ForeColor = Color.White;
        this.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

        EnableWindowDrag(this);
    }

    protected override void OnResize(EventArgs e)
    {
        base.OnResize(e);
        if (this.Width > 10 && this.Height > 10)
        {
            try
            {
                using (GraphicsPath path = CyberPathHelper.CreateRoundedPath(new RectangleF(0, 0, this.Width, this.Height), 16))
                {
                    this.Region?.Dispose();
                    this.Region = new Region(path);
                }
            }
            catch { }
        }
    }

    // --- CONFIG PERSISTENCE ---
    private void LoadSiteConfig()
    {
        try
        {
            string path = Path.Combine(GetAppRoot(), "site_config.json");
            if (File.Exists(path))
            {
                string json = File.ReadAllText(path);
                var loaded = JsonSerializer.Deserialize<SiteConfig>(json);
                if (loaded != null) siteConfig = loaded;
            }
        }
        catch { }
    }

    private void SaveSiteConfig()
    {
        try
        {
            string path = Path.Combine(GetAppRoot(), "site_config.json");
            string json = JsonSerializer.Serialize(siteConfig, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(path, json);
        }
        catch { }
    }

    // --- GDI+ CYBER PARTICLES & RADAR ANIMATION ---
    private class CyberParticle
    {
        public float X, Y, Vx, Vy, Radius, Alpha;
        public Color BaseColor;
    }

    private void InitParticleEngine()
    {
        Random rnd = new Random();
        Color[] cyberPalette = new Color[]
        {
            Color.FromArgb(255, 26, 64),
            Color.FromArgb(255, 77, 109),
            Color.FromArgb(255, 0, 85),
            Color.FromArgb(0, 210, 255),
            Color.FromArgb(255, 255, 255)
        };

        for (int i = 0; i < 45; i++)
        {
            particles.Add(new CyberParticle
            {
                X = (float)(rnd.NextDouble() * 960),
                Y = (float)(rnd.NextDouble() * 750),
                Vx = (float)((rnd.NextDouble() - 0.5) * 0.95),
                Vy = (float)((rnd.NextDouble() - 0.5) * 0.95),
                Radius = (float)(rnd.NextDouble() * 2.8 + 1.2),
                Alpha = (float)(rnd.NextDouble() * 0.6 + 0.3),
                BaseColor = cyberPalette[rnd.Next(cyberPalette.Length)]
            });
        }

        animTimer = new System.Windows.Forms.Timer();
        animTimer.Interval = 33; // ~30 FPS
        animTimer.Tick += (s, e) =>
        {
            for (int i = 0; i < particles.Count; i++)
            {
                var p = particles[i];
                p.X += p.Vx;
                p.Y += p.Vy;

                if (p.X < 0) { p.X = 0; p.Vx *= -1; }
                if (p.X > this.Width) { p.X = this.Width; p.Vx *= -1; }
                if (p.Y < 0) { p.Y = 0; p.Vy *= -1; }
                if (p.Y > this.Height) { p.Y = this.Height; p.Vy *= -1; }
            }

            if (pulseGrowing)
            {
                pulseRadius += 0.8f;
                if (pulseRadius > 180f) pulseGrowing = false;
            }
            else
            {
                pulseRadius -= 0.8f;
                if (pulseRadius < 70f) pulseGrowing = true;
            }

            this.Invalidate();
        };
        animTimer.Start();
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        if (this.ClientRectangle.Width <= 0 || this.ClientRectangle.Height <= 0) return;

        Graphics g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;

        // 1. Background gradient
        using (LinearGradientBrush bgBrush = new LinearGradientBrush(this.ClientRectangle, Color.FromArgb(10, 5, 8), Color.FromArgb(20, 8, 14), 65f))
        {
            g.FillRectangle(bgBrush, this.ClientRectangle);
        }

        // 2. Animated Cyber Radar Pulse at Center
        Point center = new Point(this.Width / 2, this.Height / 2 - 30);
        int alpha = (int)Math.Max(10, Math.Min(45, 45 - (pulseRadius / 180f) * 35));
        using (Pen pulsePen = new Pen(Color.FromArgb(alpha, 255, 26, 64), 1.5f))
        {
            g.DrawEllipse(pulsePen, center.X - pulseRadius, center.Y - pulseRadius, pulseRadius * 2, pulseRadius * 2);
            g.DrawEllipse(pulsePen, center.X - pulseRadius * 0.6f, center.Y - pulseRadius * 0.6f, pulseRadius * 1.2f, pulseRadius * 1.2f);
        }

        // 3. Draw Connecting Mesh Lines
        for (int i = 0; i < particles.Count; i++)
        {
            for (int j = i + 1; j < particles.Count; j++)
            {
                float dx = particles[i].X - particles[j].X;
                float dy = particles[i].Y - particles[j].Y;
                float dist = (float)Math.Sqrt(dx * dx + dy * dy);

                if (dist < 85f)
                {
                    int lineAlpha = (int)((1f - (dist / 85f)) * 55f);
                    using (Pen linePen = new Pen(Color.FromArgb(lineAlpha, 255, 40, 75), 1f))
                    {
                        g.DrawLine(linePen, particles[i].X, particles[i].Y, particles[j].X, particles[j].Y);
                    }
                }
            }
        }

        // 4. Draw Glowing Particle Dots
        foreach (var p in particles)
        {
            using (SolidBrush dotBrush = new SolidBrush(Color.FromArgb((int)(p.Alpha * 255), p.BaseColor)))
            {
                g.FillEllipse(dotBrush, p.X - p.Radius, p.Y - p.Radius, p.Radius * 2, p.Radius * 2);
            }
        }

        // 5. Sleek glowing border around the frameless window
        using (GraphicsPath borderPath = CyberPathHelper.CreateRoundedPath(new RectangleF(0.5f, 0.5f, this.Width - 1f, this.Height - 1f), 16))
        {
            using (Pen windowBorderPen = new Pen(Color.FromArgb(90, 255, 42, 85), 1.5f))
            {
                g.DrawPath(windowBorderPen, borderPath);
            }
        }

        base.OnPaint(e);
    }

    // --- ANTI-CRACK & ANTI-REVERSE-ENGINEERING ENGINE ---
    private void StartSecurityGuard()
    {
        antiCrackTimer = new System.Windows.Forms.Timer();
        antiCrackTimer.Interval = 1500;
        antiCrackTimer.Tick += (s, e) =>
        {
            PerformSecurityAudit();
        };
        antiCrackTimer.Start();
    }

    private void PerformSecurityAudit()
    {
        if (Debugger.IsAttached || IsDebuggerPresent())
        {
            TriggerSecurityTripwire("Debugger Attached (ตรวจพบดีบักเกอร์เชื่อมต่อในโปรเซส)");
            return;
        }

        bool isRemoteDebugger = false;
        try
        {
            CheckRemoteDebuggerPresent(Process.GetCurrentProcess().Handle, ref isRemoteDebugger);
            if (isRemoteDebugger)
            {
                TriggerSecurityTripwire("Remote Debugger Attached (ตรวจพบรีโมตดีบักเกอร์)");
                return;
            }
        }
        catch { }

        string[] blacklist = new string[]
        {
            "x64dbg", "x32dbg", "ida", "ida64", "dnspy", "ilspy",
            "cheatengine", "processhacker", "fiddler", "wireshark",
            "httpdebugger", "ollydbg", "de4dot", "dotpeek"
        };

        foreach (var tool in blacklist)
        {
            try
            {
                if (Process.GetProcessesByName(tool).Length > 0)
                {
                    TriggerSecurityTripwire($"Forbidden Tool Detected: {tool}.exe (ตรวจพบเครื่องมือเจาะระบบ)");
                    return;
                }
            }
            catch { }
        }
    }

    private void TriggerSecurityTripwire(string reason)
    {
        try
        {
            File.AppendAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "app_debug_log.txt"), $"[{DateTime.Now}] Tripped Security: {reason}\n");
            File.AppendAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "security_log.txt"), $"[{DateTime.Now}] Tripped: {reason}\n");
        }
        catch { }
        antiCrackTimer?.Stop();
        animTimer?.Stop();
        MessageBox.Show(
            $"🚨 SECURITY INTEGRITY VIOLATION DETECTED!\n\nเหตุผล: {reason}\n\nระบบความปลอดภัย HexSyncTH ได้ทำการตัดการทำงานและปิดโปรแกรมทันทีเพื่อป้องกันการเจาะระบบ",
            "HexSyncTH Security Shield — Access Denied",
            MessageBoxButtons.OK,
            MessageBoxIcon.Stop
        );
        Environment.Exit(0);
    }

    // --- CUSTOM TITLE BAR ---
    private void BuildCustomTitleBar()
    {
        pnlTitleBar = new Panel
        {
            Location = new Point(0, 0),
            Size = new Size(this.Width, 42),
            BackColor = Color.FromArgb(18, 9, 14),
            Dock = DockStyle.Top
        };
        pnlTitleBar.Paint += (s, e) =>
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            using (Pen borderPen = new Pen(Color.FromArgb(80, 255, 42, 85), 1.5f))
            {
                e.Graphics.DrawLine(borderPen, 0, pnlTitleBar.Height - 1, pnlTitleBar.Width, pnlTitleBar.Height - 1);
            }
        };

        EnableWindowDrag(pnlTitleBar);

        Label lblLogo = new Label
        {
            Text = "⚡",
            Font = new Font("Segoe UI", 12f, FontStyle.Bold),
            ForeColor = Color.FromArgb(255, 26, 64),
            Location = new Point(14, 8),
            AutoSize = true,
            BackColor = Color.FromArgb(18, 9, 14)
        };
        EnableWindowDrag(lblLogo);
        pnlTitleBar.Controls.Add(lblLogo);

        Label lblTitle = new Label
        {
            Text = "HEXSYNC TH  |  Web Controller & Server Orchestrator (Version 9.1.2)",
            Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
            ForeColor = Color.FromArgb(240, 220, 230),
            Location = new Point(40, 11),
            AutoSize = true,
            BackColor = Color.FromArgb(18, 9, 14)
        };
        EnableWindowDrag(lblTitle);
        pnlTitleBar.Controls.Add(lblTitle);

        // Close Button (✕)
        btnTitleClose = new CyberButton
        {
            Text = "✕",
            Font = new Font("Segoe UI", 11f, FontStyle.Bold),
            ForeColor = Color.FromArgb(240, 190, 200),
            CornerRadius = 13,
            Size = new Size(38, 28),
            Location = new Point(this.Width - 48, 7),
            Anchor = AnchorStyles.Top | AnchorStyles.Right,
            GradientStart = Color.FromArgb(48, 18, 25),
            GradientEnd = Color.FromArgb(32, 12, 18),
            HoverGradientStart = Color.FromArgb(255, 30, 70),
            HoverGradientEnd = Color.FromArgb(210, 15, 50),
            BorderGlowColor = Color.FromArgb(90, 255, 42, 85),
            HoverBorderColor = Color.FromArgb(255, 120, 150),
            BorderThickness = 1f
        };
        btnTitleClose.Click += (s, e) =>
        {
            Application.Exit();
        };
        pnlTitleBar.Controls.Add(btnTitleClose);

        // Minimize Button (—)
        btnTitleMin = new CyberButton
        {
            Text = "—",
            Font = new Font("Segoe UI", 10.5f, FontStyle.Bold),
            ForeColor = Color.FromArgb(210, 190, 200),
            CornerRadius = 13,
            Size = new Size(38, 28),
            Location = new Point(this.Width - 92, 7),
            Anchor = AnchorStyles.Top | AnchorStyles.Right,
            GradientStart = Color.FromArgb(35, 20, 30),
            GradientEnd = Color.FromArgb(25, 14, 22),
            HoverGradientStart = Color.FromArgb(65, 40, 60),
            HoverGradientEnd = Color.FromArgb(45, 25, 40),
            BorderGlowColor = Color.FromArgb(70, 50, 65),
            HoverBorderColor = Color.FromArgb(160, 120, 150),
            BorderThickness = 1f
        };
        btnTitleMin.Click += (s, e) =>
        {
            this.WindowState = FormWindowState.Minimized;
        };
        pnlTitleBar.Controls.Add(btnTitleMin);

        this.Controls.Add(pnlTitleBar);
        pnlTitleBar.BringToFront();
    }

    // --- BUILD UI INTERFACE ---
    private void BuildUI()
    {
        // 0. Custom Sleek Frameless Title Bar
        BuildCustomTitleBar();

        // 1. Sleek Rounded Watermark Pill in Bottom Left Corner
        lblVersionWatermark = new Label
        {
            Text = $"Version {CurrentAppVersion} By : HexSyncTH",
            Font = new Font("Segoe UI", 9.2f, FontStyle.Bold),
            ForeColor = Color.FromArgb(255, 85, 120),
            BackColor = Color.FromArgb(22, 12, 20),
            AutoSize = false,
            Size = new Size(230, 28),
            TextAlign = ContentAlignment.MiddleCenter,
            Location = new Point(18, this.ClientSize.Height - 38),
            Anchor = AnchorStyles.Bottom | AnchorStyles.Left
        };
        lblVersionWatermark.Paint += (s, e) =>
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            RectangleF r = new RectangleF(0.5f, 0.5f, lblVersionWatermark.Width - 1.5f, lblVersionWatermark.Height - 1.5f);
            using (var path = CyberPathHelper.CreateRoundedPath(r, 13))
            {
                using (var pen = new Pen(Color.FromArgb(140, 255, 42, 85), 1.2f))
                {
                    e.Graphics.DrawPath(pen, path);
                }
            }
        };
        this.Controls.Add(lblVersionWatermark);
        lblVersionWatermark.BringToFront();

        // 2. Build All App Views
        BuildLoginView();
        BuildModeSelectView();
        BuildNewSetupView();
        BuildDashboardView();
        BuildGuideModal();

        // Start at KeyAuth Login screen
        ShowLoginView();
    }

    // =========================================================================
    // VIEW 1: KEYAUTH LICENSE VERIFICATION PORTAL
    // =========================================================================
    private void BuildLoginView()
    {
        pnlLoginContainer = new CyberPanel
        {
            Size = new Size(520, 500),
            CornerRadius = 26,
            FillColor = Color.FromArgb(20, 13, 24),
            BorderColor = Color.FromArgb(100, 255, 42, 85),
            BorderThickness = 1.5f,
            ShowTopAccentGlow = true,
            AccentGlowColor = Color.FromArgb(255, 26, 64),
            Location = new Point((this.ClientSize.Width - 520) / 2, (this.ClientSize.Height - 500) / 2 + 15)
        };
        this.Controls.Add(pnlLoginContainer);

        Label lblShield = new Label
        {
            Text = "🔑",
            Font = new Font("Segoe UI", 34f),
            TextAlign = ContentAlignment.MiddleCenter,
            Size = new Size(520, 58),
            Location = new Point(0, 22),
            BackColor = Color.FromArgb(20, 13, 24)
        };
        pnlLoginContainer.Controls.Add(lblShield);

        Label lblAuthTitle = new Label
        {
            Text = "HEXSYNCTH LICENSE ACCESS",
            Font = new Font("Segoe UI", 16f, FontStyle.Bold),
            ForeColor = Color.White,
            TextAlign = ContentAlignment.MiddleCenter,
            Size = new Size(520, 32),
            Location = new Point(0, 84),
            BackColor = Color.FromArgb(20, 13, 24)
        };
        pnlLoginContainer.Controls.Add(lblAuthTitle);

        Label lblAuthSub = new Label
        {
            Text = "KeyAuth Licensing Protection • App: zForceCheat (v1.0)",
            Font = new Font("Segoe UI", 8.5f, FontStyle.Bold),
            ForeColor = Color.FromArgb(255, 77, 109),
            TextAlign = ContentAlignment.MiddleCenter,
            Size = new Size(520, 22),
            Location = new Point(0, 118),
            BackColor = Color.FromArgb(20, 13, 24)
        };
        pnlLoginContainer.Controls.Add(lblAuthSub);

        // License Key Input Header
        Label lblKeyHeader = new Label
        {
            Text = "LICENSE KEY (ใส่คีย์เปิดใช้งานของคุณ):",
            Font = new Font("Segoe UI", 8.8f, FontStyle.Bold),
            ForeColor = Color.FromArgb(220, 180, 195),
            Location = new Point(45, 160),
            AutoSize = true,
            BackColor = Color.FromArgb(20, 13, 24)
        };
        pnlLoginContainer.Controls.Add(lblKeyHeader);

        txtCyberLicenseKey = new CyberInputBox
        {
            CornerRadius = 18,
            IconText = "🔑",
            Location = new Point(45, 186),
            Size = new Size(430, 46),
            CapsuleBackColor = Color.FromArgb(14, 9, 18),
            NormalBorderColor = Color.FromArgb(70, 45, 65),
            ActiveBorderColor = Color.FromArgb(255, 42, 85)
        };
        pnlLoginContainer.Controls.Add(txtCyberLicenseKey);

        string? savedKey = KeyAuthManager.LoadSavedLicenseKey();
        if (!string.IsNullOrEmpty(savedKey))
        {
            txtCyberLicenseKey.Text = savedKey;
        }

        // Remember Key Checkbox
        chkRememberKey = new CheckBox
        {
            Text = "จำ License Key ในเครื่องนี้ (Auto-Login)",
            Font = new Font("Segoe UI", 9f, FontStyle.Regular),
            ForeColor = Color.FromArgb(200, 180, 195),
            Location = new Point(48, 242),
            AutoSize = true,
            Checked = true,
            BackColor = Color.FromArgb(20, 13, 24)
        };
        pnlLoginContainer.Controls.Add(chkRememberKey);

        // Error / Info Label
        lblLoginMsg = new Label
        {
            Text = "",
            Font = new Font("Segoe UI", 8.8f, FontStyle.Bold),
            ForeColor = Color.FromArgb(255, 77, 109),
            TextAlign = ContentAlignment.MiddleCenter,
            Size = new Size(430, 26),
            Location = new Point(45, 276),
            BackColor = Color.FromArgb(20, 13, 24)
        };
        pnlLoginContainer.Controls.Add(lblLoginMsg);

        // Submit Button
        btnLoginSubmit = new CyberButton
        {
            Text = "🚀 ACTIVATE & VERIFY LICENSE (ยืนยันสิทธิ์)",
            CornerRadius = 24,
            Font = new Font("Segoe UI", 11f, FontStyle.Bold),
            ForeColor = Color.White,
            GradientStart = Color.FromArgb(255, 26, 64),
            GradientEnd = Color.FromArgb(195, 10, 45),
            HoverGradientStart = Color.FromArgb(255, 65, 98),
            HoverGradientEnd = Color.FromArgb(225, 20, 58),
            BorderGlowColor = Color.FromArgb(255, 100, 130),
            HoverBorderColor = Color.FromArgb(255, 160, 180),
            Size = new Size(430, 50),
            Location = new Point(45, 310)
        };
        btnLoginSubmit.Click += async (s, e) => await HandleKeyAuthSubmit();
        pnlLoginContainer.Controls.Add(btnLoginSubmit);

        txtCyberLicenseKey.InnerTextBox.KeyDown += async (s, e) =>
        {
            if (e.KeyCode == Keys.Enter) await HandleKeyAuthSubmit();
        };

        // Bottom Protection Note
        Label lblGuardNote = new Label
        {
            Text = "🔒 HWID Locked • Cloud Anti-Crack Protected • KeyAuth Secured\nหากยังไม่มีคีย์ กรุณาติดต่อซื้อ License ผ่านผู้ดูแลระบบ",
            Font = new Font("Segoe UI", 8f, FontStyle.Regular),
            ForeColor = Color.FromArgb(150, 120, 130),
            TextAlign = ContentAlignment.MiddleCenter,
            Size = new Size(430, 40),
            Location = new Point(45, 380),
            BackColor = Color.FromArgb(20, 13, 24)
        };
        pnlLoginContainer.Controls.Add(lblGuardNote);
    }

    private async Task HandleKeyAuthSubmit()
    {
        string key = txtCyberLicenseKey.Text.Trim();
        if (string.IsNullOrEmpty(key))
        {
            lblLoginMsg.Text = "⚠️ กรุณากรอก License Key ของคุณ";
            return;
        }

        btnLoginSubmit.Enabled = false;
        btnLoginSubmit.Text = "⏳ กำลังตรวจสอบกับ KeyAuth Server...";
        lblLoginMsg.ForeColor = Color.FromArgb(0, 210, 255);
        lblLoginMsg.Text = "กำลังติดต่อเซิร์ฟเวอร์เพื่อยืนยัน HWID และสิทธิ์ใช้งาน...";

        var result = await KeyAuthManager.AuthenticateLicenseAsync(key);

        if (result.Success)
        {
            if (chkRememberKey.Checked)
            {
                KeyAuthManager.SaveLicenseKey(key);
            }
            else
            {
                KeyAuthManager.DeleteSavedLicenseKey();
            }

            isAuthenticated = true;
            lblLoginMsg.Text = "";
            btnLoginSubmit.Enabled = true;
            btnLoginSubmit.Text = "🚀 ACTIVATE & VERIFY LICENSE (ยืนยันสิทธิ์)";

            // Update license badge in mode selection
            string rank = !string.IsNullOrEmpty(KeyAuthManager.UserRank) ? KeyAuthManager.UserRank : "Verified User";
            string exp = !string.IsNullOrEmpty(KeyAuthManager.ExpiryDate) ? KeyAuthManager.ExpiryDate : "Lifetime / Active";
            lblLicenseBadge.Text = $"👤 สิทธิ์: {rank}   |   ⏳ หมดอายุ: {exp}";

            ShowModeSelectView();
            Log("🎉 เข้าสู่ระบบด้วย KeyAuth สำเร็จ! สิทธิ์: " + rank);
        }
        else
        {
            btnLoginSubmit.Enabled = true;
            btnLoginSubmit.Text = "🚀 ACTIVATE & VERIFY LICENSE (ยืนยันสิทธิ์)";
            lblLoginMsg.ForeColor = Color.FromArgb(255, 77, 109);
            lblLoginMsg.Text = "❌ " + result.Message;
        }
    }

    // =========================================================================
    // VIEW 2: SYSTEM MODE SELECTION (EXISTING SERVER VS SETUP NEW WEBSITE)
    // =========================================================================
    private void BuildModeSelectView()
    {
        pnlModeContainer = new CyberPanel
        {
            Size = new Size(900, 640),
            CornerRadius = 22,
            FillColor = Color.FromArgb(16, 10, 20),
            BorderColor = Color.FromArgb(80, 255, 42, 85),
            BorderThickness = 1.3f,
            ShowTopAccentGlow = true,
            AccentGlowColor = Color.FromArgb(255, 26, 64),
            Location = new Point(30, 48),
            Visible = false
        };
        this.Controls.Add(pnlModeContainer);

        Label lblHeader = new Label
        {
            Text = "⚡ เลือกโหมดการทำงานของระบบ (SYSTEM MODE SELECTION)",
            Font = new Font("Segoe UI", 16f, FontStyle.Bold),
            ForeColor = Color.White,
            TextAlign = ContentAlignment.MiddleCenter,
            Size = new Size(900, 34),
            Location = new Point(0, 18),
            BackColor = Color.FromArgb(16, 10, 20)
        };
        pnlModeContainer.Controls.Add(lblHeader);

        Label lblSub = new Label
        {
            Text = "ยินดีต้อนรับ! กรุณาเลือกโหมดที่ต้องการเปิดใช้งานบนคอมพิวเตอร์เครื่องนี้",
            Font = new Font("Segoe UI", 9.2f, FontStyle.Regular),
            ForeColor = Color.FromArgb(200, 170, 185),
            TextAlign = ContentAlignment.MiddleCenter,
            Size = new Size(900, 22),
            Location = new Point(0, 52),
            BackColor = Color.FromArgb(16, 10, 20)
        };
        pnlModeContainer.Controls.Add(lblSub);

        lblLicenseBadge = new Label
        {
            Text = "👤 สิทธิ์ใช้งาน: Verified User   |   ⏳ สถานะ: Active",
            Font = new Font("Segoe UI", 8.5f, FontStyle.Bold),
            ForeColor = Color.FromArgb(0, 230, 130),
            TextAlign = ContentAlignment.MiddleCenter,
            Size = new Size(900, 20),
            Location = new Point(0, 76),
            BackColor = Color.FromArgb(16, 10, 20)
        };
        pnlModeContainer.Controls.Add(lblLicenseBadge);

        // --- CARD 1: EXISTING SERVER ---
        CyberPanel cardExisting = new CyberPanel
        {
            Size = new Size(420, 360),
            Location = new Point(20, 110),
            CornerRadius = 20,
            FillColor = Color.FromArgb(22, 14, 28),
            BorderColor = Color.FromArgb(0, 200, 120),
            BorderThickness = 1.3f,
            ShowTopAccentGlow = true,
            AccentGlowColor = Color.FromArgb(0, 230, 130)
        };
        pnlModeContainer.Controls.Add(cardExisting);

        Label lblExTitle = new Label
        {
            Text = "⚡ มีอยู่แล้ว (EXISTING SERVER)",
            Font = new Font("Segoe UI", 13.5f, FontStyle.Bold),
            ForeColor = Color.FromArgb(0, 240, 140),
            Location = new Point(18, 16),
            AutoSize = true,
            BackColor = Color.FromArgb(22, 14, 28)
        };
        cardExisting.Controls.Add(lblExTitle);

        Label lblExSub = new Label
        {
            Text = "สำหรับเปิดใช้งานระบบเดิมที่ติดตั้งไว้ในเครื่องนี้ทันที",
            Font = new Font("Segoe UI", 8.8f, FontStyle.Regular),
            ForeColor = Color.FromArgb(170, 140, 150),
            Location = new Point(20, 46),
            AutoSize = true,
            BackColor = Color.FromArgb(22, 14, 28)
        };
        cardExisting.Controls.Add(lblExSub);

        Label lblExDesc = new Label
        {
            Text = "• ฐานข้อมูล SQLite พร้อมใช้งาน ไม่ต้องติดตั้ง DB อื่น\n" +
                   "• พอร์ตมาตรฐาน: API 4000  •  เว็บ SPA 5173\n" +
                   $"• โดเมนปัจจุบัน: {siteConfig.Domain}\n" +
                   "• ควบคุม Start All, Stop, Restart และ Live Telemetry\n" +
                   "• เหมาะสำหรับ: เจ้าของร้านที่ตั้งค่าเครื่องนี้ไว้เรียบร้อยแล้ว",
            Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
            ForeColor = Color.FromArgb(230, 220, 225),
            Location = new Point(20, 85),
            Size = new Size(380, 160),
            BackColor = Color.FromArgb(22, 14, 28)
        };
        cardExisting.Controls.Add(lblExDesc);

        CyberButton btnOpenExisting = new CyberButton
        {
            Text = "🚀 เปิดแดชบอร์ดควบคุม (LAUNCH DASHBOARD)",
            CornerRadius = 22,
            Font = new Font("Segoe UI", 10.5f, FontStyle.Bold),
            ForeColor = Color.White,
            GradientStart = Color.FromArgb(16, 185, 129),
            GradientEnd = Color.FromArgb(5, 150, 105),
            HoverGradientStart = Color.FromArgb(52, 211, 153),
            HoverGradientEnd = Color.FromArgb(16, 185, 129),
            BorderGlowColor = Color.FromArgb(110, 231, 183),
            HoverBorderColor = Color.FromArgb(167, 243, 208),
            Size = new Size(380, 48),
            Location = new Point(20, 280)
        };
        btnOpenExisting.Click += (s, e) => ShowDashboardView();
        cardExisting.Controls.Add(btnOpenExisting);

        // --- CARD 2: SETUP NEW WEBSITE ---
        CyberPanel cardNew = new CyberPanel
        {
            Size = new Size(420, 360),
            Location = new Point(460, 110),
            CornerRadius = 20,
            FillColor = Color.FromArgb(22, 14, 28),
            BorderColor = Color.FromArgb(0, 190, 240),
            BorderThickness = 1.3f,
            ShowTopAccentGlow = true,
            AccentGlowColor = Color.FromArgb(0, 210, 255)
        };
        pnlModeContainer.Controls.Add(cardNew);

        Label lblNewTitle = new Label
        {
            Text = "🌐 เปิดเว็บไซต์ใหม่ (NEW WEBSITE)",
            Font = new Font("Segoe UI", 13.5f, FontStyle.Bold),
            ForeColor = Color.FromArgb(0, 210, 255),
            Location = new Point(18, 16),
            AutoSize = true,
            BackColor = Color.FromArgb(22, 14, 28)
        };
        cardNew.Controls.Add(lblNewTitle);

        Label lblNewSub = new Label
        {
            Text = "สำหรับลูกค้านำไปลงบนเครื่องใหม่ หรือเปลี่ยนชื่อโดเมน",
            Font = new Font("Segoe UI", 8.8f, FontStyle.Regular),
            ForeColor = Color.FromArgb(170, 140, 150),
            Location = new Point(20, 46),
            AutoSize = true,
            BackColor = Color.FromArgb(22, 14, 28)
        };
        cardNew.Controls.Add(lblNewSub);

        Label lblNewDesc = new Label
        {
            Text = "• กำหนดชื่อโดเมนเว็บไซต์ของคุณเอง (Custom Domain)\n" +
                   "• ใส่ Cloudflare Tunnel Token เพื่อออนไลน์ฟรีทั่วโลก\n" +
                   "• กำหนดพอร์ตสำหรับเปิดบนคอมพิวเตอร์เครื่องใหม่\n" +
                   "• มีระบบบันทึกและตั้งค่าเซิร์ฟเวอร์ให้อัตโนมัติในคลิกเดียว\n" +
                   "• เหมาะสำหรับ: ผู้ซื้อโปรเจกต์ หรือย้ายไปรันบนคอมพิวเตอร์เครื่องใหม่",
            Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
            ForeColor = Color.FromArgb(230, 220, 225),
            Location = new Point(20, 85),
            Size = new Size(380, 160),
            BackColor = Color.FromArgb(22, 14, 28)
        };
        cardNew.Controls.Add(lblNewDesc);

        CyberButton btnOpenNewSetup = new CyberButton
        {
            Text = "⚙️ ตั้งค่าเว็บไซต์ใหม่ (CONFIGURE NEW SITE)",
            CornerRadius = 22,
            Font = new Font("Segoe UI", 10.5f, FontStyle.Bold),
            ForeColor = Color.White,
            GradientStart = Color.FromArgb(14, 165, 233),
            GradientEnd = Color.FromArgb(2, 132, 199),
            HoverGradientStart = Color.FromArgb(56, 189, 248),
            HoverGradientEnd = Color.FromArgb(14, 165, 233),
            BorderGlowColor = Color.FromArgb(125, 211, 252),
            HoverBorderColor = Color.FromArgb(186, 230, 253),
            Size = new Size(380, 48),
            Location = new Point(20, 280)
        };
        btnOpenNewSetup.Click += (s, e) => ShowNewSetupView();
        cardNew.Controls.Add(btnOpenNewSetup);

        // Bottom Navigation Buttons
        CyberButton btnModeGuide = new CyberButton
        {
            Text = "📖 วิธีเซ็ตเว็บเริ่มต้น สำหรับมือใหม่ (Beginner Setup Guide)",
            CornerRadius = 22,
            Font = new Font("Segoe UI", 10f, FontStyle.Bold),
            ForeColor = Color.FromArgb(255, 240, 200),
            GradientStart = Color.FromArgb(217, 119, 6),
            GradientEnd = Color.FromArgb(180, 83, 9),
            HoverGradientStart = Color.FromArgb(245, 158, 11),
            HoverGradientEnd = Color.FromArgb(217, 119, 6),
            BorderGlowColor = Color.FromArgb(251, 191, 36),
            HoverBorderColor = Color.FromArgb(254, 243, 199),
            Size = new Size(460, 46),
            Location = new Point(20, 500)
        };
        btnModeGuide.Click += (s, e) => ShowGuideModal();
        pnlModeContainer.Controls.Add(btnModeGuide);

        CyberButton btnModeLogout = new CyberButton
        {
            Text = "🔑 สลับ License Key",
            CornerRadius = 22,
            Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
            ForeColor = Color.FromArgb(230, 180, 190),
            GradientStart = Color.FromArgb(60, 20, 30),
            GradientEnd = Color.FromArgb(40, 12, 20),
            HoverGradientStart = Color.FromArgb(185, 28, 28),
            HoverGradientEnd = Color.FromArgb(153, 27, 27),
            BorderGlowColor = Color.FromArgb(180, 50, 70),
            HoverBorderColor = Color.FromArgb(255, 120, 140),
            Size = new Size(200, 46),
            Location = new Point(500, 500)
        };
        btnModeLogout.Click += (s, e) => ShowLoginView();
        pnlModeContainer.Controls.Add(btnModeLogout);
    }

    // =========================================================================
    // VIEW 3: NEW WEBSITE CONFIGURATION WIZARD
    // =========================================================================
    private void BuildNewSetupView()
    {
        pnlNewSetupContainer = new CyberPanel
        {
            Size = new Size(900, 640),
            CornerRadius = 22,
            FillColor = Color.FromArgb(18, 11, 22),
            BorderColor = Color.FromArgb(0, 190, 240),
            BorderThickness = 1.3f,
            ShowTopAccentGlow = true,
            AccentGlowColor = Color.FromArgb(0, 210, 255),
            Location = new Point(30, 48),
            Visible = false
        };
        this.Controls.Add(pnlNewSetupContainer);

        Label lblHeader = new Label
        {
            Text = "🌐 ตั้งค่าและเปิดเว็บไซต์ใหม่ (DEPLOY NEW WEBSITE)",
            Font = new Font("Segoe UI", 16f, FontStyle.Bold),
            ForeColor = Color.White,
            TextAlign = ContentAlignment.MiddleCenter,
            Size = new Size(900, 34),
            Location = new Point(0, 16),
            BackColor = Color.FromArgb(18, 11, 22)
        };
        pnlNewSetupContainer.Controls.Add(lblHeader);

        Label lblSub = new Label
        {
            Text = "กรอกข้อมูลโดเมนและ Cloudflare Tunnel เพื่อเปิดให้บริการเว็บไซต์บนคอมพิวเตอร์เครื่องนี้",
            Font = new Font("Segoe UI", 9.2f, FontStyle.Regular),
            ForeColor = Color.FromArgb(180, 150, 170),
            TextAlign = ContentAlignment.MiddleCenter,
            Size = new Size(900, 22),
            Location = new Point(0, 48),
            BackColor = Color.FromArgb(18, 11, 22)
        };
        pnlNewSetupContainer.Controls.Add(lblSub);

        // Field 1: Custom Domain
        Label lblDomainTag = new Label
        {
            Text = "🌐 โดเมนเว็บไซต์ของคุณ (เช่น myshop.com หรือ shop.mysite.com):",
            Font = new Font("Segoe UI", 8.8f, FontStyle.Bold),
            ForeColor = Color.FromArgb(0, 210, 255),
            Location = new Point(35, 82),
            AutoSize = true,
            BackColor = Color.FromArgb(18, 11, 22)
        };
        pnlNewSetupContainer.Controls.Add(lblDomainTag);

        txtNewDomain = new CyberInputBox
        {
            CornerRadius = 18,
            IconText = "🌐",
            Location = new Point(35, 106),
            Size = new Size(830, 44),
            Text = siteConfig.Domain,
            CapsuleBackColor = Color.FromArgb(14, 9, 18),
            NormalBorderColor = Color.FromArgb(70, 50, 80),
            ActiveBorderColor = Color.FromArgb(0, 210, 255)
        };
        pnlNewSetupContainer.Controls.Add(txtNewDomain);

        // Field 2: Tunnel Token
        Label lblTokenTag = new Label
        {
            Text = "🛡️ Cloudflare Tunnel Token (คัดลอกรหัส Token ยาวๆ ที่ขึ้นต้นด้วย eyJh... จาก Cloudflare Zero Trust):",
            Font = new Font("Segoe UI", 8.8f, FontStyle.Bold),
            ForeColor = Color.FromArgb(0, 210, 255),
            Location = new Point(35, 160),
            AutoSize = true,
            BackColor = Color.FromArgb(18, 11, 22)
        };
        pnlNewSetupContainer.Controls.Add(lblTokenTag);

        txtNewTunnelToken = new CyberInputBox
        {
            CornerRadius = 18,
            IconText = "🛡️",
            Location = new Point(35, 184),
            Size = new Size(830, 44),
            Text = siteConfig.TunnelToken,
            CapsuleBackColor = Color.FromArgb(14, 9, 18),
            NormalBorderColor = Color.FromArgb(70, 50, 80),
            ActiveBorderColor = Color.FromArgb(0, 210, 255)
        };
        pnlNewSetupContainer.Controls.Add(txtNewTunnelToken);

        // Field 3: Backend Port
        Label lblBPortTag = new Label
        {
            Text = "⚙️ Backend API Port (ค่าเริ่มต้น 4000):",
            Font = new Font("Segoe UI", 8.8f, FontStyle.Bold),
            ForeColor = Color.FromArgb(220, 180, 200),
            Location = new Point(35, 238),
            AutoSize = true,
            BackColor = Color.FromArgb(18, 11, 22)
        };
        pnlNewSetupContainer.Controls.Add(lblBPortTag);

        txtNewBackendPort = new CyberInputBox
        {
            CornerRadius = 18,
            IconText = "⚙️",
            Location = new Point(35, 262),
            Size = new Size(400, 44),
            Text = siteConfig.BackendPort.ToString(),
            CapsuleBackColor = Color.FromArgb(14, 9, 18),
            NormalBorderColor = Color.FromArgb(70, 50, 80),
            ActiveBorderColor = Color.FromArgb(0, 210, 255)
        };
        pnlNewSetupContainer.Controls.Add(txtNewBackendPort);

        // Field 4: Frontend Port
        Label lblFPortTag = new Label
        {
            Text = "💻 Frontend Web Port (ค่าเริ่มต้น 5173):",
            Font = new Font("Segoe UI", 8.8f, FontStyle.Bold),
            ForeColor = Color.FromArgb(220, 180, 200),
            Location = new Point(465, 238),
            AutoSize = true,
            BackColor = Color.FromArgb(18, 11, 22)
        };
        pnlNewSetupContainer.Controls.Add(lblFPortTag);

        txtNewFrontendPort = new CyberInputBox
        {
            CornerRadius = 18,
            IconText = "💻",
            Location = new Point(465, 262),
            Size = new Size(400, 44),
            Text = siteConfig.FrontendPort.ToString(),
            CapsuleBackColor = Color.FromArgb(14, 9, 18),
            NormalBorderColor = Color.FromArgb(70, 50, 80),
            ActiveBorderColor = Color.FromArgb(0, 210, 255)
        };
        pnlNewSetupContainer.Controls.Add(txtNewFrontendPort);

        lblNewSetupMsg = new Label
        {
            Text = "💡 ระบบจะบันทึกการตั้งค่าลงในไฟล์ site_config.json และ server/.env อัตโนมัติ",
            Font = new Font("Segoe UI", 9f, FontStyle.Regular),
            ForeColor = Color.FromArgb(0, 230, 130),
            TextAlign = ContentAlignment.MiddleCenter,
            Size = new Size(830, 24),
            Location = new Point(35, 320),
            BackColor = Color.FromArgb(18, 11, 22)
        };
        pnlNewSetupContainer.Controls.Add(lblNewSetupMsg);

        // Action Buttons
        CyberButton btnSaveAndLaunch = new CyberButton
        {
            Text = "💾 บันทึกและเริ่มต้นระบบ (SAVE & LAUNCH SYSTEM)",
            CornerRadius = 24,
            Font = new Font("Segoe UI", 11f, FontStyle.Bold),
            ForeColor = Color.White,
            GradientStart = Color.FromArgb(16, 185, 129),
            GradientEnd = Color.FromArgb(5, 150, 105),
            HoverGradientStart = Color.FromArgb(52, 211, 153),
            HoverGradientEnd = Color.FromArgb(16, 185, 129),
            BorderGlowColor = Color.FromArgb(110, 231, 183),
            HoverBorderColor = Color.FromArgb(167, 243, 208),
            Size = new Size(830, 50),
            Location = new Point(35, 356)
        };
        btnSaveAndLaunch.Click += (s, e) => HandleSaveAndLaunchNewSetup();
        pnlNewSetupContainer.Controls.Add(btnSaveAndLaunch);

        CyberButton btnGuideFromSetup = new CyberButton
        {
            Text = "📖 ดูวิธีขอ Cloudflare Tunnel และผูกโดเมน (เปิดคู่มือ)",
            CornerRadius = 22,
            Font = new Font("Segoe UI", 9.8f, FontStyle.Bold),
            ForeColor = Color.FromArgb(255, 240, 200),
            GradientStart = Color.FromArgb(217, 119, 6),
            GradientEnd = Color.FromArgb(180, 83, 9),
            HoverGradientStart = Color.FromArgb(245, 158, 11),
            HoverGradientEnd = Color.FromArgb(217, 119, 6),
            BorderGlowColor = Color.FromArgb(251, 191, 36),
            HoverBorderColor = Color.FromArgb(254, 243, 199),
            Size = new Size(540, 46),
            Location = new Point(35, 420)
        };
        btnGuideFromSetup.Click += (s, e) => ShowGuideModal();
        pnlNewSetupContainer.Controls.Add(btnGuideFromSetup);

        CyberButton btnBackFromSetup = new CyberButton
        {
            Text = "⬅️ ย้อนกลับไปหน้าเลือกโหมด",
            CornerRadius = 22,
            Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
            ForeColor = Color.FromArgb(220, 200, 210),
            GradientStart = Color.FromArgb(50, 30, 45),
            GradientEnd = Color.FromArgb(32, 18, 30),
            HoverGradientStart = Color.FromArgb(80, 45, 70),
            HoverGradientEnd = Color.FromArgb(50, 25, 45),
            BorderGlowColor = Color.FromArgb(120, 80, 110),
            HoverBorderColor = Color.FromArgb(180, 130, 160),
            Size = new Size(270, 46),
            Location = new Point(595, 420)
        };
        btnBackFromSetup.Click += (s, e) => ShowModeSelectView();
        pnlNewSetupContainer.Controls.Add(btnBackFromSetup);
    }

    private void HandleSaveAndLaunchNewSetup()
    {
        string domain = txtNewDomain.Text.Trim();
        string token = txtNewTunnelToken.Text.Trim();
        int.TryParse(txtNewBackendPort.Text.Trim(), out int bPort);
        int.TryParse(txtNewFrontendPort.Text.Trim(), out int fPort);

        if (string.IsNullOrEmpty(domain))
        {
            lblNewSetupMsg.ForeColor = Color.FromArgb(255, 77, 109);
            lblNewSetupMsg.Text = "⚠️ กรุณาระบุชื่อโดเมนเว็บไซต์ของคุณ";
            return;
        }

        if (bPort <= 0) bPort = 4000;
        if (fPort <= 0) fPort = 5173;

        siteConfig.Domain = domain;
        siteConfig.TunnelToken = token;
        siteConfig.BackendPort = bPort;
        siteConfig.FrontendPort = fPort;
        SaveSiteConfig();

        // Update server/.env
        try
        {
            string envPath = Path.Combine(GetAppRoot(), "server", ".env");
            if (File.Exists(envPath))
            {
                string envContent = File.ReadAllText(envPath);
                if (envContent.Contains("PORT="))
                {
                    string[] lines = envContent.Split('\n');
                    for (int i = 0; i < lines.Length; i++)
                    {
                        if (lines[i].TrimStart().StartsWith("PORT="))
                        {
                            lines[i] = $"PORT={bPort}";
                        }
                    }
                    File.WriteAllText(envPath, string.Join("\n", lines));
                }
                else
                {
                    File.AppendAllText(envPath, $"\nPORT={bPort}\n");
                }
            }
        }
        catch { }

        // Update UI controls on dashboard
        btnOpenWeb.Text = $"🌐 เปิดเว็บไซต์ ({siteConfig.Domain})";
        btnOpenLocal.Text = $"🖥️ เปิด Localhost (Port {siteConfig.FrontendPort})";
        pnlTunnelCard.Controls.Clear();
        pnlTunnelCard = CreateServiceCard("🛡️ Cloudflare Tunnel", $"Domain: {siteConfig.Domain}", 5 + (280 + 20) * 2, 96, 280, 95, out pillTunnelStatus);
        pnlDashboardContainer.Controls.Add(pnlTunnelCard);

        lblNewSetupMsg.ForeColor = Color.FromArgb(0, 230, 130);
        lblNewSetupMsg.Text = "✅ บันทึกการตั้งค่าระบบใหม่สำเร็จ กำลังเปิดหน้าแดชบอร์ด...";

        ShowDashboardView();
        Log($"⚙️ อัปเดตการตั้งค่าเว็บไซต์ใหม่เรียบร้อย: {siteConfig.Domain} (Port {bPort}/{fPort})");
        StartAllServices();
    }

    // =========================================================================
    // VIEW 4: BEGINNER SETUP GUIDE MODAL
    // =========================================================================
    private void BuildGuideModal()
    {
        pnlGuideModal = new CyberPanel
        {
            Size = new Size(910, 645),
            CornerRadius = 22,
            FillColor = Color.FromArgb(24, 14, 28),
            BorderColor = Color.FromArgb(120, 0, 210, 255),
            BorderThickness = 1.5f,
            ShowTopAccentGlow = true,
            AccentGlowColor = Color.FromArgb(0, 210, 255),
            Location = new Point(25, 48),
            Visible = false
        };
        this.Controls.Add(pnlGuideModal);

        Label lblTitle = new Label
        {
            Text = "📖 คู่มือวิธีเซ็ตเว็บเริ่มต้น สำหรับมือใหม่ (BEGINNER SETUP GUIDE)",
            Font = new Font("Segoe UI", 14f, FontStyle.Bold),
            ForeColor = Color.FromArgb(0, 210, 255),
            Location = new Point(25, 14),
            AutoSize = true,
            BackColor = Color.FromArgb(24, 14, 28)
        };
        pnlGuideModal.Controls.Add(lblTitle);

        Label lblSub = new Label
        {
            Text = "5 ขั้นตอนง่ายๆ เปิดเว็บไซต์ของคุณให้ออนไลน์ทั่วโลกผ่าน Cloudflare ฟรี 100% ไม่ต้องเปิดพอร์ตเราเตอร์",
            Font = new Font("Segoe UI", 8.8f, FontStyle.Regular),
            ForeColor = Color.FromArgb(200, 180, 195),
            Location = new Point(27, 42),
            AutoSize = true,
            BackColor = Color.FromArgb(24, 14, 28)
        };
        pnlGuideModal.Controls.Add(lblSub);

        // Rich Step Container
        Panel pnlStepsList = new Panel
        {
            Location = new Point(25, 70),
            Size = new Size(860, 500),
            AutoScroll = true,
            BackColor = Color.FromArgb(24, 14, 28)
        };
        pnlGuideModal.Controls.Add(pnlStepsList);

        int curY = 0;
        int stepW = 835;

        pnlStepsList.Controls.Add(CreateGuideStepCard("1", "สมัคร Cloudflare และเพิ่มชื่อโดเมน (ฟรี 100%)",
            "1. เข้าไปที่ https://dash.cloudflare.com แล้วสมัครสมาชิกหรือล็อกอินเข้าสู่ระบบ\n" +
            "2. กดปุ่ม [Add a site] จากนั้นกรอกชื่อโดเมนของคุณ (เช่น myshop.com) แล้วเลือก Free Plan\n" +
            "3. คัดลอก Nameservers ที่ Cloudflare ให้มา ไปเปลี่ยนที่เว็บที่คุณซื้อโดเมน (รอระบบอัปเดต 5-15 นาที)",
            curY, stepW));
        curY += 92;

        pnlStepsList.Controls.Add(CreateGuideStepCard("2", "สร้าง Cloudflare Zero Trust Tunnel",
            "1. ที่แถบเมนูด้านซ้ายของ Cloudflare ให้คลิกเข้าไปที่ [Zero Trust]\n" +
            "2. เข้าไปที่เมนู [Networks] -> เลือก [Tunnels]\n" +
            "3. กดปุ่ม [Create a tunnel] -> เลือกประเภท [Cloudflared] -> ตั้งชื่อ Tunnel ตามต้องการแล้วกด Save",
            curY, stepW));
        curY += 92;

        pnlStepsList.Controls.Add(CreateGuideStepCard("3", "คัดลอก Tunnel Token สำหรับเชื่อมต่อ",
            "1. ในหน้า Choose your environment ให้สังเกตกรอบคำสั่งยาวๆ ด้านล่าง\n" +
            "2. สังเกตข้อความที่อยู่หลังคำว่า --token (จะเป็นรหัสยาวๆ เช่น eyJhIjoi...)\n" +
            "3. ให้คัดลอกเฉพาะข้อความ Token นั้น เพื่อนำมาวางในช่อง Cloudflare Tunnel Token ของโปรแกรมนี้",
            curY, stepW));
        curY += 92;

        pnlStepsList.Controls.Add(CreateGuideStepCard("4", "ผูก Public Hostname ไปยังเครื่องของคุณ",
            "1. ในหน้าตั้งค่า Tunnel บน Cloudflare ให้คลิกไปที่แท็บ [Public Hostname] ด้านบน\n" +
            "2. กดปุ่ม [Add a public hostname] -> ในช่อง Subdomain / Domain ให้กรอกชื่อโดเมนของคุณ\n" +
            "3. ในช่อง Service ให้เลือก Type เป็น [HTTP] และในช่อง URL ให้กรอก [localhost:5173] แล้วกด Save",
            curY, stepW));
        curY += 92;

        pnlStepsList.Controls.Add(CreateGuideStepCard("5", "นำข้อมูลมาใส่ในโปรแกรมแล้วกดรัน!",
            "1. ในโปรแกรมนี้ ไปที่หน้า [เปิดเว็บไซต์ใหม่] แล้วนำชื่อโดเมนและ Token มากรอกให้เรียบร้อย\n" +
            "2. กดปุ่มสีเขียว [บันทึกและเริ่มต้นระบบ]\n" +
            "3. โปรแกรมจะเปิด API Server, Web Server และ Tunnel ให้ทันที เว็บไซต์ของคุณจะออนไลน์ทั่วโลก 24 ชม.!",
            curY, stepW));

        // Close Guide Button
        CyberButton btnCloseGuide = new CyberButton
        {
            Text = "✖️ เข้าใจแล้ว / ปิดหน้าต่างคู่มือ (CLOSE GUIDE)",
            CornerRadius = 22,
            Font = new Font("Segoe UI", 10.5f, FontStyle.Bold),
            ForeColor = Color.White,
            GradientStart = Color.FromArgb(239, 68, 68),
            GradientEnd = Color.FromArgb(185, 28, 28),
            HoverGradientStart = Color.FromArgb(248, 113, 113),
            HoverGradientEnd = Color.FromArgb(220, 38, 38),
            BorderGlowColor = Color.FromArgb(252, 165, 165),
            HoverBorderColor = Color.FromArgb(254, 202, 202),
            Size = new Size(380, 46),
            Location = new Point(265, 580)
        };
        btnCloseGuide.Click += (s, e) => HideGuideModal();
        pnlGuideModal.Controls.Add(btnCloseGuide);
    }

    private CyberPanel CreateGuideStepCard(string stepNumber, string stepTitle, string stepContent, int y, int w)
    {
        CyberPanel pnl = new CyberPanel
        {
            Location = new Point(0, y),
            Size = new Size(w, 84),
            CornerRadius = 14,
            FillColor = Color.FromArgb(32, 18, 38),
            BorderColor = Color.FromArgb(70, 0, 210, 255),
            BorderThickness = 1f,
            ShowTopAccentGlow = false
        };

        Label lblNum = new Label
        {
            Text = stepNumber,
            Font = new Font("Segoe UI", 16f, FontStyle.Bold),
            ForeColor = Color.FromArgb(0, 210, 255),
            TextAlign = ContentAlignment.MiddleCenter,
            Size = new Size(36, 36),
            Location = new Point(12, 10),
            BackColor = Color.FromArgb(32, 18, 38)
        };
        pnl.Controls.Add(lblNum);

        Label lblHead = new Label
        {
            Text = stepTitle,
            Font = new Font("Segoe UI", 9.8f, FontStyle.Bold),
            ForeColor = Color.White,
            Location = new Point(54, 8),
            AutoSize = true,
            BackColor = Color.FromArgb(32, 18, 38)
        };
        pnl.Controls.Add(lblHead);

        Label lblBody = new Label
        {
            Text = stepContent,
            Font = new Font("Segoe UI", 8.4f, FontStyle.Regular),
            ForeColor = Color.FromArgb(210, 190, 205),
            Location = new Point(54, 28),
            Size = new Size(w - 70, 50),
            BackColor = Color.FromArgb(32, 18, 38)
        };
        pnl.Controls.Add(lblBody);

        return pnl;
    }

    private void ShowGuideModal()
    {
        pnlGuideModal.Visible = true;
        pnlGuideModal.BringToFront();
        pnlTitleBar?.BringToFront();
        this.Refresh();
    }

    private void HideGuideModal()
    {
        pnlGuideModal.Visible = false;
        this.Refresh();
    }

    // =========================================================================
    // VIEW SWITCHERS (SAFE GHOSTING-FREE BITBLT TRANSITIONS)
    // =========================================================================
    private void ShowLoginView()
    {
        pnlLoginContainer.Visible = true;
        pnlModeContainer.Visible = false;
        pnlNewSetupContainer.Visible = false;
        pnlDashboardContainer.Visible = false;
        pnlGuideModal.Visible = false;

        pnlLoginContainer.BringToFront();
        pnlTitleBar?.BringToFront();
        lblVersionWatermark.BringToFront();
        this.Refresh();
        txtCyberLicenseKey.InnerTextBox.Focus();
    }

    private void ShowModeSelectView()
    {
        pnlLoginContainer.Visible = false;
        pnlModeContainer.Visible = true;
        pnlNewSetupContainer.Visible = false;
        pnlDashboardContainer.Visible = false;
        pnlGuideModal.Visible = false;

        pnlModeContainer.BringToFront();
        pnlTitleBar?.BringToFront();
        lblVersionWatermark.BringToFront();
        this.Refresh();
    }

    private void ShowNewSetupView()
    {
        pnlLoginContainer.Visible = false;
        pnlModeContainer.Visible = false;
        pnlNewSetupContainer.Visible = true;
        pnlDashboardContainer.Visible = false;
        pnlGuideModal.Visible = false;

        txtNewDomain.Text = siteConfig.Domain;
        txtNewTunnelToken.Text = siteConfig.TunnelToken;
        txtNewBackendPort.Text = siteConfig.BackendPort.ToString();
        txtNewFrontendPort.Text = siteConfig.FrontendPort.ToString();

        pnlNewSetupContainer.BringToFront();
        pnlTitleBar?.BringToFront();
        lblVersionWatermark.BringToFront();
        this.Refresh();
    }

    private void ShowDashboardView()
    {
        pnlLoginContainer.Visible = false;
        pnlModeContainer.Visible = false;
        pnlNewSetupContainer.Visible = false;
        pnlDashboardContainer.Visible = true;
        pnlGuideModal.Visible = false;

        pnlDashboardContainer.BringToFront();
        pnlTitleBar?.BringToFront();
        lblVersionWatermark.BringToFront();
        this.Refresh();
        CheckAllStatuses();

        // Auto-check for updates in background on login (non-intrusive)
        _ = Task.Run(async () =>
        {
            await Task.Delay(1500);
            await CheckForUpdateAsync(silentIfUpToDate: true);
        });
    }

    // =========================================================================
    // VIEW 5: DASHBOARD VIEW (WEB CONTROLLER & SERVER ORCHESTRATOR)
    // =========================================================================
    private void BuildDashboardView()
    {
        pnlDashboardContainer = new Panel
        {
            Size = new Size(900, 665),
            BackColor = Color.FromArgb(12, 6, 9),
            Location = new Point(25, 46),
            Visible = false
        };
        this.Controls.Add(pnlDashboardContainer);

        // Header Panel (Rounded Glassmorphic Pill Container)
        CyberPanel headerPanel = new CyberPanel
        {
            Size = new Size(880, 80),
            CornerRadius = 22,
            FillColor = Color.FromArgb(20, 13, 24),
            BorderColor = Color.FromArgb(70, 255, 42, 85),
            BorderThickness = 1.3f,
            ShowTopAccentGlow = true,
            AccentGlowColor = Color.FromArgb(255, 26, 64),
            Location = new Point(5, 5)
        };
        pnlDashboardContainer.Controls.Add(headerPanel);

        Label lblLogo = new Label
        {
            Text = "HEXSYNC",
            Font = new Font("Segoe UI", 20f, FontStyle.Bold),
            ForeColor = Color.White,
            AutoSize = true,
            Location = new Point(18, 12),
            BackColor = Color.FromArgb(20, 13, 24)
        };
        headerPanel.Controls.Add(lblLogo);

        Label lblLogoRed = new Label
        {
            Text = "TH",
            Font = new Font("Segoe UI", 20f, FontStyle.Bold),
            ForeColor = Color.FromArgb(255, 26, 64),
            AutoSize = true,
            Location = new Point(lblLogo.Right - 5, 12),
            BackColor = Color.FromArgb(20, 13, 24)
        };
        headerPanel.Controls.Add(lblLogoRed);

        Label lblSub = new Label
        {
            Text = "Web Controller & Server Orchestrator (โปรแกรมเปิด-ปิดและควบคุมระบบเว็บไซต์)",
            Font = new Font("Segoe UI", 8.8f, FontStyle.Regular),
            ForeColor = Color.FromArgb(170, 140, 150),
            AutoSize = true,
            Location = new Point(20, 48),
            BackColor = Color.FromArgb(20, 13, 24)
        };
        headerPanel.Controls.Add(lblSub);

        // Overall Status Pill Badge
        pillOverall = new CyberStatusPill
        {
            CornerRadius = 16,
            Size = new Size(185, 34),
            Location = new Point(540, 22),
            IsOnline = false,
            OfflineText = "CHECKING..."
        };
        headerPanel.Controls.Add(pillOverall);

        // Mode Switch / Logout Pill Button
        btnLogout = new CyberButton
        {
            Text = "🚪 สลับโหมด",
            CornerRadius = 17,
            Font = new Font("Segoe UI", 9f, FontStyle.Bold),
            ForeColor = Color.FromArgb(255, 140, 160),
            GradientStart = Color.FromArgb(48, 18, 28),
            GradientEnd = Color.FromArgb(32, 10, 18),
            HoverGradientStart = Color.FromArgb(75, 26, 40),
            HoverGradientEnd = Color.FromArgb(45, 15, 25),
            BorderGlowColor = Color.FromArgb(200, 40, 70),
            HoverBorderColor = Color.FromArgb(255, 70, 100),
            Size = new Size(125, 34),
            Location = new Point(738, 22)
        };
        btnLogout.Click += (s, e) =>
        {
            ShowModeSelectView();
        };
        headerPanel.Controls.Add(btnLogout);

        // Service Cards (3 Cards)
        int cardW = 280;
        int cardH = 95;
        int cardY = 96;

        pnlBackendCard = CreateServiceCard("⚙️ Backend API Server", $"Port: {siteConfig.BackendPort} • SQLite Engine", 5, cardY, cardW, cardH, out pillBackendStatus);
        pnlDashboardContainer.Controls.Add(pnlBackendCard);

        pnlFrontendCard = CreateServiceCard("🌐 Frontend Web Server", $"Port: {siteConfig.FrontendPort} • SPA Engine", 5 + cardW + 20, cardY, cardW, cardH, out pillFrontendStatus);
        pnlDashboardContainer.Controls.Add(pnlFrontendCard);

        pnlTunnelCard = CreateServiceCard("🛡️ Cloudflare Tunnel", $"Domain: {siteConfig.Domain}", 5 + (cardW + 20) * 2, cardY, cardW, cardH, out pillTunnelStatus);
        pnlDashboardContainer.Controls.Add(pnlTunnelCard);

        // Action Buttons Bar (Row 1: Primary Controls)
        btnStartAll = new CyberButton
        {
            Text = "🚀 เปิดระบบทั้งหมด (START ALL)",
            CornerRadius = 24,
            Font = new Font("Segoe UI", 10.8f, FontStyle.Bold),
            ForeColor = Color.White,
            GradientStart = Color.FromArgb(16, 185, 129),
            GradientEnd = Color.FromArgb(5, 150, 105),
            HoverGradientStart = Color.FromArgb(52, 211, 153),
            HoverGradientEnd = Color.FromArgb(16, 185, 129),
            BorderGlowColor = Color.FromArgb(110, 231, 183),
            HoverBorderColor = Color.FromArgb(167, 243, 208),
            Size = new Size(280, 48),
            Location = new Point(5, 202)
        };
        btnStartAll.Click += (s, e) => StartAllServices();
        pnlDashboardContainer.Controls.Add(btnStartAll);

        btnStopAll = new CyberButton
        {
            Text = "🛑 ปิดระบบทั้งหมด (STOP ALL)",
            CornerRadius = 24,
            Font = new Font("Segoe UI", 10.8f, FontStyle.Bold),
            ForeColor = Color.White,
            GradientStart = Color.FromArgb(239, 68, 68),
            GradientEnd = Color.FromArgb(185, 28, 28),
            HoverGradientStart = Color.FromArgb(248, 113, 113),
            HoverGradientEnd = Color.FromArgb(220, 38, 38),
            BorderGlowColor = Color.FromArgb(252, 165, 165),
            HoverBorderColor = Color.FromArgb(254, 202, 202),
            Size = new Size(280, 48),
            Location = new Point(5 + cardW + 20, 202)
        };
        btnStopAll.Click += (s, e) => StopAllServices();
        pnlDashboardContainer.Controls.Add(btnStopAll);

        btnRestart = new CyberButton
        {
            Text = "🔄 รีสตาร์ตระบบ (RESTART)",
            CornerRadius = 24,
            Font = new Font("Segoe UI", 10.8f, FontStyle.Bold),
            ForeColor = Color.White,
            GradientStart = Color.FromArgb(139, 92, 246),
            GradientEnd = Color.FromArgb(109, 40, 217),
            HoverGradientStart = Color.FromArgb(167, 139, 250),
            HoverGradientEnd = Color.FromArgb(124, 58, 237),
            BorderGlowColor = Color.FromArgb(196, 181, 253),
            HoverBorderColor = Color.FromArgb(221, 214, 254),
            Size = new Size(280, 48),
            Location = new Point(5 + (cardW + 20) * 2, 202)
        };
        btnRestart.Click += (s, e) => RestartAllServices();
        pnlDashboardContainer.Controls.Add(btnRestart);

        // Action Buttons Bar (Row 2: Secondary Quick Links & Auto-Update Engine)
        btnOpenWeb = new CyberButton
        {
            Text = $"🌐 เปิดเว็บ ({siteConfig.Domain})",
            CornerRadius = 22,
            Font = new Font("Segoe UI", 9.2f, FontStyle.Bold),
            ForeColor = Color.FromArgb(235, 250, 255),
            GradientStart = Color.FromArgb(14, 165, 233),
            GradientEnd = Color.FromArgb(2, 132, 199),
            HoverGradientStart = Color.FromArgb(56, 189, 248),
            HoverGradientEnd = Color.FromArgb(14, 165, 233),
            BorderGlowColor = Color.FromArgb(125, 211, 252),
            HoverBorderColor = Color.FromArgb(186, 230, 253),
            Size = new Size(212, 44),
            Location = new Point(5, 258)
        };
        btnOpenWeb.Click += (s, e) => OpenUrl($"https://{siteConfig.Domain}");
        pnlDashboardContainer.Controls.Add(btnOpenWeb);

        btnOpenLocal = new CyberButton
        {
            Text = $"🖥️ Local (Port {siteConfig.FrontendPort})",
            CornerRadius = 22,
            Font = new Font("Segoe UI", 9.2f, FontStyle.Bold),
            ForeColor = Color.FromArgb(255, 245, 220),
            GradientStart = Color.FromArgb(245, 158, 11),
            GradientEnd = Color.FromArgb(217, 119, 6),
            HoverGradientStart = Color.FromArgb(251, 191, 36),
            HoverGradientEnd = Color.FromArgb(245, 158, 11),
            BorderGlowColor = Color.FromArgb(253, 230, 138),
            HoverBorderColor = Color.FromArgb(254, 243, 199),
            Size = new Size(212, 44),
            Location = new Point(225, 258)
        };
        btnOpenLocal.Click += (s, e) => OpenUrl($"http://localhost:{siteConfig.FrontendPort}");
        pnlDashboardContainer.Controls.Add(btnOpenLocal);

        btnCheckUpdate = new CyberButton
        {
            Text = "🚀 ตรวจสอบอัปเดต (UPDATE)",
            CornerRadius = 22,
            Font = new Font("Segoe UI", 9.2f, FontStyle.Bold),
            ForeColor = Color.FromArgb(250, 240, 255),
            GradientStart = Color.FromArgb(147, 51, 234),
            GradientEnd = Color.FromArgb(109, 40, 217),
            HoverGradientStart = Color.FromArgb(168, 85, 247),
            HoverGradientEnd = Color.FromArgb(126, 34, 206),
            BorderGlowColor = Color.FromArgb(216, 180, 254),
            HoverBorderColor = Color.FromArgb(233, 213, 255),
            Size = new Size(220, 44),
            Location = new Point(445, 258)
        };
        btnCheckUpdate.Click += (s, e) => _ = CheckForUpdateAsync(silentIfUpToDate: false);
        pnlDashboardContainer.Controls.Add(btnCheckUpdate);

        btnClearLogs = new CyberButton
        {
            Text = "🧹 ล้างประวัติ (Clear Logs)",
            CornerRadius = 22,
            Font = new Font("Segoe UI", 9.2f, FontStyle.Bold),
            ForeColor = Color.FromArgb(203, 213, 225),
            GradientStart = Color.FromArgb(71, 85, 105),
            GradientEnd = Color.FromArgb(51, 65, 85),
            HoverGradientStart = Color.FromArgb(100, 116, 139),
            HoverGradientEnd = Color.FromArgb(71, 85, 105),
            BorderGlowColor = Color.FromArgb(148, 163, 184),
            HoverBorderColor = Color.FromArgb(203, 213, 225),
            Size = new Size(210, 44),
            Location = new Point(673, 258)
        };
        btnClearLogs.Click += (s, e) => { txtConsole.Clear(); Log("ล้างประวัติการทำงานเรียบร้อยแล้ว"); };
        pnlDashboardContainer.Controls.Add(btnClearLogs);

        // Activity Logs Box (Rounded Glassmorphic Console Card)
        pnlConsoleContainer = new CyberPanel
        {
            Location = new Point(5, 310),
            Size = new Size(880, 290),
            CornerRadius = 20,
            FillColor = Color.FromArgb(14, 9, 18),
            BorderColor = Color.FromArgb(70, 0, 210, 255),
            BorderThickness = 1.2f,
            ShowTopAccentGlow = true,
            AccentGlowColor = Color.FromArgb(0, 210, 255)
        };
        pnlDashboardContainer.Controls.Add(pnlConsoleContainer);

        Label lblConsoleTitle = new Label
        {
            Text = ">_ LIVE TELEMETRY & SECURITY FORENSICS (SQLite Engine Active)",
            Font = new Font("Consolas", 8.8f, FontStyle.Bold),
            ForeColor = Color.FromArgb(0, 210, 255),
            BackColor = Color.FromArgb(14, 9, 18),
            Location = new Point(16, 8),
            AutoSize = true
        };
        pnlConsoleContainer.Controls.Add(lblConsoleTitle);

        txtConsole = new RichTextBox
        {
            Location = new Point(14, 28),
            Size = new Size(852, 238),
            BackColor = Color.FromArgb(10, 7, 16),
            ForeColor = Color.FromArgb(0, 255, 180),
            Font = new Font("Consolas", 9.5f, FontStyle.Regular),
            BorderStyle = BorderStyle.None,
            ReadOnly = true,
            ScrollBars = RichTextBoxScrollBars.Vertical
        };
        pnlConsoleContainer.Controls.Add(txtConsole);
    }

    private CyberPanel CreateServiceCard(string title, string subtitle, int x, int y, int w, int h, out CyberStatusPill statusPill)
    {
        CyberPanel pnl = new CyberPanel
        {
            Location = new Point(x, y),
            Size = new Size(w, h),
            CornerRadius = 18,
            FillColor = Color.FromArgb(20, 13, 24),
            BorderColor = Color.FromArgb(70, 255, 42, 85),
            BorderThickness = 1.3f,
            ShowTopAccentGlow = true,
            AccentGlowColor = Color.FromArgb(255, 77, 109)
        };

        Label lblTitle = new Label
        {
            Text = title,
            Font = new Font("Segoe UI", 10.2f, FontStyle.Bold),
            ForeColor = Color.White,
            Location = new Point(15, 12),
            AutoSize = true,
            BackColor = Color.FromArgb(20, 13, 24)
        };
        pnl.Controls.Add(lblTitle);

        Label lblSub = new Label
        {
            Text = subtitle,
            Font = new Font("Segoe UI", 8.2f, FontStyle.Regular),
            ForeColor = Color.FromArgb(165, 135, 150),
            Location = new Point(16, 36),
            AutoSize = true,
            BackColor = Color.FromArgb(20, 13, 24)
        };
        pnl.Controls.Add(lblSub);

        statusPill = new CyberStatusPill
        {
            CornerRadius = 13,
            Size = new Size(140, 28),
            Location = new Point(15, 58),
            IsOnline = false,
            OfflineText = "CHECKING..."
        };
        pnl.Controls.Add(statusPill);

        return pnl;
    }

    // --- REALTIME STATUS MONITOR ---
    private void StartMonitorTimer()
    {
        statusTimer = new System.Windows.Forms.Timer();
        statusTimer.Interval = 1500;
        statusTimer.Tick += (s, e) =>
        {
            if (isAuthenticated && pnlDashboardContainer.Visible) CheckAllStatuses();
        };
        statusTimer.Start();
    }

    private void CheckAllStatuses()
    {
        bool bOnline = IsPortListening(siteConfig.BackendPort);
        bool fOnline = IsPortListening(siteConfig.FrontendPort);
        bool tOnline = IsProcessRunning("cloudflared");

        // Backend
        if (bOnline != isBackendOnline)
        {
            isBackendOnline = bOnline;
            pillBackendStatus.IsOnline = isBackendOnline;
            pillBackendStatus.OnlineText = $"ONLINE ({siteConfig.BackendPort})";
            pillBackendStatus.OfflineText = "OFFLINE";
            pillBackendStatus.Invalidate();
            Log(isBackendOnline ? $"✅ Backend Server ทำงานปกติ (Port {siteConfig.BackendPort} - SQLite)" : "⚠️ Backend Server หยุดทำงาน");
        }

        // Frontend
        if (fOnline != isFrontendOnline)
        {
            isFrontendOnline = fOnline;
            pillFrontendStatus.IsOnline = isFrontendOnline;
            pillFrontendStatus.OnlineText = $"ONLINE ({siteConfig.FrontendPort})";
            pillFrontendStatus.OfflineText = "OFFLINE";
            pillFrontendStatus.Invalidate();
            Log(isFrontendOnline ? $"✅ Frontend Web Server ทำงานปกติ (Port {siteConfig.FrontendPort})" : "⚠️ Frontend Web Server หยุดทำงาน");
        }

        // Cloudflare Tunnel
        if (tOnline != isTunnelOnline)
        {
            isTunnelOnline = tOnline;
            pillTunnelStatus.IsOnline = isTunnelOnline;
            pillTunnelStatus.OnlineText = "CONNECTED";
            pillTunnelStatus.OfflineText = "INACTIVE";
            pillTunnelStatus.Invalidate();
            Log(isTunnelOnline ? $"✅ Cloudflare Tunnel เชื่อมต่อสำเร็จ ({siteConfig.Domain})" : "⚠️ Cloudflare Tunnel ยังไม่ได้เปิด");
        }

        // Overall Status Pill
        if (isBackendOnline && isFrontendOnline && isTunnelOnline)
        {
            pillOverall.IsOnline = true;
            pillOverall.OnlineText = "⚡ 100% ONLINE";
            pillOverall.Invalidate();
        }
        else if (isBackendOnline || isFrontendOnline || isTunnelOnline)
        {
            pillOverall.IsOnline = false;
            pillOverall.OfflineText = "⚠️ PARTIAL LIVE";
            pillOverall.Invalidate();
        }
        else
        {
            pillOverall.IsOnline = false;
            pillOverall.OfflineText = "⛔ ALL OFFLINE";
            pillOverall.Invalidate();
        }
    }

    private static string? _cachedAppRoot = null;

    private static bool IsValidProjectRoot(string dir)
    {
        if (string.IsNullOrEmpty(dir) || !Directory.Exists(dir)) return false;
        bool hasServer = Directory.Exists(Path.Combine(dir, "server"));
        bool hasDistOrServe = Directory.Exists(Path.Combine(dir, "dist")) || File.Exists(Path.Combine(dir, "serve_dist.cjs"));
        return hasServer && hasDistOrServe;
    }

    private void SaveDiscoveredRoot(string root)
    {
        try
        {
            string folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "HexSyncTH");
            Directory.CreateDirectory(folder);
            File.WriteAllText(Path.Combine(folder, "project_path.txt"), root);
        }
        catch { }
    }

    private string GetAppRoot()
    {
        if (!string.IsNullOrEmpty(_cachedAppRoot) && IsValidProjectRoot(_cachedAppRoot))
        {
            return _cachedAppRoot;
        }

        // 1. Check AppDomain BaseDirectory and search upwards through parent directories (up to 6 levels)
        string? current = AppDomain.CurrentDomain.BaseDirectory;
        for (int i = 0; i < 6 && !string.IsNullOrEmpty(current); i++)
        {
            if (IsValidProjectRoot(current))
            {
                _cachedAppRoot = Path.GetFullPath(current);
                SaveDiscoveredRoot(_cachedAppRoot);
                return _cachedAppRoot;
            }
            DirectoryInfo? parent = Directory.GetParent(current);
            current = parent?.FullName;
        }

        // 2. Check Directory.GetCurrentDirectory() and search upwards
        current = Directory.GetCurrentDirectory();
        for (int i = 0; i < 6 && !string.IsNullOrEmpty(current); i++)
        {
            if (IsValidProjectRoot(current))
            {
                _cachedAppRoot = Path.GetFullPath(current);
                SaveDiscoveredRoot(_cachedAppRoot);
                return _cachedAppRoot;
            }
            DirectoryInfo? parent = Directory.GetParent(current);
            current = parent?.FullName;
        }

        // 3. Check saved path in LocalApplicationData
        try
        {
            string appDataConfig = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "HexSyncTH", "project_path.txt");
            if (File.Exists(appDataConfig))
            {
                string saved = File.ReadAllText(appDataConfig).Trim();
                if (IsValidProjectRoot(saved))
                {
                    _cachedAppRoot = Path.GetFullPath(saved);
                    return _cachedAppRoot;
                }
            }
        }
        catch { }

        // 4. Scan sibling directories in parent of baseDir (e.g. if running inside a subfolder or release folder)
        try
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            DirectoryInfo? baseDirParent = Directory.GetParent(baseDir);
            if (baseDirParent != null && baseDirParent.Exists)
            {
                foreach (var dir in baseDirParent.GetDirectories())
                {
                    if (IsValidProjectRoot(dir.FullName))
                    {
                        _cachedAppRoot = dir.FullName;
                        SaveDiscoveredRoot(_cachedAppRoot);
                        return _cachedAppRoot;
                    }
                }
            }
        }
        catch { }

        // 5. Fallback: BaseDirectory
        _cachedAppRoot = AppDomain.CurrentDomain.BaseDirectory;
        return _cachedAppRoot;
    }

    // =========================================================================
    // IN-APP AUTO-UPDATE ENGINE (STRICT ZERO-TOUCH CUSTOMER DATA PROTECTION)
    // =========================================================================
    public class UpdateCheckResult
    {
        public bool Success { get; set; }
        public string? LatestVersion { get; set; }
        public string? ReleaseDate { get; set; }
        public string? Changelog { get; set; }
        public string? DownloadUrl { get; set; }
        public bool HasUpdateZip { get; set; }
        public long SizeBytes { get; set; }
    }

    private static bool IsNewerVersion(string latest, string current)
    {
        try
        {
            Version vLatest = new Version(latest.Trim().TrimStart('v', 'V'));
            Version vCurrent = new Version(current.Trim().TrimStart('v', 'V'));
            return vLatest > vCurrent;
        }
        catch
        {
            return string.Compare(latest.Trim(), current.Trim(), StringComparison.OrdinalIgnoreCase) > 0;
        }
    }

    private async Task CheckForUpdateAsync(bool silentIfUpToDate = false)
    {
        try
        {
            if (!silentIfUpToDate)
            {
                Log("🔍 กำลังตรวจสอบเวอร์ชันล่าสุดจากเซิร์ฟเวอร์แม่ (https://hexsyncth.site)...");
            }

            string checkUrl = "https://hexsyncth.site/api/system/update-check";
            using HttpClient client = new HttpClient { Timeout = TimeSpan.FromSeconds(8) };
            string json = await client.GetStringAsync(checkUrl);
            var result = JsonSerializer.Deserialize<UpdateCheckResult>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (result != null && result.Success && !string.IsNullOrEmpty(result.LatestVersion))
            {
                if (IsNewerVersion(result.LatestVersion, CurrentAppVersion))
                {
                    Log($"⚡ พบเวอร์ชันใหม่ล่าสุด: v{result.LatestVersion} (ปัจจุบัน: v{CurrentAppVersion})");

                    this.Invoke(() =>
                    {
                        string prompt = $"🚀 ตรวจพบการอัปเดตระบบเวอร์ชันใหม่!\n\n" +
                                        $"• เวอร์ชันปัจจุบัน: v{CurrentAppVersion}\n" +
                                        $"• เวอร์ชันใหม่ล่าสุด: v{result.LatestVersion}\n" +
                                        $"• วันที่ปล่อย: {result.ReleaseDate}\n\n" +
                                        $"รายละเอียดการอัปเดต:\n{result.Changelog}\n\n" +
                                        $"🔒 ความปลอดภัย 100%:\n" +
                                        $"ระบบจะอัปเดตเฉพาะไฟล์เว็บหน้าบ้านและโค้ดระบบเท่านั้น\n" +
                                        $"ข้อมูลสินค้า สมาชิก ฐานข้อมูล (database.sqlite) และการตั้งค่าจะไม่ถูกแตะต้องเด็ดขาด\n\n" +
                                        $"คุณต้องการดาวน์โหลดและติดตั้งอัปเดตตอนนี้หรือไม่?";

                        DialogResult dr = MessageBox.Show(this, prompt, $"HexSyncTH System Update v{result.LatestVersion}", MessageBoxButtons.YesNo, MessageBoxIcon.Information);
                        if (dr == DialogResult.Yes)
                        {
                            _ = Task.Run(() => PerformUpdateAsync(result.DownloadUrl ?? "https://hexsyncth.site/api/system/download-update", result.LatestVersion));
                        }
                    });
                }
                else
                {
                    if (!silentIfUpToDate)
                    {
                        Log($"✅ ระบบเป็นเวอร์ชันล่าสุดแล้ว (v{CurrentAppVersion})");
                        this.Invoke(() =>
                        {
                            MessageBox.Show(this, $"ระบบของคุณเป็นเวอร์ชันล่าสุดเรียบร้อยแล้ว (Version {CurrentAppVersion})\n\nไม่มีการอัปเดตเพิ่มเติมในขณะนี้", "ตรวจสอบการอัปเดต", MessageBoxButtons.OK, MessageBoxIcon.Information);
                        });
                    }
                    else
                    {
                        Log($"[Update Engine] ระบบทำงานบนเวอร์ชันล่าสุด v{CurrentAppVersion} (สมบูรณ์ 100%)");
                    }
                }
            }
            else
            {
                if (!silentIfUpToDate)
                {
                    Log("⚠️ ไม่สามารถรับข้อมูลเวอร์ชันจากเซิร์ฟเวอร์ได้ในขณะนี้");
                }
            }
        }
        catch (Exception ex)
        {
            if (!silentIfUpToDate)
            {
                Log($"⚠️ ตรวจสอบอัปเดตไม่สำเร็จ: {ex.Message}");
                this.Invoke(() =>
                {
                    MessageBox.Show(this, $"ไม่สามารถเชื่อมต่อไปยังเซิร์ฟเวอร์อัปเดตได้:\n{ex.Message}\n\nกรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต", "ข้อผิดพลาด", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                });
            }
        }
    }

    private async Task PerformUpdateAsync(string downloadUrl, string newVersion)
    {
        try
        {
            Log("==================================================");
            Log($"⬇️ กำลังเริ่มดาวน์โหลดแพตช์อัปเดต v{newVersion}...");

            string tempZip = Path.Combine(Path.GetTempPath(), $"hexsync_patch_v{newVersion}_{DateTime.Now.Ticks}.zip");
            using (HttpClient client = new HttpClient { Timeout = TimeSpan.FromMinutes(3) })
            {
                using var response = await client.GetAsync(downloadUrl, HttpCompletionOption.ResponseHeadersRead);
                response.EnsureSuccessStatusCode();
                using var fileStream = new FileStream(tempZip, FileMode.Create, FileAccess.Write, FileShare.None);
                await response.Content.CopyToAsync(fileStream);
            }

            long kb = new FileInfo(tempZip).Length / 1024;
            Log($"✓ ดาวน์โหลดแพตช์สำเร็จ ({kb} KB)");
            Log("🛑 กำลังสั่งหยุดบริการชั่วคราวเพื่อติดตั้งแพตช์...");

            StopAllServices();
            System.Threading.Thread.Sleep(2000);

            string root = GetAppRoot();
            Log($"📦 กำลังแตกไฟล์และติดตั้งไปยัง: {root}...");

            int updatedFiles = 0;
            int protectedFiles = 0;

            using (ZipArchive archive = ZipFile.OpenRead(tempZip))
            {
                foreach (ZipArchiveEntry entry in archive.Entries)
                {
                    if (string.IsNullOrEmpty(entry.Name)) continue; // Skip directory entries

                    string normalized = entry.FullName.Replace('\\', '/').TrimStart('/');

                    // --- STRICT ZERO-TOUCH PROTECTION FOR CUSTOMER PRIVATE DATA ---
                    if (normalized.StartsWith("server/data/", StringComparison.OrdinalIgnoreCase) ||
                        normalized.Equals("site_config.json", StringComparison.OrdinalIgnoreCase) ||
                        normalized.Equals("server/.env", StringComparison.OrdinalIgnoreCase) ||
                        normalized.EndsWith(".sqlite", StringComparison.OrdinalIgnoreCase) ||
                        normalized.EndsWith(".db", StringComparison.OrdinalIgnoreCase) ||
                        normalized.EndsWith(".cfg", StringComparison.OrdinalIgnoreCase))
                    {
                        protectedFiles++;
                        continue; // NEVER overwrite customer database, keys, or settings!
                    }

                    string destinationPath = Path.GetFullPath(Path.Combine(root, entry.FullName));
                    if (!destinationPath.StartsWith(root, StringComparison.OrdinalIgnoreCase))
                    {
                        continue; // Prevent Zip Slip vulnerability
                    }

                    string destDir = Path.GetDirectoryName(destinationPath)!;
                    if (!Directory.Exists(destDir))
                    {
                        Directory.CreateDirectory(destDir);
                    }

                    entry.ExtractToFile(destinationPath, overwrite: true);
                    updatedFiles++;
                }
            }

            try { File.Delete(tempZip); } catch { }

            // Persist the new version on disk and update memory
            SetInstalledVersion(newVersion);

            Log($"✓ ติดตั้งแพตช์สำเร็จ: อัปเดต {updatedFiles} ไฟล์ (ปกป้องข้อมูลส่วนตัว {protectedFiles} รายการ)");
            Log("🚀 กำลังเริ่มระบบการทำงานใหม่ทั้งหมด...");

            StartAllServices();

            Log("==================================================");
            Log($"🎉 ระบบได้รับการอัปเดตเป็นเวอร์ชัน v{newVersion} สำเร็จเรียบร้อยแล้ว!");

            this.Invoke(() =>
            {
                MessageBox.Show(this,
                    $"🎉 อัปเดตระบบเป็นเวอร์ชัน v{newVersion} เรียบร้อยแล้ว!\n\n" +
                    $"• อัปเดตไฟล์ระบบหน้าบ้านและหลังบ้าน: {updatedFiles} ไฟล์\n" +
                    $"• ฐานข้อมูลสินค้า ประวัติการซื้อ และการตั้งค่าของคุณปลอดภัย 100%\n" +
                    $"• ระบบเซิร์ฟเวอร์เปิดทำงานใหม่อัตโนมัติเรียบร้อย",
                    "อัปเดตสำเร็จ",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
            });
        }
        catch (Exception ex)
        {
            Log($"❌ การอัปเดตล้มเหลว: {ex.Message}");
            this.Invoke(() =>
            {
                MessageBox.Show(this, $"เกิดข้อผิดพลาดระหว่างการอัปเดต:\n{ex.Message}\n\nระบบยังคงปลอดภัย ข้อมูลเดิมไม่ได้รับผลกระทบ", "ข้อผิดพลาด", MessageBoxButtons.OK, MessageBoxIcon.Error);
            });
            StartAllServices();
        }
    }

    private string GetNodeExe()
    {
        string root = GetAppRoot();
        string localNode = Path.Combine(root, "bin", "node.exe");
        if (File.Exists(localNode)) return localNode;
        localNode = Path.Combine(root, "portable_bin", "node.exe");
        if (File.Exists(localNode)) return localNode;
        return "node";
    }

    // --- CONTROLLER ACTIONS ---
    private void StartAllServices()
    {
        string root = GetAppRoot();
        string nodeExe = GetNodeExe();

        Log("==================================================");
        Log($"🚀 เริ่มต้นเปิดระบบเว็บไซต์ ({siteConfig.Domain})...");

        if (!IsProcessRunning("cloudflared"))
        {
            Log($"[1/3] กำลังเปิด Cloudflare Tunnel ({siteConfig.Domain})...");
            StartTunnelProcess();
        }
        else
        {
            Log("[1/3] Cloudflare Tunnel เปิดทำงานอยู่แล้ว");
        }

        if (!IsPortListening(siteConfig.BackendPort))
        {
            Log($"[2/3] กำลังเปิด Backend API Server (Port {siteConfig.BackendPort} - SQLite)...");
            string serverDir = Path.Combine(root, "server");
            string cmd = $"\"{nodeExe}\" index.js";
            StartProcessCmd(serverDir, cmd, $"HexSyncTH Backend (Port {siteConfig.BackendPort})");
        }
        else
        {
            Log($"[2/3] Backend API Server (Port {siteConfig.BackendPort}) เปิดทำงานอยู่แล้ว");
        }

        if (!IsPortListening(siteConfig.FrontendPort))
        {
            Log($"[3/3] กำลังเปิด Frontend Web Server (Port {siteConfig.FrontendPort})...");
            string serveDist = Path.Combine(root, "serve_dist.cjs");
            string cmd;
            if (File.Exists(serveDist))
            {
                cmd = $"\"{nodeExe}\" \"{serveDist}\"";
            }
            else
            {
                cmd = "npm run preview";
            }
            StartProcessCmd(root, cmd, $"HexSyncTH Frontend (Port {siteConfig.FrontendPort})");
        }
        else
        {
            Log($"[3/3] Frontend Web Server (Port {siteConfig.FrontendPort}) เปิดทำงานอยู่แล้ว");
        }

        Log("คำสั่งทั้งหมดถูกส่งเรียบร้อยแล้ว ระบบจะอัปเดตสถานะใน 1-2 วินาที");
        Log("==================================================");
    }

    private void StopAllServices()
    {
        Log("==================================================");
        Log("🛑 กำลังสั่งปิดระบบเว็บไซต์ทั้งหมด...");

        Log($"[1/3] กำลังปิด Frontend Server (Port {siteConfig.FrontendPort})...");
        KillProcessByPort(siteConfig.FrontendPort);

        Log($"[2/3] กำลังปิด Backend Server (Port {siteConfig.BackendPort})...");
        KillProcessByPort(siteConfig.BackendPort);

        Log("[3/3] กำลังปิด Cloudflare Tunnel (cloudflared.exe)...");
        KillCloudflared();

        Log("ปิดบริการทั้งหมดเรียบร้อยแล้ว สถานะเว็บไซต์: OFFLINE");
        Log("==================================================");
        CheckAllStatuses();
    }

    private void RestartAllServices()
    {
        Log("🔄 กำลังรีสตาร์ตระบบเว็บไซต์ใหม่ทั้งหมด...");
        StopAllServices();
        System.Threading.Thread.Sleep(1500);
        StartAllServices();
    }

    // --- PROCESS HELPERS ---
    private void StartTunnelProcess()
    {
        try
        {
            string root = GetAppRoot();
            string localExe = Path.Combine(root, "bin", "cloudflared.exe");
            string exe = File.Exists(localExe) ? localExe : @"C:\Program Files (x86)\cloudflared\cloudflared.exe";
            string token = !string.IsNullOrEmpty(siteConfig.TunnelToken) ? siteConfig.TunnelToken : "...";

            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = exe,
                Arguments = $"tunnel run --token {token}",
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
                UseShellExecute = false
            };
            Process.Start(psi);
        }
        catch (Exception ex)
        {
            Log("⚠️ ข้อผิดพลาดเปิด Cloudflare Tunnel: " + ex.Message);
        }
    }

    private void StartProcessCmd(string workingDir, string command, string title)
    {
        try
        {
            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = $"/c \"title {title} && {command}\"",
                WorkingDirectory = workingDir,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
                UseShellExecute = false
            };
            Process.Start(psi);
        }
        catch (Exception ex)
        {
            Log($"⚠️ ข้อผิดพลาดเริ่ม {command}: " + ex.Message);
        }
    }

    private void KillProcessByPort(int port)
    {
        try
        {
            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = $"/c for /f \"tokens=5\" %a in ('netstat -aon ^| findstr :{port} ^| findstr LISTENING') do taskkill /f /pid %a",
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
                UseShellExecute = false
            };
            using (var p = Process.Start(psi))
            {
                p?.WaitForExit(2500);
            }
        }
        catch { }
    }

    private void KillCloudflared()
    {
        try
        {
            foreach (var proc in Process.GetProcessesByName("cloudflared"))
            {
                try { proc.Kill(); } catch { }
            }
        }
        catch { }
    }

    private bool IsPortListening(int port)
    {
        try
        {
            IPGlobalProperties ipProperties = IPGlobalProperties.GetIPGlobalProperties();
            IPEndPoint[] tcpListeners = ipProperties.GetActiveTcpListeners();
            foreach (IPEndPoint endpoint in tcpListeners)
            {
                if (endpoint.Port == port) return true;
            }
        }
        catch { }
        return false;
    }

    private bool IsProcessRunning(string procName)
    {
        try
        {
            return Process.GetProcessesByName(procName).Length > 0;
        }
        catch { }
        return false;
    }

    private void OpenUrl(string url)
    {
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = url,
                UseShellExecute = true
            });
            Log($"🌐 เปิดบราวเซอร์ไปยัง: {url}");
        }
        catch (Exception ex)
        {
            Log($"⚠️ ไม่สามารถเปิด URL ได้: {ex.Message}");
        }
    }

    private void Log(string message)
    {
        if (txtConsole == null || txtConsole.IsDisposed) return;

        if (txtConsole.InvokeRequired)
        {
            txtConsole.Invoke(new Action(() => Log(message)));
            return;
        }

        string time = DateTime.Now.ToString("HH:mm:ss");
        txtConsole.AppendText($"[{time}] {message}\n");
        txtConsole.SelectionStart = txtConsole.Text.Length;
        txtConsole.ScrollToCaret();
    }
}
