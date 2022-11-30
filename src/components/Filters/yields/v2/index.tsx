import { ReactNode } from 'react'
import styled from 'styled-components'
import { IncludeExcludeTokens } from './IncludeExcludeTokens'

interface IYieldFiltersProps {
	header: string
	poolsNumber?: number
	projectsNumber?: number
	chainsNumber?: number
	tokens?: Array<{ name: string; symbol: string; logo: string }>
	children?: ReactNode
}

export function YieldFiltersV2({
	header,
	poolsNumber,
	projectsNumber,
	chainsNumber,
	tokens,
	children
}: IYieldFiltersProps) {
	const trackingStats =
		poolsNumber && projectsNumber && chainsNumber
			? `Tracking ${poolsNumber + (poolsNumber > 1 ? ' pools' : ' pool')} over ${
					projectsNumber + (projectsNumber > 1 ? ' protocols' : ' protocol')
			  } on ${chainsNumber + (chainsNumber > 1 ? ' chains' : ' chain')}.`
			: null

	return (
		<div>
			<Header>
				<h1>{header}</h1>
				{trackingStats && <p>{trackingStats}</p>}
				<button>Save This Search</button>
			</Header>
			<Wrapper>
				{tokens && <IncludeExcludeTokens tokens={tokens} />}
				<FiltersWrapper>{children}</FiltersWrapper>
			</Wrapper>
		</div>
	)
}

const Header = styled.div`
	position: relative;
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	background: ${({ theme }) => (theme.mode === 'dark' ? 'black' : 'white')};
	padding: 16px;
	border-radius: 12px 12px 0 0;
	border: 1px solid ${({ theme }) => theme.divider};
	border-bottom: 0;

	& > * {
		font-size: 0.875rem;
		font-weight: 400;
	}

	p {
		color: #646466;
	}

	button {
		margin-left: auto;
		color: ${({ theme }) => theme.link};
	}
`

const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 20px;
	padding: 20px 16px 24px;
	background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(246, 246, 246, 0.6)')};
	border-radius: 0 0 12px 12px;
	border: 1px solid ${({ theme }) => theme.divider};
	border-top: 0;
`

const FiltersWrapper = styled.div`
	display: flex;
	gap: 12px;
	flex-wrap: wrap;
`
