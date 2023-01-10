import { useEffect, useRef } from 'react'

const names = {}

export const useSyncScroller = (id) => {
	const ref = useRef()

	useEffect(() => {
		if (names[id]) {
			names[id].push(ref)
		} else {
			names[id] = [ref]
		}
	}, [id, ref])

	useEffect(() => {
		if (!ref.current) {
			return
		}
		const el = ref.current

		const onScroll = () => {
			const elements = names[id]

			let scrollX = el.scrollLeft
			let scrollY = el.scrollTop

			const xRate = scrollX / (el.scrollWidth - el.clientWidth)
			const yRate = scrollY / (el.scrollHeight - el.clientHeight)

			const updateX = scrollX !== el.eX
			const updateY = scrollY !== el.eY

			el.eX = scrollX
			el.eY = scrollY

			for (let elem of elements) {
				let otherEl = elem.current
				if (otherEl !== el && !!otherEl) {
					if (
						updateX &&
						Math.round(
							otherEl.scrollLeft -
								(scrollX = otherEl.eX = Math.round(xRate * (otherEl.scrollWidth - otherEl.clientWidth)))
						)
					) {
						otherEl.scrollLeft = scrollX
					}

					if (
						updateY &&
						Math.round(
							otherEl.scrollTop -
								(scrollY = otherEl.eY = Math.round(yRate * (otherEl.scrollHeight - otherEl.clientHeight)))
						)
					) {
						otherEl.scrollTop = scrollY
					}
				}
			}
		}

		el.addEventListener('scroll', onScroll)
		return () => {
			el.removeEventListener('scroll', onScroll)
		}
	}, [id])

	return ref
}
