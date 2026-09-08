import { cn } from './utils'

describe('cn', () => {
  it('combina clases y resuelve conflictos de Tailwind', () => {
    expect(cn('p-2', 'p-4', 'text-sm')).toBe('p-4 text-sm')
  })
})
