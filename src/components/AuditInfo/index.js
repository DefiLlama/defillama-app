import React, { useState } from 'react'
import styled from 'styled-components'
import { Tooltip } from '../QuestionHelper'
import { HelpCircle } from 'react-feather'
import DropdownSelect from '../DropdownSelect'

const TextWrapper = styled.div`
  position: relative;
  margin-left: ${({ margin }) => margin && '4px'};
  color: ${({ theme, link }) => (link ? theme.blue : theme.text1)};
  font-size: ${({ fontSize }) => fontSize ?? 'inherit'};

  :hover {
    cursor: pointer;
  }

  @media screen and (max-width: 600px) {
    font-size: ${({ adjustSize }) => adjustSize && '12px'};
  }
`
const AuditInfo = ({
  audits,
  auditLinks = [],
  maxCharacters,
  margin = false,
  adjustSize = false,
  fontSize,
  link,
  ...rest
}) => {
  const [showHover, setShowHover] = useState(false)

  if (typeof auditLinks === "string") {
    auditLinks = [auditLinks];
  }

  if (auditLinks.length > 0) {
    return (
      <TextWrapper margin={margin} adjustSize={adjustSize} link={link} fontSize={fontSize}>
        <DropdownSelect
          options={auditLinks.map(audit => ({ label: audit }))}
          active="Yes"
          setActive={link => (window.location.href = link)}
          overflowVisible
        ></DropdownSelect>
      </TextWrapper>
    )
  }
  if (!audits) {
    return (
      <TextWrapper margin={margin} adjustSize={adjustSize} link={link} fontSize={fontSize}>
        Unknown
      </TextWrapper>
    )
  }
  if (audits === '1') {
    return (
      <Tooltip text="Part of this protocol may be unaudited" show={showHover}>
        <TextWrapper
          onMouseEnter={() => setShowHover(true)}
          onMouseLeave={() => setShowHover(false)}
          margin={margin}
          adjustSize={adjustSize}
          link={link}
          fontSize={fontSize}
          {...rest}
        >
          Yes
          <HelpCircle size={15} style={{ marginLeft: '.75rem' }} />
        </TextWrapper>
      </Tooltip>
    )
  }
  if (audits === '2') {
    return (
      <TextWrapper margin={margin} adjustSize={adjustSize} link={link} fontSize={fontSize}>
        Yes
      </TextWrapper>
    )
  }

  if (audits === '3') {
    return (
      <Tooltip text="This protocol is a fork of an existing audited protocol" show={showHover}>
        <TextWrapper
          onMouseEnter={() => setShowHover(true)}
          onMouseLeave={() => setShowHover(false)}
          margin={margin}
          adjustSize={adjustSize}
          link={link}
          fontSize={fontSize}
          {...rest}
        >
          Yes
          <HelpCircle size={15} style={{ marginLeft: '.75rem' }} />
        </TextWrapper>
      </Tooltip>
    )
  }

  if (audits === '0') {
    return (
      <TextWrapper margin={margin} adjustSize={adjustSize} link={link} fontSize={fontSize}>
        No
      </TextWrapper>
    )
  }

  return (
    <TextWrapper margin={margin} adjustSize={adjustSize} link={link} fontSize={fontSize} {...rest}>
      {audits}
    </TextWrapper>
  )
}

export default AuditInfo
