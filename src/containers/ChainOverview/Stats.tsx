import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { Bookmark } from '~/components/Bookmark'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { chainCoingeckoIdsForGasNotMcap } from '~/constants/chainTokens'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { TVL_SETTINGS_KEYS, useDarkModeManager, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { chainIconUrl, formattedNum } from '~/utils'
import { downloadCSV } from '~/utils/download'
import { ChainChartPanel } from './ChainChartPanel'
import { BAR_CHARTS, type ChainChartLabels, chainCharts } from './constants'
import { KeyMetrics } from './KeyMetrics'
import type { IChainOverviewData } from './types'
import { useFetchChainChartData } from './useFetchChainChartData'

const INTERVALS_LIST = ['daily', 'weekly', 'monthly', 'cumulative'] as const

interface IStatsProps extends IChainOverviewData {
	hideChart?: boolean
}

export function Stats(props: IStatsProps) {
	const router = useRouter()

	const searchParams = useMemo(() => {
		const queryString = router.asPath.split('?')[1]?.split('#')[0] ?? ''
		return new URLSearchParams(queryString)
	}, [router.asPath])

	const [darkMode] = useDarkModeManager()

	const [tvlSettings] = useLocalStorageSettingsManager('tvl')

	const { isAuthenticated } = useAuthContext()

	const { toggledCharts, DENOMINATIONS, chainGeckoId, hasAtleasOneBarChart, groupBy, denomination } = useMemo(() => {
		let CHAIN_SYMBOL = props.chainTokenInfo?.token_symbol ?? null
		let chainGeckoId = props.chainTokenInfo?.gecko_id ?? null

		if (props.metadata.name !== 'All') {
			if (!chainGeckoId) {
				chainGeckoId = chainCoingeckoIdsForGasNotMcap[props.metadata.name]?.geckoId ?? null
			}

			if (!CHAIN_SYMBOL) {
				CHAIN_SYMBOL = chainCoingeckoIdsForGasNotMcap[props.metadata.name]?.symbol ?? null
			}
		}

		const DENOMINATIONS = CHAIN_SYMBOL ? ['USD', CHAIN_SYMBOL] : ['USD']

		const toggledCharts = props.charts.filter((tchart, index) =>
			index === 0 ? searchParams.get(chainCharts[tchart]) !== 'false' : searchParams.get(chainCharts[tchart]) === 'true'
		) as ChainChartLabels[]

		const hasAtleasOneBarChart = toggledCharts.some((chart) => BAR_CHARTS.includes(chart))

		const groupBy =
			hasAtleasOneBarChart && searchParams.get('groupBy')
				? INTERVALS_LIST.includes(searchParams.get('groupBy') as any)
					? (searchParams.get('groupBy') as any)
					: 'daily'
				: 'daily'

		const currencyInSearchParams = searchParams.get('currency')?.toLowerCase()

		return {
			DENOMINATIONS,
			chainGeckoId,
			hasAtleasOneBarChart,
			toggledCharts,
			groupBy,
			denomination: DENOMINATIONS.find((d) => d.toLowerCase() === currencyInSearchParams) ?? 'USD'
		}
	}, [searchParams, props.chainTokenInfo, props.metadata.name, props.charts])

	const { totalValueUSD, change24h, valueChange24hUSD, finalCharts, valueSymbol, isFetchingChartData } =
		useFetchChainChartData({
			denomination,
			selectedChain: props.metadata.name,
			tvlChart: props.tvlChart,
			tvlChartSummary: props.tvlChartSummary,
			extraTvlCharts: props.extraTvlCharts,
			tvlSettings,
			chainGeckoId,
			toggledCharts,
			groupBy
		})

	const { mutate: downloadAndPrepareChartCsv, isPending: isDownloadingChartCsv } = useMutation({
		mutationFn: async () => {
			if (!isAuthenticated) {
				toast.error('Please sign in to download CSV data')
				return
			}

			const enabledParams = TVL_SETTINGS_KEYS.flatMap((key) => (tvlSettings[key] ? [`${key}=true`] : []))
			const chainDatasetName = chainsNamesMap[props.metadata.name] || props.metadata.id || props.metadata.name
			const url = `https://api.llama.fi/simpleChainDataset/${chainDatasetName}?${enabledParams.join('&')}`.replaceAll(
				' ',
				'%20'
			)

			try {
				const response = await fetch(url)

				if (!response.ok) {
					toast.error('Failed to download CSV data')
					return
				}

				const csvData = await response.text()

				downloadCSV(`${props.metadata.name}.csv`, csvData)
			} catch (error) {
				console.log('CSV download error:', error)
				toast.error('Failed to download CSV data')
			}
		}
	})
	const handleDownloadChartCsv = () => downloadAndPrepareChartCsv()

	return (
		<div className="relative isolate grid h-full grid-cols-2 gap-2 xl:grid-cols-3">
			<div
				className={`col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 ${
					props.hideChart ? 'xl:col-span-full' : 'xl:col-span-1'
				}`}
			>
				{props.metadata.name !== 'All' && (
					<h1 className="flex flex-nowrap items-center gap-2 *:last:ml-auto">
						<TokenLogo logo={chainIconUrl(props.metadata.name)} size={24} />
						<span className="text-xl font-semibold">{props.metadata.name}</span>
						<Bookmark readableName={props.metadata.name} isChain />
					</h1>
				)}
				{props.protocols.length > 0 ? (
					<div className="flex flex-nowrap items-end justify-between gap-8">
						<h2 className="flex flex-col">
							<Tooltip
								content={
									props.metadata.name === 'All'
										? 'Sum of value of all coins held in smart contracts of all the protocols on all chains'
										: 'Sum of value of all coins held in smart contracts of all the protocols on the chain'
								}
								className="inline text-(--text-label) underline decoration-dotted"
							>
								Total Value Locked in DeFi
							</Tooltip>
							<span className="min-h-8 overflow-hidden font-jetbrains text-2xl font-semibold text-ellipsis whitespace-nowrap">
								{formattedNum(totalValueUSD, true)}
							</span>
						</h2>
						{change24h != null && valueChange24hUSD != null ? (
							<Tooltip
								content={`${formattedNum(valueChange24hUSD, true)}`}
								render={<p />}
								className="relative bottom-0.5 flex flex-nowrap items-center gap-2"
							>
								<span
									className={`overflow-hidden font-jetbrains text-ellipsis whitespace-nowrap underline decoration-dotted ${
										change24h >= 0 ? 'text-(--success)' : 'text-(--error)'
									}`}
								>
									{`${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%`}
								</span>
								<span className="text-(--text-label)">24h</span>
							</Tooltip>
						) : null}
					</div>
				) : null}
				<KeyMetrics
					metadata={props.metadata}
					stablecoins={props.stablecoins}
					chainStablecoins={props.chainStablecoins}
					chainFees={props.chainFees}
					chainRevenue={props.chainRevenue}
					chainIncentives={props.chainIncentives}
					appRevenue={props.appRevenue}
					appFees={props.appFees}
					dexs={props.dexs}
					perps={props.perps}
					inflows={props.inflows}
					users={props.users}
					treasury={props.treasury}
					chainRaises={props.chainRaises}
					chainAssets={props.chainAssets}
					nfts={props.nfts}
					chainTokenInfo={props.chainTokenInfo}
					protocols={props.protocols}
					totalValueUSD={totalValueUSD}
					tvlSettingsGovtokens={!!tvlSettings.govtokens}
				/>
				<CSVDownloadButton
					onClick={handleDownloadChartCsv}
					isLoading={isDownloadingChartCsv}
					smol
					className="ml-auto"
				/>
			</div>
			{!props.hideChart ? (
				<ChainChartPanel
					charts={props.charts}
					chainTokenInfo={props.chainTokenInfo}
					metadata={props.metadata}
					chain={props.chain}
					toggledCharts={toggledCharts}
					denominations={DENOMINATIONS}
					denomination={denomination}
					hasBarChart={hasAtleasOneBarChart}
					groupBy={groupBy}
					chainGeckoId={chainGeckoId}
					finalCharts={finalCharts}
					valueSymbol={valueSymbol}
					isFetchingChartData={isFetchingChartData}
					darkMode={darkMode}
				/>
			) : null}
		</div>
	)
}

const chainsNamesMap = {
	'OP Mainnet': 'optimism',
	Gnosis: 'xdai',
	Avalanche: 'avax',
	'Arbitrum Nova': 'arbitrum_nova',
	'ZKsync Era': 'era',
	'ZKsync Lite': 'zksync',
	'Hyperliquid L1': 'hyperliquid',
	'EOS EVM': 'eos_evm',
	Rootstock: 'rsk',
	Kaia: 'klaytn',
	CosmosHub: 'cosmos'
}
