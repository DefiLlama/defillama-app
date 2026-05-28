import { fetchProtocols } from '~/containers/Protocols/api'
import { fetchRaisesFromNetwork } from '~/containers/Raises/api'
import {
	fetchYieldChainsApi,
	fetchYieldConfigApi,
	fetchYieldLendBorrowApi,
	fetchYieldMedianApi,
	fetchYieldPerpsApi,
	fetchYieldPoolsApi,
	fetchYieldUrlsApi
} from './api'
import type { YieldConfigResponse, YieldFetchOptions, YieldPerpMarket } from './api.types'
import { sumApyParts } from './domain/apyMath'
import { buildRaiseValuations, formatYieldsPageData } from './normalizers/pageData'
import { enrichRewardTokenNames } from './normalizers/rewardTokens'
import { enrichStablecoinPegData } from './normalizers/stablecoinPeg'
import { enrichYieldTokenCategories } from './normalizers/tokenCategories'
import type { YieldPageData } from './types'

export type { YieldConfigResponse } from './api.types'

export async function getYieldPageDataFromNetwork(options: YieldFetchOptions = {}) {
	let [poolsData, configData, urlsData, chainsData, protocolsData, raisesData] = await Promise.all([
		fetchYieldPoolsApi(options),
		fetchYieldConfigApi(options),
		fetchYieldUrlsApi(options),
		fetchYieldChainsApi(options),
		fetchProtocols(),
		fetchRaisesFromNetwork().catch((): { raises: [] } => ({ raises: [] }))
	])

	let data = formatYieldsPageData({ poolsData, configData, urlsData, chainsData, protocolsData })

	// Attach raiseValuation to airdrop pools
	const valuationBySlug = buildRaiseValuations(raisesData?.raises ?? [], configData?.protocols ?? {}, protocolsData)
	const poolsWithRaiseValuation = []
	for (const pool of data.pools) {
		poolsWithRaiseValuation.push({
			...pool,
			underlyingTokens: pool.underlyingTokens ?? [],
			rewardTokens: pool.rewardTokens ?? [],
			raiseValuation: pool.airdrop ? (valuationBySlug.get(pool.project) ?? null) : null
		})
	}
	data.pools = poolsWithRaiseValuation

	data = await enrichRewardTokenNames(data)
	data = await enrichStablecoinPegData(data)
	data = await enrichYieldTokenCategories(data, options)

	return {
		props: data
	}
}

export async function fetchYieldConfigFromNetwork(options: YieldFetchOptions = {}): Promise<YieldConfigResponse> {
	return fetchYieldConfigApi(options)
}

export async function getYieldPageData() {
	return getYieldPageDataFromNetwork()
}

export async function fetchYieldConfig(): Promise<YieldConfigResponse> {
	return fetchYieldConfigFromNetwork()
}

export type { YieldPageData } from './types'

export async function getYieldMedianData() {
	let data = await fetchYieldMedianApi()
	// for the 4th of june we have low nb of datapoints which is skewing the median/
	// hence why we remove it from the plot
	const formattedData = []
	for (const entry of data) {
		if (entry.timestamp === '2022-06-04T00:00:00.000Z') continue
		formattedData.push({ ...entry, timestamp: entry.timestamp.split('T')[0] })
	}
	formattedData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

	// add rolling 7d avg of median values (first 6days == null)
	const windowSize = 7
	let rollingSum = 0
	for (let i = 0; i < formattedData.length; i++) {
		rollingSum += formattedData[i].medianAPY
		if (i >= windowSize) {
			rollingSum -= formattedData[i - windowSize].medianAPY
		}

		if (i + 1 < windowSize) {
			formattedData[i] = { ...formattedData[i], avg7day: null }
		} else {
			formattedData[i] = { ...formattedData[i], avg7day: rollingSum / windowSize }
		}
	}

	return {
		props: formattedData
	}
}

export type YieldsData = YieldPageData

// restrict pool data to lending and cdp
const categoriesToKeepSet = new Set(['Lending', 'Undercollateralized Lending', 'CDP', 'NFT Lending'])
const categoriesToKeepWithoutUndercollateralizedSet = new Set(['Lending', 'CDP', 'NFT Lending'])

export async function getLendBorrowDataFromYieldPageData(
	yieldPageData: YieldPageData,
	options: YieldFetchOptions = {}
) {
	const propsPools = []
	for (const pool of yieldPageData.props.pools) {
		propsPools.push({
			...pool,
			category: pool.project === 'fraxlend' ? 'CDP' : pool.category,
			// on fraxlend apyBase = 0 on collateral, apyBase = optional lending of borrowed frax
			apyBase: pool.project === 'fraxlend' ? null : pool.apyBase
		})
	}
	const props = {
		...yieldPageData.props,
		pools: propsPools
	}
	// treating fraxlend as cdp category otherwise the output
	// from optimizer will be wrong (it would use the crossproduct
	// btw collaterals eg eth -> crv, wbtc -> crv etc. instead of collateral -> frax only)

	const pools = []
	for (const pool of props.pools) {
		if (pool.category && categoriesToKeepSet.has(pool.category)) pools.push(pool)
	}

	// get new borrow fields
	const dataBorrowRaw = await fetchYieldLendBorrowApi(options)

	// for morpho: if totalSupplyUsd < totalBorrowUsd on morpho
	const configIdsCompound = new Set<string>()
	const configIdsAave = new Set<string>()
	for (const p of pools) {
		if (p.project === 'compound') configIdsCompound.add(p.pool)
		if (p.project === 'aave-v2' && p.chain === 'Ethereum' && !p.symbol.toLowerCase().includes('amm'))
			configIdsAave.add(p.pool)
	}

	const tokenSymbols = new Set<string>()
	const cdpPoolSet = new Set<string>()
	for (const p of props.pools) {
		if (p.category === 'CDP') cdpPoolSet.add(p.pool)
	}
	// Build lookup map for O(1) borrow data access
	const dataBorrowByPool = new Map<string, (typeof dataBorrowRaw)[0]>()
	const compoundPoolsByToken = new Map<string, (typeof dataBorrowRaw)[0]>()
	const aavePoolsByToken = new Map<string, (typeof dataBorrowRaw)[0]>()
	for (const item of dataBorrowRaw) {
		if (item.ltv > 1) continue
		dataBorrowByPool.set(item.pool, item)

		const tokenKey = item.underlyingTokens?.[0]?.toLowerCase()
		if (!tokenKey) continue
		if (configIdsCompound.has(item.pool) && !compoundPoolsByToken.has(tokenKey)) {
			compoundPoolsByToken.set(tokenKey, item)
		}
		if (configIdsAave.has(item.pool) && !aavePoolsByToken.has(tokenKey)) {
			aavePoolsByToken.set(tokenKey, item)
		}
	}

	const enrichedPools = []
	for (const p of pools) {
		// O(1) Map lookup instead of O(n) .find()
		const x = dataBorrowByPool.get(p.pool)
		// for some projects we haven't added the new fields yet, dataBorrow will thus be smaller;
		// hence the check for undefined
		if (x === undefined) continue

		tokenSymbols.add(p.symbol)

		// we display apyBaseBorrow as a negative value
		const apyBaseBorrow = x.apyBaseBorrow !== null ? -x.apyBaseBorrow : null
		const apyRewardBorrow = x.apyRewardBorrow
		const apyBorrow = sumApyParts(apyBaseBorrow, apyRewardBorrow)

		// morpho
		// (using compound available liquidity if totalSupplyUsd < totalBorrowUsd on morpho === p2p fully matched
		// otherwise its negative.
		// instead we display the compound available pool liq together with a tooltip to clarify this
		let totalAvailableUsd
		if (p.project === 'morpho-compound') {
			// O(1) Map lookup instead of O(n) .find()
			const compoundData = x.underlyingTokens?.[0]
				? compoundPoolsByToken.get(x.underlyingTokens[0].toLowerCase())
				: undefined
			totalAvailableUsd = compoundData ? (compoundData.totalSupplyUsd ?? 0) - (compoundData.totalBorrowUsd ?? 0) : null
		} else if (p.project === 'morpho-aave') {
			// O(1) Map lookup instead of O(n) .find()
			const aaveData = x.underlyingTokens?.[0] ? aavePoolsByToken.get(x.underlyingTokens[0].toLowerCase()) : undefined
			totalAvailableUsd = aaveData ? (aaveData.totalSupplyUsd ?? 0) - (aaveData.totalBorrowUsd ?? 0) : null
		} else if (p.project === 'morpho-blue') {
			totalAvailableUsd = x.debtCeilingUsd
		} else if (x.totalSupplyUsd === null && x.totalBorrowUsd === null) {
			totalAvailableUsd = null
			// GHO pool on aave-v3
		} else if (cdpPoolSet.has(x.pool) || x.pool === '1e00ac2b-0c3c-4b1f-95be-9378f98d2b40') {
			totalAvailableUsd = x.debtCeilingUsd ? x.debtCeilingUsd - x.totalBorrowUsd : null
		} else if (p.project === 'compound' && x.debtCeilingUsd > 0) {
			totalAvailableUsd =
				x.totalSupplyUsd - x.totalBorrowUsd > x.debtCeilingUsd ? x.debtCeilingUsd : x.totalSupplyUsd - x.totalBorrowUsd
		} else {
			totalAvailableUsd = x.totalSupplyUsd - x.totalBorrowUsd
		}

		const enrichedPool = {
			...p,
			apyBaseBorrow,
			apyRewardBorrow,
			totalSupplyUsd: x.totalSupplyUsd,
			totalBorrowUsd: x.totalBorrowUsd,
			ltv: x.ltv,
			borrowable: x.borrowable,
			mintedCoin: x.mintedCoin,
			borrowFactor: x.borrowFactor,
			// note re morpho: they build on top of compound. if the total supply is being used by borrowers
			// then any excess borrows will be routed via compound pools. so the available liquidity is actually
			// compounds liquidity. not 100% sure how to present this on the frontend, but for now going to suppress
			// liq values (cause some of them are negative)
			totalAvailableUsd,
			apyBorrow,
			rewardTokens:
				((p.apyReward ?? 0) > 0 || (x.apyRewardBorrow ?? 0) > 0) && x.rewardTokens?.length > 0
					? x.rewardTokens
					: p.rewardTokens
		}
		enrichedPools.push(enrichedPool)
	}
	enrichedPools.sort((a, b) => b.totalSupplyUsd - a.totalSupplyUsd)
	const chainList = new Set<string>()
	for (const pool of enrichedPools) {
		chainList.add(pool.chain)
	}

	const projectsList = new Set<string>()
	const lendingProtocols = new Set<string>()
	const farmProtocols = new Set<string>()

	for (const pool of props.pools) {
		projectsList.add(pool.projectName)
		// remove undercollateralised cause we cannot borrow on those
		if (pool.category && categoriesToKeepWithoutUndercollateralizedSet.has(pool.category)) {
			lendingProtocols.add(pool.projectName)
		}
		farmProtocols.add(pool.projectName)

		if (pool.rewardTokensNames) {
			for (const rewardName of pool.rewardTokensNames) {
				projectsList.add(rewardName)
				farmProtocols.add(rewardName)
			}
		}
	}

	return {
		props: {
			pools: enrichedPools,
			chainList: Array.from(chainList),
			projectList: Array.from(projectsList),
			lendingProtocols: Array.from(lendingProtocols),
			farmProtocols: Array.from(farmProtocols),
			categoryList: Array.from(categoriesToKeepSet),
			tokenNameMapping: props.tokenNameMapping,
			allPools: props.pools,
			symbols: [...tokenSymbols],
			evmChains: props.evmChains
		}
	}
}

export async function getLendBorrowDataFromNetwork() {
	return getLendBorrowDataFromYieldPageData(await getYieldPageDataFromNetwork())
}

export async function getLendBorrowData() {
	return getLendBorrowDataFromNetwork()
}

export type { LendBorrowData } from './types'

export async function getPerpData(): Promise<YieldPerpMarket[]> {
	const perps = await fetchYieldPerpsApi()
	const markets: YieldPerpMarket[] = []
	for (const market of perps.data) {
		markets.push({ ...market, symbol: market.baseAsset })
	}
	return markets
}
