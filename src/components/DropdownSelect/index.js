import React, { useState } from 'react'
import { ChevronDown as Arrow } from 'react-feather'
import styled from 'styled-components'

import Row, { RowBetween } from 'components/Row'
import { AutoColumn } from 'components/Column'
import { TYPE } from 'Theme'
import { StyledIcon } from '..'

const Wrapper = styled.div`
  z-index: 20;
  position: relative;
  background-color: ${({ theme }) => theme.panelColor};
  border: 1px solid ${({ open, color }) => (open ? color : 'rgba(0, 0, 0, 0.15);')} 
  width: 100px;
  padding: 4px 10px;
  padding-right: 6px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;

  :hover {
    cursor: pointer;
  }
`

const Dropdown = styled.div`
  position: absolute;
  top: 34px;
  padding-top: 40px;
  width: calc(100% - 40px);
  background-color: ${({ theme }) => theme.bg1};
  border: 1px solid rgba(0, 0, 0, 0.15);
  padding: 10px 10px;
  border-radius: 8px;
  width: calc(100% - 20px);
  font-weight: 500;
  font-size: 1rem;
  color: black;
  :hover {
    cursor: pointer;
  }
`

const ArrowStyled = styled(Arrow)`
  height: 20px;
  width: 20px;
  margin-left: 6px;
`

const DropdownSelect = ({ options, active, setActive, color, style }) => {
  const [showDropdown, toggleDropdown] = useState(false)

  return (
    <Wrapper open={showDropdown} color={color} style={style}>
      <RowBetween onClick={() => toggleDropdown(!showDropdown)} justify="center">
        <TYPE.main>{active}</TYPE.main>
        <StyledIcon>
          <ArrowStyled />
        </StyledIcon>
      </RowBetween>
      {showDropdown && (
        <Dropdown>
          <AutoColumn gap="20px">
            {options.map(({ label }, index) => {
              return (
                label !== active && (
                  <Row
                    onClick={() => {
                      toggleDropdown(!showDropdown)
                      setActive(label)
                    }}
                    key={index}
                  >
                    <TYPE.body fontSize={14}>{label}</TYPE.body>
                  </Row>
                )
              )
            })}
          </AutoColumn>
        </Dropdown>
      )}
    </Wrapper>
  )
}

export default DropdownSelect
