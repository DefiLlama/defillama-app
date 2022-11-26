import { useRouter } from 'next/router'
import styled from 'styled-components'

const Input = styled.input`
	padding: 14px 16px;
	background: ${({ theme }) => theme.bg6};
	color: ${({ theme }) => theme.text1};
	font-size: 1rem;
	border: none;
	border-radius: 12px;
	outline: none;

	::placeholder {
		color: ${({ theme }) => theme.text3};
		font-size: 1rem;
	}

	&[data-focus-visible] {
		outline: ${({ theme }) => '1px solid ' + theme.text4};
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		border: 1px solid ${({ theme }) => theme.divider};
		border-bottom: 0;
	}
`

export function LTV({ placeholder, variant = 'primary' }: { placeholder: string; variant?: 'primary' | 'secondary' }) {
	const router = useRouter()

	const setLTV = (value) => {
		router.push(
			{
				pathname: router.pathname,
				query: {
					...router.query,
					customLTV: value
				}
			},
			undefined,
			{
				shallow: true
			}
		)
	}

	const onChange = (e) => {
		let timer

		if (timer) {
			clearTimeout(timer)
		}

		timer = setTimeout(() => setLTV(e.target.value), 1000)
	}

	return (
		<>
			<Input placeholder={placeholder} onChange={onChange} />
		</>
	)
}
