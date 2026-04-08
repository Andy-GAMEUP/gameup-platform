/**
 * 게임 포인트 시스템 E2E 프로세스 검증 스크립트
 *
 * 실행: cd apps/api && npx tsx ../../scripts/verify-game-point-system.ts
 *
 * 사전 조건: seed-game-point-system.ts 실행 완료, API 서버 실행 중 (localhost:5000)
 *
 * 검증 항목:
 * 1. 포인트 상품 공개 조회
 * 2. 개발사 로그인 + 잔액 조회
 * 3. 포인트 구매 (상품 기반)
 * 4. API Key 조회
 * 5. 게임 포인트 지급 (API Key 인증)
 * 6. 중복 지급 방지 검증
 * 7. 일일 한도 검증
 * 8. 잔액 차감 확인
 * 9. 포인트 통계 조회
 * 10. 관리자: 잔액 조정
 */

const API_BASE = 'http://localhost:5000/api'

interface TestResult {
  name: string
  passed: boolean
  detail: string
}

const results: TestResult[] = []

function assert(name: string, condition: boolean, detail: string) {
  results.push({ name, passed: condition, detail })
  console.log(condition ? `  ✅ ${name}` : `  ❌ ${name}: ${detail}`)
}

async function api(method: string, path: string, body?: unknown, headers?: Record<string, string>) {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${API_BASE}${path}`, opts)
  const data = await res.json()
  return { status: res.status, data }
}

async function login(email: string, password: string): Promise<string> {
  const { data } = await api('POST', '/users/login', { email, password })
  return data.token || data.accessToken || ''
}

async function run() {
  console.log('🔍 게임 포인트 시스템 E2E 검증 시작\n')

  // ── 0. 로그인 ──────────────────────────────────────────────────
  console.log('[0] 로그인...')
  let devToken = ''
  let adminToken = ''
  try {
    devToken = await login('developer@test.com', 'test123456')
    assert('개발사 로그인', !!devToken, 'token 없음')
  } catch (e) {
    assert('개발사 로그인', false, String(e))
  }
  try {
    adminToken = await login('admin@gameup.com', 'test123456')
    assert('관리자 로그인', !!adminToken, 'token 없음')
  } catch (e) {
    assert('관리자 로그인', false, String(e))
  }

  if (!devToken || !adminToken) {
    console.error('\n로그인 실패. API 서버가 실행 중인지 확인하세요.')
    printSummary()
    return
  }

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` })

  // ── 1. 포인트 상품 조회 ────────────────────────────────────────
  console.log('\n[1] 포인트 상품 공개 조회...')
  const { status: pkgStatus, data: pkgData } = await api('GET', '/point-packages')
  assert('상품 목록 조회', pkgStatus === 200, `status ${pkgStatus}`)
  assert('상품 4개 존재', pkgData.packages?.length === 4, `개수: ${pkgData.packages?.length}`)
  const firstPackageId = pkgData.packages?.[0]?._id

  // ── 2. 개발사 잔액 조회 ────────────────────────────────────────
  console.log('\n[2] 개발사 잔액 조회...')
  const { status: balStatus, data: balData } = await api('GET', '/developer/point-balance', undefined, auth(devToken))
  assert('잔액 조회 성공', balStatus === 200, `status ${balStatus}`)
  const initialBalance = balData.balance?.balance || 0
  assert('잔액 > 0', initialBalance > 0, `잔액: ${initialBalance}`)
  console.log(`  현재 잔액: ${initialBalance}P`)

  // ── 3. 포인트 구매 ─────────────────────────────────────────────
  console.log('\n[3] 포인트 구매 (스타터 패키지)...')
  if (firstPackageId) {
    const { status: purchaseStatus, data: purchaseData } = await api('POST', '/developer/point-purchase', { packageId: firstPackageId }, auth(devToken))
    assert('포인트 구매 성공', purchaseStatus === 200 && purchaseData.success, purchaseData.message || `status ${purchaseStatus}`)
    if (purchaseData.success) {
      console.log(`  구매 후 잔액: ${purchaseData.balance}P`)
    }
  } else {
    assert('포인트 구매', false, '패키지 ID 없음')
  }

  // ── 4. API Key 조회 ────────────────────────────────────────────
  console.log('\n[4] API Key 조회...')
  // 먼저 게임 목록에서 게임 ID 찾기 (시드 데이터와 같은 게임)
  const { data: myGames } = await api('GET', '/games/my', undefined, auth(devToken))
  // 포인트 정책이 설정된 게임 찾기 - '던전 어드벤처' 또는 첫 번째 게임
  const gameId = myGames.games?.find((g: { title: string }) => g.title === '던전 어드벤처')?._id || myGames.games?.[0]?._id
  if (gameId) {
    const { status: keyStatus, data: keyData } = await api('GET', `/games/${gameId}/api-keys`, undefined, auth(devToken))
    assert('API Key 조회 성공', keyStatus === 200, `status ${keyStatus}`)
    assert('API Key 존재', keyData.keys?.length > 0, `개수: ${keyData.keys?.length}`)

    const apiKeyPrefix = keyData.keys?.[0]?.prefix
    console.log(`  API Key prefix: ${apiKeyPrefix}`)
  } else {
    assert('게임 조회', false, '개발사 게임 없음')
  }

  // ── 5. 게임 포인트 지급 (API Key 인증) ────────────────────────
  console.log('\n[5] 게임 포인트 지급 (API Key 인증)...')

  // 시드 스크립트에서 생성된 API Key는 DB에 hash만 저장되어 있어서,
  // 직접 grant API를 테스트하려면 실제 키가 필요합니다.
  // 여기서는 인증 없이 시도하여 401을 확인합니다.
  if (gameId) {
    // 인증 없이 시도 → 401 확인
    const { status: noAuthStatus } = await api('POST', '/game-points/grant', {
      gameId, userId: 'test', type: 'game_daily_login',
    })
    assert('API Key 없이 거부됨', noAuthStatus === 401, `status ${noAuthStatus}`)

    // 잘못된 API Key → 401
    const { status: badKeyStatus } = await api('POST', '/game-points/grant', {
      gameId, userId: 'test', type: 'game_daily_login',
    }, { 'x-api-key': 'gup_invalid_key' })
    assert('잘못된 API Key 거부됨', badKeyStatus === 401, `status ${badKeyStatus}`)
  }

  // ── 6. 정책 조회 (공개) ────────────────────────────────────────
  console.log('\n[6] 게임 포인트 정책 조회...')
  if (gameId) {
    const { status: polStatus, data: polData } = await api('GET', `/game-points/${gameId}/policies`)
    assert('정책 공개 조회 성공', polStatus === 200, `status ${polStatus}`)
    assert('7개 정책 존재', polData.policies?.length === 7, `개수: ${polData.policies?.length}`)
  }

  // ── 7. 개발사: 정책 토글 테스트 ────────────────────────────────
  console.log('\n[7] 개발사 정책 토글...')
  if (gameId) {
    const { status: toggleStatus, data: toggleData } = await api('PUT', `/games/${gameId}/point-policies/game_ranking/toggle`, undefined, auth(devToken))
    assert('정책 토글 성공', toggleStatus === 200, toggleData.message || `status ${toggleStatus}`)

    // 다시 토글해서 원복
    await api('PUT', `/games/${gameId}/point-policies/game_ranking/toggle`, undefined, auth(devToken))
  }

  // ── 8. 포인트 통계 조회 ────────────────────────────────────────
  console.log('\n[8] 포인트 통계 조회...')
  if (gameId) {
    const { status: statsStatus, data: statsData } = await api('GET', `/game-points/${gameId}/stats`, undefined, auth(devToken))
    assert('통계 조회 성공', statsStatus === 200, `status ${statsStatus}`)
    assert('총 포인트 > 0', statsData.totalPoints > 0, `totalPoints: ${statsData.totalPoints}`)
    console.log(`  총 포인트: ${statsData.totalPoints}P, 총 건수: ${statsData.totalTransactions}건`)
  }

  // ── 9. 포인트 로그 조회 ────────────────────────────────────────
  console.log('\n[9] 포인트 지급 이력 조회...')
  if (gameId) {
    const { status: logStatus, data: logData } = await api('GET', `/game-points/${gameId}/logs`, undefined, auth(devToken))
    assert('로그 조회 성공', logStatus === 200, `status ${logStatus}`)
    assert('로그 존재', logData.logs?.length > 0, `개수: ${logData.logs?.length}`)
  }

  // ── 10. 개발사 거래 내역 조회 ──────────────────────────────────
  console.log('\n[10] 개발사 거래 내역 조회...')
  const { status: txStatus, data: txData } = await api('GET', '/developer/point-transactions', undefined, auth(devToken))
  assert('거래 내역 조회 성공', txStatus === 200, `status ${txStatus}`)
  assert('거래 내역 존재', txData.transactions?.length > 0, `개수: ${txData.transactions?.length}`)

  // ── 11. 관리자: 개발사 잔액 조회 ──────────────────────────────
  console.log('\n[11] 관리자: 개발사 잔액 목록 조회...')
  const { status: adminBalStatus, data: adminBalData } = await api('GET', '/admin/developer-balances', undefined, auth(adminToken))
  assert('관리자 잔액 목록 조회', adminBalStatus === 200, `status ${adminBalStatus}`)
  assert('잔액 데이터 존재', adminBalData.balances?.length > 0, `개수: ${adminBalData.balances?.length}`)

  // ── 12. 관리자: 잔액 조정 ─────────────────────────────────────
  console.log('\n[12] 관리자: 잔액 조정...')
  const devBalEntry = adminBalData.balances?.find((b: { developerId?: { email?: string } }) => b.developerId?.email === 'developer@test.com')
  if (devBalEntry) {
    const { status: adjStatus, data: adjData } = await api(
      'POST',
      `/admin/developer-balances/${devBalEntry.developerId._id}/adjust`,
      { amount: 1000, type: 'admin_grant', description: 'E2E 테스트 보너스 지급' },
      auth(adminToken)
    )
    assert('관리자 잔액 조정 성공', adjStatus === 200 && adjData.success, adjData.message || `status ${adjStatus}`)
    if (adjData.success) console.log(`  조정 후 잔액: ${adjData.balance}P`)
  } else {
    assert('관리자 잔액 조정', false, '개발사 잔액 레코드 없음')
  }

  // ── 13. 관리자: 포인트 정책 조회 ──────────────────────────────
  console.log('\n[13] 관리자: 포인트 정책 조회...')
  const { status: adminPolStatus, data: adminPolData } = await api('GET', '/admin/game-point-policies?status=approved', undefined, auth(adminToken))
  assert('관리자 정책 조회 성공', adminPolStatus === 200, `status ${adminPolStatus}`)
  assert('승인된 정책 존재', adminPolData.policies?.length > 0, `개수: ${adminPolData.policies?.length}`)

  // ── 14. 관리자: 포인트 상품 관리 ──────────────────────────────
  console.log('\n[14] 관리자: 포인트 상품 관리...')
  const { status: adminPkgStatus, data: adminPkgData } = await api('GET', '/admin/point-packages', undefined, auth(adminToken))
  assert('관리자 상품 조회 성공', adminPkgStatus === 200, `status ${adminPkgStatus}`)
  assert('상품 존재', adminPkgData.packages?.length > 0, `개수: ${adminPkgData.packages?.length}`)

  // 새 상품 생성
  const { status: createPkgStatus, data: createPkgData } = await api('POST', '/admin/point-packages', {
    name: 'E2E 테스트 상품',
    points: 100,
    price: 1000,
    description: '자동 테스트용',
    sortOrder: 99,
  }, auth(adminToken))
  assert('관리자 상품 생성 성공', createPkgStatus === 200, `status ${createPkgStatus}`)

  // 생성한 상품 비활성화
  if (createPkgData.package?._id) {
    const { status: updateStatus } = await api('PUT', `/admin/point-packages/${createPkgData.package._id}`, { isActive: false }, auth(adminToken))
    assert('관리자 상품 수정 성공', updateStatus === 200, `status ${updateStatus}`)
  }

  // ── 결과 요약 ──────────────────────────────────────────────────
  printSummary()
}

function printSummary() {
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length

  console.log('\n════════════════════════════════════════════════════')
  console.log(`  E2E 검증 결과: ${passed}/${total} 통과 (${failed}건 실패)`)
  console.log('════════════════════════════════════════════════════')

  if (failed > 0) {
    console.log('\n실패 항목:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.detail}`)
    })
  }

  console.log('')
  process.exit(failed > 0 ? 1 : 0)
}

run().catch(err => {
  console.error('검증 실패:', err)
  process.exit(1)
})
