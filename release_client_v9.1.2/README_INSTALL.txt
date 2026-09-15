===================================================================
      HEXSYNCTH WEB CONTROLLER & SERVER ORCHESTRATOR v9.1.2
                      By : HexSyncTH
===================================================================

[ วิธีการติดตั้งและเริ่มใช้งานบนเครื่องลูกค้า (Zero Setup) ]

1. ดับเบิ้ลคลิกไฟล์ 'INSTALL.bat' หรือ 'HexSyncTH_Control.exe'
2. ระบบจะสร้างทางลัด (Shortcut) บน Desktop ให้โดยอัตโนมัติ
3. หน้าต่าง Cyberpunk Control Panel v9.1.2 จะเปิดขึ้นมา
4. เข้าสู่ระบบด้วยรหัสผ่านแอดมิน:
   - Username: admin
   - Password: daimond33140
5. กดปุ่ม 'START ALL SERVICES' เพื่อเปิดระบบทั้งหมดในคลิกเดียว:
   - Backend API (Port 4000) [SQLite Engine]
   - Frontend Web (Port 5173)
   - Cloudflare Tunnel (hexsyncth.site)

[ ข้อมูลทางเทคนิค ]
- ฐานข้อมูล: SQLite (ไฟล์เก็บอยู่ที่ server/data/database.sqlite)
- ไม่จำเป็นต้องติดตั้ง Node.js หรือโปรแกรมเสริมใดๆ (มี portable binary พร้อมในโฟลเดอร์ bin)
- มีระบบ Anti-Debugger, Anti-Tamper และ Brute-Force lockout ป้องกันการแฮก
===================================================================
