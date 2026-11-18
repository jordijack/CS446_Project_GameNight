import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { useGameList, usePrices } from '../hooks/queries'
import { priceFor } from '../services/priceApi'
import { STATUS, isPlayStatus, useCollection } from '../store/collectionStore'
import { useUser } from '../store/authStore'
import type { LibraryEntry, PlayStatus, WishlistEntry } from '../types/collection'
import { baht, formatDate, genreText } from '../utils/format'
import { CartIcon, TrashIcon } from '../components/Icons'
import { EmptyState, GameCover, InlineError, LinkButton, PriceTag, StarRating, btn, selectCls } from '../components/ui'
import type { GameDetail, PriceMap } from '../types/api'
import * as api from '../services/api'
import { toast } from '../store/toastStore'

type GameQuery = UseQueryResult<GameDetail>
type StatusFilter = 'all' | PlayStatus

/** คอลเลกชันเป็นของแต่ละบัญชี ต้องเข้าสู่ระบบก่อน */
export default function Collection() {
  const user = useUser()
  if (user) return <CollectionContent />
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <EmptyState
        title="เข้าสู่ระบบเพื่อดูคอลเลกชันของคุณ"
        actions={
          <>
            <LinkButton to="/login?next=/collection">เข้าสู่ระบบ</LinkButton>
            <LinkButton to="/login?mode=register&next=/collection" variant="ghost">
              สมัครสมาชิก
            </LinkButton>
          </>
        }
      >
        Wishlist และคลังเกมผูกกับบัญชีของคุณ เข้าสู่ระบบด้วยอีเมลแล้วข้อมูลจะตามไปทุกเครื่อง
      </EmptyState>
    </div>
  )
}

function CollectionContent() {
  const user = useUser()
  const [sp, setSp] = useSearchParams()
  const tab = sp.get('tab') === 'library' ? 'library' : 'wishlist'
  const [filter, setFilter] = useState<StatusFilter>('all')
  const { wishlist, library, buy, removeFromWishlist, removeFromLibrary, setStatus, setRating } = useCollection()

  // Zustand เก็บแค่ ID ข้อมูลเกมดึงผ่าน TanStack Query (ใช้ cache ร่วมกับหน้ารายละเอียดเกม)
  const prices = usePrices()
  const wishQ = useGameList(wishlist.map((g) => g.id))
  const libQ = useGameList(library.map((g) => g.id))

  const wishLoading = !prices || wishQ.some((q) => q.isPending)
  const wishTotal = wishQ.reduce((sum, q) => {
    const p = priceFor(q.data, prices)
    return sum + (p && !p.free ? p.final : 0)
  }, 0)

  const libRows = library.map((entry, i) => ({ entry, query: libQ[i] }))
  const shownLibrary = filter === 'all' ? libRows : libRows.filter((r) => r.entry.status === filter)
  const countOf = (s: PlayStatus) => library.filter((g) => g.status === s).length
  const filters: [StatusFilter, string, number][] = [
    ['all', 'ทั้งหมด', library.length],
    ...(Object.entries(STATUS) as [PlayStatus, string][]).map(([k, v]): [StatusFilter, string, number] => [k, v, countOf(k)]),
  ]

  const tabs = [
    { key: 'wishlist', label: 'Wishlist', count: wishlist.length },
    { key: 'library', label: 'Library', count: library.length },
  ] as const

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-white sm:text-4xl">คอลเลกชันของฉัน</h1>
          <p className="mt-1 text-muted">
            เกมที่อยากได้และเกมในคลังของ <span className="text-sub">{user?.name || user?.email}</span> บันทึกไว้ในบัญชีของคุณ
          </p>
        </div>
        <dl className="stats overflow-x-auto bg-base-200">
          <Stat label="Wishlist" value={`${wishlist.length} เกม`} />
          <Stat label="Library" value={`${library.length} เกม`} />
          <Stat
            label="มูลค่า Wishlist"
            value={wishLoading && wishlist.length > 0 ? <span className="skeleton inline-block h-6 w-20 align-middle" aria-label="กำลังคำนวณ" /> : baht(wishTotal)}
          />
        </dl>
      </div>

      <div role="tablist" aria-label="ประเภทคอลเลกชัน" className="tabs tabs-border">
        {tabs.map((t) => {
          const on = t.key === tab
          return (
            <button
              key={t.key}
              id={`tab-${t.key}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`panel-${t.key}`}
              onClick={() => setSp(t.key === 'library' ? { tab: 'library' } : {})}
              className={`tab gap-1.5 px-5 ${on ? 'tab-active font-semibold text-white' : 'text-muted'}`}
            >
              {t.label} <span className="text-sm text-muted">({t.count})</span>
            </button>
          )
        })}
      </div>

      {tab === 'wishlist' ? (
        <section id="panel-wishlist" role="tabpanel" aria-labelledby="tab-wishlist" className="flex flex-col gap-4">
          <DealAlerts />
          {wishlist.length === 0 ? (
            <EmptyState
              title="ยังไม่มีเกมใน Wishlist"
              actions={
                <>
                  <LinkButton to="/">ไปเลือกเกมใน Store</LinkButton>
                  <LinkButton to="/picker" variant="ghost">
                    ลองสุ่มเกม
                  </LinkButton>
                </>
              }
            >
              กดรูปหัวใจบนการ์ดเกม หรือปุ่ม Wishlist ในหน้ารายละเอียด เพื่อเก็บเกมที่อยากได้ไว้ที่นี่
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {wishlist.map((entry, i) => (
                <WishlistRow
                  key={entry.id}
                  entry={entry}
                  query={wishQ[i]}
                  prices={prices}
                  onBuy={(game) => buy(game)}
                  onRemove={() => removeFromWishlist(entry.id)}
                />
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section id="panel-library" role="tabpanel" aria-labelledby="tab-library" className="flex flex-col gap-4">
          {library.length === 0 ? (
            <EmptyState title="คลังเกมยังว่างอยู่" actions={<LinkButton to="/">ไปเลือกเกมใน Store</LinkButton>}>
              เกมที่กดซื้อ (จำลอง) จะมาอยู่ที่นี่ ตั้งสถานะการเล่นและให้คะแนนเกมได้
            </EmptyState>
          ) : (
            <>
              <div role="group" aria-label="กรองตามสถานะ" className="flex flex-wrap gap-2">
                {filters.map(([k, label, n]) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={filter === k}
                    onClick={() => setFilter(k)}
                    className={`btn h-10 min-h-10 rounded-full px-4 text-sm font-normal ${filter === k ? 'btn-primary font-semibold' : 'text-chip'}`}
                  >
                    {label} ({n})
                  </button>
                ))}
              </div>
              {shownLibrary.length === 0 ? (
                <p className="py-8 text-center text-muted">ไม่มีเกมในสถานะนี้</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {shownLibrary.map(({ entry, query }) => (
                    <LibraryRow
                      key={entry.id}
                      entry={entry}
                      query={query}
                      onStatus={(s) => setStatus(entry.id, s)}
                      onRating={(n) => setRating(entry.id, n)}
                      onRemove={() => removeFromLibrary(entry.id)}
                    />
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      )}
    </div>
  )
}

interface WishlistRowProps {
  entry: WishlistEntry
  query: GameQuery | undefined
  prices: PriceMap | null
  onBuy: (game: GameDetail) => void
  onRemove: () => void
}

function WishlistRow({ entry, query, prices, onBuy, onRemove }: WishlistRowProps) {
  const game = query?.data
  return (
    <li className="flex flex-wrap items-center gap-4 rounded-xl bg-base-200 p-3 sm:flex-nowrap">
      <Thumb id={entry.id} game={game} loading={!!query?.isPending} />
      <div className="min-w-0 flex-1">
        <GameInfo id={entry.id} query={query} />
        <p className="text-xs text-muted">เพิ่มเมื่อ {formatDate(entry.addedAt)}</p>
      </div>
      <div className="min-w-24 text-lg sm:text-right">{game ? <PriceTag price={priceFor(game, prices)} compact /> : null}</div>
      <div className="flex gap-2">
        <button type="button" onClick={() => game && onBuy(game)} disabled={!game} className={btn.buy}>
          <CartIcon className="h-5 w-5" /> ย้ายเข้าคลัง
        </button>
        <IconDelete label={`ลบ ${game?.name ?? `เกม #${entry.id}`} ออกจาก Wishlist`} onClick={onRemove} />
      </div>
    </li>
  )
}

interface LibraryRowProps {
  entry: LibraryEntry
  query: GameQuery | undefined
  onStatus: (status: PlayStatus) => void
  onRating: (rating: number) => void
  onRemove: () => void
}

function LibraryRow({ entry, query, onStatus, onRating, onRemove }: LibraryRowProps) {
  const name = query?.data?.name ?? `เกม #${entry.id}`
  return (
    <li className="flex flex-wrap items-center gap-4 rounded-xl bg-base-200 p-3 sm:flex-nowrap">
      <Thumb id={entry.id} game={query?.data} loading={!!query?.isPending} />
      <div className="min-w-0 flex-1">
        <GameInfo id={entry.id} query={query} />
        <p className="text-xs text-muted">ซื้อเมื่อ {formatDate(entry.purchasedAt)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted">
          สถานะ
          <select
            value={entry.status}
            onChange={(e) => isPlayStatus(e.target.value) && onStatus(e.target.value)}
            className={`${selectCls} bg-base-100`}
          >
            {(Object.entries(STATUS) as [PlayStatus, string][]).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <StarRating value={entry.myRating} onChange={onRating} label={`คะแนนของฉันสำหรับ ${name}`} />
        <IconDelete label={`ลบ ${name} ออกจากคลัง`} onClick={onRemove} />
      </div>
    </li>
  )
}

/** ชื่อและแนวเกม พร้อมสถานะโหลด/ผิดพลาดของแต่ละแถว */
function GameInfo({ id, query }: { id: number; query: GameQuery | undefined }) {
  if (!query || query.isPending) {
    return (
      <div className="flex flex-col gap-1.5 py-1" aria-busy="true" aria-label="กำลังโหลดข้อมูลเกม">
        <span className="skeleton h-4 w-48 max-w-full" />
        <span className="skeleton h-3 w-28" />
      </div>
    )
  }
  if (query.isError) {
    return <InlineError error={query.error} onRetry={() => void query.refetch()} label={`โหลดข้อมูลเกม #${id} ไม่สำเร็จ`} />
  }
  return (
    <>
      <Link to={`/game/${id}`} className="font-semibold text-white hover:text-primary">
        {query.data.name}
      </Link>
      <p className="text-[13px] text-muted">{genreText(query.data)}</p>
    </>
  )
}

const Stat = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="stat px-5 py-2.5">
    <dt className="stat-title text-xs">{label}</dt>
    <dd className="stat-value text-lg text-white">{value}</dd>
  </div>
)

const Thumb = ({ id, game, loading }: { id: number; game: GameDetail | undefined; loading: boolean }) => (
  <Link to={`/game/${id}`} tabIndex={-1} aria-hidden="true" className="h-[72px] w-32 shrink-0 overflow-hidden rounded-md bg-slate sm:w-40">
    {loading ? <div className="skeleton h-full w-full rounded-none" /> : <GameCover id={id} name={game?.name ?? ''} src={game?.background_image} crop showName={false} />}
  </Link>
)

const IconDelete = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className="btn btn-square shrink-0 text-muted hover:border-error/60 hover:text-error"
  >
    <TrashIcon className="h-5 w-5" />
  </button>
)

/** สมัคร/ยกเลิกรับอีเมลเมื่อเกมใน Wishlist ลดราคา (Lambda gamenight-deals ตรวจทุก 1 ชั่วโมง ส่งผ่าน SNS) */
function DealAlerts() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['alerts'], queryFn: api.getAlerts })
  const onError = (e: unknown) => toast(`บันทึกไม่สำเร็จ: ${api.errorText(e)}`)
  const sub = useMutation({
    mutationFn: api.subscribeAlerts,
    onSuccess: (data) => qc.setQueryData(['alerts'], data),
    onError,
  })
  const unsub = useMutation({
    mutationFn: api.unsubscribeAlerts,
    onSuccess: () => qc.setQueryData(['alerts'], (old: api.AlertState | undefined) => old && { ...old, status: 'none' }),
    onError,
  })
  if (q.isPending || q.isError) return null
  const { status, email } = q.data
  const busy = sub.isPending || unsub.isPending
  const text: Record<api.AlertStatus, string> = {
    none: 'รับอีเมลแจ้งเตือนเมื่อเกมใน Wishlist ลดราคา (ตรวจทุก 1 ชั่วโมง)',
    pending: `ส่งอีเมลยืนยันไปที่ ${email} แล้ว กดลิงก์ "Confirm subscription" ในอีเมลเพื่อเริ่มรับแจ้งเตือน`,
    confirmed: `เปิดแจ้งเตือนเกมลดราคาแล้ว ส่งไปที่ ${email}`,
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-box bg-base-200 px-4 py-3">
      <p className="text-sm text-sub">{text[status]}</p>
      <div className="flex gap-2">
        {status === 'pending' && (
          <button type="button" className={btn.ghost} disabled={busy} onClick={() => q.refetch()}>
            ยืนยันแล้ว
          </button>
        )}
        {status === 'none' ? (
          <button type="button" className={btn.outline} disabled={busy} onClick={() => sub.mutate()}>
            เปิดแจ้งเตือนลดราคา
          </button>
        ) : (
          <button type="button" className={btn.ghost} disabled={busy} onClick={() => unsub.mutate()}>
            ยกเลิกแจ้งเตือน
          </button>
        )}
      </div>
    </div>
  )
}
