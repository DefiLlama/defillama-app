export interface IBridgedRow {
	name: string
	total?: { total?: string }
	thirdParty?: { total?: string }
	canonical?: { total?: string }
	ownTokens?: { total?: string }
	native?: { total?: string }
	change_24h: number
}
