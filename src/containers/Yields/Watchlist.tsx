import { useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { DialogForm } from '~/components/DialogForm'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Menu } from '~/components/Menu'
import { Switch } from '~/components/Switch'
import { YieldsPoolsTable } from '~/containers/Yields/Tables/Pools'
import { DEFAULT_PORTFOLIO_NAME } from '~/contexts/LocalStorage'
import { useIsClient } from '~/hooks'
import { useBookmarks } from '~/hooks/useBookmarks'

export function YieldsWatchlistContainer({ protocolsDict }) {
	const { query, pathname, push } = useRouter()
	const {
		show7dBaseApy,
		show7dIL,
		show1dVolume,
		show7dVolume,
		showInceptionApy,
		showNetBorrowApy,
		showBorrowBaseApy,
		showBorrowRewardApy,
		showLTV,
		showTotalSupplied,
		showTotalBorrowed,
		showAvailable
	} = query

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
				<h1 className="p-3 text-xl font-semibold">Saved Pools</h1>

				<div className="flex flex-wrap items-center gap-4 p-3">
					<h2>Current portfolio:</h2>
					<Menu
						name={selectedPortfolio}
						options={portfolios}
						onItemClick={(value) => setSelectedPortfolio(value)}
						className="relative flex cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md border border-(--form-control-border) p-2 text-xs font-medium text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
					/>
					<DialogForm
						title="New Portfolio"
						description="Enter the name of your new portfolio"
						open={open}
						setOpen={setOpen}
						onSubmit={addPortfolio}
					/>
					<button onClick={() => setOpen(true)}>
						<Icon name="folder-plus" height={24} width={24} />
					</button>
					{selectedPortfolio !== DEFAULT_PORTFOLIO_NAME && (
						<button onClick={() => removePortfolio(selectedPortfolio)}>
							<Icon name="trash-2" height={24} width={24} />
						</button>
					)}

					<div className="ml-auto flex flex-wrap items-center gap-4 p-3">
						<Switch
							label="7d Base Apy"
							value="7d Base Apy"
							onChange={() => {
								const enabled = show7dBaseApy === 'true'
								push({ pathname, query: { ...query, show7dBaseApy: !enabled } }, undefined, { shallow: true })
							}}
							checked={query.show7dBaseApy === 'true'}
						/>
						<Switch
							label="7d IL"
							value="7d IL"
							onChange={() => {
								const enabled = show7dIL === 'true'
								push({ pathname, query: { ...query, show7dIL: !enabled } }, undefined, { shallow: true })
							}}
							checked={query.show7dIL === 'true'}
						/>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-4 p-3">
					<Switch
						label="1d Volume"
						value="1d Volume"
						onChange={() => {
							const enabled = show1dVolume === 'true'
							push({ pathname, query: { ...query, show1dVolume: !enabled } }, undefined, { shallow: true })
						}}
						checked={query.show1dVolume === 'true'}
					/>

					<Switch
						label="7d Volume"
						value="7d Volume"
						onChange={() => {
							const enabled = show7dVolume === 'true'
							push({ pathname, query: { ...query, show7dVolume: !enabled } }, undefined, { shallow: true })
						}}
						checked={query.show7dVolume === 'true'}
					/>

					<Switch
						label="Inception APY"
						value="Inception APY"
						onChange={() => {
							const enabled = showInceptionApy === 'true'
							push({ pathname, query: { ...query, showInceptionApy: !enabled } }, undefined, { shallow: true })
						}}
						checked={query.showInceptionApy === 'true'}
					/>

					<Switch
						label="Borrow APY"
						value="Borrow APY"
						onChange={() => {
							const enabled = showNetBorrowApy === 'true'
							push({ pathname, query: { ...query, showNetBorrowApy: !enabled } }, undefined, { shallow: true })
						}}
						checked={query.showNetBorrowApy === 'true'}
					/>

					<Switch
						label="Borrow Base APY"
						value="Borrow Base APY"
						onChange={() => {
							const enabled = showBorrowBaseApy === 'true'
							push({ pathname, query: { ...query, showBorrowBaseApy: !enabled } }, undefined, { shallow: true })
						}}
						checked={query.showBorrowBaseApy === 'true'}
					/>

					<Switch
						label="Borrow Reward APY"
						value="Borrow Reward APY"
						onChange={() => {
							const enabled = showBorrowRewardApy === 'true'
							push({ pathname, query: { ...query, showBorrowRewardApy: !enabled } }, undefined, { shallow: true })
						}}
						checked={query.showBorrowRewardApy === 'true'}
					/>

					<Switch
						label="Total Supplied"
						value="Total Supplied"
						onChange={() => {
							const enabled = showTotalSupplied === 'true'
							push({ pathname, query: { ...query, showTotalSupplied: !enabled } }, undefined, { shallow: true })
						}}
						checked={query.showTotalSupplied === 'true'}
					/>

					<Switch
						label="Total Borrowed"
						value="Total Borrowed"
						onChange={() => {
							const enabled = showTotalBorrowed === 'true'
							push({ pathname, query: { ...query, showTotalBorrowed: !enabled } }, undefined, { shallow: true })
						}}
						checked={query.showTotalBorrowed === 'true'}
					/>

					<Switch
						label="Available"
						value="Available"
						onChange={() => {
							const enabled = showAvailable === 'true'
							push({ pathname, query: { ...query, showAvailable: !enabled } }, undefined, { shallow: true })
						}}
						checked={query.showAvailable === 'true'}
					/>

					<Switch
						label="LTV"
						value="LTV"
						onChange={() => {
							const enabled = showLTV === 'true'
							push({ pathname, query: { ...query, showLTV: !enabled } }, undefined, { shallow: true })
						}}
						checked={query.showLTV === 'true'}
					/>
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
