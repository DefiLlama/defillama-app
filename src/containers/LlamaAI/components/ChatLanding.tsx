import { type Dispatch, type RefObject, type SetStateAction, useState } from 'react'
import { Icon } from '~/components/Icon'
import { PromptInput } from '~/containers/LlamaAI/components/PromptInput'
import { CAPABILITIES } from '~/containers/LlamaAI/capabilities'
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
			const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
				window.HTMLTextAreaElement.prototype,
				'value'
			)?.set
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
										? 'border-[#60a5fa]/30 bg-[#2563eb]/12 text-[#60a5fa]'
										: 'border-[#fff]/[0.07] bg-[#fff]/[0.03] text-[#a1a1aa] hover:border-[#fff]/[0.12] hover:bg-[#fff]/[0.06] hover:text-[#e4e4e7]'
								}`}
								onClick={() => {
									const next = activeKey === cap.key ? null : cap.key
									if (next) trackUmamiEvent('llamaai-landing-capability-click', { category: next })
									setActiveKey(next)
								}}
							>
								<Icon name={cap.icon} height={14} width={14} className={activeKey === cap.key ? 'opacity-100' : 'opacity-70'} />
								{cap.name}
								{cap.badge ? (
									<span className="rounded bg-[#60a5fa]/20 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-[#60a5fa]">
										{cap.badge}
									</span>
								) : null}
							</button>
						))}
					</div>

					{activeCap ? (
						<div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col overflow-hidden rounded-xl border border-[#fff]/[0.07] bg-[#fff]/[0.02]">
							<div className="flex shrink-0 items-center gap-2 border-b border-[#fff]/[0.06] px-4 py-2.5">
								<Icon name={activeCap.icon} height={14} width={14} className="text-[#60a5fa]" />
								<span className="text-[13px] font-medium text-[#e4e4e7]">{activeCap.name}</span>
								<button
									type="button"
									className="ml-auto text-[#71717a] transition-colors hover:text-[#a1a1aa]"
									onClick={() => setActiveKey(null)}
								>
									<Icon name="x" height={14} width={14} />
								</button>
							</div>
							<div className="min-h-0 flex-1 overflow-y-auto">
								{activeCap.prompts.map((prompt, i) => (
									<button
										key={i}
										type="button"
										className={`group flex w-full items-center justify-between px-4 py-3 text-left text-[13.5px] text-[#a1a1aa] transition-colors hover:bg-[#fff]/[0.03] hover:text-[#e4e4e7] ${
											i < activeCap.prompts.length - 1 ? 'border-b border-[#fff]/[0.04]' : ''
										}`}
										onClick={() => handlePromptClick(prompt)}
									>
										{prompt}
										<Icon
											name="chevron-right"
											height={14}
											width={14}
											className="shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
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
