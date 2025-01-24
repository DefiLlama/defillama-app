import LRU from 'lru-cache'

const options = {
	max: 500,
	ttl: 1000 * 60 * 60
}

export const apiCache = new LRU.LRUCache(options)
