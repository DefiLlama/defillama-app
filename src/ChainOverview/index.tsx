import { getProtocolsMetadataByChain } from './queries'

export function ChainOverview() {
	console.log({ protocols: getProtocolsMetadataByChain({ chainDisplayName: 'Ethereum' }) })
	return <></>
}
