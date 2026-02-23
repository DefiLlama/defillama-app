export interface RawProtocolTokenUsageEntry {
	name: string
	category: string
	amountUsd: Record<string, number>
	logo?: string
	misrepresentedTokens?: boolean
	[key: string]: unknown
}
