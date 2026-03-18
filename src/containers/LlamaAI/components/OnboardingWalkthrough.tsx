import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { trackUmamiEvent } from '~/utils/analytics/umami'
import type { ChatLandingProps } from './ChatLanding'

const ONBOARDING_PROMPTS = [
	{
		label: 'Check if a protocol is safe',
		prompt: 'Is it safe to deposit into Aave on Ethereum? Analyze the risks.',
		icon: 'flag' as const
	},
	{
		label: 'Where is capital flowing?',
		prompt: 'Where is capital flowing in DeFi this week? Show me the biggest TVL changes.',
		icon: 'trending-up' as const
	},
	{
		label: 'Explain a market move',
		prompt: 'What caused the biggest TVL changes in the last 24 hours?',
		icon: 'activity' as const
	},
	{
		label: 'Build a yield strategy',
		prompt: 'Build me a risk-adjusted yield strategy for 10 ETH across L2s.',
		icon: 'bar-chart-2' as const
	}
]

type Step = 'intro' | 'explore' | 'alerts' | 'upload' | 'research' | 'prompts'
const STEPS: Step[] = ['intro', 'explore', 'alerts', 'upload', 'research', 'prompts']

interface SpotlightConfig {
	selectors: string[]
	title: string
	description: string
	icon: 'layout-grid' | 'calendar-plus' | 'image-plus' | 'search'
	iconColor: string
	accentColor: string
	position: 'above' | 'below'
}

const SPOTLIGHT_CONFIGS: Partial<Record<Step, SpotlightConfig>> = {
	explore: {
		selectors: ['[data-walkthrough="explore-button"]'],
		title: 'Explore',
		description: 'Browse prompts by category — yields, analytics, trade theses, on-chain, and more.',
		icon: 'layout-grid',
		iconColor: '#60a5fa',
		accentColor: 'rgba(37, 99, 235, 0.25)',
		position: 'above'
	},
	alerts: {
		selectors: ['[data-walkthrough="alerts-button"]'],
		title: 'Scheduled Alerts',
		description:
			'Ask LlamaAI to create alerts for you — daily price checks, portfolio monitors, custom data alerts. This button is for managing them.',
		icon: 'calendar-plus',
		iconColor: '#f59e0b',
		accentColor: 'rgba(245, 158, 11, 0.25)',
		position: 'above'
	},
	upload: {
		selectors: ['[data-walkthrough="image-upload"]'],
		title: 'File Upload',
		description:
			'Upload images, PDFs, or CSVs and ask LlamaAI to analyze them — charts, reports, datasets, anything.',
		icon: 'image-plus',
		iconColor: '#10b981',
		accentColor: 'rgba(16, 185, 129, 0.25)',
		position: 'above'
	},
	research: {
		selectors: ['[data-walkthrough="mode-toggle"]'],
		title: 'Need deeper answers?',
		description: '', // Dynamic — set at render time based on researchUsage
		icon: 'search',
		iconColor: '#60a5fa',
		accentColor: 'rgba(37, 99, 235, 0.25)',
		position: 'above'
	}
}

interface OnboardingWalkthroughProps {
	isResearchMode: boolean
	setIsResearchMode: Dispatch<SetStateAction<boolean>>
	handleSubmit: ChatLandingProps['handleSubmit']
	promptInputRef: ChatLandingProps['promptInputRef']
	onComplete: () => void
}

export function OnboardingWalkthrough({
	isResearchMode,
	setIsResearchMode,
	handleSubmit,
	promptInputRef,
	onComplete
}: OnboardingWalkthroughProps) {
	const [step, setStep] = useState<Step>('intro')
	const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null)

	const stepIndex = STEPS.indexOf(step)
	const config = SPOTLIGHT_CONFIGS[step]
	const isSpotlightStep = step === 'explore' || step === 'alerts' || step === 'upload' || step === 'research'

	const { isTrial } = useAuthContext()
	const researchDescription = isTrial
		? 'In-depth reports with analysis, charts, and citations. You have 3 free queries to try. Click below.'
		: 'In-depth reports with analysis, charts, and citations. You get 5 per day. Click below.'

	// Find and measure spotlight target(s)
	useEffect(() => {
		if (!isSpotlightStep || !config) return

		const updateRect = () => {
			const rects: DOMRect[] = []
			for (const sel of config.selectors) {
				const el = document.querySelector(sel)
				if (el) rects.push(el.getBoundingClientRect())
			}
			if (rects.length === 0) return

			// Merge all rects into one bounding box
			const left = Math.min(...rects.map((r) => r.left))
			const top = Math.min(...rects.map((r) => r.top))
			const right = Math.max(...rects.map((r) => r.right))
			const bottom = Math.max(...rects.map((r) => r.bottom))
			setSpotlightRect(new DOMRect(left, top, right - left, bottom - top))
		}

		const timer = setTimeout(updateRect, 120)
		window.addEventListener('resize', updateRect)
		window.addEventListener('scroll', updateRect, true)
		return () => {
			clearTimeout(timer)
			window.removeEventListener('resize', updateRect)
			window.removeEventListener('scroll', updateRect, true)
		}
	}, [step, isSpotlightStep, config])

	// Auto-advance when user toggles Research mode ON
	useEffect(() => {
		if (step === 'research' && isResearchMode) {
			trackUmamiEvent('llamaai-walkthrough-step', { from: 'research', to: 'prompts' })
			setStep('prompts')
		}
	}, [step, isResearchMode])

	const nextStep = useCallback(() => {
		const i = STEPS.indexOf(step)
		if (i < STEPS.length - 1) {
			const next = STEPS[i + 1]
			trackUmamiEvent('llamaai-walkthrough-step', { from: step, to: next })
			setStep(next)
		}
	}, [step])

	const handlePromptClick = useCallback(
		(prompt: string) => {
			trackUmamiEvent('llamaai-walkthrough-complete', { action: 'prompt-click', prompt: prompt.slice(0, 60) })
			if (!isResearchMode) {
				setIsResearchMode(true)
			}
			onComplete()
			handleSubmit(prompt, undefined, undefined, undefined, true)
		},
		[handleSubmit, onComplete, isResearchMode, setIsResearchMode]
	)

	const handleSkip = useCallback(() => {
		trackUmamiEvent('llamaai-walkthrough-skip', { step })
		setIsResearchMode(true)
		onComplete()
	}, [step, setIsResearchMode, onComplete])

	const handleStartChatting = useCallback(() => {
		trackUmamiEvent('llamaai-walkthrough-complete', { action: 'start-chatting' })
		setIsResearchMode(true)
		onComplete()
		requestAnimationFrame(() => promptInputRef.current?.focus())
	}, [setIsResearchMode, onComplete, promptInputRef])

	if (typeof document === 'undefined') return null

	const pad = 4

	return createPortal(
		<div className="pointer-events-none fixed inset-0 z-[9999]">
			{/* ─── Intro ─── */}
			{step === 'intro' ? (
				<>
					<div className="pointer-events-auto absolute inset-0 bg-black/60" onClick={handleSkip} />
					<div className="pointer-events-auto absolute inset-0 flex items-center justify-center p-4 animate-[fadein_0.3s_ease-out]">
						<div className="relative w-full max-w-[340px] overflow-hidden rounded-2xl border border-[#C99A4A]/15 bg-[#111214] shadow-[0_24px_64px_rgba(0,0,0,0.7)]">
							<div className="h-px w-full bg-gradient-to-r from-transparent via-[#C99A4A]/60 to-transparent" />
							<div className="p-6">
								<div className="mb-5 flex flex-col items-center gap-3 text-center">
									<div className="relative">
										<div
											className="absolute inset-0 -m-3 rounded-full"
											style={{
												background:
													'radial-gradient(circle, rgba(201,154,74,0.2) 0%, transparent 70%)',
												filter: 'blur(10px)'
											}}
										/>
										<img
											src="/assets/llamaai/llama-ai.svg"
											alt=""
											className="relative h-14 w-14 object-contain"
											width={56}
											height={56}
										/>
									</div>
									<h2 className="text-lg font-bold tracking-tight text-white">
										Welcome to LlamaAI
									</h2>
									<p className="text-[13px] leading-relaxed text-[#8b8d93]">
										AI-powered research across DeFi, TradFi, and on-chain data. Charts, reports,
										forecasts, and alerts — all in one conversation.
									</p>
								</div>

								<div className="mb-5 flex flex-wrap justify-center gap-1.5">
									{(
										[
											['bar-chart-2', 'Charts'],
											['file-text', 'Reports'],
											['trending-up', 'Forecasts'],
											['link', 'On-chain'],
											['calendar', 'Alerts']
										] as const
									).map(([icon, label]) => (
										<span
											key={label}
											className="flex items-center gap-1 rounded-md border border-[#C99A4A]/10 bg-[#C99A4A]/5 px-2 py-0.5 text-[10px] text-[#C99A4A]"
										>
											<Icon name={icon} height={9} width={9} className="opacity-70" />
											{label}
										</span>
									))}
								</div>

								<button
									onClick={nextStep}
									className="w-full rounded-xl bg-gradient-to-r from-[#C99A4A] to-[#B8860B] py-2.5 text-[13px] font-semibold text-[#1a1200] shadow-[0_0_16px_rgba(201,154,74,0.15)] transition-all hover:shadow-[0_0_24px_rgba(201,154,74,0.3)]"
								>
									Show me around
								</button>
								<ProgressFooter current={stepIndex} total={STEPS.length} onSkip={handleSkip} />
							</div>
						</div>
					</div>
				</>
			) : null}

			{/* ─── Spotlight steps (explore, tools, research) ─── */}
			{isSpotlightStep && spotlightRect && config ? (
				<>
					{/* Spotlight cutout */}
					<div
						className="pointer-events-none fixed rounded-xl"
						style={{
							left: spotlightRect.left - pad,
							top: spotlightRect.top - pad,
							width: spotlightRect.width + pad * 2,
							height: spotlightRect.height + pad * 2,
							boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.65), 0 0 24px 6px ${config.accentColor}`
						}}
					/>

					{/* Tooltip card */}
					<div
						className="pointer-events-auto absolute z-10 w-[280px] animate-[fadein_0.2s_ease-out]"
						style={{
							left: Math.max(
								16,
								Math.min(
									spotlightRect.left + spotlightRect.width / 2 - 140,
									window.innerWidth - 296
								)
							),
							...(config.position === 'above'
								? { top: spotlightRect.top - pad - 14, transform: 'translateY(-100%)' }
								: { top: spotlightRect.bottom + pad + 14 })
						}}
					>
						{config.position === 'below' ? (
							<div className="mb-1 flex justify-center">
								<div className="h-0 w-0 border-x-8 border-b-8 border-x-transparent border-b-[#111214]" />
							</div>
						) : null}

						<div className="overflow-hidden rounded-xl border border-[#222428] bg-[#111214] shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
							<div className="h-px w-full bg-gradient-to-r from-transparent to-transparent" style={{ backgroundImage: `linear-gradient(to right, transparent, ${config.iconColor}40, transparent)` }} />
							<div className="p-4">
								<div className="flex items-start gap-3">
									<div
										className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
										style={{ backgroundColor: `${config.iconColor}15` }}
									>
										<Icon
											name={config.icon}
											height={14}
											width={14}
											style={{ color: config.iconColor }}
										/>
									</div>
									<div className="flex flex-col gap-1">
										<span className="text-[13px] font-semibold text-white">
											{config.title}
										</span>
										<span className="text-[12px] leading-snug text-[#8b8d93]">
											{step === 'research' ? researchDescription : config.description}
										</span>
									</div>
								</div>

								{step !== 'research' ? (
									<button
										onClick={nextStep}
										className="mt-3 w-full rounded-lg bg-[#1e2028] py-2 text-[12px] font-medium text-[#d1d5db] transition-colors hover:bg-[#282c36] hover:text-white"
									>
										Next
									</button>
								) : null}

								<ProgressFooter
									current={stepIndex}
									total={STEPS.length}
									onSkip={handleSkip}
								/>
							</div>
						</div>

						{config.position === 'above' ? (
							<div className="mt-px flex justify-center">
								<div className="h-0 w-0 border-x-8 border-t-8 border-x-transparent border-t-[#111214]" />
							</div>
						) : null}
					</div>
				</>
			) : null}

			{/* ─── Prompts ─── */}
			{step === 'prompts' ? (
				<>
					<div className="pointer-events-auto absolute inset-0 bg-black/60" onClick={handleSkip} />
					<div className="pointer-events-auto absolute inset-0 flex items-center justify-center p-4 animate-[fadein_0.25s_ease-out]">
						<div className="relative w-full max-w-[400px] overflow-hidden rounded-2xl border border-[#222428] bg-[#111214] shadow-[0_24px_64px_rgba(0,0,0,0.7)]">
							<div className="h-px w-full bg-gradient-to-r from-transparent via-green-400/50 to-transparent" />

							<div className="p-6">
								<div className="mb-4 flex flex-col items-center gap-1 text-center">
									<div className="mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-green-500/12">
										<Icon name="check" height={14} width={14} className="text-green-400" />
									</div>
									<span className="text-[15px] font-bold text-white">
										Research mode is on
									</span>
									<span className="text-[13px] text-[#8b8d93]">
										Unsure what to ask? Try one of these:
									</span>
								</div>

								<div className="mb-4 flex flex-col gap-1.5">
									{ONBOARDING_PROMPTS.map((p) => (
										<button
											key={p.label}
											onClick={() => handlePromptClick(p.prompt)}
											className="group flex items-center gap-3 rounded-xl border border-[#1e2028] bg-[#16181c] px-3.5 py-2.5 text-left transition-all duration-150 hover:border-[#2563eb]/20 hover:bg-[#2563eb]/5"
										>
											<Icon
												name={p.icon}
												height={14}
												width={14}
												className="shrink-0 text-[#555] transition-colors group-hover:text-[#60a5fa]"
											/>
											<span className="text-[13px] font-medium text-[#d1d5db] group-hover:text-white">
												{p.label}
											</span>
											<Icon
												name="arrow-right"
												height={12}
												width={12}
												className="ml-auto shrink-0 text-[#333] opacity-0 transition-all group-hover:text-[#60a5fa] group-hover:opacity-100"
											/>
										</button>
									))}
								</div>

								<p className="mb-3 text-center text-[11px] text-[#555]">
									Or type your own question in the input below.
								</p>

								<button
									onClick={handleStartChatting}
									className="w-full rounded-xl border border-[#222428] bg-[#16181c] py-2.5 text-[13px] font-medium text-[#d1d5db] transition-colors hover:bg-[#1e2028] hover:text-white"
								>
									Start chatting
								</button>

								<ProgressFooter
									current={stepIndex}
									total={STEPS.length}
									onSkip={handleSkip}
								/>
							</div>
						</div>
					</div>
				</>
			) : null}
		</div>,
		document.body
	)
}

function ProgressFooter({
	current,
	total,
	onSkip
}: {
	current: number
	total: number
	onSkip: () => void
}) {
	return (
		<div className="mt-3 flex items-center justify-between">
			<div className="flex items-center gap-1">
				{Array.from({ length: total }, (_, i) => (
					<div
						key={i}
						className={`h-1 rounded-full transition-all duration-300 ${
							i <= current ? 'w-3.5 bg-[#C99A4A]' : 'w-1 bg-[#2a2c30]'
						}`}
					/>
				))}
			</div>
			<button
				onClick={onSkip}
				className="text-[11px] text-[#555] transition-colors hover:text-[#8b8d93]"
			>
				Skip
			</button>
		</div>
	)
}
