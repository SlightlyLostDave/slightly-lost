export interface FieldNotesConfig {
  label: string
  title: string
  intro: string
}

export const fieldNotes = {
  label: 'Field Notes',
  title: 'Every dispatch, in order.',
  intro:
    'Mine notes, food dispatches, and everything else across all six pillars, filed chronologically rather than sorted. Newest first.',
} as const satisfies FieldNotesConfig
