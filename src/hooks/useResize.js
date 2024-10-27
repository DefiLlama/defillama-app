import { useState, useEffect } from 'react'

export const useResize = (myRef, externalTrigger) => {
	const [width, setWidth] = useState(0)
	const [height, setHeight] = useState(0)

	useEffect(() => {
		const handleResize = () => {
			setWidth(myRef.current?.offsetWidth)
			setHeight(myRef.current?.offsetHeight)
		}

		if (myRef.current) {
			handleResize()
		}

		window.addEventListener('resize', handleResize)

		return () => {
			window.removeEventListener('resize', handleResize)
		}
	}, [myRef, externalTrigger])

	return { width, height }
}
