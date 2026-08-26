export default function Avatar({ username, role, profileImage, size = 8 }: { username: string; role: string; profileImage?: string; size?: number }) {
  if (profileImage) {
    return (
      <img src={profileImage} alt={username}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size*4, height: size*4 }} />
    )
  }
  const bg = role==='admin'?'bg-violet-600':role==='developer'?'bg-cyan-600':'bg-accent'
  const textColor = role==='admin'||role==='developer' ? 'text-text-primary' : 'text-text-inverse'
  return (
    <div className={`rounded-full flex items-center justify-center font-bold ${textColor} flex-shrink-0 ${bg}`}
      style={{ width: size*4, height: size*4, fontSize: size*1.5 }}>
      {username[0].toUpperCase()}
    </div>
  )
}
