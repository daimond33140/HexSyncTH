// server/ocr_helper.js
const Tesseract = require('tesseract.js');

function isValidImageBuffer(buf) {
  if (!buf || !Buffer.isBuffer(buf) || buf.length < 10) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  // WebP: RIFF ... WEBP
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return true;
  return false;
}

/**
 * Extract amount from Thai bank slip image using OCR
 * @param {string|Buffer} imageSource - Base64 data URL or Buffer
 * @returns {Promise<{ detectedAmount: number|null, rawText: string }>}
 */
async function extractAmountFromSlip(imageSource) {
  try {
    let input = imageSource;
    if (typeof imageSource === 'string' && imageSource.startsWith('data:')) {
      const base64Data = imageSource.replace(/^data:image\/[a-z0-9-+]+;base64,/, '');
      input = Buffer.from(base64Data, 'base64');
    }

    if (!isValidImageBuffer(input)) {
      return { detectedAmount: null, rawText: '' };
    }

    const { data: { text } } = await Tesseract.recognize(input, 'eng');

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let detectedAmount = null;

    // Regex patterns for Thai bank slips (Krungthai, KBank, SCB, BBL, TTB, GSB, PromptPay)
    const patterns = [
      // 1. "Amount 1.00 THB" or "Amount: 1.00 THB" or "Amount 1.00"
      /Amount\s*[:\s]*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i,
      // 2. "1.00 THB" or "1,000.00 THB" or "1.00THB" or "1.00 Baht"
      /([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:THB|BHT|Baht|บาท)/i,
      // 3. "จำนวนเงิน 1.00" / "ยอดเงิน 1.00" / "ยอดโอน 1.00"
      /(?:จำนวนเงิน|ยอดเงิน|ยอดโอน|จำนวนเงิน\s*\(บาท\))\s*[:\s]*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i,
      // 4. Standalone decimal amount line like "1.00" or "100.00"
      /^([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2}|[0-9]+\.[0-9]{2})$/
    ];

    for (const line of lines) {
      if (/Fee|ค่าธรรมเนียม/i.test(line) && !/Amount/i.test(line)) continue;
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const cleanNum = match[1].replace(/,/g, '');
          const val = parseFloat(cleanNum);
          if (!isNaN(val) && val > 0 && val < 1000000) {
            detectedAmount = val;
            break;
          }
        }
      }
      if (detectedAmount !== null) break;
    }

    // Secondary scan across full text if line scan didn't catch it
    if (detectedAmount === null) {
      const fullMatch = text.match(/Amount\s*[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i);
      if (fullMatch && fullMatch[1]) {
        const val = parseFloat(fullMatch[1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0) detectedAmount = val;
      }
    }

    return { detectedAmount, rawText: text };
  } catch (err) {
    console.error('OCR error:', err);
    return { detectedAmount: null, rawText: '' };
  }
}

module.exports = { extractAmountFromSlip };
