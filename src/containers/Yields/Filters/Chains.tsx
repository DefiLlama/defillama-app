import { useRouter } from 'next/router'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'

interface IFiltersByChainProps {
	chainList: string[]
	selectedChains: string[]
	nestedMenu?: boolean
}

export function FilterByChain({ chainList = [], selectedChains, nestedMenu }: IFiltersByChainProps) {
	const router = useRouter()
	const { chain } = router.query

	return (
		<SelectWithCombobox
			label="Chains"
			allValues={chainList}
			selectedValues={selectedChains}
			nestedMenu={nestedMenu}
			labelType={!chain || chain === 'All' ? 'none' : 'regular'}
			includeQueryKey="chain"
			excludeQueryKey="excludeChain"
		/>
	)
}
