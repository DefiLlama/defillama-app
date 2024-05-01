export async function airdropsEligibilityCheck({ address }: { address: string }) {
	try {
		const [others, eigen, config] = await Promise.all([
			fetch(`https://airdrops.llama.fi/check/${address.toLowerCase()}`).then((r) => r.json()),
			fetch(`https://airdrops.llama.fi/eigen/${address.toLowerCase()}`)
				.then((r) => r.json())
				.then((r) => r.tokenQualified)
				.catch((e) => 0),
			fetch('https://airdrops.llama.fi/config').then((res) => res.json())
		])
		const allAirdrops = Object.entries(Object.values(others)[0] ?? {}).concat(eigen > 0 ? [['eigenlayer', eigen]] : [])
		return allAirdrops.map((airdrop) => ({
			name: airdrop[0] === 'eigenlayer' ? 'EigenLayer' : config[airdrop[0]]?.name ?? airdrop[0],
			claimableAmount: airdrop[1],
			page: config[airdrop[0]]?.page ?? null,
			token: config[airdrop[0]]?.token ?? null,
			isActive: airdrop[0] === 'eigenlayer' ? true : config[airdrop[0]]?.isActive ?? false
		}))
	} catch (e) {
		console.log(e)
		throw new Error('There was an error fetching your data')
	}
}
