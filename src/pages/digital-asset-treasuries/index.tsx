import { useCallback } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { maxAgeForNext } from '~/api'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { Tooltip } from '~/components/Tooltip'
import { TRADFI_API } from '~/constants'
import Layout from '~/layout'
import { formattedNum, getDominancePercent, getNDistinctColors, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

interface ITreasuryCompanies {
	breakdownByAsset: {
		[asset: string]: Array<{
			assetName: string
		}>
	}
	statsByAsset: {
		[asset: string]: {
			assetName: string
			assetTicker: string
		}
	}
	institutions: Array<{
		ticker: string
		name: string
		type: string
		price: number
		priceChange24h: number
		volume24h: number
		fd_realized: number
		fd_realistic: number
		fd_max: number
		mcap_realized: number
		mcap_realistic: number
		mcap_max: number
		realized_mNAV: number
		realistic_mNAV: number
		max_mNAV: number
		totalCost: number
		totalUsdValue: number
		totalAssetsByAsset: Record<
			string,
			{
				amount: number
				usdValue?: number | null
				cost?: number | null
				avgPrice?: number | null
			}
		>
	}>
}

const breakdownColor = (type) => {
	switch (type) {
		case 'Bitcoin':
			return '#f97316'
		case 'Ethereum':
			return '#2563eb'
		case 'Solana':
			return '#6d28d9'
		case 'Hyperliquid':
			return '#16a34a'
		case 'XRP':
			return '#6b7280'
		case 'Tron':
			return '#E91E63'
		default:
			return null
	}
}

export const getStaticProps = withPerformanceLogging('digital-asset-treasuries/index', async () => {
	const res: ITreasuryCompanies = await fetchJson(`${TRADFI_API}/v1/companies`)

	const allAssets = [{ label: 'All', to: '/digital-asset-treasuries' }]
	for (const asset in res.breakdownByAsset) {
		allAssets.push({ label: res.breakdownByAsset[asset][0].assetName, to: `/digital-asset-treasuries/${asset}` })
	}

	const colorByAsset = {}
	let i = 0
	const colors = getNDistinctColors(allAssets.length + 6)
	for (const asset in res.breakdownByAsset) {
		const color = breakdownColor(res.breakdownByAsset[asset][0].assetName)
		if (color) {
			colorByAsset[asset] = color
		} else {
			colorByAsset[asset] = colors[i + 6]
		}
		i++
	}

	return {
		props: {
			allAssets,
			institutions: res.institutions.map((institute) => {
				const totalUsdValue = Object.entries(institute.totalAssetsByAsset).reduce(
					(acc, [asset, { usdValue }]) => acc + (usdValue ?? 0),
					0
				)

				return {
					...institute,
					assetBreakdown: Object.entries(institute.totalAssetsByAsset)
						.map(([asset, { amount, cost, usdValue, avgPrice }]) => ({
							name: res.statsByAsset[asset].assetName,
							ticker: res.statsByAsset[asset].assetTicker,
							amount: amount,
							cost: cost ?? null,
							usdValue: usdValue ?? null,
							avgPrice: avgPrice ?? null,
							dominance: getDominancePercent(usdValue ?? 0, totalUsdValue),
							color: colorByAsset[asset]
						}))
						.sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0))
				}
			})
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Digital Asset Treasuries', 'by', 'Institution']

const prepareInstitutionsCsv = (institutions) => {
	const headers = [
		'Institution',
		'Ticker',
		'Type',
		'Cost Basis',
		"Today's Holdings Value",
		'Stock Price',
		'24h Price Change (%)',
		'Realized mNAV',
		'Realistic mNAV',
		'Max mNAV',
		'Asset Breakdown'
	]

	const rows = institutions.map((institution) => {
		const assetBreakdownStr = institution.assetBreakdown
			.map((asset) => {
				const parts = [`${asset.name} (${asset.ticker})`]
				if (asset.usdValue != null) parts.push(`Value: $${asset.usdValue.toLocaleString()}`)
				if (asset.amount != null) parts.push(`Amount: ${asset.amount.toLocaleString()} ${asset.ticker}`)
				if (asset.dominance != null) parts.push(`${asset.dominance}%`)
				return parts.join(' - ')
			})
			.join(' | ')

		return [
			institution.name,
			institution.ticker,
			institution.type,
			institution.totalCost ?? '',
			institution.totalUsdValue ?? '',
			institution.price ?? '',
			institution.priceChange24h ?? '',
			institution.realized_mNAV ?? '',
			institution.realistic_mNAV ?? '',
			institution.max_mNAV ?? '',
			assetBreakdownStr
		]
	})

	const date = new Date().toISOString().split('T')[0]
	return {
		filename: `digital-asset-treasuries-${date}.csv`,
		rows: [headers, ...rows]
	}
}

export default function TreasuriesByInstitution({ allAssets, institutions }) {
	const prepareCsv = useCallback(() => {
		const headers = [
			'Institution',
			'Asset',
			'Ticker',
			'Amount',
			'Cost Basis',
			'Holdings Value',
			'Avg Price',
			'Dominance %'
		]
		const rows = []

		institutions.forEach((institute) => {
			institute.assetBreakdown?.forEach((asset) => {
				rows.push([
					`"${institute.name}"`,
					asset.name || '',
					asset.ticker || '',
					asset.amount != null ? asset.amount : '',
					asset.cost != null ? asset.cost : '',
					asset.usdValue != null ? asset.usdValue : '',
					asset.avgPrice != null ? asset.avgPrice : '',
					asset.dominance != null ? `${asset.dominance.toFixed(2)}%` : ''
				])
			})
		})

		return {
			filename: 'defillama-digital-asset-treasuries.csv',
			rows: [headers, ...rows]
		}
	}, [institutions])

	return (
		<Layout
			title={`Digital Asset Treasuries - DefiLlama`}
			description={`Track institutions that own digital assets as part of their corporate treasury. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`digital asset treasury, digital asset treasuries, digital asset treasury by institution, digital asset treasury by company, digital asset treasury by asset`}
			canonicalUrl={`/digital-asset-treasuries`}
			pageName={pageName}
		>
			<RowLinksWithDropdown links={allAssets} activeLink={'All'} />
			<TableWithSearch
				data={institutions}
				columns={columns}
				placeholder="Search institutions"
				columnToSearch="name"
				sortingState={[{ id: 'totalAssetAmount', desc: true }]}
				customFilters={<CSVDownloadButton prepareCsv={() => prepareInstitutionsCsv(institutions)} />}
			/>
		</Layout>
	)
}

const columns: ColumnDef<ITreasuryCompanies['institutions'][0]>[] = [
	{
		header: 'Institution',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const name = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			return (
				<span className="relative flex items-center gap-2">
					<span className="shrink-0">{index + 1}</span>
					<BasicLink
						href={`/digital-asset-treasury/${slug(row.original.ticker)}`}
						title={name}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
					>
						{name}
					</BasicLink>
				</span>
			)
		},
		size: 228,
		meta: {
			align: 'start'
		}
	},
	// {
	// 	header: 'Type',
	// 	accessorKey: 'type',
	// 	enableSorting: false,
	// 	size: 120,
	// 	meta: {
	// 		align: 'end'
	// 	}
	// },
	{
		header: 'Assets',
		accessorKey: 'assetBreakdown',
		enableSorting: false,
		cell: (info) => {
			const assetBreakdown = info.getValue() as Array<{
				name: string
				ticker: string
				amount?: number | null
				usdValue?: number | null
				cost?: number | null
				avgPrice?: number | null
				dominance: number
				color: string
			}>

			return (
				<Tooltip
					content={<AssetTooltipContent assetBreakdown={assetBreakdown} protocolName={info.row.original.name} />}
					render={<button />}
					className="ml-auto flex h-5 w-full! flex-nowrap items-center bg-white"
				>
					{assetBreakdown.map((asset) => {
						return (
							<div
								key={asset.name + asset.dominance + info.row.original.name}
								style={{ width: `${asset.dominance}%`, background: asset.color }}
								className="h-5"
							/>
						)
					})}
				</Tooltip>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Cost Basis',
		accessorKey: 'totalCost',
		cell: ({ getValue }) => {
			const totalCost = getValue() as number
			if (totalCost == null) return null
			return <>{formattedNum(totalCost, true)}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: "Today's Holdings Value",
		accessorKey: 'totalUsdValue',
		cell: ({ getValue }) => {
			const totalUsdValue = getValue() as number
			if (totalUsdValue == null) return null
			return <>{formattedNum(totalUsdValue, true)}</>
		},
		size: 196,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Stock Price',
		accessorKey: 'price',
		cell: ({ getValue, row }) => {
			const price = getValue() as number
			if (price == null) return null
			if (row.original.priceChange24h == null) return <>{formattedNum(price, true)}</>
			return (
				<Tooltip
					content={
						<>
							24h change:{' '}
							<span
								className={row.original.priceChange24h > 0 ? 'text-(--success)' : 'text-(--error)'}
							>{`${row.original.priceChange24h > 0 ? '+' : ''}${row.original.priceChange24h.toFixed(2)}%`}</span>
						</>
					}
					className="justify-end underline decoration-dotted"
				>
					{formattedNum(price, true)}
				</Tooltip>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Realized mNAV',
		accessorKey: 'realized_mNAV',
		cell: ({ getValue }) => {
			const realized_mNAV = getValue() as number
			if (realized_mNAV == null) return null
			return <>{formattedNum(realized_mNAV, false)}</>
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText:
				'Market Net Asset Value based only on the current outstanding common shares, with no dilution considered.'
		}
	},
	{
		header: 'Realistic mNAV',
		accessorKey: 'realistic_mNAV',
		cell: ({ getValue }) => {
			const realistic_mNAV = getValue() as number
			if (realistic_mNAV == null) return null
			return <>{formattedNum(realistic_mNAV, false)}</>
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText:
				'Market Net Asset Value adjusted for expected dilution from in-the-money options and convertibles that are likely to be exercised'
		}
	},
	{
		header: 'Max mNAV',
		accessorKey: 'max_mNAV',
		cell: ({ getValue }) => {
			const max_mNAV = getValue() as number
			if (max_mNAV == null) return null
			return <>{formattedNum(max_mNAV, false)}</>
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText:
				'Market Net Asset Value under the fully diluted scenario, assuming every warrant, option, and convertible is exercised (the most conservative/worst-case view)'
		}
	}
]

const Breakdown = ({
	data
}: {
	data: {
		name: string
		amount?: number
		ticker?: string
		cost?: number | null
		usdValue?: number | null
		avgPrice?: number | null
		dominance: number
		color: string
	}
}) => {
	const name = `${data.name} (${data.dominance}%)`

	return (
		<span className="flex flex-col gap-1 border-l-3 pl-1 text-xs" style={{ borderColor: data.color }}>
			<span>{name}</span>
			{data.amount && <span>{`Amount: ${formattedNum(data.amount, false)} ${data.ticker}`}</span>}
			{data.usdValue && <span>{`Today's Value: ${formattedNum(data.usdValue, true)}`}</span>}
			{data.cost && <span>{`Cost Basis: ${formattedNum(data.cost, true)}`}</span>}
			{data.avgPrice && <span>{`Average Purchase Price: ${formattedNum(data.avgPrice, true)}`}</span>}
		</span>
	)
}

const AssetTooltipContent = ({ assetBreakdown, protocolName }) => {
	return (
		<span className="flex flex-col gap-4">
			{assetBreakdown.map((breakdown) => (
				<Breakdown data={breakdown} key={breakdown.name + breakdown.usdValue + protocolName + 'tooltip-content'} />
			))}
		</span>
	)
}
