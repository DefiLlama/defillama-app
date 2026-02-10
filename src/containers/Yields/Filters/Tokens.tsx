import { useRouter } from 'next/router'
import { useRef } from 'react'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { trackYieldsEvent, YIELDS_EVENTS } from '~/utils/analytics/yields'

interface IFiltersByTokensProps {
	tokensList: Array<string>
	selectedTokens: Array<string>
	nestedMenu?: boolean
}

export function FilterByToken({ tokensList = [], selectedTokens, nestedMenu }: IFiltersByTokensProps) {
	const router = useRouter()
	const { token } = router.query
	const prevSelectionRef = useRef<Set<string>>(new Set(selectedTokens))

	return (
		<SelectWithCombobox
			label="Tokens"
			allValues={tokensList}
			selectedValues={selectedTokens}
			nestedMenu={nestedMenu}
			labelType={!token || token === 'All' ? 'none' : 'regular'}
			includeQueryKey="token"
			excludeQueryKey="excludeToken"
			onValuesChange={(values) => {
				const prevSet = prevSelectionRef.current
				values.forEach((token) => {
					if (!prevSet.has(token)) {
						trackYieldsEvent(YIELDS_EVENTS.FILTER_TOKEN, { token })
					}
				})
				prevSelectionRef.current = new Set(values)
			}}
		/>
	)
}
