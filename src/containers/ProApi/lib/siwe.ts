export const getSIWEMessage = ({
	domain,
	address,
	statement,
	uri,
	version,
	chainId,
	nonce
}: {
	domain: string
	address: string
	statement: string
	uri: string
	version: string
	chainId: number
	nonce: string
}) => {
	const header = `${domain} wants you to sign in with your Ethereum account:`
	const uriField = `URI: ${uri}`
	let prefix = [header, address].join('\n')
	const versionField = `Version: ${version}`
	const chainField = `Chain ID: ` + chainId || '1'
	const nonceField = `Nonce: ${nonce}`
	const suffixArray = [uriField, versionField, chainField, nonceField]
	suffixArray.push(`Issued At: ${new Date().toISOString()}`)

	const suffix = suffixArray.join('\n')
	prefix = [prefix, statement].join('\n\n')
	if (statement) {
		prefix += '\n'
	}
	return [prefix, suffix].join('\n')
}
