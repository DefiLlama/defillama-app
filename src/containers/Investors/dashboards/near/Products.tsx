import { NearIcon } from './NearHeader'

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="inline-flex items-center gap-1 text-sm font-medium text-(--sl-accent) hover:underline"
		>
			{children}
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3">
				<path d="M7 17L17 7M17 7H7M17 7v10" />
			</svg>
		</a>
	)
}

function ProductCard({
	title,
	children,
	links
}: {
	title: string
	children: React.ReactNode
	links?: Array<{ url: string; label: string }>
}) {
	return (
		<div className="flex flex-col gap-3 rounded-xl border border-(--cards-border) bg-(--cards-bg) p-6 transition-all hover:border-(--sl-accent)/20 hover:shadow-md">
			<h3 className="text-base font-semibold text-(--text-primary)">{title}</h3>
			<div className="flex flex-col gap-3 text-sm leading-relaxed text-(--text-secondary)">{children}</div>
			{links && links.length > 0 && (
				<div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 pt-1">
					{links.map((link) => (
						<ExternalLink key={link.url} href={link.url}>
							{link.label}
						</ExternalLink>
					))}
				</div>
			)}
		</div>
	)
}

export default function Products() {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-4 rounded-xl border border-(--cards-border) bg-(--cards-bg) p-6">
				<div className="flex items-center gap-3">
					<NearIcon />
					<h1 className="text-xl font-bold text-(--text-primary)">Protocol</h1>
				</div>
				<p className="max-w-3xl text-[15px] leading-relaxed text-(--text-secondary)">
					NEAR is the unified commerce layer for assets and agents. NEAR is where cross-chain execution is unified,
					where AI runs with confidentiality, and where economic activity flows back into the protocol itself. What
					began as a sharded blockchain has evolved into a vertically integrated system designed to coordinate value
					movement across blockchains, traditional assets, and the emerging agentic economy.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<ProductCard
					title="Blockchain"
					links={[
						{ url: 'https://near.org', label: 'near.org' },
						{ url: 'https://pages.near.org/papers/nightshade/', label: 'Nightshade Paper' }
					]}
				>
					<p>
						The execution and settlement substrate upon which the rest of the NEAR stack is built. NEAR&apos;s approach
						to scaling is grounded in sharding, partitioning the processing load into parallel subsets.
					</p>
					<ul className="flex flex-col gap-1.5 pl-4">
						<li className="list-disc">Dynamic resharding with 1M+ TPS scalability</li>
						<li className="list-disc">Chain signatures and global smart contracts</li>
						<li className="list-disc">9 live shards on mainnet</li>
						<li className="list-disc">600ms block times, 1.2s finality</li>
					</ul>
				</ProductCard>

				<ProductCard title="Near.com" links={[{ url: 'https://near.com', label: 'near.com' }]}>
					<p>
						What a unified commerce layer looks like in practice. Collapses the complexity of chains, bridges, gas
						tokens, and fragmented liquidity into a single account and a single interface.
					</p>
					<ul className="flex flex-col gap-1.5 pl-4">
						<li className="list-disc">Cross-chain execution across 35+ chains</li>
						<li className="list-disc">Peer-to-peer trading and cross-chain swaps</li>
						<li className="list-disc">Confidential execution flows</li>
						<li className="list-disc">Single account abstraction</li>
					</ul>
				</ProductCard>

				<ProductCard title="NEAR Intents" links={[{ url: 'https://intents.near.org/', label: 'intents.near.org' }]}>
					<p>
						Market-leading cross-chain infrastructure. Users express desired outcomes without managing routes, bridges,
						or liquidity sources. A neutral coordination layer embedded across wallets, protocols, and agent systems.
					</p>
					<ul className="flex flex-col gap-1.5 pl-4">
						<li className="list-disc">$16B+ in cross-chain volume</li>
						<li className="list-disc">Abstracts execution into a neutral layer</li>
						<li className="list-disc">Integrated across wallets and financial platforms</li>
						<li className="list-disc">Foundation for agentic commerce</li>
					</ul>
				</ProductCard>

				<ProductCard
					title="NEAR AI"
					links={[
						{ url: 'https://near.ai/', label: 'near.ai' },
						{ url: 'https://near.ai/cloud', label: 'AI Cloud' },
						{ url: 'https://www.ironclaw.com/', label: 'IronClaw' },
						{ url: 'https://market.near.ai/', label: 'Agent Market' }
					]}
				>
					<p>
						Confidential, verifiable AI infrastructure for the agentic economy. Built on NEAR&apos;s Decentralized
						Confidential Machine Learning (DCML), providing the intelligence layer where AI systems reason, operate, and
						transact with confidentiality.
					</p>
					<ul className="flex flex-col gap-1.5 pl-4">
						<li className="list-disc">NEAR AI Cloud: hardware-backed private inference via TEEs</li>
						<li className="list-disc">IronClaw: always-on AI agents in encrypted enclaves</li>
						<li className="list-disc">Confidential Agent Hosting and GPU Marketplace</li>
						<li className="list-disc">NEAR AI Agent Market integrated with NEAR Intents</li>
					</ul>
				</ProductCard>
			</div>

			<div className="rounded-xl border border-(--cards-border) bg-(--cards-bg) p-6 transition-all hover:border-(--sl-accent)/20 hover:shadow-md">
				<div className="flex items-center justify-between">
					<h3 className="text-base font-semibold text-(--text-primary)">Governance: House of Stake</h3>
					<ExternalLink href="https://houseofstake.org/">houseofstake.org</ExternalLink>
				</div>
				<p className="mt-3 max-w-3xl text-sm leading-relaxed text-(--text-secondary)">
					NEAR&apos;s governance body providing a framework for coordinating protocol upgrades, economic parameters, and
					treasury decisions. House of Stake formalizes how proposals are introduced, debated, and ratified, and is
					incorporating AI-assisted mechanisms to improve efficiency, analysis, and coordination.
				</p>
			</div>
		</div>
	)
}
