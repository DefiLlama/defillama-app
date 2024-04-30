export async function airdropsEligibilityCheck({ address }: { address: string }) {
	try {
		const [others, eigen] = await Promise.all([
			fetch(`https://airdrops.llama.fi/check/${address.toLowerCase()}`).then((r) => r.json()),
			fetch(`https://airdrops.llama.fi/eigen/${address.toLowerCase()}`)
				.then((r) => r.json())
				.then((r) => r.tokenQualified)
				.catch((e) => 0)
		])
		const allAirdrops = Object.entries(Object.values(others)[0] ?? {}).concat(eigen > 0 ? [['eigenlayer', eigen]] : [])
		return allAirdrops
	} catch (e) {
		console.log(e)
		throw new Error('There was an error fetching your data')
	}
}
