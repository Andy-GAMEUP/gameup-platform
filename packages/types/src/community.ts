export type CommunityChannel =
  | 'notice'          // 공지사항
  | 'new-game-intro'  // 신작게임소개
  | 'beta-game'       // 베타게임
  | 'live-game'       // 라이브게임
  | 'free'            // 자유게시판

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

export type ScrapType = 'game' | 'community' | 'partner' | 'minihome' | 'solution'

export interface Scrap {
  id: string
  userId: string
  targetId: string
  targetType: ScrapType
  createdAt: Date
}
