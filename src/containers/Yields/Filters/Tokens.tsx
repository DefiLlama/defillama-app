import { useRouter } from 'next/router'
import { useEffect, useRef } from 'react'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { trackYieldsEvent, YIELDS_EVENTS } from '~/utils/analytics/yields'
import { pushShallowQuery } from '~/utils/routerQuery'

const EMPTY_ARRAY: string[] = []

interface IFiltersByTokensProps {
	tokensList: Array<string>
	selectedTokens: Array<string>
	nestedMenu?: boolean
}

function tokenQueryUpdates(allKeys: string[], values: string[]): Record<string, string | string[] | undefined> {
	if (values.length === 0) {
		return { token: undefined, excludeToken: undefined }
	}

	const validSet = new Set(allKeys)
	const selected = values.filter((v) => validSet.has(v))

	// All selected = default, clear params
	if (selected.length === allKeys.length) {
		return { token: undefined, excludeToken: undefined }
	}

	const selectedSet = new Set(selected)
	const excluded = allKeys.filter((k) => !selectedSet.has(k))
	const useExclude = excluded.length > 0 && excluded.length < selected.length

	if (useExclude) {
		return {
			token: undefined,
			excludeToken: excluded.length === 1 ? excluded[0] : excluded
		}
	}

	return {
		excludeToken: undefined,
		token: selected.length === 1 ? selected[0] : selected
	}
}

export function FilterByToken({ tokensList = EMPTY_ARRAY, selectedTokens, nestedMenu }: IFiltersByTokensProps) {
	const router = useRouter()
	const { token, attribute } = router.query
	const prevSelectionRef = useRef<Set<string>>(new Set(selectedTokens))

	const currentAttributes = attribute ? (typeof attribute === 'string' ? [attribute] : [...attribute]) : []

	useEffect(() => {
		prevSelectionRef.current = new Set(selectedTokens)
	}, [selectedTokens])

	const handleSetSelectedValues = (values: string[]) => {
		const prevSet = prevSelectionRef.current

		for (const t of values) {
			if (!prevSet.has(t)) {
				trackYieldsEvent(YIELDS_EVENTS.FILTER_TOKEN, { token: t })
			}
		}
		prevSelectionRef.current = new Set(values)

		const updates: Record<string, string | string[] | undefined> = tokenQueryUpdates(tokensList, values)

		// Mirror the desktop include behaviour: auto-apply single_exposure + no_il when a token
		// filter is active, clean them up when the filter is cleared.
		if (
			values.length > 0 &&
			values.length < tokensList.length &&
			(!currentAttributes.includes('no_il') || !currentAttributes.includes('single_exposure'))
		) {
			updates.attribute = Array.from(new Set([...currentAttributes, 'no_il', 'single_exposure']))
		} else if (
			values.length === 0 &&
			(currentAttributes.includes('no_il') || currentAttributes.includes('single_exposure'))
		) {
			updates.attribute = currentAttributes.filter((a) => a !== 'no_il' && a !== 'single_exposure')
		}

		pushShallowQuery(router, updates)
	}

	return (
		<SelectWithCombobox
			label="Tokens"
			allValues={tokensList}
			selectedValues={selectedTokens}
			nestedMenu={nestedMenu}
			labelType={!token || token === 'All' ? 'none' : 'regular'}
			setSelectedValues={handleSetSelectedValues}
		/>
	)
}
