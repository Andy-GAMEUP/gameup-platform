import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string | null
      role: 'developer' | 'player' | 'admin'
      username: string
    }
  }
  interface User {
    role?: string
    username?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    username: string
  }
}
