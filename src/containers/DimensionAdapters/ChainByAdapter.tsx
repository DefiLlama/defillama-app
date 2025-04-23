import * as React from 'react'
import { OverviewTable } from '~/containers/DimensionAdapters/Table'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { AdaptorsSearch } from '~/components/Search/Adaptors'
import { groupProtocolsByParent, IJoin2ReturnType, IOverviewProps } from '~/api/categories/adaptors'
import { IJSON } from '~/api/categories/adaptors/types'
import { useFetchCharts } from '~/api/categories/adaptors/client'
import { MainBarChart } from './common'
import { useRouter } from 'next/router'
import { slug } from '~/utils'
import { Announcement } from '~/components/Announcement'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'

export type IOverviewContainerProps = IOverviewProps

export function ChainByAdapter(props: IOverviewContainerProps) {
	const chain = props.chain ?? 'All'
	const isSimpleFees = props.isSimpleFees
	const router = useRouter()

	const { dataType: selectedDataType = 'Premium Volume' } = router.query
	const [enableBreakdownChart, setEnableBreakdownChart] = React.useState(false)
	const [enabledSettings] = useLocalStorageSettingsManager('fees')

	const { selectedCategories, protocolsList, rowLinks } = React.useMemo(() => {
		const selectedCategories = router.query.category
			? typeof router.query.category === 'string'
				? [router.query.category]
				: router.query.category
			: []

		const categoriesToFilter = selectedCategories.filter((c) => c.toLowerCase() !== 'all' && c.toLowerCase() !== 'none')

		const protocolsList = groupProtocolsByParent({
			protocols:
				categoriesToFilter.length > 0
					? props.protocols.filter((p) => (p.category ? selectedCategories.includes(p.category) : false))
					: props.protocols,
			parentProtocols: props.parentProtocols ?? [],
			type: props.type,
			enabledSettings,
			total24h: props.total24h
		})

		const rowLinks =
			props.allChains && props.allChains.length > 0
				? ['All', ...props.allChains].map((chain) => ({
						label: chain,
						to:
							chain === 'All'
								? `/${props.type}/${isSimpleFees ? 'simple' : ''}`
								: `/${props.type}${isSimpleFees ? '/simple' : ''}/chains/${slug(chain)}`
				  }))
				: null

		return { selectedCategories, protocolsList, rowLinks }
	}, [
		router.query.category,
		props.protocols,
		props.allChains,
		props.type,
		props.parentProtocols,
		isSimpleFees,
		enabledSettings,
		props.total24h
	])

	const [charts, setCharts] = React.useState<IJSON<IOverviewContainerProps['totalDataChartBreakdown']>>({
		totalDataChartBreakdown: props.totalDataChartBreakdown,
		totalDataChartBreakdown2: undefined
	})

	// Needs to be improved! Too dirty
	const { data, error, isLoading } = useFetchCharts(
		props.type,
		chain === 'all' ? undefined : chain,
		undefined,
		props.type === 'options' ? false : props.type === 'fees' || chain === 'all'
	)
	const {
		data: secondTypeData,
		error: secondTypeError,
		isLoading: secondTypeLoading
	} = useFetchCharts(
		props.type,
		chain === 'all' ? undefined : chain,
		'dailyPremiumVolume',
		props.type !== 'options' || chain === 'all'
	)
	const isChainsPage = chain === 'all'

	React.useEffect(() => {
		if (isLoading) {
			setEnableBreakdownChart(false)
			setCharts((val) => ({
				...val,
				totalDataChartBreakdown: undefined
			}))
		}
		if (data && !error && !isLoading) {
			// @ts-ignore
			setCharts((val) => ({
				...val,
				totalDataChartBreakdown: data?.totalDataChartBreakdown ?? ''
			}))
		}
	}, [data, isLoading, error, props.chain])

	// Needs to be improved! Too dirty
	React.useEffect(() => {
		if (secondTypeLoading) {
			setEnableBreakdownChart(false)
			setCharts((val) => ({
				...val,
				['totalDataChartBreakdownPremium Volume']: undefined
			}))
		}
		if (secondTypeData && !secondTypeError && !secondTypeLoading) {
			// @ts-ignore
			setCharts((val) => ({
				...val,
				['totalDataChartBreakdownPremium Volume']: secondTypeData?.totalDataChartBreakdown
			}))
		}
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

	const chartDataProps = React.useMemo(() => {
		const p = {
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
		}

		return p
	}, [props, chartData, isChainsPage, enableBreakdownChart, selectedDataType])

	return (
		<>
			{props.type === 'fees' && (
				<Announcement notCancellable>
					<span>Are we missing any protocol?</span>{' '}
					<a
						href="https://airtable.com/shrtBA9lvj6E036Qx"
						className="text-[var(--blue)] underline font-medium"
						target="_blank"
						rel="noopener noreferrer"
					>
						Request it here!
					</a>
				</Announcement>
			)}
			<AdaptorsSearch
				type={props.type}
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

			{rowLinks ? (
				<RowLinksWithDropdown links={rowLinks} activeLink={chain} key={'row links wrapper of ' + props.type} />
			) : (
				<></>
			)}

			{props.type === 'fees' ? null : <MainBarChart {...chartDataProps} />}

			{protocolsList && protocolsList.length > 0 ? (
				<OverviewTable
					isSimpleFees={props.isSimpleFees}
					data={protocolsList}
					type={props.type}
					allChains={isChainsPage}
					categories={props.categories}
					selectedCategories={selectedCategories}
				/>
			) : (
				<p className="p-5 bg-[var(--cards-bg)] rounded-md text-center">
					{`Looks like we couldn't find any protocol👀. 🦙🦙🦙 are working on it.`}
				</p>
			)}
		</>
	)
}
