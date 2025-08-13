import { IBaseSearchProps, ICommonSearchProps, SETS } from '../types'
import { lazy, Suspense } from 'react'
import { useProtocolsFilterState } from '~/components/Filters/useProtocolFilterState'
import { Select } from '~/components/Select'
import { SearchFallback } from '../Fallback'

const GlobalSearch = lazy(() => import('~/components/Search').then((mod) => ({ default: mod.GlobalSearch })))

interface IProtocolsChainsSearch extends ICommonSearchProps {
	includedSets?: SETS[]
	customPath?: IBaseSearchProps['customPath']
	options?: { name: string; key: string }[]
	hideFilters?: boolean
	optionsLabel?: string
}

export const ProtocolsChainsSearch = ({ hideFilters, options, optionsLabel }: IProtocolsChainsSearch) => {
	return (
		<>
			<span className="hidden lg:flex items-center justify-between gap-2 lg:min-h-8">
				<Suspense fallback={<SearchFallback />}>
					<GlobalSearch />
				</Suspense>
				{hideFilters || !options || options.length === 0 ? null : (
					<IncludeInMetricOptions options={options} label={optionsLabel} />
				)}
			</span>
		</>
	)
}

const IncludeInMetricOptions = ({ options, label }: { options: { name: string; key: string }[]; label?: string }) => {
	const { selectedValues, setSelectedValues } = useProtocolsFilterState(options)

	return (
		<>
			<Select
				allValues={options}
				selectedValues={selectedValues}
				setSelectedValues={setSelectedValues}
				selectOnlyOne={(newOption) => {
					setSelectedValues([newOption])
				}}
				label={label || 'Include in TVL'}
				triggerProps={{
					className:
						'flex items-center gap-2 py-2 px-3 text-xs rounded-md cursor-pointer flex-nowrap bg-[#E2E2E2] dark:bg-[#181A1C] ml-auto'
				}}
				placement="bottom-end"
			/>
		</>
	)
}
