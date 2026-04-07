const REPORTS = [
	{
		source: 'Bitwise',
		title: 'The Investment Case for NEAR',
		url: 'https://bitwiseinvestments.eu/blog/special-reports/the-investment-case-for-near/',
		color: '#2563eb'
	},
	{
		source: 'SVRN',
		title: 'NEAR Protocol: The Bottom-Up Investment Case',
		url: 'https://svrn.net/research/near-protocol',
		color: '#7c3aed'
	},
	{
		source: 'Nansen',
		title: 'NEAR Quarterly Report: Q4 2025',
		url: 'https://research.nansen.ai/articles/nansen-s-near-quarterly-report-q4-2025',
		color: '#0891b2'
	},
	{
		source: 'Messari',
		title: 'State of NEAR Q3 2025',
		url: 'https://messari.io/report/state-of-near-q3-2025',
		color: '#059669'
	},
	{
		source: 'Reflexivity Research',
		title: 'Exploring NEAR\u2019s Approach to Chain Abstraction',
		url: 'https://www.reflexivityresearch.com/all-reports/exploring-nears-approach-to-chain-abstraction',
		color: '#d97706'
	}
]

const RESEARCH_PAPERS = [
	{
		title: 'The NEAR White Paper',
		description: 'Core protocol design, consensus mechanism, and economic model.',
		url: 'https://cdn.builder.io/o/assets%2F70130eda95b54795a38fe0f6e694359f%2Ffa4d6a189b424099a9fea6d80de00303?alt=media&token=dc09fbbb-2ff6-44c2-a508-72f8a985290a&apiKey=70130eda95b54795a38fe0f6e694359f',
		icon: 'W'
	},
	{
		title: 'Nightshade: NEAR Protocol Sharding Design 2.0',
		description: 'Dynamic sharding architecture enabling horizontal scalability without sacrificing security.',
		url: 'https://discovery-domain.org/papers/nightshade.pdf',
		icon: 'N'
	},
	{
		title: 'Decentralized Confidential Machine Learning (DCML)',
		description: 'Framework for private, verifiable AI computation using trusted execution environments.',
		url: 'https://github.com/nearai/papers/blob/main/DecentralizedConfidentialMachineLearning.pdf',
		icon: 'D'
	},
	{
		title: 'Proof of Response',
		description: 'Mechanism for verifiable agent behavior in decentralized AI systems.',
		url: 'https://arxiv.org/html/2502.10637v1',
		icon: 'P'
	}
]

const ABOUT_NEAR = [
	{
		title: 'NEAR: The Definitive Guide',
		url: 'https://www.near.org/blog/what-is-near-protocol'
	},
	{
		title: 'Evolving NEAR Tokenomics',
		url: 'https://www.near.org/blog/evolving-near-tokenomics'
	},
	{
		title: 'NEAR Protocol and Product Revenue Tracker',
		url: 'https://revenue.near.org/'
	},
	{
		title: 'Attention by Illia Polosukhin',
		url: 'https://ilblackdragon.substack.com/'
	}
]

function ReportCard({ source, title, url, color }: { source: string; title: string; url: string; color: string }) {
	return (
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			className="group flex gap-4 rounded-xl border border-(--cards-border) bg-(--cards-bg) p-5 transition-all hover:border-(--sl-accent)/20 hover:shadow-md"
		>
			<div
				className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
				style={{ backgroundColor: color + '18' }}
			>
				<span className="text-sm font-bold" style={{ color }}>
					{source.charAt(0)}
				</span>
			</div>
			<div className="flex flex-1 flex-col gap-1.5">
				<span className="text-xs font-semibold tracking-wider uppercase" style={{ color }}>
					{source}
				</span>
				<span className="text-sm leading-snug font-medium text-(--text-primary) transition-colors group-hover:text-(--sl-accent)">
					{title}
				</span>
			</div>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				className="mt-1 h-4 w-4 shrink-0 text-(--text-tertiary) transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-(--sl-accent)"
			>
				<path d="M7 17L17 7M17 7H7M17 7v10" />
			</svg>
		</a>
	)
}

function PaperCard({
	title,
	description,
	url,
	icon
}: {
	title: string
	description: string
	url: string
	icon: string
}) {
	return (
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			className="group flex gap-4 rounded-xl border border-(--cards-border) bg-(--cards-bg) p-5 transition-all hover:border-(--sl-accent)/20 hover:shadow-md"
		>
			<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--sl-accent-muted)">
				<span className="text-sm font-bold text-(--sl-accent)">{icon}</span>
			</div>
			<div className="flex flex-1 flex-col gap-1">
				<span className="text-sm font-semibold text-(--text-primary) transition-colors group-hover:text-(--sl-accent)">
					{title}
				</span>
				<span className="text-xs leading-relaxed text-(--text-secondary)">{description}</span>
			</div>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				className="mt-1 h-4 w-4 shrink-0 text-(--text-tertiary) transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-(--sl-accent)"
			>
				<path d="M7 17L17 7M17 7H7M17 7v10" />
			</svg>
		</a>
	)
}

function LinkItem({ title, url }: { title: string; url: string }) {
	return (
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			className="group flex items-center justify-between gap-4 rounded-lg border border-(--cards-border) bg-(--cards-bg) px-5 py-3.5 transition-all hover:border-(--sl-accent)/20 hover:shadow-sm"
		>
			<span className="text-sm font-medium text-(--text-primary) transition-colors group-hover:text-(--sl-accent)">
				{title}
			</span>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				className="h-4 w-4 shrink-0 text-(--text-tertiary) transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-(--sl-accent)"
			>
				<path d="M7 17L17 7M17 7H7M17 7v10" />
			</svg>
		</a>
	)
}

export default function Research() {
	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-2 rounded-xl border border-(--cards-border) bg-(--cards-bg) p-6">
				<h1 className="text-xl font-bold text-(--text-primary)">Reports & Research</h1>
				<p className="max-w-2xl text-sm leading-relaxed text-(--text-secondary)">
					Independent analysis, technical papers, and foundational resources covering NEAR&apos;s investment case,
					architecture, and ecosystem growth.
				</p>
			</div>

			<div>
				<h2 className="mb-4 text-lg font-semibold tracking-tight text-(--text-primary)">Reports</h2>
				<div className="flex flex-col gap-3">
					{REPORTS.map((report) => (
						<ReportCard key={report.title} {...report} />
					))}
				</div>
			</div>

			<div>
				<h2 className="mb-4 text-lg font-semibold tracking-tight text-(--text-primary)">Papers</h2>
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
					{RESEARCH_PAPERS.map((paper) => (
						<PaperCard key={paper.title} {...paper} />
					))}
				</div>
			</div>

			<div>
				<h2 className="mb-4 text-lg font-semibold tracking-tight text-(--text-primary)">About NEAR</h2>
				<div className="flex flex-col gap-2.5">
					{ABOUT_NEAR.map((resource) => (
						<LinkItem key={resource.title} {...resource} />
					))}
				</div>
			</div>
		</div>
	)
}
