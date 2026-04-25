import { BadgeCheck, LayoutPanelTop, ShieldCheck, Sparkles } from 'lucide-react'

const highlights = [
  {
    icon: LayoutPanelTop,
    title: '一眼看懂榜单',
    description: '打开就能看到谁领跑、谁垫底、谁还没开始动。',
  },
  {
    icon: Sparkles,
    title: 'AI 裁决自动生成',
    description: '每周把真实家务数据汇总成带风格的公开判词。',
  },
  {
    icon: ShieldCheck,
    title: '云端账号统一同步',
    description: '家庭共用一个账号，平板打开就能继续打卡和管理。',
  },
] as const

const quickFacts = ['打卡', '排行', '日志', '裁决']

const signalCards = [
  {
    value: '同一家庭空间',
    label: '成员、规则、排行榜与 AI 裁决全部统一在一个账号体系里。',
  },
  {
    value: '平板横屏优先',
    label: '认证页和主屏采用同一套圆角、玻璃、胶囊按钮和信息块节奏。',
  },
  {
    value: '注册后自动进入',
    label: '不需要额外跳转，创建完成会直接进入当前家庭空间。',
  },
] as const

export function AuthHeroPanel() {
  return (
    <section className="auth-hero-panel">
      <div className="auth-hero-panel__top">
        <div className="auth-hero-panel__badge">
          <BadgeCheck size={16} strokeWidth={2.2} />
          云端账号版已启用
        </div>

        <div className="auth-hero-panel__facts">
          {quickFacts.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>

      <div className="auth-hero-panel__signal-grid">
        {signalCards.map((item) => (
          <article key={item.value} className="auth-hero-panel__signal-card">
            <strong>{item.value}</strong>
            <p>{item.label}</p>
          </article>
        ))}
      </div>

      <div className="auth-hero-panel__bottom">
        <div className="auth-hero-panel__grid">
          {highlights.map((item) => (
            <article key={item.title} className="auth-hero-panel__feature">
              <item.icon size={18} strokeWidth={2.1} />
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="auth-hero-panel__preview">
          <div className="auth-hero-panel__preview-header">
            <span>本周家庭看板</span>
            <small>iPad 横屏友好</small>
          </div>

          <div className="auth-hero-panel__preview-metrics">
            <article>
              <strong>+38</strong>
              <span>本周总积分</span>
            </article>
            <article>
              <strong>12</strong>
              <span>已确认打卡</span>
            </article>
            <article>
              <strong>3</strong>
              <span>活跃成员</span>
            </article>
          </div>
        </div>
      </div>
    </section>
  )
}
