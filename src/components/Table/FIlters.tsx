import { transparentize } from 'polished'
import { Filter } from 'react-feather'
import styled from 'styled-components'

const Wrapper = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  font-size: 0.825rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  outline: none;
  border: 1px solid transparent;
  background-color: ${({ theme }) => transparentize(0.9, theme.primary1)};
  color: ${({ theme }) => theme.text1};

  white-space: nowrap;

  :hover,
  :focus-visible {
    cursor: pointer;
    background-color: ${({ theme }) => transparentize(0.8, theme.primary1)};
  }

  :focus-visible {
    outline: ${({ theme }) => '1px solid ' + theme.text4};
    outline-offset: 1px;
  }
`

export default function TableFilters() {
  return (
    <Wrapper>
      <Filter size={14} />
      <span>Filters</span>
    </Wrapper>
  )
}
