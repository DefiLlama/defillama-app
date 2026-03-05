import type { MultiSelectOption } from '~/components/Select/types'
import type { IChainOverviewData } from '~/containers/ChainOverview/types'

export type CompareProtocolsProps = {
	protocols: IChainOverviewData['protocols']
	protocolsList: Array<MultiSelectOption & { score: number }>
}
