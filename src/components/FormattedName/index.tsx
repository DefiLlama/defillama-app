import Tooltip from 'components/Tooltip'
import React from 'react'
import styled from 'styled-components'

interface WrapperProps {
  margin: string | boolean
  link: boolean
  adjustSize: boolean
  fontSize: string | number
}

const TextWrapper = styled.div<WrapperProps>`
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

const FormattedName = ({ text, maxCharacters, margin = false, adjustSize = false, fontSize, link, ...rest }) => {
  if (!text) {
    return ''
  }

  if (text.length > maxCharacters) {
    return (
      <Tooltip content={text}>
        <TextWrapper margin={margin} adjustSize={adjustSize} link={link} fontSize={fontSize} {...rest}>
          {' ' + text.slice(0, maxCharacters - 1) + '...'}
        </TextWrapper>
      </Tooltip>
    )
  }

  return (
    <TextWrapper margin={margin} adjustSize={adjustSize} link={link} fontSize={fontSize} {...rest}>
      {text}
    </TextWrapper>
  )
}

export default FormattedName
