import { promises as fs } from 'fs'
import path from 'path'

export type TokenDirectoryRecord = {
	name: string
	symbol: string
	token_nk?: string
	protocolId?: string
	chainId?: string
	route?: string
	tokenRights?: boolean
}

export type TokenDirectory = Record<string, TokenDirectoryRecord>

export async function readTokenDirectory(): Promise<TokenDirectory> {
	const tokensPath = path.join(process.cwd(), 'public', 'tokens.json')
	const tokensJson = await fs.readFile(tokensPath, 'utf8')
	return JSON.parse(tokensJson) as TokenDirectory
}

export function findTokenDirectoryRecordByDefiLlamaId(
	tokens: TokenDirectory,
	defiLlamaId: string | null | undefined
): TokenDirectoryRecord | null {
	if (!defiLlamaId) return null

	for (const key in tokens) {
		const token = tokens[key]

		if (token.protocolId === defiLlamaId || token.chainId === defiLlamaId) {
			return token
		}
	}

	return null
}
