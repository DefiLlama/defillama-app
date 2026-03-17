import { startTransition, useMemo, useState } from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { TagGroup } from '~/components/TagGroup'
import { Tooltip } from '~/components/Tooltip'
import { abbreviateNumber } from '~/utils'
import type { IEquitiesStatementsResponse } from './api.types'
import type { IEquitiesStatementTableRow } from './types'

const STATEMENT_OPTIONS = ['Income Statement', 'Balance Sheet', 'Cash Flow'] as const
const PERIOD_OPTIONS = ['Quarterly', 'Annual'] as const

type StatementOption = (typeof STATEMENT_OPTIONS)[number]
type PeriodOption = (typeof PERIOD_OPTIONS)[number]
type StatementSectionKey = 'incomeStatement' | 'balanceSheet' | 'cashflow'
type StatementPeriodKey = 'quarterly' | 'annual'

const statementSectionMap: Record<StatementOption, StatementSectionKey> = {
	'Income Statement': 'incomeStatement',
	'Balance Sheet': 'balanceSheet',
	'Cash Flow': 'cashflow'
}

const periodKeyMap: Record<PeriodOption, StatementPeriodKey> = {
	Quarterly: 'quarterly',
	Annual: 'annual'
}

function formatCellValue(label: string, value: number | null): string {
	return value == null
		? '-'
		: label === 'Weighted Average Shares Basic' || label === 'Weighted Average Shares Diluted'
			? (abbreviateNumber(value, 2) ?? '0')
			: (abbreviateNumber(value, 2, '$') ?? '$0')
}

function buildStatementRows(
	statements: IEquitiesStatementsResponse,
	statementType: StatementOption,
	periodType: PeriodOption
): IEquitiesStatementTableRow[] {
	const section = statements[statementSectionMap[statementType]]
	const periodData = section[periodKeyMap[periodType]]
	const childrenMeta = section.children[periodKeyMap[periodType]]

	return section.labels.map((label, rowIndex) => {
		const childLabels = childrenMeta[label]?.labels ?? []
		const childValues = periodData.children[label]?.values ?? []

		return {
			id: label,
			label,
			values: periodData.values[rowIndex] ?? [],
			depth: 0,
			subRows:
				childLabels.length > 0
					? childLabels.map((childLabel, childIndex) => ({
							id: `${label}-${childLabel}`,
							label: childLabel,
							values: childValues[childIndex] ?? [],
							depth: 1
						}))
					: undefined
		}
	})
}

function getHeaderIndexes(periods: string[], periodEnding: string[]): number[] {
	return periods
		.map((_, index) => index)
		.sort((a, b) => {
			const aTime = new Date(`${periodEnding[a] ?? ''}T00:00:00Z`).getTime()
			const bTime = new Date(`${periodEnding[b] ?? ''}T00:00:00Z`).getTime()
			return bTime - aTime
		})
}

function formatStatementPeriodLabel(period: string): string {
	return period.replaceAll('-', ' ')
}

function flattenStatementRows(rows: IEquitiesStatementTableRow[]): IEquitiesStatementTableRow[] {
	const flattened: IEquitiesStatementTableRow[] = []

	for (const row of rows) {
		flattened.push(row)
		if (row.subRows?.length) {
			flattened.push(...row.subRows)
		}
	}

	return flattened
}

function FinancialRow({
	row,
	headerIndexes,
	showExpandPlaceholder
}: {
	row: IEquitiesStatementTableRow
	headerIndexes: number[]
	showExpandPlaceholder: boolean
}) {
	const hasSubRows = Boolean(row.subRows?.length)
	const [isExpanded, setIsExpanded] = useState(true)

	return (
		<>
			<tr className="group">
				<th className="w-[28%] overflow-hidden border border-black/10 bg-(--cards-bg) p-2 text-left font-semibold text-ellipsis whitespace-nowrap group-hover:bg-(--link-hover-bg) dark:border-white/10">
					<div
						className="flex items-center gap-1"
						onClick={(event) => {
							if (!hasSubRows) return
							event.stopPropagation()
							setIsExpanded((expanded) => !expanded)
						}}
					>
						{hasSubRows ? (
							<button
								type="button"
								aria-expanded={isExpanded}
								aria-label={`${isExpanded ? 'Hide' : 'Show'} ${row.label} breakdown`}
								onClick={(event) => {
									event.stopPropagation()
									setIsExpanded((expanded) => !expanded)
								}}
								className="-ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-(--text-secondary) transition-transform hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
							>
								<Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} height={14} width={14} />
							</button>
						) : showExpandPlaceholder ? (
							<span aria-hidden="true" className="-ml-1 block h-5 w-5 shrink-0" />
						) : null}
						<span className="overflow-hidden text-ellipsis whitespace-nowrap">{row.label}</span>
					</div>
				</th>
				{headerIndexes.map((index) => (
					<td
						key={`${row.id}-${index}`}
						className="overflow-hidden border border-black/10 p-2 text-left font-medium text-ellipsis whitespace-nowrap group-hover:bg-(--link-hover-bg) dark:border-white/10"
					>
						{formatCellValue(row.label, row.values[index] ?? null)}
					</td>
				))}
			</tr>
			{hasSubRows && isExpanded
				? row.subRows?.map((subRow) => (
						<tr key={subRow.id} className="group text-(--text-secondary)">
							<th className="w-[28%] overflow-hidden border border-black/10 bg-(--cards-bg) p-2 pl-9 text-left font-normal text-ellipsis whitespace-nowrap italic group-hover:bg-(--link-hover-bg) dark:border-white/10">
								<span className="overflow-hidden text-ellipsis whitespace-nowrap">{subRow.label}</span>
							</th>
							{headerIndexes.map((index) => (
								<td
									key={`${subRow.id}-${index}`}
									className="overflow-hidden border border-black/10 p-2 text-left font-normal text-ellipsis whitespace-nowrap group-hover:bg-(--link-hover-bg) dark:border-white/10"
								>
									{formatCellValue(subRow.label, subRow.values[index] ?? null)}
								</td>
							))}
						</tr>
					))
				: null}
		</>
	)
}

export function EquitiesFinancialsTable({ statements }: { statements: IEquitiesStatementsResponse }) {
	const [statementType, setStatementType] = useState<StatementOption>('Income Statement')
	const [periodType, setPeriodType] = useState<PeriodOption>('Quarterly')

	const section = statements[statementSectionMap[statementType]]
	const periodData = section[periodKeyMap[periodType]]
	const rows = useMemo(
		() => buildStatementRows(statements, statementType, periodType),
		[statements, statementType, periodType]
	)
	const headerIndexes = useMemo(
		() => getHeaderIndexes(periodData.periods, periodData.periodEnding),
		[periodData.periodEnding, periodData.periods]
	)
	const hasAnyBreakdownRows = rows.some((row) => (row.subRows?.length ?? 0) > 0)
	const prepareCsv = () => {
		const headers = ['Name', ...headerIndexes.map((index) => formatStatementPeriodLabel(periodData.periods[index]))]
		const flattenedRows = flattenStatementRows(rows)
		const csvRows = flattenedRows.map((row) => [
			row.depth > 0 ? `  ${row.label}` : row.label,
			...headerIndexes.map((index) => row.values[index] ?? '')
		])

		return {
			filename: `equities-${statementType.toLowerCase().replaceAll(' ', '-')}-${periodType.toLowerCase()}`,
			rows: [headers, ...csvRows]
		}
	}

	return (
		<div className="col-span-full flex flex-col gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:p-4">
			<div className="flex flex-wrap items-center justify-between gap-1">
				<h2 className="text-base font-semibold">Financials</h2>
				<div className="ml-auto flex flex-wrap items-center gap-2">
					<TagGroup
						selectedValue={statementType}
						setValue={(value) => startTransition(() => setStatementType(value))}
						values={STATEMENT_OPTIONS}
					/>
					<TagGroup
						selectedValue={periodType}
						setValue={(value) => startTransition(() => setPeriodType(value))}
						values={PERIOD_OPTIONS}
					/>
					<CSVDownloadButton prepareCsv={prepareCsv} smol />
				</div>
			</div>

			<div className="relative overflow-x-auto">
				<div className="pointer-events-none sticky left-0 z-0 h-0 w-full max-sm:hidden" style={{ top: '50%' }}>
					<img
						src="/assets/defillama-dark-neutral.webp"
						alt="defillama"
						height={53}
						width={155}
						className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30 dark:hidden"
					/>
					<img
						src="/assets/defillama-light-neutral.webp"
						alt="defillama"
						height={53}
						width={155}
						className="absolute left-1/2 hidden -translate-x-1/2 -translate-y-1/2 opacity-30 dark:block"
					/>
				</div>
				<table className="z-10 w-full border-collapse">
					<thead>
						<tr>
							<th className="min-w-[220px] overflow-hidden border border-black/10 bg-(--app-bg) p-2 text-left font-semibold text-ellipsis whitespace-nowrap dark:border-white/10">
								Name
							</th>
							{headerIndexes.map((index, position) => {
								let tooltipContent = `Ends at ${periodData.periodEnding[index]}`
								const previousIndex = headerIndexes[position + 1]

								if (previousIndex !== undefined) {
									const startDate = new Date(`${periodData.periodEnding[previousIndex]}T00:00:00Z`)
									startDate.setUTCDate(startDate.getUTCDate() + 1)
									tooltipContent = `From ${startDate.toISOString().slice(0, 10)} till ${periodData.periodEnding[index]}`
								}

								return (
									<th
										key={`${statementType}-${periodType}-${periodData.periods[index]}`}
										className="min-w-[132px] overflow-hidden border border-black/10 bg-(--app-bg) p-2 text-left font-semibold text-ellipsis whitespace-nowrap dark:border-white/10"
									>
										<Tooltip content={tooltipContent}>
											<span className="underline decoration-dotted underline-offset-3">
												{formatStatementPeriodLabel(periodData.periods[index])}
											</span>
										</Tooltip>
									</th>
								)
							})}
						</tr>
					</thead>
					<tbody>
						{rows.map((row) => (
							<FinancialRow
								key={row.id}
								row={row}
								headerIndexes={headerIndexes}
								showExpandPlaceholder={hasAnyBreakdownRows}
							/>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
