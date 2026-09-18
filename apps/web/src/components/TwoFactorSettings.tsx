'use client'
import { useEffect, useState } from 'react'
import { ShieldCheck, ShieldOff, Loader2, Copy, Check, Eye, EyeOff } from 'lucide-react'
import { authService } from '@/services/authService'
import Modal from './Modal'
import AlertModal from './AlertModal'

type Step = 'idle' | 'qr' | 'backupCodes'

// 플레이어/기업/관리자 마이페이지 보안 탭 공용 — 구글 OTP(TOTP) 2단계 인증을 본인이 켜고 끄는 위젯
export default function TwoFactorSettings() {
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)

  const [step, setStep] = useState<Step>('idle')
  const [setupData, setSetupData] = useState<{ secret: string; qrCode: string } | null>(null)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  const [disableModal, setDisableModal] = useState(false)
  const [disablePw, setDisablePw] = useState('')
  const [showDisablePw, setShowDisablePw] = useState(false)
  const [disableError, setDisableError] = useState('')
  const [disabling, setDisabling] = useState(false)

  useEffect(() => {
    authService.getProfile()
      .then((data) => setEnabled(!!(data.user ?? data)?.twoFactorEnabled))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleStartSetup = async () => {
    setSubmitting(true)
    try {
      const data = await authService.setup2FA()
      setSetupData({ secret: data.secret, qrCode: data.qrCode })
      setCode('')
      setCodeError('')
      setStep('qr')
    } catch (err: any) {
      setAlertMessage(err?.response?.data?.message || '2단계 인증 설정을 시작하지 못했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmCode = async () => {
    if (!code.trim()) { setCodeError('인증 코드를 입력해주세요'); return }
    setSubmitting(true)
    setCodeError('')
    try {
      const data = await authService.enable2FA(code.trim())
      setBackupCodes(data.backupCodes)
      setStep('backupCodes')
      setEnabled(true)
    } catch (err: any) {
      setCodeError(err?.response?.data?.message || '인증 코드가 올바르지 않습니다')
    } finally {
      setSubmitting(false)
    }
  }

  const closeAll = () => {
    setStep('idle')
    setSetupData(null)
    setCode('')
    setCodeError('')
    setBackupCodes([])
    setCopied(false)
  }

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'))
    setCopied(true)
  }

  const handleDisable = async () => {
    if (!disablePw) { setDisableError('비밀번호를 입력해주세요'); return }
    setDisabling(true)
    setDisableError('')
    try {
      await authService.disable2FA(disablePw)
      setEnabled(false)
      setDisableModal(false)
      setDisablePw('')
    } catch (err: any) {
      setDisableError(err?.response?.data?.message || '비밀번호가 올바르지 않습니다')
    } finally {
      setDisabling(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-bg-secondary border border-line rounded-2xl p-6 flex items-center justify-center h-24">
        <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
      </div>
    )
  }

  return (
    <div className="bg-bg-secondary border border-line rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-line">
        <h2 className="text-lg font-semibold">2단계 인증 (OTP)</h2>
      </div>
      <p className="text-text-secondary text-sm mb-4">
        {enabled
          ? '2단계 인증이 활성화되어 있습니다. 로그인 시 인증 앱의 6자리 코드가 추가로 필요합니다.'
          : '2단계 인증을 통해서 보안을 강화하세요.'}
      </p>

      {enabled ? (
        <button
          onClick={() => setDisableModal(true)}
          className="flex items-center gap-2 border border-red-600 text-red-400 hover:bg-red-950 px-4 py-2 rounded-lg text-base font-medium transition-colors"
        >
          <ShieldOff className="w-4 h-4" /> 사용 해제
        </button>
      ) : (
        <button
          onClick={handleStartSetup}
          disabled={submitting}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-text-inverse px-5 py-2.5 rounded-lg text-base font-medium transition-colors disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          2단계 인증 사용
        </button>
      )}

      {/* QR 스캔 + 코드 확인 */}
      <Modal isOpen={step === 'qr'} onClose={closeAll} title="2단계 인증 설정" size="sm">
        <div className="-mt-3">
          <div className="pb-2 border-b border-line space-y-3">
            <div>
              <p className="font-semibold text-text-primary mb-1.5">2단계 인증(OTP)이란?</p>
              <ul className="text-xs text-text-secondary space-y-1 list-disc pl-4">
                <li>고정된 비밀번호 대신 무작위로 생성되는 일회용 비밀번호를 이용하여 인증하는 방식입니다.</li>
                <li>안드로이드/iOS 스마트폰 기기에서 인증 앱을 통해 등록이 가능합니다.</li>
                <li>등록하면 로그인 시 비밀번호와 함께 인증 앱의 6자리 코드를 추가로 입력해야 합니다.</li>
              </ul>
            </div>
            <div className="pt-3 border-t border-line">
              <p className="text-sm text-text-primary mb-1.5">① 인증 앱을 스마트폰에 설치하세요.</p>
              <div className="flex flex-wrap items-center gap-2">
                <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
                   target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/google-play-badge.png" alt="Google Play에서 받기" className="h-10 w-auto" />
                </a>
                <a href="https://apps.apple.com/app/google-authenticator/id388497605"
                   target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/app-store-badge.svg" alt="App Store에서 받기" className="h-10 w-auto" />
                </a>
              </div>
            </div>
            <p className="text-sm text-text-primary">
              ② Google Authenticator 앱에서 <strong>‘계정 추가’ → ‘바코드 스캔’</strong>을 이용하여 아래 QR코드를 스캔하세요.
            </p>
          </div>
          {setupData && (
            <>
              <div className="flex justify-center bg-white rounded-lg p-2 mt-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={setupData.qrCode} alt="2FA QR code" className="w-48 h-48" />
              </div>
              <div className="mt-4">
                <p className="text-sm text-text-secondary mb-1">QR을 스캔할 수 없다면 수동으로 입력하세요</p>
                <p className="font-mono text-text-primary text-xs bg-bg-tertiary border border-line rounded-lg px-3 py-2 select-all break-all">
                  {setupData.secret}
                </p>
              </div>
            </>
          )}
          <div className="mt-4">
            <label className="block text-sm font-medium text-text-secondary mb-1.5">인증 코드</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmCode()}
              placeholder="6자리 숫자"
              className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 text-text-primary tracking-widest focus:outline-none focus:border-accent transition-colors"
            />
            {codeError && <p className="text-red-400 text-xs mt-1.5">{codeError}</p>}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={closeAll} className="px-4 py-2 text-base text-text-secondary border border-line rounded-lg hover:bg-bg-tertiary transition-colors">
              취소
            </button>
            <button
              onClick={handleConfirmCode}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 text-base bg-accent hover:bg-accent-hover text-text-inverse rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              확인
            </button>
          </div>
        </div>
      </Modal>

      {/* 백업 코드 발급 안내 */}
      <Modal isOpen={step === 'backupCodes'} onClose={closeAll} title="백업 코드 저장" size="sm" disableBackdropClose>
        <div className="space-y-4">
          <p className="text-text-secondary text-sm">
            2단계 인증이 활성화되었습니다. 인증 앱을 분실했을 때를 대비해 아래 백업 코드를 안전한 곳에 저장해주세요. 코드 1개당 1회만 사용할 수 있고, <strong>이 화면을 벗어나면 다시 볼 수 없습니다.</strong>
          </p>
          <div className="grid grid-cols-2 gap-2 bg-bg-tertiary border border-line rounded-lg p-3 font-mono text-sm text-text-primary">
            {backupCodes.map((c) => <span key={c} className="select-all">{c}</span>)}
          </div>
          <button
            onClick={handleCopyBackupCodes}
            className="w-full flex items-center justify-center gap-2 border border-line text-text-secondary hover:text-text-primary hover:bg-bg-tertiary px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? '복사되었습니다' : '전체 복사'}
          </button>
          <button
            onClick={closeAll}
            className="w-full px-4 py-2.5 text-base bg-accent hover:bg-accent-hover text-text-inverse rounded-lg font-medium transition-colors"
          >
            저장했습니다, 닫기
          </button>
        </div>
      </Modal>

      {/* 사용 해제 (비밀번호 확인) */}
      {disableModal && (
        <div className="fixed inset-0 bg-bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-red-800/50 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <ShieldOff className="w-6 h-6 text-red-400" />
              <h3 className="text-lg font-bold text-red-300">2단계 인증을 해제하시겠습니까?</h3>
            </div>
            <p className="text-text-secondary text-sm mb-5">
              해제하면 로그인 시 비밀번호만으로 로그인할 수 있습니다. 계속하려면 현재 비밀번호를 입력해주세요.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-1.5">비밀번호 확인</label>
              <div className="relative">
                <input
                  type={showDisablePw ? 'text' : 'password'}
                  value={disablePw}
                  onChange={(e) => setDisablePw(e.target.value)}
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 pr-10 text-text-primary focus:outline-none focus:border-red-500"
                  placeholder="현재 비밀번호 입력"
                  onKeyDown={(e) => e.key === 'Enter' && handleDisable()}
                />
                <button onClick={() => setShowDisablePw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                  {showDisablePw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {disableError && <p className="text-red-400 text-xs mt-1.5">{disableError}</p>}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setDisableModal(false); setDisablePw(''); setDisableError('') }}
                className="px-4 py-2 text-base text-text-secondary border border-line rounded-lg hover:bg-bg-tertiary transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDisable}
                disabled={disabling}
                className="flex items-center gap-2 px-4 py-2 text-base bg-red-700 hover:bg-red-800 text-text-primary rounded-lg transition-colors disabled:opacity-50"
              >
                {disabling ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
                해제 확인
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertModal isOpen={!!alertMessage} message={alertMessage || ''} onConfirm={() => setAlertMessage(null)} />
    </div>
  )
}
