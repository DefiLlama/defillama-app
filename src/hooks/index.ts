import { useEffect, useState } from 'react'

export const useIsClient = () => {
	const [isClient, setIsClient] = useState(false)

	const windowType = typeof document

	useEffect(() => {
		if (windowType !== 'undefined') {
			setIsClient(true)
		}
	}, [windowType])

	return isClient
}
