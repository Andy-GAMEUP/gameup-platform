import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Kakao from "next-auth/providers/kakao"
import Naver from "next-auth/providers/naver"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const res = await fetch(`${process.env.API_URL || 'http://localhost:5000'}/api/users/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        })
        if (!res.ok) return null
        const data = await res.json()
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.username,
          role: data.user.role,
          adminLevel: data.user.adminLevel || null,
          memberType: data.user.memberType || 'individual',
          approvalStatus: data.user.approvalStatus || 'pending',
          companyInfo: data.user.companyInfo || null,
          image: data.user.profileImage || null,
          level: data.user.level || 1,
          activityScore: data.user.activityScore || 0,
          accessToken: data.token,
        }
      },
    }),
    Kakao({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
    Naver({
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'kakao' || account?.provider === 'naver') {
        const res = await fetch(`${process.env.API_URL || 'http://localhost:5000'}/api/auth/oauth/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: account.provider,
            providerId: account.providerAccountId,
            email: user.email,
            name: user.name,
            image: user.image,
            profile,
          }),
        })
        if (!res.ok) return false
        const data = await res.json()
        user.id = data.user.id
        ;(user as any).role = data.user.role
        ;(user as any).adminLevel = data.user.adminLevel || null
        ;(user as any).memberType = data.user.memberType || 'individual'
        ;(user as any).approvalStatus = data.user.approvalStatus || 'approved'
        ;(user as any).companyInfo = data.user.companyInfo || null
        ;(user as any).username = data.user.username
        ;(user as any).level = data.user.level || 1
        ;(user as any).activityScore = data.user.activityScore || 0
        ;(user as any).accessToken = data.token
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as any).role || 'player'
        token.adminLevel = (user as any).adminLevel || null
        token.memberType = (user as any).memberType || 'individual'
        token.approvalStatus = (user as any).approvalStatus || 'pending'
        token.companyInfo = (user as any).companyInfo || null
        token.username = (user as any).username || user.name || ''
        token.level = (user as any).level || 1
        token.activityScore = (user as any).activityScore || 0
        token.accessToken = (user as any).accessToken || ''
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role
        ;(session.user as any).adminLevel = token.adminLevel
        ;(session.user as any).memberType = token.memberType
        ;(session.user as any).approvalStatus = token.approvalStatus
        ;(session.user as any).companyInfo = token.companyInfo
        ;(session.user as any).username = token.username
        ;(session.user as any).level = token.level
        ;(session.user as any).activityScore = token.activityScore
        ;(session.user as any).accessToken = token.accessToken
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    newUser: '/register',
  },
  session: {
    strategy: 'jwt',
  },
})
