const WALLET_EMAIL_SUFFIX = '@defillama.com'
const WALLET_EMAIL_LENGTH = 56 // 42 (0x + 40 hex chars) + 14 (@defillama.com)

export function isWalletEmail(email: string | undefined | null): boolean {
	return !!email && email.endsWith(WALLET_EMAIL_SUFFIX) && email.length === WALLET_EMAIL_LENGTH
}

export function getWalletAddress(email: string): string {
	return email.replace(WALLET_EMAIL_SUFFIX, '')
}

export function truncateAddress(address: string): string {
	return `${address.slice(0, 6)}...${address.slice(-6)}`
}
