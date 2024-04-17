import * as React from 'react'
import styled from 'styled-components'
import { Header } from '~/Theme'
import { Panel } from '~/components'
import { OverviewTable } from '~/components/Table'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import { AdaptorsSearch } from '~/components/Search'
import { IJoin2ReturnType, IOverviewProps } from '~/api/categories/adaptors'
import { IJSON } from '~/api/categories/adaptors/types'
import { useFetchCharts } from '~/api/categories/adaptors/client'
import { MainBarChart } from './common'
import type { IDexChartsProps } from './types'
import { useRouter } from 'next/router'
import { capitalizeFirstLetter, download } from '~/utils'
import { volumeTypes } from '~/utils/adaptorsPages/utils'
import { AnnouncementWrapper } from '~/components/Announcement'
import { useFeesManager } from '~/contexts/LocalStorage'
import { ButtonDark } from '~/components/ButtonStyled'

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
	const isSimpleFees = props.isSimpleFees
	const router = useRouter()

	const { dataType: selectedDataType = 'Premium Volume' } = router.query
	const [enableBreakdownChart, setEnableBreakdownChart] = React.useState(false)
	const [enabledSettings] = useFeesManager()

	const { selectedCategories, protocolsList, rowLinks } = React.useMemo(() => {
		const selectedCategories = router.query.category
			? typeof router.query.category === 'string'
				? [router.query.category]
				: router.query.category
			: []

		const categoriesToFilter = selectedCategories.filter((c) => c.toLowerCase() !== 'all' && c.toLowerCase() !== 'none')

		const protocolsList =
			categoriesToFilter.length > 0
				? props.protocols
						.filter((p) => {
							const parentFilter = p?.subRows?.some((r) => selectedCategories.includes(r.category))
							const toFilter = parentFilter
								? parentFilter
								: p.category
								? selectedCategories.includes(p.category)
								: false
							return toFilter
						})
						.map((p) => {
							if (p?.subRows?.length > 0) {
								p.subRows = p.subRows.filter((r) => selectedCategories.includes(r.category))
							}

							return p
						})
				: props.protocols

		const rowLinks =
			props.allChains && props.allChains.length > 0
				? ['All', ...props.allChains].map((chain) => ({
						label: chain,
						to:
							chain === 'All'
								? `/${props.type}/${isSimpleFees ? 'simple' : ''}`
								: `/${props.type}${isSimpleFees ? '/simple' : ''}/chains/${chain.toLowerCase()}`
				  }))
				: null

		return { selectedCategories, protocolsList, rowLinks }
	}, [router.query.category, props.protocols, props.allChains, props.type, isSimpleFees])

	const finalProtocolsList = React.useMemo(() => {
		if (props.type === 'fees') {
			return protocolsList.map((protocol) => {
				let revenue24h = protocol.revenue24h
				let revenue7d = protocol.revenue7d
				let revenue30d = protocol.revenue30d

				let dailyHoldersRevenue = protocol.dailyHoldersRevenue

				if (revenue24h && !Number.isNaN(Number(revenue24h))) {
					revenue24h =
						+revenue24h +
						(enabledSettings.bribes ? protocol.dailyBribesRevenue ?? 0 : 0) +
						(enabledSettings.tokentax ? protocol.dailyTokenTaxes ?? 0 : 0)
					revenue7d = +revenue7d + (enabledSettings.bribes ? protocol.bribes7d ?? 0 : 0)
					revenue30d = +revenue30d + (enabledSettings.bribes ? protocol.bribes30d ?? 0 : 0)
				}
				if (dailyHoldersRevenue && !Number.isNaN(Number(dailyHoldersRevenue))) {
					dailyHoldersRevenue = +dailyHoldersRevenue + (enabledSettings.bribes ? protocol.dailyBribesRevenue ?? 0 : 0)
				}

				return { ...protocol, revenue24h, revenue30d, revenue7d, dailyHoldersRevenue }
			})
		}

		return protocolsList
	}, [protocolsList, enabledSettings, props.type])

	const [charts, setCharts] = React.useState<IJSON<IOverviewContainerProps['totalDataChartBreakdown']>>({
		totalDataChartBreakdown: props.totalDataChartBreakdown,
		totalDataChartBreakdown2: undefined
	})

	// Needs to be improved! Too dirty
	const { data, error, loading } = useFetchCharts(
		props.type,
		chain === 'all' ? undefined : chain,
		undefined,
		props.type === 'options' ? false : props.type === 'fees' || chain === 'all'
	)
	const {
		data: secondTypeData,
		error: secondTypeError,
		loading: secondTypeLoading
	} = useFetchCharts(
		props.type,
		chain === 'all' ? undefined : chain,
		'dailyPremiumVolume',
		props.type !== 'options' || chain === 'all'
	)
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
				['totalDataChartBreakdownPremium Volume']: undefined
			}))
		}
		if (secondTypeData && !secondTypeError && !secondTypeLoading)
			setCharts((val) => ({
				...val,
				['totalDataChartBreakdownPremium Volume']: secondTypeData?.totalDataChartBreakdown
			}))
	}, [secondTypeData, secondTypeLoading, secondTypeError, props.chain])

	const chartData = React.useMemo<[IJoin2ReturnType, string[]]>(() => {
		// TODO: process this in the backend
		if (enableBreakdownChart) {
			const displayNameMap = props.protocols.reduce((acc, curr) => {
				if (curr.subRows) curr.subRows.forEach((row) => (acc[row.displayName] = row.displayName))
				else acc[curr.displayName] = curr.displayName
				return acc
			}, {} as IJSON<string>)
			const arr = Object.values(
				charts[
					`totalDataChartBreakdown${
						props.type === 'options' ? (selectedDataType === 'Notional Volume' ? '' : 'Premium Volume') : ''
					}`
				]?.map<IJSON<number | string>>((cd) => {
					return {
						date: cd[0],
						...Object.keys(displayNameMap).reduce((acc, key) => {
							acc[key] = cd[1][key] ?? 0
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

		if (props.type === 'options' && chain !== 'all') {
			const [chart] = props.totalDataChart
			const arr = chart.map<IJoin2ReturnType[number]>((cd) => {
				return {
					date: cd.date,
					[selectedDataType as string]: cd[selectedDataType as string]
				}
			})
			return [arr, [selectedDataType as string]]
		}
		if (props.type === 'options' && chain === 'all') {
			const chart = selectedDataType === 'Notional Volume' ? props.totalDataChart : props.premium.totalDataChart

			return chart
		}
		return props.totalDataChart
	}, [
		enableBreakdownChart,
		props.type,
		props.totalDataChart,
		props.protocols,
		props?.premium?.totalDataChart,
		chain,
		charts,
		selectedDataType
	])

	const downloadCsv = React.useCallback(() => {
		const columnsToPick = ['date', ...chartData[1]]

		const data = chartData[0].map((p) => {
			const row = []
			columnsToPick.forEach((r) => {
				row.push(p[r])
			})
			return row
		})

		const header = columnsToPick.join(',')
		const rowsData = data.map((d) => d.join(',')).join('\n')

		download('protocols.csv', header + '\n' + rowsData)
	}, [chartData])

	return (
		<>
			{props.type === 'fees' && (
				<AnnouncementWrapper>
					<span>Are we missing any protocol?</span>{' '}
					<a
						href="https://airtable.com/shrtBA9lvj6E036Qx"
						style={{ color: '#2f80ed' }}
						target="_blank"
						rel="noopener noreferrer"
					>
						Request it here!
					</a>
				</AnnouncementWrapper>
			)}
			<AdaptorsSearch
				type={props.type}
				step={{
					category: chain === 'All' ? 'Home' : capitalizeFirstLetter(props.type),
					name: chain === 'All' ? capitalizeFirstLetter(props.type) : chain === 'all' ? 'Chains' : chain
				}}
				enableToggle={props.type !== 'fees' && props.chain !== 'all'}
				onToggleClick={
					charts.totalDataChartBreakdown && charts.totalDataChartBreakdown.length > 0
						? (enabled) => setEnableBreakdownChart(enabled)
						: undefined
				}
				toggleStatus={
					enableBreakdownChart && charts.totalDataChartBreakdown && charts.totalDataChartBreakdown.length > 0
				}
			/>

			<StyledHeaderWrapper>
				<div>
					<TitleByType type={props.type} chain={chain} />
					{props.chain === 'all' && props.type === 'dexs' ? (
						<ButtonDark onClick={downloadCsv} style={{ marginLeft: '16px' }}>
							Download CSV
						</ButtonDark>
					) : null}
				</div>
				<p style={{ fontSize: '.60em', textAlign: 'end' }}>Updated daily at 00:00UTC</p>
			</StyledHeaderWrapper>
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
				chartTypes: props.type === 'options' ? ['Premium Volume', 'Notional Volume'] : undefined
			})}
			{rowLinks ? (
				<RowLinksWrapper>
					<RowLinksWithDropdown
						links={rowLinks}
						activeLink={chain}
						alternativeOthersText="More chains"
						key={'row links wrapper of ' + props.type}
					/>
				</RowLinksWrapper>
			) : (
				<></>
			)}

			{protocolsList && protocolsList.length > 0 ? (
				<OverviewTable
					isSimpleFees={props.isSimpleFees}
					data={finalProtocolsList}
					type={props.type}
					allChains={isChainsPage}
					categories={props.categories}
					selectedCategories={selectedCategories}
				/>
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
	if (volumeTypes.includes(props.type)) {
		title = `${title === 'Derivatives-aggregator' ? 'Derivatives Aggregator' : title} volume`
	} else if (props.type === 'fees') {
		if (props.chain === 'all') title = 'Ranking by fees'
		else title = 'Ranking by fees and revenue'
	}
	if (props.chain === 'all') {
		title = `${title} by chain`
	} else if (props.chain && props.chain !== 'All') {
		title = `${title} in ${props.chain}`
	}
	return <span>{title}</span>
}

const StyledHeaderWrapper = styled(HeaderWrapper)`
	* {
		flex-grow: 1;
	}
`
