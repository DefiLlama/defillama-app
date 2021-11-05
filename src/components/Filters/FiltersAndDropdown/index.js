import { useState, useRef, useEffect } from 'react'

import { ButtonLight, ButtonDark } from 'components/ButtonStyled'
import { BasicLink } from 'components/Link'
import DropdownSelect from 'components/DropdownSelect'
import Row from 'components/Row'

import { useResize } from 'hooks'
const letterPxLength = 8
const marginPxLength = 3.2

// filter option to, and label,
const FiltersAndDropdown = ({ filterOptions = [], activeLabel, setActive, areLinks, onFilterClick }) => {
  const [visibleFiltersIndex, setVisibileFilterIndex] = useState(0)
  const mainWrapEl = useRef(null)
  const { width: mainWrapWidth } = useResize(mainWrapEl)
  const stringifyFilterOptions = JSON.stringify(filterOptions)

  useEffect(() => {
    let remainingWidth = mainWrapWidth
    let lastIndexOfFilters = 0
    filterOptions.forEach(({ label }) => {
      if (remainingWidth < 0) return
      remainingWidth -= marginPxLength + label.length * letterPxLength
      lastIndexOfFilters += 1
    })
    setVisibileFilterIndex(lastIndexOfFilters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainWrapWidth, stringifyFilterOptions])

  const clickableFilters = filterOptions.slice(visibleFiltersIndex, filterOptions.length)

  return (
    <Row ref={mainWrapEl}>
      {clickableFilters.map(({ label, to }) => {
        if (label === activeLabel) {
          return (
            <ButtonDark style={{ margin: '0.2rem' }} key={label}>
              {label}
            </ButtonDark>
          )
        } else {
          return areLinks ? (
            <BasicLink to={to} key={label}>
              <ButtonLight style={{ margin: '0.2rem' }}>{label}</ButtonLight>
            </BasicLink>
          ) : (
            <ButtonLight onClick={onFilterClick} style={{ margin: '0.2rem' }}>
              {label}
            </ButtonLight>
          )
        }
      })}
      {visibleFiltersIndex !== filterOptions.length && (
        <DropdownSelect
          options={filterOptions.slice(visibleFiltersIndex, filterOptions.length)}
          active={clickableFilters.includes(activeLabel) ? activeLabel : 'Others'}
          setActive={setActive}
        />
      )}
    </Row>
  )
}
export default FiltersAndDropdown
