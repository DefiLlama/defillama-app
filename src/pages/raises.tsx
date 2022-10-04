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

export async function getStaticProps() {
	const {records} = await fetch("https://api.airtable.com/v0/appGpVsrkpqsZ9qHH/Raises", {
    headers:{
      "Authorization": process.env.AIRTABLE_API_KEY 
    }
  }).then(r=>r.json())

	return {
		props:{
      raises: records.filter(r=>
        r.fields['Company name (pls match names in defillama)'] !== undefined &&
        r.fields["Source (twitter/news links better because blogposts go down quite often)"] !== undefined &&
        r.fields["Date (DD/MM/YYYY, the correct way)"] !== undefined
      ).map(r=>({
        date: new Date(r.fields["Date (DD/MM/YYYY, the correct way)"]).getTime()/1000,
        name: r.fields["Company name (pls match names in defillama)"],
        round: r.fields["Round"] ?? null,
        amount: r.fields["Amount raised (millions)"] ?? null,
        chains: r.fields["Chain"] ?? [],
        sector:r.fields["Description (very smol)"] ?? null,
        source: r.fields["Source (twitter/news links better because blogposts go down quite often)"],
        lead: r.fields["Lead Investor"]?.[0] ?? null,
        otherInvestors: r.fields["Other investors"] ?? null,
        valuation: r.fields["Valuation (millions)"] ?? null,
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
  console.log(raises)
	return (
		<Layout title={`Raises - DefiLlama`} defaultSEO>
			<RaisesTable raises={raises} />
		</Layout>
	)
}

export default Raises