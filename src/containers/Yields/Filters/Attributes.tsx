import { useRouter } from 'next/router'
import { YIELDS_SETTINGS } from '~/contexts/LocalStorage'
import { lockupsCollateral, badDebt } from '~/containers/Yields/utils'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { useMemo } from 'react'

export const attributeOptions = [
	{
		name: 'Stablecoins',
		key: YIELDS_SETTINGS.STABLECOINS.toLowerCase(),
		help: 'Select pools consisting of stablecoins only',
		filterFn: (item) => item.stablecoin === true,
		defaultFilterFnOnPage: {
			'/yields/stablecoins': (item) => item.stablecoin === true
		},
		disabledOnPages: ['/yields/stablecoins', '/borrow', '/yields/strategy', '/yields/strategyFR']
	},
	{
		name: 'Single Exposure',
		key: YIELDS_SETTINGS.SINGLE_EXPOSURE.toLowerCase(),
		help: 'Select pools with single token exposure only',
		filterFn: (item) => item.exposure === 'single',
		defaultFilterFnOnPage: {},
		disabledOnPages: ['/borrow', '/yields/strategy', '/yields/strategyFR']
	},
	{
		name: 'Multi Exposure',
		key: YIELDS_SETTINGS.MULTI_EXPOSURE.toLowerCase(),
		help: 'Select pools with multi token exposure only',
		filterFn: (item) => item.exposure === 'multi',
		defaultFilterFnOnPage: {},
		disabledOnPages: ['/borrow', '/yields/strategy', '/yields/strategyFR']
	},
	{
		name: 'No IL',
		key: YIELDS_SETTINGS.NO_IL.toLowerCase(),
		help: 'Select pools with no impermanent loss',
		filterFn: (item) => item.ilRisk === 'no',
		defaultFilterFnOnPage: {
			'/yields/stablecoins': (item) => item.ilRisk === 'no'
		},
		disabledOnPages: ['/yields/stablecoins', '/borrow', '/yields/strategy', '/yields/strategyFR']
	},
	{
		name: 'Million Dollar',
		key: YIELDS_SETTINGS.MILLION_DOLLAR.toLowerCase(),
		help: 'Select pools with at least one million dollar in TVL',
		filterFn: (item) => item.tvlUsd >= 1e6,
		defaultFilterFnOnPage: {},
		disabledOnPages: ['/borrow', '/yields/loop', '/yields/strategy', '/yields/strategyFR']
	},
	{
		name: 'Audited',
		key: YIELDS_SETTINGS.AUDITED.toLowerCase(),
		help: 'Select pools from audited projects only',
		filterFn: (item) => item.audits !== '0',
		defaultFilterFnOnPage: {
			'/yields/stablecoins': (item) => item.audits !== '0'
		},
		disabledOnPages: ['/yields/stablecoins', '/borrow', '/yields/strategy', '/yields/strategyFR']
	},
	{
		name: 'No Outliers',
		key: YIELDS_SETTINGS.NO_OUTLIER.toLowerCase(),
		help: 'Remove pools which are considered outliers based on their geometric mean of apy values',
		filterFn: (item) => item.outlier === false,
		defaultFilterFnOnPage: {},
		disabledOnPages: ['/borrow', '/yields/loop', '/yields/strategy', '/yields/strategyFR']
	},
	{
		name: 'Stable Outlook',
		key: YIELDS_SETTINGS.STABLE_OUTLOOK.toLowerCase(),
		help: 'Select pools with "Stable/Up" Outlook only',
		filterFn: (item) => item.predictions.predictedClass === 'Stable/Up',
		defaultFilterFnOnPage: {},
		disabledOnPages: ['/borrow', '/yields/loop', '/yields/strategy', '/yields/strategyFR']
	},
	{
		name: 'High Confidence',
		key: YIELDS_SETTINGS.HIGH_CONFIDENCE.toLowerCase(),
		help: 'Select pools with "High" predicted outlook confidence',
		filterFn: (item) => item.predictions.binnedConfidence === 3,
		defaultFilterFnOnPage: {},
		disabledOnPages: ['/borrow', '/yields/loop', '/yields/strategy', '/yields/strategyFR']
	},
	{
		// see: https://bad-debt.riskdao.org/
		name: 'Exclude bad debt',
		key: YIELDS_SETTINGS.NO_BAD_DEBT.toLowerCase(),
		help: 'Remove projects with a bad debt ratio of >= 5% (5% of the tvl is bad debt from insolvent accounts)',
		filterFn: (item) => !badDebt.includes(item.project),
		defaultFilterFnOnPage: {},
		disabledOnPages: ['/yields', '/yields/stablecoins', '/yields/strategy', '/borrow', '/yields/strategyFR']
	},
	// strategy specific ones (these are applied on both lendind protocol + farming protocol)
	{
		name: 'Million Dollar',
		key: 'million_dollar_farm',
		help: 'Select pools with at least one million dollar in TVL',
		filterFn: (item) => item.farmTvlUsd >= 1e6,
		defaultFilterFnOnPage: {},
		disabledOnPages: ['/yields', '/yields/overview', '/yields/stablecoins', '/borrow', '/yields/loop']
	},
	{
		// see: https://bad-debt.riskdao.org/
		name: 'Exclude bad debt',
		key: 'no_bad_debt_',
		help: 'Remove projects with a bad debt ratio of >= 5% (5% of the tvl is bad debt from insolvent accounts)',
		filterFn: (item) => {
			return !badDebt.includes(item.project) && !badDebt.includes(item.farmProject)
		},
		defaultFilterFnOnPage: {},
		disabledOnPages: ['/yields', '/yields/overview', '/yields/stablecoins', '/borrow', '/yields/loop']
	},
	{
		name: 'Exclude deposit lockups',
		key: YIELDS_SETTINGS.NO_LOCKUP_COLLATERAL.toLowerCase(),
		help: 'Remove projects which require locking of deposit tokens',
		filterFn: (item) => {
			return !lockupsCollateral.includes(item.projectName) && !lockupsCollateral.includes(item.farmProjectName)
		},
		defaultFilterFnOnPage: {},
		disabledOnPages: ['/yields', '/yields/overview', '/yields/stablecoins', '/yields/loop']
	},
	{
		name: 'Potential Airdrop',
		key: YIELDS_SETTINGS.AIRDROP.toLowerCase(),
		help: 'Select projects which have no token yet and might airdrop one to depositors in the future',
		filterFn: (item) => item.airdrop === true,
		defaultFilterFnOnPage: {},
		disabledOnPages: ['/borrow', '/yields/strategy', '/yields/strategyFR']
	},
	{
		name: 'APY 0',
		key: YIELDS_SETTINGS.APY_ZERO.toLowerCase(),
		help: 'Include pools with supply apy of 0',
		filterFn: (item) => item.apy >= 0,
		defaultFilterFnOnPage: {},
		disabledOnPages: ['/yields/stablecoins', '/borrow', '/yields/strategy', '/yields/strategyFR']
	},
	{
		name: 'LSD Tokens only',
		key: YIELDS_SETTINGS.LSD_ONLY.toLowerCase(),
		help: 'Include pools which contain only Liquid Staking Derivate Tokens',
		filterFn: (item) => item.lsdTokenOnly === true,
		defaultFilterFnOnPage: {},
		disabledOnPages: ['/yields/stablecoins', '/borrow', '/yields/strategy', '/yields/strategyFR']
	}
]

export function YieldAttributes({ pathname, nestedMenu }: { pathname: string; nestedMenu?: boolean }) {
	const router = useRouter()

	const { attribute = [], ...queries } = router.query

	const { attributeOptionsFiltered, selectedAttributes } = useMemo(() => {
		const attributeOptionsFiltered = attributeOptions.filter((option) =>
			pathname === '/borrow'
				? !option.disabledOnPages.includes('/borrow')
				: pathname === '/yields/strategy'
				? !option.disabledOnPages.includes('/yields/strategy')
				: pathname === '/yields/strategyFR'
				? !option.disabledOnPages.includes('/yields/strategyFR')
				: pathname === '/yields'
				? !option.disabledOnPages.includes('/yields')
				: pathname === '/yields/stablecoins'
				? !option.disabledOnPages.includes('/yields/stablecoins')
				: pathname === '/yields/loop'
				? !option.disabledOnPages.includes('/yields/loop')
				: true
		)

		const values = attributeOptionsFiltered
			.filter((o) => {
				if (attribute) {
					if (typeof attribute === 'string') {
						return o.key === attribute
					} else {
						return attribute.includes(o.key)
					}
				}
			})
			.map((o) => o.key)

		const selectedAttributes = attributeOptionsFiltered
			.filter((option) => option.defaultFilterFnOnPage[router.pathname])
			.map((x) => x.name)
			.concat(values)

		return { attributeOptionsFiltered, values, selectedAttributes }
	}, [attribute, pathname, router.pathname])

	const setSelectedValues = (newFilters) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					attribute: newFilters
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const toggleAll = () => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					attribute: attributeOptionsFiltered.map((o) => o.key)
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const clearAll = () => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					attribute: []
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	return (
		<SelectWithCombobox
			allValues={attributeOptionsFiltered}
			selectedValues={selectedAttributes}
			setSelectedValues={setSelectedValues}
			toggleAll={toggleAll}
			clearAll={clearAll}
			selectOnlyOne={setSelectedValues}
			label="Attributes"
			nestedMenu={nestedMenu}
		/>
	)
}
