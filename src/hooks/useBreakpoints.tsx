import { sm, med, lg, xl, twoXl } from '~/constants/breakpoints'
import useMedia from './useMedia'

export const useSmall = () => useMedia(`(max-width: ${sm}rem)`)
export const useMed = () => useMedia(`(max-width: ${med}rem)`)
export const useLg = () => useMedia(`(max-width: ${lg}rem)`)
export const useXl = () => useMedia(`(max-width: ${xl}rem)`)

export const useMinLg = () => useMedia(`(min-width: ${lg}rem)`)
export const useMinTwoXl = () => useMedia(`(min-width: ${twoXl}rem)`)
