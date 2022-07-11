import {
	STABLECOINS,
	SINGLE_EXPOSURE,
	NO_IL,
	MILLION_DOLLAR,
	AUDITED,
	NO_OUTLIER,
	APY_GT0
} from '~/contexts/LocalStorage'

export const yieldOptions = [
	{
		name: 'Stablecoins',
		key: STABLECOINS,
		help: 'Select pools consisting of stablecoins only'
	},
	{
		name: 'Single Exposure',
		key: SINGLE_EXPOSURE,
		help: 'Select pools with single token exposure only'
	},
	{
		name: 'No IL',
		key: NO_IL,
		help: 'Select pools with no impermanent loss'
	},
	{
		name: 'Million Dollar',
		key: MILLION_DOLLAR,
		help: 'Select pools with at least one million dollar in TVL'
	},
	{
		name: 'Audited',
		key: AUDITED,
		help: 'Select pools from audited projects only'
	},
	{
		name: 'No Outliers',
		key: NO_OUTLIER,
		help: 'Remove pools which extreme apy values'
	},
	{
		name: 'APY > 0',
		key: APY_GT0,
		help: 'Remove pools which 0 apy values'
	}
]

export const extraYieldSettings = yieldOptions.map((y) => y.key)
