import { IFormattedProtocol } from '~/api/types'

export interface IProtocolRow extends IFormattedProtocol {
	subRows?: Array<IFormattedProtocol>
}

export interface IProtocolRowWithCompare extends IProtocolRow {
	isCompared?: boolean
	compare?: (protocol: string) => void
}
