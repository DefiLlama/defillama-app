export function setWithExpiry(key: string, value: any, ttl: number) {
	const item = {
		value,
		expiry: new Date().getTime() + ttl
	}

	localStorage.setItem(key, JSON.stringify(item))
}

export function getWithExpiry(key: string) {
	const itemString = window.localStorage.getItem(key)
	if (!itemString) return null

	const item = JSON.parse(itemString)
	const isExpired = new Date().getTime() > item.expiry

	if (isExpired) {
		localStorage.removeItem(key)
		return null
	}

	return item.value
}
