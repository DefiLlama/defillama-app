import { ResponsiveTable } from './ResponsiveTable'
import { PullToRefresh } from '../PullToRefresh'
import { formattedNum, formattedPercent } from '~/utils'

// Example usage of the new mobile components
export function ProtocolsTableMobile({ data, onRefresh }: { data: any[], onRefresh?: () => Promise<void> }) {
	const columns = [
		{
			accessorKey: 'name',
			header: 'Protocol',
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<img src={row.original.logo} alt="" className="w-6 h-6 rounded-full" />
					<span className="font-medium">{row.original.name}</span>
				</div>
			)
		},
		{
			accessorKey: 'tvl',
			header: 'TVL',
			cell: ({ getValue }) => formattedNum(getValue(), true)
		},
		{
			accessorKey: 'change_1d',
			header: '1d Change',
			cell: ({ getValue }) => (
				<span className={getValue() >= 0 ? 'text-green-600' : 'text-red-600'}>
					{formattedPercent(getValue())}
				</span>
			)
		},
		{
			accessorKey: 'change_7d',
			header: '7d Change',
			cell: ({ getValue }) => (
				<span className={getValue() >= 0 ? 'text-green-600' : 'text-red-600'}>
					{formattedPercent(getValue())}
				</span>
			)
		},
		{
			accessorKey: 'category',
			header: 'Category'
		},
		{
			accessorKey: 'chains',
			header: 'Chains',
			cell: ({ getValue }) => getValue()?.join(', ') || '-'
		}
	]
	
	const handleRefresh = async () => {
		if (onRefresh) {
			await onRefresh()
		}
	}
	
	if (onRefresh) {
		return (
			<PullToRefresh onRefresh={handleRefresh} className="h-full">
				<ResponsiveTable
					data={data}
					columns={columns}
					getRowHref={(row) => `/protocol/${row.slug}`}
					cardClassName="mobile-card"
				/>
			</PullToRefresh>
		)
	}
	
	return (
		<ResponsiveTable
			data={data}
			columns={columns}
			getRowHref={(row) => `/protocol/${row.slug}`}
			cardClassName="mobile-card"
		/>
	)
}

// Example for chains table
export function ChainsTableMobile({ data, onRefresh }: { data: any[], onRefresh?: () => Promise<void> }) {
	const columns = [
		{
			accessorKey: 'name',
			header: 'Chain',
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<img src={row.original.logo} alt="" className="w-6 h-6 rounded-full" />
					<span className="font-medium">{row.original.name}</span>
				</div>
			)
		},
		{
			accessorKey: 'tvl',
			header: 'TVL',
			cell: ({ getValue }) => formattedNum(getValue(), true)
		},
		{
			accessorKey: 'change_1d',
			header: '1d Change',
			cell: ({ getValue }) => (
				<span className={getValue() >= 0 ? 'text-green-600' : 'text-red-600'}>
					{formattedPercent(getValue())}
				</span>
			)
		},
		{
			accessorKey: 'protocols',
			header: 'Protocols'
		},
		{
			accessorKey: 'stablecoins',
			header: 'Stablecoins'
		},
		{
			accessorKey: 'volume_24h',
			header: '24h Volume',
			cell: ({ getValue }) => formattedNum(getValue(), true)
		}
	]
	
	const handleRefresh = async () => {
		if (onRefresh) {
			await onRefresh()
		}
	}
	
	if (onRefresh) {
		return (
			<PullToRefresh onRefresh={handleRefresh} className="h-full">
				<ResponsiveTable
					data={data}
					columns={columns}
					getRowHref={(row) => `/chain/${row.slug}`}
					cardClassName="mobile-card"
				/>
			</PullToRefresh>
		)
	}
	
	return (
		<ResponsiveTable
			data={data}
			columns={columns}
			getRowHref={(row) => `/chain/${row.slug}`}
			cardClassName="mobile-card"
		/>
	)
}

// Example for stablecoins table
export function StablecoinsTableMobile({ data, onRefresh }: { data: any[], onRefresh?: () => Promise<void> }) {
	const columns = [
		{
			accessorKey: 'name',
			header: 'Stablecoin',
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<img src={row.original.logo} alt="" className="w-6 h-6 rounded-full" />
					<div>
						<div className="font-medium">{row.original.name}</div>
						<div className="text-xs text-(--text3)">{row.original.symbol}</div>
					</div>
				</div>
			)
		},
		{
			accessorKey: 'mcap',
			header: 'Market Cap',
			cell: ({ getValue }) => formattedNum(getValue(), true)
		},
		{
			accessorKey: 'change_1d',
			header: '1d Change',
			cell: ({ getValue }) => (
				<span className={getValue() >= 0 ? 'text-green-600' : 'text-red-600'}>
					{formattedPercent(getValue())}
				</span>
			)
		},
		{
			accessorKey: 'chains',
			header: 'Chains',
			cell: ({ getValue }) => getValue()?.join(', ') || '-'
		},
		{
			accessorKey: 'pegType',
			header: 'Peg Type'
		},
		{
			accessorKey: 'pegMechanism',
			header: 'Peg Mechanism'
		}
	]
	
	const handleRefresh = async () => {
		if (onRefresh) {
			await onRefresh()
		}
	}
	
	if (onRefresh) {
		return (
			<PullToRefresh onRefresh={handleRefresh} className="h-full">
				<ResponsiveTable
					data={data}
					columns={columns}
					getRowHref={(row) => `/stablecoin/${row.slug}`}
					cardClassName="mobile-card"
				/>
			</PullToRefresh>
		)
	}
	
	return (
		<ResponsiveTable
			data={data}
			columns={columns}
			getRowHref={(row) => `/stablecoin/${row.slug}`}
			cardClassName="mobile-card"
		/>
	)
}