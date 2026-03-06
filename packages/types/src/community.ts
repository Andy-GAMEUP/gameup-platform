export type CommunityChannel =
  | 'notice'       // 공지사항
  | 'general'      // 일반 질문
  | 'dev'          // 개발 질문
  | 'daily'        // 일상 이야기
  | 'game-talk'    // 게임 이야기
  | 'info-share'   // 정보공유
  | 'new-game'     // 게임 신작 소개

export interface Post {
  id: string
  authorId: string
  channel: CommunityChannel
  title: string
  content: string
  hashtags: string[]
  viewCount: number
  likeCount: number
  commentCount: number
  isTempSave: boolean
  isPublished: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Comment {
  id: string
  postId: string
  authorId: string
  parentId?: string
  content: string
  likeCount: number
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
}

export type ScrapType = 'community' | 'partner' | 'minihome' | 'solution'

export interface Scrap {
  id: string
  userId: string
  targetId: string
  targetType: ScrapType
  createdAt: Date
}
