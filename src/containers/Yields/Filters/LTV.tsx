import { useRouter } from 'next/router'
import { useEffect, useRef } from 'react'
import { pushYieldsQuery } from '../queryUpdates.client'

export function LTV({ placeholder }: { placeholder: string }) {
	const router = useRouter()
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const setLTV = (value) => {
		void pushYieldsQuery(router, { customLTV: value || undefined })
	}

	const onChange = (e) => {
		if (timerRef.current) {
			clearTimeout(timerRef.current)
		}

		timerRef.current = setTimeout(() => setLTV(e.target.value), 1000)
	}

	useEffect(() => {
		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current)
			}
		}
	}, [])

	return (
		<div className="relative flex flex-col rounded-md">
			<input
				placeholder={placeholder}
				onChange={onChange}
				type="number"
				className="rounded-md border border-(--cards-border) bg-(--app-bg) px-2 py-1 text-base"
			/>
		</div>
	)
}
