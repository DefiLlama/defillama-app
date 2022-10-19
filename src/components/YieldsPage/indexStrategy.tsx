import * as React from 'react'
import { useRouter } from 'next/router'
import { Panel } from '~/components'
import { TableFilters, TableHeader } from '~/components/Table/shared'
import YieldsSearch from '~/components/Search/Yields/Optimizer'
import { filterPool, findOptimizerPools, formatOptimizerPool } from './utils'
import styled from 'styled-components'
import YieldsStrategyTable from '../Table/Yields/Strategy'
import { Header } from '~/Theme'
import { useFormatYieldQueryParams } from './hooks'
import { YieldAttributes, FiltersByChain } from '../Filters'
import { attributeOptions } from '~/components/Filters'

const SearchWrapper = styled.div`
	display: grid;
	grid-template-columns: 1fr 1fr;
	grid-gap: 8px;
	width: 100%;
	margin-top: 8px;
	& > div {
		width: 100%;
		gap: 8px;
	}
`

const YieldsStrategyPage = ({ pools, projectList, chainList, categoryList, allPools }) => {
	// lend & borrow from query are uppercase only. symbols in pools are mixed case though -> without
	// setting to uppercase, we only show subset of available pools when applying `findOptimzerPools`
	pools = pools.map((p) => ({ ...p, symbol: p.symbol.toUpperCase() }))
	const { query, pathname } = useRouter()

	const { lend, borrow } = query
	const { selectedChains, selectedAttributes } = useFormatYieldQueryParams({
		projectList,
		chainList,
		categoryList
	})

	// for now, I'm keeping the search space smoller by only keeping single exposure token + noIL
	allPools = allPools.filter((p) => p.ilRisk === 'no' && p.exposure === 'single')

	const poolsData = React.useMemo(() => {
		let filteredPools = findOptimizerPools(pools, lend, borrow)
			.filter((pool) => filterPool({ pool, selectedChains }))
			.map(formatOptimizerPool)

		// add farm strategy
		const farmPools = allPools.filter((x) =>
			borrow === 'USD_Stables'
				? x.stablecoin
				: x.symbol
						.replace(/ *\([^)]*\) */g, '') // remove poolMeta in () prior filtering against this
						.toUpperCase()
						.includes(borrow)
		)
		// cross product
		let finalPools = []
		for (const p of filteredPools) {
			for (const i of farmPools) {
				// only same chain strategies for now
				if (p.chain !== i.chain) continue

				finalPools.push({
					...p,
					farmSymbol: i.symbol,
					farmChain: [i.chain],
					farmProjectName: i.projectName,
					farmProject: i.project,
					farmTvlUsd: i.tvlUsd,
					farmApy: i.apy,
					farmApyBase: i.apyBase,
					farmApyReward: i.apyReward
				})
			}
		}
		// calc the total strategy apy
		finalPools = finalPools.map((p) => {
			// apy = apyBase + apyReward on the collateral side
			// apyBorrow = apyBaseBorrow + apyRewardBorrow on the borrow side
			// farmApy = apyBase + apyReward on the farm side
			const totalApy = p.apy + p.borrow.apyBorrow * p.ltv + p.farmApy * p.ltv

			return {
				...p,
				totalApy,
				delta: totalApy - p.apy
			}
		})

		// keep pools with :
		// - profitable strategy only,
		// - require at least 1% delta compared to baseline (we could even increase this, otherwise we show lots of
		// strategies which are not really worth the effort)
		finalPools = finalPools
			.filter((p) => Number.isFinite(p.delta) && p.delta > 1 && p.apy > 0.01)
			.sort((a, b) => b.totalApy - a.totalApy)

		if (selectedAttributes.length > 0) {
			for (const attribute of selectedAttributes) {
				const attributeOption = attributeOptions.find((o) => o.key === attribute)
				finalPools = finalPools.filter((p) => attributeOption.filterFn(p))
			}
		}
		return finalPools
	}, [pools, borrow, lend, selectedChains, selectedAttributes, allPools])

	return (
		<>
			<Header>
				Strategy Finder{' '}
				{lend && borrow ? (
					<>
						(Supply: {lend || ''} ➞ Borrow: {borrow || ''})
					</>
				) : null}
			</Header>
			<SearchWrapper>
				<YieldsSearch pathname={pathname} lend />
				<YieldsSearch pathname={pathname} />
			</SearchWrapper>

			<TableFilters>
				<TableHeader>Strategies</TableHeader>
				<FiltersByChain chainList={chainList} selectedChains={selectedChains} pathname={pathname} />
				<YieldAttributes pathname={pathname} />
			</TableFilters>

			{poolsData.length > 0 ? (
				<YieldsStrategyTable data={poolsData} />
			) : (
				<Panel as="p" style={{ margin: 0, textAlign: 'center' }}>
					Given a token to use for collateral and a token to borrow, this finder will display "lend-borrow-farm"
					strategies across all our tracked pools.
					<br />
					It calculates the total Strategy APY taking into account the individual apy components at each step.
					<br />
					<br />
					To start just select two tokens above.
				</Panel>
			)}
		</>
	)
}

export default YieldsStrategyPage
