import * as React from 'react'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'
import { ResponsiveFilterLayout } from '~/components/Filters/ResponsiveFilterLayout'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { attributeOptions } from '~/containers/Yields/Filters/Attributes'
import { PaginatedYieldsStrategyTableFR } from '~/containers/Yields/Tables/StrategyFR'
import type { IYieldsStrategyTableRow } from '~/containers/Yields/Tables/types'
import { filterPool } from '~/containers/Yields/utils'
import type { FormSubmitEvent } from '~/types/forms'
import { useTokenStrategies } from './useTokenStrategies'

const TOKEN_LONG_SHORT_SECTION_ID = 'token-long-short'
const LONG_SHORT_ATTRIBUTE_KEYS = new Set([
	'stablecoins',
	'single_exposure',
	'multi_exposure',
	'no_il',
	'no_memecoins',
	'million_dollar',
	'million_dollar_farm',
	'audited',
	'no_outlier',
	'stable_outlook',
	'high_confidence',
	'no_bad_debt_',
	'no_lockup_collateral',
	'airdrop',
	'apy_zero',
	'lsd_only'
])
const LONG_SHORT_ATTRIBUTE_OPTIONS = attributeOptions.filter((option) => LONG_SHORT_ATTRIBUTE_KEYS.has(option.key))
const DEFAULT_LONG_SHORT_ATTRIBUTES = ['single_exposure', 'no_il']

function getLongShortChainList(rows: IYieldsStrategyTableRow[]) {
	return [...new Set(rows.map((row) => row.chains[0]).filter((chain): chain is string => Boolean(chain)))].sort()
}

function getSelectedChains(selectedChains: string[] | null, availableChains: string[]) {
	return selectedChains == null ? availableChains : selectedChains.filter((chain) => availableChains.includes(chain))
}

function hasDefaultLongShortAttributes(selectedAttributes: string[]) {
	return (
		selectedAttributes.length === DEFAULT_LONG_SHORT_ATTRIBUTES.length &&
		DEFAULT_LONG_SHORT_ATTRIBUTES.every((attribute) => selectedAttributes.includes(attribute))
	)
}

function formatRangeTriggerValue(value: string) {
	const numericValue = Number(value)
	return Number.isFinite(numericValue) ? numericValue.toLocaleString() : value
}

function TokenLongShortTvlRange({
	minTvl,
	maxTvl,
	setMinTvl,
	setMaxTvl,
	nestedMenu
}: {
	minTvl: string
	maxTvl: string
	setMinTvl: React.Dispatch<React.SetStateAction<string>>
	setMaxTvl: React.Dispatch<React.SetStateAction<string>>
	nestedMenu?: boolean
}) {
	const handleSubmit = (event: FormSubmitEvent) => {
		event.preventDefault()
		const form = event.currentTarget

		setMinTvl(form.min?.value ?? '')
		setMaxTvl(form.max?.value ?? '')
	}

	const handleClear = () => {
		setMinTvl('')
		setMaxTvl('')
	}

	const hasRange = minTvl !== '' || maxTvl !== ''

	return (
		<FilterBetweenRange
			name="TVL Range"
			trigger={
				hasRange ? (
					<>
						<span>TVL: </span>
						<span className="text-(--link)">{`${minTvl !== '' ? formatRangeTriggerValue(minTvl) : 'min'} - ${
							maxTvl !== '' ? formatRangeTriggerValue(maxTvl) : 'max'
						}`}</span>
					</>
				) : (
					<span>TVL Range</span>
				)
			}
			variant="secondary"
			onSubmit={handleSubmit}
			onClear={handleClear}
			nestedMenu={nestedMenu}
			min={minTvl}
			max={maxTvl}
			placement="bottom-start"
		/>
	)
}

export function filterLongShortRows({
	rows,
	selectedChains,
	selectedAttributes,
	minTvl,
	maxTvl
}: {
	rows: IYieldsStrategyTableRow[]
	selectedChains: string[]
	selectedAttributes: string[]
	minTvl: string
	maxTvl: string
}) {
	const chainSet = new Set(selectedChains)
	const minTvlValue = minTvl === '' ? null : Number(minTvl)
	const maxTvlValue = maxTvl === '' ? null : Number(maxTvl)

	return rows.filter((row) => {
		const chain = row.chains[0] ?? ''

		return filterPool({
			pool: {
				...row,
				chain
			},
			selectedChainsSet: chainSet,
			selectedAttributes,
			minTvl: minTvlValue,
			maxTvl: maxTvlValue
		})
	})
}

export function TokenLongShortSection({ tokenSymbol }: { tokenSymbol: string }) {
	const [selectedChainsState, setSelectedChains] = React.useState<string[] | null>(null)
	const [selectedAttributes, setSelectedAttributes] = React.useState<string[]>(DEFAULT_LONG_SHORT_ATTRIBUTES)
	const [minTvl, setMinTvl] = React.useState('')
	const [maxTvl, setMaxTvl] = React.useState('')
	const { data, error, isLoading } = useTokenStrategies(tokenSymbol)
	const rows = React.useMemo(() => data?.longShort ?? [], [data])
	const chainList = React.useMemo(() => getLongShortChainList(rows), [rows])
	const selectedChains = React.useMemo(
		() => getSelectedChains(selectedChainsState, chainList),
		[chainList, selectedChainsState]
	)

	const filteredRows = React.useMemo(
		() =>
			filterLongShortRows({
				rows,
				selectedChains,
				selectedAttributes,
				minTvl,
				maxTvl
			}),
		[maxTvl, minTvl, rows, selectedAttributes, selectedChains]
	)
	const hasActiveFilters =
		selectedChains.length !== chainList.length ||
		!hasDefaultLongShortAttributes(selectedAttributes) ||
		minTvl !== '' ||
		maxTvl !== ''
	const hasPlaceholderState = isLoading || error != null || rows.length === 0
	const summaryText =
		filteredRows.length > 0
			? `Tracking ${filteredRows.length} ${filteredRows.length === 1 ? 'strategy' : 'strategies'}`
			: null

	return (
		<section
			className={`flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)${
				hasPlaceholderState ? ' min-h-[80dvh] sm:min-h-[572px]' : ''
			}`}
		>
			<div className="flex flex-wrap items-start justify-between gap-3 border-b border-(--cards-border) p-3">
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
				{!isLoading && !error && summaryText ? (
					<p className="text-sm text-(--text-secondary) sm:text-right">{summaryText}</p>
				) : null}
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
											<SelectWithCombobox
												label="Attributes"
												allValues={LONG_SHORT_ATTRIBUTE_OPTIONS}
												selectedValues={selectedAttributes}
												setSelectedValues={setSelectedAttributes}
												nestedMenu={nestedMenu}
												labelType={selectedAttributes.length > 0 ? 'regular' : 'none'}
											/>
											<TokenLongShortTvlRange
												minTvl={minTvl}
												maxTvl={maxTvl}
												setMinTvl={setMinTvl}
												setMaxTvl={setMaxTvl}
												nestedMenu={nestedMenu}
											/>
											{hasActiveFilters ? (
												<button
													type="button"
													onClick={() => {
														setSelectedChains(null)
														setSelectedAttributes(DEFAULT_LONG_SHORT_ATTRIBUTES)
														setMinTvl('')
														setMaxTvl('')
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
