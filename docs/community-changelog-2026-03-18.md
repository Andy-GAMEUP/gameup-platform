# 커뮤니티 서비스 변경사항 및 버그 수정 보고서

**작성일**: 2026-03-18
**버전**: v2.5.1
**작업 범위**: 커뮤니티 페이지 기능 추가 및 종합 점검

---

## 1. 기능 변경사항

### 1-1. 카테고리 탭 순서 변경

- **변경 파일**: `apps/web/src/components/community/CategoryNav.tsx`
- **변경 내용**: 카테고리 탭 순서를 아래와 같이 재배치
  - **변경 전**: 전체 / 베타게임 / 라이브게임 / 자유게시판
  - **변경 후**: 전체 / 신작게임소개 / 베타게임 / 라이브게임 / 자유게시판

```typescript
const CATEGORIES = [
  { value: '', label: '전체' },
  { value: 'new-game-intro', label: '신작게임소개' },
  { value: 'beta-game', label: '베타게임' },
  { value: 'live-game', label: '라이브게임' },
  { value: 'free', label: '자유게시판' },
]
```

---

### 1-2. 신작게임소개 채널 추가 (`new-game-intro`)

- **작성 권한**: 모든 사용자 (player, developer, admin) 작성 가능
- **변경 파일 목록**:

| 파일 | 변경 내용 |
|------|----------|
| `packages/db/src/models/Post.ts` | `channel` enum에 `new-game-intro` 추가 |
| `apps/web/src/components/community/CategoryNav.tsx` | 탭에 '신작게임소개' 추가 |
| `apps/web/src/components/community/PostCard.tsx` | CHANNEL_MAP에 rose 색상 스킴 추가 |
| `apps/web/src/components/pages/CommunityPage.tsx` | 캐러셀/목록에 채널 반영 |
| `apps/web/src/components/pages/CommunityWritePage.tsx` | 카테고리 카드에 추가 (기본 선택) |
| `apps/web/src/components/pages/CommunityPostPage.tsx` | 상세보기 CHANNEL_MAP에 추가 |

- **DB 스키마 변경**:

```typescript
// packages/db/src/models/Post.ts
channel: {
  type: String,
  enum: ['notice', 'new-game-intro', 'beta-game', 'live-game', 'free'],
  default: 'free'
}
```

- **색상 스킴**: `bg-rose-100 text-rose-700 dark:bg-rose-600/30 dark:text-rose-300`

---

### 1-3. 게시글 카드 보기 모드 (대형/중형/소형)

- **변경 파일**: `apps/web/src/components/community/PostCard.tsx`, `apps/web/src/components/pages/CommunityPage.tsx`
- **기능 설명**: 게시글 목록의 카드 크기를 3단계로 전환 가능
- **설정 저장**: `localStorage('community-view-mode')`에 영구 저장

| 모드 | 아이콘 | 레이아웃 | 표시 정보 |
|------|--------|---------|----------|
| **대형** (large) | LayoutGrid | 수직 카드, 전체 썸네일 (aspect-video) | 작성자, 역할배지, 채널, 제목, 본문 미리보기, 조회수, 좋아요, 댓글, 북마크 |
| **중형** (medium) | StretchHorizontal | 수평 카드, 좌측 썸네일 (w-40/w-48) | 채널, 제목, 본문 미리보기, 작성자, 좋아요, 댓글, 북마크 |
| **소형** (small) | List | 컴팩트 리스트, 미니 썸네일 (14x14) | 채널 배지, 제목, 작성자, 시간, 좋아요, 댓글 |

```typescript
export type ViewMode = 'large' | 'medium' | 'small'

// CommunityPage.tsx - 보기 모드 상태 관리
const [viewMode, setViewMode] = useState<ViewMode>(() => {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('community-view-mode') as ViewMode) || 'large'
  }
  return 'large'
})
```

---

### 1-4. 글쓰기 페이지 업데이트

- **변경 파일**: `apps/web/src/components/pages/CommunityWritePage.tsx`
- **변경 내용**:
  - 카테고리 카드 첫 번째에 '신작게임소개' 추가
  - 기본 선택 채널을 `free` -> `new-game-intro`로 변경
  - 그리드 레이아웃: `grid-cols-1 sm:grid-cols-3` -> `grid-cols-2 sm:grid-cols-4`
  - 공지사항은 기존과 동일하게 admin/developer만 접근 가능

---

## 2. 버그 수정

### 2-1. [심각] useEffect 무한 루프 — API 과다 호출 (Rate Limit 429)

- **파일**: `apps/web/src/components/pages/CommunityPostPage.tsx`
- **심각도**: **Critical**
- **증상**: 게시글 상세 페이지 진입 시 댓글 API가 초당 수십 회 반복 호출되어 API 서버 rate limit (429) 발생, 페이지 로딩 실패
- **원인**: `useEffect` 의존성 배열에 `user` 객체를 직접 참조하여 매 렌더링마다 새 참조가 생성되어 무한 루프 발생

```typescript
// 수정 전 (버그)
useEffect(() => { load() }, [id, user])         // Line 106
useEffect(() => { ... }, [post?.author?._id, user])  // Line 119

// 수정 후 (정상)
useEffect(() => { load() }, [id, user?.id])          // Line 107
useEffect(() => { ... }, [post?.author?._id, user?.id])  // Line 120
```

- **영향 범위**: 게시글 상세 페이지 (`/community/:id`)
- **수정 방법**: `user` -> `user?.id`로 변경하여 원시값 비교로 전환 (2곳)

---

### 2-2. [이전 수정] Tailwind CSS 다크모드 클래스 적용 오류

- **파일**: `CommunityPostPage.tsx`, `PostCard.tsx`
- **증상**: 다크모드에서 채널 배지 색상이 부분적으로만 적용
- **원인**: `dark:${variable}` 패턴에서 다중 클래스 문자열의 첫 번째 클래스에만 `dark:` 접두사 적용
- **수정**: 각 클래스에 개별적으로 `dark:` 접두사를 적용한 단일 `className` 필드로 통합

```typescript
// 수정 전
{ color: 'bg-violet-100 text-violet-700', darkColor: 'bg-violet-600/30 text-violet-300' }

// 수정 후
{ className: 'bg-violet-100 text-violet-700 dark:bg-violet-600/30 dark:text-violet-300' }
```

---

### 2-3. [이전 수정] Next.js LCP 이미지 최적화 경고

- **파일**: `PostCard.tsx`, `CommunityPostPage.tsx`
- **증상**: 콘솔에 LCP(Largest Contentful Paint) 이미지 경고
- **수정**: 첫 번째 PostCard 이미지와 상세 페이지 메인 갤러리 이미지에 `priority` prop 추가

---

## 3. 종합 테스트 결과

### 3-1. API 테스트 (curl 직접 호출)

| 테스트 항목 | Admin | Developer | Player | 비로그인 | 결과 |
|------------|-------|-----------|--------|---------|------|
| 게시글 작성 (notice) | ✅ | ✅ | ✅ | ❌ 401 | 정상 |
| 게시글 작성 (new-game-intro) | ✅ | ✅ | ✅ | ❌ 401 | 정상 |
| 게시글 작성 (beta-game) | ✅ | ✅ | ✅ | ❌ 401 | 정상 |
| 게시글 작성 (live-game) | ✅ | ✅ | ✅ | ❌ 401 | 정상 |
| 게시글 작성 (free) | ✅ | ✅ | ✅ | ❌ 401 | 정상 |
| 게시글 상세 조회 | ✅ | ✅ | ✅ | ✅ | 정상 |
| 좋아요 토글 | ✅ | ✅ | ✅ | ❌ 401 | 정상 |
| 좋아요 토글 해제 | ✅ | ✅ | ✅ | - | 정상 |
| 북마크 토글 | ✅ | ✅ | ✅ | ❌ 401 | 정상 |
| 북마크 토글 해제 | ✅ | ✅ | ✅ | - | 정상 |
| 댓글 작성 | ✅ 공식 | ✅ 공식 | ✅ | ❌ 401 | 정상 |
| 대댓글 (답글) | ✅ | ✅ | ✅ | ❌ 401 | 정상 |
| 댓글 좋아요 | ✅ | ✅ | ✅ | ❌ 401 | 정상 |
| 자기 댓글 좋아요 차단 | ❌ 차단 | - | - | - | 정상 |
| 카테고리 필터링 | 전체 32, 신작 6, 베타 4, 라이브 5, 자유 14, 공지 3 | 정상 |
| 정렬 (최신/인기/추천) | ✅ | ✅ | ✅ | ✅ | 정상 |
| 검색 | ✅ 6건 반환 | ✅ | ✅ | ✅ | 정상 |

### 3-2. 프론트엔드 테스트 (Playwright 브라우저)

| 테스트 항목 | 결과 | 비고 |
|------------|------|------|
| 커뮤니티 목록 페이지 로드 | ✅ | 32개 게시글 표시 |
| 카테고리 탭 순서 | ✅ | 전체/신작게임소개/베타게임/라이브게임/자유게시판 |
| 신작게임소개 필터링 | ✅ | 6개 게시글 정확히 표시 |
| 대형 보기 모드 | ✅ | 전체 카드, 썸네일, HOT/동영상 배지 |
| 중형 보기 모드 | ✅ | 수평 레이아웃 |
| 소형 보기 모드 | ✅ | 컴팩트 리스트 |
| 게시글 상세 페이지 | ✅ | 제목, 본문, 태그, 배지 정상 |
| 좋아요 클릭 | ✅ | 2 → 3 즉시 반영 |
| 북마크 클릭 | ✅ | 1 → 2 + 토스트 메시지 표시 |
| 댓글 목록 표시 | ✅ | 3개 (공식 2개 + 답글 1개) |
| 공식 답변 배지 | ✅ | admin=관리자, dev=개발사 |
| 글쓰기 페이지 | ✅ | 4개 카테고리 카드, player에 공지 미표시 |
| 수정/삭제 버튼 | ✅ | 본인 글에만 표시 |
| 신고 버튼 | ✅ | 타인 댓글에만 표시 |
| 콘솔 에러 | ⚠️ | hydration 경고 1건 (다크모드 localStorage, 기능 무관) |

---

## 4. 변경 파일 목록 요약

| 파일 경로 | 변경 유형 | 내용 |
|-----------|----------|------|
| `packages/db/src/models/Post.ts` | 수정 | channel enum에 `new-game-intro` 추가 |
| `apps/web/src/components/community/CategoryNav.tsx` | 수정 | 탭 순서 변경 + 신작게임소개 추가 |
| `apps/web/src/components/community/PostCard.tsx` | 전면 재작성 | 3단 보기 모드 + 신작게임소개 채널 지원 |
| `apps/web/src/components/pages/CommunityPage.tsx` | 수정 | 보기 모드 토글 UI + 상태 관리 추가 |
| `apps/web/src/components/pages/CommunityWritePage.tsx` | 수정 | 신작게임소개 카테고리 카드 + 기본 선택 |
| `apps/web/src/components/pages/CommunityPostPage.tsx` | 수정 | 채널맵 추가 + **useEffect 무한루프 수정** |
| `scripts/restart-all.sh` | 신규 | 전체 개발서버 재시작 스크립트 |
| `package.json` | 수정 | `restart`, `start:all` 명령어 추가 |

---

## 5. 테스트 데이터

테스트를 위해 생성된 더미 게시글 (총 32개):

| 채널 | 게시글 수 | 작성자 |
|------|----------|--------|
| notice | 3 | admin |
| new-game-intro | 6 | admin, testdev, testplayer, Master_admin |
| beta-game | 4 | testdev |
| live-game | 5 | testplayer, Master_admin |
| free | 14 | admin, testplayer, Master_admin, testdev |

---

## 6. 알려진 이슈 (미수정)

| 이슈 | 심각도 | 설명 |
|------|--------|------|
| Hydration 경고 | Low | 다크모드 localStorage로 인한 SSR/CSR 불일치. 기능에 영향 없음 |
| Game.ts TS 에러 | Low | `platform` 속성 타입 오류 (커뮤니티 무관, 기존 이슈) |
| Rate Limiter | Info | API 서버에 15분당 500요청 제한. 개발 중 반복 테스트 시 429 발생 가능. 서버 재시작으로 리셋 |
| `PartnerPostDetailPage.tsx` | Low | `[postId, user]` 의존성에 동일한 무한루프 가능성 (커뮤니티 외 파일) |
