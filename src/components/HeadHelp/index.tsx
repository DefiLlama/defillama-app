import React from 'react'
import styled from 'styled-components'
import { HelpCircle } from 'react-feather'
import Tooltip from 'components/Tooltip'

interface IHeadHelpProps {
  title: string
  text: string
  maxCharacters?: string
  margin?: boolean
  adjustSize?: boolean
  fontSize?: string
  link?: boolean
}

interface ITextProps {
  margin: boolean
  adjustSize: boolean
  link: boolean
  fontSize: string
}

const HeadHelp = ({ title, text, margin = false, adjustSize = false, fontSize, link, ...rest }: IHeadHelpProps) => {
  return (
    <Tooltip content={text}>
      <TextWrapper margin={margin} adjustSize={adjustSize} link={link} fontSize={fontSize} {...rest}>
        <span>{title}</span>
        <HelpCircle size={15} style={{ marginLeft: '.3rem' }} />
      </TextWrapper>
    </Tooltip>
  )
}

const TextWrapper = styled.div<ITextProps>`
  position: relative;
  margin-left: ${({ margin }) => margin && '4px'};
  color: ${({ theme, link }) => (link ? theme.blue : theme.text1)};
  font-size: ${({ fontSize }) => fontSize ?? 'inherit'};
  display: flex;
  align-items: center;
  white-space: nowrap;
  :hover {
    cursor: pointer;
  }

  @media screen and (max-width: 600px) {
    font-size: ${({ adjustSize }) => adjustSize && '12px'};
  }
`

export default HeadHelp
