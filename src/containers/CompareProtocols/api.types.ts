import type { IProtocolChainTvlEntry } from '~/containers/ProtocolOverview/api.types'

export type RawProtocolResponse = {
	name: string
	chainTvls: Record<
		string,
		{
			tvl?: IProtocolChainTvlEntry['tvl']
		}
	>
}
