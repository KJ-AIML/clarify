---
title: Thai labels
subtitle: Test-only fixture. Thai node labels and sequence participants must fit their boxes on every machine.
---

Lead: Thai text is set in the system's Thai face (Leelawadee UI on Windows, Thonburi on macOS), so its labels are checked in a browser.

## A แผนที่ระบบ {span=3}
```arch LR
[ผู้ใช้งาน:react] -> [เกตเวย์ชำระเงิน:cloudflare]: ส่งคำสั่งซื้อ
[เกตเวย์ชำระเงิน] -> [บริการคำสั่งซื้อ:go]: ตรวจสอบสิทธิ์
[บริการคำสั่งซื้อ] -> [(ฐานข้อมูลลูกค้า:postgres)]: บันทึก
[บริการคำสั่งซื้อ] { desc: รับคำสั่งซื้อและคิดราคา }
```

## B ลำดับการทำงาน {span=3}
```sequence
sequenceDiagram
  participant U as ผู้ใช้งาน
  participant S as บริการคำสั่งซื้อ
  participant D as ฐานข้อมูลลูกค้า
  U->>S: สั่งซื้อสินค้า
  S->>D: บันทึกคำสั่งซื้อ
  S-->>U: ยืนยันคำสั่งซื้อ
```
