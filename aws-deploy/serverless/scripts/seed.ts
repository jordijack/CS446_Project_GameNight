// ใส่ข้อมูลตัวอย่างจากเครื่อง (ต้องมี AWS credentials ของ Learner Lab): npm run seed [-- --force]
// ทางที่ง่ายกว่าคือกด Test ในหน้า Lambda gamenight-api ด้วย event {"seed": true}
import { seed } from '../src/seed'

seed(process.argv.includes('--force'))
  .then((msg) => console.log(msg))
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
