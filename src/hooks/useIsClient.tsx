import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

export const useIsClient = () => {
	return useSyncExternalStore(
		subscribe,
		() => true,
		() => false
	)
}
