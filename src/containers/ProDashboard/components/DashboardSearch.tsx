import { useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'

export function DashboardSearch({ defaultValue }: { defaultValue?: string }) {
	const router = useRouter()

	const id = useRef(null)

	// cleanup timeout on unmount
	// so if user navigates way, we don't change the url back to discovery page with searchquery params
	useEffect(() => {
		return () => {
			if (id.current) {
				clearTimeout(id.current)
			}
		}
	}, [])

	return (
		<div className="w-full flex-1 lg:max-w-3xl">
			<div className="relative flex-1">
				<Icon name="search" height={16} width={16} className="absolute top-1/2 left-3 -translate-y-1/2" />
				<input
					type="text"
					defaultValue={defaultValue ?? ''}
					onChange={(e) => {
						const currentValue = e.target.value

						if (id.current) {
							clearTimeout(id.current)
						}
						id.current = setTimeout(() => {
							const { page, ...queryWithoutPage } = router.query
							router.push(
								{
									pathname: '/pro',
									query: { ...queryWithoutPage, query: currentValue }
								},
								undefined,
								{ shallow: true }
							)
						}, 300)
					}}
					placeholder="Search dashboards by name or description or tags..."
					className="w-full rounded-md border border-(--form-control-border) bg-(--cards-bg) px-2 py-2 pl-8"
				/>
			</div>
		</div>
	)
}
