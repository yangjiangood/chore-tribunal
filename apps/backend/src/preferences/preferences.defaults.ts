export function buildDefaultPreferences(familyId: string) {
  return {
    familyId,
    defaultFullscreen: false,
    soundEnabled: false,
    motionEnabled: true,
    fontScale: 'md',
    themeStyle: 'public-bulletin',
    logSpeed: 'normal',
    cardDensity: 'comfortable',
    idleReminderEnabled: true,
    verdictPersona: '无情裁判长',
    verdictToxicityLevel: 5,
    allowAttack: true,
    allowHumiliation: true,
    allowLabeling: true,
  };
}
