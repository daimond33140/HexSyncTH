// server/utils/discordAlert.js
const https = require('https');
const http = require('http');

let cachedConfig = null;
let lastCacheCheck = 0;

async function getDiscordConfig() {
  const now = Date.now();
  if (cachedConfig !== null && now - lastCacheCheck < 30000) {
    return cachedConfig;
  }

  let webhookUrl = process.env.DISCORD_SECURITY_WEBHOOK || '';
  let botToken = process.env.DISCORD_BOT_TOKEN || '';
  let channelId = process.env.DISCORD_ALERT_CHANNEL_ID || '';

  try {
    const { Setting } = require('../models');
    const settings = await Setting.findAll({
      where: {
        key: ['discord_security_webhook', 'discord_webhook_url', 'discord_bot_token', 'discord_alert_channel_id']
      }
    });

    settings.forEach((s) => {
      if ((s.key === 'discord_security_webhook' || s.key === 'discord_webhook_url') && s.value && s.value.trim().startsWith('http')) {
        webhookUrl = s.value.trim();
      }
      if (s.key === 'discord_bot_token' && s.value && s.value.trim()) {
        botToken = s.value.trim();
      }
      if (s.key === 'discord_alert_channel_id' && s.value && s.value.trim()) {
        channelId = s.value.trim();
      }
    });
  } catch (_) {}

  cachedConfig = { webhookUrl, botToken, channelId };
  lastCacheCheck = now;
  return cachedConfig;
}

/**
 * Send Rich Discord Security Embed Alert (Supports both Bot Token and Webhook)
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.description
 * @param {number} [options.color] - Hex color code (e.g. 0xef4444 for red, 0xf59e0b for amber)
 * @param {Array<{name: string, value: string, inline?: boolean}>} [options.fields]
 */
async function sendDiscordSecurityAlert({ title, description, color = 0xef4444, fields = [] }) {
  try {
    const config = await getDiscordConfig();

    const embed = {
      title: title || '🚨 การแจ้งเตือนความปลอดภัย (Security Alert)',
      description: description || '',
      color: color,
      fields: fields,
      footer: {
        text: 'HexSyncTH Zero-Trust Defense System'
      },
      timestamp: new Date().toISOString()
    };

    // Mode 1: Send via Discord Bot Token directly to Channel ID (No Webhook needed!)
    if (config.botToken && config.channelId) {
      const payload = JSON.stringify({
        embeds: [embed]
      });

      return new Promise((resolve) => {
        const req = https.request({
          hostname: 'discord.com',
          path: `/api/v10/channels/${config.channelId}/messages`,
          method: 'POST',
          headers: {
            'Authorization': `Bot ${config.botToken}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        }, (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(true);
          } else {
            console.warn(`[Discord Bot Alert] Received non-200 code: ${res.statusCode}`);
            resolve(false);
          }
        });

        req.on('error', (err) => {
          console.warn('[Discord Bot Alert] Request error:', err.message);
          resolve(false);
        });

        req.write(payload);
        req.end();
      });
    }

    // Mode 2: Send via Discord Webhook URL
    if (config.webhookUrl && config.webhookUrl.startsWith('http')) {
      const payload = JSON.stringify({
        username: 'HEX AI 🛡️ Security Shield',
        avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
        embeds: [embed]
      });

      const parsed = new URL(config.webhookUrl);
      const lib = parsed.protocol === 'https:' ? https : http;

      return new Promise((resolve) => {
        const req = lib.request(parsed, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        }, (res) => {
          resolve(res.statusCode >= 200 && res.statusCode < 300);
        });

        req.on('error', (err) => {
          console.warn('[Discord Webhook Alert] Error:', err.message);
          resolve(false);
        });

        req.write(payload);
        req.end();
      });
    }

    return false;
  } catch (err) {
    console.warn('[Discord Alert] Failed to send alert:', err.message);
    return false;
  }
}

module.exports = {
  sendDiscordSecurityAlert
};
