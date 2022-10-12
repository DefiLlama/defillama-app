import * as React from 'react'
import Layout from '~/layout'
import { useReactTable, SortingState, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table'
import VirtualTable from '~/components/Table/Table'
import { raisesColumns } from '~/components/Table/Defi/columns'
import { AnnouncementWrapper } from '~/components/Announcement'
import { RaisesSearch } from '~/components/Search'
import { Dropdowns, TableFilters, TableHeader } from '~/components/Table/shared'
import { Investors } from '~/components/Filters'
import { useRouter } from 'next/router'

function RaisesTable({ raises }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'date' }])
	const instance = useReactTable({
		data: raises,
		columns: raisesColumns,
		state: {
			sorting
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return <VirtualTable instance={instance} />
}

const RaisesContainer = ({ raises, investors, investorName }) => {
	const { pathname, query } = useRouter()

	const { investor } = query

	const { filteredRaisesList, selectedInvestors } = React.useMemo(() => {
		let selectedInvestors = []

		if (investor) {
			if (typeof investor === 'string') {
				selectedInvestors = investor === 'All' ? [...investors] : investor === 'None' ? [] : [investor]
			} else {
				selectedInvestors = [...investor]
			}
		} else selectedInvestors = [...investors]

		const filteredRaisesList = raises.filter((raise) => {
			let toFilter = false

			raise.leadInvestors.forEach((lead) => {
				if (selectedInvestors.includes(lead) && !toFilter) {
					toFilter = true
				}
			})

			raise.otherInvestors.forEach((otherInv) => {
				if (selectedInvestors.includes(otherInv) && !toFilter) {
					toFilter = true
				}
			})

			return toFilter
		})

		return { selectedInvestors, filteredRaisesList }
	}, [investor, investors, raises])

	return (
		<Layout title={`Raises - DefiLlama`} defaultSEO>
			<RaisesSearch step={{ category: investorName ? 'Raises' : 'Home', name: investorName || 'Raises' }} />

			<AnnouncementWrapper>
				<span>Are we missing any funding round?</span>{' '}
				<a
					href="https://airtable.com/shrON6sFMgyFGulaq"
					style={{ color: '#2f80ed' }}
					target="_blank"
					rel="noopener noreferrer"
				>
					Add it here!
				</a>
			</AnnouncementWrapper>

			<TableFilters>
				<TableHeader>Raises</TableHeader>

				<Dropdowns>
					<Investors investors={investors} selectedInvestors={selectedInvestors} pathname={pathname} />
				</Dropdowns>
			</TableFilters>

			<RaisesTable raises={filteredRaisesList} />
		</Layout>
	)
}

export default RaisesContainer
