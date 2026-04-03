# 파트너 콘솔 기능 제거

- **작업일:** 2026-03-20
- **사유:** 파트너에게 해당 기능을 제공하지 않기로 결정
- **상태:** 삭제 완료 (백업 보관)

## 삭제된 리소스

### 라우트 그룹: `(partner-console)`
| 파일 | 설명 |
|------|------|
| `apps/web/src/app/(partner-console)/layout.tsx` | 파트너 콘솔 레이아웃 (PartnerLayout 래핑) |
| `apps/web/src/app/(partner-console)/partner-console/page.tsx` | 대시보드 |
| `apps/web/src/app/(partner-console)/partner-console/beta-games/page.tsx` | 베타테스트 게임 관리 |
| `apps/web/src/app/(partner-console)/partner-console/live-games/page.tsx` | 라이브 서비스 게임 관리 |
| `apps/web/src/app/(partner-console)/partner-console/community/page.tsx` | 커뮤니티 관리 |
| `apps/web/src/app/(partner-console)/partner-console/minihome/page.tsx` | 미니홈 관리 |
| `apps/web/src/app/(partner-console)/partner-console/notices/page.tsx` | 공지/알림 |
| `apps/web/src/app/(partner-console)/partner-console/settings/page.tsx` | 설정 |

### 컴포넌트
| 파일 | 설명 |
|------|------|
| `apps/web/src/components/PartnerLayout.tsx` | 파트너 콘솔 전용 사이드바 레이아웃 |

## 백업 위치

```
.backup/partner-console/
├── app-partner-console/    # (partner-console) 라우트 그룹 전체
│   ├── layout.tsx
│   └── partner-console/
│       ├── page.tsx
│       ├── beta-games/
│       ├── live-games/
│       ├── community/
│       ├── minihome/
│       ├── notices/
│       └── settings/
└── PartnerLayout.tsx       # 레이아웃 컴포넌트
```

## 복원 방법

```bash
# 라우트 그룹 복원
cp -r .backup/partner-console/app-partner-console/ apps/web/src/app/\(partner-console\)/

# 레이아웃 컴포넌트 복원
cp .backup/partner-console/PartnerLayout.tsx apps/web/src/components/
```

## 영향 범위

- 프론트엔드만 해당 (백엔드 API 변경 없음)
- `PartnerLayout` 컴포넌트는 `(partner-console)/layout.tsx`에서만 참조되어 다른 코드에 영향 없음
- Navbar 등 다른 컴포넌트에서 `/partner-console` 링크는 존재하지 않음
