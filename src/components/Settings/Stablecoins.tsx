import { UNRELEASED } from '~/contexts/LocalStorage'

export const extraPeggedOptions = [
	{
		name: 'Unreleased',
		key: UNRELEASED,
		help: 'Include tokens that were minted but have never been circulating.'
	}
]

export const extraPeggedSettings = extraPeggedOptions.map((p) => p.key)
