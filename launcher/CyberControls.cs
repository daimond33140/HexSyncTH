using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.Windows.Forms;

namespace HexSyncLauncher;

public static class CyberPathHelper
{
    public static GraphicsPath CreateRoundedPath(RectangleF rect, float radius)
    {
        GraphicsPath path = new GraphicsPath();
        if (radius <= 0.1f)
        {
            path.AddRectangle(rect);
            return path;
        }

        float diameter = radius * 2f;
        if (diameter > rect.Width) diameter = rect.Width;
        if (diameter > rect.Height) diameter = rect.Height;

        RectangleF arc = new RectangleF(rect.X, rect.Y, diameter, diameter);

        // Top-Left Arc
        path.AddArc(arc, 180, 90);

        // Top-Right Arc
        arc.X = rect.Right - diameter;
        path.AddArc(arc, 270, 90);

        // Bottom-Right Arc
        arc.Y = rect.Bottom - diameter;
        path.AddArc(arc, 0, 90);

        // Bottom-Left Arc
        arc.X = rect.Left;
        path.AddArc(arc, 90, 90);

        path.CloseFigure();
        return path;
    }
}

// -------------------------------------------------------------
// CYBER BUTTON: CSS-Style Rounded Pill Button (Zero Ghosting / Zero Square Corners)
// -------------------------------------------------------------
public class CyberButton : Button
{
    private int _cornerRadius = 22;
    public int CornerRadius
    {
        get => _cornerRadius;
        set { _cornerRadius = value; this.Invalidate(); }
    }

    public Color GradientStart { get; set; } = Color.FromArgb(255, 26, 64);
    public Color GradientEnd { get; set; } = Color.FromArgb(200, 10, 45);
    public Color HoverGradientStart { get; set; } = Color.FromArgb(255, 60, 95);
    public Color HoverGradientEnd { get; set; } = Color.FromArgb(235, 20, 60);
    public Color BorderGlowColor { get; set; } = Color.FromArgb(255, 100, 130);
    public Color HoverBorderColor { get; set; } = Color.FromArgb(255, 160, 180);
    public float BorderThickness { get; set; } = 1.2f;

    private bool isHovered = false;
    private bool isPressed = false;

    public CyberButton()
    {
        this.SetStyle(ControlStyles.AllPaintingInWmPaint |
                      ControlStyles.UserPaint |
                      ControlStyles.OptimizedDoubleBuffer |
                      ControlStyles.ResizeRedraw, true);
        this.DoubleBuffered = true;
        this.UpdateStyles();

        this.FlatStyle = FlatStyle.Flat;
        this.FlatAppearance.BorderSize = 0;
        this.BackColor = Color.FromArgb(12, 6, 9);
        this.ForeColor = Color.White;
        this.Cursor = Cursors.Hand;
        this.Font = new Font("Segoe UI", 10.5f, FontStyle.Bold);
    }

    protected override void OnMouseEnter(EventArgs e)
    {
        isHovered = true;
        this.Invalidate();
        base.OnMouseEnter(e);
    }

    protected override void OnMouseLeave(EventArgs e)
    {
        isHovered = false;
        isPressed = false;
        this.Invalidate();
        base.OnMouseLeave(e);
    }

    protected override void OnMouseDown(MouseEventArgs e)
    {
        isPressed = true;
        this.Invalidate();
        base.OnMouseDown(e);
    }

    protected override void OnMouseUp(MouseEventArgs e)
    {
        isPressed = false;
        this.Invalidate();
        base.OnMouseUp(e);
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        Graphics g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
        g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;

        if (this.Width <= 0 || this.Height <= 0) return;

        // 1. Fill entire rectangular bounds with the exact solid color of the parent container
        // This ensures the 4 corners outside the rounded pill match the parent surface seamlessly without ghosting
        Color parentBg = this.Parent?.BackColor ?? Color.FromArgb(12, 6, 9);
        if (this.Parent is CyberPanel cp)
        {
            parentBg = cp.FillColor;
        }
        else if (parentBg.A < 255)
        {
            parentBg = Color.FromArgb(12, 6, 9);
        }

        using (SolidBrush bgBrush = new SolidBrush(parentBg))
        {
            g.FillRectangle(bgBrush, this.ClientRectangle);
        }

        // 2. Draw smooth rounded pill with modern gradient & border
        RectangleF shapeBounds = new RectangleF(1f, 1f, this.Width - 2.5f, this.Height - 2.5f);
        using (GraphicsPath path = CyberPathHelper.CreateRoundedPath(shapeBounds, _cornerRadius))
        {
            Color g1 = isHovered ? HoverGradientStart : GradientStart;
            Color g2 = isHovered ? HoverGradientEnd : GradientEnd;

            if (isPressed)
            {
                g1 = ControlPaint.Dark(g1, 0.18f);
                g2 = ControlPaint.Dark(g2, 0.18f);
            }

            using (LinearGradientBrush fillBrush = new LinearGradientBrush(shapeBounds, g1, g2, LinearGradientMode.Vertical))
            {
                g.FillPath(fillBrush, path);
            }

            Color borderC = isHovered ? HoverBorderColor : BorderGlowColor;
            using (Pen borderPen = new Pen(borderC, BorderThickness))
            {
                g.DrawPath(borderPen, path);
            }
        }

        // 3. Crisp centered button text
        TextRenderer.DrawText(
            g,
            this.Text,
            this.Font,
            this.ClientRectangle,
            this.ForeColor,
            TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.WordBreak
        );
    }
}

// -------------------------------------------------------------
// CYBER PANEL: Smooth Rounded Glassmorphic Card Container
// -------------------------------------------------------------
public class CyberPanel : Panel
{
    private int _cornerRadius = 20;
    public int CornerRadius
    {
        get => _cornerRadius;
        set { _cornerRadius = value; this.Invalidate(); }
    }

    public Color FillColor { get; set; } = Color.FromArgb(20, 13, 24);
    public Color BorderColor { get; set; } = Color.FromArgb(85, 255, 42, 85);
    public float BorderThickness { get; set; } = 1.3f;
    public bool ShowTopAccentGlow { get; set; } = true;
    public Color AccentGlowColor { get; set; } = Color.FromArgb(255, 26, 64);

    public CyberPanel()
    {
        this.SetStyle(ControlStyles.AllPaintingInWmPaint |
                      ControlStyles.UserPaint |
                      ControlStyles.OptimizedDoubleBuffer |
                      ControlStyles.ResizeRedraw, true);
        this.DoubleBuffered = true;
        this.UpdateStyles();
        this.BackColor = Color.FromArgb(12, 6, 9);
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        Graphics g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.PixelOffsetMode = PixelOffsetMode.HighQuality;

        if (this.Width <= 0 || this.Height <= 0) return;

        // 1. Fill entire client area with parent container background
        Color parentBg = this.Parent?.BackColor ?? Color.FromArgb(12, 6, 9);
        if (parentBg.A < 255) parentBg = Color.FromArgb(12, 6, 9);
        using (SolidBrush bgBrush = new SolidBrush(parentBg))
        {
            g.FillRectangle(bgBrush, this.ClientRectangle);
        }

        // 2. Draw smooth rounded card background
        RectangleF bounds = new RectangleF(1f, 1f, this.Width - 2.5f, this.Height - 2.5f);
        using (GraphicsPath path = CyberPathHelper.CreateRoundedPath(bounds, _cornerRadius))
        {
            using (SolidBrush cardBrush = new SolidBrush(FillColor))
            {
                g.FillPath(cardBrush, path);
            }

            // Top neon accent glow line
            if (ShowTopAccentGlow)
            {
                RectangleF topHighlight = new RectangleF(bounds.X + _cornerRadius, bounds.Y, bounds.Width - (_cornerRadius * 2), 2f);
                if (topHighlight.Width > 1f && topHighlight.Height > 0.5f)
                {
                    using (LinearGradientBrush lineBrush = new LinearGradientBrush(
                        topHighlight,
                        Color.FromArgb(0, AccentGlowColor),
                        Color.FromArgb(220, AccentGlowColor),
                        LinearGradientMode.Horizontal))
                    {
                        lineBrush.SetBlendTriangularShape(0.5f);
                        using (Pen glowPen = new Pen(lineBrush, 2f))
                        {
                            g.DrawLine(glowPen, topHighlight.Left, bounds.Y + 1f, topHighlight.Right, bounds.Y + 1f);
                        }
                    }
                }
            }

            // Rounded border
            using (Pen borderPen = new Pen(BorderColor, BorderThickness))
            {
                g.DrawPath(borderPen, path);
            }
        }

        base.OnPaint(e);
    }
}

// -------------------------------------------------------------
// CYBER INPUT BOX: Modern Rounded Capsule Text Input Field
// -------------------------------------------------------------
public class CyberInputBox : Control
{
    private int _cornerRadius = 18;
    public int CornerRadius
    {
        get => _cornerRadius;
        set { _cornerRadius = value; this.Invalidate(); }
    }

    public string IconText { get; set; } = "👤";
    public Color NormalBorderColor { get; set; } = Color.FromArgb(70, 45, 65);
    public Color ActiveBorderColor { get; set; } = Color.FromArgb(255, 42, 85);
    public Color CapsuleBackColor { get; set; } = Color.FromArgb(14, 9, 18);

    public TextBox InnerTextBox { get; }

    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string Text
    {
        get => InnerTextBox?.Text ?? string.Empty;
        set { if (InnerTextBox != null) InnerTextBox.Text = value ?? string.Empty; }
    }

    public char PasswordChar
    {
        get => InnerTextBox.PasswordChar;
        set => InnerTextBox.PasswordChar = value;
    }

    private bool isFocused = false;

    public CyberInputBox()
    {
        this.SetStyle(ControlStyles.AllPaintingInWmPaint |
                      ControlStyles.UserPaint |
                      ControlStyles.OptimizedDoubleBuffer |
                      ControlStyles.ResizeRedraw, true);
        this.DoubleBuffered = true;
        this.UpdateStyles();

        this.Size = new Size(360, 44);
        this.BackColor = Color.FromArgb(20, 13, 24);
        this.Cursor = Cursors.IBeam;

        InnerTextBox = new TextBox
        {
            BorderStyle = BorderStyle.None,
            BackColor = CapsuleBackColor,
            ForeColor = Color.White,
            Font = new Font("Segoe UI", 11.5f, FontStyle.Regular),
            Location = new Point(48, 11),
            Size = new Size(this.Width - 62, 24),
            Anchor = AnchorStyles.Left | AnchorStyles.Right | AnchorStyles.Top
        };

        InnerTextBox.GotFocus += (s, e) => { isFocused = true; this.Invalidate(); };
        InnerTextBox.LostFocus += (s, e) => { isFocused = false; this.Invalidate(); };
        this.Controls.Add(InnerTextBox);

        this.Click += (s, e) => InnerTextBox.Focus();
    }

    protected override void OnResize(EventArgs e)
    {
        base.OnResize(e);
        if (InnerTextBox != null)
        {
            InnerTextBox.Location = new Point(48, (this.Height - InnerTextBox.Height) / 2);
            InnerTextBox.Width = this.Width - 62;
        }
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        Graphics g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
        g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;

        if (this.Width <= 0 || this.Height <= 0) return;

        // 1. Fill parent container background for seamless corners
        Color parentBg = this.Parent?.BackColor ?? Color.FromArgb(20, 13, 24);
        if (this.Parent is CyberPanel cp) parentBg = cp.FillColor;
        using (SolidBrush bgBrush = new SolidBrush(parentBg))
        {
            g.FillRectangle(bgBrush, this.ClientRectangle);
        }

        // 2. Draw capsule background and glowing border
        RectangleF bounds = new RectangleF(1f, 1f, this.Width - 2.5f, this.Height - 2.5f);
        using (GraphicsPath path = CyberPathHelper.CreateRoundedPath(bounds, _cornerRadius))
        {
            using (SolidBrush brush = new SolidBrush(CapsuleBackColor))
            {
                g.FillPath(brush, path);
            }

            Color borderC = isFocused ? ActiveBorderColor : NormalBorderColor;
            float thickness = isFocused ? 2f : 1.2f;
            using (Pen borderPen = new Pen(borderC, thickness))
            {
                g.DrawPath(borderPen, path);
            }
        }

        // 3. Draw Icon on the left
        if (!string.IsNullOrEmpty(IconText))
        {
            using (Font iconFont = new Font("Segoe UI", 12f))
            {
                TextRenderer.DrawText(
                    g,
                    IconText,
                    iconFont,
                    new Rectangle(12, 0, 32, this.Height),
                    isFocused ? Color.FromArgb(255, 77, 109) : Color.FromArgb(160, 130, 150),
                    TextFormatFlags.VerticalCenter | TextFormatFlags.HorizontalCenter
                );
            }
        }

        base.OnPaint(e);
    }
}

// -------------------------------------------------------------
// CYBER STATUS PILL: Rounded Badge with Glowing Status Indicator
// -------------------------------------------------------------
public class CyberStatusPill : Control
{
    private int _cornerRadius = 15;
    public int CornerRadius
    {
        get => _cornerRadius;
        set { _cornerRadius = value; this.Invalidate(); }
    }

    public bool IsOnline { get; set; } = false;
    public string OnlineText { get; set; } = "SYSTEM ONLINE";
    public string OfflineText { get; set; } = "SYSTEM OFFLINE";

    public CyberStatusPill()
    {
        this.SetStyle(ControlStyles.AllPaintingInWmPaint |
                      ControlStyles.UserPaint |
                      ControlStyles.OptimizedDoubleBuffer |
                      ControlStyles.ResizeRedraw, true);
        this.DoubleBuffered = true;
        this.UpdateStyles();

        this.Size = new Size(160, 32);
        this.BackColor = Color.FromArgb(20, 13, 24);
        this.Font = new Font("Segoe UI", 9f, FontStyle.Bold);
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        Graphics g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
        g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;

        if (this.Width <= 0 || this.Height <= 0) return;

        // 1. Fill entire background with parent container color
        Color parentBg = this.Parent?.BackColor ?? Color.FromArgb(20, 13, 24);
        if (this.Parent is CyberPanel cp) parentBg = cp.FillColor;
        using (SolidBrush bgBrush = new SolidBrush(parentBg))
        {
            g.FillRectangle(bgBrush, this.ClientRectangle);
        }

        // 2. Draw rounded status pill
        RectangleF bounds = new RectangleF(1f, 1f, this.Width - 2.5f, this.Height - 2.5f);
        Color mainColor = IsOnline ? Color.FromArgb(0, 230, 130) : Color.FromArgb(255, 60, 90);
        Color backColor = IsOnline ? Color.FromArgb(10, 35, 25) : Color.FromArgb(35, 12, 20);
        Color borderColor = IsOnline ? Color.FromArgb(0, 200, 110) : Color.FromArgb(200, 40, 70);

        using (GraphicsPath path = CyberPathHelper.CreateRoundedPath(bounds, _cornerRadius))
        {
            using (SolidBrush brush = new SolidBrush(backColor))
            {
                g.FillPath(brush, path);
            }
            using (Pen borderPen = new Pen(borderColor, 1.2f))
            {
                g.DrawPath(borderPen, path);
            }
        }

        // 3. Glowing LED Dot
        float dotSize = 8f;
        float dotX = 14f;
        float dotY = (this.Height - dotSize) / 2f;

        using (SolidBrush glowBrush = new SolidBrush(Color.FromArgb(70, mainColor)))
        {
            g.FillEllipse(glowBrush, dotX - 2.5f, dotY - 2.5f, dotSize + 5f, dotSize + 5f);
        }
        using (SolidBrush ledBrush = new SolidBrush(mainColor))
        {
            g.FillEllipse(ledBrush, dotX, dotY, dotSize, dotSize);
        }

        // 4. Status Text
        string displayText = IsOnline ? OnlineText : OfflineText;
        Rectangle textRect = new Rectangle(28, 0, this.Width - 32, this.Height);
        TextRenderer.DrawText(
            g,
            displayText,
            this.Font,
            textRect,
            mainColor,
            TextFormatFlags.VerticalCenter | TextFormatFlags.Left
        );

        base.OnPaint(e);
    }
}
