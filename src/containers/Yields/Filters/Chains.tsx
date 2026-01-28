import { useRouter } from 'next/router'
import { useRef } from 'react'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { trackYieldsEvent, YIELDS_EVENTS } from '~/utils/analytics/yields'

interface IFiltersByChainProps {
	chainList: string[]
	selectedChains: string[]
	nestedMenu?: boolean
}

export function FilterByChain({ chainList = [], selectedChains, nestedMenu }: IFiltersByChainProps) {
	const router = useRouter()
	const { chain } = router.query
	const prevSelectionRef = useRef<Set<string>>(new Set(selectedChains))

	return (
		<SelectWithCombobox
			label="Chains"
			allValues={chainList}
			selectedValues={selectedChains}
			nestedMenu={nestedMenu}
			labelType={!chain || chain === 'All' ? 'none' : 'regular'}
			includeQueryKey="chain"
			excludeQueryKey="excludeChain"
			onValuesChange={(values) => {
				const prevSet = prevSelectionRef.current
				values.forEach((chain) => {
					if (!prevSet.has(chain)) {
						trackYieldsEvent(YIELDS_EVENTS.FILTER_CHAIN, { chain })
					}
				})
				prevSelectionRef.current = new Set(values)
			}}
		/>
	)
}
