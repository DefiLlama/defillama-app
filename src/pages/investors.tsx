import type { GetServerSideProps } from 'next'
import { useEffect, useState, type ReactNode } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { ThemeSwitch } from '~/components/Nav/ThemeSwitch'
import { SEO } from '~/components/SEO'
import {
	DEFAULT_INVESTORS_PROTOCOL_ID,
	INVESTORS_LANDING_PROJECTS,
	INVESTORS_PROJECTS,
	SHOW_INVESTORS_COMING_SOON_PROJECT,
	getInvestorsLandingProjectHref,
	isInvestorsEnabled,
	isInvestorsLandingProjectExternal,
	type InvestorsProject,
	type InvestorsProjectId
} from '~/containers/Investors/config'
import { Logo } from '~/containers/Investors/Logo'
import { chainIconUrl, tokenIconUrl } from '~/utils/icons'

function SonicIcon() {
	return (
		<svg
			clipRule="evenodd"
			fillRule="evenodd"
			strokeLinejoin="round"
			strokeMiterlimit="2"
			viewBox="0 0 180 180"
			xmlns="http://www.w3.org/2000/svg"
			className="size-9 shrink-0"
		>
			<g fill="url(#sonic-brand-a)">
				<path d="m90 7.5c45.533 0 82.5 36.967 82.5 82.5s-36.967 82.5-82.5 82.5-82.5-36.967-82.5-82.5 36.967-82.5 82.5-82.5zm67.861 90.573c-42.086 6.922-71.149 27.287-93.917 53.61 7.993 3.176 16.74 4.927 25.904 4.927 35.031 0 63.956-25.584 68.013-58.537zm-103.98 48.63c12.075-15.367 29.012-28.893 49.34-40.152-20.672 4.701-41.249 16.316-61.074 31.266 3.559 3.355 7.492 6.339 11.734 8.886zm-32.346-50.896c1.014 13.37 6.108 24.893 14.076 34.906 17.787-16.574 41.222-28.705 70.191-35.375l-84.267 0.469zm14.138-46.378c-7.899 9.894-12.908 21.244-14.016 34.446l84.073 0.762c-29.876-7.796-53.229-19.177-70.057-35.208zm122.23 33.03c-3.914-33.105-32.91-58.849-68.051-58.849-9.142 0-17.867 1.742-25.84 4.901 14.887 21.28 57.159 49.575 93.891 53.948zm-103.8-49.075c-4.095 2.439-7.907 5.284-11.373 8.476 13.223 12.708 32.666 23.768 61.418 32.338-20.864-11.522-37.144-25.196-50.045-40.814z" />
			</g>
			<defs>
				<linearGradient
					id="sonic-brand-a"
					x2="1"
					gradientTransform="matrix(164.74 .32312 -.32312 164.74 7.5105 89.933)"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#fac461" offset="0" />
					<stop stopColor="#e3570a" offset=".28" />
					<stop stopColor="#7f6562" offset=".55" />
					<stop stopColor="#3b5d88" offset=".73" />
					<stop stopColor="#203f55" offset="1" />
				</linearGradient>
			</defs>
		</svg>
	)
}

function BerachainIcon() {
	return (
		<svg
			version="1.1"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 1441.2 1608"
			fill="currentColor"
			className="size-14 shrink-0 text-[#F6A623]"
		>
			<path d="M1286.9,687.3c-2.2-7-3.8-14.1-5-21.3c-0.6-3.3-1.2-6.7-1.9-10c-1.6-7.2-3.3-14.3-5.2-21.4v0 c31.5-47.6,181.9-296.1,10.7-455.6c-190-177-412,55-412,55l0.7,1c-99.8-30.3-208-33.9-313.2-1c0,0,0,0,0,0 c-1.3-1.4-222.5-231.5-412-55c-189.5,176.5,15.1,462.1,16.2,463.6c0,0,0,0,0,0c-2.2,6.7-3.9,13.6-5.1,20.5 C139.6,785.4,0,823.1,0,1036s146,388,444,388h122.3c0,0,0,0,0,0c0.5,0.8,50.9,72.1,154.3,72.1c96-0.1,159.3-71.4,159.9-72.1 c0,0,0,0,0,0h116.7c298,0,444-171,444-388C1441.2,837.8,1320.1,791.4,1286.9,687.3L1286.9,687.3z" />
		</svg>
	)
}

function NearIcon({ className = 'size-14 shrink-0' }: { className?: string }) {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 16 16"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M13.9017 0.646973C13.3462 0.646973 12.8304 0.929357 12.5394 1.39357L9.40403 5.95741C9.30186 6.10784 9.34331 6.31059 9.49675 6.41075C9.6211 6.49202 9.78561 6.48196 9.89889 6.38645L12.9851 3.76201C13.0364 3.71677 13.1154 3.72137 13.1616 3.77165C13.1825 3.79469 13.1937 3.82444 13.1937 3.85502V12.0719C13.1937 12.1397 13.1377 12.1942 13.0684 12.1942C13.0312 12.1942 12.9962 12.1783 12.9727 12.1502L3.6435 1.20169C3.33966 0.850174 2.89352 0.647392 2.42388 0.646973H2.09782C1.21536 0.646973 0.5 1.34833 0.5 2.2135V13.7863C0.5 14.6515 1.21536 15.3528 2.09782 15.3528C2.65336 15.3528 3.16915 15.0704 3.46017 14.6062L6.59558 10.0424C6.69769 9.89194 6.65624 9.68919 6.50279 9.58903C6.37845 9.50776 6.21394 9.51782 6.10071 9.61334L3.01446 12.2378C2.96318 12.283 2.88412 12.2784 2.83797 12.2281C2.81703 12.2051 2.80592 12.1753 2.80634 12.1447V3.92583C2.80634 3.85796 2.86232 3.80349 2.93155 3.80349C2.96831 3.80349 3.00377 3.81941 3.02728 3.84748L12.3552 14.7981C12.659 15.1496 13.1052 15.3524 13.5749 15.3528H13.9009C14.7833 15.3532 15.4992 14.6523 15.5 13.7871V2.2135C15.5 1.34833 14.7842 0.646973 13.9017 0.646973Z"
				fill="#00EC97"
			/>
		</svg>
	)
}

function SparkBolt() {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 497 497" className="size-9 shrink-0">
			<defs>
				<linearGradient
					id="spark-bolt-grad"
					x1="400.58"
					y1="131.86"
					x2="80.11"
					y2="377.66"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#FA43BD" />
					<stop offset="1" stopColor="#FFA930" />
				</linearGradient>
			</defs>
			<path
				fill="url(#spark-bolt-grad)"
				d="M313.035 279.197h177.982c6.846 0 8.225-9.321 2-12.168L313.046 185.06V6.383c0-6.67-8.92-8.858-11.998-2.941l-73.988 142.459-81.987-37.656c-7.844-3.168-12.661 3.219-9.999 8.708l48.891 100.85H5.983c-6.846 0-8.225 9.321-2 12.168l179.971 81.97v178.677c0 6.669 8.92 8.857 11.998 2.941l73.988-142.46 81.987 37.656c7.844 3.168 12.661-3.218 9.999-8.708l-48.891-100.85Z"
			/>
		</svg>
	)
}

function OdysseyIcon() {
	return (
		<img
			src={tokenIconUrl('odyssey-finance', 64)}
			alt="Odyssey Finance"
			className="size-9 shrink-0 rounded-full bg-(--cards-bg) object-contain"
		/>
	)
}

function FlareIcon() {
	return (
		<img
			src={chainIconUrl('flare', 64)}
			alt="Flare"
			className="size-9 shrink-0 rounded-full bg-(--cards-bg) object-contain"
		/>
	)
}

function ThorchainIcon() {
	return (
		<img
			src={chainIconUrl('thorchain', 64)}
			alt="THORChain"
			className="size-9 shrink-0 rounded-full bg-(--cards-bg) object-contain"
		/>
	)
}

function ShieldCheckIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4 shrink-0">
			<path d="M12 3 5 5.8v5.1c0 4.4 2.9 8.1 7 9.6 4.1-1.5 7-5.2 7-9.6V5.8L12 3Z" strokeLinejoin="round" />
			<path d="m9.2 11.9 1.9 1.9 3.7-3.9" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	)
}

function LightbulbBoltIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4 shrink-0">
			<path d="M8.5 15.5a6.5 6.5 0 1 1 7 0c-.6.4-1 1-1 1.7v.8h-5v-.8c0-.7-.4-1.3-1-1.7Z" strokeLinejoin="round" />
			<path d="M10 21h4" strokeLinecap="round" />
			<path d="M12.8 7.5 11 10h2.5l-1.8 2.5" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	)
}

const VALUE_PROPS = [
	{
		title: 'Credibility',
		icon: <ShieldCheckIcon />,
		description: 'DefiLlama as trusted third party — not a self-hosted page'
	},
	{
		title: 'Control',
		icon: <Icon name="sparkles" className="size-4 shrink-0" />,
		description: 'Frame your metrics without touching rankings'
	},
	{
		title: 'Efficiency',
		icon: <LightbulbBoltIcon />,
		description: 'One link replaces dozens of repetitive investor decks'
	},
	{
		title: 'Signaling',
		icon: <Icon name="layout-grid" className="size-4 shrink-0" />,
		description: 'Look institutional, transparent, and investor-ready'
	}
] as const

const WHAT_IT_IS = [
	'Verified protocol metrics with DefiLlama context',
	'A clean investor hub for dashboards, reports, and calls',
	'Independent from rankings, discovery pages, and comparisons'
] as const

const WHAT_IT_ISNT = ['Marketing pages', 'Paid influence on rankings', 'Self-report data without validation'] as const

const GRID_CELLS = [
	{ left: 384, top: 96, opacity: 0.05, accent: false },
	{ left: 1104, top: 144, opacity: 0.04, accent: false },
	{ left: 720, top: 192, opacity: 0.07, accent: true },
	{ left: 288, top: 336, opacity: 0.035, accent: false },
	{ left: 1200, top: 288, opacity: 0.05, accent: false },
	{ left: 528, top: 480, opacity: 0.03, accent: false },
	{ left: 1056, top: 432, opacity: 0.04, accent: false }
] as const

const STAMP_COUNT = 8
const STAMP_CYCLE_MS = 14000
const GRID_COLS = 34
const GRID_ROWS = 13

type StampCell = { left: number; top: number; delay: string }

function randomStampPosition(): { left: number; top: number } {
	while (true) {
		const col = Math.floor(Math.random() * GRID_COLS)
		const row = Math.floor(Math.random() * GRID_ROWS)
		const inHeroZone = row > 0 && row < 9 && col > 8 && col < 25
		const inValueStripZone = row > 8 && row < 12 && col > 5 && col < 29
		const onStaticCell = GRID_CELLS.some((cell) => cell.left === col * 48 && cell.top === row * 48)
		if (inHeroZone || inValueStripZone || onStaticCell) continue
		return { left: col * 48, top: row * 48 }
	}
}

function useStampCells(): StampCell[] {
	const [cells, setCells] = useState<StampCell[]>([])

	useEffect(() => {
		const delays = Array.from(
			{ length: STAMP_COUNT },
			(_, i) => (i * STAMP_CYCLE_MS) / STAMP_COUNT + Math.random() * 900
		)
		setCells(delays.map((delay) => ({ ...randomStampPosition(), delay: `${delay / 1000}s` })))

		const timers: ReturnType<typeof setTimeout>[] = []
		delays.forEach((delay, i) => {
			const moveCell = () =>
				setCells((prev) => prev.map((cell, j) => (j === i ? { ...cell, ...randomStampPosition() } : cell)))
			timers.push(
				setTimeout(
					() => {
						moveCell()
						timers.push(setInterval(moveCell, STAMP_CYCLE_MS))
					},
					delay + STAMP_CYCLE_MS * 0.45
				)
			)
		})
		return () => timers.forEach(clearTimeout)
	}, [])

	return cells
}

const GRID_PATTERN = {
	backgroundImage:
		'linear-gradient(var(--cards-border) 1px, transparent 1px), linear-gradient(90deg, var(--cards-border) 1px, transparent 1px)',
	backgroundSize: '48px 48px'
} as const

function Backdrop() {
	const stampCells = useStampCells()

	return (
		<div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[980px] overflow-hidden">
			<div
				className="absolute top-0 left-1/2 h-[620px] w-[900px] -translate-x-1/2"
				style={{
					background:
						'radial-gradient(50% 50% at 50% 35%, rgba(33,114,229,0.09) 0%, rgba(33,114,229,0.03) 45%, transparent 70%)'
				}}
			/>
			<div
				className="absolute top-0 left-1/2 h-[640px] w-[1632px] -translate-x-1/2"
				style={{
					maskImage: 'radial-gradient(ellipse 55% 70% at 50% 32%, black 0%, transparent 100%)',
					WebkitMaskImage: 'radial-gradient(ellipse 55% 70% at 50% 32%, black 0%, transparent 100%)'
				}}
			>
				<div className="absolute inset-0" style={GRID_PATTERN} />
				{GRID_CELLS.map((cell) => (
					<div
						key={`${cell.left}-${cell.top}`}
						className={`absolute size-12 ${cell.accent ? 'bg-(--sl-accent)' : 'bg-(--text-primary)'}`}
						style={{ left: cell.left, top: cell.top, opacity: cell.opacity }}
					/>
				))}
				{stampCells.map((cell, i) => (
					<div
						key={i}
						className="ir-stamp absolute flex size-12 items-center justify-center border border-(--sl-accent)/25 bg-(--sl-accent)/10"
						style={{ left: cell.left, top: cell.top, animationDelay: cell.delay }}
					>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="var(--sl-accent)"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="size-8"
						>
							<path className="ir-stamp-check" d="m6 12.5 4 4 8-9" style={{ animationDelay: cell.delay }} />
						</svg>
					</div>
				))}
			</div>
			<div
				className="absolute top-[430px] left-1/2 h-[480px] w-[1632px] -translate-x-1/2"
				style={{
					maskImage: 'radial-gradient(ellipse 50% 80% at 50% 12%, black 0%, transparent 100%)',
					WebkitMaskImage: 'radial-gradient(ellipse 50% 80% at 50% 12%, black 0%, transparent 100%)'
				}}
			>
				<div
					className="absolute inset-0"
					style={{ ...GRID_PATTERN, transform: 'perspective(1100px) rotateX(56deg)', transformOrigin: '50% 0' }}
				/>
			</div>
		</div>
	)
}

type LandingCardContent = {
	icon: ReactNode
	description: string
	tags: readonly string[]
	accent: string
	hoverClass: string
}

const PROJECT_CARD_CONTENT = {
	spark: {
		icon: <SparkBolt />,
		description: 'Financials, protocol overview, distribution rewards, and reports for the Spark ecosystem.',
		tags: ['Financials', 'Lending', 'Rewards', 'Reports'],
		accent: 'linear-gradient(90deg, #FA43BD, #FFA930)',
		hoverClass: 'hover:border-[#FA43BD]/15 hover:shadow-lg hover:shadow-[#FA43BD]/[0.03]'
	},
	sonic: {
		icon: <SonicIcon />,
		description: 'Fees, ecosystem, vertical integration, and network stats for Sonic.',
		tags: ['Financials', 'Vertical Integration', 'Yield', 'Network Stats'],
		accent: 'linear-gradient(90deg, #fac461, #e3570a, #3b5d88, #203f55)',
		hoverClass: 'hover:border-[#e3570a]/20 hover:shadow-lg hover:shadow-[#e3570a]/[0.04]'
	},
	near: {
		icon: <NearIcon className="size-9 shrink-0" />,
		description: 'Revenue, ecosystem activity, products, and research for NEAR Protocol.',
		tags: ['Revenue', 'Ecosystem', 'Products', 'Research'],
		accent: 'linear-gradient(90deg, #00C1DE, #00E4AA, #00EC97)',
		hoverClass: 'hover:border-[#00EC97]/20 hover:shadow-lg hover:shadow-[#00EC97]/[0.04]'
	},
	'odyssey-ecosystem': {
		icon: <OdysseyIcon />,
		description: 'TVL, revenue, incentives, pegs, treasury, and yield analytics for the Odyssey ecosystem.',
		tags: ['TVL', 'Revenue', 'Incentives', 'Yields'],
		accent: 'linear-gradient(90deg, #3b82f6, #60a5fa, #93c5fd)',
		hoverClass: 'hover:border-[#3b82f6]/20 hover:shadow-lg hover:shadow-[#3b82f6]/[0.04]'
	},
	flare: {
		icon: <FlareIcon />,
		description: 'Network activity, data protocols, and ecosystem metrics for Flare.',
		tags: ['Network Stats', 'Data Protocols', 'Ecosystem'],
		accent: 'linear-gradient(90deg, #E62058, #FF7A8A)',
		hoverClass: 'hover:border-[#E62058]/20 hover:shadow-lg hover:shadow-[#E62058]/[0.04]'
	},
	thorchain: {
		icon: <ThorchainIcon />,
		description: 'Liquidity, swap volume, fees, and protocol metrics for THORChain.',
		tags: ['Liquidity', 'Swaps', 'Fees', 'Revenue'],
		accent: 'linear-gradient(90deg, #00CCFF, #31FD9D)',
		hoverClass: 'hover:border-[#23DCC8]/20 hover:shadow-lg hover:shadow-[#23DCC8]/[0.04]'
	}
} satisfies Partial<Record<InvestorsProjectId, LandingCardContent>>

function ProjectFallbackIcon({ name }: { name: string }) {
	return (
		<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--sl-accent-muted) text-sm font-semibold text-(--sl-accent)">
			{name.slice(0, 1)}
		</span>
	)
}

function ProjectCard({ project }: { project: InvestorsProject }) {
	const content = PROJECT_CARD_CONTENT[project.id]
	const href = getInvestorsLandingProjectHref(project.id)
	const isExternal = isInvestorsLandingProjectExternal(project.id)
	const tags = content?.tags ?? ['Metrics', 'Reporting', 'Analytics']

	return (
		<div
			className={`group relative isolate flex flex-col overflow-hidden rounded-[20px] border border-(--cards-border) bg-(--cards-bg) transition-[border-color,box-shadow] duration-200 ${
				content?.hoverClass ?? 'hover:border-(--sl-accent)'
			}`}
		>
			<div className="h-2 w-full" style={{ background: content?.accent ?? 'var(--sl-accent)' }} />
			<div className="flex flex-1 flex-col gap-3 p-4">
				<div className="flex items-center gap-2.5">
					{content?.icon ?? <ProjectFallbackIcon name={project.name} />}
					<span className="text-base font-semibold text-(--text-primary)">{project.name}</span>
				</div>
				<p className="text-xs leading-relaxed text-(--text-secondary)">
					{content?.description ?? `Verified metrics and reporting for ${project.name}.`}
				</p>
				<div className="mt-auto flex flex-wrap gap-1.5">
					{tags.map((tag) => (
						<span
							key={tag}
							className="rounded-full bg-(--sl-accent-muted) px-2 py-0.5 text-[10px] font-medium text-(--sl-accent)"
						>
							{tag}
						</span>
					))}
				</div>
			</div>
			<div className="flex h-10 shrink-0 items-center justify-center gap-1.5 bg-black/4 text-sm font-bold text-(--sl-accent) transition-colors duration-200 group-hover:bg-black/7 dark:bg-white/8 dark:group-hover:bg-white/12">
				{isExternal ? 'Open Dashboard' : 'View Dashboard'}
				<Icon name={isExternal ? 'external-link' : 'arrow-right'} className="size-3.5" />
			</div>
			<BasicLink
				href={href}
				target={isExternal ? '_blank' : undefined}
				rel={isExternal ? 'noopener noreferrer' : undefined}
				className="absolute inset-0"
			>
				<span className="sr-only">
					{isExternal ? 'Open' : 'View'} {project.name} Dashboard
				</span>
			</BasicLink>
		</div>
	)
}

export const getServerSideProps: GetServerSideProps = async () => {
	if (
		isInvestorsEnabled() &&
		INVESTORS_LANDING_PROJECTS.length <= 1 &&
		INVESTORS_PROJECTS.length === 1 &&
		DEFAULT_INVESTORS_PROTOCOL_ID
	) {
		return {
			redirect: {
				destination: `/${DEFAULT_INVESTORS_PROTOCOL_ID}`,
				permanent: false
			}
		}
	}

	return { props: {} }
}

export default function InvestorsPage() {
	if (!isInvestorsEnabled()) {
		return null
	}

	return (
		<>
			<SEO title="DefiLlama" description="Verified metrics powered by DefiLlama" canonicalUrl={null} />
			<div className="investors-dashboard relative col-span-full flex min-h-screen flex-col items-center overflow-hidden bg-(--app-bg) px-5 pt-12 pb-24 sm:pt-16">
				<Backdrop />
				<ThemeSwitch variant="pill" size="sm" className="absolute top-4 right-4 z-10" />

				<div className="ir-rise relative">
					<Logo />
				</div>
				<h1 className="ir-rise relative mt-8 max-w-2xl text-center text-[28px] leading-tight text-(--text-primary) [animation-delay:60ms] sm:text-3xl">
					Investor Relations built on <span className="font-semibold text-(--sl-accent)">verified data</span>
				</h1>
				<p className="ir-rise relative mt-3 max-w-[560px] text-center text-[13px] leading-relaxed font-light tracking-[0.12em] text-(--text-primary)/80 [animation-delay:110ms]">
					A dedicated hub where DeFi protocols publish official, DefiLlama-attested metrics, reports, and calls — one
					canonical link for everything your investors need.
				</p>
				<div className="ir-rise relative mt-9 flex flex-wrap items-center justify-center gap-2.5 [animation-delay:160ms]">
					<a
						href="mailto:sales@defillama.com"
						className="flex h-13 items-center justify-center rounded-xl bg-(--sl-accent) px-6 text-base font-medium text-white transition-colors hover:bg-(--sl-accent-hover)"
					>
						Get listed
					</a>
					<a
						href="#how-it-works"
						className="flex h-13 items-center justify-center rounded-xl bg-black/5 px-6 text-base font-medium text-(--sl-accent) transition-colors hover:bg-black/10 dark:bg-white/15 dark:text-[#4b86db] dark:hover:bg-white/25"
					>
						How it works
					</a>
				</div>

				<section
					id="how-it-works"
					className="ir-rise relative mt-14 grid w-full max-w-[968px] scroll-mt-16 grid-cols-2 border-t border-(--cards-border) [animation-delay:220ms] lg:grid-cols-4"
				>
					{VALUE_PROPS.map((prop, i) => (
						<div
							key={prop.title}
							className={`flex flex-col gap-3 p-4 sm:p-6 lg:py-7 lg:pr-6 lg:pl-12 ${
								i > 0 ? 'lg:border-l lg:border-(--cards-border)' : ''
							}`}
						>
							<h2 className="flex items-center gap-2 text-[13px] font-bold tracking-[0.12em] text-(--sl-accent) uppercase">
								{prop.icon}
								{prop.title}
							</h2>
							<p className="max-w-[160px] text-[11px] leading-[1.35] font-light tracking-[0.12em] text-(--text-primary)/90 capitalize">
								{prop.description}
							</p>
						</div>
					))}
				</section>

				<section className="ir-rise relative mt-10 w-full max-w-[968px] [animation-delay:280ms]">
					<h2 className="text-xs font-medium tracking-[0.06em] text-(--text-secondary) uppercase">
						Explore dashboards
					</h2>
					<div className="mt-4 grid auto-rows-fr grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
						{INVESTORS_LANDING_PROJECTS.map((project) => (
							<ProjectCard key={project.id} project={project} />
						))}

						{SHOW_INVESTORS_COMING_SOON_PROJECT &&
							[{ icon: <BerachainIcon />, name: 'Berachain' }].map((item) => (
								<div
									key={item.name}
									className="relative isolate flex flex-col items-center justify-center gap-3 overflow-hidden rounded-[20px] border border-(--cards-border) bg-(--cards-bg) p-5 text-center"
								>
									<span className="opacity-50">{item.icon}</span>
									<span className="text-base font-semibold text-(--text-primary)/60">{item.name}</span>
									<span className="text-xs font-light tracking-[0.2em] text-(--text-primary)/60 uppercase">
										Coming Soon
									</span>
								</div>
							))}
					</div>
				</section>

				<div className="relative mt-10 h-px w-full max-w-[968px] bg-(--cards-border)" />

				<section className="ir-rise relative mt-7 grid w-full max-w-[968px] grid-cols-1 overflow-hidden rounded-[20px] bg-linear-to-r from-[#2172e51f] from-[42%] to-[#716e7512] to-[58%] [animation-delay:340ms] md:grid-cols-2 dark:from-[#1f67d229] dark:to-[#716e7514]">
					<div className="flex flex-col gap-5 px-7 py-8 md:px-13">
						<h2 className="flex items-center gap-2.5 text-base font-bold tracking-[0.04em] text-(--sl-accent) uppercase">
							<Icon name="check-circle" className="size-5.5 shrink-0" />
							What it is
						</h2>
						<ul className="flex flex-col gap-3.5 text-[13px] leading-snug text-(--text-primary)">
							{WHAT_IT_IS.map((line) => (
								<li key={line} className="flex items-start gap-2.5">
									<Icon name="check" className="mt-0.5 size-4 shrink-0 text-(--sl-accent)" />
									{line}
								</li>
							))}
						</ul>
					</div>
					<div className="absolute top-1/2 left-1/2 hidden h-[60%] w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--form-control-border) md:block" />
					<div className="flex flex-col gap-5 border-t border-(--cards-border) px-7 py-8 md:border-t-0 md:px-13">
						<h2 className="flex items-center gap-2.5 text-base tracking-[0.04em] text-[#b8485f] uppercase dark:text-[#ffb8c4]">
							<Icon name="circle-x" className="size-5.5 shrink-0" />
							What it isn&apos;t
						</h2>
						<ul className="flex flex-col gap-3.5 text-[13px] leading-snug text-(--text-secondary)">
							{WHAT_IT_ISNT.map((line) => (
								<li key={line} className="flex items-start gap-2.5">
									<Icon name="x" className="mt-0.5 size-4 shrink-0 text-[#b8485f] dark:text-[#ffb8c4]" />
									{line}
								</li>
							))}
						</ul>
					</div>
				</section>

				<section className="ir-rise relative mt-14 w-full max-w-[968px] overflow-hidden rounded-[20px] border border-(--sl-accent) bg-linear-to-r from-[#2172e52e] to-[#2172e50d] px-7 py-8 [animation-delay:400ms] sm:px-12 dark:from-[#142eaeb8] dark:to-[#1f67d233]">
					<div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
						<div className="flex flex-col gap-3">
							<h2 className="text-[23px] leading-tight font-bold text-(--text-primary)">
								Want an IR dashboard for your protocol?
							</h2>
							<p className="max-w-[545px] text-base leading-normal text-(--text-primary)/85 sm:text-lg">
								Verified metrics, investor reports, and calls hosted in one place. Powered by DefiLlama.
							</p>
						</div>
						<a
							href="mailto:sales@defillama.com"
							className="flex h-13 shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-(--sl-accent) px-6 text-base font-medium text-white transition-colors hover:bg-(--sl-accent-hover) md:self-center"
						>
							Get in touch
							<Icon name="arrow-right" className="size-4" />
						</a>
					</div>
				</section>

				<p className="relative mt-14 text-center text-sm text-(--text-secondary)">
					Contact —{' '}
					<a href="mailto:sales@defillama.com" className="underline underline-offset-2 hover:text-(--text-primary)">
						sales@defillama.com
					</a>
				</p>
			</div>
		</>
	)
}
