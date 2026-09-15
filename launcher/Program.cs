using System;
using System.IO;
using System.Windows.Forms;

namespace HexSyncLauncher;

static class Program
{
    [STAThread]
    static void Main()
    {
        string logPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "app_debug_log.txt");
        try
        {
            File.AppendAllText(logPath, $"[{DateTime.Now}] Main started. BaseDir: {AppDomain.CurrentDomain.BaseDirectory}\n");

            Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
            Application.ThreadException += (s, e) =>
            {
                string err = $"[{DateTime.Now}] ThreadException: {e.Exception}\n";
                File.AppendAllText(logPath, err);
                MessageBox.Show(err, "HexSyncTH Launcher Crash", MessageBoxButtons.OK, MessageBoxIcon.Error);
            };
            AppDomain.CurrentDomain.UnhandledException += (s, e) =>
            {
                string err = $"[{DateTime.Now}] UnhandledException: {e.ExceptionObject}\n";
                File.AppendAllText(logPath, err);
            };

            ApplicationConfiguration.Initialize();
            File.AppendAllText(logPath, $"[{DateTime.Now}] ApplicationConfiguration initialized. Creating Form1...\n");

            using (var form = new Form1())
            {
                File.AppendAllText(logPath, $"[{DateTime.Now}] Form1 instance created. Calling Application.Run...\n");
                Application.Run(form);
                File.AppendAllText(logPath, $"[{DateTime.Now}] Application.Run completed/returned.\n");
            }
        }
        catch (Exception ex)
        {
            try
            {
                File.AppendAllText(logPath, $"[{DateTime.Now}] FATAL CRASH: {ex}\n");
            }
            catch { }

            MessageBox.Show(
                $"ข้อผิดพลาดในการเปิดโปรแกรม:\n\n{ex.Message}\n\nStack:\n{ex.StackTrace}",
                "HexSyncTH Error",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );
        }
        finally
        {
            try
            {
                File.AppendAllText(logPath, $"[{DateTime.Now}] Process terminating.\n");
            }
            catch { }
        }
    }    
}