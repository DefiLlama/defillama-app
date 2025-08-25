import * as React from 'react'
import { useRouter } from 'next/router'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { tvlOptions } from '~/components/Filters/options'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useGroupChainsByParent } from '~/hooks/data'
import { formatDataWithExtraTvls, groupDataWithTvlsByDay } from '~/hooks/data/defi'
import { useCSVDownload } from '~/hooks/useCSVDownload'
import Layout from '~/layout'
import { preparePieChartData, toNiceCsvDate } from '~/utils'
import { getChainsByCategory } from './queries'
import { ChainsByCategoryTable } from './Table'
import { IChainsByCategoryData } from './types'

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const pageName = ['Chains']

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
	const { downloadCSV, isLoading: isDownloadLoading } = useCSVDownload()

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

	const handleCSVDownload = async () => {
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
		downloadCSV('chains.csv', rows.map((r) => r.join(',')).join('\n'))
	}

	const showByGroup = ['All', 'Non-EVM'].includes(category) ? true : false

	const groupedChains = useGroupChainsByParent(dataByChain, showByGroup ? chainsGroupbyParent : {})

	return (
		<Layout
			title={`${category} Chains DeFi TVL - DefiLlama`}
			includeInMetricsOptions={tvlOptions}
			includeInMetricsOptionslabel="Include in TVL"
			pageName={pageName}
		>
			<RowLinksWithDropdown links={allCategories} activeLink={category} />

			<div className="flex flex-col gap-2 xl:flex-row">
				<div className="relative isolate flex min-h-[408px] flex-1 flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
					<CSVDownloadButton onClick={handleCSVDownload} isLoading={isDownloadLoading} smol className="mr-2 ml-auto" />
					<React.Suspense fallback={<></>}>
						<PieChart chartData={pieChartData} stackColors={colorsByChain} />
					</React.Suspense>
				</div>
				<div className="min-h-[408px] flex-1 rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
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
						className="rounded-md border border-(--cards-border) bg-(--cards-bg)"
					/>
				}
			>
				<ChainsByCategoryTable data={groupedChains} />
			</React.Suspense>
		</Layout>
	)
}
