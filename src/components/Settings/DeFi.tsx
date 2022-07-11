import { BORROWED, DOUBLE_COUNT, POOL2, STAKING } from '~/contexts/LocalStorage'
import { SwitchGroup } from './shared'

export const defiTvlOptions = [
	{
		name: 'Staking',
		key: STAKING,
		help: 'Include governance tokens staked in the protocol'
	},
	{
		name: 'Pool2',
		key: POOL2,
		help: 'Include staked lp tokens where one of the coins in the pair is the governance token'
	},
	{
		name: 'Borrows',
		key: BORROWED,
		help: 'Include borrowed coins in lending protocols'
	},
	{
		name: 'Double Count',
		key: DOUBLE_COUNT,
		help: 'Include TVL of protocols which TVL feeds into another protocol'
	}
]

export const DefiTvlSwitches = ({ options, ...props }) => {
	let tvlOptions = options || [...defiTvlOptions]

	return <SwitchGroup options={tvlOptions} {...props} />
}

export const extraTvlSettings = defiTvlOptions.map((d) => d.key)
