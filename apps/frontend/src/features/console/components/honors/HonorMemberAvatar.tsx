import type { Member } from '@/lib/api'

interface HonorMemberAvatarProps {
  member: Pick<Member, 'id' | 'nickname' | 'avatarType' | 'avatarUrl' | 'avatarValue' | 'cardColor'> | null
  size?: 'sm' | 'md' | 'lg'
}

function getAvatarTone(cardColor?: string | null) {
  switch (cardColor) {
    case 'gold-amber':
      return { bg: 'linear-gradient(180deg, rgba(251,191,36,0.32), rgba(245,158,11,0.18))', ring: 'rgba(245,158,11,0.42)' }
    case 'violet-iris':
    case 'slate-indigo':
      return { bg: 'linear-gradient(180deg, rgba(167,139,250,0.32), rgba(99,102,241,0.18))', ring: 'rgba(99,102,241,0.4)' }
    case 'moss-green':
    case 'mint-teal':
    case 'lime-pop':
      return { bg: 'linear-gradient(180deg, rgba(45,212,191,0.28), rgba(16,185,129,0.18))', ring: 'rgba(20,184,166,0.38)' }
    case 'verdict-red':
    case 'rose-pink':
    case 'sunset-orange':
      return { bg: 'linear-gradient(180deg, rgba(251,146,60,0.28), rgba(244,114,182,0.18))', ring: 'rgba(244,114,182,0.36)' }
    default:
      return { bg: 'linear-gradient(180deg, rgba(96,165,250,0.3), rgba(59,130,246,0.16))', ring: 'rgba(96,165,250,0.4)' }
  }
}

export function HonorMemberAvatar({ member, size = 'md' }: HonorMemberAvatarProps) {
  const tone = getAvatarTone(member?.cardColor)
  const sizeClass =
    size === 'lg'
      ? 'console-honor-avatar is-lg'
      : size === 'sm'
        ? 'console-honor-avatar is-sm'
        : 'console-honor-avatar'

  if (!member) {
    return (
      <div
        className={sizeClass}
        style={{
          background: tone.bg,
          boxShadow: `0 0 0 1px ${tone.ring}`,
        }}
      >
        <span>家</span>
      </div>
    )
  }

  return (
    <div
      className={sizeClass}
      style={{
        background: tone.bg,
        boxShadow: `0 0 0 1px ${tone.ring}`,
      }}
    >
      {member.avatarType === 'image' && member.avatarUrl ? (
        <img src={member.avatarUrl} alt={member.nickname} />
      ) : (
        <span>{member.avatarValue ?? member.nickname.slice(0, 1)}</span>
      )}
    </div>
  )
}
