import { useRouter } from 'next/router'
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { tabs } from '~/containers/ProtocolOverview/Layout'
import { slug } from '~/utils'
import { ClippyButton } from './ClippyButton'
import { ClippyChat } from './ClippyChat'
import { ClippyContext } from './ClippyContext'
import type { ClippyChartContext } from './ClippyContext'
import type { ClippyPageContext } from './types'
import { useClippy } from './useClippy'

export function ClippyProvider({ children }: { children: React.ReactNode }) {
	const [pageContext, setPageContext] = useState<ClippyPageContext | null>(null)
	const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const chartContextRef = useRef<ClippyChartContext | null>(null)

	const stableSetPageContext = useCallback((ctx: ClippyPageContext | null) => {
		if (ctx) {
			if (clearTimerRef.current) {
				clearTimeout(clearTimerRef.current)
				clearTimerRef.current = null
			}
			setPageContext(ctx)
		} else {
			clearTimerRef.current = setTimeout(() => {
				setPageContext(null)
			}, 500)
		}
	}, [])

	const stableSetChartContext = useCallback((ctx: ClippyChartContext | null) => {
		chartContextRef.current = ctx
	}, [])

	const contextValue = useMemo(
		() => ({ setPageContext: stableSetPageContext, setChartContext: stableSetChartContext }),
		[stableSetPageContext, stableSetChartContext]
	)

	return (
		<ClippyContext.Provider value={contextValue}>
			{children}
			{pageContext && <ClippyInner pageContext={pageContext} chartContextRef={chartContextRef} />}
		</ClippyContext.Provider>
	)
}

function ClippyInner({
	pageContext,
	chartContextRef
}: {
	pageContext: ClippyPageContext
	chartContextRef: React.RefObject<ClippyChartContext | null>
}) {
	const router = useRouter()
	const [isOpen, setIsOpen] = useState(false)
	const [highlightTargets, setHighlightTargets] = useState<string[]>([])
	const [pageValues, setPageValues] = useState<Record<string, Record<string, string>>>({})

	useEffect(() => {
		const timeout = setTimeout(() => {
			const elements = document.querySelectorAll('[data-highlight]')
			const targets: string[] = []
			const values: Record<string, Record<string, string>> = {}
			elements.forEach((el) => {
				const target = el.getAttribute('data-highlight')!
				targets.push(target)
				const rawValue = el.getAttribute('data-highlight-value')
				if (rawValue) {
					try {
						values[target] = JSON.parse(rawValue)
					} catch {}
				}
			})
			setHighlightTargets(targets)
			setPageValues(values)
		}, 100)
		return () => clearTimeout(timeout)
	}, [router.asPath])

	const handleHighlight = useCallback((target: string) => {
		const el = document.querySelector(`[data-highlight="${target}"]`)
		if (!el) return
		if (el instanceof HTMLDetailsElement) {
			el.open = true
		}
		el.scrollIntoView({ behavior: 'smooth', block: 'center' })
		el.classList.add('clippy-highlight')
		setTimeout(() => el.classList.remove('clippy-highlight'), 5000)
	}, [])

	const handleNavigate = useCallback(
		(target: string) => {
			const tab = tabs[target as keyof typeof tabs]
			if (!tab) return
			const entityName = pageContext.entity?.name
			if (!entityName) return
			router.push(`${tab.route}/${slug(entityName)}`)
		},
		[pageContext.entity?.name, router]
	)

	const handleChartToggle = useCallback(
		(target: string, params?: { enabled?: boolean }) => {
			const chartCtx = chartContextRef.current
			if (!chartCtx) return
			const enabled = params?.enabled ?? !chartCtx.activeMetrics.includes(target)
			chartCtx.toggleMetric(target, enabled)
		},
		[chartContextRef]
	)

	const getChartContext = useCallback(() => chartContextRef.current, [chartContextRef])

	const enrichedPageContext = useMemo<ClippyPageContext>(
		() => ({
			...pageContext,
			highlightTargets: highlightTargets.length > 0 ? highlightTargets : undefined,
			pageValues: Object.keys(pageValues).length > 0 ? pageValues : undefined
		}),
		[pageContext, highlightTargets, pageValues]
	)

	const { messages, isLoading, error, sendMessage, clearMessages } = useClippy({
		pageContext: enrichedPageContext,
		onHighlight: handleHighlight,
		onNavigate: handleNavigate,
		onToggle: handleChartToggle,
		getChartContext
	})

	const handleToggleOpen = useCallback(() => {
		setIsOpen((prev) => !prev)
	}, [])

	const handleClose = useCallback(() => {
		setIsOpen(false)
	}, [])

	const handleOpenInLlamaAI = useCallback(
		(query: string) => {
			router.push(`/ai/chat?q=${encodeURIComponent(query)}`)
		},
		[router]
	)

	return (
		<>
			<ClippyButton onClick={handleToggleOpen} isOpen={isOpen} />
			{isOpen && (
				<ClippyChat
					messages={messages}
					isLoading={isLoading}
					error={error}
					onSend={sendMessage}
					onClose={handleClose}
					onClear={clearMessages}
					onOpenInLlamaAI={handleOpenInLlamaAI}
					entityName={pageContext.entity?.name}
				/>
			)}
		</>
	)
}
