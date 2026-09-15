using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.IO.Compression;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace HexSyncPublisher;

public partial class PublisherForm : Form
{
    // --- WIN32 WINDOW DRAGGING ---
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

    // --- CONTROLS ---
    private Panel pnlTitleBar = null!;
    private CyberButton btnTitleClose = null!;
    private CyberButton btnTitleMin = null!;

    private CyberPanel pnlStatusCard = null!;
    private Label lblCurrentVersion = null!;
    private CyberStatusPill pillCloudStatus = null!;

    private CyberInputBox txtVersion = null!;
    private RichTextBox txtChangelog = null!;
    private CheckBox chkBuildFrontend = null!;
    private CheckBox chkStrictProtection = null!;

    private CyberButton btnPublish = null!;
    private CyberButton btnRefresh = null!;
    private CyberButton btnOpenFolder = null!;

    private RichTextBox txtConsole = null!;

    public PublisherForm()
    {
        this.DoubleBuffered = true;
        this.SetStyle(ControlStyles.ResizeRedraw, true);

        InitWindowProperties();
        BuildUI();
        LoadCurrentManifest();
    }

    private void InitWindowProperties()
    {
        this.Text = "HexSyncTH — Release & Update Publisher Studio";
        this.Size = new Size(880, 720);
        this.MinimumSize = new Size(880, 720);
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

    private void BuildUI()
    {
        // 1. Custom Title Bar
        pnlTitleBar = new Panel
        {
            Location = new Point(0, 0),
            Size = new Size(this.Width, 42),
            BackColor = Color.FromArgb(18, 10, 16)
        };
        EnableWindowDrag(pnlTitleBar);
        this.Controls.Add(pnlTitleBar);

        Label lblTitle = new Label
        {
            Text = "HEXSYNC TH  |  RELEASE & UPDATE PUBLISHER STUDIO",
            Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
            ForeColor = Color.FromArgb(240, 220, 230),
            Location = new Point(16, 11),
            AutoSize = true
        };
        EnableWindowDrag(lblTitle);
        pnlTitleBar.Controls.Add(lblTitle);

        btnTitleMin = new CyberButton
        {
            Text = "─",
            CornerRadius = 14,
            Font = new Font("Segoe UI", 9f, FontStyle.Bold),
            Size = new Size(32, 28),
            Location = new Point(this.Width - 78, 7),
            GradientStart = Color.FromArgb(30, 20, 28),
            GradientEnd = Color.FromArgb(20, 12, 18),
            HoverGradientStart = Color.FromArgb(60, 40, 55),
            HoverGradientEnd = Color.FromArgb(40, 25, 38)
        };
        btnTitleMin.Click += (s, e) => this.WindowState = FormWindowState.Minimized;
        pnlTitleBar.Controls.Add(btnTitleMin);

        btnTitleClose = new CyberButton
        {
            Text = "✕",
            CornerRadius = 14,
            Font = new Font("Segoe UI", 9f, FontStyle.Bold),
            Size = new Size(32, 28),
            Location = new Point(this.Width - 40, 7),
            GradientStart = Color.FromArgb(180, 20, 40),
            GradientEnd = Color.FromArgb(120, 10, 25),
            HoverGradientStart = Color.FromArgb(230, 40, 65),
            HoverGradientEnd = Color.FromArgb(160, 15, 35)
        };
        btnTitleClose.Click += (s, e) => this.Close();
        pnlTitleBar.Controls.Add(btnTitleClose);

        // 2. Status Card (Current Live Version Banner)
        pnlStatusCard = new CyberPanel
        {
            Location = new Point(20, 52),
            Size = new Size(840, 68),
            CornerRadius = 16,
            FillColor = Color.FromArgb(18, 11, 24),
            BorderColor = Color.FromArgb(139, 92, 246),
            BorderThickness = 1.2f,
            ShowTopAccentGlow = true,
            AccentGlowColor = Color.FromArgb(168, 85, 247)
        };
        this.Controls.Add(pnlStatusCard);

        lblCurrentVersion = new Label
        {
            Text = "⚡ กำลังตรวจสอบเวอร์ชันล่าสุดบนเซิร์ฟเวอร์...",
            Font = new Font("Segoe UI", 10.5f, FontStyle.Bold),
            ForeColor = Color.FromArgb(240, 230, 255),
            Location = new Point(18, 14),
            AutoSize = true
        };
        pnlStatusCard.Controls.Add(lblCurrentVersion);

        pillCloudStatus = new CyberStatusPill
        {
            Location = new Point(660, 16),
            Size = new Size(160, 34),
            OnlineText = "● LIVE ON SERVER",
            OfflineText = "● OFFLINE",
            IsOnline = true
        };
        pnlStatusCard.Controls.Add(pillCloudStatus);

        // 3. Form Input Container
        CyberPanel pnlForm = new CyberPanel
        {
            Location = new Point(20, 130),
            Size = new Size(840, 280),
            CornerRadius = 18,
            FillColor = Color.FromArgb(15, 9, 18),
            BorderColor = Color.FromArgb(255, 26, 64),
            BorderThickness = 1.2f,
            ShowTopAccentGlow = true,
            AccentGlowColor = Color.FromArgb(255, 26, 64)
        };
        this.Controls.Add(pnlForm);

        // Label Version
        Label lblVer = new Label
        {
            Text = "หมายเลขเวอร์ชันใหม่ที่จะปล่อย (New Release Version):",
            Font = new Font("Segoe UI", 9.8f, FontStyle.Bold),
            ForeColor = Color.FromArgb(255, 180, 195),
            Location = new Point(20, 15),
            AutoSize = true
        };
        pnlForm.Controls.Add(lblVer);

        txtVersion = new CyberInputBox
        {
            IconText = "🏷️",
            Location = new Point(20, 38),
            Size = new Size(260, 42),
            Text = "9.1.4"
        };
        pnlForm.Controls.Add(txtVersion);

        // Label Changelog
        Label lblLog = new Label
        {
            Text = "รายละเอียดสิ่งที่อัปเดตมาใหม่ (Changelog / What's New):",
            Font = new Font("Segoe UI", 9.8f, FontStyle.Bold),
            ForeColor = Color.FromArgb(255, 180, 195),
            Location = new Point(310, 15),
            AutoSize = true
        };
        pnlForm.Controls.Add(lblLog);

        Panel pnlTextBorder = new Panel
        {
            Location = new Point(310, 38),
            Size = new Size(510, 165),
            BackColor = Color.FromArgb(30, 20, 35),
            Padding = new Padding(1)
        };
        pnlForm.Controls.Add(pnlTextBorder);

        txtChangelog = new RichTextBox
        {
            Dock = DockStyle.Fill,
            BackColor = Color.FromArgb(14, 9, 18),
            ForeColor = Color.FromArgb(235, 245, 255),
            Font = new Font("Segoe UI", 10f, FontStyle.Regular),
            BorderStyle = BorderStyle.None,
            Text = "• ปรับปรุงระบบความปลอดภัยและการแสดงผลหน้าบ้าน\n• เพิ่มความเสถียรของระบบตะกร้าสินค้าและคำสั่งซื้อ\n• อัปเดตแพตช์ล่าสุดประจำเวอร์ชัน"
        };
        pnlTextBorder.Controls.Add(txtChangelog);

        // Checkboxes
        chkBuildFrontend = new CheckBox
        {
            Text = "🔨 คอมไพล์หน้าบ้านใหม่โดยอัตโนมัติ (npm run build)",
            Checked = true,
            ForeColor = Color.FromArgb(230, 230, 245),
            Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
            Location = new Point(20, 95),
            Size = new Size(280, 28),
            Cursor = Cursors.Hand
        };
        pnlForm.Controls.Add(chkBuildFrontend);

        chkStrictProtection = new CheckBox
        {
            Text = "🔒 ป้องกันข้อมูลลูกค้า 100% (ไม่ยุ่งกับฐานข้อมูลและ .env)",
            Checked = true,
            Enabled = false, // Always locked to true for guaranteed safety
            ForeColor = Color.FromArgb(52, 211, 153),
            Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
            Location = new Point(20, 130),
            Size = new Size(280, 28)
        };
        pnlForm.Controls.Add(chkStrictProtection);

        // Action Buttons Row inside Form
        btnPublish = new CyberButton
        {
            Text = "🚀 เผยแพร่อัปเดตทันที (PUBLISH UPDATE)",
            CornerRadius = 24,
            Font = new Font("Segoe UI", 11f, FontStyle.Bold),
            ForeColor = Color.White,
            GradientStart = Color.FromArgb(236, 72, 153),
            GradientEnd = Color.FromArgb(168, 85, 247),
            HoverGradientStart = Color.FromArgb(244, 114, 182),
            HoverGradientEnd = Color.FromArgb(192, 132, 252),
            BorderGlowColor = Color.FromArgb(249, 168, 212),
            HoverBorderColor = Color.FromArgb(253, 230, 138),
            Size = new Size(420, 48),
            Location = new Point(20, 215)
        };
        btnPublish.Click += (s, e) => _ = ExecutePublishAsync();
        pnlForm.Controls.Add(btnPublish);

        btnRefresh = new CyberButton
        {
            Text = "🔄 รีเฟรช",
            CornerRadius = 22,
            Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
            ForeColor = Color.FromArgb(220, 235, 255),
            GradientStart = Color.FromArgb(14, 165, 233),
            GradientEnd = Color.FromArgb(2, 132, 199),
            HoverGradientStart = Color.FromArgb(56, 189, 248),
            HoverGradientEnd = Color.FromArgb(14, 165, 233),
            BorderGlowColor = Color.FromArgb(125, 211, 252),
            HoverBorderColor = Color.FromArgb(186, 230, 253),
            Size = new Size(180, 48),
            Location = new Point(460, 215)
        };
        btnRefresh.Click += (s, e) => LoadCurrentManifest();
        pnlForm.Controls.Add(btnRefresh);

        btnOpenFolder = new CyberButton
        {
            Text = "📂 ดูไฟล์แพตช์",
            CornerRadius = 22,
            Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
            ForeColor = Color.FromArgb(220, 230, 240),
            GradientStart = Color.FromArgb(71, 85, 105),
            GradientEnd = Color.FromArgb(51, 65, 85),
            HoverGradientStart = Color.FromArgb(100, 116, 139),
            HoverGradientEnd = Color.FromArgb(71, 85, 105),
            BorderGlowColor = Color.FromArgb(148, 163, 184),
            HoverBorderColor = Color.FromArgb(203, 213, 225),
            Size = new Size(160, 48),
            Location = new Point(660, 215)
        };
        btnOpenFolder.Click += (s, e) => OpenUpdatesFolder();
        pnlForm.Controls.Add(btnOpenFolder);

        // 4. Live Progress Console Card
        CyberPanel pnlConsole = new CyberPanel
        {
            Location = new Point(20, 422),
            Size = new Size(840, 275),
            CornerRadius = 18,
            FillColor = Color.FromArgb(10, 7, 14),
            BorderColor = Color.FromArgb(0, 210, 255),
            BorderThickness = 1.2f,
            ShowTopAccentGlow = true,
            AccentGlowColor = Color.FromArgb(0, 210, 255)
        };
        this.Controls.Add(pnlConsole);

        Label lblConsoleTitle = new Label
        {
            Text = ">_ PUBLISHER TERMINAL & PIPELINE TELEMETRY",
            Font = new Font("Consolas", 8.8f, FontStyle.Bold),
            ForeColor = Color.FromArgb(0, 210, 255),
            Location = new Point(16, 8),
            AutoSize = true
        };
        pnlConsole.Controls.Add(lblConsoleTitle);

        txtConsole = new RichTextBox
        {
            Location = new Point(14, 28),
            Size = new Size(812, 232),
            BackColor = Color.FromArgb(8, 5, 12),
            ForeColor = Color.FromArgb(0, 255, 180),
            Font = new Font("Consolas", 9.5f, FontStyle.Regular),
            BorderStyle = BorderStyle.None,
            ReadOnly = true,
            ScrollBars = RichTextBoxScrollBars.Vertical
        };
        pnlConsole.Controls.Add(txtConsole);
    }

    private void Log(string msg, Color? color = null)
    {
        if (txtConsole.InvokeRequired)
        {
            txtConsole.Invoke(new Action(() => Log(msg, color)));
            return;
        }

        string time = DateTime.Now.ToString("HH:mm:ss");
        txtConsole.SelectionStart = txtConsole.TextLength;
        txtConsole.SelectionLength = 0;

        txtConsole.SelectionColor = Color.FromArgb(120, 110, 135);
        txtConsole.AppendText($"[{time}] ");

        txtConsole.SelectionColor = color ?? Color.FromArgb(0, 255, 180);
        txtConsole.AppendText($"{msg}\n");
        txtConsole.ScrollToCaret();
    }

    private string GetProjectRoot()
    {
        string baseDir = AppDomain.CurrentDomain.BaseDirectory;
        if (Directory.Exists(Path.Combine(baseDir, "server"))) return baseDir;
        if (Directory.Exists(Path.Combine(baseDir, "..", "server"))) return Path.GetFullPath(Path.Combine(baseDir, ".."));
        if (Directory.Exists(@"d:\wee\server")) return @"d:\wee";
        return baseDir;
    }

    private void LoadCurrentManifest()
    {
        try
        {
            string root = GetProjectRoot();
            string manifestPath = Path.Combine(root, "server", "data", "updates", "update_manifest.json");
            if (File.Exists(manifestPath))
            {
                string json = File.ReadAllText(manifestPath).TrimStart('\uFEFF');
                using JsonDocument doc = JsonDocument.Parse(json);
                var rootEl = doc.RootElement;
                string ver = rootEl.TryGetProperty("version", out var v) ? v.GetString() ?? "9.1.3" : "9.1.3";
                string date = rootEl.TryGetProperty("releaseDate", out var d) ? d.GetString() ?? "" : "";

                lblCurrentVersion.Text = $"🔥 เวอร์ชันที่เปิดให้อัปเดตปัจจุบัน: v{ver}  (ปล่อยเมื่อ: {date})";
                Log($"โหลดข้อมูลเวอร์ชันปัจจุบันสำเร็จ: v{ver} ({date})");

                // Auto suggest next patch version (e.g. 9.1.3 -> 9.1.4)
                if (Version.TryParse(ver.TrimStart('v', 'V'), out Version? parsed))
                {
                    txtVersion.Text = $"{parsed.Major}.{parsed.Minor}.{Math.Max(0, parsed.Build) + 1}";
                }
            }
            else
            {
                lblCurrentVersion.Text = "⚡ ยังไม่มีการปล่อยแพตช์อัปเดตบนเซิร์ฟเวอร์นี้ (พร้อมสำหรับการปล่อยครั้งแรก)";
                Log("ยังไม่พบไฟล์ update_manifest.json (พร้อมสร้างใหม่)");
            }
        }
        catch (Exception ex)
        {
            lblCurrentVersion.Text = $"⚠️ ข้อผิดพลาด: {ex.Message}";
        }
    }

    private void OpenUpdatesFolder()
    {
        try
        {
            string folder = Path.Combine(GetProjectRoot(), "server", "data", "updates");
            Directory.CreateDirectory(folder);
            Process.Start(new ProcessStartInfo("explorer.exe", folder) { UseShellExecute = true });
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, "ไม่สามารถเปิดโฟลเดอร์ได้: " + ex.Message, "ข้อผิดพลาด", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    private async Task ExecutePublishAsync()
    {
        string targetVersion = txtVersion.Text.Trim().TrimStart('v', 'V');
        if (string.IsNullOrEmpty(targetVersion))
        {
            MessageBox.Show(this, "กรุณาระบุหมายเลขเวอร์ชันใหม่ก่อนเผยแพร่!", "แจ้งเตือน", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            txtVersion.Focus();
            return;
        }

        string changelog = txtChangelog.Text.Trim();
        if (string.IsNullOrEmpty(changelog))
        {
            changelog = "อัปเดตระบบหน้าบ้านและปรับปรุงประสิทธิภาพทั่วไป";
        }

        btnPublish.Enabled = false;
        btnRefresh.Enabled = false;

        try
        {
            Log("==================================================", Color.FromArgb(255, 215, 0));
            Log($"🚀 เริ่มต้นกระบวนการเผยแพร่อัปเดตเวอร์ชัน v{targetVersion}...", Color.FromArgb(255, 215, 0));
            Log($"Changelog:\n{changelog}", Color.FromArgb(200, 200, 230));

            string root = GetProjectRoot();
            string updatesDir = Path.Combine(root, "server", "data", "updates");
            string stagingDir = Path.Combine(updatesDir, "staging");
            string zipOut = Path.Combine(updatesDir, "latest_update.zip");
            string manifestPath = Path.Combine(updatesDir, "update_manifest.json");

            Directory.CreateDirectory(updatesDir);

            // Step 1: Build Frontend (if checked)
            if (chkBuildFrontend.Checked)
            {
                Log("\n[1/4] 🔨 กำลังคอมไพล์ Frontend Bundle ล่าสุด (npm run build)...", Color.FromArgb(14, 165, 233));
                bool buildOk = await RunCommandAsync(root, "cmd.exe", "/c npm run build");
                if (!buildOk)
                {
                    Log("❌ การคอมไพล์ Frontend ล้มเหลว! ยกเลิกการเผยแพร่เพื่อป้องกันระบบเสียหาย", Color.FromArgb(239, 68, 68));
                    MessageBox.Show(this, "การคอมไพล์ Frontend ล้มเหลว! กรุณาตรวจสอบโค้ดหน้าบ้าน", "คอมไพล์ล้มเหลว", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }
                Log("✓ คอมไพล์ Frontend สำเร็จเรียบร้อย!", Color.FromArgb(52, 211, 153));
            }
            else
            {
                Log("\n[1/4] ข้ามขั้นตอนการคอมไพล์ Frontend (ใช้ไฟล์ dist เดิม)");
            }

            // Step 2: Staging Safe Web Files
            Log("\n[2/4] 📦 กำลังจัดเตรียมไฟล์แพตช์ (ระบบคัดกรองความปลอดภัย Zero-Touch)...", Color.FromArgb(14, 165, 233));
            if (Directory.Exists(stagingDir))
            {
                Directory.Delete(stagingDir, true);
            }
            Directory.CreateDirectory(Path.Combine(stagingDir, "dist"));
            Directory.CreateDirectory(Path.Combine(stagingDir, "server"));

            // Copy dist
            string distSrc = Path.Combine(root, "dist");
            if (Directory.Exists(distSrc))
            {
                CopyDirectory(distSrc, Path.Combine(stagingDir, "dist"));
            }

            // Copy scripts
            string serveDist = Path.Combine(root, "serve_dist.cjs");
            if (File.Exists(serveDist)) File.Copy(serveDist, Path.Combine(stagingDir, "serve_dist.cjs"), true);

            string startAll = Path.Combine(root, "START_ALL.bat");
            if (File.Exists(startAll)) File.Copy(startAll, Path.Combine(stagingDir, "START_ALL.bat"), true);

            // Copy server files (STRICTLY EXCLUDING data, .env, node_modules, *.bak)
            string serverSrc = Path.Combine(root, "server");
            foreach (var file in Directory.GetFiles(serverSrc))
            {
                string fname = Path.GetFileName(file);
                if (fname.Equals(".env", StringComparison.OrdinalIgnoreCase) || fname.EndsWith(".bak", StringComparison.OrdinalIgnoreCase)) continue;
                File.Copy(file, Path.Combine(stagingDir, "server", fname), true);
            }

            string[] safeServerFolders = new string[] { "routes", "models", "middleware", "utils" };
            foreach (var fld in safeServerFolders)
            {
                string srcFld = Path.Combine(serverSrc, fld);
                if (Directory.Exists(srcFld))
                {
                    CopyDirectory(srcFld, Path.Combine(stagingDir, "server", fld));
                }
            }

            // Write version.json into staging payload so customer's root gets it automatically
            var payloadVersion = new
            {
                version = targetVersion,
                updatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                changelog = changelog
            };
            File.WriteAllText(Path.Combine(stagingDir, "version.json"), JsonSerializer.Serialize(payloadVersion, new JsonSerializerOptions { WriteIndented = true }), new UTF8Encoding(false));

            Log("✓ คัดกรองและรวบรวมเฉพาะไฟล์ระบบเรียบร้อย (ฐานข้อมูลและ .env ได้รับการปกป้อง 100%)", Color.FromArgb(52, 211, 153));

            // Step 3: Compress to latest_update.zip
            Log("\n[3/4] 🗜️ กำลังบีบอัดแพตช์เป็น latest_update.zip...", Color.FromArgb(14, 165, 233));
            if (File.Exists(zipOut)) File.Delete(zipOut);

            await Task.Run(() =>
            {
                ZipFile.CreateFromDirectory(stagingDir, zipOut, CompressionLevel.Optimal, false);
            });

            try { Directory.Delete(stagingDir, true); } catch { }

            long zipSizeKb = new FileInfo(zipOut).Length / 1024;
            Log($"✓ บีบอัดแพตช์สำเร็จ! ขนาดไฟล์: {zipSizeKb:N0} KB ({zipSizeKb / 1024.0:F2} MB)", Color.FromArgb(52, 211, 153));

            // Step 4: Write Manifest (without BOM)
            Log("\n[4/4] 📝 กำลังอัปเดตไฟล์ update_manifest.json...", Color.FromArgb(14, 165, 233));
            var manifestObj = new
            {
                version = targetVersion,
                minRequiredVersion = "9.0.0",
                releaseDate = DateTime.Now.ToString("yyyy-MM-dd HH:mm"),
                changelog = changelog,
                downloadPath = "latest_update.zip"
            };
            string manifestJson = JsonSerializer.Serialize(manifestObj, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(manifestPath, manifestJson, new UTF8Encoding(false));

            Log("==================================================", Color.FromArgb(52, 211, 153));
            Log($"🎉 เผยแพร่อัปเดต v{targetVersion} สำเร็จสมบูรณ์แบบ!", Color.FromArgb(52, 211, 153));
            Log("💡 ลูกค้าทุกคนที่เปิดโปรแกรม .exe หรือกดปุ่ม UPDATE จะตรวจพบเวอร์ชันนี้ทันที", Color.FromArgb(255, 215, 0));

            LoadCurrentManifest();

            MessageBox.Show(this,
                $"🎉 เผยแพร่อัปเดตเวอร์ชัน v{targetVersion} สำเร็จแล้ว!\n\n" +
                $"• ขนาดแพตช์: {zipSizeKb:N0} KB\n" +
                $"• ลูกค้าทุกคนสามารถกดอัปเดตได้จาก .exe ทันที\n" +
                $"• ฐานข้อมูลและข้อมูลส่วนตัวของลูกค้าปลอดภัย 100%",
                "เผยแพร่อัปเดตสำเร็จ",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
        }
        catch (Exception ex)
        {
            Log($"❌ เกิดข้อผิดพลาดในการเผยแพร่: {ex.Message}", Color.FromArgb(239, 68, 68));
            MessageBox.Show(this, "เกิดข้อผิดพลาด: " + ex.Message, "ข้อผิดพลาด", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        finally
        {
            btnPublish.Enabled = true;
            btnRefresh.Enabled = true;
        }
    }

    private void CopyDirectory(string sourceDir, string targetDir)
    {
        Directory.CreateDirectory(targetDir);
        foreach (var file in Directory.GetFiles(sourceDir))
        {
            string dest = Path.Combine(targetDir, Path.GetFileName(file));
            File.Copy(file, dest, true);
        }
        foreach (var dir in Directory.GetDirectories(sourceDir))
        {
            string dname = Path.GetFileName(dir);
            if (dname.Equals("node_modules", StringComparison.OrdinalIgnoreCase) ||
                dname.Equals(".cache", StringComparison.OrdinalIgnoreCase) ||
                dname.Equals("data", StringComparison.OrdinalIgnoreCase)) continue;

            string dest = Path.Combine(targetDir, dname);
            CopyDirectory(dir, dest);
        }
    }

    private async Task<bool> RunCommandAsync(string workDir, string fileName, string args)
    {
        return await Task.Run(() =>
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = fileName,
                    Arguments = args,
                    WorkingDirectory = workDir,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    StandardOutputEncoding = Encoding.UTF8,
                    StandardErrorEncoding = Encoding.UTF8
                };

                using var p = Process.Start(psi);
                if (p == null) return false;

                p.OutputDataReceived += (s, e) => { if (!string.IsNullOrWhiteSpace(e.Data)) Log($"  > {e.Data}", Color.FromArgb(160, 160, 180)); };
                p.ErrorDataReceived += (s, e) => { if (!string.IsNullOrWhiteSpace(e.Data)) Log($"  [ERR] {e.Data}", Color.FromArgb(250, 120, 120)); };

                p.BeginOutputReadLine();
                p.BeginErrorReadLine();

                p.WaitForExit();
                return p.ExitCode == 0;
            }
            catch (Exception ex)
            {
                Log($"Execution error: {ex.Message}", Color.FromArgb(239, 68, 68));
                return false;
            }
        });
    }
}
