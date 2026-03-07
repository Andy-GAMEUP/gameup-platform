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
          image: data.user.profileImage || null,
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
        ;(user as any).username = data.user.username
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as any).role || 'player'
        token.username = (user as any).username || user.name || ''
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role
        ;(session.user as any).username = token.username
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
