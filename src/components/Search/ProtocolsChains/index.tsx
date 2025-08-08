import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { IBaseSearchProps, ICommonSearchProps, SETS } from '../types'
import { lazy, useMemo } from 'react'
import { tvlOptions } from '~/components/Filters/options'
import { useProtocolsFilterState } from '~/components/Filters/useProtocolFilterState'
import { Select } from '~/components/Select'
import { Icon } from '~/components/Icon'

const Results = lazy(() => import('../Results').then((mod) => ({ default: mod.Results })))

interface IProtocolsChainsSearch extends ICommonSearchProps {
	includedSets?: SETS[]
	customPath?: IBaseSearchProps['customPath']
	options?: { name: string; key: string }[]
	hideFilters?: boolean
}

export const ProtocolsChainsSearch = ({ hideFilters, options }: IProtocolsChainsSearch) => {
	return (
		<span className="hidden lg:flex items-center justify-between gap-2">
			<Ariakit.DialogProvider>
				<Ariakit.DialogDisclosure className="relative w-full max-w-[50vw] flex items-center text-sm rounded-md border border-(--cards-border) text-[#7c7c7c] dark:text-[#818283] bg-(--app-bg) py-[5px] px-[10px] pl-8">
					<span className="absolute top-[8px] left-[9px]">
						<span className="sr-only">Open Search</span>
						<Icon name="search" height={14} width={14} />
					</span>
					<span>Search...</span>
					<span className="rounded-md text-xs text-(--link-text) bg-(--link-bg) p-1 absolute top-1 right-1 bottom-1 m-auto flex items-center justify-center">
						⌘K
					</span>
				</Ariakit.DialogDisclosure>
				<Results />
			</Ariakit.DialogProvider>
			{hideFilters || (options && options.length === 0) ? null : <TvlOptions options={options} />}
		</span>
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
