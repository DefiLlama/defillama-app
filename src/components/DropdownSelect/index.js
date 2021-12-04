import React, { useState } from 'react'
import { ChevronDown as Arrow } from 'react-feather'
import styled from 'styled-components'

import Row, { RowBetween } from '../Row'
import Column from '../Column'
import { TYPE } from '../../Theme'
import { StyledIcon } from '..'
import { BasicLink } from '../Link'

const Wrapper = styled.div`
  position: relative;
  width: 100px;

  background-color: ${({ theme }) => theme.panelColor};
  border: 1px solid rgba(0, 0, 0, 0.15);
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
  min-width: 100px;
  position: absolute;
  z-index: 20;
  top: 34px;
  padding-top: 40px;
  background-color: ${({ theme }) => theme.bg1};
  border: 1px solid rgba(0, 0, 0, 0.15);
  padding: 10px 10px;
  border-radius: 8px;
  width: fit-content;
  font-weight: 500;
  font-size: 1rem;
  color: black;
  max-height: 600px;

  ${({ overflowVisible }) => (overflowVisible ? 'overflow: visible' : 'overflow-y: auto;')}

  :hover {
    cursor: pointer;
  }

  @media screen and (max-width: ${({ theme }) => theme.bpSm}) {
    max-height: 300px;
  }
`

const ArrowStyled = styled(Arrow)`
  height: 20px;
  width: 20px;
  margin-left: 6px;
`

const DropdownSelect = ({ options, active, setActive, color, style, overflowVisible }) => {
  const [showDropdown, toggleDropdown] = useState(false)
  let optionsArr = options
  if (!Array.isArray(options)) {
    optionsArr = Object.values(optionsArr)
  }

  return (
    <div style={{ position: 'relative' }}>
      <Wrapper open={showDropdown} color={color} style={style}>
        <RowBetween onClick={() => toggleDropdown(!showDropdown)} justify="center">
          <TYPE.main>{active}</TYPE.main>
          <StyledIcon>
            <ArrowStyled />
          </StyledIcon>
        </RowBetween>
      </Wrapper>
      {showDropdown && !!optionsArr.length && (
        <Dropdown overflowVisible={overflowVisible}>
          <Column style={{ gap: '20px' }}>
            {optionsArr.map(({ label, to }, index) => {
              return (
                label !== active && (
                  <Row
                    onClick={() => {
                      toggleDropdown(!showDropdown)
                      if (setActive) {
                        setActive(label)
                      }
                    }}
                    key={index}
                  >
                    <BasicLink href={to ?? '#'} key={label}>
                      <TYPE.body minWidth="initial" fontSize={14}>
                        {label}
                      </TYPE.body>
                    </BasicLink>
                  </Row>
                )
              )
            })}
          </Column>
        </Dropdown>
      )}
    </div>
  )
}

export default DropdownSelect
