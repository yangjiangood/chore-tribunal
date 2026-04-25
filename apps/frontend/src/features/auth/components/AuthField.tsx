import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type AuthFieldProps = {
  id: string
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
  hint?: string
  error?: string
}

export function AuthField({
  id,
  label,
  value,
  placeholder,
  onChange,
  type = 'text',
  autoComplete,
  hint,
  error,
}: AuthFieldProps) {
  return (
    <div className="auth-field">
      <div className="auth-field__meta">
        <Label htmlFor={id} className="auth-field__label">
          {label}
        </Label>
        {hint ? <span className="auth-field__hint">{hint}</span> : null}
      </div>
      <Input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={error ? 'auth-field__input is-invalid' : 'auth-field__input'}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p className="auth-field__error">{error}</p> : null}
    </div>
  )
}
