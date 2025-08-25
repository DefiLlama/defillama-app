import { useState, useCallback, useRef } from 'react'
import type { ChatMessage, ToolExecutionStatus } from '../components/Chatbot/ChatPanel'
import { useSSEConnection } from './useSSEConnection'
import { useToolExecution } from './useToolExecution'
import { useProDashboard } from '../ProDashboardAPIContext'

const generateId = () => Math.random().toString(36).substring(2, 11)

export interface ChatbotState {
	isOpen: boolean
	conversationId: string | null
	messages: ChatMessage[]
	isConnected: boolean
	isTyping: boolean
	toolExecutionStatus: ToolExecutionStatus | null
}

export const useChatbot = () => {
	const [isOpen, setIsOpen] = useState(false)
	const [conversationId, setConversationId] = useState<string | null>(null)
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [isTyping, setIsTyping] = useState(false)
	const [toolExecutionStatus, setToolExecutionStatus] = useState<ToolExecutionStatus | null>(null)

	
	const { 
		items, 
		dashboardName, 
		dashboardTags, 
		dashboardDescription,
		timePeriod,
		dashboardVisibility,
		currentDashboard
	} = useProDashboard()

	
	const { executeSearchCharts, executeGetChartData } = useToolExecution()

	
	const { 
		isConnected, 
		sendMessage: sendSSEMessage,
		disconnect 
	} = useSSEConnection({
		onStreamEvent: handleStreamEvent
	})

	
	function handleStreamEvent(event: any) {

		switch (event.type) {
			case 'start':
				if (event.conversation_id) {
					setConversationId(event.conversation_id)
				}
				setIsTyping(true)
				break

			case 'reason_chunk':
				
				break

			case 'tool_call':
				handleToolCall(event.tool_data)
				break

			case 'answer_chunk':
				handleAnswerChunk(event.content)
				break

			case 'end':
				setIsTyping(false)
				setToolExecutionStatus(null)
				break

			case 'error':
				setIsTyping(false)
				setToolExecutionStatus(null)
				addMessage('assistant', `Sorry, I encountered an error: ${event.error}`)
				break
		}
	}

	const handleToolCall = useCallback(async (toolData: any) => {
		const { tool_name, parameters, conversation_id } = toolData
		
		setToolExecutionStatus({
			isExecuting: true,
			toolName: tool_name,
			description: `Executing ${tool_name}...`
		})

		try {
			let results = null

			if (tool_name === 'search_charts') {
				results = await executeSearchCharts(parameters)
			} else if (tool_name === 'get_chart_data') {
				results = await executeGetChartData(parameters)
			} else {
				results = { error: `Unknown tool: ${tool_name}` }
			}

			await sendToolResults(conversation_id || conversationId, results, tool_name)

		} catch (error) {
			await sendToolResults(
				conversation_id || conversationId,
				{ error: error instanceof Error ? error.message : 'Tool execution failed' },
				tool_name
			)
		}

		setToolExecutionStatus(null)
	}, [conversationId, executeSearchCharts, executeGetChartData])

	
	const handleAnswerChunk = useCallback((content: string) => {
		if (!content) return

		setMessages(prev => {
			const lastMessage = prev[prev.length - 1]
			
			
			if (lastMessage?.role === 'assistant' && lastMessage.isStreaming) {
				return [
					...prev.slice(0, -1),
					{
						...lastMessage,
						content: lastMessage.content + content
					}
				]
			} else {
				
				return [
					...prev,
					{
						id: generateId(),
						role: 'assistant',
						content,
						timestamp: new Date().toISOString(),
						isStreaming: true
					}
				]
			}
		})
	}, [])

	
	const sendToolResults = useCallback(async (convId: string | null, results: any, toolName: string) => {
		if (!convId) {
			return
		}

		try {
			const response = await fetch(`http://localhost:3001/api/chat/${convId}/tool-response`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					tool_results: results,
					tool_name: toolName
				})
			})

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}

		} catch (error) {
			
		}
	}, [])

	
	const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
		const message: ChatMessage = {
			id: generateId(),
			role,
			content,
			timestamp: new Date().toISOString()
		}
		setMessages(prev => [...prev, message])
	}, [])

	
	const sendMessage = useCallback(async (message: string) => {
		
		addMessage('user', message)

		
		const dashboardContext = {
			data: {
				items,
				dashboardName,
				timePeriod
			},
			visibility: dashboardVisibility,
			tags: dashboardTags,
			description: dashboardDescription,
			aiGenerated: currentDashboard?.aiGenerated
		}

		try {
			await sendSSEMessage(message, dashboardContext, conversationId)
		} catch (error) {
			addMessage('assistant', 'Sorry, I had trouble connecting to the AI service. Please make sure the chat service is available and try again.')
		}
	}, [conversationId, addMessage, sendSSEMessage, items, dashboardName, timePeriod, dashboardVisibility, dashboardTags, dashboardDescription, currentDashboard])

	
	const toggleChat = useCallback(() => {
		setIsOpen(prev => !prev)
	}, [])

	
	const closeChat = useCallback(() => {
		setIsOpen(false)
	}, [])

	
	const clearConversation = useCallback(() => {
		setMessages([])
		setConversationId(null)
		setIsTyping(false)
		setToolExecutionStatus(null)
		disconnect()
	}, [disconnect])

	return {
		
		isOpen,
		conversationId,
		messages,
		isConnected,
		isTyping,
		toolExecutionStatus,
		
		
		toggleChat,
		closeChat,
		sendMessage,
		clearConversation
	}
}