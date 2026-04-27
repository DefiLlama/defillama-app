import { useEffect } from 'react'
import { setReferrer } from '~/containers/Subscription/referrer'

export function useReferrer() {
	useEffect(() => {
		if (typeof window === 'undefined') return
		try {
			const params = new URLSearchParams(window.location.search)
			let value: string | null = null
			for (const [key, val] of params.entries()) {
				if (key.toLowerCase() === 'ref' && val) {
					value = val
					break
				}
			}
			if (value) setReferrer(value)
		} catch {}
	}, [])
}
