import { useRouter } from 'next/router'
import { DesktopSearch } from '~/components/Search/Base/Desktop'
import { IBaseSearchProps, ICommonSearchProps, SETS } from '../types'
import { useInstantSearch, useSearchBox } from 'react-instantsearch'
import { SearchV2 } from '../InstantSearch'
import { useIsClient } from '~/hooks'
import { useCallback, useMemo } from 'react'
import { tvlOptions } from '~/components/Filters/options'
import { useProtocolsFilterState } from '~/components/Filters/useProtocolFilterState'
import { Select } from '~/components/Select'

interface IProtocolsChainsSearch extends ICommonSearchProps {
	includedSets?: SETS[]
	customPath?: IBaseSearchProps['customPath']
	options?: { name: string; key: string }[]
	hideFilters?: boolean
}

const empty = []

export const ProtocolsChainsSearch = ({ hideFilters, ...props }: IProtocolsChainsSearch) => {
	const isClient = useIsClient()

	if (!isClient) {
		return <DesktopSearch {...props} data={empty} loading={true} filters={hideFilters ? null : <></>} />
	}

	return (
		<span className="hidden lg:block min-h-[32px]">
			<SearchV2 indexName="protocols">
				<Search {...props} hideFilters={hideFilters} />
			</SearchV2>
		</span>
	)
}

const Search = ({ hideFilters = false, options, ...props }: IProtocolsChainsSearch) => {
	const { refine } = useSearchBox()

	const { results, status } = useInstantSearch({ catchError: true })

	const onSearchTermChange = useCallback(
		(value: string) => {
			refine(value)
		},
		[refine]
	)

	const sortedResults = results.hits.sort((a, b) => {
		if (a.deprecated && !b.deprecated) {
			return 1
		}
		if (b.deprecated && !a.deprecated) {
			return -1
		}
		return 0
	})

	const memoizedFilters = useMemo(
		() => (hideFilters || (options && options.length === 0) ? null : <TvlOptions options={options} />),
		[hideFilters, options]
	)

	return (
		<>
			<DesktopSearch
				{...props}
				data={sortedResults}
				loading={status !== 'idle'}
				filters={memoizedFilters}
				onSearchTermChange={onSearchTermChange}
				skipSearching
			/>
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
							'flex items-center gap-2 py-2 px-3 text-xs rounded-md cursor-pointer flex-nowrap bg-[#E2E2E2] dark:bg-[#181A1C]'
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
						'flex items-center gap-2 py-2 px-3 text-xs rounded-md cursor-pointer flex-nowrap bg-[#E2E2E2] dark:bg-[#181A1C]'
				}}
				placement="bottom-end"
			/>
		</>
	)
}
