import { useRouter } from 'next/router'
import styled from 'styled-components'
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
		<Wrapper>
			<Checkbox2 type="checkbox" value="hideForks" checked={!toHide} onChange={hide} />
			<span>Hide Forked Protocols</span>
		</Wrapper>
	)
}

const Wrapper = styled.label`
	display: flex;
	align-items: center;
	gap: 6px;
	cursor: pointer;
`
