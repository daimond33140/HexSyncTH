// server/utils/discordAlert.js
const https = require('https');
const http = require('http');

let cachedWebhookUrl = null;
let lastCacheCheck = 0;

async function getDiscordWebhookUrl() {
  const now = Date.now();
  if (cachedWebhookUrl !== null && now - lastCacheCheck < 30000) {
    return cachedWebhookUrl;
  }
  try {
    const { Setting } = require('../models');
    const s = await Setting.findOne({
      where: {
        key: ['discord_security_webhook', 'discord_webhook_url']
      }
    });
    cachedWebhookUrl = (s && s.value && s.value.trim().startsWith('http')) ? s.value.trim() : (process.env.DISCORD_SECURITY_WEBHOOK || '');
  } catch {
    cachedWebhookUrl = process.env.DISCORD_SECURITY_WEBHOOK || '';
  }
  lastCacheCheck = now;
  return cachedWebhookUrl;
}

/**
 * Send Rich Discord Security Embed Alert
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.description
 * @param {number} [options.color] - Hex color code (e.g. 0xef4444 for red, 0xf59e0b for amber)
 * @param {Array<{name: string, value: string, inline?: boolean}>} [options.fields]
 */
async function sendDiscordSecurityAlert({ title, description, color = 0xef4444, fields = [] }) {
  try {
    const webhookUrl = await getDiscordWebhookUrl();
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      return false;
    }

    const payload = JSON.stringify({
      username: '🛡️ HexSync Security Shield',
      avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
      embeds: [
        {
          title: title || '🚨 การแจ้งเตือนความปลอดภัย (Security Alert)',
          description: description || '',
          color: color,
          fields: fields,
          footer: {
            text: 'HexSyncTH Zero-Trust Defense System'
          },
          timestamp: new Date().toISOString()
        }
      ]
    });

    const parsed = new URL(webhookUrl);
    const lib = parsed.protocol === 'https:' ? https : http;

    const req = lib.request(parsed, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    });

    req.on('error', (err) => {
      console.warn('[Discord Alert] Failed to send webhook alert:', err.message);
    });

    req.write(payload);
    req.end();
    return true;
  } catch (err) {
    console.warn('[Discord Alert] Error preparing security alert:', err.message);
    return false;
  }
}

module.exports = {
  sendDiscordSecurityAlert
};
