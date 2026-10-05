# Daengniem

แอปจัดการค่าเช่าหอพักแดงเนียม เชื่อม Supabase จริง

- Project: `jqjzkokarmfznwjoqhap`
- URL: `https://jqjzkokarmfznwjoqhap.supabase.co`
- คีย์ใน `src/lib/supabase-public.ts` เป็น publishable key เท่านั้น ห้ามใส่ service role

## สูตร

- ค่าห้อง 1,500 บาท
- ค่าขยะ 20 บาท
- ค่าไฟและค่าน้ำ = หน่วยที่ใช้ × เรตของอาคารนั้น
- ผู้เช่าคนเดียวหลายห้อง รวมได้ในบิลใบเดียว ต้องติ๊กห้องตอนเรียกเก็บ
- บิลเก่าไม่ถูกเขียนทับ

## หน้าสำคัญ

- `src/routes/billing.tsx` เรียกเก็บ
- `src/routes/invoices.tsx` รายการบิล แตะเพื่อเปิดรายละเอียด
- `src/routes/invoices.$invoiceId.tsx` ใบเสร็จ: ค่าห้อง ค่าไฟ ค่าน้ำ ค่าขยะ ยอดรวม, กดชำระแล้ว, เซฟเป็นรูป
- `supabase/migrations/20261005120000_daengniem.sql` โครงสร้างฐานข้อมูล
