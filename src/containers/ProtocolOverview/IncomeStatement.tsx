import { lazy, Suspense, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Icon } from '~/components/Icon'
import { Select } from '~/components/Select'
import { Tooltip } from '~/components/Tooltip'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formattedNum } from '~/utils'
import { IProtocolOverviewPageData } from './types'

const SankeyChart = lazy(() => import('~/components/ECharts/SankeyChart'))

const incomeStatementGroupByOptions = ['Yearly', 'Quarterly', 'Monthly'] as const

function mergeIncomeStatementData(
	data: { value: number; 'by-label': Record<string, number> },
	newData?: { value: number; 'by-label': Record<string, number> }
) {
	const current = { ...data }
	current.value += newData?.value ?? 0
	for (const label in newData?.['by-label'] ?? {}) {
		current['by-label'][label] = (current['by-label'][label] ?? 0) + newData['by-label'][label]
	}
	return current
}

export const IncomeStatement = (props: IProtocolOverviewPageData) => {
	const [feesSettings] = useLocalStorageSettingsManager('fees')
	const [groupBy, setGroupBy] = useState<(typeof incomeStatementGroupByOptions)[number]>('Quarterly')
	const [sankeyGroupBy, setSankeyGroupBy] = useState<(typeof incomeStatementGroupByOptions)[number]>('Quarterly')
	const [selectedSankeyPeriod, setSelectedSankeyPeriod] = useState<string | null>(null)

	const {
		tableHeaders,
		feesData,
		costOfRevenueData,
		revenueData,
		incentivesData,
		holdersRevenueData,
		feesByLabels,
		costOfRevenueByLabels,
		revenueByLabels,
		holdersRevenueByLabels,
		earningsData
	} = useMemo(() => {
		const groupKey = groupBy.toLowerCase()
		const tableHeaders = [] as [string, string, number][]
		const feesData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
		const revenueData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
		const incentivesData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
		const holdersRevenueData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
		const costOfRevenueData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
		const earningsData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
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

			feesData[key] = props.incomeStatement?.data?.[groupKey]?.[key]?.df ?? {
				value: 0,
				'by-label': {}
			}
			if (feesSettings.bribes) {
				feesData[key] = mergeIncomeStatementData(feesData[key], props.incomeStatement?.data?.[groupKey]?.[key]?.dbr)
			}
			if (feesSettings.tokentax) {
				feesData[key] = mergeIncomeStatementData(feesData[key], props.incomeStatement?.data?.[groupKey]?.[key]?.dtt)
			}

			costOfRevenueData[key] = props.incomeStatement?.data?.[groupKey]?.[key]?.dssr ?? {
				value: 0,
				'by-label': {}
			}

			revenueData[key] = props.incomeStatement?.data?.[groupKey]?.[key]?.dr ?? {
				value: 0,
				'by-label': {}
			}
			if (feesSettings.bribes) {
				revenueData[key] = mergeIncomeStatementData(
					revenueData[key],
					props.incomeStatement?.data?.[groupKey]?.[key]?.dbr
				)
			}
			if (feesSettings.tokentax) {
				revenueData[key] = mergeIncomeStatementData(
					revenueData[key],
					props.incomeStatement?.data?.[groupKey]?.[key]?.dtt
				)
			}

			incentivesData[key] = props.incomeStatement?.data?.[groupKey]?.[key]?.incentives ?? {
				value: 0,
				'by-label': {}
			}

			holdersRevenueData[key] = props.incomeStatement?.data?.[groupKey]?.[key]?.dhr ?? {
				value: 0,
				'by-label': {}
			}
			if (feesSettings.bribes) {
				holdersRevenueData[key] = mergeIncomeStatementData(
					holdersRevenueData[key],
					props.incomeStatement?.data?.[groupKey]?.[key]?.dbr
				)
			}
			if (feesSettings.tokentax) {
				holdersRevenueData[key] = mergeIncomeStatementData(
					holdersRevenueData[key],
					props.incomeStatement?.data?.[groupKey]?.[key]?.dtt
				)
			}

			earningsData[key] = props.incomeStatement?.data?.[groupKey]?.[key]?.earnings ?? {
				value: 0,
				'by-label': {}
			}
			if (feesSettings.bribes) {
				earningsData[key] = mergeIncomeStatementData(
					earningsData[key],
					props.incomeStatement?.data?.[groupKey]?.[key]?.dbr
				)
			}
			if (feesSettings.tokentax) {
				earningsData[key] = mergeIncomeStatementData(
					earningsData[key],
					props.incomeStatement?.data?.[groupKey]?.[key]?.dtt
				)
			}
		}

		return {
			tableHeaders: tableHeaders.sort((a, b) => b[2] - a[2]),
			feesData,
			costOfRevenueData,
			revenueData,
			incentivesData,
			holdersRevenueData,
			feesByLabels: props.incomeStatement?.labelsByType?.df ?? [],
			costOfRevenueByLabels: props.incomeStatement?.labelsByType?.dssr ?? [],
			revenueByLabels: props.incomeStatement?.labelsByType?.dr ?? [],
			holdersRevenueByLabels: props.incomeStatement?.labelsByType?.dhr ?? [],
			earningsData
		}
	}, [groupBy, props.incomeStatement, feesSettings])

	// Compute Sankey chart data for the selected period
	const { sankeyData, sankeyPeriodOptions } = useMemo(() => {
		const sankeyGroupKey = sankeyGroupBy.toLowerCase()
		const sankeyHeaders = [] as [string, string, number][]
		const sankeyFeesData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
		const sankeyCostOfRevenueData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
		const sankeyRevenueData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
		const sankeyIncentivesData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
		const sankeyHoldersRevenueData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>
		const sankeyEarningsData = {} as Record<string, { value: number; 'by-label': Record<string, number> }>

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

			sankeyFeesData[key] = props.incomeStatement?.data?.[sankeyGroupKey]?.[key]?.df ?? { value: 0, 'by-label': {} }
			if (feesSettings.bribes) {
				sankeyFeesData[key] = mergeIncomeStatementData(
					sankeyFeesData[key],
					props.incomeStatement?.data?.[sankeyGroupKey]?.[key]?.dbr
				)
			}
			if (feesSettings.tokentax) {
				sankeyFeesData[key] = mergeIncomeStatementData(
					sankeyFeesData[key],
					props.incomeStatement?.data?.[sankeyGroupKey]?.[key]?.dtt
				)
			}

			sankeyCostOfRevenueData[key] = props.incomeStatement?.data?.[sankeyGroupKey]?.[key]?.dssr ?? {
				value: 0,
				'by-label': {}
			}

			sankeyRevenueData[key] = props.incomeStatement?.data?.[sankeyGroupKey]?.[key]?.dr ?? { value: 0, 'by-label': {} }
			if (feesSettings.bribes) {
				sankeyRevenueData[key] = mergeIncomeStatementData(
					sankeyRevenueData[key],
					props.incomeStatement?.data?.[sankeyGroupKey]?.[key]?.dbr
				)
			}
			if (feesSettings.tokentax) {
				sankeyRevenueData[key] = mergeIncomeStatementData(
					sankeyRevenueData[key],
					props.incomeStatement?.data?.[sankeyGroupKey]?.[key]?.dtt
				)
			}

			sankeyIncentivesData[key] = props.incomeStatement?.data?.[sankeyGroupKey]?.[key]?.incentives ?? {
				value: 0,
				'by-label': {}
			}

			sankeyHoldersRevenueData[key] = props.incomeStatement?.data?.[sankeyGroupKey]?.[key]?.dhr ?? {
				value: 0,
				'by-label': {}
			}
			if (feesSettings.bribes) {
				sankeyHoldersRevenueData[key] = mergeIncomeStatementData(
					sankeyHoldersRevenueData[key],
					props.incomeStatement?.data?.[sankeyGroupKey]?.[key]?.dbr
				)
			}
			if (feesSettings.tokentax) {
				sankeyHoldersRevenueData[key] = mergeIncomeStatementData(
					sankeyHoldersRevenueData[key],
					props.incomeStatement?.data?.[sankeyGroupKey]?.[key]?.dtt
				)
			}

			sankeyEarningsData[key] = props.incomeStatement?.data?.[sankeyGroupKey]?.[key]?.earnings ?? {
				value: 0,
				'by-label': {}
			}
			if (feesSettings.bribes) {
				sankeyEarningsData[key] = mergeIncomeStatementData(
					sankeyEarningsData[key],
					props.incomeStatement?.data?.[sankeyGroupKey]?.[key]?.dbr
				)
			}
			if (feesSettings.tokentax) {
				sankeyEarningsData[key] = mergeIncomeStatementData(
					sankeyEarningsData[key],
					props.incomeStatement?.data?.[sankeyGroupKey]?.[key]?.dtt
				)
			}
		}

		const sortedSankeyHeaders = sankeyHeaders.sort((a, b) => b[2] - a[2])
		const periodOptions = sortedSankeyHeaders.map((h) => ({ key: h[0], label: h[1] }))

		if (sortedSankeyHeaders.length === 0) return { sankeyData: { nodes: [], links: [] }, sankeyPeriodOptions: [] }

		// Use selected period or default to most recent complete period (index 1, since 0 is incomplete)
		const periodKey = selectedSankeyPeriod ?? sortedSankeyHeaders[1]?.[0] ?? sortedSankeyHeaders[0]?.[0]
		const periodLabel =
			sortedSankeyHeaders.find((h) => h[0] === periodKey)?.[1] ??
			sortedSankeyHeaders[1]?.[1] ??
			sortedSankeyHeaders[0]?.[1]
		if (!periodKey) return { sankeyData: { nodes: [], links: [] }, sankeyPeriodOptions: periodOptions }

		const fees = sankeyFeesData[periodKey]?.value ?? 0
		const costOfRevenue = sankeyCostOfRevenueData[periodKey]?.value ?? 0
		const revenue = sankeyRevenueData[periodKey]?.value ?? 0
		const incentives = sankeyIncentivesData[periodKey]?.value ?? 0
		const earnings = sankeyEarningsData[periodKey]?.value ?? 0
		const holdersRevenue = sankeyHoldersRevenueData[periodKey]?.value ?? 0

		// Get breakdown by labels for fees
		const feesByLabelData = sankeyFeesData[periodKey]?.['by-label'] ?? {}
		const costOfRevenueByLabelData = sankeyCostOfRevenueData[periodKey]?.['by-label'] ?? {}

		// Get methodology/descriptions for labels
		const feesMethodology = props.incomeStatement?.methodologyByType?.['Fees'] ?? {}
		const costOfRevenueMethodology = props.incomeStatement?.methodologyByType?.['SupplySideRevenue'] ?? {}

		const nodes: Array<{
			name: string
			color?: string
			description?: string
			displayValue?: number | string
			depth?: number
		}> = []
		const links: Array<{ source: string; target: string; value: number; color?: string }> = []

		// Colors: gray for neutral/input, green for profit, red for costs
		const COLORS = {
			gray: '#6b7280',
			green: '#22c55e',
			red: '#ef4444'
		}

		// Only add fee breakdown nodes if breakdown labels are available
		if (Object.keys(feesByLabelData).length > 0) {
			nodes.push({
				name: 'Gross Protocol Revenue',
				color: COLORS.gray,
				description: props.fees?.methodology,
				depth: 1
			})
			for (const [label, value] of Object.entries(feesByLabelData)) {
				if (value > 0) {
					nodes.push({
						name: label,
						color: COLORS.gray,
						description: feesMethodology[label],
						depth: 0
					})
					links.push({ source: label, target: 'Gross Protocol Revenue', value })
				}
			}
		} else if (fees > 0) {
			// No breakdown available, start from Gross Protocol Revenue directly
			nodes.push({
				name: 'Gross Protocol Revenue',
				color: COLORS.gray,
				description: props.fees?.methodology,
				depth: 1
			})
		}

		if (costOfRevenue > 0) {
			nodes.push({
				name: 'Cost of Revenue',
				color: COLORS.red,
				description: props.supplySideRevenue?.methodology,
				depth: 2
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
							description: costOfRevenueMethodology[label],
							depth: 3
						})
						links.push({ source: 'Cost of Revenue', target: costLabel, value })
					}
				}
			}
		}

		if (revenue > 0) {
			const hasIncentives = incentives > 0 && props.metrics?.incentives

			nodes.push({
				name: 'Gross Profit',
				color: COLORS.green,
				description: props.revenue?.methodology,
				depth: 2
			})
			links.push({ source: 'Gross Protocol Revenue', target: 'Gross Profit', value: revenue })

			if (hasIncentives) {
				// Incentives is at the same depth as Gross Profit so both flow horizontally into Earnings
				nodes.push({
					name: 'Incentives',
					color: COLORS.red,
					description: props.incentives?.methodology,
					depth: 2 // Same depth as Gross Profit
				})

				// Both Gross Profit and Incentives flow into Earnings
				nodes.push({
					name: 'Earnings',
					color: earnings >= 0 ? COLORS.green : COLORS.red,
					description: `Gross Profit (${formattedNum(revenue, true)}) minus Incentives (${formattedNum(incentives, true)})`,
					displayValue: earnings, // Show actual earnings value, not the sum of flows
					depth: 3
				})

				// Gross Profit flows to Earnings (green)
				links.push({ source: 'Gross Profit', target: 'Earnings', value: revenue, color: COLORS.green })
				// Incentives flows to Earnings (red - as a cost being subtracted)
				links.push({ source: 'Incentives', target: 'Earnings', value: incentives, color: COLORS.red })

				if (earnings > 0 && holdersRevenue > 0) {
					nodes.push({
						name: 'Value Distributed to Token Holders',
						color: COLORS.green,
						description: props.holdersRevenue?.methodology,
						depth: 4
					})
					links.push({ source: 'Earnings', target: 'Value Distributed to Token Holders', value: holdersRevenue })
				}
			} else {
				// No incentives: Gross Profit flows directly to Earnings
				if (earnings > 0) {
					nodes.push({
						name: 'Earnings',
						color: COLORS.green,
						description: props.revenue?.methodology,
						depth: 3
					})
					links.push({ source: 'Gross Profit', target: 'Earnings', value: earnings })

					if (holdersRevenue > 0) {
						nodes.push({
							name: 'Value Distributed to Token Holders',
							color: COLORS.green,
							description: props.holdersRevenue?.methodology,
							depth: 4
						})
						links.push({ source: 'Earnings', target: 'Value Distributed to Token Holders', value: holdersRevenue })
					}
				}
			}
		}

		return {
			sankeyData: { nodes, links, periodLabel },
			sankeyPeriodOptions: periodOptions
		}
	}, [
		sankeyGroupBy,
		selectedSankeyPeriod,
		props.incomeStatement,
		feesSettings,
		props.metrics?.incentives,
		props.fees?.methodology,
		props.supplySideRevenue?.methodology,
		props.revenue?.methodology,
		props.holdersRevenue?.methodology,
		props.incentives?.methodology
	])

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
							data={feesData}
							dataType="fees"
							label="Gross Protocol Revenue"
							methodology={props.fees?.methodology ?? ''}
							tableHeaders={tableHeaders}
							breakdownByLabels={feesByLabels}
							methodologyByType={props.incomeStatement?.methodologyByType?.['Fees'] ?? {}}
						/>
						<IncomeStatementByLabel
							protocolName={props.name}
							groupBy={groupBy}
							data={costOfRevenueData}
							dataType="cost of revenue"
							label="Cost of Revenue"
							methodology={props.supplySideRevenue?.methodology ?? ''}
							tableHeaders={tableHeaders}
							breakdownByLabels={costOfRevenueByLabels}
							methodologyByType={props.incomeStatement?.methodologyByType?.['SupplySideRevenue'] ?? {}}
						/>
						<IncomeStatementByLabel
							protocolName={props.name}
							groupBy={groupBy}
							data={revenueData}
							dataType="revenue"
							label="Gross Profit"
							methodology={props.revenue?.methodology ?? ''}
							tableHeaders={tableHeaders}
							breakdownByLabels={[]}
							methodologyByType={props.incomeStatement?.methodologyByType?.['Revenue'] ?? {}}
						/>
						{props.metrics?.incentives ? (
							<IncomeStatementByLabel
								protocolName={props.name}
								groupBy={groupBy}
								data={incentivesData}
								dataType="incentives"
								label="Incentives"
								methodology={props.incentives?.methodology ?? ''}
								tableHeaders={tableHeaders}
								breakdownByLabels={[]}
								methodologyByType={{}}
							/>
						) : null}
						<IncomeStatementByLabel
							protocolName={props.name}
							groupBy={groupBy}
							data={earningsData}
							dataType="earnings"
							label="Earnings"
							methodology={'Gross Profit minus Incentives'}
							tableHeaders={tableHeaders}
							breakdownByLabels={[]}
							methodologyByType={{}}
						/>
						<IncomeStatementByLabel
							protocolName={props.name}
							groupBy={groupBy}
							data={holdersRevenueData}
							dataType="token holders net income"
							label="Token Holder Net Income"
							methodology={props.holdersRevenue?.methodology ?? ''}
							tableHeaders={tableHeaders}
							breakdownByLabels={holdersRevenueByLabels}
							methodologyByType={props.incomeStatement?.methodologyByType?.['HoldersRevenue'] ?? {}}
						/>
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
											selectedValues={
												selectedSankeyPeriod ?? sankeyPeriodOptions[1]?.key ?? sankeyPeriodOptions[0]?.key ?? ''
											}
											setSelectedValues={(value) => setSelectedSankeyPeriod(value as string)}
											label={
												sankeyPeriodOptions.find(
													(o) =>
														o.key ===
														(selectedSankeyPeriod ?? sankeyPeriodOptions[1]?.key ?? sankeyPeriodOptions[0]?.key)
												)?.label ?? 'Select Period'
											}
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
	methodologyByType
}: {
	protocolName: string
	groupBy: 'Yearly' | 'Quarterly' | 'Monthly'
	data: Record<string, { value: number; 'by-label': Record<string, number> }>
	dataType: 'fees' | 'revenue' | 'incentives' | 'earnings' | 'token holders net income' | 'cost of revenue'
	label: string
	methodology: string
	tableHeaders: [string, string, number][]
	breakdownByLabels: string[]
	methodologyByType: Record<string, string>
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
								{methodologyByType[breakdownlabel] ? (
									<Tooltip
										content={methodologyByType[breakdownlabel]}
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
	dataType: 'fees' | 'revenue' | 'incentives' | 'earnings' | 'token holders net income' | 'cost of revenue'
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
