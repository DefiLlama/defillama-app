import { useMemo } from 'react'
import { Menu } from '~/components/Menu'
import { YieldsPoolsTable } from '~/containers/Yields/Tables/Pools'
import { useIsClient } from '~/hooks'
import { DEFAULT_PORTFOLIO_NAME, useWatchlistManager } from '~/contexts/LocalStorage'
import { Switch } from '~/components/Switch'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'

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
		useWatchlistManager('yields')

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

	return (
		<>
			<WatchListTabs />
			<div className="bg-(--cards-bg) border border-(cards-border) rounded-md">
				<h1 className="text-xl font-semibold p-3">Saved Pools</h1>

				<div className="flex items-center flex-wrap gap-4 p-3">
					<h2>Current portfolio:</h2>
					<Menu
						name={selectedPortfolio}
						options={portfolios}
						onItemClick={(value) => setSelectedPortfolio(value)}
						className="flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-[#666] dark:text-[#919296] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium"
					/>
					<button
						onClick={() => {
							const newPortfolio = prompt('Enter a name for the new portfolio')
							if (newPortfolio) {
								addPortfolio(newPortfolio)
							}
						}}
					>
						<Icon name="folder-plus" height={24} width={24} />
					</button>
					{selectedPortfolio !== DEFAULT_PORTFOLIO_NAME && (
						<button onClick={() => removePortfolio(selectedPortfolio)}>
							<Icon name="trash-2" height={24} width={24} />
						</button>
					)}

					<div className="flex items-center flex-wrap gap-4 p-3 ml-auto">
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

				<div className="flex items-center flex-wrap gap-4 p-3">
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
					<p className="p-5 bg-(--cards-bg) rounded-md text-center">You have not saved any pools.</p>
				)}
			</div>
		</>
	)
}

export const WatchListTabs = () => {
	const router = useRouter()
	return (
		<nav className="text-xs font-semibold flex items-center gap-2 border-b-2 border-(--form-control-border) w-full max-w-fit relative">
			<BasicLink
				href={'/watchlist'}
				data-active={router.pathname === '/watchlist'}
				className="shrink-0 py-1 px-[10px] whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) border-b-2 border-transparent data-[active=true]:border-(--old-blue) relative bottom-[-2px] z-10"
			>
				DeFi
			</BasicLink>

			<BasicLink
				href={'/yields/watchlist'}
				data-active={router.pathname === '/yields/watchlist'}
				className="shrink-0 py-1 px-[10px] whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) border-b-2 border-transparent data-[active=true]:border-(--old-blue) relative bottom-[-2px] z-10"
			>
				Yields
			</BasicLink>
		</nav>
	)
}
