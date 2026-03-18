import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { CapabilityBrowser } from '~/containers/LlamaAI/components/input/CapabilityBrowser'
import { trackUmamiEvent } from '~/utils/analytics/umami'

interface CapabilityChipsProps {
	onPromptSelect: (prompt: string, categoryKey?: string) => void
	isPending: boolean
	isStreaming?: boolean
}

type PanelState = 'closed' | 'entering' | 'open' | 'leaving'

export function CapabilityChips({ onPromptSelect, isPending, isStreaming }: CapabilityChipsProps) {
	const [panelState, setPanelState] = useState<PanelState>('closed')
	const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null)
	const [direction, setDirection] = useState<'up' | 'down'>('down')
	const anchorRef = useRef<HTMLDivElement>(null)
	const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const disabled = isPending || !!isStreaming
	const isVisible = panelState !== 'closed'

	const close = useCallback(() => {
		if (panelState === 'closed' || panelState === 'leaving') return
		setPanelState('leaving')
		leaveTimerRef.current = setTimeout(() => {
			setPanelState('closed')
		}, 150)
	}, [panelState])

	const handleToggle = () => {
		if (isVisible) {
			close()
			return
		}
		trackUmamiEvent('llamaai-capability-chip-click', { category: 'explore' })
		setSelectedCategoryKey(null)

		// Direction detection
		if (anchorRef.current) {
			const rect = anchorRef.current.getBoundingClientRect()
			const spaceBelow = window.innerHeight - rect.bottom
			setDirection(spaceBelow >= 350 ? 'down' : 'up')
		}

		setPanelState('entering')
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				setPanelState('open')
			})
		})
	}

	// Cleanup timer on unmount
	useEffect(() => {
		return () => {
			if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
		}
	}, [])

	const handlePromptSelect = (prompt: string) => {
		trackUmamiEvent('llamaai-capability-prompt-click', {
			category: selectedCategoryKey ?? 'unknown',
			prompt: prompt.slice(0, 100)
		})
		setPanelState('closed')
		onPromptSelect(prompt, selectedCategoryKey ?? undefined)
	}

	return (
		<div ref={anchorRef} className="relative">
			<Tooltip
				content="Explore Capabilities"
				render={<button type="button" onClick={handleToggle} disabled={disabled} />}
				className={`flex h-7 items-center justify-center gap-1 rounded-md px-2 transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 ${
					isVisible
						? 'bg-[#2563eb]/15 text-[#2563eb] dark:bg-[#60a5fa]/15 dark:text-[#60a5fa]'
						: 'bg-[#2563eb]/8 text-[#2563eb]/70 hover:bg-[#2563eb]/15 hover:text-[#2563eb] dark:bg-[#60a5fa]/8 dark:text-[#60a5fa]/70 dark:hover:bg-[#60a5fa]/15 dark:hover:text-[#60a5fa]'
				}`}
			>
				<Icon name={isVisible ? 'x' : 'layout-grid'} height={14} width={14} />
				<span className="text-xs font-medium">Explore</span>
			</Tooltip>

			{isVisible ? (
				<CapabilityBrowser
					anchorRef={anchorRef}
					direction={direction}
					hasEntered={panelState === 'open'}
					isLeaving={panelState === 'leaving'}
					selectedCategoryKey={selectedCategoryKey}
					onCategoryChange={(key) => {
						if (key) trackUmamiEvent('llamaai-capability-category-view', { category: key })
						setSelectedCategoryKey(key)
					}}
					onPromptSelect={handlePromptSelect}
					onClose={close}
				/>
			) : null}
		</div>
	)
}
