// เรียก Backend RESTful API ของโปรเจกต์ (server/ Express + Prisma) ที่เดียวทั้งแอป
// ตอน dev Vite proxy /api ไปที่ http://localhost:3000 (ดู vite.config.ts) ถ้า deploy แยกโดเมนให้ตั้ง VITE_API_URL
import axios from 'axios'
import { statusOf } from '../lib/httpError'
import { clearSession, getToken, type AuthUser } from '../store/authStore'
import type {
  Company,
  GameDetail,
  GameInput,
  GameSummary,
  GamesParams,
  Genre,
  NamedInput,
  Paginated,
  Platform,
  PriceEntry,
  Screenshot,
} from '../types/api'
import type { LibraryEntry, PlayStatus, WishlistEntry } from '../types/collection'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
})

// แนบ token ของผู้ใช้ที่ล็อกอินไปกับทุก request
client.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

// token หมดอายุหรือถูกลบ (401) ให้ออกจากระบบฝั่งหน้าเว็บด้วย
client.interceptors.response.use(undefined, (error: unknown) => {
  if (statusOf(error) === 401 && getToken()) clearSession()
  return Promise.reject(error)
})

// ---------- ผู้ใช้ ----------

export interface AuthResult {
  token: string
  user: AuthUser
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const { data } = await client.post<AuthResult>('/auth/login', { email, password })
  return data
}

export async function register(email: string, password: string, name: string): Promise<AuthResult> {
  const { data } = await client.post<AuthResult>('/auth/register', { email, password, name })
  return data
}

export async function logout(): Promise<void> {
  await client.post('/auth/logout')
}

const clean = (params: GamesParams): Partial<GamesParams> =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined))

// ---------- เกม ----------

/** GET /games รองรับ page, page_size, search, genres, parent_platforms, ordering */
export async function getGames(params: GamesParams = {}): Promise<Paginated<GameSummary>> {
  const { data } = await client.get<Paginated<GameSummary>>('/games', { params: clean(params) })
  return data
}

export async function getGame(id: number | string): Promise<GameDetail> {
  const { data } = await client.get<GameDetail>(`/games/${id}`)
  return data
}

export async function getScreenshots(id: number | string): Promise<Screenshot[]> {
  const { data } = await client.get<Screenshot[]>(`/games/${id}/screenshots`)
  return data
}

export async function createGame(input: GameInput): Promise<GameDetail> {
  const { data } = await client.post<GameDetail>('/games', input)
  return data
}

export async function updateGame(id: number, input: Partial<GameInput>): Promise<GameDetail> {
  const { data } = await client.put<GameDetail>(`/games/${id}`, input)
  return data
}

export async function deleteGame(id: number): Promise<void> {
  await client.delete(`/games/${id}`)
}

// ---------- แนวเกม / แพลตฟอร์ม / บริษัท ----------

export type LookupKind = 'genres' | 'platforms' | 'companies'

export async function getGenres(): Promise<Genre[]> {
  const { data } = await client.get<Genre[]>('/genres')
  return data
}

export async function getPlatforms(): Promise<Platform[]> {
  const { data } = await client.get<Platform[]>('/platforms')
  return data
}

export async function getCompanies(): Promise<Company[]> {
  const { data } = await client.get<Company[]>('/companies')
  return data
}

export async function createLookup(kind: LookupKind, input: NamedInput): Promise<void> {
  await client.post(`/${kind}`, input)
}

export async function updateLookup(kind: LookupKind, id: number, input: NamedInput): Promise<void> {
  await client.put(`/${kind}/${id}`, input)
}

export async function deleteLookup(kind: LookupKind, id: number): Promise<void> {
  await client.delete(`/${kind}/${id}`)
}

// ---------- ราคา ----------

export async function getPrices(): Promise<PriceEntry[]> {
  const { data } = await client.get<PriceEntry[]>('/prices')
  return data
}

// ---------- คอลเลกชัน ----------

export async function getWishlist(): Promise<WishlistEntry[]> {
  const { data } = await client.get<WishlistEntry[]>('/wishlist')
  return data
}

export async function addToWishlist(gameId: number): Promise<WishlistEntry> {
  const { data } = await client.post<WishlistEntry>('/wishlist', { gameId })
  return data
}

export async function removeFromWishlist(gameId: number): Promise<void> {
  await client.delete(`/wishlist/${gameId}`)
}

export async function getLibrary(): Promise<LibraryEntry[]> {
  const { data } = await client.get<LibraryEntry[]>('/library')
  return data
}

/** "ซื้อ" เกม: Backend เพิ่มเข้าคลังและเอาออกจาก Wishlist ใน transaction เดียว */
export async function buyGame(gameId: number): Promise<LibraryEntry> {
  const { data } = await client.post<LibraryEntry>('/library', { gameId })
  return data
}

export async function updateLibraryItem(
  gameId: number,
  patch: { status?: PlayStatus; myRating?: number },
): Promise<LibraryEntry> {
  const { data } = await client.patch<LibraryEntry>(`/library/${gameId}`, patch)
  return data
}

export async function removeFromLibrary(gameId: number): Promise<void> {
  await client.delete(`/library/${gameId}`)
}

// ---------- ข้อความ error ----------

/** ข้อความ error จาก Backend ({ error: "..." }) ถ้ามี */
function serverMessage(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) return undefined
  const body: unknown = error.response?.data
  if (typeof body === 'object' && body !== null && typeof (body as Record<string, unknown>).error === 'string') {
    return (body as Record<string, string>).error
  }
  return undefined
}

export function errorText(error: unknown): string {
  const status = statusOf(error)
  if (status === 401) return serverMessage(error) ?? 'กรุณาเข้าสู่ระบบ'
  if (status === 404) return serverMessage(error) ?? 'ไม่พบข้อมูลที่ต้องการ'
  if (status && status >= 400 && status < 500) return serverMessage(error) ?? 'ข้อมูลไม่ถูกต้อง'
  if (status && status >= 500) return 'เซิร์ฟเวอร์ขัดข้อง ลองใหม่อีกครั้ง'
  return 'เชื่อมต่อ Backend API ไม่ได้ ตรวจสอบว่าเปิดเซิร์ฟเวอร์แล้ว (npm run dev)'
}

// ---------- แจ้งเตือนเกมใน Wishlist ลดราคา (SNS อีเมล) ----------

export type AlertStatus = 'none' | 'pending' | 'confirmed'
export interface AlertState {
  email: string
  status: AlertStatus
}

export async function getAlerts(): Promise<AlertState> {
  const { data } = await client.get<AlertState>('/alerts')
  return data
}

export async function subscribeAlerts(): Promise<AlertState> {
  const { data } = await client.post<AlertState>('/alerts')
  return data
}

export async function unsubscribeAlerts(): Promise<void> {
  await client.delete('/alerts')
}
