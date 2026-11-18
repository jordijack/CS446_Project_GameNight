// Lambda gamenight-api: รับ event จาก API Gateway HTTP API แล้วส่งต่อให้ Express app
// ยกเว้น event {"seed": true} (หรือ "force") จากปุ่ม Test ในหน้า Lambda จะใส่ข้อมูลตัวอย่างลง DynamoDB
// event จาก API Gateway ไม่มี key "seed" ที่ระดับบนสุด คนภายนอกจึงสั่ง seed ผ่าน URL ไม่ได้
import serverless from 'serverless-http'
import { app } from './app'
import { seed } from './seed'

const http = serverless(app)

export const handler = async (event: unknown, context: unknown) => {
  if (event && typeof event === 'object' && 'seed' in event) {
    const message = await seed((event as { seed: unknown }).seed === 'force')
    console.log(message)
    return { message }
  }
  return http(event as never, context as never)
}
