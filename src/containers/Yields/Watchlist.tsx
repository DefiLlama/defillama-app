import { useRouter } from 'next/router'
import { useMemo, useState } from 'react'
import { DialogForm } from '~/components/DialogForm'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Menu } from '~/components/Menu'
import { ColumnFilters } from '~/containers/Yields/Filters/ColumnFilters'
import { ALL_POOL_COLUMN_QUERY_KEYS } from '~/containers/Yields/Filters/poolColumns'
import { mapPoolToYieldTableRow } from '~/containers/Yields/poolsPipeline'
import { useHolderStats, useVolatility } from '~/containers/Yields/queries/client'
import { YieldsPoolsTable } from '~/containers/Yields/Tables/Pools'
import { DEFAULT_PORTFOLIO_NAME } from '~/contexts/LocalStorage'
import { useBookmarks } from '~/hooks/useBookmarks'
import { useIsClient } from '~/hooks/useIsClient'

export function YieldsWatchlistContainer({ protocolsDict }) {
	const isClient = useIsClient()
	const { portfolios, selectedPortfolio, savedProtocols, addPortfolio, removePortfolio, setSelectedPortfolio } =
		useBookmarks('yields')
	const { data: volatility } = useVolatility()
	const { data: holderStats } = useHolderStats(
		isClient ? protocolsDict.filter((p) => savedProtocols.has(p.pool)).map((p) => p.pool) : undefined
	)

	const filteredProtocols = useMemo(() => {
		if (isClient) {
			const list = protocolsDict.filter((p) => savedProtocols.has(p.pool))
			return list.map((pool) => mapPoolToYieldTableRow(pool, { volatility, holderStats }))
		} else return []
	}, [isClient, savedProtocols, protocolsDict, volatility, holderStats])
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
					{selectedPortfolio !== DEFAULT_PORTFOLIO_NAME ? (
						<button
							onClick={() => removePortfolio(selectedPortfolio)}
							className="flex items-center gap-1 rounded-md border border-red-200 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 focus-visible:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 dark:focus-visible:bg-red-900/20"
							title="Delete current portfolio"
							data-umami-event="yields-watchlist-portfolio-delete"
						>
							<Icon name="trash-2" height={14} width={14} />
							<span>Delete</span>
						</button>
					) : null}
					<ColumnFilters enabledColumns={ALL_POOL_COLUMN_QUERY_KEYS} />
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
