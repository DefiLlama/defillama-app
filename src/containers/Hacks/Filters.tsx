import * as React from 'react'
import { useRouter } from 'next/router'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'
import { ResponsiveFilterLayout } from '~/components/Filters/ResponsiveFilterLayout'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { TagGroup } from '~/components/TagGroup'
import { useRangeFilter } from '~/hooks/useRangeFilter'

interface HacksFiltersProps {
	chainOptions: Array<string>
	techniqueOptions: Array<string>
	classificationOptions: Array<string>
	selectedChains: string[]
	selectedTechniques: string[]
	selectedClassifications: string[]
}

interface FiltersInnerProps {
	chainOptions: Array<string>
	techniqueOptions: Array<string>
	classificationOptions: Array<string>
	selectedChains: string[]
	selectedTechniques: string[]
	selectedClassifications: string[]
	timeOptions: string[]
	selectedTimeLabel: string
	setSelectedTime: (label: string) => void
	minLostVal: number | null
	maxLostVal: number | null
	handleAmountSubmit: (e: React.FormEvent<HTMLFormElement>) => void
	handleAmountClear: () => void
	hasActiveFilters: boolean
	onClearAll: () => void
	isMobile?: boolean
}

const TIME_LABEL_TO_KEY = {
	All: 'all',
	'7D': '7d',
	'30D': '30d',
	'90D': '90d',
	'1Y': '1y'
} as const

type TimeLabelKey = keyof typeof TIME_LABEL_TO_KEY
type TimeValueKey = (typeof TIME_LABEL_TO_KEY)[TimeLabelKey]

const timeOptions: TimeLabelKey[] = ['All', '7D', '30D', '90D', '1Y']

function buildKeyToLabel(): Record<TimeValueKey, TimeLabelKey> {
	const result: Partial<Record<TimeValueKey, TimeLabelKey>> = {}
	for (const label of timeOptions) {
		result[TIME_LABEL_TO_KEY[label]] = label
	}
	return result as Record<TimeValueKey, TimeLabelKey>
}
const keyToLabel = buildKeyToLabel()

export function HacksFilters({
	chainOptions,
	techniqueOptions,
	classificationOptions,
	selectedChains,
	selectedTechniques,
	selectedClassifications
}: HacksFiltersProps) {
	const router = useRouter()
	const { chain, tech, class: classQ, time } = router.query

	const {
		min: minLostVal,
		max: maxLostVal,
		handleSubmit: handleAmountSubmit,
		handleClear: handleAmountClear
	} = useRangeFilter('minLost', 'maxLost')

	const selectedTimeLabel: string =
		typeof time === 'string' && time in keyToLabel ? keyToLabel[time as TimeValueKey] : 'All'

	const setSelectedTime = (label: string): void => {
		if (!(label in TIME_LABEL_TO_KEY)) return
		const key = TIME_LABEL_TO_KEY[label as TimeLabelKey]
		const nextQuery = { ...router.query }
		if (key && key !== 'all') nextQuery.time = key
		else delete nextQuery.time
		router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
	}

	const hasActiveFilters =
		typeof chain !== 'undefined' ||
		typeof tech !== 'undefined' ||
		typeof classQ !== 'undefined' ||
		typeof time !== 'undefined' ||
		minLostVal != null ||
		maxLostVal != null

	const onClearAll = (): void => {
		const nextQuery = { ...router.query }
		delete nextQuery.chain
		delete nextQuery.tech
		delete nextQuery.class
		delete nextQuery.start
		delete nextQuery.end
		delete nextQuery.minLost
		delete nextQuery.maxLost
		delete nextQuery.time
		router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
	}

	return (
		<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
			<ResponsiveFilterLayout desktopClassName="hidden min-h-8 flex-wrap items-center gap-2 sm:flex">
				{(nestedMenu) => (
					<Filters
						chainOptions={chainOptions}
						selectedChains={selectedChains}
						minLostVal={minLostVal}
						maxLostVal={maxLostVal}
						handleAmountSubmit={handleAmountSubmit}
						handleAmountClear={handleAmountClear}
						classificationOptions={classificationOptions}
						selectedClassifications={selectedClassifications}
						techniqueOptions={techniqueOptions}
						selectedTechniques={selectedTechniques}
						timeOptions={timeOptions}
						selectedTimeLabel={selectedTimeLabel}
						setSelectedTime={setSelectedTime}
						hasActiveFilters={hasActiveFilters}
						onClearAll={onClearAll}
						isMobile={nestedMenu}
					/>
				)}
			</ResponsiveFilterLayout>
		</div>
	)
}

const Filters = ({
	chainOptions,
	selectedChains,
	minLostVal,
	maxLostVal,
	handleAmountSubmit,
	handleAmountClear,
	classificationOptions,
	selectedClassifications,
	techniqueOptions,
	selectedTechniques,
	timeOptions,
	selectedTimeLabel,
	setSelectedTime,
	hasActiveFilters,
	onClearAll,
	isMobile = false
}: FiltersInnerProps) => {
	return (
		<>
			<SelectWithCombobox
				allValues={chainOptions}
				selectedValues={selectedChains}
				label="Chains"
				labelType="smol"
				variant="filter-responsive"
				nestedMenu={isMobile}
				includeQueryKey="chain"
				excludeQueryKey="excludeChain"
			/>
			<FilterBetweenRange
				name="Amount lost"
				trigger={
					minLostVal != null || maxLostVal != null ? (
						<>
							<span>Amount: </span>
							<span className="text-(--link)">{`${minLostVal?.toLocaleString() ?? 'min'} - ${
								maxLostVal?.toLocaleString() ?? 'max'
							}`}</span>
						</>
					) : (
						'Amount lost'
					)
				}
				min={minLostVal}
				max={maxLostVal}
				onSubmit={handleAmountSubmit}
				onClear={handleAmountClear}
				placement="bottom-start"
				nestedMenu={isMobile}
			/>

			<SelectWithCombobox
				allValues={classificationOptions}
				selectedValues={selectedClassifications}
				label="Classification"
				labelType="smol"
				variant="filter-responsive"
				nestedMenu={isMobile}
				includeQueryKey="class"
				excludeQueryKey="excludeClass"
			/>
			<SelectWithCombobox
				allValues={techniqueOptions}
				selectedValues={selectedTechniques}
				label="Techniques"
				labelType="smol"
				variant="filter-responsive"
				nestedMenu={isMobile}
				includeQueryKey="tech"
				excludeQueryKey="excludeTech"
			/>

			<div className="px-3 py-2 md:ml-auto md:flex-row md:items-center md:px-0 md:py-0">
				<TagGroup setValue={setSelectedTime} selectedValue={selectedTimeLabel} values={timeOptions} />
			</div>
			<button
				onClick={onClearAll}
				disabled={!hasActiveFilters}
				className="relative flex cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs font-medium text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40"
			>
				Reset filters
			</button>
		</>
	)
}
