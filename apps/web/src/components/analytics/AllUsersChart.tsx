'use client'
import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { DailyPoint } from '@/services/analyticsService'
import { DUMMY_NEW_USERS_DAILY } from './newUsersDummy'
import { formatDate as fmt } from '@/lib/formatDate'

type SortKey = 'date' | 'dau' | 'payingUsers' | 'paymentCount' | 'pur' | 'revenue' | 'arpu' | 'arppu' | 'd1'
type SortDir = 'asc' | 'desc'

const SortIcon = ({ k, sortKey, sortDir }: { k: SortKey; sortKey: SortKey; sortDir: SortDir }) => {
  if (sortKey !== k) return <ChevronsUpDown className="inline w-3 h-3 ml-0.5 opacity-30" />
  return sortDir === 'asc'
    ? <ChevronUp   className="inline w-3 h-3 ml-0.5 text-accent" />
    : <ChevronDown className="inline w-3 h-3 ml-0.5 text-accent" />
}

function dummyPaymentCount(dateStr: string, payingUsers: number) {
  const d    = new Date(dateStr)
  const seed = d.getDate() * 7 + d.getMonth() * 13
  const countMul = 1.1 + Math.abs(Math.sin(seed * 0.7)) * 0.6
  return Math.round(payingUsers * countMul)
}

function dummyD1(dateStr: string) {
  const d    = new Date(dateStr)
  const seed = d.getDate() * 3 + d.getMonth() * 17
  return Math.round(25 + Math.abs(Math.sin(seed * 0.7)) * 20)
}

interface Row {
  date:         string
  label:        string
  dau:          number
  payingUsers:  number
  paymentCount: number  // 더미
  pur:          number  // payingUsers / dau * 100
  revenue:      number
  arpu:         number  // revenue / dau
  arppu:        number  // revenue / payingUsers
  d1:           number  // D-1 리텐션 (더미)
}

export default function AllUsersChart({ data }: { data: DailyPoint[] }) {
  const hasReal = data.some(d => d.dau > 0 || d.payingUsers > 0)
  const source  = hasReal ? data : DUMMY_NEW_USERS_DAILY

  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('desc') }
  }

  const rows: Row[] = useMemo(() => source.map(d => {
    const pc = dummyPaymentCount(d.date, d.payingUsers)
    return {
      date:         d.date,
      label:        fmt(new Date(d.date)),
      dau:          d.dau,
      payingUsers:  d.payingUsers,
      paymentCount: pc,
      pur:          d.dau > 0         ? Math.round(d.payingUsers / d.dau * 1000) / 10 : 0,
      revenue:      d.revenue,
      arpu:         d.dau > 0         ? Math.round(d.revenue / d.dau)         : 0,
      arppu:        d.payingUsers > 0 ? Math.round(d.revenue / d.payingUsers) : 0,
      d1:           dummyD1(d.date),
    }
  }), [source])

  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const va = a[sortKey]
    const vb = b[sortKey]
    const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)
    return sortDir === 'asc' ? cmp : -cmp
  }), [rows, sortKey, sortDir])

  const cols: { k: SortKey; label: string }[] = [
    { k: 'date',         label: '날짜'          },
    { k: 'dau',          label: 'DAU'           },
    { k: 'payingUsers',  label: '결제자'        },
    { k: 'paymentCount', label: '결제 수*'      },
    { k: 'pur',          label: '결제율'        },
    { k: 'revenue',      label: '결제 수익'     },
    { k: 'arpu',         label: 'ARPU'          },
    { k: 'arppu',        label: 'ARPPU'         },
    { k: 'd1',           label: 'D-1 리텐션*'  },
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
          일일 전체 유저 현황
          {!hasReal && <span className="ml-1.5 text-xs font-normal text-text-muted">(더미)</span>}
        </h3>
        <span className="text-[10px] text-text-muted">* 더미 데이터 (API 미지원)</span>
      </div>

      <div className={`overflow-auto ${sorted.length > 20 ? 'max-h-[520px]' : ''}`}>
        <table className="w-full text-xs min-w-[780px]">
          <thead>
            <tr className="border-b border-line text-text-secondary font-semibold select-none">
              {cols.map(col => (
                <th
                  key={col.k}
                  onClick={() => handleSort(col.k)}
                  className={`sticky top-0 z-10 px-4 py-2.5 cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap bg-bg-tertiary ${col.k === 'date' ? 'text-left left-0 z-20' : 'text-right'} ${col.k === 'dau' ? 'border-l border-line' : ''}`}
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
                <td className="border-l border-line px-4 py-2.5 text-right text-text-primary">{row.dau.toLocaleString()}명</td>
                <td className="px-4 py-2.5 text-right text-text-primary">{row.payingUsers.toLocaleString()}명</td>
                <td className="px-4 py-2.5 text-right text-text-primary">{row.paymentCount.toLocaleString()}건</td>
                <td className="px-4 py-2.5 text-right text-text-primary">{row.pur.toFixed(1)}%</td>
                <td className="px-4 py-2.5 text-right text-text-primary">₩{row.revenue.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right text-text-primary">₩{row.arpu.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right text-text-primary">₩{row.arppu.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right text-text-primary">{row.d1}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
