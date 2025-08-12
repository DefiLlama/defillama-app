import { useRouter } from 'next/router'
import { IBaseSearchProps, ICommonSearchProps, SETS } from '../types'
import { lazy, Suspense, useMemo } from 'react'
import { tvlOptions } from '~/components/Filters/options'
import { useProtocolsFilterState } from '~/components/Filters/useProtocolFilterState'
import { Select } from '~/components/Select'
import { SearchFallback } from '../Fallback'

const GlobalSearch = lazy(() => import('~/components/Search').then((mod) => ({ default: mod.GlobalSearch })))

interface IProtocolsChainsSearch extends ICommonSearchProps {
	includedSets?: SETS[]
	customPath?: IBaseSearchProps['customPath']
	options?: { name: string; key: string }[]
	hideFilters?: boolean
}

export const ProtocolsChainsSearch = ({ hideFilters, options }: IProtocolsChainsSearch) => {
	return (
		<>
			<span className="hidden lg:flex items-center justify-between gap-2 lg:min-h-8">
				<Suspense fallback={<SearchFallback />}>
					<GlobalSearch />
				</Suspense>
				{hideFilters || (options && options.length === 0) ? null : <TvlOptions options={options} />}
			</span>
		</>
	)
}

const TvlOptions = ({ options }: { options?: { name: string; key: string }[] }) => {
	const router = useRouter()

	const finalTvlOptions = useMemo(() => {
		return options || tvlOptions
	}, [options])

	const { selectedValues, setSelectedValues } = useProtocolsFilterState(finalTvlOptions)

	if (router.pathname?.includes('/protocol/')) {
		if (!finalTvlOptions || finalTvlOptions.length === 0) return null
		const hasFees = finalTvlOptions.find((o) => ['bribes', 'tokentax'].includes(o.key))
		return (
			<>
				<Select
					allValues={finalTvlOptions}
					selectedValues={selectedValues}
					setSelectedValues={setSelectedValues}
					selectOnlyOne={(newOption) => {
						setSelectedValues([newOption])
					}}
					label={hasFees ? 'Include in TVL, Fees' : 'Include in TVL'}
					triggerProps={{
						className:
							'flex items-center gap-2 py-2 px-3 text-xs rounded-md cursor-pointer flex-nowrap bg-[#E2E2E2] dark:bg-[#181A1C] ml-auto'
					}}
					placement="bottom-end"
				/>
			</>
		)
	}

	return (
		<>
			<Select
				allValues={finalTvlOptions}
				selectedValues={selectedValues}
				setSelectedValues={setSelectedValues}
				selectOnlyOne={(newOption) => {
					setSelectedValues([newOption])
				}}
				label="Include in TVL"
				triggerProps={{
					className:
						'flex items-center gap-2 py-2 px-3 text-xs rounded-md cursor-pointer flex-nowrap bg-[#E2E2E2] dark:bg-[#181A1C] ml-auto'
				}}
				placement="bottom-end"
			/>
		</>
	)
}
