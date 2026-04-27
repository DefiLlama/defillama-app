import { useEffect } from 'react'
import { setReferrer } from '~/containers/Subscription/referrer'

export function useReferrer() {
	useEffect(() => {
		if (typeof window === 'undefined') return
		try {
			const value = new URLSearchParams(window.location.search).get('ref')
			if (value) setReferrer(value)
		} catch {}
	}, [])
}
