export function setWithExpiry(key, value, ttl) {
	const item = {
		value: value,
		expiry: new Date().getTime() + ttl
	}
	localStorage.setItem(key, JSON.stringify(item))
}

export function getWithExpiry(key) {
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
