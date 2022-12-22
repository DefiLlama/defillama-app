import { MenuButtonArrow, useSelectState } from 'ariakit'
import { useRouter } from 'next/router'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { YIELDS_SETTINGS } from '~/contexts/LocalStorage'
import { SelectButton, SelectPopover, ItemsSelected, SecondaryLabel } from '../common'
import { lockupsCollateral, badDebt } from '~/components/YieldsPage/utils'
import { SlidingMenu } from '~/components/SlidingMenu'
import { SelectContent } from '../common/Base'

export const attributeOptions = [
	{
		name: 'Stablecoins',
		key: YIELDS_SETTINGS.STABLECOINS.toLowerCase(),
		help: 'Select pools consisting of stablecoins only',
		filterFn: (item) => item.stablecoin === true,
		defaultFilterFnOnPage: {
			'/yields/stablecoins': (item) => item.stablecoin === true
		},
		disabledOnPages: ['/yields/stablecoins', '/borrow', '/yields/strategy']
	},
	{
		name: 'Single Exposure',
		key: YIELDS_SETTINGS.SINGLE_EXPOSURE.toLowerCase(),
		help: 'Select pools with single token exposure only',
		filterFn: (item) => item.exposure === 'single',
		defaultFilterFnOnPage: {},
		disabledOnPages: ['/borrow', '/yields/strategy']
	},
	{
		name: 'No IL',
		key: YIELDS_SETTINGS.NO_IL.toLowerCase(),
		help: 'Select pools with no impermanent loss',
		filterFn: (item) => item.ilRisk === 'no',
		defaultFilterFnOnPage: {
			'/yields/stablecoins': (item) => item.ilRisk === 'no'
		},
		disabledOnPages: ['/yields/stablecoins', '/borrow', '/yields/strategy']
	},
	{
		name: 'Million Dollar',
		key: YIELDS_SETTINGS.MILLION_DOLLAR.toLowerCase(),
		help: 'Select pools with at least one million dollar in TVL',
		filterFn: (item) => item.tvlUsd >= 1e6,
		defaultFilterFnOnPage: {
			'/yields/stablecoins': (item) => item.tvlUsd >= 1e6
		},
		disabledOnPages: ['/yields/stablecoins', '/yields/borrow', '/borrow', '/yields/loop', '/yields/strategy']
	},
	{
		name: 'Audited',
		key: YIELDS_SETTINGS.AUDITED.toLowerCase(),
		help: 'Select pools from audited projects only',
		filterFn: (item) => item.audits !== '0',
		defaultFilterFnOnPage: {
			'/yields/stablecoins': (item) => item.audits !== '0'
		},
		disabledOnPages: ['/yields/stablecoins', '/yields/borrow', '/borrow', '/yields/strategy']
	},
	{
		name: 'No Outliers',
		key: YIELDS_SETTINGS.NO_OUTLIER.toLowerCase(),
		help: 'Remove pools which are considered outliers based on their geometric mean of apy values',
		filterFn: (item) => item.outlier === false,
		defaultFilterFnOnPage: {
			'/yields/stablecoins': (item) => item.outlier === false
		},
		disabledOnPages: ['/yields/stablecoins', '/yields/borrow', '/borrow', '/yields/loop', '/yields/strategy']
	},
	{
		name: 'Stable Outlook',
		key: YIELDS_SETTINGS.STABLE_OUTLOOK.toLowerCase(),
		help: 'Select pools with "Stable/Up" Outlook only',
		filterFn: (item) => item.predictions.predictedClass === 'Stable/Up',
		defaultFilterFnOnPage: {},
		disabledOnPages: ['/yields/borrow', '/borrow', '/yields/loop', '/yields/strategy']
	},
	{
		name: 'High Confidence',
		key: YIELDS_SETTINGS.HIGH_CONFIDENCE.toLowerCase(),
		help: 'Select pools with "High" predicted outlook confidence',
		filterFn: (item) => item.predictions.binnedConfidence === 3,
		defaultFilterFnOnPage: {},
		disabledOnPages: ['/yields/borrow', '/borrow', '/yields/loop', '/yields/strategy']
	},
	{
		// see: https://bad-debt.riskdao.org/
		name: 'Exclude bad debt',
		key: YIELDS_SETTINGS.NO_BAD_DEBT.toLowerCase(),
		help: 'Remove projects with a bad debt ratio of >= 5% (5% of the tvl is bad debt from insolvent accounts)',
		filterFn: (item) => !badDebt.includes(item.project),
		defaultFilterFnOnPage: {},
		disabledOnPages: ['/yields', '/yields/stablecoins', '/yields/strategy', '/borrow']
	},
	// strategy specific ones (these are applied on both lendind protocol + farming protocol)
	{
		name: 'Million Dollar',
		key: 'million_dollar_farm',
		help: 'Select pools with at least one million dollar in TVL',
		filterFn: (item) => item.farmTvlUsd >= 1e6,
		defaultFilterFnOnPage: {},
		disabledOnPages: ['/yields', '/yields/overview', '/yields/stablecoins', '/yields/borrow', '/borrow', '/yields/loop']
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
		disabledOnPages: ['/yields', '/yields/overview', '/yields/stablecoins', '/yields/borrow', '/borrow', '/yields/loop']
	},
	{
		name: 'Exclude deposit lockups',
		key: YIELDS_SETTINGS.NO_LOCKUP_COLLATERAL.toLowerCase(),
		help: 'Remove projects which require locking of deposit tokens',
		filterFn: (item) => {
			return !lockupsCollateral.includes(item.projectName) && !lockupsCollateral.includes(item.farmProjectName)
		},
		defaultFilterFnOnPage: {},
		disabledOnPages: ['/yields', '/yields/overview', '/yields/stablecoins', '/yields/borrow', '/yields/loop']
	}
]

export function YieldAttributes({
	pathname,
	variant = 'primary',
	subMenu
}: {
	pathname: string
	variant?: 'primary' | 'secondary'
	subMenu?: boolean
}) {
	const router = useRouter()

	const { attribute = [], ...queries } = router.query

	const attributeOptionsFiltered = attributeOptions.filter((option) =>
		pathname === '/yields/borrow'
			? !option.disabledOnPages.includes('/yields/borrow')
			: pathname === '/borrow'
			? !option.disabledOnPages.includes('/borrow')
			: pathname === '/yields/strategy'
			? !option.disabledOnPages.includes('/yields/strategy')
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

	const updateAttributes = (newFilters) => {
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

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const selectState = useSelectState({
		value: values,
		setValue: updateAttributes,
		gutter: 8,
		renderCallback,
		animated: true
	})

	const toggleAllOptions = () => {
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

	const clearAllOptions = () => {
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

	const selectedAttributes = attributeOptionsFiltered
		.filter((option) => option.defaultFilterFnOnPage[router.pathname])
		.map((x) => x.name)
		.concat(values)

	const isSelected = selectedAttributes.length > 0

	let selectedAttributeNames = isSelected
		? selectedAttributes.map(
				(attribute) => attributeOptionsFiltered.find((p) => p.key === attribute)?.name ?? attribute
		  )
		: []

	if (subMenu) {
		return (
			<SlidingMenu label="Attributes" selectState={selectState}>
				<SelectContent
					options={attributeOptionsFiltered}
					selectedOptions={values}
					clearAllOptions={clearAllOptions}
					toggleAllOptions={toggleAllOptions}
					pathname={router.pathname}
					variant={variant}
				/>
			</SlidingMenu>
		)
	}

	return (
		<>
			<SelectButton state={selectState} data-variant={variant}>
				{variant === 'secondary' ? (
					<SecondaryLabel>
						{isSelected ? (
							<>
								<span>Attribute: </span>
								<span data-selecteditems>
									{selectedAttributeNames.length > 2
										? `${selectedAttributeNames[0]} + ${selectedAttributeNames.length - 1} others`
										: selectedAttributeNames.join(', ')}
								</span>
							</>
						) : (
							'Attribute'
						)}
					</SecondaryLabel>
				) : (
					<>
						<span>Filter by Attribute</span>
						{isSelected && <ItemsSelected>{selectedAttributes.length}</ItemsSelected>}
					</>
				)}

				<MenuButtonArrow />
			</SelectButton>

			<SelectPopover state={selectState} modal={!isLarge} data-variant={variant}>
				<SelectContent
					options={attributeOptionsFiltered}
					selectedOptions={values}
					clearAllOptions={clearAllOptions}
					toggleAllOptions={toggleAllOptions}
					pathname={router.pathname}
					variant={variant}
				/>
			</SelectPopover>
		</>
	)
}
