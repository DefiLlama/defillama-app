import { useRouter } from 'next/router'
import { Search } from 'react-feather'
import styled from 'styled-components'

export function LTV({ placeholder }: { placeholder: string }) {
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
		<Wrapper data-alwaysdisplay>
			<Search size={16} />
			<input placeholder={placeholder} onChange={onChange} type="number" />
		</Wrapper>
	)
}

const Wrapper = styled.div`
	position: relative;
	display: flex;
	flex: nowrap;
	background: ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
	border-radius: 8px;

	svg {
		position: absolute;
		top: 8px;
		left: 8px;
		color: #646466;
	}

	input {
		border-radius: 8px;
		border: none;
		padding: 8px;
		padding-left: 32px;
		background: ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
		font-size: 0.875rem;
		width: 100%;
	}
`
