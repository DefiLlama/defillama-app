import { useXl, useLg } from 'hooks'

export function getAspectRatio() {
    const belowXl = useXl()
    const belowLg = useLg()
    const aspect = belowXl ? (!belowLg ? 60 / 42 : 60 / 22) : 60 / 22
    return aspect
}