import * as React from 'react'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'
import { NestedMenu } from '~/components/NestedMenu'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { TagGroup } from '~/components/TagGroup'

interface IOption {
	key: string
	name: string
}

interface HacksFiltersProps {
	chainOptions: IOption[]
	techniqueOptions: IOption[]
	classificationOptions: IOption[]
	selectedChains: string[]
	selectedTechniques: string[]
	selectedClassifications: string[]
	setSelectedChains: (values: string[]) => void
	setSelectedTechniques: (values: string[]) => void
	setSelectedClassifications: (values: string[]) => void
	timeOptions: string[]
	selectedTimeLabel: string
	setSelectedTime: (label: string) => void
	minLostVal: number | null
	maxLostVal: number | null
	handleAmountSubmit: (e: any) => void
	handleAmountClear: () => void
	onClearAll: () => void
	isMobile?: boolean
}

export function HacksFilters({
	chainOptions,
	techniqueOptions,
	classificationOptions,
	selectedChains,
	selectedTechniques,
	selectedClassifications,
	setSelectedChains,
	setSelectedTechniques,
	setSelectedClassifications,
	timeOptions,
	selectedTimeLabel,
	setSelectedTime,
	minLostVal,
	maxLostVal,
	handleAmountSubmit,
	handleAmountClear,
	onClearAll
}: HacksFiltersProps) {
	return (
		<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
			<div className="flex min-h-9 flex-wrap gap-2 *:flex-1 sm:hidden">
				<React.Suspense fallback={<></>}>
					<NestedMenu label="Filters">
						<Filters
							chainOptions={chainOptions}
							selectedChains={selectedChains}
							setSelectedChains={setSelectedChains}
							minLostVal={minLostVal}
							maxLostVal={maxLostVal}
							handleAmountSubmit={handleAmountSubmit}
							handleAmountClear={handleAmountClear}
							classificationOptions={classificationOptions}
							selectedClassifications={selectedClassifications}
							setSelectedClassifications={setSelectedClassifications}
							techniqueOptions={techniqueOptions}
							selectedTechniques={selectedTechniques}
							setSelectedTechniques={setSelectedTechniques}
							timeOptions={timeOptions}
							selectedTimeLabel={selectedTimeLabel}
							setSelectedTime={setSelectedTime}
							onClearAll={onClearAll}
							isMobile
						/>
					</NestedMenu>
				</React.Suspense>
			</div>

			<div className="hidden min-h-8 flex-wrap items-center gap-2 sm:flex">
				<Filters
					chainOptions={chainOptions}
					selectedChains={selectedChains}
					setSelectedChains={setSelectedChains}
					minLostVal={minLostVal}
					maxLostVal={maxLostVal}
					handleAmountSubmit={handleAmountSubmit}
					handleAmountClear={handleAmountClear}
					classificationOptions={classificationOptions}
					selectedClassifications={selectedClassifications}
					setSelectedClassifications={setSelectedClassifications}
					techniqueOptions={techniqueOptions}
					selectedTechniques={selectedTechniques}
					setSelectedTechniques={setSelectedTechniques}
					timeOptions={timeOptions}
					selectedTimeLabel={selectedTimeLabel}
					setSelectedTime={setSelectedTime}
					onClearAll={onClearAll}
				/>
			</div>
		</div>
	)
}

const Filters = ({
	chainOptions,
	selectedChains,
	setSelectedChains,
	minLostVal,
	maxLostVal,
	handleAmountSubmit,
	handleAmountClear,
	classificationOptions,
	selectedClassifications,
	setSelectedClassifications,
	techniqueOptions,
	selectedTechniques,
	setSelectedTechniques,
	timeOptions,
	selectedTimeLabel,
	setSelectedTime,
	onClearAll,
	isMobile = false
}: HacksFiltersProps) => {
	return (
		<>
			<SelectWithCombobox
				allValues={chainOptions}
				selectedValues={selectedChains}
				setSelectedValues={setSelectedChains}
				label="Chains"
				labelType="regular"
				nestedMenu={isMobile}
			/>
			<FilterBetweenRange
				name="Amount lost"
				trigger={
					minLostVal || maxLostVal ? (
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
				variant="secondary"
				placement="bottom-start"
				triggerClassName="py-2"
				nestedMenu={isMobile}
			/>

			<SelectWithCombobox
				allValues={classificationOptions}
				selectedValues={selectedClassifications}
				setSelectedValues={setSelectedClassifications}
				label="Classification"
				labelType="regular"
				nestedMenu={isMobile}
			/>
			<SelectWithCombobox
				allValues={techniqueOptions}
				selectedValues={selectedTechniques}
				setSelectedValues={setSelectedTechniques}
				label="Techniques"
				labelType="regular"
				nestedMenu={isMobile}
			/>

			<div className="px-3 py-2 md:ml-auto md:flex-row md:items-center md:px-0 md:py-0">
				<TagGroup setValue={setSelectedTime as any} selectedValue={selectedTimeLabel} values={timeOptions} />
			</div>
			<button
				onClick={onClearAll}
				disabled={
					selectedChains.length === 0 &&
					selectedTechniques.length === 0 &&
					selectedClassifications.length === 0 &&
					!minLostVal &&
					!maxLostVal
				}
				className="rounded-md bg-(--btn2-bg) px-3 py-2 text-xs hover:bg-(--btn2-hover-bg) disabled:cursor-not-allowed disabled:opacity-40 max-sm:mx-3 max-sm:my-6"
			>
				Reset filters
			</button>
		</>
	)
}
