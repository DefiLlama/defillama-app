import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useMedia } from '~/hooks/useMedia'
import { getExperimentVariant } from '~/utils/analytics/experiment'
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

type Step =
	| 'intro'
	| 'explore'
	| 'alerts'
	| 'upload'
	| 'research'
	| 'mobile-upload'
	| 'mobile-research'
	| 'mobile-explore'
	| 'mobile-alerts'
	| 'prompts'

const DESKTOP_STEPS: Step[] = ['intro', 'explore', 'alerts', 'upload', 'research', 'prompts']
const MOBILE_STEPS: Step[] = ['intro', 'mobile-upload', 'mobile-explore', 'mobile-alerts', 'mobile-research', 'prompts']

// Variant B: short walkthrough (intro → research → prompts)
const DESKTOP_STEPS_SHORT: Step[] = ['intro', 'research', 'prompts']
const MOBILE_STEPS_SHORT: Step[] = ['intro', 'mobile-research', 'prompts']

const MOBILE_DRAWER_STEPS = new Set<Step>(['mobile-upload', 'mobile-research', 'mobile-explore', 'mobile-alerts'])
const RESEARCH_STEPS = new Set<Step>(['research', 'mobile-research'])

interface SpotlightConfig {
	selectors: string[]
	title: string
	description: string
	icon: 'layout-grid' | 'calendar-plus' | 'image-plus' | 'search' | 'plus'
	iconColor: string
	accentColor: string
	position: 'above' | 'below'
}

const SPOTLIGHT_CONFIGS: Partial<Record<Step, SpotlightConfig>> = {
	explore: {
		selectors: ['[data-walkthrough="explore-button"]'],
		title: 'Explore',
		description: 'Not sure what to ask? Browse here to see everything LlamaAI can do — yields, analytics, trade theses, on-chain, and more.',
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
		description: '', // Dynamic — set at render time based on isTrial
		icon: 'search',
		iconColor: '#60a5fa',
		accentColor: 'rgba(37, 99, 235, 0.25)',
		position: 'above'
	},
	'mobile-upload': {
		selectors: ['[data-walkthrough="mobile-upload-item"]'],
		title: 'File Upload',
		description:
			'Upload images, PDFs, or CSVs and ask LlamaAI to analyze them — charts, reports, datasets, anything.',
		icon: 'image-plus',
		iconColor: '#10b981',
		accentColor: 'rgba(16, 185, 129, 0.25)',
		position: 'above'
	},
	'mobile-research': {
		selectors: ['[data-walkthrough="mobile-research-item"]'],
		title: 'Need deeper answers?',
		description: '', // Dynamic — set at render time based on isTrial
		icon: 'search',
		iconColor: '#60a5fa',
		accentColor: 'rgba(37, 99, 235, 0.25)',
		position: 'above'
	},
	'mobile-explore': {
		selectors: ['[data-walkthrough="mobile-explore-item"]'],
		title: 'Explore',
		description: 'Not sure what to ask? Browse here to see everything LlamaAI can do — yields, analytics, trade theses, on-chain, and more.',
		icon: 'layout-grid',
		iconColor: '#60a5fa',
		accentColor: 'rgba(37, 99, 235, 0.25)',
		position: 'above'
	},
	'mobile-alerts': {
		selectors: ['[data-walkthrough="mobile-alerts-item"]'],
		title: 'Scheduled Alerts',
		description:
			'Ask LlamaAI to create alerts for you — daily price checks, portfolio monitors, custom data alerts. This button is for managing them.',
		icon: 'calendar-plus',
		iconColor: '#f59e0b',
		accentColor: 'rgba(245, 158, 11, 0.25)',
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
	const [introExiting, setIntroExiting] = useState(false)
	const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null)
	const isMobile = useMedia('(max-width: 639px)')

	// A/B experiment: full steps (A) vs short steps (B)
	const { user, isTrial } = useAuthContext()
	const variant = useMemo(
		() => (user?.id ? getExperimentVariant('walkthrough-steps-v1', String(user.id)) : 'A'),
		[user?.id]
	)

	// Track experiment assignment once
	useEffect(() => {
		trackUmamiEvent('llamaai-walkthrough-assigned', { variant })
	}, [variant])

	const steps = isMobile
		? variant === 'B' ? MOBILE_STEPS_SHORT : MOBILE_STEPS
		: variant === 'B' ? DESKTOP_STEPS_SHORT : DESKTOP_STEPS
	const stepIndex = steps.indexOf(step)
	const config = SPOTLIGHT_CONFIGS[step]
	const isSpotlightStep = !!config

	// Track first spotlight appearance for entry animation
	const hasShownSpotlightRef = useRef(false)
	const isFirstSpotlight = isSpotlightStep && !hasShownSpotlightRef.current
	useEffect(() => {
		if (isSpotlightStep) hasShownSpotlightRef.current = true
	}, [isSpotlightStep])

	const tapOrClick = isMobile ? 'Tap' : 'Click'
	const researchDescription = isTrial
		? `In-depth reports with analysis, charts, and citations. You have 3 free queries to try. ${tapOrClick} below.`
		: `In-depth reports with analysis, charts, and citations. You get 5 per day. ${tapOrClick} below.`

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

		// rAF-guarded version to coalesce rapid scroll/resize events
		let rafId = 0
		const debouncedUpdateRect = () => {
			if (rafId) cancelAnimationFrame(rafId)
			rafId = requestAnimationFrame(updateRect)
		}

		// If the drawer is about to open for this step, wait for its animation.
		// Otherwise measure on the next frame (element already in the DOM).
		const drawerOpening = MOBILE_DRAWER_STEPS.has(step) && !mobileDrawerOpenRef.current
		const initialDelay = drawerOpening ? 400 : 0

		const timer = setTimeout(() => {
			requestAnimationFrame(updateRect)
		}, initialDelay)

		window.addEventListener('resize', debouncedUpdateRect)
		window.addEventListener('scroll', debouncedUpdateRect, true)
		return () => {
			clearTimeout(timer)
			if (rafId) cancelAnimationFrame(rafId)
			window.removeEventListener('resize', debouncedUpdateRect)
			window.removeEventListener('scroll', debouncedUpdateRect, true)
		}
	}, [step, isSpotlightStep, config])

	// Auto-skip spotlight steps whose target element doesn't exist (e.g. alerts when not available)
	useEffect(() => {
		if (!isSpotlightStep || !config) return

		const timer = setTimeout(() => {
			const hasTarget = config.selectors.some((sel) => document.querySelector(sel))
			if (!hasTarget) {
				const i = steps.indexOf(step)
				if (i < steps.length - 1) {
					setStep(steps[i + 1])
				}
			}
		}, 600)

		return () => clearTimeout(timer)
	}, [step, isSpotlightStep, config, steps])

	// Manage mobile drawer: open when entering a drawer step, close when leaving all drawer steps
	const mobileDrawerOpenRef = useRef(false)
	useEffect(() => {
		let timerId: ReturnType<typeof setTimeout>
		const isMobileDrawerStep = MOBILE_DRAWER_STEPS.has(step)

		if (isMobileDrawerStep && !mobileDrawerOpenRef.current) {
			const btn = document.querySelector<HTMLElement>('[data-walkthrough="mobile-tools-button"]')
			if (btn) {
				btn.click()
				mobileDrawerOpenRef.current = true // optimistic
				timerId = setTimeout(() => {
					const expanded = btn.getAttribute('aria-expanded') === 'true'
					if (!expanded) mobileDrawerOpenRef.current = false // rollback
				}, 400)
			}
		} else if (!isMobileDrawerStep && mobileDrawerOpenRef.current) {
			const btn = document.querySelector<HTMLElement>('[data-walkthrough="mobile-tools-button"][aria-expanded="true"]')
			if (btn) btn.click()
			mobileDrawerOpenRef.current = false
		}

		return () => clearTimeout(timerId)
	}, [step])

	// Auto-advance when user toggles Research mode ON
	useEffect(() => {
		if (RESEARCH_STEPS.has(step) && isResearchMode) {
			trackUmamiEvent('llamaai-walkthrough-step', { from: step, to: 'prompts', variant })
			setStep('prompts')
		}
	}, [step, isResearchMode, variant])

	const nextStep = useCallback(() => {
		const i = steps.indexOf(step)
		if (i < steps.length - 1) {
			const next = steps[i + 1]
			trackUmamiEvent('llamaai-walkthrough-step', { from: step, to: next, variant })

			// Animate intro modal out before advancing
			if (step === 'intro') {
				setIntroExiting(true)
				setTimeout(() => {
					setIntroExiting(false)
					setStep(next)
				}, 250)
			} else {
				setStep(next)
			}
		}
	}, [step, steps, variant])

	const handlePromptClick = useCallback(
		(prompt: string) => {
			trackUmamiEvent('llamaai-walkthrough-complete', { action: 'prompt-click', prompt: prompt.slice(0, 60), variant })
			if (!isResearchMode) {
				setIsResearchMode(true)
			}
			onComplete()
			handleSubmit(prompt, undefined, undefined, undefined, true)
		},
		[handleSubmit, onComplete, isResearchMode, setIsResearchMode, variant]
	)

	const handleSkip = useCallback(() => {
		trackUmamiEvent('llamaai-walkthrough-skip', { step, variant })
		setIsResearchMode(true)
		onComplete()
	}, [step, variant, setIsResearchMode, onComplete])

	// Dismiss walkthrough on Escape key
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') handleSkip()
		}
		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [handleSkip])

	const handleStartChatting = useCallback(() => {
		trackUmamiEvent('llamaai-walkthrough-complete', { action: 'start-chatting', variant })
		setIsResearchMode(true)
		onComplete()
		requestAnimationFrame(() => promptInputRef.current?.focus())
	}, [variant, setIsResearchMode, onComplete, promptInputRef])

	if (typeof document === 'undefined') return null

	const pad = 4
	// ~180px for tooltip height; flip if not enough room in preferred direction
	const tooltipH = 180
	const tooltipPosition =
		isSpotlightStep && spotlightRect
			? config!.position === 'above' && spotlightRect.top - pad - 14 - tooltipH < 0
				? 'below'
				: config!.position === 'below' && spotlightRect.bottom + pad + 14 + tooltipH > window.innerHeight
					? 'above'
					: config!.position
			: 'below'

	// Show a plain dark overlay while waiting for spotlight measurement
	// so there's no flash of bare screen between intro and first spotlight
	const showGapOverlay = isSpotlightStep && !spotlightRect

	return createPortal(
		<div className="pointer-events-none fixed inset-0 z-[9999]">
			{/* Dark overlay bridging the gap between intro→spotlight and spotlight→prompts */}
			{showGapOverlay ? (
				<div className="pointer-events-auto absolute inset-0 bg-black/60" onClick={handleSkip} />
			) : null}

			{/* ─── Intro ─── */}
			{step === 'intro' ? (
				<>
					<div className="pointer-events-auto absolute inset-0 bg-black/60" onClick={handleSkip} />
					<div
						className={`pointer-events-auto absolute inset-0 flex items-center justify-center p-4 ${
							introExiting
								? 'animate-[intro-exit_0.25s_ease-in_forwards]'
								: 'animate-[fadein_0.3s_ease-out]'
						}`}
					>
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
									className="w-full rounded-xl bg-[linear-gradient(94deg,#FDE0A9_25%,#FBEDCB_57%,#FDE0A9_100%)] py-2.5 text-[13px] font-semibold text-[#1a1200] shadow-[0_0_20px_rgba(253,224,169,0.3)] transition-all hover:shadow-[0_0_28px_rgba(253,224,169,0.5)]"
								>
									Show me around
								</button>
								<ProgressFooter current={stepIndex} total={steps.length} onSkip={handleSkip} />
							</div>
						</div>
					</div>
				</>
			) : null}

			{/* ─── Spotlight steps ─── */}
			{isSpotlightStep && spotlightRect && config ? (
				<>
					{/* Touch-blocking overlay: 4 rects around the spotlight hole */}
					<div
						className="pointer-events-auto fixed transition-all duration-300 ease-in-out"
						style={{ top: 0, left: 0, right: 0, height: spotlightRect.top - pad }}
					/>
					<div
						className="pointer-events-auto fixed transition-all duration-300 ease-in-out"
						style={{ top: spotlightRect.bottom + pad, left: 0, right: 0, bottom: 0 }}
					/>
					<div
						className="pointer-events-auto fixed transition-all duration-300 ease-in-out"
						style={{
							top: spotlightRect.top - pad,
							left: 0,
							width: spotlightRect.left - pad,
							height: spotlightRect.height + pad * 2
						}}
					/>
					<div
						className="pointer-events-auto fixed transition-all duration-300 ease-in-out"
						style={{
							top: spotlightRect.top - pad,
							left: spotlightRect.right + pad,
							right: 0,
							height: spotlightRect.height + pad * 2
						}}
					/>

					{/* Spotlight cutout (visual dim + glow) */}
					<div
						className={`pointer-events-none fixed rounded-xl transition-all duration-300 ease-in-out ${isFirstSpotlight ? 'animate-[spotlight-enter_0.35s_ease-out]' : ''}`}
						style={{
							left: spotlightRect.left - pad,
							top: spotlightRect.top - pad,
							width: spotlightRect.width + pad * 2,
							height: spotlightRect.height + pad * 2,
							boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 24px 6px ${config.accentColor}`
						}}
					/>

					{/* Tooltip card */}
					<div
						className={`pointer-events-auto absolute z-10 w-[280px] transition-[left,top] duration-300 ease-in-out ${isFirstSpotlight ? (tooltipPosition === 'above' ? 'animate-[tooltip-enter-above_0.35s_ease-out]' : 'animate-[tooltip-enter-below_0.35s_ease-out]') : ''}`}
						style={{
							left: Math.max(
								16,
								Math.min(
									spotlightRect.left + spotlightRect.width / 2 - 140,
									window.innerWidth - 296
								)
							),
							...(tooltipPosition === 'above'
								? { top: spotlightRect.top - pad - 14, transform: 'translateY(-100%)' }
								: { top: spotlightRect.bottom + pad + 14 })
						}}
					>
						{tooltipPosition === 'below' ? (
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
											{RESEARCH_STEPS.has(step) ? researchDescription : config.description}
										</span>
									</div>
								</div>

								{!RESEARCH_STEPS.has(step) ? (
									<button
										onClick={nextStep}
										className="mt-3 w-full rounded-lg bg-[#1e2028] py-2 text-[12px] font-medium text-[#d1d5db] transition-colors hover:bg-[#282c36] hover:text-white"
									>
										Next
									</button>
								) : null}

								<ProgressFooter
									current={stepIndex}
									total={steps.length}
									onSkip={handleSkip}
								/>
							</div>
						</div>

						{tooltipPosition === 'above' ? (
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
									total={steps.length}
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
