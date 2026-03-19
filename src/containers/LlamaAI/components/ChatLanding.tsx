import * as Ariakit from '@ariakit/react'
import { type Dispatch, type RefObject, type SetStateAction, useCallback, useRef } from 'react'
import { Icon } from '~/components/Icon'
import { CAPABILITIES } from '~/containers/LlamaAI/capabilities'
import { OnboardingWalkthrough } from '~/containers/LlamaAI/components/OnboardingWalkthrough'
import { PromptInput } from '~/containers/LlamaAI/components/PromptInput'
import type { ResearchUsage } from '~/containers/LlamaAI/types'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useLlamaAIWelcome } from '~/contexts/LocalStorage'
import { useMedia } from '~/hooks/useMedia'
import { trackUmamiEvent } from '~/utils/analytics/umami'

const FEATURED_KEYS = ['trade_thesis', 'x_data', 'tradfi', 'yields', 'onchain_analytics'] as const
const FEATURED_CAPABILITIES = FEATURED_KEYS.map((key) => CAPABILITIES.find((c) => c.key === key)).filter(
	(c): c is (typeof CAPABILITIES)[number] => c != null
)

export interface ChatLandingProps {
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
	const { hasActiveSubscription } = useAuthContext()
	const [hasSeenWelcome, markWelcomeSeen] = useLlamaAIWelcome(hasActiveSubscription)

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
						quotedText={quotedText}
						onClearQuotedText={onClearQuotedText}
						walkthroughActive={!hasSeenWelcome}
					/>

					<CapabilityRow promptInputRef={promptInputRef} />
				</>
			) : null}

			{!readOnly && !hasSeenWelcome ? (
				<OnboardingWalkthrough
					isResearchMode={isResearchMode}
					setIsResearchMode={setIsResearchMode}
					handleSubmit={handleSubmit}
					promptInputRef={promptInputRef}
					onComplete={markWelcomeSeen}
				/>
			) : null}
		</div>
	)
}

function CapabilityRow({ promptInputRef }: { promptInputRef: RefObject<HTMLTextAreaElement | null> }) {
	const rowRef = useRef<HTMLDivElement>(null)
	const getAnchorRect = useCallback(() => {
		const el = rowRef.current
		if (!el) return null
		const rect = el.getBoundingClientRect()
		return { x: rect.x + rect.width / 2, y: rect.bottom, width: 0, height: 0 }
	}, [])

	return (
		<div ref={rowRef} className="flex flex-wrap justify-center gap-2 pt-1 max-sm:hidden">
			{FEATURED_CAPABILITIES.map((cap) => (
				<Capability key={cap.key} cap={cap} promptInputRef={promptInputRef} getAnchorRect={getAnchorRect} />
			))}
		</div>
	)
}

const Capability = ({
	cap,
	promptInputRef,
	getAnchorRect
}: {
	cap: (typeof FEATURED_CAPABILITIES)[number]
	promptInputRef: RefObject<HTMLTextAreaElement | null>
	getAnchorRect: () => { x: number; y: number; width: number; height: number } | null
}) => {
	const isMobile = useMedia('(max-width: 640px)')
	const popoverStore = Ariakit.usePopoverStore()

	const handlePromptClick = (prompt: string) => {
		trackUmamiEvent('llamaai-landing-prompt-click', {
			category: cap.key ?? 'unknown',
			prompt: prompt.slice(0, 100)
		})

		popoverStore.hide()

		const textarea = promptInputRef.current
		if (textarea) {
			const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
			nativeInputValueSetter?.call(textarea, prompt)
			textarea.dispatchEvent(new Event('input', { bubbles: true }))
			requestAnimationFrame(() => textarea.focus())
		}
	}

	return (
		<Ariakit.PopoverProvider store={popoverStore}>
			<Ariakit.PopoverDisclosure
				onClick={() => trackUmamiEvent('llamaai-landing-capability-click', { category: cap.key })}
				className="flex items-center gap-1.5 rounded-lg border border-[#d7deea] bg-white px-3 py-1.5 text-[13px] font-[450] text-[#7b8597] duration-150 hover:border-[#c5cbd6] hover:bg-[#f4f5f7] hover:text-[#4b5563] aria-expanded:border-[#2563eb]/30 aria-expanded:bg-[#2563eb]/15 aria-expanded:text-[#2563eb] dark:border-white/7 dark:bg-white/3 dark:text-[#a1a1aa] dark:hover:border-white/12 dark:hover:bg-white/6 dark:hover:text-[#e4e4e7] dark:aria-expanded:border-[#60a5fa]/25 dark:aria-expanded:bg-[#60a5fa]/15 dark:aria-expanded:text-[#60a5fa]"
			>
				<Icon name={cap.icon} height={14} width={14} />
				{cap.name}
				{cap.badge ? (
					<span className="rounded bg-[#2563eb]/15 px-1 py-px text-[9px] font-semibold tracking-wide text-[#2563eb] uppercase dark:bg-[#60a5fa]/15 dark:text-[#60a5fa]">
						{cap.badge}
					</span>
				) : null}
			</Ariakit.PopoverDisclosure>
			<Ariakit.Popover
				unmountOnHide
				hideOnInteractOutside
				modal={isMobile}
				portal
				getAnchorRect={getAnchorRect}
				gutter={14}
				flip={false}
				wrapperProps={{
					className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
				}}
				className="z-50 flex min-h-0 w-[min(calc(100vw-32px),42rem)] max-w-xl flex-col overflow-hidden overscroll-contain rounded-xl border border-[#dbe3ef] bg-white shadow-[0_12px_40px_rgba(148,163,184,0.12)] max-sm:h-[calc(100dvh-80px)] max-sm:w-full max-sm:max-w-full max-sm:drawer max-sm:rounded-xl max-sm:rounded-b-none sm:max-h-[min(420px,60dvh)] lg:max-h-(--popover-available-height) dark:border-white/7 dark:bg-[#101113] dark:shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
			>
				<div className="flex shrink-0 items-center gap-2 border-b border-[#edf2f8] px-4 py-2.5 dark:border-white/6">
					<Icon name={cap.icon} height={14} width={14} className="text-[#60a5fa]" />
					<Ariakit.PopoverHeading className="text-[13px] font-medium text-[#5f6b7c] dark:text-[#e4e4e7]">
						{cap.name}
					</Ariakit.PopoverHeading>
					<Ariakit.PopoverDismiss
						className="ml-auto text-[#9aa4b2] hover:text-[#4f5f73] dark:text-[#71717a] dark:hover:text-[#a1a1aa]"
						aria-label={`Close ${cap.name} prompts`}
					>
						<Icon name="x" height={14} width={14} />
					</Ariakit.PopoverDismiss>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto">
					{cap.prompts.map((prompt, i) => (
						<button
							key={`${cap.key}:${prompt}`}
							type="button"
							className={`group flex w-full items-center justify-between px-4 py-3 text-left text-[13.5px] text-[#7a8596] hover:bg-[#f4f8fc] hover:text-[#24364d] dark:text-[#a1a1aa] dark:hover:bg-white/3 dark:hover:text-[#e4e4e7] ${
								i < cap.prompts.length - 1 ? 'border-b border-[#f1f4f8] dark:border-white/4' : ''
							}`}
							onClick={() => handlePromptClick(prompt)}
						>
							{prompt}
							<Icon
								name="chevron-right"
								height={14}
								width={14}
								className="shrink-0 text-[#9db4d3] opacity-0 group-hover:opacity-100 dark:text-current dark:opacity-0 dark:group-hover:opacity-60"
							/>
						</button>
					))}
				</div>
			</Ariakit.Popover>
		</Ariakit.PopoverProvider>
	)
}
