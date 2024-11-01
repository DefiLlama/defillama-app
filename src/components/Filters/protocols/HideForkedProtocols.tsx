import { useRouter } from 'next/router'
import { Checkbox2 } from '~/components'

export function HideForkedProtocols() {
	const router = useRouter()

	const { hideForks } = router.query

	const toHide = hideForks && typeof hideForks === 'string' && hideForks === 'true' ? false : true

	const hide = () => {
		router.push(
			{
				pathname: router.pathname,
				query: {
					...router.query,
					hideForks: toHide
				}
			},
			undefined,
			{ shallow: true }
		)
	}
	return (
		<label className="flex items-center gap-1 cursor-pointer">
			<Checkbox2 type="checkbox" value="hideForks" checked={!toHide} onChange={hide} />
			<span>Hide Forked Protocols</span>
		</label>
	)
}
