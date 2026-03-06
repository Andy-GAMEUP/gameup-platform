'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card'
import Input from '@/components/Input'
import Button from '@/components/Button'
import Badge from '@/components/Badge'
import {
  User,
  Bell,
  Lock,
  CreditCard,
  Save,
  Mail,
  Check,
} from 'lucide-react'

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)
  
  // Profile settings
  const [profile, setProfile] = useState({
    companyName: '개발사명',
    email: 'developer@game.com',
    phone: '010-1234-5678',
    website: 'https://company.com',
    description: '게임 개발을 사랑하는 팀입니다.',
  })

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNewFeedback: true,
    emailGameApproval: true,
    emailWeeklyReport: true,
    pushNewTester: false,
    pushNewFeedback: true,
  })

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: API call to save profile
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: API call to save notifications
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2 text-white">설정</h1>
        <p className="text-slate-400">계정 및 알림 설정을 관리하세요</p>
      </div>

      {saved && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-400" />
          <span className="text-green-400 font-medium">변경사항이 저장되었습니다.</span>
        </div>
      )}

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-green-400" />
            <CardTitle>프로필 정보</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="회사명"
                type="text"
                value={profile.companyName}
                onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                required
              />
              <Input
                label="이메일"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                required
              />
              <Input
                label="전화번호"
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
              <Input
                label="웹사이트"
                type="url"
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                회사 소개
              </label>
              <textarea
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                rows={4}
                value={profile.description}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                placeholder="회사에 대해 간단히 소개해주세요..."
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                저장
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-yellow-400" />
            <CardTitle>알림 설정</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveNotifications} className="space-y-6">
            {/* Email Notifications */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-400" />
                이메일 알림
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
                  <div>
                    <p className="font-medium text-white">새 피드백 알림</p>
                    <p className="text-sm text-slate-400">새로운 피드백이 등록되면 이메일로 알려드립니다</p>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-slate-600 text-green-600 focus:ring-green-500 focus:ring-offset-slate-900"
                    checked={notifications.emailNewFeedback}
                    onChange={(e) => setNotifications({ ...notifications, emailNewFeedback: e.target.checked })}
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
                  <div>
                    <p className="font-medium text-white">게임 승인 알림</p>
                    <p className="text-sm text-slate-400">게임 심사 결과를 이메일로 받습니다</p>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-slate-600 text-green-600 focus:ring-green-500 focus:ring-offset-slate-900"
                    checked={notifications.emailGameApproval}
                    onChange={(e) => setNotifications({ ...notifications, emailGameApproval: e.target.checked })}
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
                  <div>
                    <p className="font-medium text-white">주간 리포트</p>
                    <p className="text-sm text-slate-400">매주 월요일 성과 리포트를 받습니다</p>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-slate-600 text-green-600 focus:ring-green-500 focus:ring-offset-slate-900"
                    checked={notifications.emailWeeklyReport}
                    onChange={(e) => setNotifications({ ...notifications, emailWeeklyReport: e.target.checked })}
                  />
                </label>
              </div>
            </div>

            {/* Push Notifications */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-400" />
                푸시 알림
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
                  <div>
                    <p className="font-medium text-white">새 테스터 참여</p>
                    <p className="text-sm text-slate-400">새로운 테스터가 게임에 참여하면 알려드립니다</p>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-slate-600 text-green-600 focus:ring-green-500 focus:ring-offset-slate-900"
                    checked={notifications.pushNewTester}
                    onChange={(e) => setNotifications({ ...notifications, pushNewTester: e.target.checked })}
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
                  <div>
                    <p className="font-medium text-white">새 피드백</p>
                    <p className="text-sm text-slate-400">새로운 피드백이 등록되면 푸시 알림을 받습니다</p>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-slate-600 text-green-600 focus:ring-green-500 focus:ring-offset-slate-900"
                    checked={notifications.pushNewFeedback}
                    onChange={(e) => setNotifications({ ...notifications, pushNewFeedback: e.target.checked })}
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                저장
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-red-400" />
            <CardTitle>보안</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-white mb-2">비밀번호 변경</h3>
              <p className="text-sm text-slate-400 mb-4">보안을 위해 주기적으로 비밀번호를 변경하세요</p>
              <Button variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
                비밀번호 변경
              </Button>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <h3 className="font-semibold text-white mb-2">2단계 인증</h3>
              <p className="text-sm text-slate-400 mb-4">계정을 더욱 안전하게 보호합니다</p>
              <Badge variant="secondary">비활성</Badge>
              <Button variant="outline" className="ml-4 border-slate-700 text-white hover:bg-slate-800">
                활성화
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-green-400" />
            <CardTitle>결제 정보</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-white mb-2">정산 계좌</h3>
              <p className="text-sm text-slate-400 mb-4">게임 수익을 받을 계좌 정보를 등록하세요</p>
              <Button variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
                계좌 등록
              </Button>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <h3 className="font-semibold text-white mb-2">사업자 정보</h3>
              <p className="text-sm text-slate-400 mb-4">사업자 등록증을 업로드하세요 (선택사항)</p>
              <Button variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
                업로드
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500/50">
        <CardHeader>
          <CardTitle className="text-red-400">위험 구역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-white mb-2">계정 탈퇴</h3>
              <p className="text-sm text-slate-400 mb-4">
                계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다
              </p>
              <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                계정 탈퇴
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
