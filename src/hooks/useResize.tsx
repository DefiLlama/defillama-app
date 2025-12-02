import { useEffect, useState } from 'react'

export const useResize = (myRef: React.RefObject<HTMLDivElement>) => {
	const [width, setWidth] = useState<number>(0)
	const [height, setHeight] = useState<number>(0)

	useEffect(() => {
		const handleResize = () => {
			if (myRef.current) {
				setWidth(myRef.current.offsetWidth)
				setHeight(myRef.current.offsetHeight)
			}
		}

		handleResize()

		window.addEventListener('resize', handleResize)

		return () => {
			window.removeEventListener('resize', handleResize)
		}
	}, [myRef])

	return { width, height }
}
