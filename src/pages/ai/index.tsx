import * as Ariakit from '@ariakit/react'
import clsx from 'clsx'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { setPendingPrompt, setPendingSuggestedFlag } from '~/components/LlamaAIFloatingButton'
import { SEO } from '~/components/SEO'
import { MCP_SERVER } from '~/constants'
import { TOOL_ICONS, TOOL_LABELS } from '~/containers/LlamaAI/components/status/StreamingStatus'
import type { LandingQuestion } from '~/containers/LlamaAI/types'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { SignInForm } from '~/containers/Subscribtion/SignIn'
import { useIsClient } from '~/hooks/useIsClient'
import { WalletProvider } from '~/layout/WalletProvider'
import { trackUmamiEvent } from '~/utils/analytics/umami'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const EXAMPLE_CONVERSATIONS = [
	{
		id: 'find-alpha',
		category: 'Find Alpha',
		prompt: 'Show me the top 5 protocols with growing TVL but declining token prices',
		description: 'Table + chart analysis identifying potential value opportunities and key insights',
		url: 'https://defillama.com/ai/chat/shared/34525e47-528e-4b20-8ab4-4d2dd5d31252',
		screenshot: '/assets/llamaai/llamaai-3'
	},
	{
		id: 'research',
		category: 'Research',
		prompt: 'Provide an overview of the stablecoin sector with focus on CBDCs',
		description: 'In-depth research report covering market trends, legislation, and adoption',
		url: 'https://defillama.com/ai/chat/shared/9634371a-d385-4e28-bcd8-d758f0bbcd30',
		screenshot: '/assets/llamaai/llamaai-1'
	},
	{
		id: 'speculative',
		category: 'Speculative',
		prompt: 'Price estimate for BTC using technicals, Monte Carlo, and prediction markets',
		description: 'Blended analysis with charts, simulation outcomes, and Polymarket probabilities',
		url: 'https://defillama.com/ai/chat/shared/b60a2440-445e-4755-b227-7127557a4d79',
		screenshot: '/assets/llamaai/llamaai-2'
	}
] as const

const CAPABILITIES = [
	{ icon: 'bar-chart-2' as const, label: 'Charts & Analytics', sub: 'Auto-generated charts' },
	{ icon: 'trending-up' as const, label: 'Price Forecasts', sub: 'Monte Carlo + technicals' },
	{ icon: 'link' as const, label: 'On-chain Analysis', sub: 'Smart money & logs' },
	{ icon: 'calendar' as const, label: 'Scheduled Alerts', sub: 'Automated daily checks' },
	{ icon: 'file-text' as const, label: 'Research Reports', sub: 'Multi-agent deep dives' }
]

const FALLBACK_QUESTIONS: LandingQuestion[] = [
	{ text: 'Which protocols have growing TVL but declining token prices right now?', tag: 'Find Alpha' },
	{ text: 'Build a conviction-scored trade thesis on ETH with technicals and on-chain data', tag: 'Trade Thesis' },
	{ text: 'What are the best delta-neutral yield strategies for 10 ETH on Ethereum?', tag: 'Yield Strategy' },
	{ text: 'Show me all USDC mint events on Ethereum this week', tag: 'On-Chain' },
	{ text: 'Deep research report on the current state of restaking protocols', tag: 'Research' },
	{ text: 'What tokens does vitalik.eth hold and what changed recently?', tag: 'Wallet Analysis' },
	{ text: 'Compare Uniswap vs Curve vs Balancer fees and volume over the last 30 days', tag: 'Analytics' },
	{ text: 'What are the latest crypto fundraising rounds this month?', tag: 'Raises' },
	{ text: 'Price estimate for BTC using Monte Carlo simulation and prediction markets', tag: 'Forecasting' }
]

function FreeQuestionsSection({ landingQuestions }: { landingQuestions?: LandingQuestion[] }) {
	const router = useRouter()
	const { isAuthenticated, hasActiveSubscription, loaders } = useAuthContext()
	const [pendingQuestion, setPendingQuestion] = useState<LandingQuestion | null>(null)
	const signInDialogStore = Ariakit.useDialogStore()

	if (isAuthenticated && hasActiveSubscription) return null

	const questions = landingQuestions?.length ? landingQuestions : FALLBACK_QUESTIONS
	const displayed = questions.slice(0, 9)

	const handleClick = (question: LandingQuestion) => {
		trackUmamiEvent('llamaai-landing-free-question-click', {
			tag: question.tag,
			question: question.text.slice(0, 50)
		})
		if (!loaders.userLoading && isAuthenticated) {
			setPendingPrompt(question.text)
			setPendingSuggestedFlag()
			void router.push('/ai/chat')
		} else {
			setPendingPrompt(question.text)
			setPendingSuggestedFlag()
			setPendingQuestion(question)
			signInDialogStore.show()
		}
	}

	return (
		<section id="free-questions" className="relative z-10 mx-auto max-w-5xl px-4 pb-20 md:px-8 md:pb-28">
			<div className="mb-6 text-center">
				<h2 className="mb-2 text-[1.75rem] font-extrabold tracking-[-0.02em] text-black md:text-[2rem] dark:text-white">
					Try LlamaAI for free
				</h2>
				<p className="text-sm text-[#666] dark:text-[#919296]">
					Pick a question below to get a full AI-powered answer — 3 free per day.{' '}
					{isAuthenticated ? null : (
						<>
							<button
								onClick={() => signInDialogStore.show()}
								className="font-medium text-[#C99A4A] underline decoration-[#C99A4A]/40 transition-colors hover:text-[#B8860B] dark:text-[#FDE0A9] dark:hover:text-[#FBEDCB]"
							>
								Sign in
							</button>{' '}
							to start.
						</>
					)}
				</p>
			</div>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{displayed.map((q, i) => (
					<button
						key={i}
						onClick={() => handleClick(q)}
						className={clsx(
							'group flex flex-col items-start gap-3 rounded-xl border border-[#E8E8E8] bg-white p-4 text-left transition-all duration-200',
							'hover:-translate-y-0.5 hover:border-[#C99A4A]/50 hover:shadow-[0_8px_24px_rgba(253,224,169,0.15)]',
							'dark:border-[#2a2a2e] dark:bg-[#1e1f23] dark:hover:border-[#FDE0A9]/30 dark:hover:shadow-[0_8px_24px_rgba(253,224,169,0.08)]'
						)}
					>
						<span className="inline-block rounded-full border border-[#C99A4A]/30 bg-[#C99A4A]/8 px-2.5 py-0.5 text-[11px] font-semibold text-[#C99A4A] dark:border-[#FDE0A9]/30 dark:bg-[#FDE0A9]/8 dark:text-[#FDE0A9]">
							{q.tag}
						</span>
						<span className="flex-1 text-[14px] leading-snug text-[#333] dark:text-[#e0e0e3]">{q.text}</span>
						<span className="flex items-center gap-1 text-[13px] font-semibold text-[#C99A4A] opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:text-[#FDE0A9]">
							Ask this
							<Icon name="arrow-right" height={12} width={12} />
						</span>
					</button>
				))}
			</div>

			<WalletProvider>
				<Ariakit.Dialog
					store={signInDialogStore}
					className="dialog flex max-h-[90dvh] max-w-md flex-col overflow-y-auto rounded-xl border border-[#39393E] bg-[#1a1b1f] p-4 shadow-2xl max-sm:drawer max-sm:rounded-b-none sm:p-6"
					unmountOnHide
				>
					{pendingQuestion ? (
						<p className="mb-4 rounded-lg bg-[#C99A4A]/10 px-3 py-2 text-center text-sm text-[#C99A4A]">
							Sign in to ask: &ldquo;{pendingQuestion.text.slice(0, 60)}
							{pendingQuestion.text.length > 60 ? '...' : ''}&rdquo;
						</p>
					) : null}
					<SignInForm text="Sign in to try LlamaAI for free" dialogStore={signInDialogStore} returnUrl="/ai/chat" />
				</Ariakit.Dialog>
			</WalletProvider>
		</section>
	)
}

const TrialBadge = ({ centered = false }: { centered?: boolean }) => {
	const { isAuthenticated, hasActiveSubscription } = useAuthContext()
	if (isAuthenticated && hasActiveSubscription) return null

	return (
		<p
			className={clsx(
				'mt-3 text-[13px] text-[#666] dark:text-[#919296]',
				centered ? 'text-center' : 'text-center md:text-left'
			)}
		>
			7-day free trial available
		</p>
	)
}

const CTAButton = ({ className = '', label }: { className?: string; label?: string }) => {
	const { isAuthenticated, hasActiveSubscription } = useAuthContext()
	const defaultLabel = isAuthenticated && hasActiveSubscription ? 'Ask LlamaAI' : 'Try LlamaAI for free'
	const displayLabel = label ?? defaultLabel

	return isAuthenticated && hasActiveSubscription ? (
		<BasicLink
			href="/ai/chat"
			data-umami-event="llamaai-landing-cta-subscribed"
			className={clsx(
				'llamaai-glow relative z-10 inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-[linear-gradient(93.94deg,#FDE0A9_24.73%,#FBEDCB_57.42%,#FDE0A9_99.73%)] px-6 py-3 text-base font-semibold text-black shadow-[0px_0px_30px_0px_rgba(253,224,169,0.5),0px_0px_1px_2px_rgba(255,255,255,0.1)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0px_0px_40px_0px_rgba(253,224,169,0.7)]',
				className
			)}
		>
			<svg className="h-4 w-4 shrink-0">
				<use href="/assets/llamaai/ask-llamaai-3.svg#ai-icon" />
			</svg>
			<span className="whitespace-nowrap">{displayLabel}</span>
		</BasicLink>
	) : (
		<a
			href="#free-questions"
			onClick={(e) => {
				e.preventDefault()
				document.getElementById('free-questions')?.scrollIntoView({ behavior: 'smooth' })
			}}
			data-umami-event="llamaai-landing-cta-unsubscribed"
			className={clsx(
				'animate-cta-glow llamaai-glow relative z-10 inline-flex cursor-pointer items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-[linear-gradient(93.94deg,#FDE0A9_24.73%,#FBEDCB_57.42%,#FDE0A9_99.73%)] px-6 py-3.5 text-base font-semibold text-black shadow-[0px_0px_30px_0px_rgba(253,224,169,0.5),0px_0px_1px_2px_rgba(255,255,255,0.1)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0px_0px_50px_0px_rgba(253,224,169,0.8)]',
				className
			)}
		>
			<svg className="h-4 w-4 shrink-0">
				<use href="/assets/llamaai/ask-llamaai-3.svg#ai-icon" />
			</svg>
			<span className="whitespace-nowrap">{displayLabel}</span>
		</a>
	)
}

function ExampleShowcase() {
	const [current, setCurrent] = useState(0)
	const [isTransitioning, setIsTransitioning] = useState(false)
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

	const goTo = useCallback((index: number) => {
		setIsTransitioning(true)
		setTimeout(() => {
			setCurrent(index)
			setIsTransitioning(false)
		}, 200)
	}, [])

	const resetInterval = useCallback(() => {
		if (intervalRef.current) clearInterval(intervalRef.current)
		intervalRef.current = setInterval(() => {
			setIsTransitioning(true)
			setTimeout(() => {
				setCurrent((prev) => (prev + 1) % EXAMPLE_CONVERSATIONS.length)
				setIsTransitioning(false)
			}, 200)
		}, 6000)
	}, [])

	useEffect(() => {
		resetInterval()
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current)
		}
	}, [resetInterval])

	const example = EXAMPLE_CONVERSATIONS[current]

	return (
		<div>
			<div className="mb-3 flex items-start gap-2.5 px-1">
				<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#E8E8E8] bg-[#FAFAFA] text-sm dark:border-[#2a2a2e] dark:bg-[#1e1f23]">
					👤
				</div>
				<div>
					<span className="mb-1 block text-[11px] font-bold tracking-wider text-[#C99A4A] uppercase dark:text-[#FDE0A9]">
						{example.category}
					</span>
					<span className="text-[14px] leading-snug font-medium text-[#333] dark:text-[#e8e8ea]">
						&ldquo;{example.prompt}&rdquo;
					</span>
				</div>
			</div>

			<a
				href={example.url}
				target="_blank"
				rel="noopener noreferrer"
				onClick={() => trackUmamiEvent('llamaai-landing-showcase-click', { example: example.id })}
				className={clsx(
					'group relative block overflow-hidden rounded-2xl border border-[#E8E8E8] shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all duration-500',
					'hover:-translate-y-1 hover:border-[#C99A4A]/40 hover:shadow-[0_24px_64px_rgba(253,224,169,0.2)]',
					'dark:border-[#2a2a2e] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)] dark:hover:border-[#FDE0A9]/30 dark:hover:shadow-[0_24px_64px_rgba(253,224,169,0.1)]'
				)}
			>
				<div
					className={clsx(
						'relative aspect-4/3 w-full overflow-hidden bg-[#131516] transition-opacity duration-200',
						isTransitioning ? 'opacity-0' : 'opacity-100'
					)}
				>
					<img
						src={`${example.screenshot}.png`}
						alt={`LlamaAI ${example.category} example`}
						className="hidden h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105 dark:block"
					/>
					<img
						src={`${example.screenshot}-light.png`}
						alt={`LlamaAI ${example.category} example`}
						className="block h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105 dark:hidden"
					/>
					<div className="absolute inset-0 flex items-center justify-center bg-linear-to-t from-black/50 via-black/0 to-black/0 opacity-0 transition-all duration-500 group-hover:opacity-100">
						<span className="flex translate-y-4 items-center gap-2 rounded-full bg-linear-to-r from-[#FDE0A9] to-[#F5D08C] px-5 py-2.5 text-sm font-semibold text-[#5C4A1F] shadow-[0_8px_32px_rgba(253,224,169,0.5)] transition-all duration-500 group-hover:translate-y-0">
							View full conversation
							<Icon name="arrow-up-right" height={14} width={14} />
						</span>
					</div>
				</div>
				<div className="flex items-center justify-between bg-white px-4 py-3 dark:bg-[#1e1f23]">
					<span className="text-[13px] text-[#777] dark:text-[#919296]">{example.description}</span>
					<span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-[#C99A4A] transition-all group-hover:gap-2 dark:text-[#FDE0A9]">
						View
						<Icon name="arrow-up-right" height={12} width={12} />
					</span>
				</div>
			</a>

			<div className="mt-3 flex items-center justify-center gap-2">
				{EXAMPLE_CONVERSATIONS.map((_, i) => (
					<button
						key={i}
						onClick={() => {
							goTo(i)
							resetInterval()
						}}
						className={clsx(
							'h-1.5 rounded-full transition-all duration-300',
							i === current
								? 'w-6 bg-[#C99A4A] dark:bg-[#FDE0A9]'
								: 'w-1.5 bg-[#E8E8E8] hover:bg-[#ccc] dark:bg-[#2a2a2e] dark:hover:bg-[#404040]'
						)}
						aria-label={`Show example ${i + 1}`}
					/>
				))}
			</div>
		</div>
	)
}

const CATEGORY_TAGS: Record<string, string> = {
	find_alpha: 'Find Alpha',
	analytics: 'Analytics',
	speculative_guidance: 'Trade Thesis',
	learn: 'Learn',
	research_report: 'Research'
}

export const getStaticProps = withPerformanceLogging('ai', async () => {
	let landingQuestions: LandingQuestion[] = []
	try {
		const res = await fetch(`${MCP_SERVER}/suggested-questions/landing`)
		if (res.ok) {
			const data = await res.json()
			if (data?.questions?.length) {
				landingQuestions = data.questions
			} else if (data?.categories) {
				const cats = Object.entries(data.categories) as [string, string[]][]
				for (const [cat, questions] of cats) {
					const tag = CATEGORY_TAGS[cat] || cat.replace(/_/g, ' ')
					for (const q of questions.slice(0, 2)) {
						landingQuestions.push({ text: q, tag })
					}
				}
				landingQuestions = landingQuestions.sort(() => Math.random() - 0.5).slice(0, 9)
			}
		}
	} catch {}

	return {
		props: { landingQuestions },
		revalidate: maxAgeForNext([22])
	}
})

export default function LlamaAIGetStarted({ landingQuestions }: { landingQuestions?: LandingQuestion[] }) {
	const [isVideoPlaying, setIsVideoPlaying] = useState(false)

	const isClient = useIsClient()

	return (
		<>
			<SEO
				title="LlamaAI - DefiLlama"
				description="AI-powered research across DeFi, TradFi, and onchain data. Parallel agents, scheduled alerts, custom memory, and DefiLlama's full dataset through natural conversation."
				canonicalUrl="/ai"
			/>
			<style>{`
				@keyframes cta-glow-pulse {
					0%, 100% { box-shadow: 0px 0px 30px 0px rgba(253,224,169,0.5), 0px 0px 1px 2px rgba(255,255,255,0.1); }
					50% { box-shadow: 0px 0px 45px 5px rgba(253,224,169,0.7), 0px 0px 1px 2px rgba(255,255,255,0.1); }
				}
				.animate-cta-glow {
					animation: cta-glow-pulse 2s ease-in-out infinite;
				}
				@keyframes bentoBarShimmer {
					0%, 100% { opacity: 0.3; }
					50% { opacity: 0.7; }
				}
			`}</style>
			<div className="col-span-full flex min-h-screen flex-col overflow-x-hidden bg-[#FAFAFA] dark:bg-[#131416]">
				{/* Header */}
				<header className="relative z-20 px-4 pt-4 md:px-8 md:pt-6">
					<BasicLink
						href="/"
						className="inline-block w-fit opacity-70 transition-opacity duration-300 hover:opacity-100"
					>
						<span className="sr-only">Navigate to DeFi Dashboard</span>
						<img
							src="/assets/defillama.webp"
							height={36}
							width={105}
							className="hidden object-contain object-left dark:block"
							alt=""
						/>
						<img
							src="/assets/defillama-dark.webp"
							height={36}
							width={105}
							className="object-contain object-left dark:hidden"
							alt=""
						/>
					</BasicLink>
				</header>

				{/* Hero Section */}
				<section className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-12 pb-16 md:px-8 md:pt-16 md:pb-20">
					<div className="grid items-start gap-8 md:grid-cols-2 md:gap-10 lg:gap-16">
						{/* Left: Text Content */}
						<div
							className={clsx(
								'relative z-10 flex flex-col items-center text-center md:items-start md:text-left',
								'transition-all duration-700',
								isClient ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
							)}
						>
							<div className="relative mb-8">
								<span
									className="absolute inset-0 -m-8 block rounded-full"
									style={{
										background: 'radial-gradient(circle, #FDE0A9 0%, transparent 65%)',
										filter: 'blur(30px)',
										opacity: 0.6
									}}
								/>
								<span
									className="absolute inset-0 -m-4 block rounded-full"
									style={{
										background: 'radial-gradient(circle, #FDE0A9 0%, transparent 60%)',
										filter: 'blur(15px)',
										opacity: 0.4
									}}
								/>
								<img
									src="/assets/llamaai/llama-ai.svg"
									alt=""
									className="relative h-20 w-20 object-contain drop-shadow-[0_0_20px_rgba(253,224,169,0.4)] md:h-24 md:w-24"
								/>
							</div>
							<h1 className="mb-6 text-[3rem] leading-[1.05] font-extrabold tracking-[-0.03em] text-black md:text-[4rem] lg:text-[4.5rem] dark:text-white">
								<span className="bg-linear-to-r from-[#C99A4A] to-[#8B6914] bg-clip-text text-transparent dark:from-[#FDE0A9] dark:to-[#C99A4A]">
									LlamaAI
								</span>
							</h1>
							<p className="mb-8 max-w-lg text-lg leading-relaxed text-[#555] md:text-xl dark:text-[#a0a0a5]">
								AI-powered research: DeFi and TradFi data with live insights and actionable analysis.
							</p>
							<div className="relative z-20">
								<CTAButton />
								<TrialBadge />
							</div>
						</div>

						{/* Right: Rotating Showcase */}
						<div
							className={clsx(
								'relative w-full pt-4',
								'transition-all delay-200 duration-700',
								isClient ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
							)}
						>
							<ExampleShowcase />
						</div>
					</div>
				</section>

				{/* Capability Strip - Desktop: single row of 5, Mobile: 3 top + 2 bottom centered */}
				<section className="relative z-10 mx-auto max-w-5xl px-4 pb-10 md:px-8">
					{/* Desktop: all 5 in one row */}
					<div className="hidden overflow-hidden rounded-xl border border-[#E8E8E8] bg-[#E8E8E8] md:grid md:grid-cols-5 md:gap-px dark:border-[#2a2a2e] dark:bg-[#2a2a2e]">
						{CAPABILITIES.map((cap) => (
							<div
								key={cap.label}
								className="flex flex-col items-center gap-1.5 bg-white px-3 py-4 text-center dark:bg-[#1e1f23]"
							>
								<Icon name={cap.icon} height={18} width={18} className="text-[#C99A4A] dark:text-[#FDE0A9]" />
								<span className="text-[11px] font-semibold text-[#555] dark:text-[#a0a0a5]">{cap.label}</span>
								<span className="text-[10px] text-[#999] dark:text-[#666]">{cap.sub}</span>
							</div>
						))}
					</div>
					{/* Mobile: top row of 3, bottom row of 2 centered */}
					<div className="flex flex-col items-center md:hidden">
						<div className="grid w-full grid-cols-3 gap-px overflow-hidden rounded-t-xl border-x border-t border-[#E8E8E8] bg-[#E8E8E8] dark:border-[#2a2a2e] dark:bg-[#2a2a2e]">
							{CAPABILITIES.slice(0, 3).map((cap) => (
								<div
									key={cap.label}
									className="flex flex-col items-center gap-1.5 bg-white px-3 py-4 text-center dark:bg-[#1e1f23]"
								>
									<Icon name={cap.icon} height={18} width={18} className="text-[#C99A4A] dark:text-[#FDE0A9]" />
									<span className="text-[11px] font-semibold text-[#555] dark:text-[#a0a0a5]">{cap.label}</span>
									<span className="text-[10px] text-[#999] dark:text-[#666]">{cap.sub}</span>
								</div>
							))}
						</div>
						<div className="grid w-2/3 grid-cols-2 gap-px overflow-hidden rounded-b-xl border-x border-b border-[#E8E8E8] bg-[#E8E8E8] dark:border-[#2a2a2e] dark:bg-[#2a2a2e]">
							{CAPABILITIES.slice(3).map((cap) => (
								<div
									key={cap.label}
									className="flex flex-col items-center gap-1.5 bg-white px-3 py-4 text-center dark:bg-[#1e1f23]"
								>
									<Icon name={cap.icon} height={18} width={18} className="text-[#C99A4A] dark:text-[#FDE0A9]" />
									<span className="text-[11px] font-semibold text-[#555] dark:text-[#a0a0a5]">{cap.label}</span>
									<span className="text-[10px] text-[#999] dark:text-[#666]">{cap.sub}</span>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Free Questions */}
				{isClient && <FreeQuestionsSection landingQuestions={landingQuestions} />}

				{/* Bento Grid */}
				<section className="relative z-10 px-4 pb-20 md:px-8 md:pb-28">
					<div className="mx-auto max-w-5xl">
						<h2 className="mb-8 text-center text-[1.75rem] font-extrabold tracking-[-0.02em] text-black md:mb-10 md:text-[2rem] dark:text-white">
							Every metric. Every market. One conversation.
						</h2>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
							{/* DeFi & TradFi - wide card */}
							<div className="group relative overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white p-6 pb-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#C99A4A]/40 md:col-span-2 dark:border-[#2a2a2e] dark:bg-[#1e1f23] dark:hover:border-[#FDE0A9]/30">
								<h3 className="mb-1.5 text-base font-bold text-[#C99A4A] dark:text-[#FDE0A9]">
									DeFi, TradFi & Onchain
								</h3>
								<p className="mb-4 max-w-lg text-[14px] leading-relaxed text-[#555] dark:text-[#a0a0a5]">
									DefiLlama's 5,000+ protocols paired with stocks, macro, and onchain data. Questions that used to need
									multiple tools and tabs are now single prompts.
								</p>
								<div className="overflow-hidden rounded-lg border border-[#E8E8E8] bg-[#FAFAFA] dark:border-[#2a2a2e] dark:bg-[#16171a]">
									<div className="flex items-center justify-between border-b border-[#E8E8E8] px-3 py-2 dark:border-[#2a2a2e]">
										<span className="text-[11px] font-medium text-[#333] dark:text-[#ccc]">5 tool calls</span>
										<span className="text-[10px] text-[#999] dark:text-[#666]">
											<span className="text-[#22c55e]">5/5 ok</span> 6921ms
										</span>
									</div>
									<div className="space-y-0 divide-y divide-[#E8E8E8] dark:divide-[#2a2a2e]">
										{[
											{ key: 'load_skill', time: '2ms' },
											{ key: 'execute_sql', time: '31ms', detail: '64 rows' },
											{ key: 'valyu_search', time: '6579ms', detail: '42 rows' },
											{ key: 'execute_code', time: '14ms' },
											{ key: 'generate_chart', time: '295ms' }
										].map((tool) => {
											const meta = TOOL_ICONS[tool.key] || { icon: 'sparkles', color: '#919296' }
											return (
												<div key={tool.key} className="flex items-center gap-2 px-3 py-1.5">
													<Icon
														name={meta.icon as any}
														height={11}
														width={11}
														className="shrink-0 opacity-70"
														style={{ color: meta.color }}
													/>
													<span className="flex-1 truncate text-[11px] text-[#555] dark:text-[#999]">
														{TOOL_LABELS[tool.key]}
													</span>
													<span className="text-[10px] font-medium text-[#22c55e]">ok</span>
													<span className="text-[10px] text-[#999] tabular-nums dark:text-[#666]">{tool.time}</span>
													{tool.detail ? (
														<span className="text-[10px] text-[#999] tabular-nums dark:text-[#666]">{tool.detail}</span>
													) : null}
												</div>
											)
										})}
									</div>
								</div>
							</div>

							{/* Scheduled Alerts */}
							<div className="group relative overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white p-6 pb-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#C99A4A]/40 dark:border-[#2a2a2e] dark:bg-[#1e1f23] dark:hover:border-[#FDE0A9]/30">
								<h3 className="mb-1.5 text-base font-bold text-[#C99A4A] dark:text-[#FDE0A9]">Scheduled Alerts</h3>
								<p className="mb-4 text-[14px] leading-relaxed text-[#555] dark:text-[#a0a0a5]">
									Automate recurring prompts. Set up daily price checks, portfolio summaries, or custom data monitors on
									your schedule.
								</p>
								<div className="overflow-hidden rounded-lg border border-[#E8E8E8] bg-[#FAFAFA] dark:border-[#2a2a2e] dark:bg-[#16171a]">
									<div className="border-b border-[#E8E8E8] px-3 py-2 dark:border-[#2a2a2e]">
										<div className="flex items-center gap-2">
											<div className="flex h-5 w-5 items-center justify-center rounded bg-[#C99A4A]/15 dark:bg-[#FDE0A9]/15">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="11"
													height="11"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2.5"
													strokeLinecap="round"
													strokeLinejoin="round"
													className="text-[#C99A4A] dark:text-[#FDE0A9]"
												>
													<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
													<line x1="16" y1="2" x2="16" y2="6" />
													<line x1="8" y1="2" x2="8" y2="6" />
													<line x1="3" y1="10" x2="21" y2="10" />
												</svg>
											</div>
											<span className="text-[11px] font-semibold text-[#333] dark:text-[#ccc]">Your Alerts</span>
										</div>
									</div>
									<div className="flex items-center gap-2 px-3 py-2.5">
										<div className="min-w-0 flex-1">
											<p className="truncate text-[11px] font-medium text-[#333] dark:text-[#ccc]">
												Daily Crypto Price Check
											</p>
											<p className="text-[10px] text-[#999] dark:text-[#666]">Daily at 9 AM UTC</p>
										</div>
										<div className="h-3.5 w-6 shrink-0 rounded-full bg-[#3B82F6] p-0.5">
											<div className="h-2.5 w-2.5 translate-x-2.5 rounded-full bg-white shadow-sm" />
										</div>
									</div>
								</div>
							</div>

							{/* Memory & Settings */}
							<div className="group relative overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white p-6 pb-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#C99A4A]/40 dark:border-[#2a2a2e] dark:bg-[#1e1f23] dark:hover:border-[#FDE0A9]/30">
								<h3 className="mb-1.5 text-base font-bold text-[#C99A4A] dark:text-[#FDE0A9]">
									Customize Your Experience
								</h3>
								<p className="mb-4 text-[14px] leading-relaxed text-[#555] dark:text-[#a0a0a5]">
									LlamaAI learns what you care about and tailors responses to your style. Set custom instructions and
									let memory build your profile across sessions.
								</p>
								<div className="overflow-hidden rounded-lg border border-[#E8E8E8] bg-[#FAFAFA] dark:border-[#2a2a2e] dark:bg-[#16171a]">
									<div className="border-b border-[#E8E8E8] px-3 py-2 dark:border-[#2a2a2e]">
										<div className="flex items-center gap-2">
											<div className="flex h-5 w-5 items-center justify-center rounded bg-[#3B82F6]/15">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="11"
													height="11"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2.5"
													strokeLinecap="round"
													strokeLinejoin="round"
													className="text-[#3B82F6]"
												>
													<circle cx="12" cy="12" r="3" />
													<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
												</svg>
											</div>
											<span className="text-[11px] font-semibold text-[#333] dark:text-[#ccc]">Settings</span>
										</div>
									</div>
									<div className="space-y-0 divide-y divide-[#E8E8E8] dark:divide-[#2a2a2e]">
										<div className="px-3 py-2">
											<p className="text-[11px] font-medium text-[#333] dark:text-[#ccc]">Custom Instructions</p>
											<p className="text-[10px] text-[#999] dark:text-[#666]">Be concise. Always include % changes.</p>
										</div>
										<div className="flex items-center gap-2 px-3 py-2">
											<div className="min-w-0 flex-1">
												<p className="text-[11px] font-medium text-[#333] dark:text-[#ccc]">Remember my preferences</p>
											</div>
											<div className="h-3.5 w-6 shrink-0 rounded-full bg-[#3B82F6] p-0.5">
												<div className="h-2.5 w-2.5 translate-x-2.5 rounded-full bg-white shadow-sm" />
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* Research Reports - wide card */}
							<div className="group relative overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white p-6 pb-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#C99A4A]/40 md:col-span-2 dark:border-[#2a2a2e] dark:bg-[#1e1f23] dark:hover:border-[#FDE0A9]/30">
								<h3 className="mb-1.5 text-base font-bold text-[#C99A4A] dark:text-[#FDE0A9]">Research Reports</h3>
								<p className="mb-4 max-w-lg text-[14px] leading-relaxed text-[#555] dark:text-[#a0a0a5]">
									Generate in-depth research reports on any protocol, sector, or trend. Multiple agents research in
									parallel, then synthesize everything into a single exportable PDF.
								</p>
								<div className="overflow-hidden rounded-lg border border-[#E8E8E8] bg-[#FAFAFA] dark:border-[#2a2a2e] dark:bg-[#16171a]">
									<div className="flex items-center gap-2.5 border-b border-[#E8E8E8] px-3 py-2 dark:border-[#2a2a2e]">
										<span className="text-[13px]">🦙</span>
										<span className="flex-1 text-[11px] font-medium text-[#333] dark:text-[#ccc]">
											Researching in parallel...
										</span>
										<span className="rounded bg-[#E8E8E8] px-1.5 py-0.5 text-[10px] font-medium text-[#555] dark:bg-[#2a2a2e] dark:text-[#999]">
											1/3 done
										</span>
										<span className="rounded bg-[#E8E8E8] px-1.5 py-0.5 font-mono text-[10px] text-[#555] dark:bg-[#2a2a2e] dark:text-[#999]">
											01:27
										</span>
									</div>
									<div className="space-y-1.5 px-3 py-2.5">
										<div className="flex items-center gap-2">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="10"
												height="10"
												viewBox="0 0 24 24"
												fill="none"
												stroke="#22c55e"
												strokeWidth="3"
												strokeLinecap="round"
												strokeLinejoin="round"
											>
												<polyline points="20 6 9 17 4 12" />
											</svg>
											<span className="text-[11px] text-[#555] dark:text-[#999]">
												<span className="font-medium text-[#333] dark:text-[#ccc]">regulatory</span> Complete (19 tools,
												3 charts)
											</span>
										</div>
										<div className="flex items-center gap-2">
											<div className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#3B82F6]" />
											<span className="text-[11px] text-[#555] dark:text-[#999]">
												<span className="font-medium text-[#333] dark:text-[#ccc]">market_dynamics</span>{' '}
												{TOOL_LABELS.generate_chart}
											</span>
										</div>
										<div className="flex items-center gap-2">
											<div className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#3B82F6]" />
											<span className="text-[11px] text-[#555] dark:text-[#999]">
												<span className="font-medium text-[#333] dark:text-[#ccc]">competitive_positioning</span>{' '}
												{TOOL_LABELS.web_search}
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Demo Video */}
				<section className="relative z-10 px-4 pb-20 md:px-8 md:pb-28">
					<div className="mx-auto max-w-5xl">
						<div className="mb-6 text-center">
							<h2 className="mb-3 text-[1.75rem] font-extrabold tracking-[-0.02em] text-black md:text-[2rem] dark:text-white">
								See it in action
							</h2>
							<p className="text-base text-[#666] dark:text-[#919296]">Watch a full walkthrough of LlamaAI</p>
						</div>
						<div className="group relative overflow-hidden rounded-2xl border border-[#E8E8E8] shadow-[0_20px_60px_rgba(0,0,0,0.15)] dark:border-[#2a2a2e] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
							<div className="relative aspect-video w-full">
								{!isVideoPlaying ? (
									<button
										onClick={() => {
											trackUmamiEvent('llamaai-landing-video-play')
											setIsVideoPlaying(true)
										}}
										className="absolute inset-0 z-10 flex items-center justify-center"
										aria-label="Play demo video"
									>
										<img
											src="https://img.youtube.com/vi/rEJz1gfC0Oc/maxresdefault.jpg"
											alt="LlamaAI Demo"
											className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
										/>
										<div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-black/10 transition-opacity duration-300 group-hover:opacity-70" />
										<div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-[#FDE0A9] to-[#C99A4A] shadow-[0_8px_32px_rgba(253,224,169,0.4)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_12px_48px_rgba(253,224,169,0.6)] md:h-20 md:w-20">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												fill="currentColor"
												className="ml-1 h-6 w-6 text-[#1a1a1a] md:h-8 md:w-8"
											>
												<path d="M8 5.14v14l11-7-11-7z" />
											</svg>
										</div>
										<span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm transition-all duration-300 group-hover:bg-black/80 md:bottom-6 md:px-4 md:py-2 md:text-sm">
											Watch demo
										</span>
									</button>
								) : (
									<iframe
										src="https://www.youtube.com/embed/rEJz1gfC0Oc?si=0DD5sxzyUpC7GO14&autoplay=1"
										title="LlamaAI Demo"
										sandbox="allow-scripts allow-presentation"
										allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
										referrerPolicy="strict-origin-when-cross-origin"
										allowFullScreen
										className="absolute inset-0 h-full w-full"
									/>
								)}
							</div>
						</div>
					</div>
				</section>

				{/* FAQ */}
				<section className="relative z-10 px-4 pb-24 md:px-8 md:pb-32">
					<div className="mx-auto max-w-3xl">
						<h2 className="mb-8 text-center text-[1.75rem] font-extrabold tracking-[-0.02em] text-black md:mb-10 md:text-[2rem] dark:text-white">
							FAQs
						</h2>

						<div className="divide-y divide-[#E8E8E8] border-t border-[#E8E8E8] dark:divide-[#2a2a2e] dark:border-[#2a2a2e]">
							<FAQ question="What is LlamaAI?">
								<p>
									Your AI research assistant for DeFi and financial markets. Ask questions in plain language and get
									ranked tables, custom charts, research reports, and analysis. LlamaAI combines DefiLlama's
									comprehensive dataset with TradFi data, onchain analytics, and real-time web search.
								</p>
							</FAQ>
							<FAQ question="What can it do right now?">
								<p className="mb-2">Across protocols, chains, categories, and tokens, LlamaAI can:</p>
								<ul className="flex list-disc flex-col gap-1.5 pl-4">
									<li>Run complex multi-factor queries (e.g., growing TVL + revenue but declining token price)</li>
									<li>Generate custom charts and export data as CSV</li>
									<li>Write in-depth research reports on any topic</li>
									<li>Query DeFi, TradFi (stocks, ETFs, macro), and onchain data in a single prompt</li>
									<li>Set up scheduled alerts for automated research (e.g., daily price checks)</li>
									<li>Remember your preferences, yield criteria, and custom instructions across sessions</li>
								</ul>
							</FAQ>
							<FAQ question="What data does LlamaAI have access to?">
								<p>
									DefiLlama's complete dataset, onchain data across EVM chains, TradFi data (stocks, ETFs, macros), and
									real-time web search for the latest context.
								</p>
							</FAQ>
							<FAQ question="Who has access?">
								<p>
									LlamaAI is included in all paid subscriptions along with the DefiLlama Pro features. Signed-in users
									can also try 3 free suggested questions per day.
								</p>
							</FAQ>
							<FAQ question="What sort of prompts can it answer?">
								<ul className="flex list-disc flex-col gap-1.5 pl-4">
									<li>&quot;Which protocols have growing TVL and revenue but declining token prices?&quot;</li>
									<li>&quot;Give me a chart of total app revenue divided by category&quot;</li>
									<li>&quot;What are the best stablecoin yields with at least $10M TVL?&quot;</li>
									<li>&quot;Deep dive into Hyperliquid&quot;</li>
									<li>&quot;What are the probabilities that ETH price will go lower?&quot;</li>
									<li>&quot;What are the top tokens traded on CowSwap over the last 30 days?&quot;</li>
									<li>&quot;How is AAPL performing relative to BTC this quarter?&quot;</li>
								</ul>
							</FAQ>
							<FAQ question="Can I export results?">
								<p>Yes. Tables and charts export as CSV, and research reports can be downloaded as PDF.</p>
							</FAQ>
							<FAQ question="Is this investment advice?">
								<p>
									LlamaAI provides data and analysis to support your research, not replace it. Always verify and think
									critically.
								</p>
							</FAQ>
							<FAQ question="Need help?">
								<p>
									Contact{' '}
									<a
										href="mailto:support@defillama.com"
										className="text-[#C99A4A] underline decoration-[#C99A4A]/40 transition-colors hover:text-[#B8860B] dark:text-[#FDE0A9] dark:hover:text-[#FBEDCB]"
									>
										support@defillama.com
									</a>
								</p>
							</FAQ>
						</div>
					</div>
				</section>

				{/* Final CTA */}
				<section className="relative z-10 px-4 pb-16 md:px-8 md:pb-24">
					<div className="mx-auto max-w-3xl">
						<div className="relative overflow-hidden rounded-2xl border border-[#E8E8E8] bg-linear-to-br from-white via-[#FEFDFB] to-[#FDF8EF] dark:border-[#2a2a2e] dark:from-[#1e1f23] dark:via-[#1e1f23] dark:to-[#252218]">
							<div className="pointer-events-none absolute inset-0 overflow-hidden">
								<div
									className="absolute -right-16 -bottom-16 h-48 w-48 rounded-full opacity-30"
									style={{
										background: 'radial-gradient(circle, #FDE0A9 0%, transparent 70%)',
										filter: 'blur(40px)'
									}}
								/>
								<div
									className="absolute -top-8 -left-8 h-32 w-32 rounded-full opacity-20"
									style={{
										background: 'radial-gradient(circle, #FDE0A9 0%, transparent 70%)',
										filter: 'blur(30px)'
									}}
								/>
							</div>

							<div className="relative z-10 px-6 py-10 text-center md:px-10 md:py-12">
								<h3 className="mb-3 text-xl font-extrabold tracking-[-0.02em] text-black md:text-2xl dark:text-white">
									Ready to use LlamaAI?
								</h3>
								<p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-[#555] md:text-base dark:text-[#9a9a9f]">
									Research protocols, generate charts, and stay ahead of the market.
								</p>
								<CTAButton />
								<TrialBadge centered />
							</div>
						</div>
					</div>
				</section>
			</div>
		</>
	)
}

const FAQ = ({ question, children }: { question: string; children: React.ReactNode }) => {
	return (
		<details className="group">
			<summary className="flex cursor-pointer items-center gap-4 py-4 md:py-5">
				<span className="flex-1 text-[15px] font-medium text-black transition-colors group-hover:text-[#C99A4A] md:text-base dark:text-white dark:group-hover:text-[#FDE0A9]">
					{question}
				</span>
				<Icon
					name="chevron-down"
					height={16}
					width={16}
					className="shrink-0 text-[#999] transition-transform duration-200 group-open:rotate-180 dark:text-[#666]"
				/>
			</summary>
			<div className="pb-4 text-[14px] leading-relaxed text-[#555] md:pb-5 md:text-[15px] dark:text-[#9a9a9f]">
				{children}
			</div>
		</details>
	)
}
