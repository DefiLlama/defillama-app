import { useMemo } from 'react'

export const useFormatDefiSearchResults = (results) => {
	return useMemo(() => {
		return results.hits.map((hit) => ({
			name: hit.name,
			route: `/${hit.id.startsWith('chain') ? 'chain' : hit.id.startsWith('category') ? 'protocols' : 'protocol'}/${
				hit.id.startsWith('parent') || hit.id.startsWith('protocol')
					? hit.id.split('_')[1]
					: hit.name.replace(' ', '%20')
			}`,
			logo: hit.id.startsWith('category')
				? null
				: hit.id.startsWith('chain')
				? `https://icons.llamao.fi/icons/chains/rsz_${hit.id.split('_')[1]}?w=48&h=48`
				: `https://icons.llamao.fi/icons/protocols/${hit.id.split('_')[1]}?w=48&h=48`
		}))
	}, [results])
}
