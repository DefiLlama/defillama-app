import * as React from 'react'
import Layout from '~/layout'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { toNiceCsvDate, download, preparePieChartData } from '~/utils'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { formatDataWithExtraTvls, groupDataWithTvlsByDay } from '~/hooks/data/defi'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useGroupChainsByParent } from '~/hooks/data'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { useRouter } from 'next/router'
import { getChainsByCategory } from './queries'
import { IChainsByCategoryData } from './types'
import { ChainsByCategoryTable } from './Table'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { Metrics } from '~/components/Metrics'

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

export function ChainsByCategory({
	chainAssets,
	chains,
	chainsGroupbyParent,
	chainsUnique,
	colorsByChain,
	allCategories,
	category,
	stackedDataset,
	tvlTypes
}: IChainsByCategoryData) {
	const { query } = useRouter()
	const { minTvl, maxTvl } = query
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')

	const { dataByChain, pieChartData, chainsWithExtraTvlsAndDominanceByDay, chainsUniqueFiltered } =
		React.useMemo(() => {
			// add extra tvls like staking pool2 based on toggles selected
			const dataByChain = formatDataWithExtraTvls({
				data: chains,
				applyLqAndDc: true,
				extraTvlsEnabled,
				chainAssets
			}).filter(
				(chain) =>
					(typeof minTvl === 'string' && minTvl !== '' ? chain.tvl >= +minTvl : true) &&
					(typeof maxTvl === 'string' && maxTvl !== '' ? chain.tvl <= +maxTvl : true)
			)

			const pieChartData = preparePieChartData({
				data: dataByChain,
				sliceIdentifier: 'name',
				sliceValue: 'tvl',
				limit: 10
			})

			const { chainsWithExtraTvlsByDay, chainsWithExtraTvlsAndDominanceByDay } = groupDataWithTvlsByDay({
				chains: stackedDataset,
				tvlTypes,
				extraTvlsEnabled
			})

			return {
				dataByChain,
				pieChartData,
				chainsWithExtraTvlsByDay,
				chainsWithExtraTvlsAndDominanceByDay,
				chainsUniqueFiltered: chainsUnique.filter((chain) => (dataByChain.find((c) => c.name === chain) ? true : false))
			}
		}, [chains, chainAssets, extraTvlsEnabled, stackedDataset, tvlTypes, minTvl, maxTvl, chainsUnique])

	const downloadCsv = async () => {
		window.alert('Data download might take up to 1 minute, click OK to proceed')
		const rows = [['Timestamp', 'Date', ...chainsUniqueFiltered]]
		const { stackedDataset } = await getChainsByCategory({ category: 'All' })
		const { chainsWithExtraTvlsByDay } = groupDataWithTvlsByDay({
			chains: stackedDataset,
			tvlTypes,
			extraTvlsEnabled
		})

		chainsWithExtraTvlsByDay
			.sort((a, b) => a.date - b.date)
			.forEach((day) => {
				rows.push([day.date, toNiceCsvDate(day.date), ...chainsUniqueFiltered.map((chain) => day[chain] ?? '')])
			})
		download('chains.csv', rows.map((r) => r.join(',')).join('\n'))
	}

	const showByGroup = ['All', 'Non-EVM'].includes(category) ? true : false

	const groupedChains = useGroupChainsByParent(dataByChain, showByGroup ? chainsGroupbyParent : {})

	return (
		<Layout title={`${category} Chains DeFi TVL - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch />

			<Metrics currentMetric="TVL" isChains={true} />

			<RowLinksWithDropdown links={allCategories} activeLink={category} />

			<div className="flex flex-col gap-2 xl:flex-row">
				<div className="isolate relative rounded-md bg-(--cards-bg) flex-1 min-h-[406px] flex flex-col pt-2">
					<CSVDownloadButton
						onClick={downloadCsv}
						smol
						className="ml-auto mx-2 z-10 h-[30px] bg-transparent! border border-(--form-control-border) text-[#666]! dark:text-[#919296]! hover:bg-(--link-hover-bg)! focus-visible:bg-(--link-hover-bg)!"
					/>
					<React.Suspense fallback={<></>}>
						<PieChart chartData={pieChartData} stackColors={colorsByChain} />
					</React.Suspense>
				</div>
				<div className="rounded-md bg-(--cards-bg) flex-1 min-h-[406px] pt-2">
					<React.Suspense fallback={<></>}>
						<AreaChart
							chartData={chainsWithExtraTvlsAndDominanceByDay}
							stacks={chainsUniqueFiltered}
							stackColors={colorsByChain}
							hideDefaultLegend
							valueSymbol="%"
							title=""
							expandTo100Percent={true}
						/>
					</React.Suspense>
				</div>
			</div>

			<React.Suspense
				fallback={
					<div
						style={{ minHeight: `${groupedChains.length * 50 + 200}px` }}
						className="bg-(--cards-bg) border border-(--cards-border) rounded-md"
					/>
				}
			>
				<ChainsByCategoryTable data={groupedChains} />
			</React.Suspense>
		</Layout>
	)
}
