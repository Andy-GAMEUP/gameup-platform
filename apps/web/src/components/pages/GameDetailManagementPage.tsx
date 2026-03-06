'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ChevronLeft, Star, Users, MessageSquare, Download, Eye,
  Calendar, Globe, Upload, Image as ImageIcon, Film,
  Trash2, Save, AlertCircle, Plus, Edit, Bell, ShoppingBag,
  DollarSign, Package, Megaphone, Play, Clock, Send, Check,
} from 'lucide-react'

interface Screenshot { id: number; title: string }
interface Video { id: number; title: string; url: string; duration: string; views: number }
interface ShopItem { id: number; name: string; price: number; currency: string; type: string; stock: string; sales: number; active: boolean }
interface Announcement { id: number; title: string; date: string; type: string; priority: string; content: string; sent: boolean; recipients: number }
type TabKey = 'announcements' | 'overview' | 'media' | 'shop'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'announcements', label: '공지 & 알림' },
  { key: 'overview', label: '기본 정보' },
  { key: 'media', label: '미디어' },
  { key: 'shop', label: '게임샵' },
]

const inputCls = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-green-500'
const labelCls = 'block text-sm text-slate-400 mb-1'

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export default function GameDetailManagementPage() {
  const { id: _id } = useParams()
  const [activeTab, setActiveTab] = useState<TabKey>('announcements')
  const [screenshots, setScreenshots] = useState<Screenshot[]>([
    { id: 1, title: '메인 화면' }, { id: 2, title: '전투 장면' }, { id: 3, title: '도시 풍경' },
  ])
  const [videos, setVideos] = useState<Video[]>([
    { id: 1, title: '공식 트레일러', url: 'https://youtube.com/watch?v=example1', duration: '2:45', views: 15420 },
    { id: 2, title: '게임플레이 영상', url: 'https://youtube.com/watch?v=example2', duration: '10:30', views: 8932 },
  ])
  const [shopItems, setShopItems] = useState<ShopItem[]>([
    { id: 1, name: '스타터 팩', price: 9900, currency: 'KRW', type: '패키지', stock: '무제한', sales: 450, active: true },
    { id: 2, name: '프리미엄 스킨', price: 4900, currency: 'KRW', type: '외형', stock: '무제한', sales: 892, active: true },
    { id: 3, name: '골드 1000개', price: 2900, currency: 'KRW', type: '재화', stock: '무제한', sales: 1240, active: true },
  ])
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    { id: 1, title: '긴급 점검 안내', date: '2024.02.10', type: '점검', priority: 'high', content: '서버 안정화를 위한 긴급 점검이 예정되어 있습니다.', sent: true, recipients: 2450 },
    { id: 2, title: '신규 콘텐츠 업데이트', date: '2024.02.08', type: '업데이트', priority: 'normal', content: '새로운 던전과 아이템이 추가됩니다.', sent: true, recipients: 2450 },
  ])

  const [ssModal, setSsModal] = useState(false)
  const [vidModal, setVidModal] = useState(false)
  const [itemModal, setItemModal] = useState(false)
  const [notiModal, setNotiModal] = useState(false)
  const [newSs, setNewSs] = useState({ title: '' })
  const [newVid, setNewVid] = useState({ title: '', url: '', type: 'youtube' })
  const [newItem, setNewItem] = useState({ name: '', price: '', currency: 'KRW', type: '패키지', stock: '무제한', description: '' })
  const [newNoti, setNewNoti] = useState({ title: '', content: '', type: 'notice', priority: 'normal', sendPush: false })

  const game = { title: 'Cyber Nexus', description: '사이버펑크 세계를 배경으로 한 액션 RPG', genre: 'RPG', status: '진행중', rating: 4.8, testers: 2450 }

  const addScreenshot = () => {
    if (!newSs.title) return
    setScreenshots(p => [...p, { id: Date.now(), title: newSs.title }])
    setNewSs({ title: '' }); setSsModal(false)
  }
  const addVideo = () => {
    if (!newVid.title || !newVid.url) return
    setVideos(p => [...p, { id: Date.now(), title: newVid.title, url: newVid.url, duration: '0:00', views: 0 }])
    setNewVid({ title: '', url: '', type: 'youtube' }); setVidModal(false)
  }
  const addItem = () => {
    if (!newItem.name || !newItem.price) return
    setShopItems(p => [...p, { id: Date.now(), name: newItem.name, price: parseInt(newItem.price), currency: newItem.currency, type: newItem.type, stock: newItem.stock, sales: 0, active: true }])
    setNewItem({ name: '', price: '', currency: 'KRW', type: '패키지', stock: '무제한', description: '' }); setItemModal(false)
  }
  const addAnnouncement = () => {
    if (!newNoti.title || !newNoti.content) return
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '.')
    setAnnouncements(p => [...p, { id: Date.now(), title: newNoti.title, content: newNoti.content, type: newNoti.type, priority: newNoti.priority, date: today, sent: newNoti.sendPush, recipients: newNoti.sendPush ? game.testers : 0 }])
    setNewNoti({ title: '', content: '', type: 'notice', priority: 'normal', sendPush: false }); setNotiModal(false)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/games-management">
            <button className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors">
              <ChevronLeft className="w-4 h-4" /> 게임 목록
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold mb-1">{game.title}</h1>
            <div className="flex items-center gap-3">
              <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/50">{game.status}</span>
              <span className="flex items-center gap-1 text-slate-400 text-sm">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />{game.rating}
              </span>
            </div>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm transition-colors">
          <Save className="w-4 h-4" /> 변경사항 저장
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '테스터', value: game.testers.toLocaleString(), icon: <Users className="w-5 h-5" />, color: 'text-blue-400' },
          { label: '다운로드', value: '892', icon: <Download className="w-5 h-5" />, color: 'text-green-400' },
          { label: '피드백', value: '342', icon: <MessageSquare className="w-5 h-5" />, color: 'text-purple-400' },
          { label: '조회수', value: '15,420', icon: <Eye className="w-5 h-5" />, color: 'text-orange-400' },
        ].map((s, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex items-center gap-3">
            <span className={s.color}>{s.icon}</span>
            <div><div className="text-2xl font-bold">{s.value}</div><div className="text-sm text-slate-400">{s.label}</div></div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === t.key ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'announcements' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div><h2 className="text-xl font-bold">공지사항 및 푸시 알림</h2><p className="text-sm text-slate-400 mt-1">테스터들에게 중요한 소식을 전달하세요</p></div>
            <button onClick={() => setNotiModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm transition-colors">
              <Megaphone className="w-4 h-4" /> 공지 작성
            </button>
          </div>
          {announcements.map(a => (
            <div key={a.id} className="p-4 bg-slate-800/30 rounded-lg border border-slate-800 flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${a.priority === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold">{a.title}</h3>
                  {a.priority === 'high' && <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/50">긴급</span>}
                  {a.sent && <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/50 flex items-center gap-1"><Check className="w-3 h-3" />발송완료</span>}
                </div>
                <p className="text-sm text-slate-300 mb-1">{a.content}</p>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{a.date}</span>
                  {a.sent && <><span>•</span><span className="flex items-center gap-1"><Bell className="w-3 h-3" />{a.recipients.toLocaleString()}명에게 발송</span></>}
                </div>
              </div>
              <button onClick={() => setAnnouncements(p => p.filter(x => x.id !== a.id))} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h3 className="font-semibold mb-3">알림 통계</h3>
            <div className="grid grid-cols-3 gap-4">
              <div><p className="text-sm text-slate-400 mb-1">총 공지</p><p className="text-2xl font-bold">{announcements.length}</p></div>
              <div><p className="text-sm text-slate-400 mb-1">푸시 발송</p><p className="text-2xl font-bold text-green-400">{announcements.filter(a => a.sent).length}</p></div>
              <div><p className="text-sm text-slate-400 mb-1">도달률</p><p className="text-2xl font-bold text-blue-400">98.5%</p></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
          <h2 className="text-xl font-bold">게임 기본 정보</h2>
          <div>
            <label className={labelCls}>게임 아이콘</label>
            <div className="flex items-start gap-6">
              <div className="w-32 h-32 bg-slate-800 rounded-lg border-2 border-dashed border-slate-700 flex items-center justify-center">
                <div className="text-center text-slate-500"><ImageIcon className="w-12 h-12 mx-auto mb-1 opacity-50" /><p className="text-xs">512x512</p></div>
              </div>
              <button className="flex items-center gap-2 px-3 py-2 border border-slate-700 rounded-md text-sm hover:bg-slate-800 transition-colors mt-2">
                <Upload className="w-4 h-4" /> 아이콘 업로드
              </button>
            </div>
          </div>
          <hr className="border-slate-800" />
          <div><label className={labelCls}>게임 제목 *</label><input defaultValue={game.title} className={inputCls} /></div>
          <div>
            <label className={labelCls}>게임 장르 *</label>
            <select defaultValue="rpg" className={inputCls}>
              {['rpg','action','fps','moba','strategy','simulation','adventure','racing','horror','sports'].map(v => (
                <option key={v} value={v}>{v.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div><label className={labelCls}>게임 특징 소개 *</label><textarea defaultValue="• 압도적인 사이버펑크 그래픽" className={`${inputCls} min-h-32 resize-y`} /></div>
          <div><label className={labelCls}>짧은 설명 *</label><input defaultValue={game.description} maxLength={100} className={inputCls} /></div>
          <hr className="border-slate-800" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={labelCls}><Calendar className="w-4 h-4 inline mr-1" />출시 예정일</label><input type="date" defaultValue="2024-06-15" className={inputCls} /></div>
            <div>
              <label className={labelCls}><Globe className="w-4 h-4 inline mr-1" />공개 여부</label>
              <div className="flex items-center gap-3 mt-2">
                <input type="checkbox" defaultChecked id="public" className="w-4 h-4 accent-green-500" />
                <label htmlFor="public" className="text-sm text-slate-300">베타존에 게임 공개</label>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'media' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div><h2 className="text-xl font-bold">게임 스크린샷</h2><p className="text-sm text-slate-400 mt-1">최대 10개</p></div>
              <button onClick={() => setSsModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm transition-colors">
                <Upload className="w-4 h-4" /> 스크린샷 추가
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {screenshots.map(ss => (
                <div key={ss.id} className="relative group aspect-video bg-slate-800/50 rounded-lg border-2 border-slate-700 flex items-center justify-center">
                  <div className="text-center text-slate-500"><ImageIcon className="w-10 h-10 mx-auto mb-1 opacity-50" /><p className="text-sm">{ss.title}</p></div>
                  <button onClick={() => setScreenshots(p => p.filter(x => x.id !== ss.id))} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-red-500/20 border border-red-500/50 text-red-400 rounded-md transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-400">권장 해상도: 1920x1080px / PNG, JPG (각 최대 5MB)</p>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div><h2 className="text-xl font-bold">게임 플레이 동영상</h2><p className="text-sm text-slate-400 mt-1">최대 5개</p></div>
              <button onClick={() => setVidModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm transition-colors">
                <Plus className="w-4 h-4" /> 동영상 추가
              </button>
            </div>
            <div className="space-y-4">
              {videos.map(v => (
                <div key={v.id} className="p-4 bg-slate-800/30 rounded-lg border border-slate-800 flex items-start gap-4">
                  <div className="w-40 aspect-video bg-slate-800 rounded-lg border-2 border-dashed border-slate-700 flex items-center justify-center flex-shrink-0">
                    <Play className="w-10 h-10 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{v.title}</h3>
                    <p className="text-sm text-slate-400 mb-2">{v.url}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{v.duration}</span>
                      <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{v.views.toLocaleString()} 조회</span>
                    </div>
                  </div>
                  <button onClick={() => setVideos(p => p.filter(x => x.id !== v.id))} className="p-1.5 border border-red-500/50 text-red-400 rounded-md hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'shop' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div><h2 className="text-xl font-bold">게임샵 아이템 관리</h2><p className="text-sm text-slate-400 mt-1">인앱 결제 아이템과 가격을 설정하세요</p></div>
            <button onClick={() => setItemModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm transition-colors">
              <ShoppingBag className="w-4 h-4" /> 아이템 추가
            </button>
          </div>
          {shopItems.map(item => (
            <div key={item.id} className="p-4 bg-slate-800/30 rounded-lg border border-slate-800 flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{item.name}</h3>
                    <span className="text-xs px-2 py-0.5 border border-slate-700 rounded-full">{item.type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${item.active ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-slate-500/20 text-slate-400 border-slate-500/50'}`}>{item.active ? '판매중' : '비활성'}</span>
                  </div>
                  <p className="text-lg font-bold text-green-400 flex items-center gap-1 mb-1"><DollarSign className="w-4 h-4" />{item.price.toLocaleString()} {item.currency}</p>
                  <p className="text-sm text-slate-400">재고: {item.stock} · 판매: {item.sales}개</p>
                  <div className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={item.active} onChange={() => setShopItems(p => p.map(x => x.id === item.id ? { ...x, active: !x.active } : x))} className="w-4 h-4 accent-green-500" />
                    <span className="text-xs text-slate-400">판매 활성화</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1.5 border border-slate-700 rounded-md hover:bg-slate-800"><Edit className="w-4 h-4" /></button>
                <button onClick={() => setShopItems(p => p.filter(x => x.id !== item.id))} className="p-1.5 border border-red-500/50 text-red-400 rounded-md hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h3 className="font-semibold mb-3">판매 통계 (이번 달)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div><p className="text-sm text-slate-400 mb-1">총 판매액</p><p className="text-2xl font-bold text-green-400">₩{shopItems.reduce((s, i) => s + i.price * i.sales, 0).toLocaleString()}</p></div>
              <div><p className="text-sm text-slate-400 mb-1">판매 건수</p><p className="text-2xl font-bold">{shopItems.reduce((s, i) => s + i.sales, 0).toLocaleString()}</p></div>
              <div><p className="text-sm text-slate-400 mb-1">활성 아이템</p><p className="text-2xl font-bold">{shopItems.filter(i => i.active).length} / {shopItems.length}</p></div>
            </div>
          </div>
        </div>
      )}

      <Modal open={ssModal} onClose={() => setSsModal(false)} title="스크린샷 추가">
        <div className="space-y-4">
          <div><label className={labelCls}>제목</label><input placeholder="예: 메인 화면" value={newSs.title} onChange={e => setNewSs({ title: e.target.value })} className={inputCls} /></div>
          <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center cursor-pointer hover:border-slate-600">
            <Upload className="w-10 h-10 mx-auto mb-2 text-slate-400" /><p className="text-sm text-slate-400">클릭하여 이미지 업로드</p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setSsModal(false)} className="px-4 py-2 border border-slate-700 rounded-md text-sm hover:bg-slate-800">취소</button>
            <button onClick={addScreenshot} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm">추가</button>
          </div>
        </div>
      </Modal>

      <Modal open={vidModal} onClose={() => setVidModal(false)} title="동영상 추가">
        <div className="space-y-4">
          <div><label className={labelCls}>제목</label><input placeholder="예: 공식 트레일러" value={newVid.title} onChange={e => setNewVid(p => ({ ...p, title: e.target.value }))} className={inputCls} /></div>
          <div>
            <label className={labelCls}>타입</label>
            <select value={newVid.type} onChange={e => setNewVid(p => ({ ...p, type: e.target.value }))} className={inputCls}>
              <option value="youtube">YouTube</option><option value="upload">직접 업로드</option>
            </select>
          </div>
          {newVid.type === 'youtube'
            ? <div><label className={labelCls}>YouTube URL</label><input placeholder="https://youtube.com/watch?v=..." value={newVid.url} onChange={e => setNewVid(p => ({ ...p, url: e.target.value }))} className={inputCls} /></div>
            : <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center"><Film className="w-10 h-10 mx-auto mb-2 text-slate-400" /><p className="text-sm text-slate-400">MP4 (최대 100MB)</p></div>
          }
          <div className="flex justify-end gap-3">
            <button onClick={() => setVidModal(false)} className="px-4 py-2 border border-slate-700 rounded-md text-sm hover:bg-slate-800">취소</button>
            <button onClick={addVideo} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm">추가</button>
          </div>
        </div>
      </Modal>

      <Modal open={itemModal} onClose={() => setItemModal(false)} title="새 아이템 등록">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>아이템명 *</label><input placeholder="예: 프리미엄 패스" value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} className={inputCls} /></div>
            <div>
              <label className={labelCls}>카테고리 *</label>
              <select value={newItem.type} onChange={e => setNewItem(p => ({ ...p, type: e.target.value }))} className={inputCls}>
                {['패키지','외형','재화','소모품'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className={labelCls}>가격 *</label><input type="number" placeholder="9900" value={newItem.price} onChange={e => setNewItem(p => ({ ...p, price: e.target.value }))} className={inputCls} /></div>
            <div>
              <label className={labelCls}>통화</label>
              <select value={newItem.currency} onChange={e => setNewItem(p => ({ ...p, currency: e.target.value }))} className={inputCls}>
                <option value="KRW">KRW</option><option value="USD">USD</option><option value="EUR">EUR</option>
              </select>
            </div>
            <div><label className={labelCls}>재고</label><input placeholder="무제한" value={newItem.stock} onChange={e => setNewItem(p => ({ ...p, stock: e.target.value }))} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>설명</label><textarea placeholder="아이템 상세 설명" value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} className={`${inputCls} min-h-20 resize-y`} /></div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setItemModal(false)} className="px-4 py-2 border border-slate-700 rounded-md text-sm hover:bg-slate-800">취소</button>
            <button onClick={addItem} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm">등록</button>
          </div>
        </div>
      </Modal>

      <Modal open={notiModal} onClose={() => setNotiModal(false)} title="새 공지사항 작성">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>공지 유형 *</label>
              <select value={newNoti.type} onChange={e => setNewNoti(p => ({ ...p, type: e.target.value }))} className={inputCls}>
                <option value="notice">일반 공지</option><option value="update">업데이트</option>
                <option value="maintenance">점검</option><option value="event">이벤트</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>우선순위 *</label>
              <select value={newNoti.priority} onChange={e => setNewNoti(p => ({ ...p, priority: e.target.value }))} className={inputCls}>
                <option value="high">긴급</option><option value="normal">일반</option><option value="low">낮음</option>
              </select>
            </div>
          </div>
          <div><label className={labelCls}>제목 *</label><input placeholder="공지사항 제목" value={newNoti.title} onChange={e => setNewNoti(p => ({ ...p, title: e.target.value }))} className={inputCls} /></div>
          <div><label className={labelCls}>내용 *</label><textarea placeholder="공지사항 내용을 입력하세요" value={newNoti.content} onChange={e => setNewNoti(p => ({ ...p, content: e.target.value }))} className={`${inputCls} min-h-28 resize-y`} /></div>
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <input type="checkbox" id="sendPush" checked={newNoti.sendPush} onChange={e => setNewNoti(p => ({ ...p, sendPush: e.target.checked }))} className="w-4 h-4 accent-green-500" />
              <label htmlFor="sendPush" className="text-sm font-semibold">푸시 알림 전송</label>
            </div>
            {newNoti.sendPush && (
              <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                <Bell className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-400">{game.testers.toLocaleString()}명의 테스터에게 알림이 전송됩니다</span>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setNotiModal(false)} className="px-4 py-2 border border-slate-700 rounded-md text-sm hover:bg-slate-800">취소</button>
            <button onClick={addAnnouncement} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm">
              <Send className="w-4 h-4" />{newNoti.sendPush ? '발송 및 등록' : '등록'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}