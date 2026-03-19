import Layout from '~/layout'
import { Icon } from '~/components/Icon'

const dlResearchReports = [
	{
		title: 'State of DeFi 2025',
		date: 'December 2025',
		pages: 121,
		href: 'https://assets.dlnews.com/dlresearch/State-of-DeFi-2025.pdf',
		author: 'DL Research',
		description:
			"Comprehensive analysis of DeFi's evolution into a maturing financial system. Covers stablecoins as core infrastructure, the converging trading stack, credit and yield markets, execution quality, MEV, governance, token design, and outlook for 2026.",
		topics: ['Stablecoins', 'Trading Stack', 'Lending & Yield', 'L1s & L2s', 'MEV & Execution', 'RWA', 'Governance'],
		image: '/reports/cover_bg.png'
	},
	{
		title: 'State of RWAfi Q1 2026',
		date: 'April 2026',
		author: 'DL Research',
		comingSoon: true,
		description:
			'A comprehensive, data-led assessment of the real-world asset landscape across DeFi — covering tokenised equities, real estate, commodities, and the broader structural forces shaping the next phase of onchain capital markets.',
		topics: ['Tokenised Equities', 'Real Estate', 'Commodities', 'Private Credit', 'Onchain Capital Markets'],
		image: '/reports/rwafi.png',
		spotlightHref: 'https://www.dlnews.com/research/internal/tokenised-stocks-whats-really-under-the-hood/',
		spotlightTitle: 'Tokenised stocks: What\u2019s really under the hood'
	}
]

const otherReports = [
	{
		title: '2022 DeFi Year In Review',
		date: 'December 2022',
		pages: 37,
		href: 'https://drive.google.com/file/d/1zfJgQEOA4QVKMUyVifBhybhxgkbFRWpG/view',
		author: 'Kofi',
		description:
			'Data-driven review of the 2022 DeFi landscape. Covers the market downturn, top DeFi categories (CDP, Lending, DEXs, Liquid Staking), chain deep-dives across Ethereum, BSC, Polygon, Solana, Avalanche, and Terra, plus highlights on hacks, stablecoins, and The Merge.',
		topics: ['Market Overview', 'DEXs', 'Lending', 'Liquid Staking', 'Chains & L2s', 'Hacks', 'Stablecoins'],
		image: '/reports/cover_2022.png'
	}
]

const dotPatternStyle = {
	backgroundImage: 'radial-gradient(circle, rgba(35, 123, 255, 0.5) 0.8px, transparent 0.8px)',
	backgroundSize: '3px 3px'
}

export default function ReportsPage() {
	return (
		<Layout
			title="DeFi Research Reports & Analysis - DefiLlama"
			description="Read DeFi research reports and market analysis from DefiLlama Research. In-depth coverage of protocols, chains, and industry trends."
			canonicalUrl="/reports"
		>
			{/* DL Research Section */}
			<div className="relative overflow-hidden rounded-lg border border-[#237BFF]/20 bg-(--cards-bg) p-4 shadow-[0_0_30px_-5px_rgba(35,123,255,0.15)]">
				{/* Dot pattern decorations */}
				<div className="pointer-events-none absolute top-0 left-0 h-full w-16" style={{ ...dotPatternStyle, maskImage: 'linear-gradient(to right, black 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 0%, transparent 100%)' }} />
				<div className="pointer-events-none absolute top-0 right-0 h-full w-16" style={{ ...dotPatternStyle, maskImage: 'linear-gradient(to left, black 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to left, black 0%, transparent 100%)' }} />

				{/* Glow orb behind logo */}
				<div className="pointer-events-none absolute -top-20 -left-20 h-40 w-40 rounded-full bg-[#237BFF]/10 blur-3xl" />

				<div className="relative flex flex-col gap-5">
					{/* Header */}
					<div className="flex flex-col gap-3">
						<DLResearchLogo />
						<p className="max-w-2xl text-sm text-(--text-secondary)">
							In-depth research reports covering DeFi markets, protocols, infrastructure, and emerging trends —
							published by the DL Research team.
						</p>
					</div>

					{/* Report Cards */}
					<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
						{dlResearchReports.map((report) => (
							<DLReportCard key={report.title} report={report} />
						))}
					</div>
				</div>
			</div>

			{/* Other Reports */}
			<div className="flex flex-col gap-2">
				<h2 className="px-1 text-lg font-semibold">Other Reports</h2>
				<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
					{otherReports.map((report) => (
						<ReportCard key={report.title} report={report} />
					))}
				</div>
			</div>
		</Layout>
	)
}

interface Report {
	title: string
	date: string
	pages?: number
	href?: string
	author?: string
	comingSoon?: boolean
	description: string
	topics: string[]
	image?: string
	spotlightHref?: string
	spotlightTitle?: string
}

function DLReportCard({ report }: { report: Report }) {
	if (report.comingSoon) {
		return (
			<div className="relative flex flex-col overflow-hidden rounded-md border border-[#237BFF]/15 bg-(--cards-bg) shadow-[0_0_20px_-5px_rgba(35,123,255,0.1)] transition-shadow duration-300 hover:shadow-[0_0_25px_-5px_rgba(35,123,255,0.2)]">
				{report.image && (
					<div className="relative h-36 w-full overflow-hidden bg-[#0a1628]">
						<img src={report.image} alt="" className="h-full w-full object-cover opacity-40" />
						<div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/60 to-transparent" />
						<div className="absolute bottom-3 left-4 flex items-center gap-2">
							<h3 className="text-lg font-semibold text-white">{report.title}</h3>
							<span className="animate-pulse rounded-md bg-[#237BFF] px-2 py-0.5 text-[11px] font-semibold text-white">
								Coming Soon
							</span>
						</div>
					</div>
				)}
				<div className="flex flex-1 flex-col gap-3 p-4">
					{!report.image && (
						<div className="flex items-center gap-2">
							<h3 className="text-lg font-semibold">{report.title}</h3>
							<span className="animate-pulse rounded-md bg-[#237BFF] px-2 py-0.5 text-[11px] font-semibold text-white">
								Coming Soon
							</span>
						</div>
					)}
					<div className="flex items-center gap-3 text-xs text-(--text-secondary)">
						<span className="flex items-center gap-1">
							<Icon name="calendar" height={12} width={12} />
							{report.date}
						</span>
						{report.author && (
							<span className="flex items-center gap-1">
								<Icon name="users" height={12} width={12} />
								{report.author}
							</span>
						)}
					</div>
					<p className="text-sm text-(--text-form)">{report.description}</p>
					<div className="flex flex-wrap gap-1.5">
						{report.topics.map((topic) => (
							<span
								key={topic}
								className="rounded-full bg-[#237BFF]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#237BFF] dark:bg-[#237BFF]/15 dark:text-[#5a9fff]"
							>
								{topic}
							</span>
						))}
					</div>
					{report.spotlightHref && (
						<a
							href={report.spotlightHref}
							target="_blank"
							rel="noopener noreferrer"
							className="mt-1 flex items-center gap-1.5 rounded-md border border-[#237BFF]/20 bg-[#237BFF]/5 px-3 py-2 text-sm text-[#237BFF] transition-colors hover:bg-[#237BFF]/10 dark:text-[#5a9fff]"
						>
							<Icon name="file-text" height={14} width={14} />
							<span className="flex-1">Spotlight: {report.spotlightTitle}</span>
							<Icon name="arrow-up-right" height={12} width={12} className="shrink-0" />
						</a>
					)}
				</div>
			</div>
		)
	}

	return (
		<a
			href={report.href}
			target="_blank"
			rel="noopener noreferrer"
			className="group relative flex flex-col overflow-hidden rounded-md border border-[#237BFF]/15 bg-(--cards-bg) shadow-[0_0_20px_-5px_rgba(35,123,255,0.1)] transition-all duration-300 hover:border-[#237BFF]/30 hover:shadow-[0_0_25px_-5px_rgba(35,123,255,0.25)]"
		>
			{report.image && (
				<div className="relative h-36 w-full overflow-hidden bg-[#0a1628]">
					<img
						src={report.image}
						alt=""
						className="h-full w-full object-cover opacity-60 transition-transform duration-300 group-hover:scale-105"
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/60 to-transparent" />
					<h3 className="absolute bottom-3 left-4 text-lg font-semibold text-white">{report.title}</h3>
				</div>
			)}
			<div className="flex flex-1 flex-col gap-3 p-4">
				{!report.image && (
					<h3 className="text-lg font-semibold">{report.title}</h3>
				)}
				<div className="flex items-center gap-3 text-xs text-(--text-secondary)">
					<span className="flex items-center gap-1">
						<Icon name="calendar" height={12} width={12} />
						{report.date}
					</span>
					{report.pages && (
						<span className="flex items-center gap-1">
							<Icon name="file-text" height={12} width={12} />
							{report.pages} pages
						</span>
					)}
					{report.author && (
						<span className="flex items-center gap-1">
							<Icon name="users" height={12} width={12} />
							{report.author}
						</span>
					)}
					<Icon
						name="arrow-up-right"
						height={14}
						width={14}
						className="ml-auto shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
					/>
				</div>
				<p className="text-sm text-(--text-form)">{report.description}</p>
				<div className="flex flex-wrap gap-1.5">
					{report.topics.map((topic) => (
						<span
							key={topic}
							className="rounded-full bg-[#237BFF]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#237BFF] dark:bg-[#237BFF]/15 dark:text-[#5a9fff]"
						>
							{topic}
						</span>
					))}
				</div>
			</div>
		</a>
	)
}

function ReportCard({ report }: { report: Report }) {
	return (
		<a
			href={report.href}
			target="_blank"
			rel="noopener noreferrer"
			className="group relative flex flex-col overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg) transition-colors hover:bg-(--link-button)"
		>
			{report.image && (
				<div className="relative h-36 w-full overflow-hidden bg-[#0a1628]">
					<img
						src={report.image}
						alt=""
						className="h-full w-full object-cover opacity-60 transition-transform duration-300 group-hover:scale-105"
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] to-transparent" />
					<h3 className="absolute bottom-3 left-4 text-lg font-semibold text-white">{report.title}</h3>
				</div>
			)}
			<div className="flex flex-1 flex-col gap-3 p-4">
				{!report.image && (
					<h3 className="text-lg font-semibold">{report.title}</h3>
				)}
				<div className="flex items-center gap-3 text-xs text-(--text-secondary)">
					<span className="flex items-center gap-1">
						<Icon name="calendar" height={12} width={12} />
						{report.date}
					</span>
					{report.pages && (
						<span className="flex items-center gap-1">
							<Icon name="file-text" height={12} width={12} />
							{report.pages} pages
						</span>
					)}
					{report.author && (
						<span className="flex items-center gap-1">
							<Icon name="users" height={12} width={12} />
							{report.author}
						</span>
					)}
					<Icon
						name="arrow-up-right"
						height={14}
						width={14}
						className="ml-auto shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
					/>
				</div>
				<p className="text-sm text-(--text-form)">{report.description}</p>
				<div className="flex flex-wrap gap-1.5">
					{report.topics.map((topic) => (
						<span
							key={topic}
							className="rounded-full bg-black/5 px-2.5 py-0.5 text-[11px] font-medium text-(--text-secondary) dark:bg-white/5"
						>
							{topic}
						</span>
					))}
				</div>
			</div>
		</a>
	)
}

function DLResearchLogo() {
	return (
		<svg
			width="235"
			height="38"
			viewBox="0 0 580 94"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="max-w-[200px] lg:max-w-[235px]"
		>
			<g clipPath="url(#dl-research-a)">
				<path
					d="M0 4.848C0 .542 5.162-1.619 8.189 1.421l83.653 84c3.033 3.045.893 8.266-3.388 8.266H4.8C2.149 93.687 0 91.52 0 88.849v-84Z"
					className="fill-(--text-primary)"
				/>
				<path
					d="M90.104 59.35c0 4.304-5.158 6.465-8.186 3.43L31.515 12.261c-3.037-3.044-.898-8.269 3.385-8.269h50.403c2.651 0 4.8 2.166 4.8 4.839V59.35Z"
					fill="#237BFF"
				/>
				<path
					d="M259.076 57.81c-1.111-4.043-3.539-6.801-7.492-8.061l-.764-.286c0-.095 0-.19.023-.285.463-.095.948-.214 1.411-.285 4.926-.904 8.116-3.781 9.295-8.823.926-3.9.856-7.847.185-11.794-.601-3.496-2.035-6.563-4.948-8.727-2.705-1.998-5.851-2.759-9.064-3.187-5.781-.784-11.608-.451-17.413-.404-3.653.024-7.283.333-10.937.595-1.687.119-2.173.784-2.173 2.544v56.357c0 1.807.509 2.33 2.266 2.33h8.417c1.804 0 2.266-.475 2.266-2.306V55.05c0-.998.301-1.236 1.225-1.212 2.776.071 5.55.047 8.324.071 3.353 0 5.135 1.332 6.175 4.613.116.38.208.785.301 1.165 1.341 5.47 2.659 10.915 4 16.384.323 1.308.786 1.736 2.034 1.736 3.261.024 6.522.048 9.781 0 1.596 0 2.197-.927 1.758-2.544-1.572-5.826-3.121-11.628-4.694-17.43l.024-.024Zm-10.568-18.572c-.486 2.117-1.804 3.472-3.862 3.947-1.155.262-2.382.5-3.56.524-3.285.071-6.59 0-9.875.047-.809 0-1.04-.261-1.04-1.094.046-2.615 0-5.231 0-7.847v-7.847c0-.69.185-.951.879-.927 3.352.023 6.705-.048 10.058.047 1.249.024 2.521.285 3.746.595 1.896.475 3.122 1.76 3.608 3.71.717 2.948.693 5.897.023 8.845h.023ZM580.001 45.547c0-1.165-.07-2.354-.232-3.52-.555-4.565-3.214-7.561-7.584-8.607-2.775-.666-5.573-.595-8.348-.048-4.601.927-8.624 3.186-12.348 6.04-.277.214-.555.404-.994.713.046-.475.046-.713.07-.975.184-1.83.509-3.662.531-5.493.07-5.231.024-10.463.024-15.694 0-1.474-.579-2.045-2.035-2.045h-8.602c-1.619 0-2.104.476-2.104 2.164v57.474c0 1.689.531 2.26 2.15 2.26h8.324c1.734 0 2.289-.571 2.289-2.355V48.591c0-.357.186-.928.441-1.047 1.848-.903 3.722-1.783 5.642-2.52 2.219-.856 4.531-1.237 6.913-.904 1.48.214 2.497.999 2.775 2.545.161.88.277 1.783.277 2.687v25.967c0 2.02.439 2.473 2.429 2.473h7.838c2.127 0 2.544-.428 2.544-2.568v-29.7.023ZM159.882 29.11c-1.78-5.017-4.949-8.702-9.989-10.248-2.636-.808-5.412-1.427-8.14-1.45-7.168-.048-14.336.237-21.505.428-1.872.047-2.658 1.022-2.658 2.972v53.456c0 2.378.624 3.139 2.982 3.258 4.578.237 9.18.475 13.782.57 4.162.096 8.347.143 12.486-.69 5.041-1.022 9.18-3.376 11.747-8.132 1.411-2.615 2.197-5.445 2.705-8.346 1.087-6.04 1.111-12.152.879-18.24-.185-4.589-.716-9.154-2.266-13.53l-.023-.047Zm-7.608 31.08a38.621 38.621 0 0 1-.369 1.57c-1.666 6.064-5.342 8.893-11.909 9.107-1.688.048-3.376 0-5.087 0v-.118h-6.267c-1.549-.024-2.474-.952-2.612-2.545-.024-.309-.024-.594-.024-.903V27.97c0-.428 0-.88.07-1.308.185-1.213 1.04-2.14 2.243-2.14 4.463-.024 8.949-.238 13.388.119 5.712.451 8.925 3.638 10.29 9.368.832 3.472 1.156 7.015 1.202 10.559.069 5.23.139 10.462-.948 15.623h.023ZM450.523 43.548c-.577-3.21-1.988-5.944-4.694-7.823-2.774-1.926-5.965-2.52-9.202-2.64-7.654-.261-15.238.619-22.8 1.689-1.226.166-1.734.832-1.595 2.069.208 1.807.463 3.59.74 5.374.162 1.022.878 1.546 1.896 1.474 1.734-.119 3.445-.285 5.179-.333 4.232-.142 8.463-.356 12.695-.309 3.677.048 5.341 1.784 5.433 5.28.048 1.901-.623 2.591-2.497 2.591-4.3 0-8.601-.095-12.902.048-1.942.071-3.932.333-5.758.903-3.884 1.237-6.451 3.948-6.914 8.228-.277 2.52-.277 5.089-.115 7.633.277 4.59 2.52 7.99 6.659 9.702 6.637 2.758 12.926 1.688 18.683-2.568 1.457-1.07 2.752-2.426 4.279-3.757.323 1.712.601 3.329.924 4.922.278 1.403.74 1.807 2.151 1.807h6.058c1.804 0 2.267-.5 2.267-2.33 0-8.965.022-17.906 0-26.87a28.68 28.68 0 0 0-.463-5.09h-.024Zm-14.891 23.304c-2.404 1.237-4.855 2.307-7.584 2.45a9.745 9.745 0 0 1-2.614-.238c-1.664-.404-2.704-1.522-2.844-3.282-.115-1.403-.138-2.806 0-4.209.209-1.973 1.389-3.044 3.331-3.162 1.457-.096 2.936-.048 4.393-.072 1.826-.023 3.654-.095 5.48-.095 1.734 0 2.359.666 2.381 2.402v1.712c.718 2.426-.693 3.52-2.543 4.47v.024ZM395.082 34.279c-6.59-1.784-13.226-1.76-19.863-.19-6.197 1.474-9.989 5.54-11.422 11.89-1.457 6.467-1.526 12.983-.047 19.45 1.179 5.161 3.931 9.085 8.763 11.248 2.475 1.118 5.088 1.689 7.747 1.95 4.44.452 8.88.357 13.273-.309 2.96-.428 5.85-1.308 8.741-2.092 1.132-.31 1.433-.975 1.295-2.045-.163-1.165-.325-2.33-.532-3.472-.37-2.021-1.527-2.925-3.515-2.782-2.775.166-5.526.451-8.301.5-2.821.047-5.666 0-8.486-.262-2.66-.262-4.579-1.784-5.55-4.447-.786-2.188.277-3.853 2.567-3.853h6.751c1.897 0 3.793.048 5.689 0 1.526-.07 3.053-.19 4.555-.475 4.116-.761 6.937-3.115 7.7-7.467.347-2.045.44-4.233.232-6.301-.602-6.017-3.932-9.821-9.574-11.343h-.023Zm-2.729 15.005c-.3 2.235-1.248 3.091-3.445 3.186-1.826.095-3.654 0-5.48 0v.048h-4.971c-1.619 0-2.336-.809-2.15-2.473.115-1.07.277-2.14.531-3.163.555-2.164 1.804-3.686 4.023-4.209 2.868-.69 5.735-.76 8.602.071 1.481.428 2.475 1.427 2.752 2.949.208 1.165.278 2.402.138 3.567v.024ZM301.137 34.221c-6.566-1.783-13.226-1.76-19.84-.166-6.011 1.45-9.78 5.398-11.26 11.556-1.503 6.23-1.549 12.556-.347 18.858.624 3.305 1.873 6.349 4.208 8.822 2.984 3.115 6.752 4.446 10.822 5.088 4.347.69 8.717.547 13.064.143 3.608-.333 7.169-.904 10.591-2.283 1.202-.475 1.48-1.046 1.272-2.354-.139-.999-.278-1.997-.439-2.972-.324-2.164-1.527-3.163-3.631-3.02-2.774.19-5.526.451-8.301.5-2.821.047-5.665-.001-8.487-.286-2.566-.262-4.485-1.689-5.456-4.28-.856-2.26.231-3.996 2.59-3.996h6.659c1.989 0 3.977.096 5.966-.047 1.803-.119 3.653-.333 5.411-.761 3.561-.88 5.804-3.258 6.52-6.944.324-1.617.417-3.329.393-4.993-.161-6.73-3.422-11.129-9.757-12.865h.022Zm-7.145 18.287h-9.364c-1.642 0-2.336-.762-2.174-2.45.116-1.117.3-2.259.601-3.353.579-2.116 1.874-3.543 4.024-4.066 2.774-.666 5.55-.713 8.324.024 1.804.475 2.798 1.712 3.122 3.59.069.405.139.785.161 1.19.162 3.661-1.109 5.04-4.67 5.088l-.024-.023ZM351.193 54.601c-1.04-.547-2.104-1.094-3.237-1.403-3.977-1.07-7.978-2.02-11.955-3.067-1.687-.452-3.399-.975-5.017-1.641-1.249-.5-1.596-1.617-1.388-3.424.14-1.237.671-1.879 1.966-2.14 1.086-.214 2.197-.357 3.283-.357 5.897 0 11.817.095 17.713.143 1.156 0 1.826-.38 1.965-1.356.232-1.783.393-3.59.532-5.398.069-.808-.416-1.331-1.156-1.522-.417-.118-.832-.166-1.249-.237a122.846 122.846 0 0 0-18.915-1.19c-3.492.048-6.983.334-10.29 1.665-3.191 1.26-5.271 3.567-5.826 7.087-.255 1.545-.393 3.138-.324 4.708.3 6.468 2.636 9.678 8.601 11.675 2.984.975 6.059 1.617 9.065 2.45 2.52.69 5.041 1.379 7.515 2.164 1.41.451 1.989 1.474 1.943 3.02-.046 1.854-1.11 2.996-3.284 3.115-3.746.237-7.492.309-11.238.428v-.19h-9.296c-1.317 0-1.85.451-2.034 1.76a123.709 123.709 0 0 0-.463 4.208c-.161 1.57.278 2.14 1.804 2.378 6.844 1.094 13.758 1.403 20.671 1.189 3.169-.095 6.313-.404 9.342-1.474 3.238-1.142 5.365-3.377 6.221-6.801.647-2.663.693-5.374.347-8.085-.439-3.543-2.267-6.088-5.319-7.68l.023-.025ZM530.53 69.239c-.161-1.07-.878-1.57-1.965-1.498-.879.07-1.757.213-2.637.213-3.838.096-7.699.333-11.514.143-3.977-.19-6.082-2.14-6.915-6.04-.901-4.066-.855-8.204 0-12.294.694-3.424 2.752-5.54 6.197-5.897 2.544-.261 5.134-.31 7.701-.428v.285h6.543c.995 0 1.596-.451 1.782-1.474.23-1.427.461-2.854.716-4.256.393-2.236.138-2.735-1.989-3.306-7.145-1.973-14.36-2.306-21.62-.927-5.503 1.046-9.712 3.995-11.492 9.678-.809 2.592-1.295 5.35-1.527 8.061-.461 5.398-.323 10.796 1.226 16.051 1.48 4.994 4.602 8.3 9.457 9.892 3.978 1.285 8.071 1.475 12.187 1.356 4.508-.143 8.971-.666 13.249-2.283 1.226-.475 1.503-.88 1.342-2.188-.208-1.688-.44-3.376-.717-5.065l-.024-.023ZM488.371 32.966c-4.463-.048-8.44 1.545-12.163 3.9-1.734 1.093-3.353 2.378-5.179 3.685-.301-1.64-.579-3.138-.856-4.637-.254-1.426-.693-1.807-2.104-1.807h-5.966c-1.734 0-2.173.476-2.173 2.283v39.046c0 1.854.461 2.33 2.243 2.354h8.023c1.966 0 2.405-.452 2.405-2.497V49.635c0-.333-.07-.69.023-.999.069-.261.277-.618.508-.69 4.741-1.569 9.482-3.233 14.591-2.9 1.156.071 1.712-.523 1.827-1.76.277-2.71.555-5.398.786-8.109.139-1.664-.346-2.187-1.988-2.211h.023ZM207.261 70.27c-.393-.047-.786-.047-1.179-.047H188.37c-4 0-5.665-1.712-5.665-5.802V20.857c0-1.783-1.018-2.806-2.728-2.83h-2.73c-2.08 0-2.96.928-2.96 3.068v22.638c0 7.538-.022 15.1 0 22.638 0 3.59 1.111 6.753 4.024 8.965 1.919 1.474 4.209 1.997 6.544 2.02 5.017.048 10.036 0 15.054-.047 2.451-.024 4.878-.19 7.33-.356 1.433-.096 2.312-1.142 2.312-2.593 0-2.734-.647-3.9-2.312-4.113l.022.024Z"
					className="fill-(--text-primary)"
				/>
			</g>
			<defs>
				<clipPath id="dl-research-a">
					<path fill="#fff" d="M0 0h580v93.687H0z" />
				</clipPath>
			</defs>
		</svg>
	)
}
