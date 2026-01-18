import { useEffect, useState } from 'react'

export const useResize = (myRef: React.RefObject<HTMLDivElement>) => {
	const [width, setWidth] = useState<number>(0)
	const [height, setHeight] = useState<number>(0)

	useEffect(() => {
		const handleResize = () => {
			// Ref objects are stable - reading .current always gets the latest value
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
		// eslint-disable-next-line react-hooks/exhaustive-deps -- Ref object is stable, no need to include in deps
	}, [])

	return { width, height }
}
