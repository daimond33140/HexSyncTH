using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Win32;

namespace HexSyncLauncher;

public static class KeyAuthManager
{
    public const string AppName = "zForceCheat";
    public const string OwnerId = "8enwXWlQzC";
    public const string AppSecret = "68e2e66df3fe8418895dee29bd45400a24770807853c2ea961ded96f6f583154";
    public const string AppVersion = "1.0";

    private const string ApiUrl = "https://keyauth.win/api/1.2/";
    private static readonly HttpClient httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };

    public static string? SessionId { get; private set; }
    public static bool IsInitialized { get; private set; }
    public static string? CurrentLicenseKey { get; private set; }
    public static string? UserRank { get; private set; }
    public static string? ExpiryDate { get; private set; }

    public static string GetHardwareId()
    {
        try
        {
            string machineGuid = string.Empty;
            try
            {
                using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Cryptography");
                machineGuid = key?.GetValue("MachineGuid")?.ToString() ?? string.Empty;
            }
            catch { }

            string rawId = $"{Environment.MachineName}-{Environment.UserName}-{Environment.ProcessorCount}-{machineGuid}";
            using var sha = SHA256.Create();
            byte[] hash = sha.ComputeHash(Encoding.UTF8.GetBytes(rawId));
            StringBuilder sb = new StringBuilder();
            foreach (byte b in hash) sb.Append(b.ToString("x2"));
            return sb.ToString(); // 64 chars
        }
        catch
        {
            return "HEXSYNCTH_DEFAULT_HWID_2026_SECURE_NODE";
        }
    }

    public static async Task<(bool Success, string Message)> InitializeAsync()
    {
        try
        {
            var postData = new Dictionary<string, string>
            {
                { "type", "init" },
                { "name", AppName },
                { "ownerid", OwnerId },
                { "secret", AppSecret },
                { "ver", AppVersion }
            };

            using var content = new FormUrlEncodedContent(postData);
            var response = await httpClient.PostAsync(ApiUrl, content);
            string responseText = await response.Content.ReadAsStringAsync();

            using var doc = JsonDocument.Parse(responseText);
            var root = doc.RootElement;

            bool success = root.TryGetProperty("success", out var sProp) && sProp.GetBoolean();
            string msg = root.TryGetProperty("message", out var mProp) ? mProp.GetString() ?? "" : "";

            if (success && root.TryGetProperty("sessionid", out var sessProp))
            {
                SessionId = sessProp.GetString();
                IsInitialized = true;
                return (true, "KeyAuth เชื่อมต่อระบบสำเร็จ");
            }

            return (false, string.IsNullOrEmpty(msg) ? "ไม่สามารถเชื่อมต่อ KeyAuth API ได้" : msg);
        }
        catch (Exception ex)
        {
            return (false, $"เกิดข้อผิดพลาดในการเชื่อมต่อ: {ex.Message}");
        }
    }

    public static async Task<(bool Success, string Message)> AuthenticateLicenseAsync(string licenseKey)
    {
        if (!IsInitialized || string.IsNullOrEmpty(SessionId))
        {
            var initRes = await InitializeAsync();
            if (!initRes.Success) return initRes;
        }

        try
        {
            string hwid = GetHardwareId();
            var postData = new Dictionary<string, string>
            {
                { "type", "license" },
                { "key", licenseKey.Trim() },
                { "hwid", hwid },
                { "sessionid", SessionId! },
                { "name", AppName },
                { "ownerid", OwnerId }
            };

            using var content = new FormUrlEncodedContent(postData);
            var response = await httpClient.PostAsync(ApiUrl, content);
            string responseText = await response.Content.ReadAsStringAsync();

            using var doc = JsonDocument.Parse(responseText);
            var root = doc.RootElement;

            bool success = root.TryGetProperty("success", out var sProp) && sProp.GetBoolean();
            string msg = root.TryGetProperty("message", out var mProp) ? mProp.GetString() ?? "" : "";

            if (success)
            {
                CurrentLicenseKey = licenseKey.Trim();

                if (root.TryGetProperty("info", out var infoProp))
                {
                    if (infoProp.TryGetProperty("subscriptions", out var subProp) && subProp.ValueKind == JsonValueKind.Array && subProp.GetArrayLength() > 0)
                    {
                        var firstSub = subProp[0];
                        if (firstSub.TryGetProperty("subscription", out var subName))
                            UserRank = subName.GetString();
                        if (firstSub.TryGetProperty("expiry", out var expName))
                        {
                            string expStr = expName.GetString() ?? "";
                            if (long.TryParse(expStr, out long unixTime))
                            {
                                DateTime dt = DateTimeOffset.FromUnixTimeSeconds(unixTime).ToLocalTime().DateTime;
                                ExpiryDate = dt.ToString("dd/MM/yyyy HH:mm");
                            }
                            else
                            {
                                ExpiryDate = expStr;
                            }
                        }
                    }
                }

                return (true, "ยืนยัน License Key ถูกต้อง ยินดีต้อนรับเข้าสู่ระบบ!");
            }

            return (false, string.IsNullOrEmpty(msg) ? "License Key ไม่ถูกต้องหรือหมดอายุ" : msg);
        }
        catch (Exception ex)
        {
            return (false, $"เกิดข้อผิดพลาดในการตรวจสอบคีย์: {ex.Message}");
        }
    }

    private static string GetLicenseFilePath()
    {
        return Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "license.cfg");
    }

    public static void SaveLicenseKey(string key)
    {
        try
        {
            File.WriteAllText(GetLicenseFilePath(), key.Trim());
        }
        catch { }
    }

    public static string? LoadSavedLicenseKey()
    {
        try
        {
            string path = GetLicenseFilePath();
            if (File.Exists(path))
            {
                string key = File.ReadAllText(path).Trim();
                if (!string.IsNullOrEmpty(key)) return key;
            }
        }
        catch { }
        return null;
    }

    public static void DeleteSavedLicenseKey()
    {
        try
        {
            string path = GetLicenseFilePath();
            if (File.Exists(path)) File.Delete(path);
        }
        catch { }
    }
}
