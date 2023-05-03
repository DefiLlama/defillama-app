import * as React from 'react'
import Layout from '~/layout'
import data from './final.json'
import { ChartWrapper } from '~/layout/ProtocolAndPool'
import dynamic from 'next/dynamic'
import DefiProtocolsTable from '~/components/Table/Defi'
import { formattedNum, toNiceDayMonthAndYear } from '~/utils'
import { toNiceDateYear } from '~/utils'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<any>

const BanksTable = ({ data }: { data: Array<any> }) => (
	<DefiProtocolsTable
		data={data}
		columns={[
			{
				header: 'Name',
				accessorKey: '1',
				enableSorting: false,
				size: 220
			},
			{
				header: 'Closing date',
				accessorKey: 'date',
				cell: ({ getValue }) => {
					return <>{toNiceDateYear(getValue())}</>
				},
				meta: {
					align: 'end'
				}
			},
			{
				header: 'Assets',
				accessorKey: '6',
				cell: ({ getValue }) => {
					return <>{getValue() ? '$' + formattedNum(getValue() * 1e6) : ''}</>
				},
				meta: {
					align: 'end'
				}
			},
			{
				header: 'Assets (inflation adjusted)',
				accessorKey: '7',
				cell: ({ getValue }) => {
					return <>{getValue() ? '$' + formattedNum(getValue() * 1e6) : ''}</>
				},
				meta: {
					align: 'end'
				}
			}
		]}
	/>
)

const Banks = () => {
	return (
		<Layout title="Bank Failures">
			<ChartWrapper>
				<BarChart
					chartData={Object.entries(data.years).map((t) => [new Date(t[0]).getTime() / 1e3, t[1] * 1e6])}
					title="Assets of failed banks (inflation adjusted)"
					valueSymbol="$"
				/>
			</ChartWrapper>
			<BanksTable
				data={data.banks.map((b: any) => {
					b.date = new Date(b[4]).getTime() / 1e3
					return b
				})}
			/>
		</Layout>
	)
}

export default Banks
