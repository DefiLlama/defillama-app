import { MenuButtonArrow, useSelectState } from 'ariakit'
import { useRouter } from 'next/router'
import { Checkbox } from '~/components'
import HeadHelp from '~/components/HeadHelp'
import { FilterButton, FilterPopover } from '~/components/Select/AriakitSelect'
import { YIELDS_SETTINGS } from '~/contexts/LocalStorage'
import { Item, Selected, Stats } from '../shared'

const {
	AUDITED,
	MILLION_DOLLAR,
	NO_IL,
	SINGLE_EXPOSURE,
	STABLECOINS,
	NO_OUTLIER,
	APY_GT0,
	STABLE_OUTLOOK,
	HIGH_CONFIDENCE
} = YIELDS_SETTINGS

export const attributeOptions = [
	{
		name: 'Stablecoins',
		key: STABLECOINS.toLowerCase(),
		help: 'Select pools consisting of stablecoins only',
		filterFn: (item) => item.stablecoin === true,
		defaultFilterFnOnPage: {
			'/yields/stablecoins': (item) => item.stablecoin === true
		},
		disabledOnPages: ['/yields/stablecoins']
	},
	{
		name: 'Single Exposure',
		key: SINGLE_EXPOSURE.toLowerCase(),
		help: 'Select pools with single token exposure only',
		filterFn: (item) => item.exposure === 'single',
		defaultFilterFnOnPage: {},
		disabledOnPages: []
	},
	{
		name: 'No IL',
		key: NO_IL.toLowerCase(),
		help: 'Select pools with no impermanent loss',
		filterFn: (item) => item.ilRisk === 'no',
		defaultFilterFnOnPage: {
			'/yields/stablecoins': (item) => item.ilRisk === 'no'
		},
		disabledOnPages: ['/yields/stablecoins']
	},
	{
		name: 'Million Dollar',
		key: MILLION_DOLLAR.toLowerCase(),
		help: 'Select pools with at least one million dollar in TVL',
		filterFn: (item) => item.tvlUsd >= 1e6,
		defaultFilterFnOnPage: {
			'/yields/stablecoins': (item) => item.tvlUsd >= 1e6
		},
		disabledOnPages: ['/yields/stablecoins']
	},
	{
		name: 'Audited',
		key: AUDITED.toLowerCase(),
		help: 'Select pools from audited projects only',
		filterFn: (item) => item.audits !== '0',
		defaultFilterFnOnPage: {
			'/yields/stablecoins': (item) => item.audits !== '0'
		},
		disabledOnPages: ['/yields/stablecoins']
	},
	{
		name: 'No Outliers',
		key: NO_OUTLIER.toLowerCase(),
		help: 'Remove pools which are considered outliers based on their geometric mean of apy values',
		filterFn: (item) => item.outlier === false,
		defaultFilterFnOnPage: {
			'/yields/stablecoins': (item) => item.outlier === false
		},
		disabledOnPages: ['/yields/stablecoins']
	},
	{
		name: 'APY > 0',
		key: APY_GT0.toLowerCase(),
		help: 'Remove pools with apy values of 0',
		filterFn: (item) => item.apy > 0,
		defaultFilterFnOnPage: {
			'/yields/stablecoins': (item) => item.apy > 0
		},
		disabledOnPages: ['/yields/stablecoins']
	},
	{
		name: 'Stable Outlook',
		key: STABLE_OUTLOOK.toLowerCase(),
		help: 'Select pools with "Stable/Up" Outlook only',
		filterFn: (item) => item.predictions.predictedClass === 'Stable/Up',
		defaultFilterFnOnPage: {},
		disabledOnPages: []
	},
	{
		name: 'High Confidence',
		key: HIGH_CONFIDENCE.toLowerCase(),
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

	const select = useSelectState({
		value: values,
		setValue: updateAttributes,
		gutter: 8
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
			<FilterButton state={select}>
				<span>Filter by Attribute</span>
				<MenuButtonArrow />
				{totalSelected > 0 && <Selected>{totalSelected}</Selected>}
			</FilterButton>
			<FilterPopover state={select}>
				<Stats>
					<button onClick={clear}>clear</button>

					<button onClick={toggleAll}>toggle all</button>
				</Stats>
				{attributeOptions.map((option) => (
					<Item key={option.key} value={option.key} disabled={option.disabledOnPages.includes(router.pathname)}>
						{option.help ? <HeadHelp title={option.name} text={option.help} /> : option.name}
						<Checkbox checked={values.includes(option.key) || option.disabledOnPages.includes(router.pathname)} />
					</Item>
				))}
			</FilterPopover>
		</>
	)
}
