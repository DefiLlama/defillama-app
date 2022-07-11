import { DISPLAY_USD, HIDE_LAST_DAY } from '~/contexts/LocalStorage'
import { SwitchGroup } from './shared'

export const nftOptions = [
	{
		name: 'Display in USD',
		key: DISPLAY_USD,
		help: 'Display metrics in USD'
	},
	{
		name: 'Hide last day',
		key: HIDE_LAST_DAY,
		help: 'Hide the last day of data'
	}
]

export function NFTSwitches(props) {
	return <SwitchGroup options={nftOptions} {...props} />
}

export const extraNftSettings = nftOptions.map((n) => n.key)
