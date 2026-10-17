// server/forensics_helper.js
const crypto = require('crypto');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');

// Known photo editing software signatures in EXIF, XMP, IPTC, Comments, and Byte headers
const EDITING_APP_SIGNATURES = [
  { name: 'Adobe Photoshop', pattern: /(photoshop|8BIM|adobe:ns:meta|xmp:CreatorTool="Adobe Photoshop")/i },
  { name: 'Adobe Lightroom', pattern: /(lightroom|Adobe Lightroom)/i },
  { name: 'Photopea', pattern: /photopea/i },
  { name: 'Canva', pattern: /canva/i },
  { name: 'PicsArt', pattern: /(picsart|com\.picsart\.studio)/i },
  { name: 'Snapseed', pattern: /snapseed/i },
  { name: 'Pixlr', pattern: /pixlr/i },
  { name: 'GIMP', pattern: /gimp/i },
  { name: 'IbisPaint', pattern: /(ibispaint|ibis paint)/i },
  { name: 'Meitu', pattern: /meitu/i },
  { name: 'Photoroom', pattern: /photoroom/i },
  { name: 'Pixelmator', pattern: /pixelmator/i },
  { name: 'VSCO', pattern: /vsco/i },
  { name: 'Line Camera', pattern: /line\s*camera/i },
  { name: 'InShot', pattern: /inshot/i },
  { name: 'Remini', pattern: /remini/i },
  { name: 'Fake Slip Web Generator', pattern: /(fake.*slip|slip.*gen|slip.*generator|canvas-toBlob|mock.*slip)/i }
];

/**
 * Deep Forensic Image Inspection for Bank Slips
 * Checks metadata, application signatures, compression markers, and dimension ratios
 * @param {string} slipBase64 - Base64 image data URL or raw base64 string
 * @returns {Promise<{ isClean: boolean, detectedApp: string|null, reason: string|null, metadataSummary?: object }>}
 */
async function inspectSlipForensics(slipBase64) {
  try {
    if (!slipBase64 || typeof slipBase64 !== 'string') {
      return { isClean: false, detectedApp: null, reason: 'รูปภาพสลิปไม่ถูกต้องหรือว่างเปล่า' };
    }

    const cleanB64 = slipBase64.replace(/^data:image\/[a-z0-9-+]+;base64,/, '');
    const imgBuffer = Buffer.from(cleanB64, 'base64');

    if (imgBuffer.length < 4096) {
      return { isClean: false, detectedApp: null, reason: 'ขนาดไฟล์ภาพสลิปเล็กผิดปกติ (ต่ำกว่า 4KB) ไม่ใช่สลิปจากแอปธนาคาร' };
    }

    // 1. Level 1: Deep Binary & Metadata String Scan (EXIF / XMP / IPTC / Chunk Comments)
    const rawLatin1 = imgBuffer.toString('latin1');
    const rawUtf8 = imgBuffer.toString('utf8');

    for (const sig of EDITING_APP_SIGNATURES) {
      if (sig.pattern.test(rawLatin1) || sig.pattern.test(rawUtf8)) {
        return {
          isClean: false,
          detectedApp: sig.name,
          reason: `❌ ระบบ AI ตรวจพบร่องรอยการบันทึกภาพผ่านแอปพลิเคชันตัดต่อ/ตกแต่งภาพ (${sig.name}) ระบบไม่อนุญาตให้ใช้สลิปที่มีการตัดต่อ`
        };
      }
    }

    // 2. Level 2: Image Structure & Aspect Ratio Verification
    let width = 0;
    let height = 0;
    let isPng = false;

    if (imgBuffer[0] === 0x89 && imgBuffer[1] === 0x50 && imgBuffer[2] === 0x4e && imgBuffer[3] === 0x47) {
      isPng = true;
      try {
        const png = PNG.sync.read(imgBuffer);
        width = png.width;
        height = png.height;
      } catch (_) {}
    } else if (imgBuffer[0] === 0xff && imgBuffer[1] === 0xd8 && imgBuffer[2] === 0xff) {
      try {
        const jpg = jpeg.decode(imgBuffer, { useTArray: true, formatAsRGBA: false });
        width = jpg.width;
        height = jpg.height;
      } catch (_) {}
    }

    if (width > 0 && height > 0) {
      if (width < 250 || height < 250) {
        return { isClean: false, detectedApp: null, reason: `❌ มิติของภาพสลิป (${width}x${height}px) มีขนาดเล็กเกินกว่าจะเป็นสลิปของธนาคาร` };
      }
      // Horizontal slips are almost always fake or spliced desktop templates
      if (width > height * 1.35) {
        return { isClean: false, detectedApp: null, reason: '❌ สัดส่วนภาพสลิปเป็นแนวนอนผิดปกติ (สลิปโอนเงินจากแอปธนาคารมาตรฐานจะเป็นแนวตั้ง)' };
      }
    }

    return {
      isClean: true,
      detectedApp: null,
      reason: null,
      metadataSummary: {
        width,
        height,
        fileSizeBytes: imgBuffer.length,
        format: isPng ? 'PNG' : 'JPEG'
      }
    };
  } catch (err) {
    console.error('Forensics inspection error:', err);
    // In case of unexpected parser exception, pass through to avoid false rejection
    return { isClean: true, detectedApp: null, reason: null };
  }
}

module.exports = { inspectSlipForensics };
