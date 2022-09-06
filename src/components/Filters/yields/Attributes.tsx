import { MenuButtonArrow, useSelectState } from 'ariakit'
import { useRouter } from 'next/router'
import { Checkbox } from '~/components'
import HeadHelp from '~/components/HeadHelp'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { YIELDS_SETTINGS } from '~/contexts/LocalStorage'
import { SelectItem, SelectButton, SelectPopover, ItemsSelected, FilterFnsGroup } from '../shared'

export const attributeOptions = [
	{
		name: 'Stablecoins',
		key: YIELDS_SETTINGS.STABLECOINS.toLowerCase(),
		help: 'Select pools consisting of stablecoins only',
		filterFn: (item) => item.stablecoin === true,
		defaultFilterFnOnPage: {
			'/yields/stablecoins': (item) => item.stablecoin === true
		},
		disabledOnPages: ['/yields/stablecoins']
	},
	{
		name: 'Single Exposure',
		key: YIELDS_SETTINGS.SINGLE_EXPOSURE.toLowerCase(),
		help: 'Select pools with single token exposure only',
		filterFn: (item) => item.exposure === 'single',
		defaultFilterFnOnPage: {},
		disabledOnPages: []
	},
	{
		name: 'No IL',
		key: YIELDS_SETTINGS.NO_IL.toLowerCase(),
		help: 'Select pools with no impermanent loss',
		filterFn: (item) => item.ilRisk === 'no',
		defaultFilterFnOnPage: {
			'/yields/stablecoins': (item) => item.ilRisk === 'no'
		},
		disabledOnPages: ['/yields/stablecoins']
	},
	{
		name: 'Million Dollar',
		key: YIELDS_SETTINGS.MILLION_DOLLAR.toLowerCase(),
		help: 'Select pools with at least one million dollar in TVL',
		filterFn: (item) => item.tvlUsd >= 1e6,
		defaultFilterFnOnPage: {
			'/yields/stablecoins': (item) => item.tvlUsd >= 1e6
		},
		disabledOnPages: ['/yields/stablecoins']
	},
	{
		name: 'Audited',
		key: YIELDS_SETTINGS.AUDITED.toLowerCase(),
		help: 'Select pools from audited projects only',
		filterFn: (item) => item.audits !== '0',
		defaultFilterFnOnPage: {
			'/yields/stablecoins': (item) => item.audits !== '0'
		},
		disabledOnPages: ['/yields/stablecoins']
	},
	{
		name: 'No Outliers',
		key: YIELDS_SETTINGS.NO_OUTLIER.toLowerCase(),
		help: 'Remove pools which are considered outliers based on their geometric mean of apy values',
		filterFn: (item) => item.outlier === false,
		defaultFilterFnOnPage: {
			'/yields/stablecoins': (item) => item.outlier === false
		},
		disabledOnPages: ['/yields/stablecoins']
	},
	{
		name: 'APY > 0',
		key: YIELDS_SETTINGS.APY_GT0.toLowerCase(),
		help: 'Remove pools with apy values of 0',
		filterFn: (item) => item.apy > 0,
		defaultFilterFnOnPage: {
			'/yields/stablecoins': (item) => item.apy > 0
		},
		disabledOnPages: ['/yields/stablecoins']
	},
	{
		name: 'Stable Outlook',
		key: YIELDS_SETTINGS.STABLE_OUTLOOK.toLowerCase(),
		help: 'Select pools with "Stable/Up" Outlook only',
		filterFn: (item) => item.predictions.predictedClass === 'Stable/Up',
		defaultFilterFnOnPage: {},
		disabledOnPages: []
	},
	{
		name: 'High Confidence',
		key: YIELDS_SETTINGS.HIGH_CONFIDENCE.toLowerCase(),
		help: 'Select pools with "High" predicted outlook confidence',
		filterFn: (item) => item.predictions.binnedConfidence === 3,
		defaultFilterFnOnPage: {},
		disabledOnPages: []
	}
]

export function YieldAttributes({ pathname }: { pathname: string }) {
	const router = useRouter()

	const { attribute = [], ...queries } = router.query

	const values = attributeOptions
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

	const select = useSelectState({
		value: values,
		setValue: updateAttributes,
		gutter: 8,
		renderCallback,
		animated: true
	})

	const toggleAll = () => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					attribute: attributeOptions.map((o) => o.key)
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const clear = () => {
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

	const defaultValues = attributeOptions.filter((option) => option.defaultFilterFnOnPage[router.pathname]).length

	const totalSelected = defaultValues ? defaultValues + values.length : values.length

	return (
		<>
			<SelectButton state={select}>
				<span>Filter by Attribute</span>
				<MenuButtonArrow />
				{totalSelected > 0 && <ItemsSelected>{totalSelected}</ItemsSelected>}
			</SelectButton>
			<SelectPopover state={select} modal={!isLarge}>
				<FilterFnsGroup>
					<button onClick={clear}>Clear</button>

					<button onClick={toggleAll}>Toggle all</button>
				</FilterFnsGroup>
				{attributeOptions.map((option) => (
					<SelectItem key={option.key} value={option.key} disabled={option.disabledOnPages.includes(router.pathname)}>
						{option.help ? <HeadHelp title={option.name} text={option.help} /> : option.name}
						<Checkbox checked={values.includes(option.key) || option.disabledOnPages.includes(router.pathname)} />
					</SelectItem>
				))}
			</SelectPopover>
		</>
	)
}
