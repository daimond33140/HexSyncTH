// server/utils/geoIp.js
const http = require('http');

const ipLocationCache = new Map();

async function resolveIpLocation(ip, headers = {}) {
  // 1. Check Cloudflare Geolocation Headers first if available
  const cfCountry = headers['cf-ipcountry'];
  const cfCity = headers['cf-ipcity'];
  const cfLat = parseFloat(headers['cf-iplatitude']);
  const cfLon = parseFloat(headers['cf-iplongitude']);

  if (cfLat && cfLon && !isNaN(cfLat) && !isNaN(cfLon)) {
    return {
      latitude: cfLat,
      longitude: cfLon,
      city: cfCity ? decodeURIComponent(cfCity) : 'กรุงเทพมหานคร',
      region: '',
      country: cfCountry || 'Thailand',
      isp: 'Cloudflare Network',
    };
  }

  // 2. Normalize and check local IP
  const cleanIp = (ip || '').trim().replace('::ffff:', '');
  if (
    !cleanIp ||
    cleanIp === '127.0.0.1' ||
    cleanIp === '::1' ||
    cleanIp.startsWith('192.168.') ||
    cleanIp.startsWith('10.') ||
    cleanIp.startsWith('172.16.')
  ) {
    return {
      latitude: 13.7563,
      longitude: 100.5018,
      city: 'กรุงเทพมหานคร (Bangkok)',
      region: 'Bangkok',
      country: 'Thailand (Local / Fallback)',
      isp: 'Local / Internal Network',
    };
  }

  // 3. Check memory cache
  if (ipLocationCache.has(cleanIp)) {
    return ipLocationCache.get(cleanIp);
  }

  // 4. Query free IP-API service
  return new Promise((resolve) => {
    const url = `http://ip-api.com/json/${cleanIp}?fields=status,message,country,regionName,city,lat,lon,isp,query`;
    const req = http.get(url, { timeout: 3500 }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'success') {
            const result = {
              latitude: json.lat || 13.7563,
              longitude: json.lon || 100.5018,
              city: json.city || 'Bangkok',
              region: json.regionName || '',
              country: json.country || 'Thailand',
              isp: json.isp || 'Internet Service Provider',
            };
            ipLocationCache.set(cleanIp, result);
            return resolve(result);
          }
        } catch {}
        resolve({
          latitude: 13.7563,
          longitude: 100.5018,
          city: 'กรุงเทพมหานคร (Bangkok)',
          region: 'Bangkok',
          country: 'Thailand',
          isp: 'ISP',
        });
      });
    });

    req.on('error', () => {
      resolve({
        latitude: 13.7563,
        longitude: 100.5018,
        city: 'กรุงเทพมหานคร (Bangkok)',
        region: 'Bangkok',
        country: 'Thailand',
        isp: 'ISP',
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        latitude: 13.7563,
        longitude: 100.5018,
        city: 'กรุงเทพมหานคร (Bangkok)',
        region: 'Bangkok',
        country: 'Thailand',
        isp: 'ISP',
      });
    });
  });
}

module.exports = {
  resolveIpLocation,
  ipLocationCache
};
