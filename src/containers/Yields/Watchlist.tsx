import { useRouter } from 'next/router'
import { useMemo, useState } from 'react'
import { DialogForm } from '~/components/DialogForm'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Menu } from '~/components/Menu'
import { ColumnFilters } from '~/containers/Yields/Filters/ColumnFilters'
import { YieldsPoolsTable } from '~/containers/Yields/Tables/Pools'
import { DEFAULT_PORTFOLIO_NAME } from '~/contexts/LocalStorage'
import { useBookmarks } from '~/hooks/useBookmarks'
import { useIsClient } from '~/hooks/useIsClient'

const ALL_YIELD_COLUMNS = [
	'show7dBaseApy',
	'show7dIL',
	'show1dVolume',
	'show7dVolume',
	'showInceptionApy',
	'showBorrowBaseApy',
	'showBorrowRewardApy',
	'showNetBorrowApy',
	'showLTV',
	'showTotalSupplied',
	'showTotalBorrowed',
	'showAvailable'
]

export function YieldsWatchlistContainer({ protocolsDict }) {
	const isClient = useIsClient()

	const { portfolios, selectedPortfolio, savedProtocols, addPortfolio, removePortfolio, setSelectedPortfolio } =
		useBookmarks('yields')

	const filteredProtocols = useMemo(() => {
		if (isClient) {
			const list = protocolsDict.filter((p) => savedProtocols.has(p.pool))
			return list.map((t) => ({
				pool: t.symbol,
				configID: t.pool,
				projectslug: t.project,
				project: t.projectName,
				chains: [t.chain],
				tvl: t.tvlUsd,
				apy: t.apy,
				apyBase: t.apyBase,
				apyBase7d: t.apyBase7d,
				apyReward: t.apyReward,
				apyNet7d: t.apyNet7d,
				apyMean30d: t.apyMean30d,
				il7d: t.il7d,
				rewardTokensSymbols: t.rewardTokensSymbols,
				rewards: t.rewardTokensNames,
				change1d: t.apyPct1D,
				change7d: t.apyPct7D,
				outlook: t.apy >= 0.005 ? t.predictions.predictedClass : null,
				confidence: t.apy >= 0.005 ? t.predictions.binnedConfidence : null,
				url: t.url,
				category: t.category,
				volumeUsd1d: t.volumeUsd1d,
				volumeUsd7d: t.volumeUsd7d,
				apyBaseInception: t.apyBaseInception,
				apyIncludingLsdApy: t.apyIncludingLsdApy,
				apyBaseIncludingLsdApy: t.apyBaseIncludingLsdApy,
				apyBaseBorrow: t.apyBaseBorrow,
				apyRewardBorrow: t.apyRewardBorrow,
				apyBorrow: t.apyBorrow,
				totalSupplyUsd: t.totalSupplyUsd,
				totalBorrowUsd: t.totalBorrowUsd,
				totalAvailableUsd: t.totalAvailableUsd,
				ltv: t.ltv,
				lsdTokenOnly: t.lsdTokenOnly
			}))
		} else return []
	}, [isClient, savedProtocols, protocolsDict])
	const [open, setOpen] = useState(false)

	return (
		<>
			<WatchListTabs />
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-wrap items-center gap-2 p-2">
					<h1 className="mr-auto text-base font-semibold">Saved Pools</h1>
					<Menu
						name={selectedPortfolio}
						options={portfolios}
						onItemClick={(value) => {
							setSelectedPortfolio(value)
						}}
						className="relative flex min-w-[100px] cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs font-medium text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
						data-umami-event="yields-watchlist-portfolio-switch"
					/>
					<DialogForm
						title="New Portfolio"
						description="Enter the name of your new portfolio"
						open={open}
						setOpen={setOpen}
						onSubmit={addPortfolio}
					/>
					<button
						onClick={() => setOpen(true)}
						className="flex items-center gap-1 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
						title="Create new portfolio"
						data-umami-event="yields-watchlist-portfolio-create"
					>
						<Icon name="folder-plus" height={14} width={14} />
						<span>New</span>
					</button>
					{selectedPortfolio !== DEFAULT_PORTFOLIO_NAME && (
						<button
							onClick={() => removePortfolio(selectedPortfolio)}
							className="flex items-center gap-1 rounded-md border border-red-200 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 focus-visible:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 dark:focus-visible:bg-red-900/20"
							title="Delete current portfolio"
							data-umami-event="yields-watchlist-portfolio-delete"
						>
							<Icon name="trash-2" height={14} width={14} />
							<span>Delete</span>
						</button>
					)}
					<ColumnFilters enabledColumns={ALL_YIELD_COLUMNS} />
				</div>

				{filteredProtocols.length ? (
					<YieldsPoolsTable data={filteredProtocols} />
				) : (
					<p className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 text-center">
						You have not saved any pools.
					</p>
				)}
			</div>
		</>
	)
}

export const WatchListTabs = () => {
	const router = useRouter()
	return (
		<nav className="relative flex w-full max-w-fit items-center gap-2 border-b-2 border-(--form-control-border) text-xs font-semibold">
			<BasicLink
				href={'/watchlist'}
				data-active={router.pathname === '/watchlist'}
				className="relative bottom-[-2px] shrink-0 border-b-2 border-transparent px-2.5 py-1 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:border-(--old-blue)"
			>
				DeFi
			</BasicLink>

			<BasicLink
				href={'/yields/watchlist'}
				data-active={router.pathname === '/yields/watchlist'}
				className="relative bottom-[-2px] shrink-0 border-b-2 border-transparent px-2.5 py-1 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:border-(--old-blue)"
			>
				Yields
			</BasicLink>
		</nav>
	)
}
