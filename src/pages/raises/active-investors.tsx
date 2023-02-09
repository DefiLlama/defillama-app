import { getCoreRowModel, getSortedRowModel, SortingState, useReactTable } from '@tanstack/react-table'
import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { activeInvestorsColumns } from '~/components/Table/Defi/columns'
import VirtualTable from '~/components/Table/Table'
import { RAISES_API } from '~/constants'
import Layout from '~/layout'
import { Header } from '~/Theme'

export async function getStaticProps() {
	const data = await fetch(RAISES_API).then((r) => r.json())

	const activeInvestors = {}

	const last30d = data.raises
		.filter((raise) => raise.date && raise.date * 1000 >= Date.now() - 31 * 24 * 60 * 60 * 1000)
		.sort((a, b) => b.date - a.date)

	last30d.forEach((raise) => {
		raise.leadInvestors.forEach((investor) => {
			if (!activeInvestors[investor]) {
				activeInvestors[investor] = {}
			}

			activeInvestors[investor] = {
				deals: (activeInvestors[investor]?.deals ?? 0) + 1,
				projects: [...(activeInvestors[investor]?.projects ?? []), raise.name]
			}
		})

		raise.otherInvestors.forEach((investor) => {
			if (!activeInvestors[investor]) {
				activeInvestors[investor] = {}
			}

			activeInvestors[investor] = {
				deals: (activeInvestors[investor]?.deals ?? 0) + 1,
				projects: [...(activeInvestors[investor]?.projects ?? []), raise.name]
			}
		})
	})

	return {
		props: {
			investors: Object.entries(activeInvestors).map(
				([name, info]: [string, { deals: number; projects: Array<string> }]) => ({
					name,
					deals: info.deals,
					projects: info.projects.join(', ')
				})
			)
		},
		revalidate: maxAgeForNext([22])
	}
}

const ActiveInvestors = ({ investors }) => {
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'deals' }])

	const instance = useReactTable({
		data: investors,
		columns: activeInvestorsColumns,
		state: {
			sorting
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return (
		<Layout title={`Active Investors - DefiLlama`} defaultSEO>
			<Header>Active Investors</Header>
			<VirtualTable instance={instance} />
		</Layout>
	)
}

export default ActiveInvestors
