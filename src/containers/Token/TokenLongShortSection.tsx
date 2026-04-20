import * as React from 'react'
import { ResponsiveFilterLayout } from '~/components/Filters/ResponsiveFilterLayout'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { PaginatedYieldsStrategyTableFR } from '~/containers/Yields/Tables/StrategyFR'
import type { IYieldsStrategyTableRow } from '~/containers/Yields/Tables/types'
import { useTokenStrategies } from './useTokenStrategies'

const TOKEN_LONG_SHORT_SECTION_ID = 'token-long-short'

function getLongShortChainList(rows: IYieldsStrategyTableRow[]) {
	return [...new Set(rows.map((row) => row.chains[0]).filter((chain): chain is string => Boolean(chain)))].sort()
}

export function filterLongShortRows(rows: IYieldsStrategyTableRow[], selectedChains: string[]) {
	const chainSet = new Set(selectedChains)

	return rows.filter((row) => {
		const rowChain = row.chains[0]
		if (selectedChains.length > 0 && rowChain && !chainSet.has(rowChain)) return false
		return true
	})
}

export function TokenLongShortSection({ tokenSymbol }: { tokenSymbol: string }) {
	const [selectedChains, setSelectedChains] = React.useState<string[]>([])
	const { data, error, isLoading } = useTokenStrategies(tokenSymbol)
	const rows = React.useMemo(() => data?.longShort ?? [], [data])
	const chainList = React.useMemo(() => getLongShortChainList(rows), [rows])

	React.useEffect(() => {
		setSelectedChains(chainList)
	}, [chainList])

	const filteredRows = React.useMemo(() => filterLongShortRows(rows, selectedChains), [rows, selectedChains])
	const hasActiveFilters = selectedChains.length !== chainList.length
	const hasPlaceholderState = isLoading || error != null || rows.length === 0

	return (
		<section
			className={`flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)${
				hasPlaceholderState ? ' min-h-[80dvh] sm:min-h-[572px]' : ''
			}`}
		>
			<div className="border-b border-(--cards-border) p-3">
				<h2
					className="group relative flex min-w-0 scroll-mt-4 items-center gap-1 text-xl font-bold"
					id={TOKEN_LONG_SHORT_SECTION_ID}
				>
					Long / Short Strategies
					<a
						aria-hidden="true"
						tabIndex={-1}
						href={`#${TOKEN_LONG_SHORT_SECTION_ID}`}
						className="absolute top-0 right-0 z-10 flex h-full w-full items-center"
					/>
					<Icon name="link" className="invisible h-3.5 w-3.5 group-hover:visible group-focus-visible:visible" />
				</h2>
			</div>

			<div className="flex flex-1 flex-col gap-3 p-3">
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
							{`No tracked positive-funding long / short opportunities found for ${tokenSymbol}.`}
						</p>
					</div>
				) : (
					<>
						<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
							<div className="flex flex-wrap items-center gap-2 p-3">
								<span>
									{filteredRows.length > 0
										? `Tracking ${filteredRows.length} ${filteredRows.length === 1 ? 'strategy' : 'strategies'}`
										: 'No strategies matching filters'}
								</span>
							</div>
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
											{hasActiveFilters ? (
												<button
													type="button"
													onClick={() => setSelectedChains(chainList)}
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
								<p className="p-2">No long / short strategies match current filters.</p>
							</div>
						) : (
							<PaginatedYieldsStrategyTableFR data={filteredRows} initialPageSize={10} />
						)}
					</>
				)}
			</div>
		</section>
	)
}
