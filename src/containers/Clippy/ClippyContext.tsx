import { createContext, useContext, useEffect } from 'react'
import type { ClippyPageContext } from './types'

export interface ClippyChartContext {
	getImage: () => string | null
	availableMetrics: string[]
	activeMetrics: string[]
	toggleMetric: (key: string, enabled: boolean) => void
}

interface ClippyContextValue {
	setPageContext: (ctx: ClippyPageContext | null) => void
	setChartContext: (ctx: ClippyChartContext | null) => void
}

export const ClippyContext = createContext<ClippyContextValue>({
	setPageContext: () => {},
	setChartContext: () => {}
})

export function useSetClippyPageContext(ctx: ClippyPageContext | null) {
	const { setPageContext } = useContext(ClippyContext)

	useEffect(() => {
		setPageContext(ctx)
		return () => {
			setPageContext(null)
		}
	}, [ctx, setPageContext])
}

export function useSetClippyChartContext(ctx: ClippyChartContext | null) {
	const { setChartContext } = useContext(ClippyContext)

	useEffect(() => {
		setChartContext(ctx)
		return () => {
			setChartContext(null)
		}
	}, [ctx, setChartContext])
}
