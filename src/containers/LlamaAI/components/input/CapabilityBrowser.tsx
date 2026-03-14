import { type RefObject, forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '~/components/Icon'
import { CAPABILITIES, type Capability } from '~/containers/LlamaAI/capabilities'
import { useMedia } from '~/hooks/useMedia'

interface CapabilityBrowserProps {
	anchorRef: RefObject<HTMLDivElement | null>
	direction: 'up' | 'down'
	hasEntered: boolean
	isLeaving: boolean
	selectedCategoryKey: string | null
	onCategoryChange: (key: string | null) => void
	onPromptSelect: (prompt: string) => void
	onClose: () => void
}

export function CapabilityBrowser({
	anchorRef,
	direction,
	hasEntered,
	isLeaving,
	selectedCategoryKey,
	onCategoryChange,
	onPromptSelect,
	onClose
}: CapabilityBrowserProps) {
	const isMobile = useMedia('(max-width: 640px)')
	const popoverRef = useRef<HTMLDivElement>(null)

	const activeCategory = selectedCategoryKey
		? CAPABILITIES.find((c) => c.key === selectedCategoryKey) ?? CAPABILITIES[0]
		: CAPABILITIES[0]

	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			const target = e.target as Node
			if (popoverRef.current?.contains(target)) return
			if (anchorRef.current?.contains(target)) return
			onClose()
		}
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('mousedown', handleClick)
		document.addEventListener('keydown', handleEscape)
		return () => {
			document.removeEventListener('mousedown', handleClick)
			document.removeEventListener('keydown', handleEscape)
		}
	}, [anchorRef, onClose])

	const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const handleHoverIntent = useCallback(
		(key: string) => {
			if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
			hoverTimerRef.current = setTimeout(() => onCategoryChange(key), 80)
		},
		[onCategoryChange]
	)
	const cancelHoverIntent = useCallback(() => {
		if (hoverTimerRef.current) {
			clearTimeout(hoverTimerRef.current)
			hoverTimerRef.current = null
		}
	}, [])
	useEffect(() => () => cancelHoverIntent(), [cancelHoverIntent])

	if (isMobile) {
		return createPortal(
			<MobileSheet
				ref={popoverRef}
				hasEntered={hasEntered}
				isLeaving={isLeaving}
				activeCategory={activeCategory}
				onCategoryChange={onCategoryChange}
				onPromptSelect={onPromptSelect}
				onClose={onClose}
			/>,
			document.body
		)
	}

	const directionClasses =
		direction === 'down' ? 'top-full mt-2 origin-top-left' : 'bottom-full mb-2 origin-bottom-left'

	return (
		<div
			ref={popoverRef}
			data-enter={hasEntered ? '' : undefined}
			data-leave={isLeaving ? '' : undefined}
			className={`capability-panel absolute left-0 z-50 flex w-[600px] overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-2xl dark:border-[#2a2a2e] dark:bg-[#18181b] ${directionClasses}`}
			style={{ maxHeight: 'min(420px, 50vh)' }}
		>
			{/* Sidebar */}
			<nav className="flex w-[176px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-black/[0.06] bg-[#f8f8f8] p-1.5 dark:border-[#2a2a2e] dark:bg-[#131316]">
				{CAPABILITIES.map((cap) => {
					const isActive = activeCategory.key === cap.key
					return (
						<button
							key={cap.key}
							type="button"
							onClick={() => onCategoryChange(cap.key)}
							onMouseEnter={() => handleHoverIntent(cap.key)}
							onMouseLeave={cancelHoverIntent}
							className={`flex items-center gap-2 rounded-lg px-2.5 py-[7px] text-left text-[12.5px] font-medium transition-all duration-100 ${
								isActive
									? 'bg-white text-[#111] shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:bg-[#252529] dark:text-white dark:shadow-[0_1px_4px_rgba(0,0,0,0.4)]'
									: 'text-[#555] hover:bg-black/[0.04] hover:text-[#222] dark:text-[#9a9a9a] dark:hover:bg-white/[0.04] dark:hover:text-[#ccc]'
							}`}
						>
							<Icon name={cap.icon} height={13} width={13} className={`shrink-0 ${isActive ? 'opacity-90' : 'opacity-60'}`} />
							<span className="truncate">{cap.name}</span>
							{cap.badge ? (
								<span className="ml-auto shrink-0 rounded-sm bg-[#2563eb]/12 px-1.5 py-px text-[9px] font-bold leading-normal tracking-wide text-[#2563eb] dark:bg-[#60a5fa]/15 dark:text-[#7db8ff]">
									{cap.badge}
								</span>
							) : null}
						</button>
					)
				})}
			</nav>

			{/* Content */}
			<div className="flex flex-1 flex-col overflow-y-auto">
				<div className="border-b border-black/[0.06] px-4 pt-3.5 pb-3 dark:border-[#2a2a2e]">
					<div className="flex items-center gap-2">
						<Icon name={activeCategory.icon} height={14} width={14} className="text-[#777] dark:text-[#888]" />
						<h3 className="text-[13px] font-semibold text-[#111] dark:text-[#f0f0f0]">
							{activeCategory.name}
						</h3>
						{activeCategory.badge ? (
							<span className="rounded-sm bg-[#2563eb]/12 px-1.5 py-px text-[9px] font-bold leading-normal tracking-wide text-[#2563eb] dark:bg-[#60a5fa]/15 dark:text-[#7db8ff]">
								{activeCategory.badge}
							</span>
						) : null}
					</div>
					<p className="mt-1 text-[12px] leading-relaxed text-[#777] dark:text-[#888]">
						{activeCategory.description}
					</p>
				</div>

				<ul className="flex flex-col p-1.5">
					{activeCategory.prompts.map((prompt, idx) => (
						<PromptItem key={idx} prompt={prompt} onClick={onPromptSelect} />
					))}
				</ul>
			</div>
		</div>
	)
}

const MobileSheet = forwardRef<
	HTMLDivElement,
	{
		hasEntered: boolean
		isLeaving: boolean
		activeCategory: Capability
		onCategoryChange: (key: string | null) => void
		onPromptSelect: (prompt: string) => void
		onClose: () => void
	}
>(function MobileSheet({ hasEntered, isLeaving, activeCategory, onCategoryChange, onPromptSelect, onClose }, ref) {
	const [backdropVisible, setBackdropVisible] = useState(false)

	useEffect(() => {
		requestAnimationFrame(() => setBackdropVisible(true))
	}, [])

	return (
		<div
			className={`fixed inset-0 z-50 flex flex-col justify-end transition-colors duration-200 ${backdropVisible && !isLeaving ? 'bg-black/50' : 'bg-black/0'}`}
			onClick={onClose}
		>
			<div
				ref={ref}
				data-enter={hasEntered ? '' : undefined}
				data-leave={isLeaving ? '' : undefined}
				className="drawer flex max-h-[75vh] flex-col rounded-t-2xl bg-white dark:bg-[#18181b]"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Drag handle */}
				<div className="flex justify-center py-2.5">
					<div className="h-1 w-9 rounded-full bg-[#d5d5d5] dark:bg-[#444]" />
				</div>

				{/* Category tabs */}
				<div className="flex gap-1.5 overflow-x-auto px-3 pb-2.5 scrollbar-none">
					{CAPABILITIES.map((cap) => {
						const isActive = activeCategory.key === cap.key
						return (
							<button
								key={cap.key}
								type="button"
								onClick={() => onCategoryChange(cap.key)}
								className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium whitespace-nowrap transition-colors ${
									isActive
										? 'bg-[#111] text-white dark:bg-white dark:text-[#111]'
										: 'bg-[#f0f0f0] text-[#555] dark:bg-[#252529] dark:text-[#999]'
								}`}
							>
								<Icon name={cap.icon} height={11} width={11} />
								<span>{cap.name}</span>
								{cap.badge ? (
									<span
										className={`rounded-sm px-1 py-px text-[8px] font-bold leading-normal tracking-wide ${
											isActive
												? 'bg-white/20 text-white dark:bg-black/20 dark:text-[#111]'
												: 'bg-[#2563eb]/12 text-[#2563eb] dark:bg-[#60a5fa]/15 dark:text-[#7db8ff]'
										}`}
									>
										{cap.badge}
									</span>
								) : null}
							</button>
						)
					})}
				</div>

				{/* Description */}
				<p className="px-4 pt-1 pb-2 text-[12px] leading-relaxed text-[#777] dark:text-[#888]">
					{activeCategory.description}
				</p>

				{/* Prompts */}
				<ul className="flex flex-col overflow-y-auto px-2 pb-6">
					{activeCategory.prompts.map((prompt, idx) => (
						<PromptItem key={idx} prompt={prompt} onClick={onPromptSelect} />
					))}
				</ul>
			</div>
		</div>
	)
})

function PromptItem({ prompt, onClick }: { prompt: string; onClick: (prompt: string) => void }) {
	return (
		<li>
			<button
				type="button"
				onClick={() => onClick(prompt)}
				className="group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-100 hover:bg-[#f0f0f0] dark:hover:bg-white/[0.06]"
			>
				<p className="m-0 flex-1 text-[13px] leading-[1.55] text-[#333] group-hover:text-[#111] dark:text-[#bbb] dark:group-hover:text-[#f0f0f0]">
					{prompt}
				</p>
				<Icon
					name="arrow-right"
					height={12}
					width={12}
					className="mt-1 shrink-0 text-[#bbb] opacity-0 transition-all duration-100 group-hover:translate-x-0.5 group-hover:text-[#666] group-hover:opacity-100 dark:text-[#555] dark:group-hover:text-[#999]"
				/>
			</button>
		</li>
	)
}
