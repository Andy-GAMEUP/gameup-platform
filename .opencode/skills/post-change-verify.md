---
name: post-change-verify
description: GAMEUP 플랫폼 변경 후 웹 기능 검증 프로세스. 수정/개발 완료 후 빌드, 브라우저 테스트, 커밋까지의 전체 QA 파이프라인. Trigger: 코드 변경 완료 시, '테스트해줘', '검증해줘', '확인해줘'
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, skill_mcp
---

# Post-Change Verification Skill — GAMEUP Platform

코드 변경 후 웹 기능이 정상 동작하는지 검증하는 표준 프로세스.

## 환경 정보

```
프로젝트: /Users/andy.bae/gameup-platform
API: http://localhost:5000 (Express + MongoDB)
Web: http://localhost:3000 (Next.js App Router)
Build: cd apps/web && npx next build
PATH: export PATH=~/.npm-global/bin:$PATH
```

### 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 관리자 | admin@gameup.com | test123456 |
| 개발자 | developer@test.com | test123456 |
| 플레이어 | player@test.com | test123456 |

---

## Phase 1: 사전 점검 (Pre-Flight)

변경된 파일과 영향 범위를 파악한다.

### 1-1. 서버 상태 확인
```bash
# API 서버 확인 (없으면 재시작)
lsof -ti:5000 >/dev/null 2>&1 || (cd /Users/andy.bae/gameup-platform/apps/api && nohup pnpm dev > /tmp/gameup-api.log 2>&1 &)

# Web 서버 확인 (없으면 재시작)
lsof -ti:3000 >/dev/null 2>&1 || (cd /Users/andy.bae/gameup-platform/apps/web && nohup pnpm dev > /tmp/gameup-web.log 2>&1 &)

# MongoDB 확인
lsof -ti:27017 >/dev/null 2>&1 && echo "MongoDB OK" || echo "MongoDB NOT RUNNING"

# 헬스체크
curl -s http://localhost:5000/api/health
```

### 1-2. 변경 범위 파악
```bash
git diff --name-only   # 변경된 파일 목록
git diff --stat        # 변경 통계
```

**변경 유형별 테스트 범위 결정:**

| 변경 유형 | 필수 테스트 |
|-----------|------------|
| API route/controller | API curl 테스트 + 관련 페이지 브라우저 테스트 |
| Frontend component | 해당 페이지 브라우저 테스트 + console 에러 확인 |
| Service layer (api.ts 등) | 전체 로그인/API 흐름 테스트 |
| Auth 관련 | 3개 역할 모두 로그인 테스트 |
| Admin route | Admin 페이지 접근 + 공개 API 차단 여부 |
| Model/Schema | 관련 CRUD 전체 테스트 |
| Shared package (types/db) | 빌드 + 주요 페이지 스모크 테스트 |

---

## Phase 2: 빌드 검증

### 2-1. Next.js 빌드
```bash
export PATH=~/.npm-global/bin:$PATH
cd /Users/andy.bae/gameup-platform/apps/web && npx next build
```

**PASS 기준**: 빌드 성공, 에러 0건
**FAIL 시**: 빌드 에러 수정 후 Phase 2 재실행

---

## Phase 3: 브라우저 테스트 (Playwright MCP)

`skill_mcp(mcp_name="playwright")` 도구를 사용한다.

### 3-1. 변경된 기능의 직접 테스트

변경된 기능에 해당하는 페이지를 직접 테스트한다.

**기본 테스트 흐름:**
1. `browser_navigate` → 해당 페이지로 이동
2. `browser_snapshot` → 페이지 구조 확인 (렌더링 정상 여부)
3. `browser_console_messages(level="error")` → 콘솔 에러 0건 확인
4. 주요 인터랙션 테스트 (클릭, 폼 입력, 제출 등)
5. `browser_network_requests` → API 호출 성공 여부 확인

### 3-2. 역할별 접근 테스트

변경 범위에 따라 필요한 역할로 로그인하여 테스트한다.

**로그인 방법 (빠른 테스트 계정 버튼 활용):**
1. `browser_navigate` → `http://localhost:3000/login`
2. 역할 버튼 클릭 ("관리자" / "개발자" / "플레이어")
3. "로그인" 버튼 클릭

**역할별 확인 사항:**

| 역할 | 확인 사항 |
|------|----------|
| 개발자 | 개발자 센터 접근, 미니홈 생성, 파트너 글 작성 |
| 플레이어 | 게임 목록, 커뮤니티, 개발자 전용 기능 숨김 확인 |
| 관리자 | 관리자 대시보드, 관리 페이지 CRUD |

### 3-3. 스모크 테스트 (주요 페이지)

변경과 무관하게 주요 페이지가 깨지지 않았는지 확인한다.

**필수 스모크 테스트 페이지:**
```
/ (홈)
/games (게임 목록)
/community (커뮤니티)
/minihome (미니홈 디렉토리)
/login (로그인)
/dashboard (개발자 대시보드) — 개발자 로그인 필요
/admin (관리자 대시보드) — 관리자 로그인 필요
```

**각 페이지 검증 기준:**
- [ ] 페이지 렌더링 완료 (로딩 스피너 없음)
- [ ] console error 0건
- [ ] 주요 UI 요소 존재 확인 (heading, button 등)
- [ ] API 호출 성공 (network 200)

### 3-4. 테스트 완료 후 브라우저 닫기
```
browser_close
```

---

## Phase 4: API 검증 (변경 범위에 따라)

API route를 변경한 경우 curl로 직접 검증한다.

### 4-1. 공개 API 접근성
```bash
curl -s http://localhost:5000/api/health           # 200 OK
curl -s 'http://localhost:5000/api/minihome?page=1&limit=5'  # 200 OK (public)
curl -s 'http://localhost:5000/api/community/posts?page=1&limit=5'  # 200 OK (public)
```

### 4-2. 인증 필요 API
```bash
# 인증 없이 접근 시 401 확인
curl -s http://localhost:5000/api/admin/minihome -w "\n%{http_code}" | tail -1  # 401
```

### 4-3. API 서버 재시작 (route 파일 변경 시)
```bash
kill $(lsof -ti:5000) 2>/dev/null
cd /Users/andy.bae/gameup-platform/apps/api && nohup pnpm dev > /tmp/gameup-api.log 2>&1 &
sleep 3
curl -s http://localhost:5000/api/health  # 서버 정상 확인
```

---

## Phase 5: 결과 정리 및 커밋

### 5-1. 테스트 결과 요약 테이블 작성

```markdown
| 테스트 항목 | 결과 | 비고 |
|------------|------|------|
| Next.js 빌드 | ✅/❌ | |
| 변경 기능 테스트 | ✅/❌ | |
| 콘솔 에러 | 0건 / N건 | |
| API 검증 | ✅/❌ | |
| 스모크 테스트 | ✅/❌ | |
```

### 5-2. 커밋 (사용자 요청 시에만)
```bash
export CI=true GIT_PAGER=cat PAGER=cat GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never GIT_EDITOR=: EDITOR=: VISUAL='' GIT_SEQUENCE_EDITOR=: GIT_MERGE_AUTOEDIT=no
git add -A && git commit -m "커밋 메시지"
```

**커밋 메시지 컨벤션:**
- `feat:` 새 기능
- `fix:` 버그 수정
- `refactor:` 리팩토링
- `chore:` 설정/빌드 변경
- `docs:` 문서 변경

---

## 버그 발견 시 대응

1. **즉시 수정 가능** (단순 오타, 누락 등) → 수정 후 Phase 2부터 재실행
2. **조사 필요** (원인 불명) → 버그 내용 기록, 사용자에게 보고
3. **변경 범위 외 기존 버그** → "기존 이슈" 로 기록, 현재 변경과 분리

---

## 체크리스트 (최종 확인)

- [ ] 빌드 성공
- [ ] 변경된 기능 브라우저 테스트 통과
- [ ] console error 0건
- [ ] 기존 주요 페이지 깨짐 없음
- [ ] API 엔드포인트 정상 응답
- [ ] 테스트 결과 요약 사용자에게 보고
