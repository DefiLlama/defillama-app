import * as React from 'react'
import { revalidate } from '~/api'
import Layout from '~/layout'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
} from '@tanstack/react-table'
import VirtualTable from '~/components/Table/Table'
import { raisesColumns } from '~/components/Table/Defi/columns'
import { AnnouncementWrapper } from '~/components/Announcement'
import Link from '~/components/Link'

export async function getStaticProps() {
    const data = await fetch(`https://api.llama.fi/raises`).then(r=>r.json())

	return {
		props:{
      raises: data.raises.map(r=>({
        ...r,
        lead: r.leadInvestors
      }))
    },
		revalidate: revalidate()
	}
}

function RaisesTable({ raises }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'date' }])
	const instance = useReactTable({
		data:raises,
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

const Raises = ({raises}) => {
	return (
		<Layout title={`Raises - DefiLlama`} defaultSEO>
      <AnnouncementWrapper>
				<span>Are we missing any funding round?</span>{' '}
				<Link href="https://airtable.com/shrON6sFMgyFGulaq" external={true}>
					<a> Add it here!</a>
				</Link>
			</AnnouncementWrapper>
			<RaisesTable raises={raises} />
		</Layout>
	)
}

export default Raises