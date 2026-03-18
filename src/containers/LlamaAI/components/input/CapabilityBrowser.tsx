import * as Ariakit from '@ariakit/react'
import { useCallback, useEffect, useRef } from 'react'
import { Icon } from '~/components/Icon'
import { CAPABILITIES } from '~/containers/LlamaAI/capabilities'
import { useMedia } from '~/hooks/useMedia'
import { trackUmamiEvent } from '~/utils/analytics/umami'

interface CapabilityBrowserProps {
	onPromptSelect: (prompt: string, categoryKey?: string) => void
}

export function CapabilityBrowser({ onPromptSelect }: CapabilityBrowserProps) {
	const isMobile = useMedia('(max-width: 640px)')

	return (
		<Ariakit.Popover
			portal
			modal={isMobile}
			unmountOnHide
			hideOnInteractOutside
			gutter={8}
			flip
			wrapperProps={{
				className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
			}}
			className="z-50 flex w-[600px] overflow-hidden rounded-xl border border-black/8 bg-white shadow-2xl max-sm:h-[calc(100dvh-80px)] max-sm:w-full max-sm:max-w-full max-sm:drawer max-sm:flex-col max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:border-0 sm:max-h-[min(420px,50vh)] sm:capability-panel dark:border-[#2a2a2e] dark:bg-[#18181b]"
		>
			<BrowserContent onPromptSelect={onPromptSelect} />
		</Ariakit.Popover>
	)
}

export function BrowserContent({
	onPromptSelect,
	hideDragHandle
}: {
	onPromptSelect: (prompt: string, categoryKey?: string) => void
	hideDragHandle?: boolean
}) {
	const tabs = Ariakit.useTabStore({
		defaultSelectedId: CAPABILITIES[0].key,
		selectOnMove: true,
		orientation: 'vertical'
	})
	const selectedId = Ariakit.useStoreState(tabs, 'selectedId')
	const activeCategory = CAPABILITIES.find((c) => c.key === selectedId) ?? CAPABILITIES[0]

	const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const handleHoverIntent = useCallback(
		(key: string) => {
			if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
			hoverTimerRef.current = setTimeout(() => {
				tabs.setSelectedId(key)
				trackUmamiEvent('llamaai-capability-category-view', { category: key })
			}, 80)
		},
		[tabs]
	)
	const cancelHoverIntent = useCallback(() => {
		if (hoverTimerRef.current) {
			clearTimeout(hoverTimerRef.current)
			hoverTimerRef.current = null
		}
	}, [])

	useEffect(() => {
		return () => {
			if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
		}
	}, [])

	const handlePromptClick = (prompt: string) => {
		trackUmamiEvent('llamaai-capability-prompt-click', {
			category: activeCategory.key,
			prompt: prompt.slice(0, 100)
		})
		onPromptSelect(prompt, activeCategory.key)
	}

	return (
		<Ariakit.TabProvider store={tabs}>
			{!hideDragHandle ? (
				<div className="flex items-center justify-between px-3 pt-3 pb-1 sm:hidden">
					<span className="text-[13px] font-semibold text-[#111] dark:text-[#f0f0f0]">Explore</span>
					<Ariakit.PopoverDismiss className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f0f0f0] text-[#555] transition-colors hover:bg-[#e0e0e0] dark:bg-white/10 dark:text-[#aaa] dark:hover:bg-white/15">
						<Icon name="x" height={14} width={14} />
					</Ariakit.PopoverDismiss>
				</div>
			) : null}

			{/* Mobile: horizontal category pills */}
			<div className="scrollbar-none flex gap-1.5 overflow-x-auto px-3 pb-2.5 sm:hidden">
				{CAPABILITIES.map((cap) => {
					const isActive = activeCategory.key === cap.key
					return (
						<button
							key={cap.key}
							type="button"
							onClick={() => {
								tabs.setSelectedId(cap.key)
								trackUmamiEvent('llamaai-capability-category-view', { category: cap.key })
							}}
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
									className={`rounded-sm px-1 py-px text-[8px] leading-normal font-bold tracking-wide ${
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

			{/* Mobile: description */}
			<p className="px-4 pt-1 pb-2 text-[12px] leading-relaxed text-[#777] sm:hidden dark:text-[#888]">
				{activeCategory.description}
			</p>

			{/* Main layout: desktop sidebar + content */}
			<div className="flex min-h-0 flex-1">
				{/* Desktop: sidebar */}
				<Ariakit.TabList className="hidden w-[176px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-black/6 bg-[#f8f8f8] p-1.5 sm:flex dark:border-[#2a2a2e] dark:bg-[#131316]">
					{CAPABILITIES.map((cap) => (
						<Ariakit.Tab
							key={cap.key}
							id={cap.key}
							onClick={() => trackUmamiEvent('llamaai-capability-category-view', { category: cap.key })}
							onMouseEnter={() => handleHoverIntent(cap.key)}
							onMouseLeave={cancelHoverIntent}
							className="group flex items-center gap-2 rounded-lg px-2.5 py-[7px] text-left text-[12.5px] font-medium text-[#555] hover:bg-black/4 hover:text-[#222] aria-selected:bg-white aria-selected:text-[#111] aria-selected:shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:text-[#9a9a9a] dark:hover:bg-white/4 dark:hover:text-[#ccc] dark:aria-selected:bg-[#252529] dark:aria-selected:text-white dark:aria-selected:shadow-[0_1px_4px_rgba(0,0,0,0.4)]"
						>
							<Icon
								name={cap.icon}
								height={13}
								width={13}
								className="shrink-0 opacity-60 group-aria-selected:opacity-90"
							/>
							<span className="truncate">{cap.name}</span>
							{cap.badge ? (
								<span className="ml-auto shrink-0 rounded-sm bg-[#2563eb]/12 px-1.5 py-px text-[9px] leading-normal font-bold tracking-wide text-[#2563eb] dark:bg-[#60a5fa]/15 dark:text-[#7db8ff]">
									{cap.badge}
								</span>
							) : null}
						</Ariakit.Tab>
					))}
				</Ariakit.TabList>

				{/* Content panel */}
				<Ariakit.TabPanel tabId={selectedId ?? undefined} className="flex flex-1 flex-col overflow-hidden">
					{/* Desktop: category header */}
					<div className="hidden shrink-0 border-b border-black/6 px-4 pt-3.5 pb-3 sm:block dark:border-[#2a2a2e]">
						<div className="flex items-center gap-2">
							<Icon name={activeCategory.icon} height={14} width={14} className="text-[#777] dark:text-[#888]" />
							<h3 className="text-[13px] font-semibold text-[#111] dark:text-[#f0f0f0]">{activeCategory.name}</h3>
							{activeCategory.badge ? (
								<span className="rounded-sm bg-[#2563eb]/12 px-1.5 py-px text-[9px] leading-normal font-bold tracking-wide text-[#2563eb] dark:bg-[#60a5fa]/15 dark:text-[#7db8ff]">
									{activeCategory.badge}
								</span>
							) : null}
						</div>
						<p className="mt-1 text-[12px] leading-relaxed text-[#777] dark:text-[#888]">
							{activeCategory.description}
						</p>
					</div>

					{/* Prompt list */}
					<div className="min-h-0 flex-1 overflow-y-auto">
						<ul className="flex flex-col p-1.5 max-sm:px-2">
							{activeCategory.prompts.map((prompt) => (
								<PromptItem key={`${activeCategory.key}:${prompt}`} prompt={prompt} onClick={handlePromptClick} />
							))}
							<li aria-hidden="true" className="h-1 shrink-0 max-sm:h-6" />
						</ul>
					</div>
				</Ariakit.TabPanel>
			</div>
		</Ariakit.TabProvider>
	)
}

function PromptItem({ prompt, onClick }: { prompt: string; onClick: (prompt: string) => void }) {
	return (
		<li>
			<Ariakit.PopoverDismiss
				render={<button type="button" />}
				onClick={() => onClick(prompt)}
				className="group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[#f0f0f0] focus-visible:bg-[#f0f0f0] dark:hover:bg-white/6 dark:focus-visible:bg-white/6"
			>
				<p className="m-0 flex-1 text-[13px] leading-[1.55] text-[#333] group-hover:text-[#111] group-focus-visible:text-[#111] dark:text-[#bbb] dark:group-hover:text-[#f0f0f0] dark:group-focus-visible:text-[#f0f0f0]">
					{prompt}
				</p>
				<Icon
					name="arrow-right"
					height={12}
					width={12}
					className="mt-1 shrink-0 text-[#bbb] opacity-0 group-hover:translate-x-0.5 group-hover:text-[#666] group-hover:opacity-100 group-focus-visible:translate-x-0.5 group-focus-visible:text-[#666] group-focus-visible:opacity-100 dark:text-[#555] dark:group-hover:text-[#999] dark:group-focus-visible:text-[#999]"
				/>
			</Ariakit.PopoverDismiss>
		</li>
	)
}
