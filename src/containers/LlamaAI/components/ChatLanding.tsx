import { type Dispatch, type RefObject, type SetStateAction, useState } from 'react'
import { Icon } from '~/components/Icon'
import { CAPABILITIES } from '~/containers/LlamaAI/capabilities'
import { PromptInput } from '~/containers/LlamaAI/components/PromptInput'
import type { ResearchUsage } from '~/containers/LlamaAI/types'
import { trackUmamiEvent } from '~/utils/analytics/umami'

const FEATURED_KEYS = ['trade_thesis', 'x_data', 'tradfi', 'yields', 'onchain_analytics'] as const
const FEATURED_CAPABILITIES = CAPABILITIES.filter((c) => (FEATURED_KEYS as readonly string[]).includes(c.key))

interface ChatLandingProps {
	readOnly: boolean
	title: string
	handleSubmit: (
		prompt: string,
		preResolvedEntities?: Array<{ term: string; slug: string; type?: string }>,
		images?: Array<{ data: string; mimeType: string; filename?: string }>,
		pageContext?: { entitySlug?: string; entityType?: 'protocol' | 'chain' | 'page'; route: string },
		isSuggestedQuestion?: boolean
	) => void | Promise<void>
	promptInputRef: RefObject<HTMLTextAreaElement | null>
	handleStopRequest: () => void
	isStreaming: boolean
	isResearchMode: boolean
	setIsResearchMode: Dispatch<SetStateAction<boolean>>
	researchUsage?: ResearchUsage | null
	onOpenAlerts: () => void
	quotedText?: string | null
	onClearQuotedText?: () => void
}

export function ChatLanding({
	readOnly,
	title,
	handleSubmit,
	promptInputRef,
	handleStopRequest,
	isStreaming,
	isResearchMode,
	setIsResearchMode,
	researchUsage,
	onOpenAlerts,
	quotedText,
	onClearQuotedText
}: ChatLandingProps) {
	const [activeKey, setActiveKey] = useState<string | null>(null)
	const activeCap = activeKey ? FEATURED_CAPABILITIES.find((c) => c.key === activeKey) : null

	const handlePromptClick = (prompt: string) => {
		trackUmamiEvent('llamaai-landing-prompt-click', {
			category: activeKey ?? 'unknown',
			prompt: prompt.slice(0, 100)
		})
		setActiveKey(null)
		if (promptInputRef.current) {
			const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
			nativeInputValueSetter?.call(promptInputRef.current, prompt)
			promptInputRef.current.dispatchEvent(new Event('input', { bubbles: true }))
			promptInputRef.current.focus()
		}
	}

	return (
		<div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-2.5 overflow-hidden">
			<div className="mt-[100px] flex shrink-0 flex-col items-center justify-center gap-2.5 max-lg:mt-[50px]">
				<img src="/assets/llamaai/llama-ai.svg" alt="LlamaAI" className="object-contain" width={64} height={77} />
				<h1 className="text-center text-2xl font-semibold">{title}</h1>
			</div>
			{!readOnly ? (
				<>
					<PromptInput
						handleSubmit={handleSubmit}
						promptInputRef={promptInputRef}
						isPending={isStreaming}
						handleStopRequest={handleStopRequest}
						isStreaming={isStreaming}
						restoreRequest={null}
						placeholder="Ask LlamaAI... Type @ to add a protocol, chain or stablecoin, or $ to add a coin"
						isResearchMode={isResearchMode}
						setIsResearchMode={setIsResearchMode}
						researchUsage={researchUsage}
						onOpenAlerts={onOpenAlerts}
						onExploreOpen={() => setActiveKey(null)}
						quotedText={quotedText}
						onClearQuotedText={onClearQuotedText}
					/>
					<div className="flex flex-wrap justify-center gap-2 pt-1">
						{FEATURED_CAPABILITIES.map((cap) => (
							<button
								key={cap.key}
								type="button"
								className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-[450] transition-all duration-150 ${
									activeKey === cap.key
										? 'border-[#93c5fd] bg-[#dbeafe] text-[#3b82f6] shadow-[0_1px_0_rgba(255,255,255,0.7)_inset] dark:border-[#60a5fa]/30 dark:bg-[#2563eb]/12 dark:text-[#60a5fa] dark:shadow-none'
										: 'border-[#d7deea] bg-white text-[#7b8597] hover:border-[#bfd5ff] hover:bg-[#f3f8ff] hover:text-[#4b6ea8] dark:border-white/7 dark:bg-white/3 dark:text-[#a1a1aa] dark:hover:border-white/12 dark:hover:bg-white/6 dark:hover:text-[#e4e4e7]'
								}`}
								onClick={() => {
									const next = activeKey === cap.key ? null : cap.key
									if (next) trackUmamiEvent('llamaai-landing-capability-click', { category: next })
									setActiveKey(next)
								}}
							>
								<Icon
									name={cap.icon}
									height={14}
									width={14}
									className={activeKey === cap.key ? 'opacity-100' : 'opacity-75 dark:opacity-70'}
								/>
								{cap.name}
								{cap.badge ? (
									<span className="rounded bg-[#bfdbfe] px-1 py-px text-[9px] font-semibold tracking-wide text-[#3b82f6] uppercase dark:bg-[#60a5fa]/20 dark:text-[#60a5fa]">
										{cap.badge}
									</span>
								) : null}
							</button>
						))}
					</div>

					{activeCap ? (
						<div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col overflow-hidden rounded-xl border border-[#dbe3ef] bg-white shadow-[0_12px_40px_rgba(148,163,184,0.12)] dark:border-white/7 dark:bg-white/2 dark:shadow-none">
							<div className="flex shrink-0 items-center gap-2 border-b border-[#edf2f8] px-4 py-2.5 dark:border-white/6">
								<Icon name={activeCap.icon} height={14} width={14} className="text-[#60a5fa]" />
								<span className="text-[13px] font-medium text-[#5f6b7c] dark:text-[#e4e4e7]">{activeCap.name}</span>
								<button
									type="button"
									className="ml-auto text-[#9aa4b2] transition-colors hover:text-[#4f5f73] dark:text-[#71717a] dark:hover:text-[#a1a1aa]"
									onClick={() => setActiveKey(null)}
								>
									<Icon name="x" height={14} width={14} />
								</button>
							</div>
							<div className="min-h-0 flex-1 overflow-y-auto">
								{activeCap.prompts.map((prompt, i) => (
									<button
										key={`${activeCap.key}:${prompt}`}
										type="button"
										className={`group flex w-full items-center justify-between px-4 py-3 text-left text-[13.5px] text-[#7a8596] transition-colors hover:bg-[#f4f8fc] hover:text-[#24364d] dark:text-[#a1a1aa] dark:hover:bg-white/3 dark:hover:text-[#e4e4e7] ${
											i < activeCap.prompts.length - 1 ? 'border-b border-[#f1f4f8] dark:border-white/4' : ''
										}`}
										onClick={() => handlePromptClick(prompt)}
									>
										{prompt}
										<Icon
											name="chevron-right"
											height={14}
											width={14}
											className="shrink-0 text-[#9db4d3] opacity-0 transition-opacity group-hover:opacity-100 dark:text-current dark:opacity-0 dark:group-hover:opacity-60"
										/>
									</button>
								))}
							</div>
						</div>
					) : null}
				</>
			) : null}
		</div>
	)
}
