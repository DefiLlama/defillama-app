import { IFormattedProtocol } from '~/api/types'

export interface IProtocolRow extends IFormattedProtocol {
	subRows?: Array<IFormattedProtocol>
}
