import {
	ColumnFiltersState,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { countBy, flatten, mapValues, sumBy, uniq } from 'lodash'
import { maxAgeForNext } from '~/api'
import { activeInvestorsColumns } from '~/components/Table/Defi/columns'
import { VirtualTable } from '~/components/Table/Table'
import { RAISES_API } from '~/constants'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

import { fetchWithErrorLogging } from '~/utils/async'
import { RowFilter } from '~/components/Filters/common/RowFilter'
import { SearchWrapper, SearchIcon } from '~/components/Table/shared'
import { Announcement } from '~/components/Announcement'
import styled from 'styled-components'

const columns = ['name', 'medianAmount', 'chains', 'projects', 'deals', 'category', 'roundType']

const periodToNumber = {
	'30d': 30,
	'180d': 180,
	'1 year': 365,
	All: 9999
}

const findMedian = (arr) => {
	arr.sort((a, b) => a - b)
	const middleIndex = Math.floor(arr.length / 2)

	if (arr.length % 2 === 0) {
		return (arr[middleIndex - 1] + arr[middleIndex]) / 2
	} else {
		return arr[middleIndex]
	}
}

const fetch = fetchWithErrorLogging

const getRaisesByPeriod = (data, days) =>
	data.filter((raise) => raise.date && raise.date * 1000 >= Date.now() - days * 24 * 60 * 60 * 1000)

export const getStaticProps = withPerformanceLogging('raises/active-investors', async () => {
	const data = await fetch(RAISES_API).then((r) => r.json())

	return {
		props: {
			data: data?.raises
		},
		revalidate: maxAgeForNext([22])
	}
})

const ActiveInvestors = ({ data }) => {
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'deals' }])

	const [period, setPeriod] = React.useState('All')

	const addOption = (newOptions) => {
		const ops = Object.fromEntries(
			instance.getAllLeafColumns().map((col) => [col.id, newOptions.includes(col.id) ? true : false])
		)

		instance.setColumnVisibility(ops)
	}

	const onPeriodClick = (newPeriod) => {
		if (newPeriod === 'All') {
			setPeriod(newPeriod), addOption(columns)
		} else {
			setPeriod(newPeriod)
		}
	}

	const normalizedData = Object.values(
		mapValues(
			data?.reduce((acc, round) => {
				round?.leadInvestors?.forEach((lead) => {
					acc[lead] = acc[lead] ? acc[lead].concat(round) : [round]
				})
				return acc
			}, {}),
			(raises, name) => {
				const normalizedRaises = getRaisesByPeriod(raises, periodToNumber[period])

				const categories = Object.entries(countBy(raises?.map((raise) => raise?.category).filter(Boolean)))
					.sort((a: [string, number], b: [string, number]) => b[1] - a[1])
					.map((val) => val[0])
				const roundTypes = Object.entries(countBy(raises?.map((raise) => raise?.round).filter(Boolean)))
					.sort((a: [string, number], b: [string, number]) => b[1] - a[1])
					.map((val) => val[0])

				const medianAmount = findMedian(raises.map((r) => r?.amount))?.toFixed(2)

				const totalAmount = sumBy(normalizedRaises, 'amount')
				const averageAmount = totalAmount / normalizedRaises?.length || 0
				if (totalAmount > 0)
					return {
						averageAmount: averageAmount.toFixed(2),
						name,
						medianAmount: medianAmount ?? 0,
						category: categories[0],
						roundType: roundTypes[0],
						deals: normalizedRaises?.length,
						projects: raises.map((raise) => raise.name).join(', '),
						chains: uniq(flatten(raises.map((raise) => raise.chains.map((chain) => chain))))
					}
			}
		)
	).filter(Boolean)

	const [investorName, setInvestorName] = React.useState('')

	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

	const instance = useReactTable({
		data: normalizedData,
		columns: activeInvestorsColumns as any,
		state: {
			columnFilters,
			sorting
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	React.useEffect(() => {
		const projectsColumns = instance.getColumn('name')
		const id = setTimeout(() => {
			projectsColumns.setFilterValue(investorName)
		}, 200)
		return () => clearTimeout(id)
	}, [investorName, instance])

	return (
		<Layout title={`Investors - DefiLlama`} defaultSEO style={{ gap: '16px' }}>
			<Announcement notCancellable>
				<span>Looking for investors?</span>{' '}
				<a href="/pitch" className="text-[var(--blue)] underline font-medium" target="_blank" rel="noopener noreferrer">
					Send your pitch to selected ones through us
				</a>
			</Announcement>

			<TableFilters>
				<h1>Investors</h1>

				<SWrapper>
					<SearchIcon size={16} />

					<input
						value={investorName}
						onChange={(e) => {
							setInvestorName(e.target.value)
						}}
						placeholder="Search investors..."
					/>
				</SWrapper>

				<RowFilter
					setValue={(val) => onPeriodClick(val)}
					values={['All', '30d', '180d', '1 year']}
					selectedValue={period}
				/>
			</TableFilters>
			<VirtualTable instance={instance} />
		</Layout>
	)
}

const SWrapper = styled(SearchWrapper)`
	margin: 0;
	bottom: 0;
`

const TableFilters = styled.div`
	display: flex;
	align-items: center;
	gap: 16px;
	flex-wrap: wrap;

	h1 {
		font-weight: 500;
		font-size: 24px;
	}

	& > *:last-child {
		margin-left: auto;
	}
`

export default ActiveInvestors
