export const mapProtocolName = (protocolName: string) => {
	if (protocolName === 'trader-joe') {
		return 'traderjoe'
	} else if (protocolName === 'aave') {
		return 'AAVE'
	} else if (protocolName === 'convex-finance') {
		return 'convex'
	}
	return protocolName
}
