import React, { useState } from 'react'
import styled from 'styled-components'
import { Tooltip } from '../QuestionHelper'
import { HelpCircle } from 'react-feather'

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

const HeadHelp = ({ title, text, maxCharacters, margin = false, adjustSize = false, fontSize, link, ...rest }) => {
  const [showHover, setShowHover] = useState(false)

  return (

    <Tooltip text={text} show={showHover}>
      <TextWrapper
        onMouseEnter={() => setShowHover(true)}
        onMouseLeave={() => setShowHover(false)}
        margin={margin}
        adjustSize={adjustSize}
        link={link}
        fontSize={fontSize}
        {...rest}
      >
         {title}

        <HelpCircle size={15} style={{ marginLeft: '.3rem', marginBottom: '-3px' }} />
      </TextWrapper>
    </Tooltip>
  )
}

export default HeadHelp
