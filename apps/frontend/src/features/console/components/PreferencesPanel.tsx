import { ShieldAlert, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'

interface PreferenceDraft {
  verdictPersona: string
  verdictToxicityLevel: number
  allowAttack: boolean
  allowHumiliation: boolean
  allowLabeling: boolean
}

interface PasswordDraft {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface PreferencesPanelProps {
  loading: boolean
  preferenceDraft: PreferenceDraft
  passwordDraft: PasswordDraft
  onPreferenceChange: (draft: PreferenceDraft) => void
  onPasswordChange: (draft: PasswordDraft) => void
  onSavePreferences: (event: React.FormEvent<HTMLFormElement>) => void
  onChangePassword: (event: React.FormEvent<HTMLFormElement>) => void
}

export function PreferencesPanel({
  loading,
  preferenceDraft,
  passwordDraft,
  onPreferenceChange,
  onPasswordChange,
  onSavePreferences,
  onChangePassword,
}: PreferencesPanelProps) {
  return (
    <div className="console-page-stack">
      <section className="console-settings-grid">
        <form className="console-settings-card" onSubmit={onSavePreferences}>
          <header className="console-settings-card__header">
            <div>
              <h3>裁决风格</h3>
            </div>
            <Sparkles className="h-4 w-4" />
          </header>

          <div className="console-field">
            <Label htmlFor="verdict-persona">裁判人设</Label>
            <Input
              id="verdict-persona"
              value={preferenceDraft.verdictPersona}
              onChange={(event) =>
                onPreferenceChange({ ...preferenceDraft, verdictPersona: event.target.value })
              }
              className="console-dark-input"
            />
          </div>

          <div className="console-settings-meter">
            <div>
              <span>毒舌强度</span>
              <strong>{preferenceDraft.verdictToxicityLevel} / 10</strong>
            </div>
            <Slider
              min={0}
              max={10}
              step={1}
              value={[preferenceDraft.verdictToxicityLevel]}
              onValueChange={([value]) =>
                onPreferenceChange({ ...preferenceDraft, verdictToxicityLevel: value ?? 0 })
              }
            />
          </div>

          <div className="console-switch-list">
            <label className="console-switch-item">
              <div>
                <strong>允许攻击性吐槽</strong>
              </div>
              <Switch
                checked={preferenceDraft.allowAttack}
                onCheckedChange={(checked) =>
                  onPreferenceChange({ ...preferenceDraft, allowAttack: checked })
                }
              />
            </label>

            <label className="console-switch-item">
              <div>
                <strong>允许公开羞辱</strong>
              </div>
              <Switch
                checked={preferenceDraft.allowHumiliation}
                onCheckedChange={(checked) =>
                  onPreferenceChange({ ...preferenceDraft, allowHumiliation: checked })
                }
              />
            </label>

            <label className="console-switch-item">
              <div>
                <strong>允许贴标签</strong>
              </div>
              <Switch
                checked={preferenceDraft.allowLabeling}
                onCheckedChange={(checked) =>
                  onPreferenceChange({ ...preferenceDraft, allowLabeling: checked })
                }
              />
            </label>
          </div>

          <Button type="submit" variant="primary" disabled={loading}>
            保存风格
          </Button>
        </form>

        <form className="console-settings-card" onSubmit={onChangePassword}>
          <header className="console-settings-card__header">
            <div>
              <h3>密码</h3>
            </div>
            <ShieldAlert className="h-4 w-4" />
          </header>

          <div className="console-field">
            <Label htmlFor="current-password">当前密码</Label>
            <Input
              id="current-password"
              type="password"
              value={passwordDraft.currentPassword}
              onChange={(event) =>
                onPasswordChange({ ...passwordDraft, currentPassword: event.target.value })
              }
              className="console-dark-input"
            />
          </div>

          <div className="console-field">
            <Label htmlFor="new-password">新密码</Label>
            <Input
              id="new-password"
              type="password"
              value={passwordDraft.newPassword}
              onChange={(event) =>
                onPasswordChange({ ...passwordDraft, newPassword: event.target.value })
              }
              className="console-dark-input"
            />
          </div>

          <div className="console-field">
            <Label htmlFor="confirm-password">确认新密码</Label>
            <Input
              id="confirm-password"
              type="password"
              value={passwordDraft.confirmPassword}
              onChange={(event) =>
                onPasswordChange({ ...passwordDraft, confirmPassword: event.target.value })
              }
              className="console-dark-input"
            />
          </div>

          <Button type="submit" variant="primary" disabled={loading}>
            修改密码
          </Button>
        </form>
      </section>
    </div>
  )
}
