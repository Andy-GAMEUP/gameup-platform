'use client'
import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { DailyPoint } from '@/services/analyticsService'
import { DUMMY_NEW_USERS_DAILY } from './newUsersDummy'

type SortKey = 'date' | 'newMembers' | 'newRatio' | 'newPayers' | 'newPaymentCount' | 'newPur' | 'newRevenue' | 'newArpu' | 'newArppu' | 'd1'
type SortDir = 'asc' | 'desc'

const fmt = (d: Date) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`

const SortIcon = ({ k, sortKey, sortDir }: { k: SortKey; sortKey: SortKey; sortDir: SortDir }) => {
  if (sortKey !== k) return <ChevronsUpDown className="inline w-3 h-3 ml-0.5 opacity-30" />
  return sortDir === 'asc'
    ? <ChevronUp   className="inline w-3 h-3 ml-0.5 text-accent" />
    : <ChevronDown className="inline w-3 h-3 ml-0.5 text-accent" />
}

// 신규 유저 기준 결제 데이터는 API 미지원 → 더미
function genNewUserPayment(dateStr: string, newMembers: number) {
  const d    = new Date(dateStr)
  const seed = d.getDate() * 7 + d.getMonth() * 13

  const purRate      = 0.02 + Math.abs(Math.sin(seed * 0.9)) * 0.04   // 2~6%
  const newPayers    = Math.round(newMembers * purRate)
  const avgPayment   = 3000 + Math.round(Math.abs(Math.sin(seed * 1.3)) * 9000)
  const countMul     = 1.1 + Math.abs(Math.sin(seed * 0.7)) * 0.5
  const newPaymentCount = Math.round(newPayers * countMul)
  const newRevenue   = newPayers * avgPayment

  return { newPayers, newPaymentCount, newRevenue }
}

function dummyD1(dateStr: string) {
  const d    = new Date(dateStr)
  const seed = d.getDate() * 3 + d.getMonth() * 17
  return Math.round(25 + Math.abs(Math.sin(seed * 0.7)) * 20)
}

interface Row {
  date:            string
  label:           string
  newMembers:      number
  dau:             number
  newRatio:        number  // newMembers / dau * 100
  newPayers:       number  // 신규 유저 중 결제자 (더미)
  newPaymentCount: number  // 신규 유저 결제 수 (더미)
  newPur:          number  // newPayers / newMembers * 100 (더미)
  newRevenue:      number  // 신규 유저 결제 수익 (더미)
  newArpu:         number  // newRevenue / newMembers (더미)
  newArppu:        number  // newRevenue / newPayers (더미)
  d1:              number  // D-1 리텐션 (더미)
}

export default function NewUsersChart({ data }: { data: DailyPoint[] }) {
  const hasReal = data.some(d => d.newMembers > 0 || d.dau > 0)
  const source  = hasReal ? data : DUMMY_NEW_USERS_DAILY

  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('desc') }
  }

  const rows: Row[] = useMemo(() => source.map(d => {
    const { newPayers, newPaymentCount, newRevenue } = genNewUserPayment(d.date, d.newMembers)
    return {
      date:            d.date,
      label:           fmt(new Date(d.date)),
      newMembers:      d.newMembers,
      dau:             d.dau,
      newRatio:        d.dau > 0 ? Math.round(d.newMembers / d.dau * 1000) / 10 : 0,
      newPayers,
      newPaymentCount,
      newPur:          d.newMembers > 0 ? Math.round(newPayers / d.newMembers * 1000) / 10 : 0,
      newRevenue,
      newArpu:         d.newMembers > 0 ? Math.round(newRevenue / d.newMembers) : 0,
      newArppu:        newPayers > 0 ? Math.round(newRevenue / newPayers) : 0,
      d1:              dummyD1(d.date),
    }
  }), [source])

  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const va = a[sortKey]
    const vb = b[sortKey]
    const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)
    return sortDir === 'asc' ? cmp : -cmp
  }), [rows, sortKey, sortDir])

  const cols: { k: SortKey; label: string }[] = [
    { k: 'date',            label: '날짜'      },
    { k: 'newMembers',      label: '신규 가입' },
    { k: 'newRatio',        label: '신규 비율' },
    { k: 'newPayers',       label: '결제자*'   },
    { k: 'newPaymentCount', label: '결제 수*'  },
    { k: 'newPur',          label: '결제율*'   },
    { k: 'newRevenue',      label: '결제 수익*'},
    { k: 'newArpu',         label: 'ARPU*'     },
    { k: 'newArppu',        label: 'ARPPU*'    },
    { k: 'd1',              label: 'D-1 리텐션*'},
  ]

  if (source.length === 0) {
    return (
      <div className="bg-bg-secondary border border-line rounded-lg p-12 text-center text-text-secondary text-sm">
        데이터가 없습니다.
      </div>
    )
  }

  return (
    <div className="bg-bg-secondary border border-line rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-line bg-bg-tertiary flex items-center justify-between">
        <h3 className="text-sm font-bold">
          일일 신규 유저 현황
          {!hasReal && <span className="ml-1.5 text-xs font-normal text-text-muted">(더미)</span>}
        </h3>
        <span className="text-[10px] text-text-muted">* 신규 유저 기준 더미 데이터 (API 미지원)</span>
      </div>

      <div className={`overflow-auto ${sorted.length > 20 ? 'max-h-[520px]' : ''}`}>
        <table className="w-full text-xs min-w-[780px]">
          <thead>
            <tr className="border-b border-line text-text-secondary font-semibold select-none">
              {cols.map(col => (
                <th
                  key={col.k}
                  onClick={() => handleSort(col.k)}
                  className={`sticky top-0 z-10 px-4 py-2.5 cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap bg-bg-tertiary ${col.k === 'date' ? 'text-left left-0 z-20' : 'text-right'} ${col.k === 'newMembers' ? 'border-l border-line' : ''}`}
                >
                  <span className="inline-flex items-center gap-0.5 justify-end">
                    {col.label}
                    <SortIcon k={col.k} sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {sorted.map(row => (
              <tr key={row.date} className="group hover:bg-bg-tertiary transition-colors">
                <td className="sticky left-0 z-10 bg-bg-secondary group-hover:bg-bg-tertiary transition-colors px-4 py-2.5 text-text-primary font-mono border-r border-line">{row.label}</td>
                <td className="border-l border-line px-4 py-2.5 text-right text-text-primary">{row.newMembers.toLocaleString()}명</td>
                <td className="px-4 py-2.5 text-right text-text-primary">{row.newRatio.toFixed(1)}%</td>
                <td className="px-4 py-2.5 text-right text-text-primary">{row.newPayers.toLocaleString()}명</td>
                <td className="px-4 py-2.5 text-right text-text-primary">{row.newPaymentCount.toLocaleString()}건</td>
                <td className="px-4 py-2.5 text-right text-text-primary">{row.newPur.toFixed(1)}%</td>
                <td className="px-4 py-2.5 text-right text-text-primary">₩{row.newRevenue.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right text-text-primary">₩{row.newArpu.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right text-text-primary">₩{row.newArppu.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right text-text-primary">{row.d1}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
