# 🎮 HexSyncTH Download Hub - ระบบดาวน์โหลด & เช็คสถานะเกม (Vercel Ready)

เว็บแอปพลิเคชันแจกไฟล์ดาวน์โหลด (Google Drive) พร้อมระบบเช็คสถานะเกม (`Undetected` / `Detected` / `Maintenance`) และระบบหลังบ้านควบคุมครบวงจร พร้อมระบบ Vercel Auto-Deploy

---

## 💻 คู่มือการใช้งานเมื่อย้ายไปทำต่อบนคอมพิวเตอร์เครื่องใหม่ (New Computer Setup)

หากคุณย้ายไปใช้คอมพิวเตอร์เครื่องใหม่ หรือต้องการดึงโค้ดลงมาพัฒนาต่อ ให้ทำตาม 4 ขั้นตอนนี้:

### ขั้นตอนที่ 1: ดึงโค้ดลงมาที่เครื่องใหม่ (Git Clone)
เปิด **Command Prompt** หรือ **Terminal** แล้วรันคำสั่ง:
```bash
git clone https://github.com/Daimond33140/HexSyncTH_download.git
```

### ขั้นตอนที่ 2: เข้าไปยังโฟลเดอร์โปรเจกต์
```bash
cd HexSyncTH_download
```

### ขั้นตอนที่ 3: ติดตั้ง Dependencies (ทำแค่ครั้งแรก)
```bash
npm install
```

### ขั้นตอนที่ 4: เปิดรัน Dev Server เพื่อแก้ไขงานในเครื่อง
```bash
npm run dev
```
- **หน้าแรกผู้ใช้**: [http://localhost:3000](http://localhost:3000)
- **หน้าหลังบ้าน Admin**: [http://localhost:3000/admin](http://localhost:3000/admin) *(รหัสผ่านเริ่มต้น: `admin1234`)*

---

## 🔄 วิธีอัปเดตโค้ดขึ้นเว็บจริง (Deploying Updates)

เมื่อคุณแก้ไขโค้ดบนคอมพิวเตอร์เสร็จแล้ว ต้องการส่งขึ้นเว็บจริง:

1. รันคำสั่ง 3 บรรทัดนี้ใน Terminal:
   ```bash
   git add .
   git commit -m "อัปเดตระบบและแก้ไขโค้ด"
   git push
   ```
2. **Vercel จะทำการอัปเดตหน้าเว็บจริงให้อัตโนมัติทันที (Auto-Deploy)** ภายใน 30 วินาที โดยที่คุณไม่ต้องเข้าไปกดอะไรบนเว็บ Vercel เลย!

---

## 🛠️ สรุประบบหลังบ้าน (Admin Dashboard)

- **ทางเข้าหลังบ้าน**: `/admin`
- **รหัสผ่านเข้าหลังบ้าน**: `admin1234`
- **ฟีเจอร์หลัก**:
  - 🟢/🔴 **Status Switcher**: สลับสถานะเกมเป็น `Undetected`, `Detected`, หรือ `Updating`
  - 🔒 **Download Switch**: เปิด/ปิด ปุ่มดาวน์โหลดรายเกม
  - ⚠️ **Global Maintenance**: ปุ่มสวิตช์ปิดปรับปรุงการดาวน์โหลดทั้งเว็บในคลิกเดียว
  - 📝 **Google Drive Link & Password Note**: แก้ไขลิงก์ Google Drive และรหัสแตกไฟล์ zip
