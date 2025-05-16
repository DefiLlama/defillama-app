import * as React from 'react'
import Layout from '~/layout'
import { Announcement } from '~/components/Announcement'
import { scams } from '~/constants'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import Link from 'next/link'
import { slug } from '~/utils'

export function ProtocolOverviewLayout({
	children,
	isCEX,
	pageStyles,
	name,
	category,
	otherProtocols,
	toggleOptions,
	metrics,
	tab
}: {
	children: React.ReactNode
	isCEX?: boolean
	pageStyles: Record<string, string>
	name: string
	category: string
	otherProtocols?: Array<string>
	toggleOptions?: Array<{
		name: string
		key: string
	}>
	metrics: {
		dexs: boolean
		perps: boolean
		options: boolean
		dexAggregators: boolean
		perpsAggregators: boolean
		bridgeAggregators: boolean
		stablecoins: boolean
		bridge: boolean
		treasury: boolean
		unlocks: boolean
		yields: boolean
		fees: boolean
		forks: boolean
		governance: boolean
	}
	tab?:
		| 'information'
		| 'assets'
		| 'tvl'
		| 'stablecoins'
		| 'bridges'
		| 'treasury'
		| 'unlocks'
		| 'yields'
		| 'fees'
		| 'dexs'
		| 'perps'
		| 'dex-aggregators'
		| 'perps-aggregators'
		| 'bridge-aggregators'
		| 'options'
		| 'governance'
		| 'forks'
}) {
	return (
		<Layout title={name} backgroundColor={pageStyles['--bg-color']} style={pageStyles as any}>
			<ProtocolsChainsSearch options={toggleOptions} />

			{scams.includes(name) && (
				<Announcement warning={true} notCancellable={true}>
					Project has some red flags and multiple users have reported concerns. Be careful.
				</Announcement>
			)}
			{name === '01' && (
				<Announcement warning={true} notCancellable={true}>
					01 Exchange was winded down. Please withdraw your remaining assets.
				</Announcement>
			)}
			{name === 'Curve Finance' && (
				<Announcement warning={true} notCancellable={true}>
					curve.fi domain has been hijacked
				</Announcement>
			)}
			{(category === 'Uncollateralized Lending' || category === 'RWA Lending') && (
				<Announcement>
					Borrowed coins are not included into TVL by default, to include them toggle Borrows. For more info on this
					click{' '}
					<a
						href="https://github.com/DefiLlama/DefiLlama-Adapters/discussions/6163"
						target="_blank"
						rel="noreferrer noopener"
					>
						here
					</a>
					.
				</Announcement>
			)}
			{name === 'Multichain' && (
				<Announcement warning={true} notCancellable={true}>
					Please avoid using Multichain. The Multichain team doesn't control the keys and your money will get
					stuck/lost.
				</Announcement>
			)}
			{(name === 'ReHold' || name === 'ReHold V1' || name === 'ReHold V2') && (
				<Announcement warning={true} notCancellable={true}>
					$700,000 Unsanctioned Withdrawal Be cautious when interacting with ReHold, ReHold V1, and ReHold V2. It is
					important to review both sides of the story: Check both the history here:
					medium.com/@bifotofficial/700-000-unauthorized-withdrawal-from-rehold-protocol-full-disclosure-and-next-steps-097119d545cd
					and the other side here: prnt.sc/HspPo_049Lzk. On rehold.io. Made on 26/09/2024.
				</Announcement>
			)}

			{otherProtocols?.length > 1 && (
				<nav className="flex overflow-x-auto bg-[var(--cards-bg)] rounded-md w-full max-w-fit text-xs font-medium">
					{otherProtocols.map((p) => (
						<Link href={`/protocol/${slug(p)}`} key={'navigate to ' + `/protocol/${slug(p)}`} passHref>
							<a
								data-active={p === name}
								className="flex-shrink-0 py-2 px-6 whitespace-nowrap first:rounded-l-md last:rounded-r-md data-[active=true]:bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] border-l border-[var(--form-control-border)] first:border-l-0"
							>
								{p}
							</a>
						</Link>
					))}
				</nav>
			)}
			<div className="flex flex-col gap-1">
				<div className="w-full flex overflow-x-auto bg-[var(--cards-bg)] rounded-md text-xs font-medium">
					{isCEX ? (
						<Link
							href={`/cex/${slug(name)}`}
							data-active={!tab || tab === 'information'}
							legacyBehavior={false}
							prefetch
							className="flex-shrink-0 py-2 px-6 whitespace-nowrap border-b border-r border-[var(--form-control-border)] data-[active=true]:border-b-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
						>
							Information
						</Link>
					) : (
						<Link
							href={`/protocol/${slug(name)}`}
							data-active={!tab || tab === 'information'}
							legacyBehavior={false}
							prefetch
							className="flex-shrink-0 py-2 px-6 whitespace-nowrap border-b border-r border-[var(--form-control-border)] data-[active=true]:border-b-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
						>
							Information
						</Link>
					)}
					{isCEX ? (
						<Link
							href={`/cex/assets/${slug(name)}`}
							data-active={tab === 'assets'}
							legacyBehavior={false}
							prefetch
							className="flex-shrink-0 py-2 px-6 whitespace-nowrap border-b border-r border-[var(--form-control-border)] data-[active=true]:border-b-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
						>
							Assets
						</Link>
					) : (
						<Link
							href={`/protocol/tvl/${slug(name)}`}
							data-active={tab === 'tvl'}
							legacyBehavior={false}
							prefetch
							className="flex-shrink-0 py-2 px-6 whitespace-nowrap border-b border-r border-[var(--form-control-border)] data-[active=true]:border-b-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
						>
							TVL
						</Link>
					)}
					{metrics.stablecoins && (
						<Link
							href={`/protocol/stablecoins/${slug(name)}`}
							data-active={tab === 'stablecoins'}
							legacyBehavior={false}
							prefetch
							className="flex-shrink-0 py-2 px-6 whitespace-nowrap border-b border-r border-[var(--form-control-border)] data-[active=true]:border-b-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
						>
							Stablecoin Info
						</Link>
					)}
					{metrics.bridge && (
						<Link
							href={`/protocol/bridges/${slug(name)}`}
							data-active={tab === 'bridges'}
							legacyBehavior={false}
							prefetch
							className="flex-shrink-0 py-2 px-6 whitespace-nowrap border-b border-r border-[var(--form-control-border)] data-[active=true]:border-b-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
						>
							Bridge Info
						</Link>
					)}
					{metrics.treasury && (
						<Link
							href={`/protocol/treasury/${slug(name)}`}
							data-active={tab === 'treasury'}
							legacyBehavior={false}
							prefetch
							className="flex-shrink-0 py-2 px-6 whitespace-nowrap border-b border-r border-[var(--form-control-border)] data-[active=true]:border-b-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
						>
							Treasury
						</Link>
					)}
					{metrics.unlocks && (
						<Link
							href={`/protocol/unlocks/${slug(name)}`}
							data-active={tab === 'unlocks'}
							legacyBehavior={false}
							prefetch
							className="flex-shrink-0 py-2 px-6 whitespace-nowrap border-b border-r border-[var(--form-control-border)] data-[active=true]:border-b-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
						>
							Unlocks
						</Link>
					)}
					{metrics.yields && (
						<Link
							href={`/protocol/yields/${slug(name)}`}
							data-active={tab === 'yields'}
							legacyBehavior={false}
							prefetch
							className="flex-shrink-0 py-2 px-6 whitespace-nowrap border-b border-r border-[var(--form-control-border)] data-[active=true]:border-b-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
						>
							Yields
						</Link>
					)}
					{metrics.fees && (
						<Link
							href={`/protocol/fees/${slug(name)}`}
							data-active={tab === 'fees'}
							legacyBehavior={false}
							prefetch
							className="flex-shrink-0 py-2 px-6 whitespace-nowrap border-b border-r border-[var(--form-control-border)] data-[active=true]:border-b-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
						>
							Fees and Revenue
						</Link>
					)}
					{metrics.dexs && (
						<Link
							href={`/protocol/dexs/${slug(name)}`}
							data-active={tab === 'dexs'}
							legacyBehavior={false}
							prefetch
							className="flex-shrink-0 py-2 px-6 whitespace-nowrap border-b border-r border-[var(--form-control-border)] data-[active=true]:border-b-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
						>
							DEX Volume
						</Link>
					)}
					{metrics.perps && (
						<Link
							href={`/protocol/perps/${slug(name)}`}
							data-active={tab === 'perps'}
							legacyBehavior={false}
							prefetch
							className="flex-shrink-0 py-2 px-6 whitespace-nowrap border-b border-r border-[var(--form-control-border)] data-[active=true]:border-b-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
						>
							Perps Volume
						</Link>
					)}
					{metrics.dexAggregators && (
						<Link
							href={`/protocol/dex-aggregators/${slug(name)}`}
							data-active={tab === 'dex-aggregators'}
							legacyBehavior={false}
							prefetch
							className="flex-shrink-0 py-2 px-6 whitespace-nowrap border-b border-r border-[var(--form-control-border)] data-[active=true]:border-b-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
						>
							Aggregators Volume
						</Link>
					)}
					{metrics.perpsAggregators && (
						<Link
							href={`/protocol/perps-aggregators/${slug(name)}`}
							data-active={tab === 'perps-aggregators'}
							legacyBehavior={false}
							prefetch
							className="flex-shrink-0 py-2 px-6 whitespace-nowrap border-b border-r border-[var(--form-control-border)] data-[active=true]:border-b-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
						>
							Perps Aggregators Volume
						</Link>
					)}
					{metrics.bridgeAggregators && (
						<Link
							href={`/protocol/bridge-aggregators/${slug(name)}`}
							data-active={tab === 'bridge-aggregators'}
							legacyBehavior={false}
							prefetch
							className="flex-shrink-0 py-2 px-6 whitespace-nowrap border-b border-r border-[var(--form-control-border)] data-[active=true]:border-b-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
						>
							Bridge Aggregators Volume
						</Link>
					)}
					{metrics.options && (
						<Link
							href={`/protocol/options/${slug(name)}`}
							data-active={tab === 'options'}
							legacyBehavior={false}
							prefetch
							className="flex-shrink-0 py-2 px-6 whitespace-nowrap border-b border-r border-[var(--form-control-border)] data-[active=true]:border-b-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
						>
							Options Volume
						</Link>
					)}
					{metrics.governance && (
						<Link
							href={`/protocol/governance/${slug(name)}`}
							data-active={tab === 'governance'}
							legacyBehavior={false}
							prefetch
							className="flex-shrink-0 py-2 px-6 whitespace-nowrap border-b border-r border-[var(--form-control-border)] data-[active=true]:border-b-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
						>
							Governance
						</Link>
					)}
					{metrics.forks && (
						<Link
							href={`/protocol/forks/${slug(name)}`}
							data-active={tab === 'forks'}
							legacyBehavior={false}
							prefetch
							className="flex-shrink-0 py-2 px-6 whitespace-nowrap border-b border-r border-[var(--form-control-border)] data-[active=true]:border-b-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
						>
							Forks
						</Link>
					)}
				</div>
				{children}
			</div>
		</Layout>
	)
}
