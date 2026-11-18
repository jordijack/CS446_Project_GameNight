// ใส่ข้อมูลตัวอย่างลง DynamoDB
// เรียกได้ 2 ทาง: กดปุ่ม Test ในหน้า Lambda gamenight-api ด้วย event {"seed": true} (ดู api.ts)
// หรือรันจากเครื่องด้วย scripts/seed.ts
// ข้ามทั้งหมดถ้าตาราง games มีข้อมูลแล้ว เว้นแต่ force = true
import { hashPassword } from './auth'
import { batchPut, putItem, scanAll, T, type CollectionDoc, type GameDoc, type Lookup, type UserDoc } from './db'
import { companies, games, genres, platforms, users } from './seed-data'

const SCREENSHOTS_PER_GAME = 4

export async function seed(force = false): Promise<string> {
  const existing = await scanAll<GameDoc>(T.games, { Limit: 1 })
  if (existing.length && !force) {
    return 'ตาราง games มีข้อมูลแล้ว ข้ามการ seed (ใช้ {"seed": "force"} หรือ --force เพื่อเขียนทับ)'
  }

  const lookups: Lookup[] = [
    ...genres.map((g) => ({ kind: 'genre' as const, ...g })),
    ...platforms.map((p) => ({ kind: 'platform' as const, ...p })),
    ...companies.map((c) => ({ kind: 'company' as const, ...c })),
  ]
  await batchPut(T.lookups, lookups)

  const now = new Date().toISOString()
  let shotId = 1
  const docs: GameDoc[] = games.map((g) => ({
    id: g.id,
    slug: g.slug,
    name: g.name,
    released: g.released,
    rating: g.rating,
    ratingsCount: g.ratingsCount,
    added: g.added,
    metacritic: g.metacritic,
    backgroundImage: `/covers/${g.slug}.svg`,
    description: g.description,
    website: '',
    genreIds: g.genres,
    platformIds: g.platforms,
    developerIds: g.developers,
    publisherIds: g.publishers,
    price: g.price,
    screenshots: Array.from({ length: SCREENSHOTS_PER_GAME }, (_, i) => ({
      id: shotId++,
      image: `/covers/${g.slug}-${i + 1}.svg`,
      width: 1200,
      height: 675,
    })),
    createdAt: now,
    updatedAt: now,
  }))
  await batchPut(T.games, docs)

  const collections: CollectionDoc[] = []
  const userDocs: UserDoc[] = users.map((u, i) => {
    const id = i + 1
    for (const gameId of u.wishlist) {
      collections.push({ userId: id, sk: `wishlist#${gameId}`, type: 'wishlist', gameId, email: u.email, addedAt: now })
    }
    for (const l of u.library) {
      collections.push({ userId: id, sk: `library#${l.gameId}`, type: 'library', email: u.email, addedAt: now, ...l })
    }
    return { email: u.email, id, name: u.name, passwordHash: hashPassword(u.password), createdAt: now }
  })
  await batchPut(T.users, userDocs)
  await batchPut(T.collections, collections)

  // เลข id ถัดไป ต่อจากค่าสูงสุดของข้อมูลตัวอย่าง
  const max = (xs: number[]) => Math.max(0, ...xs)
  for (const [name, value] of [
    ['game', max(games.map((g) => g.id))],
    ['genre', max(genres.map((g) => g.id))],
    ['platform', max(platforms.map((p) => p.id))],
    ['company', max(companies.map((c) => c.id))],
    ['user', userDocs.length],
  ] as const) {
    await putItem(T.counters, { name, value })
  }

  return `Seed เสร็จ: ${genres.length} แนวเกม, ${platforms.length} แพลตฟอร์ม, ${companies.length} บริษัท, ${docs.length} เกม, ${userDocs.length} ผู้ใช้`
}
