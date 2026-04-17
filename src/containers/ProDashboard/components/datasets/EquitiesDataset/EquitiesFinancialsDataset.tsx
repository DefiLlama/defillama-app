import { useQuery } from '@tanstack/react-query'
import * as React from 'react'
import { useContext, useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { fetchEquitiesStatements } from '~/containers/Equities/api'
import type { IEquitiesStatementsResponse } from '~/containers/Equities/api.types'
import { ProxyAuthTokenContext } from '~/containers/ProDashboard/queries'
import { fetchEquitiesStatementsViaProxy } from '~/containers/ProDashboard/services/fetchViaProxy'
import { abbreviateNumber } from '~/utils'
import { downloadCSV } from '~/utils/download'
import { LoadingSpinner } from '../../LoadingSpinner'
import { ProTableCSVButton } from '../../ProTable/CsvButton'

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

interface StatementTableRow {
	id: string
	label: string
	values: Array<number | null>
	depth: number
	subRows?: StatementTableRow[]
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
): StatementTableRow[] {
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

function flattenStatementRows(rows: StatementTableRow[]): StatementTableRow[] {
	const flattened: StatementTableRow[] = []
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
	row: StatementTableRow
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

const STALE_TIME = 5 * 60 * 1000

function useEquitiesStatementsData(ticker: string) {
	const authToken = useContext(ProxyAuthTokenContext)

	return useQuery({
		queryKey: ['pro-dashboard', 'equities-statements-table', ticker],
		queryFn: async () => {
			if (authToken) {
				return fetchEquitiesStatementsViaProxy(ticker, authToken)
			}
			return fetchEquitiesStatements(ticker)
		},
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false,
		retry: 1,
		enabled: Boolean(ticker)
	})
}

export function EquitiesFinancialsDataset({ ticker }: { ticker: string }) {
	const [statementType, setStatementType] = useState<StatementOption>('Income Statement')
	const [periodType, setPeriodType] = useState<PeriodOption>('Quarterly')

	const { data: statements, isLoading, error } = useEquitiesStatementsData(ticker)

	const section = statements ? statements[statementSectionMap[statementType]] : null
	const periodData = section ? section[periodKeyMap[periodType]] : null

	const rows = useMemo(
		() => (statements ? buildStatementRows(statements, statementType, periodType) : []),
		[statements, statementType, periodType]
	)

	const headerIndexes = useMemo(
		() => (periodData ? getHeaderIndexes(periodData.periods, periodData.periodEnding) : []),
		[periodData]
	)

	const hasAnyBreakdownRows = rows.some((row) => (row.subRows?.length ?? 0) > 0)

	if (!ticker) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<h3 className="text-lg font-semibold pro-text1">Equities Financials</h3>
				</div>
				<div className="flex min-h-[500px] flex-1 items-center justify-center">
					<div className="text-center pro-text2">No ticker specified</div>
				</div>
			</div>
		)
	}

	if (isLoading) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<h3 className="text-lg font-semibold pro-text1">Financials — {ticker}</h3>
				</div>
				<div className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-4">
					<LoadingSpinner />
					<p className="text-sm pro-text2">Loading financial statements...</p>
				</div>
			</div>
		)
	}

	if (error || !statements) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<h3 className="text-lg font-semibold pro-text1">Financials — {ticker}</h3>
				</div>
				<div className="flex min-h-[500px] flex-1 items-center justify-center">
					<div className="text-center pro-text2">Failed to load financial statements</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex h-full w-full flex-col p-4">
			<div className="mb-3">
				<div className="flex flex-wrap items-center justify-end gap-4">
					<h3 className="mr-auto text-lg font-semibold pro-text1">Financials — {ticker}</h3>
					<div className="flex flex-wrap items-center justify-end gap-2">
						<div className="flex items-center gap-1 rounded-md border pro-border p-0.5">
							{STATEMENT_OPTIONS.map((option) => (
								<button
									key={option}
									type="button"
									onClick={() => setStatementType(option)}
									className={`rounded px-2 py-1 text-xs font-medium transition ${
										statementType === option ? 'bg-(--primary)/10 text-(--primary)' : 'pro-text2 hover:pro-text1'
									}`}
								>
									{option}
								</button>
							))}
						</div>
						<div className="flex items-center gap-1 rounded-md border pro-border p-0.5">
							{PERIOD_OPTIONS.map((option) => (
								<button
									key={option}
									type="button"
									onClick={() => setPeriodType(option)}
									className={`rounded px-2 py-1 text-xs font-medium transition ${
										periodType === option ? 'bg-(--primary)/10 text-(--primary)' : 'pro-text2 hover:pro-text1'
									}`}
								>
									{option}
								</button>
							))}
						</div>
						<ProTableCSVButton
							onClick={() => {
								const headers = [
									'"Name"',
									...headerIndexes.map((index) => `"${formatStatementPeriodLabel(periodData!.periods[index])}"`)
								]
								const flattenedRows = flattenStatementRows(rows)
								const csvRows = flattenedRows.map((row) => [
									`"${row.depth > 0 ? '  ' + row.label : row.label}"`,
									...headerIndexes.map((index) => row.values[index] ?? '')
								])
								const csv = [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n')
								downloadCSV(
									`equities-${ticker}-${statementType.toLowerCase().replaceAll(' ', '-')}-${periodType.toLowerCase()}.csv`,
									csv,
									{ addTimestamp: true }
								)
							}}
							smol
						/>
					</div>
				</div>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full border-collapse text-sm">
					<thead>
						<tr>
							<th className="min-w-[220px] overflow-hidden border border-black/10 bg-(--app-bg) p-2 text-left font-semibold text-ellipsis whitespace-nowrap dark:border-white/10">
								Name
							</th>
							{headerIndexes.map((index) => (
								<th
									key={`${statementType}-${periodType}-${periodData!.periods[index]}`}
									className="min-w-[132px] overflow-hidden border border-black/10 bg-(--app-bg) p-2 text-left font-semibold text-ellipsis whitespace-nowrap dark:border-white/10"
								>
									{formatStatementPeriodLabel(periodData!.periods[index])}
								</th>
							))}
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
