# GameUp MongoDB 백업 운영 가이드

## 개요

- **백업 도구**: `mongodump` (MongoDB 공식 도구, 컨테이너 내장)
- **방식**: Archive + Gzip 단일 압축 파일
- **스케줄**: 매일 03:00 (서버 타임존)
- **보관 정책**:
  - 일간 백업: 최근 **7개** (`/opt/gameup/backups/daily/`)
  - 주간 백업: 일요일 백업 최근 **4개** (`/opt/gameup/backups/weekly/`)

## 디렉토리 구조

```
/opt/gameup/backups/
├── backup.log                # 백업 실행 로그
├── daily/                    # 일간 백업 (최근 7개)
│   ├── gameup_20260421_030000.archive.gz
│   └── ...
└── weekly/                   # 주간 백업 (일요일 기준 최근 4개)
    └── gameup_20260419_030000.archive.gz
```

## 스크립트

### 백업 (자동 실행, 수동 실행도 가능)
```bash
/opt/gameup/scripts/backup-mongodb.sh
```

### 복원 (수동)
```bash
# 백업 파일 목록 보기
/opt/gameup/scripts/restore-mongodb.sh

# 특정 파일로 복원
/opt/gameup/scripts/restore-mongodb.sh /opt/gameup/backups/daily/gameup_20260421_030000.archive.gz
```

## Cron 설정 (서버에서 1회 수행)

```bash
# root crontab 편집
crontab -e

# 아래 줄 추가 (매일 03:00 실행)
0 3 * * * /opt/gameup/scripts/backup-mongodb.sh >> /opt/gameup/backups/cron.log 2>&1
```

## 모니터링

```bash
# 최근 백업 확인
ls -lht /opt/gameup/backups/daily/ | head -5

# 백업 로그 확인
tail -50 /opt/gameup/backups/backup.log

# 디스크 사용량 확인
du -sh /opt/gameup/backups/
```

## 복원 절차 (장애 대응)

1. 서비스 중단 여부 결정 (복원 중 쓰기 작업은 손실됨)
2. 현재 DB 상태 스냅샷 (안전장치): `/opt/gameup/scripts/backup-mongodb.sh`
3. 복원 실행: `/opt/gameup/scripts/restore-mongodb.sh <file>`
4. API 재시작: `docker compose restart api`
5. 동작 확인: https://www.gameup.co.kr

## 향후 개선 과제

- [ ] 원격 저장소 업로드 (S3, NCloud Object Storage 등)
- [ ] 백업 실패 시 알림 (Slack, 이메일)
- [ ] 백업 무결성 자동 검증
- [ ] 증분 백업 전환 (데이터 증가 시)
