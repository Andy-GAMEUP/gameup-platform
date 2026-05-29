/** 게임 등록/미니홈 폼에서 사용하는 장르 목록 */
export const FORM_GENRES: string[] = ['RPG', '액션', 'FPS', '전략', '퍼즐', '스포츠', '레이싱', '어드벤처', '시뮬레이션', '호러', '기타']

/** 게임 목록 필터에서 사용하는 장르 목록 ('전체' 포함) */
export const FILTER_GENRES: string[] = ['전체', 'RPG', '액션', 'FPS', '전략', '퍼즐', '스포츠', '레이싱', '어드벤처', '시뮬레이션']

/** 프로필 설정에서 사용하는 장르 목록 */
export const PROFILE_GENRES: string[] = [
  '액션', 'RPG', '전략', '퍼즐', '스포츠', '레이싱',
  '어드벤처', '시뮬레이션', '호러', '인디', '아케이드', 'FPS',
]

/** 게임 등록 폼에서 사용하는 플랫폼 목록 */
export const FORM_PLATFORMS: string[] = ['iOS', 'Android', 'PC']

/** 게등위 등급 배지 스타일 */
export const RATING_BADGE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  '전체이용가':     { bg: 'bg-green-600/20 border border-green-500/50',   text: 'text-green-300',  label: '전체' },
  '12세이용가':     { bg: 'bg-lime-600/20 border border-lime-500/50',     text: 'text-lime-300',   label: '12세' },
  '15세이용가':     { bg: 'bg-blue-600/20 border border-blue-500/50',     text: 'text-blue-300',   label: '15세' },
  '18세이용가':     { bg: 'bg-orange-600/20 border border-orange-500/50', text: 'text-orange-300', label: '18세' },
  '청소년이용불가':  { bg: 'bg-red-700/20 border border-red-600/50',       text: 'text-red-300',    label: '청불' },
}
