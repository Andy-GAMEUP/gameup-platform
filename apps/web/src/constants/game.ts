/** 전체 장르 목록 (단일 상수) */
export const GENRES: string[] = ['RPG', '액션', 'FPS', '전략', '퍼즐', '스포츠', '레이싱', '어드벤처', '시뮬레이션', '호러', '기타']

/** 게임 등록/미니홈 폼에서 사용하는 장르 목록 */
export const FORM_GENRES: string[] = GENRES

/** 게임 목록 필터에서 사용하는 장르 목록 ('전체' 포함) */
export const FILTER_GENRES: string[] = ['전체', ...GENRES]

/** 프로필 설정에서 사용하는 장르 목록 */
export const PROFILE_GENRES: string[] = GENRES

/** 게임 등록 폼에서 사용하는 플랫폼 목록 */
export const FORM_PLATFORMS: string[] = ['iOS', 'Android', 'PC']

/** 게등위 등급 배지 스타일 */
export const RATING_BADGE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  '전체이용가':     { bg: 'bg-green-600/20 border border-green-500/50',   text: 'text-green-300',  label: '전체' },
  '12세이용가':     { bg: 'bg-lime-600/20 border border-lime-500/50',     text: 'text-lime-300',   label: '12세' },
  '15세이용가':     { bg: 'bg-blue-600/20 border border-blue-500/50',     text: 'text-blue-300',   label: '15세' },
  '청소년이용불가':  { bg: 'bg-red-700/20 border border-red-600/50',       text: 'text-red-300',    label: '19' },
}

/** 게등위 등급별 안내 문구 */
export const RATING_DESCRIPTIONS: Record<string, string> = {
  '전체이용가': '이 게임은 모든 연령의 이용자가 구매 및 이용이 가능합니다.',
  '12세이용가': '본 게임은 만 12세 이상 이용자만 구매 및 이용이 가능합니다.',
  '15세이용가': '본 게임은 만 15세 이상 이용자만 구매 및 이용이 가능합니다.',
  '청소년이용불가': '본 게임은 청소년이용불가 게임물로, 만 19세 이상 이용자만 구매 및 이용이 가능합니다.',
}

/** 게등위 등급 아이콘 (연령 등급 선택용, /public/rating-icons) */
export const RATING_CLASS_ICON: Record<string, string> = {
  '전체이용가': '/rating-icons/all.png',
  '12세이용가': '/rating-icons/age12.png',
  '15세이용가': '/rating-icons/age15.png',
  '청소년이용불가': '/rating-icons/age19.png',
}

/** 게등위 게임 심의 요소 아이콘 (다중 선택용) */
export const CONTENT_DESCRIPTORS: { key: string; label: string; icon: string }[] = [
  { key: 'violence', label: '폭력성', icon: '/rating-icons/violence.png' },
  { key: 'sexual', label: '선정성', icon: '/rating-icons/sexual.png' },
  { key: 'drugs', label: '약물', icon: '/rating-icons/drugs.png' },
  { key: 'horror', label: '공포', icon: '/rating-icons/horror.png' },
  { key: 'crime', label: '범죄', icon: '/rating-icons/crime.png' },
  { key: 'gambling', label: '사행성', icon: '/rating-icons/gambling.png' },
  { key: 'language', label: '언어의 부적절성', icon: '/rating-icons/language.png' },
]
