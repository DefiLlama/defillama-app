import { ButtonLight } from 'components/ButtonStyled'
import DropdownSelect from 'components/DropdownSelect'
import { BasicLink } from 'components/Link'
import { useResize } from 'hooks'
import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

interface IFilterOption {
  label: string
  to: string
}

interface FiltersProps {
  filterOptions: IFilterOption[]
}

const Wrapper = styled.ul`
  flex: 1;
  overflow: hidden;
  gap: 6px;
  margin: 0;
  padding: 0;
  white-space: nowrap;
  & > li {
    list-style: none;
    display: inline-block;
  }

  & > li + li {
    margin-left: 8px;
  }
`

const Filters = ({ filterOptions = [], ...props }: FiltersProps) => {
  const ref = useRef<HTMLUListElement>(null)

  const { width: parentElWidth } = useResize(ref)

  const filtersWidth = useRef(0)

  return (
    <>
      <Wrapper {...props} ref={ref}>
        {filterOptions.map((option, index) => (
          <Filter
            option={option}
            key={option.label}
            filtersWidth={filtersWidth}
            parentElWidth={parentElWidth}
            filterIndex={index}
          />
        ))}
      </Wrapper>
      <select>
        <option>Others</option>
        {filterOptions.map((o) => (
          <option value={o.to} key={o.to}>
            {o.label}
          </option>
        ))}
      </select>
    </>
  )
}

const Filter = ({ option, filtersWidth, parentElWidth, filterIndex }) => {
  const ref = useRef<HTMLLIElement>(null)

  const [display, setDisplay] = useState(true)

  if (filterIndex === 0) {
    filtersWidth.current = 0
  }

  useEffect(() => {
    if (parentElWidth && filtersWidth.current > parentElWidth) {
      setDisplay(false)
    } else {
      setDisplay(true)
    }

    if (ref.current) {
      filtersWidth.current += ref.current.offsetWidth
    }
  }, [filtersWidth, parentElWidth])

  if (!display) return null

  return (
    <li ref={ref}>
      <BasicLink href={option.to}>
        <ButtonLight>{option.label}</ButtonLight>
      </BasicLink>
    </li>
  )
}

export default Filters
