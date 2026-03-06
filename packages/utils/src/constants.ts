export const CHANNELS = {
  notice: '공지사항',
  general: '일반 질문',
  dev: '개발 질문',
  daily: '일상 이야기',
  'game-talk': '게임 이야기',
  'info-share': '정보공유',
  'new-game': '게임 신작 소개',
} as const

export const USER_ROLES = {
  player: '플레이어',
  developer: '개발자',
  admin: '관리자',
} as const

export const GAME_STATUSES = {
  draft: '초안',
  beta: '베타',
  published: '출시',
  archived: '보관',
} as const

export const APPROVAL_STATUSES = {
  pending: '대기중',
  review: '검토중',
  approved: '승인',
  rejected: '반려',
} as const

export const MEMBER_TYPES = {
  individual: '개인회원',
  corporate: '기업회원',
} as const
