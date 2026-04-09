# วงแตก (Wong Taek) 🍻

เกมวงเหล้าสำหรับเพื่อนสนิท - เล่นบนมือถือหรือแท็บเล็ตเครื่องเดียวร่วมกัน

## Features

### สำหรับผู้เล่น

- **3 ระดับความเดือด**: ชิลล์ๆ 🧊, เริ่มเดือด 🍻, เดือดสุด 18+ 🔥
- **หลายโหมดเกม**: คำถาม, Truth or Dare, โหวต, โกลาหล
- **สุ่มคำถาม**: ไม่ซ้ำจนกว่าจะหมด pool
- **สุ่มผู้เล่น**: เปลี่ยนตาเล่นแบบ random ทุกรอบ
- **Timer**: นับถอยหลัง 30 วินาทีต่อรอบ
- **Settings**: เปิด/ปิด 18+ mode, เสียง, vibration

### Admin Panel

- **Dashboard**: ดูสถิติคำถามทั้งหมด
- **จัดการคำถาม**: เพิ่ม/แก้ไข/ลบ คำถาม
- **Filter**: กรองตามประเภท, ระดับ, 18+
- **Responsive**: ใช้งานได้ทั้ง Desktop และ Tablet

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + Custom CSS
- **Animation**: Framer Motion
- **State**: Zustand
- **Database**: Prisma + PostgreSQL (optional)
- **Icons**: Google Material Symbols

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

เปิด [http://localhost:3000](http://localhost:3000) เพื่อเริ่มเล่น

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── admin/           # Admin panel
│   │   ├── page.tsx     # Dashboard
│   │   └── questions/   # Question management
│   ├── game/            # Game pages
│   │   ├── modes/       # Mode selection
│   │   └── play/        # Gameplay
│   ├── lobby/           # Player setup
│   ├── settings/        # App settings
│   └── page.tsx         # Welcome page
├── components/          # Reusable UI components
│   └── ui/              # Button, Timer, GlassPanel, etc.
├── store/               # Zustand store
└── styles/              # Global CSS
```

## Environment Variables

```env
DATABASE_PUBLIC_URL="postgresql://postgres:password@host:5432/railway"
DATABASE_URL="postgresql://postgres:password@postgres.railway.internal:5432/railway"
JWT_SECRET="replace-with-a-long-random-secret"
ADMIN_JWT_SECRET="replace-with-a-long-random-secret"
ROOM_JWT_SECRET="replace-with-a-long-random-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
ALLOWED_ORIGINS="http://localhost:3000"
NEXT_PUBLIC_TURNSTILE_SITE_KEY=""
TURNSTILE_SECRET_KEY=""
```

## Security Notes

- ตั้งค่า `JWT_SECRET`, `ADMIN_JWT_SECRET`, และ `ROOM_JWT_SECRET` เป็นค่าสุ่มจริงก่อน deploy
- ถ้าเปิดใช้ Cloudflare Turnstile ให้ใส่ทั้ง `NEXT_PUBLIC_TURNSTILE_SITE_KEY` และ `TURNSTILE_SECRET_KEY`
- ตั้งค่า `NEXT_PUBLIC_APP_URL` และ Turnstile hostname ให้ตรงกับโดเมนที่ใช้จริง เพราะฝั่ง server ตรวจทั้ง action และ hostname
- ใน codebase นี้ Cloudflare ถูกใช้ระดับ Turnstile/CSP เท่านั้น ส่วน DNS, WAF, CDN, Pages, Workers, หรือ R2 ต้องตั้งค่าที่ Cloudflare dashboard แยกจาก repo
- อย่าใช้ `ADMIN_SEED_PASSWORD="change-me-please"` หรือ credential เริ่มต้นใน production

## Screenshots

### Welcome Page

เลือกระดับความเดือดก่อนเริ่มเกม

![Welcome Page](docs/screenshots/home.png)

### Game Modes

เลือกโหมดเกมที่ต้องการ: คำถาม, โหวต, Truth or Dare, โกลาหล

![Game Modes](docs/screenshots/modes.png)

### Game Play

คำถามแบบ random พร้อม timer และปุ่ม ข้าม/ตอบแล้ว

![Gameplay](docs/screenshots/gameplay.png)

### Admin Dashboard

จัดการคำถามทั้งหมดผ่าน web interface

![Admin Dashboard](docs/screenshots/admin.png)

## License

MIT License - ใช้งานได้ฟรี

---

**ดื่มอย่างรับผิดชอบ** 🍺
