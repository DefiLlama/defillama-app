import { lazy, Suspense, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Icon } from '~/components/Icon'
import { Select } from '~/components/Select'
import { Tooltip } from '~/components/Tooltip'
import { formattedNum } from '~/utils'
import { IProtocolOverviewPageData } from './types'

const SankeyChart = lazy(() => import('~/components/ECharts/SankeyChart'))

const incomeStatementGroupByOptions = ['Yearly', 'Quarterly', 'Monthly'] as const

export const IncomeStatement = (props: IProtocolOverviewPageData) => {
	const [groupBy, setGroupBy] = useState<(typeof incomeStatementGroupByOptions)[number]>('Quarterly')
	const [sankeyGroupBy, setSankeyGroupBy] = useState<(typeof incomeStatementGroupByOptions)[number]>('Quarterly')
	const [selectedSankeyPeriod, setSelectedSankeyPeriod] = useState<string | null>(null)

	const {
		tableHeaders,
		grossProtocolRevenueData,
		costOfRevenueData,
		grossProfitData,
		othersProfitData,
		incentivesData,
		earningsData,
		tokenHolderNetIncomeData,
		othersTokenHolderFlowsData,
		grossProtocolRevenueByLabels,
		costOfRevenueByLabels,
		grossProfitByLabels,
		othersProfitByLabels,
		incentivesByLabels,
		tokenHolderNetIncomeByLabels,
		othersTokenHolderFlowsByLabels
	} = useMemo(() => {
		const groupKey = groupBy.toLowerCase()
		const tableHeaders = [] as [string, string, number][]
		const grossProtocolRevenueData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
		const costOfRevenueData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
		const grossProfitData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
		const othersProfitData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
		const incentivesData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
		const earningsData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
		const tokenHolderNetIncomeData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
		const othersTokenHolderFlowsData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>

		for (const key in props.incomeStatement?.data?.[groupKey] ?? {}) {
			tableHeaders.push([
				key,
				groupKey === 'monthly'
					? dayjs.utc(key).format('MMM YYYY')
					: groupKey === 'quarterly'
						? key.split('-').reverse().join(' ')
						: key,
				props.incomeStatement?.data?.[groupKey]?.[key]?.timestamp ?? 0
			])

			grossProtocolRevenueData[key] = props.incomeStatement?.data?.[groupKey]?.[key]?.['Gross Protocol Revenue'] ?? {
				value: 0,
				'by-label': {}
			}

			costOfRevenueData[key] = props.incomeStatement?.data?.[groupKey]?.[key]?.['Cost Of Revenue'] ?? {
				value: 0,
				'by-label': {}
			}

			grossProfitData[key] = props.incomeStatement?.data?.[groupKey]?.[key]?.['Gross Profit'] ?? {
				value: 0,
				'by-label': {}
			}

			othersProfitData[key] = props.incomeStatement?.data?.[groupKey]?.[key]?.['Others Profit'] ?? {
				value: 0,
				'by-label': {}
			}

			incentivesData[key] = props.incomeStatement?.data?.[groupKey]?.[key]?.['Incentives'] ?? {
				value: 0,
				'by-label': {}
			}

			earningsData[key] = props.incomeStatement?.data?.[groupKey]?.[key]?.['Earnings'] ?? {
				value: 0,
				'by-label': {}
			}

			tokenHolderNetIncomeData[key] = props.incomeStatement?.data?.[groupKey]?.[key]?.['Token Holder Net Income'] ?? {
				value: 0,
				'by-label': {}
			}

			othersTokenHolderFlowsData[key] = props.incomeStatement?.data?.[groupKey]?.[key]?.[
				'Others Token Holder Flows'
			] ?? {
				value: 0,
				'by-label': {}
			}
		}

		return {
			tableHeaders: tableHeaders.sort((a, b) => b[2] - a[2]),
			grossProtocolRevenueData,
			costOfRevenueData,
			grossProfitData,
			othersProfitData,
			incentivesData,
			earningsData,
			tokenHolderNetIncomeData,
			othersTokenHolderFlowsData,
			grossProtocolRevenueByLabels: props.incomeStatement?.labelsByType?.['Gross Protocol Revenue'] ?? [],
			costOfRevenueByLabels: props.incomeStatement?.labelsByType?.['Cost Of Revenue'] ?? [],
			grossProfitByLabels: props.incomeStatement?.labelsByType?.['Gross Profit'] ?? [],
			othersProfitByLabels: props.incomeStatement?.labelsByType?.['Others Profit'] ?? [],
			incentivesByLabels: props.incomeStatement?.labelsByType?.['Incentives'] ?? [],
			tokenHolderNetIncomeByLabels: props.incomeStatement?.labelsByType?.['Token Holder Net Income'] ?? [],
			othersTokenHolderFlowsByLabels: props.incomeStatement?.labelsByType?.['Others Token Holder Flows'] ?? []
		}
	}, [groupBy, props.incomeStatement])

	// Compute Sankey chart data for the selected period
	const { sankeyData, sankeyPeriodOptions, validSankeyPeriod } = useMemo(() => {
		const sankeyGroupKey = sankeyGroupBy.toLowerCase()
		const sankeyHeaders = [] as [string, string, number][]
		const sankeyGrossProtocolRevenueData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
		const sankeyCostOfRevenueData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
		const sankeyGrossProfitData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
		const sankeyIncentivesData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
		const sankeyEarningsData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
		const sankeyTokenHolderNetIncomeData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>

		for (const key in props.incomeStatement?.data?.[sankeyGroupKey] ?? {}) {
			sankeyHeaders.push([
				key,
				sankeyGroupKey === 'monthly'
					? dayjs.utc(key).format('MMM YYYY')
					: sankeyGroupKey === 'quarterly'
						? key.split('-').reverse().join(' ')
						: key,
				props.incomeStatement?.data?.[sankeyGroupKey]?.[key]?.timestamp ?? 0
			])

			sankeyGrossProtocolRevenueData[key] = props.incomeStatement?.data?.[sankeyGroupKey]?.[key]?.[
				'Gross Protocol Revenue'
			] ?? { value: 0, 'by-label': {} }

			sankeyCostOfRevenueData[key] = props.incomeStatement?.data?.[sankeyGroupKey]?.[key]?.['Cost Of Revenue'] ?? {
				value: 0,
				'by-label': {}
			}

			sankeyGrossProfitData[key] = props.incomeStatement?.data?.[sankeyGroupKey]?.[key]?.['Gross Profit'] ?? {
				value: 0,
				'by-label': {}
			}

			sankeyIncentivesData[key] = props.incomeStatement?.data?.[sankeyGroupKey]?.[key]?.['Incentives'] ?? {
				value: 0,
				'by-label': {}
			}

			sankeyEarningsData[key] = props.incomeStatement?.data?.[sankeyGroupKey]?.[key]?.['Earnings'] ?? {
				value: 0,
				'by-label': {}
			}

			sankeyTokenHolderNetIncomeData[key] = props.incomeStatement?.data?.[sankeyGroupKey]?.[key]?.[
				'Token Holder Net Income'
			] ?? {
				value: 0,
				'by-label': {}
			}
		}

		const sortedSankeyHeaders = sankeyHeaders.sort((a, b) => b[2] - a[2])
		const periodOptions = sortedSankeyHeaders.map((h) => ({ key: h[0], label: h[1] }))

		if (sortedSankeyHeaders.length === 0)
			return { sankeyData: { nodes: [], links: [] }, sankeyPeriodOptions: [], validSankeyPeriod: null }

		// Use selected period if it's valid for current grouping, otherwise default to most recent complete period (index 1, since 0 is incomplete)
		const validSelectedPeriod =
			selectedSankeyPeriod && sortedSankeyHeaders.some((h) => h[0] === selectedSankeyPeriod)
				? selectedSankeyPeriod
				: null
		const periodKey = validSelectedPeriod ?? sortedSankeyHeaders[1]?.[0] ?? sortedSankeyHeaders[0]?.[0]
		const periodLabel =
			sortedSankeyHeaders.find((h) => h[0] === periodKey)?.[1] ??
			sortedSankeyHeaders[1]?.[1] ??
			sortedSankeyHeaders[0]?.[1]
		if (!periodKey)
			return { sankeyData: { nodes: [], links: [] }, sankeyPeriodOptions: periodOptions, validSankeyPeriod: null }

		const grossProtocolRevenue = sankeyGrossProtocolRevenueData[periodKey]?.value ?? 0
		const costOfRevenue = sankeyCostOfRevenueData[periodKey]?.value ?? 0
		const grossProfit = sankeyGrossProfitData[periodKey]?.value ?? 0
		const incentives = sankeyIncentivesData[periodKey]?.value ?? 0
		const earnings = sankeyEarningsData[periodKey]?.value ?? 0
		const tokenHolderNetIncome = sankeyTokenHolderNetIncomeData[periodKey]?.value ?? 0

		// Get breakdown by labels for fees
		const grossProtocolRevenueByLabelData = sankeyGrossProtocolRevenueData[periodKey]?.['by-label'] ?? {}
		const costOfRevenueByLabelData = sankeyCostOfRevenueData[periodKey]?.['by-label'] ?? {}

		const nodes: Array<{
			name: string
			color?: string
			description?: string
			displayValue?: number | string
			depth?: number
			percentageLabel?: string
		}> = []
		const links: Array<{ source: string; target: string; value: number; color?: string }> = []

		// Colors: gray for neutral/input, green for profit, red for costs
		const COLORS = {
			gray: '#6b7280',
			green: '#22c55e',
			red: '#ef4444'
		}

		// Helper to format percentage
		const formatPercent = (value: number, total: number) => {
			if (total === 0) return '0%'
			const pct = (value / total) * 100
			const absPct = Math.abs(pct)
			const sign = pct < 0 ? '-' : ''
			return absPct >= 1 ? `${sign}${absPct.toFixed(0)}%` : absPct >= 0.1 ? `${sign}${absPct.toFixed(1)}%` : '<0.1%'
		}

		// Only add fee breakdown nodes if breakdown labels are available
		if (Object.keys(grossProtocolRevenueByLabelData).length > 0) {
			nodes.push({
				name: 'Gross Protocol Revenue',
				color: COLORS.gray,
				description: props.incomeStatement?.methodology?.['Gross Protocol Revenue'] ?? '',
				displayValue: grossProtocolRevenue, // Show actual gross protocol revenue value, not sum of flows
				depth: 1
			})
			for (const [label, value] of Object.entries(grossProtocolRevenueByLabelData)) {
				if (value > 0) {
					nodes.push({
						name: label,
						color: COLORS.gray,
						description: props.incomeStatement?.breakdownMethodology?.['Gross Protocol Revenue']?.[label] ?? '',
						depth: 0,
						percentageLabel: formatPercent(value, grossProtocolRevenue)
					})
					links.push({ source: label, target: 'Gross Protocol Revenue', value })
				}
			}
		} else if (grossProtocolRevenue > 0) {
			// No breakdown available, start from Gross Protocol Revenue directly
			nodes.push({
				name: 'Gross Protocol Revenue',
				color: COLORS.gray,
				description: props.incomeStatement?.methodology?.['Gross Protocol Revenue'] ?? '',
				displayValue: grossProtocolRevenue, // Show actual gross protocol revenue value, not sum of flows
				depth: 1
			})
		}

		if (costOfRevenue > 0) {
			nodes.push({
				name: 'Cost of Revenue',
				color: COLORS.red,
				description: props.incomeStatement?.methodology?.['Cost Of Revenue'] ?? '',
				displayValue: costOfRevenue, // Show actual cost of revenue value
				depth: 2,
				percentageLabel: formatPercent(costOfRevenue, grossProtocolRevenue)
			})
			links.push({ source: 'Gross Protocol Revenue', target: 'Cost of Revenue', value: costOfRevenue })

			// Only add cost breakdown if labels are available
			if (Object.keys(costOfRevenueByLabelData).length > 0) {
				for (const [label, value] of Object.entries(costOfRevenueByLabelData)) {
					if (value > 0) {
						const costLabel = `${label} (Cost)`
						nodes.push({
							name: costLabel,
							color: COLORS.red,
							description: props.incomeStatement?.breakdownMethodology?.['Cost Of Revenue']?.[label] ?? '',
							depth: 3,
							percentageLabel: formatPercent(value, costOfRevenue)
						})
						links.push({ source: 'Cost of Revenue', target: costLabel, value })
					}
				}
			}
		}

		if (grossProfit > 0) {
			const hasIncentives = incentives > 0 && props.metrics?.incentives

			nodes.push({
				name: 'Gross Profit',
				color: COLORS.green,
				description: props.incomeStatement?.methodology?.['Gross Profit'] ?? '',
				displayValue: grossProfit, // Show actual revenue value
				depth: 2,
				percentageLabel: formatPercent(grossProfit, grossProtocolRevenue)
			})
			links.push({ source: 'Gross Protocol Revenue', target: 'Gross Profit', value: grossProfit })

			if (hasIncentives) {
				// Incentives is at the same depth as Gross Profit so both flow horizontally into Earnings
				nodes.push({
					name: 'Incentives',
					color: COLORS.red,
					description: props.incomeStatement?.methodology?.['Incentives'] ?? '',
					depth: 2 // Same depth as Gross Profit
				})

				// Both Gross Profit and Incentives flow into Earnings
				nodes.push({
					name: 'Earnings',
					color: earnings >= 0 ? COLORS.green : COLORS.red,
					description: `Gross Profit (${formattedNum(grossProfit, true)}) minus Incentives (${formattedNum(incentives, true)})`,
					displayValue: earnings, // Show actual earnings value, not the sum of flows
					depth: 3,
					percentageLabel: formatPercent(earnings, grossProfit)
				})

				// Gross Profit flows to Earnings (green)
				links.push({ source: 'Gross Profit', target: 'Earnings', value: grossProfit, color: COLORS.green })
				// Incentives flows to Earnings (red - as a cost being subtracted)
				links.push({ source: 'Incentives', target: 'Earnings', value: incentives, color: COLORS.red })

				if (earnings > 0 && tokenHolderNetIncome > 0) {
					nodes.push({
						name: 'Value Distributed to Token Holders',
						color: COLORS.green,
						description: props.incomeStatement?.methodology?.['Token Holder Net Income'] ?? '',
						depth: 4,
						percentageLabel: formatPercent(tokenHolderNetIncome, earnings)
					})
					links.push({ source: 'Earnings', target: 'Value Distributed to Token Holders', value: tokenHolderNetIncome })
				}
			} else {
				// No incentives: Gross Profit flows directly to Earnings
				if (earnings > 0) {
					nodes.push({
						name: 'Earnings',
						color: COLORS.green,
						description: props.incomeStatement?.methodology?.['Gross Profit'] ?? '',
						depth: 3,
						percentageLabel: formatPercent(earnings, grossProfit)
					})
					links.push({ source: 'Gross Profit', target: 'Earnings', value: earnings })

					if (tokenHolderNetIncome > 0) {
						nodes.push({
							name: 'Value Distributed to Token Holders',
							color: COLORS.green,
							description: props.incomeStatement?.methodology?.['Token Holder Net Income'] ?? '',
							depth: 4,
							percentageLabel: formatPercent(tokenHolderNetIncome, earnings)
						})
						links.push({
							source: 'Earnings',
							target: 'Value Distributed to Token Holders',
							value: tokenHolderNetIncome
						})
					}
				}
			}
		}

		return {
			sankeyData: { nodes, links, periodLabel },
			sankeyPeriodOptions: periodOptions,
			validSankeyPeriod: periodKey
		}
	}, [sankeyGroupBy, selectedSankeyPeriod, props.incomeStatement, props.metrics?.incentives])

	return (
		<div className="col-span-full flex flex-col gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:p-4">
			<div className="flex flex-wrap items-center justify-between gap-1">
				<h2 className="group relative flex items-center gap-1 text-base font-semibold" id="income-statement">
					Income Statement for {props.name}
					<a
						aria-hidden="true"
						tabIndex={-1}
						href="#income-statement"
						className="absolute top-0 right-0 z-10 flex h-full w-full items-center"
					/>
					<Icon name="link" className="invisible h-3.5 w-3.5 group-hover:visible group-focus-visible:visible" />
				</h2>
				<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
					{incomeStatementGroupByOptions.map((groupOption) => (
						<button
							key={`income-statement-${groupOption}`}
							className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
							data-active={groupOption === groupBy}
							onClick={() => {
								setGroupBy(groupOption)
							}}
						>
							{groupOption}
						</button>
					))}
				</div>
			</div>
			<div className="relative overflow-x-auto">
				<div className="pointer-events-none sticky left-0 z-0 h-0 w-full max-sm:hidden" style={{ top: '50%' }}>
					<img
						src="/icons/defillama-dark-neutral.webp"
						alt="defillama"
						height={40}
						width={155}
						className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30 dark:hidden"
					/>
					<img
						src="/icons/defillama-light-neutral.webp"
						alt="defillama"
						height={40}
						width={155}
						className="absolute left-1/2 hidden -translate-x-1/2 -translate-y-1/2 opacity-30 dark:block"
					/>
				</div>
				<table className="z-10 w-full border-collapse">
					<thead>
						<tr>
							<th className="min-w-[120px] overflow-hidden border border-black/10 bg-(--app-bg) p-2 text-left font-semibold text-ellipsis whitespace-nowrap first:sticky first:left-0 first:z-10 dark:border-white/10"></th>
							{tableHeaders.map((header, i) => (
								<th
									key={`${props.name}-${groupBy}-income-statement-${header[0]}`}
									className="min-w-[120px] overflow-hidden border border-black/10 bg-(--app-bg) p-2 text-left font-semibold text-ellipsis whitespace-nowrap dark:border-white/10"
								>
									{i === 0 ? (
										<span className="-mr-2 flex items-center justify-start gap-1">
											<span className="overflow-hidden text-ellipsis whitespace-nowrap">{header[1]}</span>
											<Tooltip
												content={`Current ${groupBy.toLowerCase()} data is incomplete`}
												className="text-xs text-(--error)"
											>
												*
											</Tooltip>
										</span>
									) : (
										header[1]
									)}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						<IncomeStatementByLabel
							protocolName={props.name}
							groupBy={groupBy}
							data={grossProtocolRevenueData}
							dataType="gross protocol revenue"
							label="Gross Protocol Revenue"
							methodology={props.incomeStatement?.methodology?.['Gross Protocol Revenue'] ?? ''}
							tableHeaders={tableHeaders}
							breakdownByLabels={grossProtocolRevenueByLabels}
							breakdownMethodology={props.incomeStatement?.breakdownMethodology?.['Gross Protocol Revenue'] ?? {}}
						/>
						<IncomeStatementByLabel
							protocolName={props.name}
							groupBy={groupBy}
							data={costOfRevenueData}
							dataType="cost of revenue"
							label="Cost of Revenue"
							methodology={props.incomeStatement?.methodology?.['Cost Of Revenue'] ?? ''}
							tableHeaders={tableHeaders}
							breakdownByLabels={costOfRevenueByLabels}
							breakdownMethodology={props.incomeStatement?.breakdownMethodology?.['Cost Of Revenue'] ?? {}}
						/>
						<IncomeStatementByLabel
							protocolName={props.name}
							groupBy={groupBy}
							data={grossProfitData}
							dataType="gross profit"
							label="Gross Profit"
							methodology={props.incomeStatement?.methodology?.['Gross Profit'] ?? ''}
							tableHeaders={tableHeaders}
							breakdownByLabels={grossProfitByLabels}
							breakdownMethodology={props.incomeStatement?.breakdownMethodology?.['Gross Profit'] ?? {}}
						/>
						<IncomeStatementByLabel
							protocolName={props.name}
							groupBy={groupBy}
							data={othersProfitData}
							dataType="others profit"
							label="Others Profit"
							methodology={props.incomeStatement?.methodology?.['Others Profit'] ?? ''}
							tableHeaders={tableHeaders}
							breakdownByLabels={othersProfitByLabels}
							breakdownMethodology={props.incomeStatement?.breakdownMethodology?.['Others Profit'] ?? {}}
						/>
						{props.metrics?.incentives ? (
							<IncomeStatementByLabel
								protocolName={props.name}
								groupBy={groupBy}
								data={incentivesData}
								dataType="incentives"
								label="Incentives"
								methodology={props.incomeStatement?.methodology?.['Incentives'] ?? ''}
								tableHeaders={tableHeaders}
								breakdownByLabels={incentivesByLabels}
								breakdownMethodology={props.incomeStatement?.breakdownMethodology?.['Incentives'] ?? {}}
							/>
						) : null}
						<IncomeStatementByLabel
							protocolName={props.name}
							groupBy={groupBy}
							data={earningsData}
							dataType="earnings"
							label="Earnings"
							methodology={props.incomeStatement?.methodology?.['Earnings'] ?? ''}
							tableHeaders={tableHeaders}
							breakdownByLabels={[]}
							breakdownMethodology={{}}
						/>
						<IncomeStatementByLabel
							protocolName={props.name}
							groupBy={groupBy}
							data={tokenHolderNetIncomeData}
							dataType="token holder net income"
							label="Token Holder Net Income"
							methodology={props.incomeStatement?.methodology?.['Token Holder Net Income'] ?? ''}
							tableHeaders={tableHeaders}
							breakdownByLabels={tokenHolderNetIncomeByLabels}
							breakdownMethodology={props.incomeStatement?.breakdownMethodology?.['Token Holder Net Income'] ?? {}}
						/>
						{props.incomeStatement?.hasOtherTokenHolderFlows ? (
							<IncomeStatementByLabel
								protocolName={props.name}
								groupBy={groupBy}
								data={othersTokenHolderFlowsData}
								dataType="others token holder flows"
								label="Others Token Holder Flows"
								methodology={props.incomeStatement?.methodology?.['Others Token Holder Flows'] ?? ''}
								tableHeaders={tableHeaders}
								breakdownByLabels={othersTokenHolderFlowsByLabels}
								breakdownMethodology={props.incomeStatement?.breakdownMethodology?.['Others Token Holder Flows'] ?? {}}
							/>
						) : null}
					</tbody>
				</table>
			</div>

			{/* Sankey Chart Section */}
			<div className="border-t border-(--cards-border) pt-4">
				{sankeyData.nodes.length > 0 ? (
					<Suspense
						fallback={
							<div className="flex h-[450px] items-center justify-center text-(--text-secondary)">Loading chart...</div>
						}
					>
						<SankeyChart
							nodes={sankeyData.nodes}
							links={sankeyData.links}
							height="450px"
							title="Income Flow Visualization"
							enableImageExport
							imageExportFilename={`${props.name}-income-statement`}
							imageExportTitle={`Income Statement for ${props.name}`}
							customComponents={
								<div className="flex items-center gap-2">
									<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
										{incomeStatementGroupByOptions.map((groupOption) => (
											<button
												key={`sankey-group-${groupOption}`}
												className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
												data-active={groupOption === sankeyGroupBy}
												onClick={() => {
													setSankeyGroupBy(groupOption)
													setSelectedSankeyPeriod(null)
												}}
											>
												{groupOption}
											</button>
										))}
									</div>
									{sankeyPeriodOptions.length > 0 && (
										<Select
											allValues={sankeyPeriodOptions.map((option, idx) => ({
												key: option.key,
												name: idx === 0 ? `${option.label} *` : option.label
											}))}
											selectedValues={validSankeyPeriod ?? ''}
											setSelectedValues={(value) => setSelectedSankeyPeriod(value as string)}
											label={sankeyPeriodOptions.find((o) => o.key === validSankeyPeriod)?.label ?? 'Select Period'}
											labelType="none"
											triggerProps={{
												className:
													'flex cursor-pointer flex-nowrap items-center gap-2 rounded-md border border-(--form-control-border) bg-(--cards-bg) px-2 py-1 text-sm text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)'
											}}
										/>
									)}
								</div>
							}
						/>
					</Suspense>
				) : (
					<div className="flex h-[200px] items-center justify-center text-(--text-secondary)">
						No data available for the selected period
					</div>
				)}
			</div>
		</div>
	)
}

const IncomeStatementByLabel = ({
	protocolName,
	groupBy,
	data,
	dataType,
	label,
	methodology,
	tableHeaders,
	breakdownByLabels,
	breakdownMethodology
}: {
	protocolName: string
	groupBy: 'Yearly' | 'Quarterly' | 'Monthly'
	data: Record<string, { value: number; 'by-label': Record<string, number> }>
	dataType:
		| 'gross protocol revenue'
		| 'cost of revenue'
		| 'gross profit'
		| 'others profit'
		| 'incentives'
		| 'earnings'
		| 'token holder net income'
		| 'others token holder flows'
	label: string
	methodology: string
	tableHeaders: [string, string, number][]
	breakdownByLabels: string[]
	breakdownMethodology: Record<string, string>
}) => {
	const isEarnings = dataType === 'earnings'
	return (
		<>
			<tr>
				<th className="w-[36%] overflow-hidden border border-black/10 bg-(--cards-bg) p-2 text-left font-semibold text-ellipsis whitespace-nowrap first:sticky first:left-0 first:z-10 dark:border-white/10">
					{methodology ? (
						<Tooltip
							content={methodology}
							className="flex items-center justify-start gap-1 underline decoration-black/60 decoration-dotted dark:decoration-white/60"
						>
							{label}
							<Icon name="help-circle" height={14} width={14} className="relative top-0.25 shrink-0" />
						</Tooltip>
					) : (
						<>{label}</>
					)}
				</th>
				{tableHeaders.map((header, i) => (
					<td
						key={`${protocolName}-${groupBy}-${dataType}-${header[0]}`}
						className={`overflow-hidden border border-black/10 p-2 text-left font-medium text-ellipsis whitespace-nowrap dark:border-white/10 ${isEarnings ? (data[header[0]]?.value >= 0 ? 'text-(--success)' : 'text-(--error)') : ''}`}
					>
						{data[header[0]]?.value == null ? null : i !== 0 && tableHeaders[i + 1] ? (
							<Tooltip
								content={
									<PerformanceTooltipContent
										currentValue={data[header[0]].value}
										previousValue={tableHeaders[i + 1] ? data[tableHeaders[i + 1][0]].value : null}
										groupBy={groupBy}
										dataType={dataType}
									/>
								}
								className={`justify-start underline decoration-dotted ${isEarnings ? (data[header[0]]?.value >= 0 ? 'decoration-(--success)/60' : 'decoration-(--error)/60') : 'decoration-black/60 dark:decoration-white/60'}`}
							>
								{formattedNum(data[header[0]].value, true)}
							</Tooltip>
						) : (
							<>{formattedNum(data[header[0]].value, true)}</>
						)}
					</td>
				))}
			</tr>
			{breakdownByLabels.length > 0 ? (
				<>
					{breakdownByLabels.map((breakdownlabel) => (
						<tr key={`${protocolName}-${groupBy}-${dataType}-${breakdownlabel}`} className="text-(--text-secondary)">
							<th className="w-[36%] overflow-hidden border border-black/10 bg-(--cards-bg) p-2 pl-4 text-left font-normal text-ellipsis whitespace-nowrap italic first:sticky first:left-0 first:z-10 dark:border-white/10">
								{breakdownMethodology[breakdownlabel] ? (
									<Tooltip
										content={breakdownMethodology[breakdownlabel]}
										className="flex justify-start underline decoration-black/60 decoration-dotted dark:decoration-white/60"
									>
										{breakdownlabel}
									</Tooltip>
								) : (
									<>{breakdownlabel}</>
								)}
							</th>
							{tableHeaders.map((header, i) => (
								<td
									key={`${protocolName}-${groupBy}-${dataType}-by-label-${breakdownlabel}-${header[0]}`}
									className="overflow-hidden border border-black/10 p-2 text-left font-normal text-ellipsis whitespace-nowrap dark:border-white/10"
								>
									{data[header[0]]?.['by-label']?.[breakdownlabel] == null ? null : i !== 0 &&
									  tableHeaders[i + 1] &&
									  data[tableHeaders[i + 1][0]]['by-label']?.[breakdownlabel] ? (
										<Tooltip
											content={
												<PerformanceTooltipContent
													currentValue={data[header[0]]['by-label']?.[breakdownlabel]}
													previousValue={
														tableHeaders[i + 1] ? data[tableHeaders[i + 1][0]]['by-label']?.[breakdownlabel] : null
													}
													groupBy={groupBy}
													dataType={dataType}
												/>
											}
											className="justify-start underline decoration-black/60 decoration-dotted dark:decoration-white/60"
										>
											{formattedNum(data[header[0]]['by-label']?.[breakdownlabel], true)}
										</Tooltip>
									) : (
										<>{formattedNum(data[header[0]]['by-label']?.[breakdownlabel], true)}</>
									)}
								</td>
							))}
						</tr>
					))}
				</>
			) : null}
		</>
	)
}

const PerformanceTooltipContent = ({
	currentValue,
	previousValue,
	groupBy,
	dataType
}: {
	currentValue: number
	previousValue: number
	groupBy: 'Yearly' | 'Quarterly' | 'Monthly'
	dataType:
		| 'gross protocol revenue'
		| 'cost of revenue'
		| 'gross profit'
		| 'others profit'
		| 'incentives'
		| 'earnings'
		| 'token holder net income'
		| 'others token holder flows'
}) => {
	if (previousValue == null) return null
	const valueChange = currentValue - previousValue
	const percentageChange = previousValue !== 0 ? (valueChange / Math.abs(previousValue)) * 100 : 0
	const percentageChangeText =
		percentageChange > 0
			? `+${percentageChange.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`
			: `${percentageChange.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`
	return (
		<p className="text-xs">
			<span className={`${percentageChange > 0 ? 'text-(--success)' : 'text-(--error)'}`}>
				{`${percentageChangeText}`}
			</span>{' '}
			<span>
				compared to previous {groupBy === 'Yearly' ? 'year' : groupBy === 'Quarterly' ? 'quarter' : 'month'} total{' '}
				{dataType}
			</span>
		</p>
	)
}
