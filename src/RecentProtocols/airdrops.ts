export async function airdropsEligibilityCheck({ addresses }: { addresses: Array<string> }) {
	try {
		const [others, config] = await Promise.all([
			fetch(`https://airdrops.llama.fi/check/${addresses.join(',').toLowerCase()}`).then((r) => r.json()),
			fetch('https://airdrops.llama.fi/config').then((res) => res.json())
		])

		const allAirdrops: Array<
			[
				string,
				Array<{
					name: string
					claimableAmount: number
					page?: string | null
					token?: string | null
					tokenSymbol?: string | null
					isActive?: boolean
				}>
			]
		> = Object.entries(others).map(([address, airdrops]: [string, Record<string, number>]) => [
			address,
			Object.entries(airdrops ?? {})
				.map((airdrop) => ({
					name: config[airdrop[0]]?.name ?? airdrop[0],
					claimableAmount: airdrop[1],
					page: config[airdrop[0]]?.page ?? null,
					token: config[airdrop[0]]?.token ?? null,
					tokenSymbol: config[airdrop[0]]?.tokenSymbol ?? null,
					isActive: config[airdrop[0]]?.endTime
						? new Date().getTime() < new Date(config[airdrop[0]].endTime * 1000).getTime()
						: config[airdrop[0]]?.isActive ?? false
				}))
				.filter((x) => x.isActive)
		])

		return allAirdrops
	} catch (e) {
		console.log(e)
		throw new Error('There was an error fetching your data')
	}
}
