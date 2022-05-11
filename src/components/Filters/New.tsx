import { ButtonDark, ButtonLight } from 'components/ButtonStyled'
import { useResize } from 'hooks'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'

interface IFilterOption {
  label: string
  to: string
}

interface FiltersProps {
  filterOptions: IFilterOption[]
  activeLabel?: string
}

const Wrapper = styled.ul`
  flex: 1;
  overflow: hidden;
  gap: 6px;
  margin: 0;
  padding: 4px;
  white-space: nowrap;
  & > li {
    list-style: none;
    display: inline-block;
  }

  & > li + li {
    margin-left: 8px;
  }
`

const Filters = ({ filterOptions = [], activeLabel, ...props }: FiltersProps) => {
  const ref = useRef<HTMLUListElement>(null)

  const { width: parentElWidth } = useResize(ref)

  const [filtersWidth, setFiltersWidth] = useState([])

  const removeFilters =
    filtersWidth.length === filterOptions.length && parentElWidth && filtersWidth.find((f) => f.width >= parentElWidth)

  const indexToSliceFrom = removeFilters ? removeFilters.index : null

  const filters = useMemo(() => {
    if (indexToSliceFrom) {
      return indexToSliceFrom ? filterOptions.slice(0, indexToSliceFrom) : filterOptions
    } else return filterOptions
  }, [filterOptions, indexToSliceFrom])

  return (
    <>
      <Wrapper {...props} ref={ref}>
        {filters.map((option, index) => (
          <Filter
            key={option.label}
            option={option}
            setFiltersWidth={setFiltersWidth}
            filterIndex={index}
            activeLabel={activeLabel}
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

const Filter = ({ option, activeLabel, setFiltersWidth, filterIndex }) => {
  const ref = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (ref.current) {
      setFiltersWidth((prev) => {
        const latestFilter = filterIndex !== 0 && prev[prev.length - 1]

        return [
          ...prev,
          {
            index: filterIndex,
            width: latestFilter ? latestFilter.width + ref.current.offsetWidth : ref.current.offsetWidth,
          },
        ]
      })
    }
  }, [filterIndex, setFiltersWidth])

  return (
    <li ref={ref}>
      <Link href={option.to} prefetch={false} passHref>
        {option.label === activeLabel ? (
          <ButtonDark role="link">{option.label}</ButtonDark>
        ) : (
          <ButtonLight role="link">{option.label}</ButtonLight>
        )}
      </Link>
    </li>
  )
}

export default Filters
