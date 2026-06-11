'use client'
import { useState, useEffect, useRef } from 'react'
import { FileText, RefreshCw, Download, ChevronDown, Check } from 'lucide-react'

interface SettlementRow {
  id: string
  company: string
  gameTitle: string
  settledAt: string
  periodFrom: string
  periodTo: string
  revenue: number
  vat: number
  paybackExpired: number
  platformFee: number
  paymentMethodFee: number
  baseSettlement: number
  carryover: number
  paybackComp: number
  settlementAmount: number
  status: 'completed' | 'pending'
}

const DUMMY: SettlementRow[] = [
  // 스타 디펜더
  { id:'1',  company:'인디게임 스튜디오', gameTitle:'스타 디펜더',   settledAt:'2026-06-10', periodFrom:'2026-05-01', periodTo:'2026-05-31', revenue:3_820_000, vat:382_000, paybackExpired:95_000,  platformFee:191_000, paymentMethodFee:57_300, baseSettlement:3_189_700, carryover:48_000, paybackComp:32_000, settlementAmount:3_300_700, status:'completed' },
  { id:'2',  company:'인디게임 스튜디오', gameTitle:'스타 디펜더',   settledAt:'2026-05-10', periodFrom:'2026-04-01', periodTo:'2026-04-30', revenue:3_510_000, vat:351_000, paybackExpired:71_000,  platformFee:175_500, paymentMethodFee:52_650, baseSettlement:2_930_850, carryover:35_000, paybackComp:28_000, settlementAmount:3_008_850, status:'completed' },
  { id:'3',  company:'인디게임 스튜디오', gameTitle:'스타 디펜더',   settledAt:'2026-04-10', periodFrom:'2026-03-01', periodTo:'2026-03-31', revenue:2_990_000, vat:299_000, paybackExpired:60_000,  platformFee:149_500, paymentMethodFee:44_850, baseSettlement:2_496_650, carryover:22_000, paybackComp:19_000, settlementAmount:2_559_650, status:'completed' },
  { id:'4',  company:'인디게임 스튜디오', gameTitle:'스타 디펜더',   settledAt:'-',          periodFrom:'2026-06-01', periodTo:'2026-06-30', revenue:1_240_000, vat:124_000, paybackExpired:0,        platformFee:62_000,  paymentMethodFee:18_600, baseSettlement:1_035_400, carryover:0,      paybackComp:0,      settlementAmount:1_035_400, status:'pending'   },
  // 공룡 돌격대
  { id:'5',  company:'인디게임 스튜디오', gameTitle:'공룡 돌격대',   settledAt:'2026-06-10', periodFrom:'2026-05-01', periodTo:'2026-05-31', revenue:1_640_000, vat:164_000, paybackExpired:41_000,  platformFee:82_000,  paymentMethodFee:24_600, baseSettlement:1_369_400, carryover:12_000, paybackComp:9_000,  settlementAmount:1_413_400, status:'completed' },
  { id:'6',  company:'인디게임 스튜디오', gameTitle:'공룡 돌격대',   settledAt:'2026-05-10', periodFrom:'2026-04-01', periodTo:'2026-04-30', revenue:1_280_000, vat:128_000, paybackExpired:28_000,  platformFee:64_000,  paymentMethodFee:19_200, baseSettlement:1_068_800, carryover:8_000,  paybackComp:6_000,  settlementAmount:1_098_800, status:'completed' },
  { id:'7',  company:'인디게임 스튜디오', gameTitle:'공룡 돌격대',   settledAt:'2026-04-10', periodFrom:'2026-03-01', periodTo:'2026-03-31', revenue:980_000,   vat:98_000,  paybackExpired:18_000,  platformFee:49_000,  paymentMethodFee:14_700, baseSettlement:818_300,   carryover:5_000,  paybackComp:4_000,  settlementAmount:837_300,   status:'completed' },
  { id:'8',  company:'인디게임 스튜디오', gameTitle:'공룡 돌격대',   settledAt:'-',          periodFrom:'2026-06-01', periodTo:'2026-06-30', revenue:530_000,   vat:53_000,  paybackExpired:0,        platformFee:26_500,  paymentMethodFee:7_950,  baseSettlement:442_550,   carryover:0,      paybackComp:0,      settlementAmount:442_550,   status:'pending'   },
  // 전설의 영웅들
  { id:'9',  company:'인디게임 스튜디오', gameTitle:'전설의 영웅들', settledAt:'2026-06-10', periodFrom:'2026-05-01', periodTo:'2026-05-31', revenue:4_700_000, vat:470_000, paybackExpired:112_000, platformFee:235_000, paymentMethodFee:70_500, baseSettlement:3_924_500, carryover:61_000, paybackComp:44_000, settlementAmount:4_053_500, status:'completed' },
  { id:'10', company:'인디게임 스튜디오', gameTitle:'전설의 영웅들', settledAt:'2026-05-10', periodFrom:'2026-04-01', periodTo:'2026-04-30', revenue:4_210_000, vat:421_000, paybackExpired:98_000,  platformFee:210_500, paymentMethodFee:63_150, baseSettlement:3_515_350, carryover:52_000, paybackComp:38_000, settlementAmount:3_627_350, status:'completed' },
  { id:'11', company:'인디게임 스튜디오', gameTitle:'전설의 영웅들', settledAt:'2026-04-10', periodFrom:'2026-03-01', periodTo:'2026-03-31', revenue:3_850_000, vat:385_000, paybackExpired:82_000,  platformFee:192_500, paymentMethodFee:57_750, baseSettlement:3_214_750, carryover:40_000, paybackComp:30_000, settlementAmount:3_306_750, status:'completed' },
  { id:'12', company:'인디게임 스튜디오', gameTitle:'전설의 영웅들', settledAt:'-',          periodFrom:'2026-06-01', periodTo:'2026-06-30', revenue:1_870_000, vat:187_000, paybackExpired:0,        platformFee:93_500,  paymentMethodFee:28_050, baseSettlement:1_561_450, carryover:0,      paybackComp:0,      settlementAmount:1_561_450, status:'pending'   },
  // 픽셀 레이서
  { id:'13', company:'인디게임 스튜디오', gameTitle:'픽셀 레이서',   settledAt:'2026-06-10', periodFrom:'2026-05-01', periodTo:'2026-05-31', revenue:2_150_000, vat:215_000, paybackExpired:53_000,  platformFee:107_500, paymentMethodFee:32_250, baseSettlement:1_795_250, carryover:24_000, paybackComp:17_000, settlementAmount:1_855_250, status:'completed' },
  { id:'14', company:'인디게임 스튜디오', gameTitle:'픽셀 레이서',   settledAt:'2026-05-10', periodFrom:'2026-04-01', periodTo:'2026-04-30', revenue:1_890_000, vat:189_000, paybackExpired:40_000,  platformFee:94_500,  paymentMethodFee:28_350, baseSettlement:1_578_150, carryover:18_000, paybackComp:13_000, settlementAmount:1_623_150, status:'completed' },
  { id:'15', company:'인디게임 스튜디오', gameTitle:'픽셀 레이서',   settledAt:'-',          periodFrom:'2026-06-01', periodTo:'2026-06-30', revenue:760_000,   vat:76_000,  paybackExpired:0,        platformFee:38_000,  paymentMethodFee:11_400, baseSettlement:634_600,   carryover:0,      paybackComp:0,      settlementAmount:634_600,   status:'pending'   },
  // 네온 러너
  { id:'16', company:'인디게임 스튜디오', gameTitle:'네온 러너',     settledAt:'2026-06-10', periodFrom:'2026-05-01', periodTo:'2026-05-31', revenue:890_000,   vat:89_000,  paybackExpired:22_000,  platformFee:44_500,  paymentMethodFee:13_350, baseSettlement:743_150,   carryover:7_000,  paybackComp:5_000,  settlementAmount:767_150,   status:'completed' },
  { id:'17', company:'인디게임 스튜디오', gameTitle:'네온 러너',     settledAt:'2026-05-10', periodFrom:'2026-04-01', periodTo:'2026-04-30', revenue:720_000,   vat:72_000,  paybackExpired:15_000,  platformFee:36_000,  paymentMethodFee:10_800, baseSettlement:601_200,   carryover:5_000,  paybackComp:4_000,  settlementAmount:617_200,   status:'completed' },
  { id:'18', company:'인디게임 스튜디오', gameTitle:'네온 러너',     settledAt:'-',          periodFrom:'2026-06-01', periodTo:'2026-06-30', revenue:310_000,   vat:31_000,  paybackExpired:0,        platformFee:15_500,  paymentMethodFee:4_650,  baseSettlement:258_850,   carryover:0,      paybackComp:0,      settlementAmount:258_850,   status:'pending'   },
  // 던전 어드벤처
  { id:'19', company:'인디게임 스튜디오', gameTitle:'던전 어드벤처', settledAt:'2026-06-10', periodFrom:'2026-05-01', periodTo:'2026-05-31', revenue:2_430_000, vat:243_000, paybackExpired:58_000,  platformFee:121_500, paymentMethodFee:36_450, baseSettlement:2_029_050, carryover:28_000, paybackComp:20_000, settlementAmount:2_095_050, status:'completed' },
  { id:'20', company:'인디게임 스튜디오', gameTitle:'던전 어드벤처', settledAt:'2026-05-10', periodFrom:'2026-04-01', periodTo:'2026-04-30', revenue:2_110_000, vat:211_000, paybackExpired:44_000,  platformFee:105_500, paymentMethodFee:31_650, baseSettlement:1_761_850, carryover:21_000, paybackComp:15_000, settlementAmount:1_811_850, status:'completed' },
  { id:'21', company:'인디게임 스튜디오', gameTitle:'던전 어드벤처', settledAt:'-',          periodFrom:'2026-06-01', periodTo:'2026-06-30', revenue:940_000,   vat:94_000,  paybackExpired:0,        platformFee:47_000,  paymentMethodFee:14_100, baseSettlement:784_900,   carryover:0,      paybackComp:0,      settlementAmount:784_900,   status:'pending'   },
  // 마법사의 탑
  { id:'22', company:'인디게임 스튜디오', gameTitle:'마법사의 탑',   settledAt:'2026-06-10', periodFrom:'2026-05-01', periodTo:'2026-05-31', revenue:1_320_000, vat:132_000, paybackExpired:33_000,  platformFee:66_000,  paymentMethodFee:19_800, baseSettlement:1_102_200, carryover:10_000, paybackComp:8_000,  settlementAmount:1_137_200, status:'completed' },
  { id:'23', company:'인디게임 스튜디오', gameTitle:'마법사의 탑',   settledAt:'2026-05-10', periodFrom:'2026-04-01', periodTo:'2026-04-30', revenue:1_050_000, vat:105_000, paybackExpired:24_000,  platformFee:52_500,  paymentMethodFee:15_750, baseSettlement:876_750,   carryover:7_000,  paybackComp:5_000,  settlementAmount:902_750,   status:'completed' },
  { id:'24', company:'인디게임 스튜디오', gameTitle:'마법사의 탑',   settledAt:'-',          periodFrom:'2026-06-01', periodTo:'2026-06-30', revenue:480_000,   vat:48_000,  paybackExpired:0,        platformFee:24_000,  paymentMethodFee:7_200,  baseSettlement:400_800,   carryover:0,      paybackComp:0,      settlementAmount:400_800,   status:'pending'   },
  // 크리스탈 퀘스트
  { id:'25', company:'인디게임 스튜디오', gameTitle:'크리스탈 퀘스트', settledAt:'2026-06-10', periodFrom:'2026-05-01', periodTo:'2026-05-31', revenue:1_780_000, vat:178_000, paybackExpired:44_000, platformFee:89_000,  paymentMethodFee:26_700, baseSettlement:1_486_300, carryover:16_000, paybackComp:11_000, settlementAmount:1_535_300, status:'completed' },
  { id:'26', company:'인디게임 스튜디오', gameTitle:'크리스탈 퀘스트', settledAt:'2026-05-10', periodFrom:'2026-04-01', periodTo:'2026-04-30', revenue:1_490_000, vat:149_000, paybackExpired:30_000, platformFee:74_500,  paymentMethodFee:22_350, baseSettlement:1_244_150, carryover:11_000, paybackComp:8_000,  settlementAmount:1_277_150, status:'completed' },
  { id:'27', company:'인디게임 스튜디오', gameTitle:'크리스탈 퀘스트', settledAt:'-',          periodFrom:'2026-06-01', periodTo:'2026-06-30', revenue:620_000,   vat:62_000,  paybackExpired:0,       platformFee:31_000,  paymentMethodFee:9_300,  baseSettlement:517_700,   carryover:0,      paybackComp:0,      settlementAmount:517_700,   status:'pending'   },
]

const w = (n: number) => `₩${n.toLocaleString()}`
const fmtDate = (s: string) => s === '-' ? '-' : s.replace(/-/g, '.')

const COLS = [
  '정산 회사', '정산 대상', '정산 일자', '정산 기간', '정산 금액',
  '매출(+)', 'VAT(-)', '페이백 만료\n금액(+)', '순수 플랫폼\n수수료(-)',
  '결제수단 수수료(-)', '기본 정산액', '이월 금액(+)', '페이백 보상\n지급(-)', '정산서',
]

type Period = '1m' | '3m' | '6m' | 'custom'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '1m', label: '1개월' },
  { value: '3m', label: '3개월' },
  { value: '6m', label: '6개월' },
  { value: 'custom', label: '지정 기간' },
]

const toYearMonth = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

const addMonths = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number)
  return toYearMonth(new Date(y, m - 1 + n, 1))
}

const fmtYM = (ym: string) => {
  const [y, m] = ym.split('-')
  return `${y}. ${m}.`
}

export default function AdminSettlementsPage() {
  const today = new Date()
  const todayYM = toYearMonth(today)

  const [period, setPeriod]             = useState<Period>('1m')
  const [fromYM, setFromYM]             = useState(todayYM)
  const [toYM, setToYM]                 = useState(todayYM)
  const [dropdownOpen, setDropdown]     = useState(false)
  const [dropdownView, setDropdownView] = useState<'list' | 'custom'>('list')

  const [selCompanies, setSelCompanies] = useState<string[]>([])
  const [selGames,     setSelGames]     = useState<string[]>([])
  const [devOpen,      setDevOpen]      = useState(false)
  const [gameOpen,     setGameOpen]     = useState(false)

  const devRef  = useRef<HTMLDivElement>(null)
  const gameRef = useRef<HTMLDivElement>(null)

  // DUMMY에서 목록 추출
  const allCompanies = Array.from(new Set(DUMMY.map(r => r.company))).sort()
  const allGames = Array.from(
    new Set(
      DUMMY
        .filter(r => selCompanies.length === 0 || selCompanies.includes(r.company))
        .map(r => r.gameTitle)
    )
  ).sort()

  // 회사 선택 바뀌면 해당 회사에 없는 게임 선택 해제
  useEffect(() => {
    if (selCompanies.length > 0)
      setSelGames(prev => prev.filter(g => DUMMY.some(r => selCompanies.includes(r.company) && r.gameTitle === g)))
  }, [selCompanies])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (devRef.current  && !devRef.current.contains(e.target as Node))  setDevOpen(false)
      if (gameRef.current && !gameRef.current.contains(e.target as Node)) setGameOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggleCompany = (c: string) =>
    setSelCompanies(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])

  const toggleGame = (g: string) =>
    setSelGames(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])

  const getRange = (p: Period) => {
    const months = p === '1m' ? 1 : p === '3m' ? 3 : 6
    return { from: addMonths(todayYM, -(months - 1)), to: todayYM }
  }

  const displayFrom = period === 'custom' ? fromYM : getRange(period).from
  const displayTo   = period === 'custom' ? toYM   : getRange(period).to

  const rows = DUMMY.filter(r => {
    if (selCompanies.length > 0 && !selCompanies.includes(r.company))   return false
    if (selGames.length     > 0 && !selGames.includes(r.gameTitle))     return false
    const rowYM = r.periodFrom.slice(0, 7)
    if (rowYM < displayFrom || rowYM > displayTo)                        return false
    return true
  })

  const downloadCSV = () => { /* TODO: 데이터 연동 후 구현 */ }

  return (
    <div className="space-y-4 min-w-0">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold text-text-primary">정산 정보</h2>
          <p className="text-text-secondary text-sm mt-1">
            각 회사의 게임들 정산을 정리합니다.
          </p>
          <div className="flex items-center gap-3 mt-3">
            {/* 게임 회사 멀티셀렉트 */}
            <div className="relative" ref={devRef}>
              <button
                onClick={() => setDevOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-2 bg-bg-secondary border border-line rounded-md text-sm text-text-primary hover:bg-bg-tertiary transition-colors min-w-[160px] justify-between"
              >
                <span className="truncate">
                  {selCompanies.length === 0 ? '전체 회사' : selCompanies.length === 1 ? selCompanies[0] : `${selCompanies[0]} 외 ${selCompanies.length - 1}`}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${devOpen ? 'rotate-180' : ''}`} />
              </button>
              {devOpen && (
                <div className="absolute left-0 top-full mt-1 bg-bg-primary border border-line rounded-md shadow-lg z-20 min-w-[160px] max-h-60 overflow-y-auto">
                  <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-bg-tertiary">
                    <input type="checkbox" checked={selCompanies.length === 0}
                      onChange={() => setSelCompanies([])}
                      className="w-4 h-4 rounded border-line accent-accent" />
                    <span>전체 회사</span>
                  </label>
                  <div className="border-t border-line/50" />
                  {allCompanies.map(c => (
                    <label key={c} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-bg-tertiary">
                      <input type="checkbox" checked={selCompanies.includes(c)}
                        onChange={() => toggleCompany(c)}
                        className="w-4 h-4 rounded border-line accent-accent" />
                      <span className="truncate">{c}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* 게임명 멀티셀렉트 */}
            <div className="relative" ref={gameRef}>
              <button
                onClick={() => setGameOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-2 bg-bg-secondary border border-line rounded-md text-sm text-text-primary hover:bg-bg-tertiary transition-colors min-w-[180px] justify-between"
              >
                <span className="truncate">
                  {selGames.length === 0 ? '전체 게임' : selGames.length === 1 ? selGames[0] : `${selGames[0]} 외 ${selGames.length - 1}`}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${gameOpen ? 'rotate-180' : ''}`} />
              </button>
              {gameOpen && (
                <div className="absolute left-0 top-full mt-1 bg-bg-primary border border-line rounded-md shadow-lg z-20 min-w-[180px] max-h-60 overflow-y-auto">
                  <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-bg-tertiary">
                    <input type="checkbox" checked={selGames.length === 0}
                      onChange={() => setSelGames([])}
                      className="w-4 h-4 rounded border-line accent-accent" />
                    <span>전체 게임</span>
                  </label>
                  <div className="border-t border-line/50" />
                  {allGames.map(g => (
                    <label key={g} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-bg-tertiary">
                      <input type="checkbox" checked={selGames.includes(g)}
                        onChange={() => toggleGame(g)}
                        className="w-4 h-4 rounded border-line accent-accent" />
                      <span className="truncate">{g}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 우측 컨트롤 */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* 기간 드롭다운 */}
            <div className="relative">
              <button
                onClick={() => setDropdown(v => !v)}
                className="flex items-center gap-2 px-3 py-2 border border-line rounded-md text-xs bg-bg-tertiary text-text-primary hover:bg-bg-secondary transition-colors min-w-[90px] justify-between"
              >
                <span>{PERIOD_OPTIONS.find(o => o.value === period)?.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-bg-primary border border-line rounded-md shadow-lg z-20 overflow-hidden">
                  {dropdownView === 'list' ? (
                    <div className="min-w-[100px]">
                      {PERIOD_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            if (opt.value === 'custom') {
                              setDropdownView('custom')
                            } else {
                              setPeriod(opt.value)
                              setDropdown(false)
                            }
                          }}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                            period === opt.value ? 'bg-accent text-text-primary font-semibold' : 'text-text-secondary hover:bg-bg-tertiary'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 w-56 space-y-3">
                      <button
                        onClick={() => setDropdownView('list')}
                        className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors"
                      >
                        ← 돌아가기
                      </button>
                      <div className="space-y-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-text-secondary">시작 월</label>
                          <input type="month" value={fromYM} max={toYM}
                            onChange={e => setFromYM(e.target.value)}
                            className="px-2 py-1.5 text-xs border border-line rounded-md bg-bg-secondary focus:outline-none focus:border-accent w-full" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-text-secondary">종료 월</label>
                          <input type="month" value={toYM} min={fromYM} max={todayYM}
                            onChange={e => setToYM(e.target.value)}
                            className="px-2 py-1.5 text-xs border border-line rounded-md bg-bg-secondary focus:outline-none focus:border-accent w-full" />
                        </div>
                      </div>
                      <button
                        onClick={() => { setPeriod('custom'); setDropdown(false); setDropdownView('list') }}
                        className="w-full px-3 py-1.5 text-xs bg-accent hover:bg-accent-hover text-text-primary rounded-md font-medium transition-colors"
                      >
                        적용
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 새로고침 */}
            <button
              className="flex items-center px-3 py-2 border border-line rounded-md text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"
              title="새로고침"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* 엑셀 다운로드 */}
            <div className="relative group">
              <button
                onClick={downloadCSV}
                className="flex items-center px-3 py-2 border border-line rounded-md text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
              <div className="absolute right-0 top-full mt-1.5 px-2 py-1 bg-bg-primary border border-line rounded text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                엑셀로 내보내세요
              </div>
            </div>
          </div>

          {/* 기간 표시 */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-accent">{PERIOD_OPTIONS.find(o => o.value === period)?.label}</span>
            <span className="text-xs text-text-muted">|</span>
            <span className="text-xs text-text-secondary">{fmtYM(displayFrom)}</span>
            <span className="text-xs text-text-muted">~</span>
            <span className="text-xs text-text-secondary">{fmtYM(displayTo)}</span>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-bg-secondary border border-line rounded-xl overflow-x-auto">
        <table className="w-full text-sm text-text-primary min-w-[1400px]">
          <thead>
            <tr className="border-b border-line bg-bg-tertiary/50 text-xs font-semibold text-text-secondary divide-x divide-line/30">
              {COLS.map((col, i) => (
                <th key={i} className="px-3 py-3 text-center whitespace-pre-line leading-tight">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLS.length} className="py-20 text-center text-text-muted text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-8 h-8 text-text-muted/40" />
                    <span>조회된 정산 내역이 없습니다.</span>
                  </div>
                </td>
              </tr>
            ) : rows.map(r => (
              <tr key={r.id} className="border-b border-line/50 last:border-0 hover:bg-bg-tertiary/20 divide-x divide-line/30 text-xs text-text-primary">
                <td className="px-3 py-3 whitespace-nowrap">{r.company}</td>
                <td className="px-3 py-3 whitespace-nowrap font-medium">{r.gameTitle}</td>
                <td className="px-3 py-3 whitespace-nowrap">{fmtDate(r.settledAt)}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {fmtDate(r.periodFrom)} ~ {fmtDate(r.periodTo)}
                </td>
                <td className="px-3 py-3 text-right font-semibold">{w(r.settlementAmount)}</td>
                <td className="px-3 py-3 text-right">{w(r.revenue)}</td>
                <td className="px-3 py-3 text-right">-{w(r.vat)}</td>
                <td className="px-3 py-3 text-right">+{w(r.paybackExpired)}</td>
                <td className="px-3 py-3 text-right">-{w(r.platformFee)}</td>
                <td className="px-3 py-3 text-right">-{w(r.paymentMethodFee)}</td>
                <td className="px-3 py-3 text-right">{w(r.baseSettlement)}</td>
                <td className="px-3 py-3 text-right">+{w(r.carryover)}</td>
                <td className="px-3 py-3 text-right">-{w(r.paybackComp)}</td>
                <td className="px-3 py-3 text-center">
                  {r.status === 'completed' ? '완료' : '대기'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
