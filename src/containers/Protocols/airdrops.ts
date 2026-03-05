import { fetchJson } from '~/utils/async'

interface AirdropEntry {
	name: string
	claimableAmount: number
	page?: string | null
	token?: string | null
	tokenSymbol?: string | null
	isActive?: boolean
}

export type AirdropsResult = Array<[string, AirdropEntry[]]>

export async function airdropsEligibilityCheck({ addresses }: { addresses: Array<string> }): Promise<AirdropsResult> {
	try {
		const [others, config] = await Promise.all([
			fetchJson<Record<string, Record<string, number>>>(
				`https://airdrops.llama.fi/check/${addresses.join(',').toLowerCase()}`
			),
			fetchJson<
				Record<
					string,
					{
						name?: string
						page?: string
						token?: string
						tokenSymbol?: string
						endTime?: number
						isActive?: boolean
					}
				>
			>('https://airdrops.llama.fi/config')
		])

		const allAirdrops: AirdropsResult = Object.entries(others).map(([address, airdrops]) => [
			address,
			Object.entries(airdrops ?? {})
				.map(([key, amount]) => {
					const entry = config[key]
					const endTime = entry?.endTime
					return {
						name: entry?.name ?? key,
						claimableAmount: amount,
						page: entry?.page ?? null,
						token: entry?.token ?? null,
						tokenSymbol: entry?.tokenSymbol ?? null,
						isActive:
							endTime != null ? new Date().getTime() < new Date(endTime * 1000).getTime() : (entry?.isActive ?? false)
					}
				})
				.filter((x) => x.isActive)
		])

		return allAirdrops
	} catch (e) {
		console.error(e)
		throw new Error('There was an error fetching your data', { cause: e })
	}
}
