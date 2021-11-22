import { useMedia } from 'react-use'
import { sm, med, lg, xl } from 'constants/breakpoints'

export const useSmall = () => useMedia(`(max-width: ${sm}px)`)
export const useMed = () => useMedia(`(max-width: ${med}px)`)
export const useLg = () => useMedia(`(max-width: ${lg}px)`)
export const useXl = () => useMedia(`(max-width: ${xl}px)`)
