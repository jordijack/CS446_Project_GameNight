import type { ReactNode } from 'react'

const TECH = ['React', 'Vite', 'React Router', 'Tailwind CSS', 'daisyUI', 'Zustand', 'TanStack Query', 'Express', 'AWS Lambda', 'DynamoDB', 'API Gateway', 'Amplify', 'Zod', 'Figma']

const PAGES = [
  ['Store', 'ค้นหา กรองตามแนวและแพลตฟอร์ม เรียงลำดับ และแบ่งหน้า'],
  ['รายละเอียดเกม', 'แกลเลอรีภาพ ข้อมูลเกม เรตติ้ง ราคา และเกมแนวเดียวกัน'],
  ['Collection', 'Wishlist และคลังเกม ตั้งสถานะการเล่นและให้คะแนนได้'],
  ['Game Picker', 'สุ่มเกมตามแนว แพลตฟอร์ม และเรตติ้งขั้นต่ำ'],
  ['Admin', 'เพิ่ม แก้ไข ลบ เกม ราคา แนวเกม แพลตฟอร์ม และบริษัท (CRUD ผ่าน Backend API)'],
]

interface TeamMember {
  fullName: string
  nickname: string | null
  studentId: string
  photo: string
  roles: string[]
}

// รูปถ่ายอยู่ใน public/team (ย่อขนาดจากไฟล์ต้นฉบับในโฟลเดอร์ image)
const TEAM: TeamMember[] = [
  {
    fullName: 'ธนาธรย์ เพียงไพรชม',
    nickname: 'ฟร้อง',
    studentId: '1660705961',
    photo: '/team/tanathon.jpg',
    roles: ['ทำสไลด์นำเสนอ', 'เขียนโค้ด'],
  },
  {
    fullName: 'ปัณณวิชญ์ ปิจิธรรม',
    nickname: 'แจ๊ค',
    studentId: '1660706365',
    photo: '/team/pannavit.jpg',
    roles: ['ทำสไลด์นำเสนอ', 'เขียนโค้ด'],
  },
]

export default function About() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10 sm:px-8 sm:py-14">
      <section className="flex max-w-3xl flex-col gap-3">
        <p className="text-[13px] font-semibold tracking-wider text-primary">ABOUT</p>
        <h1 className="font-display text-4xl font-semibold leading-tight text-white sm:text-5xl">เกี่ยวกับ Game Night</h1>
        <p className="text-lg leading-8 text-sub">
          Game Night คือเว็บแอปร้านค้าเกมแนว Steam สำหรับค้นหาเกม ดูรายละเอียด และจัดการคอลเลกชันส่วนตัว พัฒนาเป็นโครงงานในรายวิชา
          โดยดึงข้อมูลเกมจริงจาก Public REST API
        </p>
      </section>

      <div className="grid gap-5 md:grid-cols-3">
        <Card title="วัตถุประสงค์">
          <ul className="list-disc space-y-1.5 pl-5 leading-7 text-sub">
            <li>ดึงข้อมูลเกมจริงจาก REST API มาแสดงแบบ SPA</li>
            <li>ค้นหาและกรองเกมได้สะดวกในหน้าเดียว</li>
            <li>จัดการ Wishlist และคลังเกมส่วนตัว</li>
          </ul>
        </Card>
        <Card title="เทคโนโลยีที่ใช้">
          <div className="flex flex-wrap gap-2">
            {TECH.map((t) => (
              <span key={t} className="badge badge-lg border-0 bg-base-300 text-chip">
                {t}
              </span>
            ))}
          </div>
        </Card>
        <Card title="แหล่งข้อมูล">
          <ul className="list-disc space-y-1.5 pl-5 leading-7 text-sub">
            <li>Backend RESTful API ที่พัฒนาเอง (Express 5 บน AWS Lambda ผ่าน API Gateway)</li>
            <li>Amazon DynamoDB เก็บเกม แนวเกม แพลตฟอร์ม บริษัท ราคา และคอลเลกชัน</li>
            <li>ข้อมูลตัวอย่างใส่ด้วย serverless/scripts/seed.ts</li>
          </ul>
        </Card>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-semibold text-white">หน้าต่าง ๆ ในเว็บ</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          {PAGES.map(([name, desc]) => (
            <div key={name} className="rounded-xl border border-base-300 px-5 py-4">
              <dt className="font-semibold text-white">{name}</dt>
              <dd className="mt-1 text-sm leading-6 text-sub">{desc}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="team-title" className="flex flex-col gap-4">
        <h2 id="team-title" className="font-display text-2xl font-semibold text-white">
          สมาชิกในทีม
        </h2>
        <ul className="grid gap-5 sm:grid-cols-2">
          {TEAM.map((m) => (
            <li key={m.studentId} className="card flex-row flex-wrap items-start gap-5 bg-base-200 p-5">
              <figure className="aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-xl bg-slate sm:w-32">
                <img src={m.photo} alt={`รูปถ่ายของ${m.fullName}`} loading="lazy" className="h-full w-full object-cover" />
              </figure>
              <div className="flex min-w-[180px] flex-1 flex-col gap-3">
                <h3 className="font-display text-xl font-semibold text-white">{m.fullName}</h3>
                <dl className="grid grid-cols-[96px_1fr] gap-y-1.5 text-sm">
                  <dt className="text-muted">ชื่อเล่น</dt>
                  <dd className="text-white">{m.nickname ?? '–'}</dd>
                  <dt className="text-muted">รหัสนักศึกษา</dt>
                  <dd className="text-white">{m.studentId}</dd>
                  <dt className="text-muted">หน้าที่</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {m.roles.map((r) => (
                      <span key={r} className="badge border-0 bg-base-300 text-chip">
                        {r}
                      </span>
                    ))}
                  </dd>
                </dl>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="card bg-base-200">
    <div className="card-body gap-3 p-6">
      <h2 className="font-display text-xl font-medium text-white">{title}</h2>
      {children}
    </div>
  </section>
)
