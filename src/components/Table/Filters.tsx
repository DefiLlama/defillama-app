import Popover from 'components/Popover'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { Filter } from 'react-feather'

const TvlFilterForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 8px;

  h1 {
    margin: 0 0 -4px;
    padding: 0;
    font-weight: 500;
    text-align: center;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  input {
    padding: 4px;
    border-radius: 4px;
    border: ${({ theme }) => '1px solid ' + theme.text4};

    :focus-visible {
      outline: ${({ theme }) => '1px solid ' + theme.text2};
    }
  }

  button {
    padding: 4px;
    border-radius: 4px;
    border: ${({ theme }) => '1px solid ' + theme.text4};
    margin: 6px 0 0;

    :focus-visible {
      outline: ${({ theme }) => '1px solid ' + theme.text2};
    }

    :hover {
      cursor: pointer;
    }
  }
`

export function TableFilters() {
  const router = useRouter()
  const handleSubmit = (e) => {
    e.preventDefault()
    const form = e.target
    const minTvl = form.minTvl?.value
    const maxTvl = form.maxTvl?.value
    router.push(`${router.pathname}?minTvl=${minTvl}&maxTvl=${maxTvl}`, undefined, { shallow: true })
  }
  return (
    <Popover
      trigger={
        <>
          <Filter size={14} />
          <span>Filters</span>
        </>
      }
      content={
        <section style={{ width: '240px' }}>
          <TvlFilterForm onSubmit={handleSubmit}>
            <h1>TVL Range</h1>
            <label>
              <span>Min</span>
              <input type="number" name="minTvl" required />
            </label>
            <label>
              <span>Max</span>
              <input type="number" name="maxTvl" required />
            </label>
            <button>Filter</button>
          </TvlFilterForm>
        </section>
      }
    />
  )
}
