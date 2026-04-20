import * as React from 'react'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'
import { ResponsiveFilterLayout } from '~/components/Filters/ResponsiveFilterLayout'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { PaginatedYieldsOptimizerTable } from '~/containers/Yields/Tables/Optimizer'
import type { IYieldsOptimizerTableRow } from '~/containers/Yields/Tables/types'
import type { FormSubmitEvent } from '~/types/forms'
import { useTokenStrategies } from './useTokenStrategies'

const TOKEN_BORROW_SECTION_ID = 'token-borrow'

type BorrowTabKey = 'use' | 'borrow'
type BorrowTabFilters = {
	selectedChains: string[] | null
	minAvailable: string
	maxAvailable: string
}

function getBorrowChainList(rows: IYieldsOptimizerTableRow[]) {
	return [...new Set(rows.map((row) => row.chains[0]).filter((chain): chain is string => Boolean(chain)))].sort()
}

function getSelectedChains(selectedChains: string[] | null, availableChains: string[]) {
	return selectedChains == null ? availableChains : selectedChains.filter((chain) => availableChains.includes(chain))
}

function formatAvailableTriggerValue(value: string) {
	const numericValue = Number(value)
	return Number.isFinite(numericValue) ? numericValue.toLocaleString() : value
}

function TokenBorrowAvailableRange({
	minAvailable,
	maxAvailable,
	setMinAvailable,
	setMaxAvailable,
	nestedMenu
}: {
	minAvailable: string
	maxAvailable: string
	setMinAvailable: React.Dispatch<React.SetStateAction<string>>
	setMaxAvailable: React.Dispatch<React.SetStateAction<string>>
	nestedMenu?: boolean
}) {
	const handleSubmit = (event: FormSubmitEvent) => {
		event.preventDefault()
		const form = event.currentTarget

		setMinAvailable(form.min?.value ?? '')
		setMaxAvailable(form.max?.value ?? '')
	}

	const handleClear = () => {
		setMinAvailable('')
		setMaxAvailable('')
	}

	const hasRange = minAvailable !== '' || maxAvailable !== ''

	return (
		<FilterBetweenRange
			name="Available"
			trigger={
				hasRange ? (
					<>
						<span>Available: </span>
						<span className="text-(--link)">{`${minAvailable !== '' ? formatAvailableTriggerValue(minAvailable) : 'min'} - ${
							maxAvailable !== '' ? formatAvailableTriggerValue(maxAvailable) : 'max'
						}`}</span>
					</>
				) : (
					<span>Available</span>
				)
			}
			variant="secondary"
			onSubmit={handleSubmit}
			onClear={handleClear}
			nestedMenu={nestedMenu}
			min={minAvailable}
			max={maxAvailable}
			minLabel="Min Available"
			maxLabel="Max Available"
			minInputProps={{ inputMode: 'decimal', placeholder: '0' }}
			maxInputProps={{ inputMode: 'decimal', placeholder: 'Any' }}
			placement="bottom-start"
		/>
	)
}

export function filterBorrowRows({
	rows,
	selectedChains,
	minAvailable,
	maxAvailable
}: {
	rows: IYieldsOptimizerTableRow[]
	selectedChains: string[]
	minAvailable: string
	maxAvailable: string
}) {
	const minAvailableValue = minAvailable === '' ? null : Number(minAvailable)
	const maxAvailableValue = maxAvailable === '' ? null : Number(maxAvailable)
	const chainSet = new Set(selectedChains)

	return rows.filter((row) => {
		const rowChain = row.chains[0]
		const available = row.borrow?.totalAvailableUsd ?? null

		if (selectedChains.length === 0) return false
		if (rowChain && !chainSet.has(rowChain)) return false
		if (minAvailableValue != null && (available == null || available < minAvailableValue)) return false
		if (maxAvailableValue != null && (available == null || available > maxAvailableValue)) return false

		return true
	})
}

export function TokenBorrowSection({ tokenSymbol }: { tokenSymbol: string }) {
	const [activeTab, setActiveTab] = React.useState<BorrowTabKey>('use')
	const [filtersByTab, setFiltersByTab] = React.useState<Record<BorrowTabKey, BorrowTabFilters>>({
		use: {
			selectedChains: null,
			minAvailable: '',
			maxAvailable: ''
		},
		borrow: {
			selectedChains: null,
			minAvailable: '',
			maxAvailable: ''
		}
	})
	const { data, error, isLoading } = useTokenStrategies(tokenSymbol)
	const useRows = React.useMemo(() => data?.borrowAsCollateral ?? [], [data])
	const borrowRows = React.useMemo(() => data?.borrowAsDebt ?? [], [data])
	const useChainList = React.useMemo(() => getBorrowChainList(useRows), [useRows])
	const borrowChainList = React.useMemo(() => getBorrowChainList(borrowRows), [borrowRows])

	const activeFilters = filtersByTab[activeTab]
	const rows = activeTab === 'use' ? useRows : borrowRows
	const chainList = activeTab === 'use' ? useChainList : borrowChainList
	const selectedChains = React.useMemo(
		() => getSelectedChains(activeFilters.selectedChains, chainList),
		[activeFilters.selectedChains, chainList]
	)
	const minAvailable = activeFilters.minAvailable
	const maxAvailable = activeFilters.maxAvailable

	const setSelectedChains = React.useCallback(
		(value: React.SetStateAction<string[] | null>) => {
			setFiltersByTab((prev) => ({
				...prev,
				[activeTab]: {
					...prev[activeTab],
					selectedChains: typeof value === 'function' ? value(prev[activeTab].selectedChains) : value
				}
			}))
		},
		[activeTab]
	)

	const setMinAvailable = React.useCallback(
		(value: React.SetStateAction<string>) => {
			setFiltersByTab((prev) => ({
				...prev,
				[activeTab]: {
					...prev[activeTab],
					minAvailable: typeof value === 'function' ? value(prev[activeTab].minAvailable) : value
				}
			}))
		},
		[activeTab]
	)

	const setMaxAvailable = React.useCallback(
		(value: React.SetStateAction<string>) => {
			setFiltersByTab((prev) => ({
				...prev,
				[activeTab]: {
					...prev[activeTab],
					maxAvailable: typeof value === 'function' ? value(prev[activeTab].maxAvailable) : value
				}
			}))
		},
		[activeTab]
	)

	const filteredRows = React.useMemo(
		() =>
			filterBorrowRows({
				rows,
				selectedChains,
				minAvailable,
				maxAvailable
			}),
		[maxAvailable, minAvailable, rows, selectedChains]
	)

	const hasActiveFilters = selectedChains.length !== chainList.length || minAvailable !== '' || maxAvailable !== ''
	const hasPlaceholderState = isLoading || error != null || rows.length === 0
	const tabLabel = activeTab === 'use' ? `Use ${tokenSymbol}` : `Borrow ${tokenSymbol}`
	const summaryText =
		filteredRows.length > 0 ? `Tracking ${filteredRows.length} ${filteredRows.length === 1 ? 'route' : 'routes'}` : null

	return (
		<section
			className={`flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)${
				hasPlaceholderState ? ' min-h-[80dvh] sm:min-h-[572px]' : ''
			}`}
		>
			<div className="flex flex-wrap items-start justify-between gap-3 border-b border-(--cards-border) p-3">
				<h2
					className="group relative flex min-w-0 scroll-mt-4 items-center gap-1 text-xl font-bold"
					id={TOKEN_BORROW_SECTION_ID}
				>
					Borrow
					<a
						aria-hidden="true"
						tabIndex={-1}
						href={`#${TOKEN_BORROW_SECTION_ID}`}
						className="absolute top-0 right-0 z-10 flex h-full w-full items-center"
					/>
					<Icon name="link" className="invisible h-3.5 w-3.5 group-hover:visible group-focus-visible:visible" />
				</h2>
				{!isLoading && !error && summaryText ? (
					<p className="text-sm text-(--text-secondary) sm:text-right">{summaryText}</p>
				) : null}
			</div>

			<div className="flex flex-1 flex-col gap-3 p-3">
				<div className="flex flex-wrap items-center gap-2 border-b border-(--cards-border) pb-3">
					<button
						type="button"
						onClick={() => setActiveTab('use')}
						data-selected={activeTab === 'use'}
						className="rounded-md border border-(--cards-border) px-3 py-2 text-sm font-medium transition-colors data-[selected=true]:border-(--primary) data-[selected=true]:bg-(--primary)/10 data-[selected=true]:text-(--primary)"
					>
						{`Use ${tokenSymbol}`}
					</button>
					<button
						type="button"
						onClick={() => setActiveTab('borrow')}
						data-selected={activeTab === 'borrow'}
						className="rounded-md border border-(--cards-border) px-3 py-2 text-sm font-medium transition-colors data-[selected=true]:border-(--primary) data-[selected=true]:bg-(--primary)/10 data-[selected=true]:text-(--primary)"
					>
						{`Borrow ${tokenSymbol}`}
					</button>
				</div>

				{isLoading ? (
					<div className="flex flex-1 items-center justify-center">
						<LocalLoader />
					</div>
				) : error ? (
					<div className="flex flex-1 items-center justify-center px-4 text-center">
						<p className="text-sm text-(--text-label)">{error.message}</p>
					</div>
				) : rows.length === 0 ? (
					<div className="flex flex-1 items-center justify-center px-4 text-center">
						<p className="text-sm text-(--text-label)">
							{activeTab === 'use'
								? `No borrow routes found using ${tokenSymbol} as collateral.`
								: `No routes found to borrow ${tokenSymbol} with supported collateral.`}
						</p>
					</div>
				) : (
					<>
						<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
							<div className="p-3">
								<ResponsiveFilterLayout>
									{(nestedMenu) => (
										<>
											<SelectWithCombobox
												label="Chains"
												allValues={chainList}
												selectedValues={selectedChains}
												setSelectedValues={setSelectedChains}
												nestedMenu={nestedMenu}
												labelType={selectedChains.length === chainList.length ? 'none' : 'regular'}
											/>
											<TokenBorrowAvailableRange
												minAvailable={minAvailable}
												maxAvailable={maxAvailable}
												setMinAvailable={setMinAvailable}
												setMaxAvailable={setMaxAvailable}
												nestedMenu={nestedMenu}
											/>
											{hasActiveFilters ? (
												<button
													type="button"
													onClick={() => {
														setSelectedChains(null)
														setMinAvailable('')
														setMaxAvailable('')
													}}
													className="rounded-md bg-(--btn-bg) px-3 py-2 text-xs text-(--text-primary) hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg)"
												>
													Reset filters
												</button>
											) : null}
										</>
									)}
								</ResponsiveFilterLayout>
							</div>
						</div>

						{filteredRows.length === 0 ? (
							<div className="flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
								<p className="p-2">{`No ${tabLabel.toLowerCase()} routes match current filters.`}</p>
							</div>
						) : (
							<PaginatedYieldsOptimizerTable data={filteredRows} initialPageSize={10} />
						)}
					</>
				)}
			</div>
		</section>
	)
}
