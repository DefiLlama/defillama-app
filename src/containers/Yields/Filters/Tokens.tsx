import { useRouter } from 'next/router'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { trackYieldsEvent, YIELDS_EVENTS } from '~/utils/analytics/yields'

interface IFiltersByTokensProps {
	tokensList: Array<string>
	selectedTokens: Array<string>
	nestedMenu?: boolean
}

export function FilterByToken({ tokensList = [], selectedTokens, nestedMenu }: IFiltersByTokensProps) {
	const router = useRouter()
	const { token } = router.query

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
				trackYieldsEvent(YIELDS_EVENTS.FILTER_TOKEN, {
					count: values.length,
					tokens: values.join(',')
				})
			}}
		/>
	)
}
