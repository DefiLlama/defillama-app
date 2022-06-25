import * as React from 'react'
import { transparentize } from 'polished'
import styled from 'styled-components'
import { ToggleSearch } from './shared'
import ReactSelect from 'components/Select/ReactSelect'
import { useFetchYieldsList } from 'utils/categories/yield'

interface IAdvancedYieldSearchProps {
  setAdvancedSearch: React.Dispatch<React.SetStateAction<boolean>>
  setTokensToFilter: React.Dispatch<
    React.SetStateAction<{
      includeTokens: string[]
      excludeTokens: string[]
    }>
  >
}

export function AdvancedYieldsSearch({ setAdvancedSearch, setTokensToFilter }: IAdvancedYieldSearchProps) {
  const [includeTokens, setIncludeTokens] = React.useState([])
  const [excludeTokens, setExcludeTokens] = React.useState([])

  const { data, loading } = useFetchYieldsList()

  const handleSubmit = (e) => {
    e.preventDefault()
    setTokensToFilter({
      includeTokens: includeTokens.map((t) => t.label.toLowerCase()),
      excludeTokens: excludeTokens.map((t) => t.label.toLowerCase()),
    })
  }

  const options = React.useMemo(() => {
    return data?.map((d) => ({ label: d.symbol?.toUpperCase(), value: d.id }))
  }, [data])

  return (
    <Wrapper>
      <Header>
        <h1>Advanced Search</h1>
        <ToggleSearch onClick={() => setAdvancedSearch(false)}>Switch to Basic Search</ToggleSearch>
      </Header>
      <Form onSubmit={handleSubmit}>
        <Label>
          <span>Include token(s):</span>
          <Select
            options={options}
            styles={SelectStyles}
            isLoading={loading}
            isMulti
            value={includeTokens}
            onChange={setIncludeTokens}
            aria-label="Include tokens"
            placeholder="Search for a token..."
          />
        </Label>
        <Label>
          <span>Exclude token(s):</span>
          <Select
            options={options}
            styles={SelectStyles}
            isLoading={loading}
            isMulti
            value={excludeTokens}
            onChange={setExcludeTokens}
            aria-label="Exclude tokens"
            placeholder="Search for a token..."
          />
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

const Select = styled(ReactSelect)`
  --background: ${({ theme }) => theme.bg6};
  --menu-background: ${({ theme }) => theme.bg6};
  --border: ${({ theme }) => transparentize(0.7, theme.text1)};
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

  & > *:first-child {
    opacity: 0.6;
  }
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

const SelectStyles = {
  control: (provided) => ({
    ...provided,
    background: 'var(--background)',
    padding: '0',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    color: 'var(--color)',
    boxShadow: 'none',
    margin: 0,
  }),
  multiValue: (provided) => ({
    ...provided,
    fontFamily: 'inherit',
    background: 'var(--option-bg)',
    margin: '0 2px',
  }),
  valueContainer: (provided) => ({ ...provided, padding: '4px' }),
  loadingIndicator: (provided) => ({ ...provided, padding: '0 4px' }),
  clearIndicator: (provided) => ({ ...provided, padding: '0 4px' }),
  dropdownIndicator: (provided) => ({ ...provided, padding: '0 4px' }),
  menuList: (provided) => ({ ...provided, zIndex: 100 }),
}
