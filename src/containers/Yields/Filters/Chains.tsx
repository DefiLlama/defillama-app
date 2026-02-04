import { useRouter } from 'next/router'
import { useCallback, useMemo, useRef } from 'react'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { trackYieldsEvent, YIELDS_EVENTS } from '~/utils/analytics/yields'

interface IFiltersByChainProps {
	chainList: string[]
	selectedChains: string[]
	evmChains?: string[]
	nestedMenu?: boolean
}

export function FilterByChain({ chainList = [], selectedChains, evmChains, nestedMenu }: IFiltersByChainProps) {
	const router = useRouter()
	const { chain } = router.query
	const prevSelectionRef = useRef<Set<string>>(new Set(selectedChains))

	const evmChainsSet = useMemo(() => new Set(evmChains ?? []), [evmChains])

	const isEvmChain = useCallback(
		(c: string) => evmChainsSet.has(c) || evmChainsSet.has(c.toLowerCase()),
		[evmChainsSet]
	)

	// Add ALL_EVM as the first option in the chain list
	const chainListWithSpecial = useMemo(() => ['ALL_EVM', ...chainList], [chainList])

	// Check if ALL_EVM is in the URL query
	const isAllEvmSelected = chain === 'ALL_EVM' || (Array.isArray(chain) && chain.includes('ALL_EVM'))

	// For display: if ALL_EVM is in the URL, show it as selected along with the expanded chains
	const displaySelectedChains = useMemo(() => {
		if (isAllEvmSelected) {
			return ['ALL_EVM', ...selectedChains.filter((c) => c !== 'ALL_EVM')]
		}
		return selectedChains
	}, [selectedChains, isAllEvmSelected])

	// Custom handler for ALL_EVM select/deselect
	const handleValuesChange = useCallback(
		(newValues: string[]) => {
			const prevValues = displaySelectedChains
			const prevHadAllEvm = prevValues.includes('ALL_EVM')
			const newHasAllEvm = newValues.includes('ALL_EVM')

			let finalValues: string[]

			const justAddedAllEvm = !prevHadAllEvm && newHasAllEvm
			const prevChainsWithoutAllEvm = new Set(prevValues.filter((c) => c !== 'ALL_EVM'))
			const chainsWereAdded = newValues.filter((c) => c !== 'ALL_EVM').some((c) => !prevChainsWithoutAllEvm.has(c))
			// It's "Select All" if all options selected AND (chains were added OR ALL_EVM wasn't just added)
			// This means: it's NOT Select All only when the ONLY change was adding ALL_EVM
			const isSelectAll = newValues.length === chainListWithSpecial.length && (chainsWereAdded || !justAddedAllEvm)

			if (isSelectAll) {
				// Select all - use all actual chains, not ALL_EVM
				finalValues = [...chainList]
				prevSelectionRef.current = new Set(finalValues)
			} else if (justAddedAllEvm) {
				finalValues = ['ALL_EVM']

				// Track ALL_EVM selection and set prevSelectionRef to all EVM chains
				// This ensures that when adding another chain (e.g., Solana), only the new chain is tracked
				trackYieldsEvent(YIELDS_EVENTS.FILTER_CHAIN, { chain: 'ALL_EVM' })
				prevSelectionRef.current = new Set(evmChains ?? [])
			} else if (prevHadAllEvm && !newHasAllEvm) {
				// ALL_EVM was just deselected - remove all EVM chains
				finalValues = newValues.filter((c) => c !== 'ALL_EVM' && !isEvmChain(c))
			} else {
				// Normal selection change
				finalValues = newValues.filter((c) => c !== 'ALL_EVM')
			}

			// Track analytics (skip if ALL_EVM was just selected or select all - already tracked above)
			const skipTracking = isSelectAll || justAddedAllEvm
			if (!skipTracking) {
				const prevSet = prevSelectionRef.current
				finalValues.forEach((c) => {
					if (!prevSet.has(c)) {
						trackYieldsEvent(YIELDS_EVENTS.FILTER_CHAIN, { chain: c })
					}
				})
				prevSelectionRef.current = new Set(finalValues)
			}

			const nextQuery = { ...router.query }

			if (finalValues.length === 0) {
				nextQuery.chain = 'None'
				delete nextQuery.excludeChain
			} else if (finalValues.length === chainList.length) {
				// All selected - remove chain params (default = all)
				delete nextQuery.chain
				delete nextQuery.excludeChain
			} else if (finalValues.includes('ALL_EVM')) {
				nextQuery.chain = 'ALL_EVM'
				delete nextQuery.excludeChain
			} else {
				// Specific chains selected - use include or exclude based on which is shorter
				const excluded = chainList.filter((c) => !finalValues.includes(c))
				if (excluded.length < finalValues.length) {
					delete nextQuery.chain
					nextQuery.excludeChain = excluded.length === 1 ? excluded[0] : excluded
				} else {
					nextQuery.chain = finalValues.length === 1 ? finalValues[0] : finalValues
					delete nextQuery.excludeChain
				}
			}

			router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
		},
		[displaySelectedChains, isEvmChain, chainList, chainListWithSpecial, router, evmChains]
	)

	return (
		<SelectWithCombobox
			label="Chains"
			allValues={chainListWithSpecial}
			selectedValues={displaySelectedChains}
			setSelectedValues={handleValuesChange}
			nestedMenu={nestedMenu}
			labelType={!chain || chain === 'All' ? 'none' : 'regular'}
		/>
	)
}
