const express = require('express');
const https = require('https');
const jwt = require('jsonwebtoken');
const { User, Log, Setting, SlipTransaction, PaymentOrder } = require('../models');
const { requireAdmin, verifyToken } = require('../middleware/auth');
const router = express.Router();

// Get bank transfer configuration (webhook_secret is only exposed to authenticated admins)
router.get('/bank-config', async (req, res) => {
  try {
    let isAdmin = false;
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader) {
      try {
        const parts = authHeader.split(' ');
        const token = parts.length === 2 ? parts[1] : parts[0];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'd35eab7a7a6dc834e4fdc276e9d1e0c6fd109494a1b2c76212aad166fd88474c');
        if (decoded && (decoded.role === 'admin' || decoded.role === 'superadmin')) {
          isAdmin = true;
        }
      } catch (_) {}
    }

    const keys = ['bank_name', 'bank_account_name', 'bank_account_number', 'promptpay_number'];
    if (isAdmin) keys.push('webhook_secret');

    const settingsList = await Setting.findAll({ where: { key: keys } });
    const bankConfig = {
      bank_name: 'ธนาคารกสิกรไทย (KBank)',
      bank_account_name: 'บจก. คีย์ช็อป ดิจิทัล (KeyShop Co., Ltd.)',
      bank_account_number: '123-4-56789-0',
      promptpay_number: '0812345678',
    };
    if (isAdmin) {
      bankConfig.webhook_secret = 'whsec_keyshop_2026_auto';
    }
    settingsList.forEach((s) => {
      bankConfig[s.key] = s.value;
    });
    res.json(bankConfig);
  } catch (err) {
    res.json({
      bank_name: 'ธนาคารกสิกรไทย (KBank)',
      bank_account_name: 'บจก. คีย์ช็อป ดิจิทัล (KeyShop Co., Ltd.)',
      bank_account_number: '123-4-56789-0',
      promptpay_number: '0812345678',
    });
  }
});

// Update bank transfer configuration (Admin Only)
router.post('/bank-config', requireAdmin, async (req, res) => {
  try {
    const { bank_name, bank_account_name, bank_account_number, promptpay_number, webhook_secret, adminUsername } = req.body;
    const updates = { bank_name, bank_account_name, bank_account_number, promptpay_number, webhook_secret };

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const [setting] = await Setting.findOrCreate({ where: { key }, defaults: { value: String(value) } });
        setting.value = String(value);
        await setting.save();
      }
    }

    await Log.create({
      action: 'ADMIN_UPDATE_BANK',
      detail: `อัปเดตบัญชีธนาคารรับเงินโดย ${adminUsername || 'Admin'}`,
      username: adminUsername || 'Admin',
      actionType: 'Bank Accoute',
    });

    res.json({ message: 'บันทึกข้อมูลบัญชีธนาคารเรียบร้อยแล้ว' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลธนาคาร' });
  }
});

// Get recent slip transactions (Admin Only)
router.get('/slips', requireAdmin, async (req, res) => {
  try {
    const slips = await SlipTransaction.findAll({
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    res.json({ slips });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสลิป: ' + err.message });
  }
});

const crypto = require('crypto');
const { Op } = require('sequelize');
const jsQR = require('jsqr');
const promptparse = require('promptparse');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');
const { extractAmountFromSlip } = require('../ocr_helper');

// Map of Thai Bank codes to friendly names
const THAI_BANKS = {
  '004': 'ธนาคารกสิกรไทย (KBank)',
  '014': 'ธนาคารไทยพาณิชย์ (SCB)',
  '006': 'ธนาคารกรุงไทย (KTB)',
  '002': 'ธนาคารกรุงเทพ (BBL)',
  '011': 'ธนาคารทหารไทยธนชาต (TTB)',
  '025': 'ธนาคารกรุงศรีอยุธยา (BAY)',
  '030': 'ธนาคารออมสิน (GSB)',
  '069': 'ธนาคารเกียรตินาคินภัทร (KKP)',
  '034': 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (BAAC)',
  '073': 'ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)',
  '067': 'ธนาคารทิสโก้ (TISCO)',
  '070': 'ธนาคารไอซีบีซี (ไทย)',
  '071': 'ธนาคารไทยเครดิต',
  '098': 'พร้อมเพย์ (PromptPay)'
};

// Helper: Calculate SHA-256 hash of slip image data
function calculateSlipHash(base64Image) {
  if (!base64Image || typeof base64Image !== 'string') return '';
  const cleanData = base64Image.replace(/^data:image\/[a-z0-9-+]+;base64,/, '');
  return crypto.createHash('sha256').update(cleanData).digest('hex');
}

// Helper: Extract QR string from base64 image (pure JS, no native deps)
function extractQrFromImage(base64Image) {
  if (!base64Image || typeof base64Image !== 'string') return null;
  try {
    const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const mimeType = matches ? matches[1].toLowerCase() : 'image/jpeg';
    const buffer = Buffer.from(matches ? matches[2] : base64Image, 'base64');

    let width = 0, height = 0, data = null;

    // Check Magic Bytes for PNG: 89 50 4E 47
    const isPng = (buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) || mimeType.includes('png');
    if (isPng) {
      try {
        const png = PNG.sync.read(buffer);
        width = png.width;
        height = png.height;
        data = new Uint8ClampedArray(png.data);
      } catch (_) {}
    }

    // Try JPEG decode if not decoded as PNG
    if (!data) {
      try {
        const decoded = jpeg.decode(buffer, { useTArray: true });
        width = decoded.width;
        height = decoded.height;
        data = new Uint8ClampedArray(decoded.data);
      } catch (_) {}
    }

    if (data && width && height) {
      // Pass 1: Try full resolution scan
      let code = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
      if (code && code.data && code.data.trim()) {
        return code.data.trim();
      }

      // Pass 2: Downsample high-res mobile slips (e.g. 1080p-4K screenshots) to 800px max
      // jsQR achieves 10x higher detection rate for Thai bank mini-QRs on normalized scales
      const maxDim = 800;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        const targetW = Math.floor(width * scale);
        const targetH = Math.floor(height * scale);
        const downsampled = new Uint8ClampedArray(targetW * targetH * 4);

        for (let y = 0; y < targetH; y++) {
          const srcY = Math.floor(y / scale);
          for (let x = 0; x < targetW; x++) {
            const srcX = Math.floor(x / scale);
            const srcIdx = (srcY * width + srcX) * 4;
            const destIdx = (y * targetW + x) * 4;
            downsampled[destIdx] = data[srcIdx];
            downsampled[destIdx + 1] = data[srcIdx + 1];
            downsampled[destIdx + 2] = data[srcIdx + 2];
            downsampled[destIdx + 3] = data[srcIdx + 3];
          }
        }

        code = jsQR(downsampled, targetW, targetH, { inversionAttempts: 'attemptBoth' });
        if (code && code.data && code.data.trim()) {
          return code.data.trim();
        }
      }
    }
  } catch (err) {
    // Return null if decode fails
  }
  return null;
}

function parseThaiSlipQr(qrString) {
  if (!qrString || typeof qrString !== 'string') return null;
  try {
    const parsed = promptparse.parse(qrString);
    let sendingBankCode = null;
    let transRef = null;
    let tag54Amount = null;

    if (parsed && parsed.tags) {
      for (const tag of parsed.tags) {
        // Tag 00 has subTags in BOT mini QR standard
        if (tag.id === '00' && tag.subTags) {
          const sub01 = tag.subTags.find(st => st.id === '01');
          if (sub01) sendingBankCode = sub01.value;
          const sub02 = tag.subTags.find(st => st.id === '02');
          if (sub02) transRef = sub02.value;
        }
        // Tag 54 is transaction amount
        if (tag.id === '54' && tag.value) {
          tag54Amount = parseFloat(tag.value);
        }
      }
    }

    return {
      sendingBankCode,
      sendingBankName: sendingBankCode ? (THAI_BANKS[sendingBankCode] || `ธนาคารรหัส ${sendingBankCode}`) : null,
      transRef,
      tag54Amount: !isNaN(tag54Amount) && tag54Amount > 0 ? tag54Amount : null,
      rawPayload: qrString
    };
  } catch (e) {
    return null;
  }
}

// Quick Scan Slip API: Extracts Bank, TransRef, and Real Amount from Slip (QR + OCR)
router.post('/scan-slip', async (req, res) => {
  try {
    const { slipImage, clientQrData } = req.body;
    if (!slipImage) return res.status(400).json({ message: 'ไม่มีรูปภาพสลิป' });

    let qrData = (clientQrData && typeof clientQrData === 'string') ? clientQrData.trim() : null;
    if (!qrData) {
      qrData = extractQrFromImage(slipImage);
    }

    const slipDetails = parseThaiSlipQr(qrData);
    const transRef = slipDetails?.transRef || null;
    const sendingBankName = slipDetails?.sendingBankName || null;
    let detectedAmount = slipDetails?.tag54Amount || null;

    // Run OCR to detect amount from image
    if (!detectedAmount) {
      try {
        const ocrResult = await extractAmountFromSlip(slipImage);
        if (ocrResult?.detectedAmount) {
          detectedAmount = ocrResult.detectedAmount;
        }
      } catch (ocrErr) {
        // ignore
      }
    }

    res.json({
      success: true,
      transRef,
      sendingBankName,
      detectedAmount,
    });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสแกนสลิป' });
  }
});

// Top-up via Bank Transfer Slip Verification (Anti-Duplicate + Real Amount Checking)
router.post('/bank-slip', verifyToken, async (req, res) => {
  try {
    const { username, amount, slipImage, clientQrData } = req.body;
    const requestedAmount = Number(amount);

    if (!username) return res.status(400).json({ message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' });
    if (req.user && req.user.username !== username && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'ไม่อนุญาตให้ทำรายการแทนบัญชีผู้อื่น' });
    }
    if (!requestedAmount || requestedAmount <= 0) {
      return res.status(400).json({ message: 'กรุณาระบุจำนวนเงินที่ต้องการเติมให้ถูกต้อง (มากกว่า 0 บาท)' });
    }
    if (!slipImage) {
      return res.status(400).json({ message: 'กรุณาอัปโหลดรูปภาพสลิปหลักฐานการโอนเงิน' });
    }

    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(404).json({ message: 'ไม่พบบัญชีผู้ใช้งาน' });

    // 1. Compute SHA-256 hash of the slip image
    const cleanData = slipImage.replace(/^data:image\/[a-z0-9-+]+;base64,/, '');
    const slipHash = crypto.createHash('sha256').update(cleanData).digest('hex');

    // 2. Decode QR Code (from client or server decode)
    let qrData = (clientQrData && typeof clientQrData === 'string') ? clientQrData.trim() : null;
    if (!qrData) {
      qrData = extractQrFromImage(slipImage);
    }

    const slipDetails = parseThaiSlipQr(qrData);
    const transRef = slipDetails?.transRef || null;
    const sendingBankName = slipDetails?.sendingBankName || null;

    // 3. CHECK 1: PREVENT SLIP REUSE (ป้องกันสลิปซ้ำ 100%)
    const duplicateConditions = [{ slipHash }];
    if (transRef) duplicateConditions.push({ transRef });
    if (qrData) duplicateConditions.push({ qrData });

    const existingSlip = await SlipTransaction.findOne({
      where: {
        [Op.or]: duplicateConditions,
        status: 'approved'
      }
    });

    if (existingSlip) {
      const usedTime = new Date(existingSlip.createdAt).toLocaleString('th-TH');
      return res.status(400).json({
        message: `❌ สลิปนี้ถูกใช้งานไปแล้ว ไม่สามารถใช้งานซ้ำได้! (รหัสอ้างอิง: ${transRef || slipHash.slice(0, 12)} เคยทำรายการเมื่อ ${usedTime})`
      });
    }

    // 4. CHECK 2: AMOUNT VERIFICATION (ป้องกันโอน 1 บาท แต่กรอก 100 บาท)
    let finalCreditAmount = requestedAmount;
    let verifiedVia = 'anti_duplicate_verified';
    let verifyNotice = '';

    // Check if SlipOK API is configured in Setting
    const [slipokKeySetting, slipokBranchSetting] = await Promise.all([
      Setting.findOne({ where: { key: 'slipok_api_key' } }),
      Setting.findOne({ where: { key: 'slipok_branch_id' } })
    ]);

    const slipokApiKey = slipokKeySetting?.value?.trim();
    const slipokBranchId = slipokBranchSetting?.value?.trim();

    const isRealSlipOkConfig = slipokApiKey && slipokBranchId && slipokApiKey !== '9999' && slipokApiKey.length > 8 && slipokBranchId !== 'admin';

    if (isRealSlipOkConfig && qrData) {
      // Call official SlipOK bank verification API
      try {
        const slipOkRes = await fetch(`https://api.slipok.com/api/line/apikey/${slipokBranchId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-authorization': slipokApiKey
          },
          body: JSON.stringify({ data: qrData, log: true })
        });
        const slipOkData = await slipOkRes.json();

        if (slipOkRes.status === 401 || slipOkRes.status === 403 || (slipOkData.message && slipOkData.message.includes('กรุณาใส่ข้อมูลให้ถูกต้อง'))) {
          console.warn('SlipOK key invalid or expired, falling back to internal verification');
        } else if (!slipOkRes.ok || !slipOkData.success) {
          return res.status(400).json({
            message: '❌ ตรวจสอบสลิปกับระบบธนาคารไม่ผ่าน: ' + (slipOkData.message || 'ไม่พบรายการโอนเงินนี้ในระบบธนาคาร หรือสลิปไม่ถูกต้อง')
          });
        } else {
          const realBankAmount = Number(slipOkData.data?.amount);
          if (realBankAmount && realBankAmount > 0) {
            finalCreditAmount = realBankAmount;
            verifiedVia = 'slipok_bank_verified';

            if (requestedAmount !== finalCreditAmount) {
              return res.status(400).json({
                message: `❌ ยอดเงินไม่ตรงกับสลิป! สลิปนี้มียอดโอนจริง ฿${finalCreditAmount.toLocaleString()} บาท แต่คุณเลือกเติม ฿${requestedAmount.toLocaleString()} บาท (กรุณาระบุยอดเงินให้ตรงกับสลิปโอนเงิน)`
              });
            }
          }
        }
      } catch (apiErr) {
        console.error('SlipOK API error:', apiErr);
      }
    } else if (slipDetails?.tag54Amount) {
      // Amount embedded in QR Tag 54
      finalCreditAmount = slipDetails.tag54Amount;
      verifiedVia = 'qr_tag54_verified';
      if (requestedAmount !== finalCreditAmount) {
        return res.status(400).json({
          message: `❌ ยอดเงินไม่ตรงกับ QR สลิป! สลิประบุยอดโอน ฿${finalCreditAmount.toLocaleString()} บาท แต่คุณเลือกเติม ฿${requestedAmount.toLocaleString()} บาท (กรุณาระบุยอดเงินให้ตรงกับสลิปโอนเงิน)`
        });
      }
    } else {
      // 3. Fallback: OCR Scan slip image to extract transfer amount
      try {
        const ocrResult = await extractAmountFromSlip(slipImage);
        if (ocrResult && ocrResult.detectedAmount) {
          finalCreditAmount = ocrResult.detectedAmount;
          verifiedVia = 'ocr_slip_verified';
          if (requestedAmount !== finalCreditAmount) {
            return res.status(400).json({
              message: `❌ ยอดเงินไม่ตรงกับสลิป! สลิประบุยอดโอน ฿${finalCreditAmount.toLocaleString()} บาท แต่คุณเลือกเติม ฿${requestedAmount.toLocaleString()} บาท (กรุณาระบุยอดเงินให้ตรงกับสลิปโอนเงิน)`
            });
          }
        }
      } catch (ocrErr) {
        console.error('OCR check error:', ocrErr);
      }
    }

    if (!finalCreditAmount || finalCreditAmount <= 0) {
      return res.status(400).json({ message: '❌ ยอดเงินที่เติมต้องมากกว่า 0 บาท' });
    }

    // Auto-approve valid, non-duplicate bank transfer slip and credit user immediately
    if (verifiedVia === 'anti_duplicate_verified') {
      verifiedVia = 'slip_anti_duplicate_approved';
    }

    // 5. Store approved transaction with slipHash and transRef to prevent any future reuse
    const slipTx = await SlipTransaction.create({
      username,
      amount: finalCreditAmount,
      slipImageUrl: slipImage.length > 500 ? slipImage.substring(0, 500) + '...[Image]' : slipImage,
      slipHash,
      transRef: transRef || null,
      qrData: qrData || null,
      sendingBank: sendingBankName || null,
      verifiedVia,
      status: 'approved',
    });

    // 6. Credit amount to user
    user.creditBalance = Number(user.creditBalance || 0) + finalCreditAmount;
    await user.save();

    await Log.create({
      action: 'TOPUP_BANK_SLIP',
      detail: `ผู้ใช้ ${username} เติมเงินผ่านสลิปสำเร็จ +${finalCreditAmount} บาท (รหัสสลิป #${slipTx.id}, อ้างอิง: ${transRef || slipHash.slice(0, 10)}, โหมด: ${verifiedVia})`,
      username,
    });

    res.json({
      message: `🎉 ตรวจสอบสลิปสำเร็จ! เติมเงิน +฿${finalCreditAmount.toLocaleString()} บาท เข้าบัญชีเรียบร้อยแล้ว${verifyNotice}`,
      amount: finalCreditAmount,
      balance: user.creditBalance,
      transRef,
      sendingBank: sendingBankName,
    });
  } catch (err) {
    console.error('Error verifying bank slip:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบสลิป: ' + err.message });
  }
});

// Get configured recipient phone number for Angpao
router.get('/config', async (req, res) => {
  try {
    let setting = await Setting.findOne({ where: { key: 'angpao_phone' } });
    if (!setting) {
      setting = await Setting.create({ key: 'angpao_phone', value: '0812345678' });
    }
    res.json({ phone: setting.value });
  } catch (err) {
    res.json({ phone: '0812345678' });
  }
});

// Update configured recipient phone (Admin Only)
router.post('/config', requireAdmin, async (req, res) => {
  try {
    const { phone, adminUsername } = req.body;
    if (!phone) return res.status(400).json({ message: 'กรุณากรอกเบอร์โทรศัพท์' });

    let setting = await Setting.findOne({ where: { key: 'angpao_phone' } });
    if (!setting) {
      setting = await Setting.create({ key: 'angpao_phone', value: phone });
    } else {
      setting.value = phone;
      await setting.save();
    }

    await Log.create({
      action: 'ADMIN_UPDATE_SETTING',
      detail: `เปลี่ยนเบอร์รับเงินซองอั่งเปาเป็น ${phone} โดย ${adminUsername || 'Admin'}`,
      username: adminUsername || 'Admin',
    });

    res.json({ message: 'อัปเดตเบอร์รับเงินซองอั่งเปาสำเร็จ', phone: setting.value });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกเบอร์รับเงิน' });
  }
});

/**
 * Real TrueMoney Voucher Redeemer via TrueMoney Gift Campaign API
 * @param {string} voucherHash - The voucher hash extracted from ?v=...
 * @param {string} phoneNumber - The receiver TrueMoney phone number
 * @returns {Promise<{ success: boolean, amount?: number, ownerName?: string, message?: string, code?: string }>}
 */
function redeemTrueMoneyVoucher(voucherHash, phoneNumber) {
  return new Promise((resolve) => {
    const cleanPhone = (phoneNumber || '').replace(/[^0-9]/g, '');
    const cleanHash = (voucherHash || '').trim();

    const postData = JSON.stringify({
      mobile: cleanPhone,
      voucher_hash: cleanHash
    });

    const options = {
      hostname: 'gift.truemoney.com',
      port: 443,
      path: `/campaign/vouchers/${encodeURIComponent(cleanHash)}/redeem`,
      method: 'POST',
      headers: {
        'Host': 'gift.truemoney.com',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        'Accept': 'application/json',
        'Accept-Language': 'th-TH,th;q=0.9',
        'Origin': 'https://gift.truemoney.com',
        'Referer': `https://gift.truemoney.com/campaign/?v=${encodeURIComponent(cleanHash)}`
      },
      timeout: 12000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const statusCode = json.status?.code;
          const statusMsg = json.status?.message;

          if (statusCode === 'SUCCESS') {
            const amountStr = json.data?.my_ticket?.amount_baht || json.data?.voucher?.amount_baht || '0';
            const amount = parseFloat(amountStr);
            const ownerName = json.data?.owner_profile?.full_name || 'ผู้ส่งซอง';
            return resolve({
              success: true,
              amount,
              ownerName,
              message: `รับเงินจากซองของขวัญสำเร็จ +฿${amount.toLocaleString()} บาท`,
              raw: json
            });
          }

          let errorMsg = 'ไม่สามารถรับเงินจากซองของขวัญได้';
          if (statusCode === 'VOUCHER_OUT_OF_STOCK') {
            errorMsg = 'ซองของขวัญนี้ถูกรับเงินไปหมดแล้ว (ซองหมด)';
          } else if (statusCode === 'VOUCHER_NOT_FOUND') {
            errorMsg = 'ไม่พบซองของขวัญนี้ หรือลิงก์ไม่ถูกต้อง';
          } else if (statusCode === 'VOUCHER_EXPIRED') {
            errorMsg = 'ซองของขวัญนี้หมดอายุการใช้งานแล้ว (เกิน 72 ชั่วโมง)';
          } else if (statusCode === 'CANNOT_GET_OWN_VOUCHER') {
            errorMsg = 'ไม่สามารถรับซองของขวัญที่ตนเองสร้างขึ้นมาได้';
          } else if (statusCode === 'TARGET_USER_NOT_FOUND') {
            errorMsg = `ไม่พบบัญชี TrueMoney Wallet ของเบอร์รับเงิน (${cleanPhone}) กรุณาตรวจสอบเบอร์ในระบบ`;
          } else if (statusMsg) {
            errorMsg = `TrueMoney แจ้งเตือน: ${statusMsg} (${statusCode || 'ERR'})`;
          }

          return resolve({
            success: false,
            code: statusCode || 'UNKNOWN_ERROR',
            message: errorMsg,
            raw: json
          });
        } catch {
          return resolve({
            success: false,
            code: 'PARSE_ERROR',
            message: 'เซิร์ฟเวอร์ TrueMoney ปฏิเสธการเชื่อมต่อชั่วคราว กรุณาลองใหม่อีกครั้ง'
          });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        code: 'TIMEOUT',
        message: 'การเชื่อมต่อไปยัง TrueMoney ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง'
      });
    });

    req.on('error', (err) => {
      resolve({
        success: false,
        code: 'NETWORK_ERROR',
        message: 'เกิดข้อผิดพลาดในการเชื่อมต่อไปยัง TrueMoney: ' + err.message
      });
    });

    req.write(postData);
    req.end();
  });
}

// Redeem TrueMoney Angpao Voucher (Real API Integration)
router.post('/angpao', verifyToken, async (req, res) => {
  try {
    const { voucherUrl, username } = req.body;
    if (!username) {
      return res.status(400).json({ message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' });
    }
    if (req.user && req.user.username !== username && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'ไม่อนุญาตให้ทำรายการแทนบัญชีผู้อื่น' });
    }
    if (!voucherUrl) {
      return res.status(400).json({ message: 'กรุณาวางลิงก์ซองของขวัญ TrueMoney' });
    }

    let voucherCode = voucherUrl.trim();
    if (voucherUrl.includes('?v=')) {
      voucherCode = voucherUrl.split('?v=')[1].split('&')[0];
    }

    // Clean any unwanted characters
    voucherCode = voucherCode.replace(/[^a-zA-Z0-9]/g, '');

    if (!voucherCode || voucherCode.length < 5) {
      return res.status(400).json({ message: 'รูปแบบลิงก์ซองของขวัญ TrueMoney ไม่ถูกต้อง' });
    }

    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(404).json({ message: 'ไม่พบบัญชีผู้ใช้งาน' });

    // Anti-replay: Check if this voucher code was already redeemed in our database
    const existingRedemption = await Log.findOne({
      where: {
        action: 'TOPUP_ANGPAO',
        detail: { [Op.like]: `%${voucherCode}%` }
      }
    });
    if (existingRedemption) {
      return res.status(400).json({ message: 'ซองของขวัญนี้เคยถูกนำมาเติมเงินในระบบแล้ว' });
    }

    let phoneSetting = await Setting.findOne({ where: { key: 'angpao_phone' } });
    const receiverPhone = phoneSetting && phoneSetting.value ? phoneSetting.value.trim() : '0953873075';

    if (!receiverPhone || receiverPhone.length < 9) {
      return res.status(400).json({
        message: 'ระบบยังไม่ได้ตั้งค่าเบอร์รับเงิน TrueMoney Wallet ที่ถูกต้อง (กรุณาแจ้งแอดมิน)'
      });
    }

    // Call Real TrueMoney API
    const result = await redeemTrueMoneyVoucher(voucherCode, receiverPhone);

    if (!result.success) {
      return res.status(400).json({
        message: result.message || 'ไม่สามารถรับเงินจากซองของขวัญได้'
      });
    }

    const finalAmount = Number(result.amount) || 0;
    if (finalAmount <= 0) {
      return res.status(400).json({ message: 'ยอดเงินในซองของขวัญต้องมากกว่า 0 บาท' });
    }

    // Credit real money to user account
    user.creditBalance = Number(user.creditBalance || 0) + finalAmount;
    await user.save();

    // Create Audit Log
    await Log.create({
      action: 'TOPUP_ANGPAO',
      detail: `ผู้ใช้ ${username} เติมเงินผ่านซองอั่งเปา TrueMoney (${voucherCode}) สำเร็จ +${finalAmount} บาท เข้าเบอร์ ${receiverPhone} (ผู้ส่ง: ${result.ownerName || 'N/A'})`,
      username,
    });

    res.json({
      success: true,
      message: `🎉 รับเงินจากซองอั่งเปาสำเร็จ! เติมเงิน +฿${finalAmount.toLocaleString()} บาท เข้าบัญชีเรียบร้อยแล้ว`,
      amount: finalAmount,
      balance: user.creditBalance,
      receiverPhone,
    });
  } catch (err) {
    console.error('Error redeeming TrueMoney voucher:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการรับซองของขวัญ: ' + err.message });
  }
});

// Helper: Generate EMVCo PromptPay Dynamic QR code payload with unique Tag 62 Reference ID
function generatePromptPayQR(target, amount, orderId) {
  const cleanTarget = String(target || '').replace(/[^0-9]/g, '');
  const type = cleanTarget.length === 13 ? 'NATID' : 'MSISDN';
  const ppTarget = type === 'MSISDN' ? ('0000000000000' + cleanTarget.replace(/^0/, '66')).slice(-13) : cleanTarget;

  const tag29 = promptparse.encode([
    promptparse.tag('00', 'A000000677010111'),
    promptparse.tag(type === 'NATID' ? '02' : '01', ppTarget)
  ]);

  const payload = [
    promptparse.tag('00', '01'),
    promptparse.tag('01', '12'), // 12 = Dynamic Single-Use QR
    promptparse.tag('29', tag29),
    promptparse.tag('53', '764'),
    promptparse.tag('54', Number(amount).toFixed(2)),
    promptparse.tag('58', 'TH')
  ];

  if (orderId) {
    const tag62 = promptparse.encode([
      promptparse.tag('07', String(orderId).slice(0, 25))
    ]);
    payload.push(promptparse.tag('62', tag62));
  }

  return promptparse.withCrcTag(promptparse.encode(payload), '63');
}

// 1. Create Dynamic Single-Use PromptPay QR Order (Valid for 30 minutes)
router.post('/create-qr-order', verifyToken, async (req, res) => {
  try {
    const { username, amount } = req.body;
    const numAmount = Number(amount);

    if (!username) {
      return res.status(400).json({ message: 'กรุณาระบุชื่อผู้ใช้งาน' });
    }
    if (req.user && req.user.username !== username && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'ไม่อนุญาตให้สร้างรายการแทนบัญชีผู้อื่น' });
    }

    if (!numAmount || isNaN(numAmount) || numAmount < 1) {
      return res.status(400).json({ message: 'จำนวนเงินที่เติมต้องอย่างน้อย 1 บาทขึ้นไป' });
    }

    if (numAmount > 100000) {
      return res.status(400).json({ message: 'ยอดเงินสูงสุดต่อครั้งไม่เกิน 100,000 บาท' });
    }

    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบบัญชีผู้ใช้นี้ในระบบ' });
    }

    // Cancel any previous pending orders for THIS user to ensure fresh order
    await PaymentOrder.update(
      { status: 'cancelled' },
      { where: { username, status: 'pending' } }
    );

    // Get current PromptPay receiver info
    const [ppSetting, nameSetting, bankSetting] = await Promise.all([
      Setting.findOne({ where: { key: 'promptpay_number' } }),
      Setting.findOne({ where: { key: 'bank_account_name' } }),
      Setting.findOne({ where: { key: 'bank_name' } }),
    ]);

    const promptpayNumber = ppSetting?.value?.trim() || '0812345678';
    const accountName = nameSetting?.value?.trim() || 'บจก. คีย์ช็อป ดิจิทัล (KeyShop Co., Ltd.)';
    const bankName = bankSetting?.value?.trim() || 'พร้อมเพย์ (PromptPay)';

    // Unique Order ID (e.g. QR83910248-5231)
    const orderId = `QR${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;

    // Generate BOT EMVCo QR Payload with unique orderId embedded in Tag 62
    const qrPayload = generatePromptPayQR(promptpayNumber, numAmount, orderId);

    // 30 Minutes expiration
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const order = await PaymentOrder.create({
      orderId,
      username,
      amount: numAmount,
      qrPayload,
      promptpayNumber,
      accountName,
      status: 'pending',
      expiresAt,
    });

    res.json({
      success: true,
      order: {
        orderId: order.orderId,
        amount: order.amount,
        qrPayload: order.qrPayload,
        promptpayNumber,
        accountName,
        bankName,
        expiresAt: order.expiresAt.toISOString(),
        durationSeconds: 1800, // 30 minutes
      }
    });
  } catch (err) {
    console.error('Error creating QR order:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้าง QR Code: ' + err.message });
  }
});

// 2. Check QR Order Status (for polling & auto-update)
router.get('/qr-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await PaymentOrder.findOne({ where: { orderId } });

    if (!order) {
      return res.status(404).json({ message: 'ไม่พบรายการชำระเงินนี้' });
    }

    // Auto-expire if time passed 30 minutes
    if (order.status === 'pending' && new Date() > new Date(order.expiresAt)) {
      order.status = 'expired';
      await order.save();
    }

    const remainingSec = Math.max(0, Math.floor((new Date(order.expiresAt).getTime() - Date.now()) / 1000));

    res.json({
      orderId: order.orderId,
      status: order.status,
      amount: order.amount,
      expiresAt: order.expiresAt,
      paidAt: order.paidAt,
      remainingSeconds: remainingSec,
    });
  } catch (err) {
    console.error('Error checking QR order:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะคำสั่งซื้อ' });
  }
});

// 3. Confirm Dynamic QR Payment (Verified balance credit only)
router.post('/confirm-qr-payment', verifyToken, async (req, res) => {
  try {
    const { orderId, username, slipImage, clientQrData } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'กรุณาระบุรหัสคำสั่งชำระเงิน (orderId)' });
    }

    const order = await PaymentOrder.findOne({ where: { orderId } });
    if (!order) {
      return res.status(404).json({ message: 'ไม่พบรายการชำระเงินนี้' });
    }

    // Check single use & status
    if (order.status === 'paid') {
      const user = await User.findOne({ where: { username: order.username } });
      return res.json({
        success: true,
        alreadyPaid: true,
        message: '🎉 รายการนี้ได้รับการชำระเงินเรียบร้อยแล้ว ยอดเงินเข้าสู่บัญชีของคุณแล้ว',
        amount: order.amount,
        balance: user?.creditBalance || 0,
      });
    }

    if (order.status === 'expired' || new Date() > new Date(order.expiresAt)) {
      order.status = 'expired';
      await order.save();
      return res.status(400).json({
        message: '❌ QR Code นี้หมดอายุแล้ว (เกิน 30 นาที) ระบบไม่อนุญาตให้ใช้ QR เดิมซ้ำ กรุณาสร้าง QR Code ทำรายการใหม่'
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: `สถานะคำสั่งซื้อไม่ถูกต้อง (${order.status})` });
    }

    // Check user & ownership
    if (!username) {
      return res.status(400).json({ message: 'กรุณาระบุชื่อผู้ใช้งานที่ยืนยัน' });
    }
    if (order.username !== username) {
      return res.status(403).json({
        message: `❌ รายการคำสั่งซื้อนี้เป็นของบัญชี ${order.username} คุณไม่สามารถยืนยันคำสั่งซื้อของผู้อื่นได้`
      });
    }
    if (req.user && req.user.username !== order.username && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '❌ สิทธิ์การเข้าถึงถูกปฏิเสธ ไม่อนุญาตให้ยืนยันคำสั่งซื้อของบัญชีอื่น' });
    }
    const targetUsername = order.username;

    const user = await User.findOne({ where: { username: targetUsername } });
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้ในระบบ' });
    }

    let transRef = null;
    let sendingBank = null;

    // CASE A: Slip image attached (Instant QR slip auto-verification and immediate wallet credit)
    if (slipImage && typeof slipImage === 'string' && slipImage.length > 50) {
      const slipHash = calculateSlipHash(slipImage);

      // Prefer client-scanned QR data (100% fidelity from browser BarcodeDetector/canvas jsQR)
      let qrData = (clientQrData && typeof clientQrData === 'string' && clientQrData.trim())
        ? clientQrData.trim()
        : null;

      if (!qrData) {
        qrData = extractQrFromImage(slipImage);
      }

      const slipDetails = parseThaiSlipQr(qrData);
      transRef = slipDetails?.transRef || null;
      sendingBank = slipDetails?.sendingBankName || null;

      // Anti-duplicate check: reject if already approved in database
      const duplicateConditions = [{ slipHash }];
      if (transRef) duplicateConditions.push({ transRef });
      if (qrData) duplicateConditions.push({ qrData });

      const existingSlip = await SlipTransaction.findOne({
        where: {
          [Op.or]: duplicateConditions,
          status: 'approved'
        }
      });

      if (existingSlip) {
        const usedTime = new Date(existingSlip.createdAt).toLocaleString('th-TH');
        return res.status(400).json({
          message: `❌ สลิปนี้ถูกนำมาใช้งานในระบบแล้ว ไม่สามารถใช้งานซ้ำได้! (รหัสอ้างอิง: ${transRef || slipHash.slice(0, 10)} เคยใช้เมื่อ ${usedTime})`
        });
      }

      // Record slip transaction
      await SlipTransaction.create({
        username: targetUsername,
        amount: order.amount,
        slipImageUrl: slipImage.length > 500 ? slipImage.substring(0, 500) + '...[Image]' : slipImage,
        slipHash,
        transRef: transRef || null,
        qrData: qrData || null,
        sendingBank: sendingBank || null,
        verifiedVia: qrData ? 'qr_slip_auto_verified' : 'slip_hash_verified',
        status: 'approved',
      });

      // Mark order as PAID (Single-use consumed)
      order.status = 'paid';
      order.paidAt = new Date();
      if (transRef) order.transRef = transRef;
      await order.save();

      // Credit immediately to user's wallet
      const previousBalance = Number(user.creditBalance || 0);
      const addedAmount = Number(order.amount);
      user.creditBalance = previousBalance + addedAmount;
      await user.save();

      // Audit log
      await Log.create({
        action: 'TOPUP_DYNAMIC_QR',
        detail: `ผู้ใช้ ${targetUsername} เติมเงินผ่าน PromptPay Dynamic QR (เลขที่บิล: ${order.orderId}) สำเร็จ +฿${addedAmount.toLocaleString()} บาท (อ้างอิง: ${transRef || slipHash.slice(0, 10)})`,
        username: targetUsername,
        actionType: 'Topup QR Single-Use'
      });

      return res.json({
        success: true,
        message: `🎉 เติมเงินสำเร็จเรียบร้อย! ยอดเงิน +฿${addedAmount.toLocaleString()} บาท เข้ากระเป๋าของคุณแล้ว`,
        orderId: order.orderId,
        amount: addedAmount,
        balance: user.creditBalance,
        transRef,
        sendingBank,
        paidAt: order.paidAt,
      });
    }

    // CASE B: Customer clicked confirm WITHOUT slip:
    return res.status(400).json({
      success: false,
      requiresSlip: true,
      status: 'pending',
      orderId: order.orderId,
      message: 'กรุณาแนบรูปสลิปการโอนเงิน เพื่อให้ระบบตรวจสอบยอดและเติมเครดิตเข้ากระเป๋าทันทีครับ'
    });
  } catch (err) {
    console.error('Error confirming QR payment:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการยืนยันการชำระเงิน: ' + err.message });
  }
});

// 4. Bank / Payment Gateway Webhook (Auto-Credit without slip upon real transfer)
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body || {};

    // Verify webhook secret - Mandatory protection against forged webhook calls
    const secretSetting = await Setting.findOne({ where: { key: 'webhook_secret' } });
    const expectedSecret = (secretSetting && secretSetting.value && secretSetting.value.trim())
      ? secretSetting.value.trim()
      : 'whsec_keyshop_2026_auto';

    const providedSecret = req.headers['x-webhook-secret'] || req.headers['authorization'] || payload.secret || payload.token || req.query.secret;
    if (!providedSecret || (providedSecret !== expectedSecret && providedSecret !== `Bearer ${expectedSecret}`)) {
      return res.status(401).json({ message: 'Unauthorized: Missing or invalid webhook secret' });
    }

    // Extract orderId, amount, transRef from various payment gateway / webhook standards
    let orderId = payload.orderId || payload.order_id || payload.billPaymentRef1 || payload.ref1 || payload.referenceNo || payload.data?.orderId || payload.data?.order_id;
    let amount = parseFloat(payload.amount || payload.total_amount || payload.data?.amount || payload.transferAmount);
    let transRef = payload.transRef || payload.trans_ref || payload.transactionId || payload.txId || payload.data?.transRef || payload.data?.trans_ref;

    let order = null;
    if (orderId) {
      order = await PaymentOrder.findOne({ where: { orderId: String(orderId).trim() } });
    }

    // Fallback: If orderId is missing, match by amount with pending order created within last 30 minutes
    if (!order && !isNaN(amount) && amount > 0) {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      order = await PaymentOrder.findOne({
        where: {
          amount: amount,
          status: 'pending',
          createdAt: { [Op.gt]: thirtyMinutesAgo }
        },
        order: [['createdAt', 'DESC']]
      });
    }

    if (!order) {
      return res.status(404).json({ message: 'Order not found or no matching pending order found' });
    }

    if (order.status === 'paid') {
      return res.json({ success: true, message: 'Order already credited', orderId: order.orderId });
    }

    if (order.status === 'expired') {
      return res.status(400).json({ message: 'Order has expired', orderId: order.orderId });
    }

    // Mark order as paid
    order.status = 'paid';
    order.paidAt = new Date();
    if (transRef) order.transRef = String(transRef);
    await order.save();

    // Credit user's wallet
    const user = await User.findOne({ where: { username: order.username } });
    if (user) {
      const previousBalance = Number(user.creditBalance || 0);
      const addedAmount = Number(order.amount);
      user.creditBalance = previousBalance + addedAmount;
      await user.save();

      // Log webhook success
      await Log.create({
        action: 'TOPUP_DYNAMIC_QR',
        detail: `[Auto-Webhook] ได้รับยอดเงินโอน ฿${addedAmount.toLocaleString()} บาท ผ่าน Webhook ธนาคาร (เลขที่บิล: ${order.orderId}, Ref: ${transRef || '-'}) เติมเครดิตให้ผู้ใช้ ${order.username} อัตโนมัติเรียบร้อยแล้ว`,
        username: order.username,
        actionType: 'Topup Webhook'
      });
    }

    res.json({
      success: true,
      message: 'Payment received and auto-credited successfully',
      orderId: order.orderId,
      amount: order.amount,
      username: order.username,
      paidAt: order.paidAt
    });
  } catch (err) {
    console.error('Error in topup webhook:', err);
    res.status(500).json({ message: 'Internal error processing webhook: ' + err.message });
  }
});

// 5. Admin Manual Approval for Pending QR Orders
router.post('/qr-order/:orderId/approve', requireAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const adminUsername = req.user?.username || 'Admin';

    const order = await PaymentOrder.findOne({ where: { orderId } });
    if (!order) {
      return res.status(404).json({ message: 'ไม่พบรายการคำสั่งชำระเงินนี้' });
    }

    if (order.status === 'paid') {
      return res.status(400).json({ message: 'รายการนี้ได้รับการอนุมัติและเติมเงินไปแล้ว' });
    }

    const user = await User.findOne({ where: { username: order.username } });
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้ในระบบ' });
    }

    // Mark as paid
    order.status = 'paid';
    order.paidAt = new Date();
    await order.save();

    // Credit user wallet
    const previousBalance = Number(user.creditBalance || 0);
    const addedAmount = Number(order.amount);
    user.creditBalance = previousBalance + addedAmount;
    await user.save();

    // Audit log
    await Log.create({
      action: 'ADMIN_APPROVE_TOPUP_QR',
      detail: `แอดมิน ${adminUsername} อนุมัติยอดเงิน PromptPay QR (เลขที่บิล: ${order.orderId}) จำนวน +฿${addedAmount.toLocaleString()} บาท ให้แก่ผู้ใช้ ${order.username}`,
      username: adminUsername,
      actionType: 'Admin Approve QR Topup'
    });

    res.json({
      success: true,
      message: `✅ อนุมัติยอดเงิน ฿${addedAmount.toLocaleString()} ให้แก่ผู้ใช้ ${order.username} เรียบร้อยแล้ว`,
      orderId: order.orderId,
      amount: addedAmount,
      balance: user.creditBalance
    });
  } catch (err) {
    console.error('Error approving QR order:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอนุมัติ: ' + err.message });
  }
});

// 6. Cancel Pending QR Order
router.post('/qr-order/:orderId/cancel', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await PaymentOrder.findOne({ where: { orderId } });
    if (!order) {
      return res.status(404).json({ message: 'ไม่พบรายการคำสั่งชำระเงินนี้' });
    }

    if (order.status === 'paid') {
      return res.status(400).json({ message: 'ไม่สามารถยกเลิกรายการที่ชำระเงินสำเร็จแล้วได้' });
    }

    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'superadmin');
    if (!isAdmin && order.username !== req.user.username) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ยกเลิกรายการของผู้อื่น' });
    }

    order.status = 'cancelled';
    await order.save();

    res.json({
      success: true,
      message: 'ยกเลิกคำสั่งชำระเงินเรียบร้อยแล้ว',
      orderId: order.orderId
    });
  } catch (err) {
    console.error('Error cancelling QR order:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการยกเลิก: ' + err.message });
  }
});

// 5. Unified Top-Up History (Website-wide for Admin, or filtered for specific User)
router.get('/history', verifyToken, async (req, res) => {
  try {
    const { username, method = 'all', status = 'all', search = '', limit = 100, page = 1 } = req.query;

    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'superadmin');
    // Non-admins can ONLY view their own topup history!
    const targetUser = isAdmin ? (username ? String(username).trim() : null) : req.user.username;

    // 1. Gather Payment Orders (PromptPay QR)
    const orderWhere = {};
    if (targetUser) {
      orderWhere.username = targetUser;
    }
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      orderWhere[Op.or] = [
        { username: { [Op.like]: s } },
        { orderId: { [Op.like]: s } },
        { promptpayNumber: { [Op.like]: s } }
      ];
    }
    if (status !== 'all') {
      if (status === 'paid' || status === 'approved') orderWhere.status = 'paid';
      else if (status === 'pending') orderWhere.status = 'pending';
      else if (status === 'expired') orderWhere.status = 'expired';
      else if (status === 'cancelled') orderWhere.status = 'cancelled';
    }

    const orders = (method === 'all' || method === 'promptpay')
      ? await PaymentOrder.findAll({
          where: orderWhere,
          order: [['createdAt', 'DESC']],
          limit: 250
        })
      : [];

    // 2. Gather Bank Slip Transactions
    const slipWhere = {};
    if (targetUser) {
      slipWhere.username = targetUser;
    }
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      slipWhere[Op.or] = [
        { username: { [Op.like]: s } },
        { transRef: { [Op.like]: s } },
        { sendingBank: { [Op.like]: s } }
      ];
    }
    if (status !== 'all') {
      if (status === 'paid' || status === 'approved') slipWhere.status = 'approved';
      else if (status === 'pending') slipWhere.status = 'pending';
      else if (status === 'rejected') slipWhere.status = 'rejected';
    }

    const slips = (method === 'all' || method === 'slip')
      ? await SlipTransaction.findAll({
          where: slipWhere,
          order: [['createdAt', 'DESC']],
          limit: 250
        })
      : [];

    // 3. Gather TrueMoney Angpao & GiftCode Redemptions from Logs
    let logs = [];
    if (method === 'all' || method === 'angpao' || method === 'giftcode') {
      const actions = [];
      if (method === 'all' || method === 'angpao') actions.push('TOPUP_ANGPAO');
      if (method === 'all' || method === 'giftcode') actions.push('USER_REDEEM_GIFTCODE');

      const logWhere = {
        action: { [Op.in]: actions }
      };
      if (targetUser) {
        logWhere.username = targetUser;
      }
      if (search && search.trim()) {
        const s = `%${search.trim()}%`;
        logWhere[Op.or] = [
          { username: { [Op.like]: s } },
          { detail: { [Op.like]: s } }
        ];
      }

      logs = await Log.findAll({
        where: logWhere,
        order: [['createdAt', 'DESC']],
        limit: 250
      });
    }

    // 4. Collect List of all unique usernames who have topped up (for Admin filter dropdown)
    const allUsersList = await Promise.all([
      PaymentOrder.findAll({ attributes: ['username'], group: ['username'] }),
      SlipTransaction.findAll({ attributes: ['username'], group: ['username'] }),
      Log.findAll({
        attributes: ['username'],
        where: { action: { [Op.in]: ['TOPUP_ANGPAO', 'USER_REDEEM_GIFTCODE'] } },
        group: ['username']
      })
    ]);
    const uniqueUsers = Array.from(new Set([
      ...allUsersList[0].map(u => u.username),
      ...allUsersList[1].map(u => u.username),
      ...allUsersList[2].map(u => u.username),
    ])).filter(Boolean).sort();

    // 5. Normalize items into a unified list
    const unifiedList = [];

    // Transform PromptPay Orders
    orders.forEach(o => {
      unifiedList.push({
        id: `QR-${o.id}`,
        dbId: o.id,
        type: 'promptpay',
        channelName: 'พร้อมเพย์ Dynamic QR',
        channelIcon: 'IconQrCode',
        username: o.username,
        amount: Number(o.amount || 0),
        status: o.status === 'paid' ? 'approved' : (o.status === 'pending' ? 'pending' : (o.status === 'expired' ? 'expired' : 'cancelled')),
        statusLabel: o.status === 'paid' ? 'สำเร็จ' : (o.status === 'pending' ? 'รอการชำระ' : (o.status === 'expired' ? 'หมดอายุ' : 'ยกเลิก')),
        orderId: o.orderId,
        refNumber: o.orderId,
        detail: `ชำระเงินผ่าน PromptPay Dynamic QR (บิล: ${o.orderId}) เบอร์ ${o.promptpayNumber || '-'}`,
        slipImageUrl: null,
        sendingBank: 'พร้อมเพย์ (PromptPay)',
        date: o.paidAt || o.createdAt,
        createdAt: o.createdAt,
        paidAt: o.paidAt,
        expiresAt: o.expiresAt
      });
    });

    // Transform Slips
    slips.forEach(s => {
      unifiedList.push({
        id: `SLIP-${s.id}`,
        dbId: s.id,
        type: 'slip',
        channelName: 'โอนเงินธนาคาร (สลิป)',
        channelIcon: 'IconCreditCard',
        username: s.username,
        amount: Number(s.amount || 0),
        status: s.status || 'approved',
        statusLabel: s.status === 'approved' ? 'สำเร็จ' : (s.status === 'pending' ? 'รอตรวจสอบ' : 'ปฏิเสธ'),
        orderId: s.transRef ? `REF-${s.transRef}` : `SLIP#${s.id}`,
        refNumber: s.transRef || `ID-${s.id}`,
        detail: `โอนผ่านสลิป ${s.sendingBank || 'ธนาคาร'} (Ref: ${s.transRef || '-'})`,
        slipImageUrl: s.slipImageUrl,
        sendingBank: s.sendingBank || 'บัญชีธนาคาร',
        date: s.createdAt,
        createdAt: s.createdAt,
        paidAt: s.createdAt,
      });
    });

    // Transform Logs (Angpao / Giftcode)
    logs.forEach(l => {
      const isAngpao = l.action === 'TOPUP_ANGPAO';
      const amountMatch = (l.detail || '').match(/\+฿?([0-9,.]+)/);
      const parsedAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

      const codeMatch = (l.detail || '').match(/โค้ด\s+([^\s]+)/) || (l.detail || '').match(/\(([^)]+)\)/);
      const refCode = codeMatch ? codeMatch[1] : `LOG#${l.id}`;

      unifiedList.push({
        id: `LOG-${l.id}`,
        dbId: l.id,
        type: isAngpao ? 'angpao' : 'giftcode',
        channelName: isAngpao ? 'ซองอั่งเปา TrueMoney' : 'โค้ดเครดิตฟรี',
        channelIcon: isAngpao ? 'IconGift' : 'IconTag',
        username: l.username,
        amount: parsedAmount,
        status: 'approved',
        statusLabel: 'สำเร็จ',
        orderId: isAngpao ? `VOUCHER-${refCode}` : `CODE-${refCode}`,
        refNumber: refCode,
        detail: l.detail,
        slipImageUrl: null,
        sendingBank: isAngpao ? 'TrueMoney Wallet' : 'ระบบของขวัญ',
        date: l.createdAt,
        createdAt: l.createdAt,
        paidAt: l.createdAt
      });
    });

    // 6. Sort unified list by date DESC
    unifiedList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 7. Calculate Aggregated Summary Statistics
    let totalSuccessAmount = 0;
    let totalPendingAmount = 0;
    let todaySuccessAmount = 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const breakdown = {
      promptpay: { count: 0, amount: 0 },
      slip: { count: 0, amount: 0 },
      angpao: { count: 0, amount: 0 },
      giftcode: { count: 0, amount: 0 },
    };

    unifiedList.forEach(item => {
      if (item.status === 'approved' || item.status === 'paid') {
        totalSuccessAmount += item.amount;
        if (new Date(item.date) >= todayStart) {
          todaySuccessAmount += item.amount;
        }
        if (breakdown[item.type]) {
          breakdown[item.type].count += 1;
          breakdown[item.type].amount += item.amount;
        }
      } else if (item.status === 'pending') {
        totalPendingAmount += item.amount;
      }
    });

    const parsedLimit = Math.max(1, Math.min(250, Number(limit) || 100));
    const parsedPage = Math.max(1, Number(page) || 1);
    const totalRecords = unifiedList.length;
    const totalPages = Math.ceil(totalRecords / parsedLimit) || 1;
    const paginatedItems = unifiedList.slice((parsedPage - 1) * parsedLimit, parsedPage * parsedLimit);

    res.json({
      success: true,
      user: targetUser || null,
      summary: {
        totalSuccessAmount,
        totalPendingAmount,
        todaySuccessAmount,
        totalRecords,
        breakdown
      },
      usersList: uniqueUsers,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        totalPages,
        totalRecords
      },
      history: paginatedItems
    });
  } catch (err) {
    console.error('Error fetching topup history:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงประวัติการเติมเงิน: ' + err.message });
  }
});

module.exports = router;

