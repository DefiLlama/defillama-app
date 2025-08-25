import * as React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { maxAgeForNext } from '~/api'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { BasicLink } from '~/components/Link'
import { Select } from '~/components/Select'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import {
	getTotalValueLostInHacksByProtocol,
	IProtocolTotalValueLostInHacksByProtocol
} from '~/containers/Hacks/queries'
import Layout from '~/layout'
import { download, formattedNum, tokenIconUrl } from '~/utils'
import { useCSVDownload } from '~/hooks/useCSVDownload'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('protocols/total-value-lost-in-hacks', async () => {
	const data = await getTotalValueLostInHacksByProtocol()
	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', 'Total Value Lost in Hacks']

export default function TotalLostInHacks({ protocols }: IProtocolTotalValueLostInHacksByProtocol) {
	const { downloadCSV, isLoading: isDownloadLoading } = useCSVDownload()
	const [selectedColumns, setSelectedColumns] = React.useState<Array<string>>([
		'Name',
		'Total Hacked',
		'Returned Funds',
		'Net User Loss'
	])

	const filteredColumns = React.useMemo(() => {
		return columns.filter((c) => selectedColumns.includes(c.id))
	}, [selectedColumns])

	return (
		<Layout title="Total Value Lost in Hacks - DefiLlama" pageName={pageName}>
			<TableWithSearch
				data={protocols}
				columns={filteredColumns}
				placeholder="Search..."
				columnToSearch="Name"
				header="Total Value Lost in Hacks"
				compact
				customFilters={
					<>
						<Select
							allValues={columns.map((c) => c.id)}
							selectedValues={selectedColumns}
							setSelectedValues={setSelectedColumns}
							clearAll={() => setSelectedColumns([])}
							toggleAll={() => setSelectedColumns(columns.map((c) => c.id))}
							label="Columns"
							labelType="smol"
							triggerProps={{
								className:
									'flex items-center justify-between gap-2 px-2 py-[6px] text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium w-full sm:w-auto'
							}}
						/>
						<CSVDownloadButton
							onClick={() => {
								const rows: Array<Array<string | number>> = [
									['Name', 'Total Hacked', 'Returned Funds', 'Net User Loss']
								]
								for (const protocol of protocols) {
									rows.push([
										protocol.name,
										protocol.totalHacked,
										protocol.returnedFunds,
										protocol.totalHacked - protocol.returnedFunds
									])
								}
								downloadCSV('total-value-lost-in-hacks.csv', rows.map((r) => r.join(',')).join('\n'))
							}}
							isLoading={isDownloadLoading}
							smol
						/>
					</>
				}
			/>
		</Layout>
	)
}

const columns: ColumnDef<IProtocolTotalValueLostInHacksByProtocol['protocols'][number]>[] = [
	{
		header: 'Name',
		accessorFn: (row) => row.name,
		id: 'Name',
		cell: ({ row, getValue, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			return (
				<span className={`relative flex items-center gap-2 ${row.depth > 0 ? 'pl-6' : 'pl-0'}`}>
					<span className="shrink-0" onClick={row.getToggleExpandedHandler()}>
						{index + 1}
					</span>

					<TokenLogo logo={tokenIconUrl(row.original.slug)} data-lgonly />

					<BasicLink
						href={row.original.route}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{getValue() as string}
					</BasicLink>
				</span>
			)
		}
	},
	{
		header: 'Total Hacked',
		accessorFn: (row) => row.totalHacked,
		id: 'Total Hacked',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		meta: {
			align: 'center'
		}
	},
	{
		header: 'Returned Funds',
		accessorFn: (row) => row.returnedFunds,
		id: 'Returned Funds',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		meta: {
			align: 'center'
		}
	},
	{
		header: 'Net User Loss',
		accessorFn: (row) => row.totalHacked - row.returnedFunds,
		id: 'Net User Loss',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		meta: {
			align: 'center',
			headerHelperText: 'Total Hacked - Returned Funds'
		}
	}
]
