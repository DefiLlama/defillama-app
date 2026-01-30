import { useRouter } from 'next/router'
import { useCallback, useMemo, useRef } from 'react'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { EVM_CHAINS_FALLBACK_SET } from '~/constants/chains'
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

	const evmChainsSet = useMemo(
		() => (evmChains && evmChains.length > 0 ? new Set(evmChains) : EVM_CHAINS_FALLBACK_SET),
		[evmChains]
	)

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

			if (!prevHadAllEvm && newHasAllEvm) {
				// ALL_EVM was just selected - this is handled by the URL (chain=ALL_EVM)
				// Just set ALL_EVM in URL, hooks.tsx will expand it
				finalValues = ['ALL_EVM']
			} else if (prevHadAllEvm && !newHasAllEvm) {
				// ALL_EVM was just deselected - remove all EVM chains
				finalValues = newValues.filter((c) => c !== 'ALL_EVM' && !isEvmChain(c))
			} else {
				// Normal selection change
				finalValues = newValues.filter((c) => c !== 'ALL_EVM')
			}

			// Track analytics
			const prevSet = prevSelectionRef.current
			finalValues.forEach((c) => {
				if (!prevSet.has(c)) {
					trackYieldsEvent(YIELDS_EVENTS.FILTER_CHAIN, { chain: c })
				}
			})
			prevSelectionRef.current = new Set(finalValues)

			// Update URL
			const nextQuery = { ...router.query }

			if (finalValues.length === 0 || finalValues.length === chainList.length) {
				// All or none selected - remove chain params (default = all)
				delete nextQuery.chain
				delete nextQuery.excludeChain
			} else if (finalValues.includes('ALL_EVM')) {
				// ALL_EVM selected
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
		[displaySelectedChains, isEvmChain, chainList, router]
	)

	return (
		<SelectWithCombobox
			label="Chains"
			allValues={chainListWithSpecial}
			selectedValues={displaySelectedChains}
			setSelectedValues={handleValuesChange}
			nestedMenu={nestedMenu}
			labelType={!chain || chain === 'All' ? 'none' : 'regular'}
			onValuesChange={(values) => {
				// Analytics tracking is now handled in handleValuesChange
			}}
		/>
	)
}
