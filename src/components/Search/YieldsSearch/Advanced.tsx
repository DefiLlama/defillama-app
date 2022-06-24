import * as React from 'react'
import { transparentize } from 'polished'
import styled from 'styled-components'
import { ToggleSearch } from './shared'

interface IAdvancedYieldSearchProps {
  setAdvancedSearch: React.Dispatch<React.SetStateAction<boolean>>
}

export function AdvancedYieldsSearch({ setAdvancedSearch }: IAdvancedYieldSearchProps) {
  return (
    <Wrapper>
      <Header>
        <h1>Advanced Search</h1>
        <ToggleSearch onClick={() => setAdvancedSearch(false)}>Switch to Basic Search</ToggleSearch>
      </Header>
      <Form>
        <Label>
          <span>Include token(s):</span>
        </Label>
        <Label>
          <span>Exclude token(s):</span>
        </Label>
        <ConfirmButton>Search</ConfirmButton>
      </Form>
    </Wrapper>
  )
}

const Wrapper = styled.div`
  padding: 12px 16px 24px;

  color: ${({ theme }) => theme.text1};
  background: ${({ theme }) => transparentize(0.4, theme.bg6)};
  border-radius: 12px;
`

const Header = styled.span`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;

  h1 {
    font-weight: 400;
    font-size: 1rem;
  }

  button {
    padding: 0;
    margin: 0;
  }
`

const Form = styled.form`
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const Label = styled.label`
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.875rem;
  opacity: 0.6;
`

const ConfirmButton = styled.button`
  padding: 8px 12px;
  background: #2172e5;
  color: #fff;
  border-radius: 8px;
  width: min-content;

  :hover,
  :focus-visible {
    background: #4190ff;
  }
`
