import * as React from 'react'
import styled from 'styled-components'
import { Header } from '~/Theme'
import { Panel } from '~/components'
import { OverviewTable } from '~/components/Table'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import { AdaptorsSearch } from '~/components/Search'
import { IJoin2ReturnType, IOverviewProps } from '~/api/categories/adaptors'
import { formatChain } from '~/api/categories/dexs/utils'
import { IJSON } from '~/api/categories/adaptors/types'
import { useFetchCharts } from '~/api/categories/adaptors/client'
import { MainBarChart } from './common'
import { IDexChartsProps } from './OverviewItem'
import { useRouter } from 'next/router'
import { capitalizeFirstLetter } from '~/utils'
import { volumeTypes } from '~/utils/adaptorsPages/utils'

const HeaderWrapper = styled(Header)`
	display: flex;
	justify-content: space-between;
	align-items: center;
	flex-wrap: wrap;
	gap: 12px;
	border: 1px solid transparent;
`

export type IOverviewContainerProps = IOverviewProps

export default function OverviewContainer(props: IOverviewContainerProps) {
	const chain = props.chain ?? 'All'
	const router = useRouter()
	const { dataType: selectedDataType = 'Notional volume' } = router.query
	const [enableBreakdownChart, setEnableBreakdownChart] = React.useState(false)

	const [charts, setCharts] = React.useState<IJSON<IOverviewContainerProps['totalDataChartBreakdown']>>({
		totalDataChartBreakdown: props.totalDataChartBreakdown,
		totalDataChartBreakdown2: undefined
	})

	// Needs to be improved! Too dirty
	const { data, error, loading } = useFetchCharts(props.type, chain === 'All' ? undefined : chain)
	const {
		data: secondTypeData,
		error: secondTypeError,
		loading: secondTypeLoading
	} = useFetchCharts(props.type, chain === 'All' ? undefined : chain, 'dailyPremiumVolume', props.type !== 'options')

	const isChainsPage = chain === 'all'

	React.useEffect(() => {
		if (loading) {
			setEnableBreakdownChart(false)
			setCharts((val) => ({
				...val,
				totalDataChartBreakdown: undefined
			}))
		}
		if (data && !error && !loading)
			setCharts((val) => ({
				...val,
				totalDataChartBreakdown: data?.totalDataChartBreakdown
			}))
	}, [data, loading, error, props.chain])

	// Needs to be improved! Too dirty
	React.useEffect(() => {
		if (secondTypeLoading) {
			setEnableBreakdownChart(false)
			setCharts((val) => ({
				...val,
				['totalDataChartBreakdownPremium volume']: undefined
			}))
		}
		if (secondTypeData && !secondTypeError && !secondTypeLoading)
			setCharts((val) => ({
				...val,
				['totalDataChartBreakdownPremium volume']: secondTypeData?.totalDataChartBreakdown
			}))
	}, [secondTypeData, secondTypeLoading, secondTypeError, props.chain])

	const chartData = React.useMemo<[IJoin2ReturnType, string[]]>(() => {
		if (enableBreakdownChart) {
			const displayNameMap = props.protocols.reduce((acc, curr) => {
				acc[curr.module] = curr.displayName
				return acc
			}, {} as IJSON<string>)
			const arr = Object.values(
				charts[
					`totalDataChartBreakdown${
						!selectedDataType || selectedDataType === 'Notional volume' ? '' : selectedDataType
					}`
				]?.map<IJSON<number | string>>((cd) => {
					return {
						date: cd[0],
						...Object.keys(displayNameMap).reduce((acc, module) => {
							acc[displayNameMap[module]] = cd[1][module] ?? 0
							return acc
						}, {} as IJSON<number>)
					}
				})
			).map<IJoin2ReturnType[number]>((bar) => {
				const date = bar.date
				delete bar.date
				const items = Object.entries(bar as IJSON<number>)
				return {
					date,
					...items.reduce((acc, [key, value]) => {
						return { ...acc, [key]: value }
					}, {} as IJoin2ReturnType[number])
				}
			})
			return [arr, Object.values(displayNameMap)]
		}
		return props.totalDataChart
	}, [enableBreakdownChart, charts.totalDataChartBreakdown, props.totalDataChart, props.protocols, selectedDataType])

	return (
		<>
			<AdaptorsSearch
				type={props.type}
				step={{
					category: chain === 'All' ? 'Home' : capitalizeFirstLetter(props.type),
					name: chain === 'All' ? capitalizeFirstLetter(props.type) : chain === 'all' ? 'Chains' : chain
				}}
				enableToggle={props.type !== 'fees'}
				onToggleClick={
					charts.totalDataChartBreakdown && charts.totalDataChartBreakdown.length > 0
						? (enabled) => setEnableBreakdownChart(enabled)
						: undefined
				}
				toggleStatus={
					enableBreakdownChart && charts.totalDataChartBreakdown && charts.totalDataChartBreakdown.length > 0
				}
			/>

			<TitleByType type={props.type} chain={chain} />

			{getChartByType(props.type, {
				type: props.type,
				data: {
					change_1d: props.change_1d,
					change_1m: props.change_1m,
					change_7dover7d: props.change_7dover7d,
					disabled: false,
					total24h: props.total24h,
					total7d: props.total7d,
					dexsDominance: props.dexsDominance
				},
				chartData: chartData,
				name: props.chain,
				fullChart: isChainsPage,
				disableDefaultLeged: isChainsPage ? true : enableBreakdownChart,
				selectedType: (selectedDataType as string) ?? undefined,
				chartTypes: props.type === 'options' && enableBreakdownChart ? ['Notional volume', 'Premium volume'] : undefined
			})}

			{props.allChains ? (
				<RowLinksWrapper>
					<RowLinksWithDropdown
						links={['All', ...props.allChains].map((chain) => ({
							label: formatChain(chain),
							to: chain === 'All' ? `/${props.type}` : `/${props.type}/chains/${chain.toLowerCase()}`
						}))}
						activeLink={chain}
						alternativeOthersText="More chains"
					/>
				</RowLinksWrapper>
			) : (
				<></>
			)}

			{props.protocols && props.protocols.length > 0 ? (
				<OverviewTable data={props.protocols} type={props.type} allChains={isChainsPage} />
			) : (
				<Panel>
					<p style={{ textAlign: 'center' }}>
						{`Looks like we couldn't find any protocol👀. 🦙🦙🦙 are working on it.`}
					</p>
				</Panel>
			)}
		</>
	)
}

const getChartByType = (type: string, props?: IDexChartsProps) => {
	switch (type) {
		case 'fees':
			return <></>
		default:
			return <MainBarChart {...props} />
	}
}

interface ITitleProps {
	type: string
	chain: string
}
const TitleByType: React.FC<ITitleProps> = (props) => {
	let title = capitalizeFirstLetter(props.type)
	if (volumeTypes.includes(props.type)) title = `${title} volume`
	else if (props.type === 'fees') {
		if (props.chain === 'all') title = 'Ranking by fees'
		else title = 'Ranking by fees and revenue'
	}
	if (props.chain === 'all') {
		title = `${title} by chain`
	} else if (props.chain && props.chain !== 'All') {
		title = `${title} in ${props.chain}`
	}
	return (
		<HeaderWrapper>
			<span>{title}</span>
		</HeaderWrapper>
	)
}
