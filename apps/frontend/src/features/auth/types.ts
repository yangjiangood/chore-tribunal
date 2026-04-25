export type AuthMode = 'login' | 'register'

export type AuthFormState = {
  accountName: string
  password: string
  confirmPassword: string
  familyName: string
}

export type AuthFormErrors = Partial<Record<keyof AuthFormState, string>>
