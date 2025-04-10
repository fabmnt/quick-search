import { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'

const SEARCH_ENGINES = {
  G: 'https://www.google.com/search?q=',
  D: 'https://www.duckduckgo.com/?q=',
  B: 'https://www.bing.com/search?q=',
  A: 'https://www.ask.com/web?q=',
  Y: 'https://www.yahoo.com/search?p=',
  C: 'https://chat.openai.com/?q=',
  P: 'https://www.perplexity.ai/search?q='
}

function App(): JSX.Element {
  const searchRef = useRef<HTMLInputElement>(null)
  const [aiResponse, setAiResponse] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState<boolean>(false)

  useEffect(() => {
    if (searchRef.current) {
      searchRef.current.focus()
    }
  }, [])

  const streamAiResponse = async (query: string): Promise<void> => {
    setIsStreaming(true)
    setAiResponse('')

    try {
      const response = await fetch('http://localhost:3000/api/stream-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: query
        })
      })

      if (!response.body) {
        throw new Error('Response body is null')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        setAiResponse((prev) => prev + chunk)
      }
    } catch (error) {
      console.error('Error streaming AI response:', error)
      setAiResponse('Error: Could not retrieve AI response')
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      const searchQuery = e.currentTarget.value.trim()
      const searchQuerySplitted = searchQuery.split(' ')
      let searchEngine = searchQuerySplitted[searchQuerySplitted.length - 1] ?? '!G'
      let explicitSearchEngine = false
      if (!searchEngine.startsWith('!')) {
        searchEngine = 'G'
      } else {
        searchEngine = searchEngine.slice(1).toUpperCase()
        explicitSearchEngine = true
      }

      let searchTerm = searchQuery
      if (explicitSearchEngine) {
        searchTerm = searchQuery.split(' ').slice(0, -1).join(' ')
      }

      // Handle AI streaming for !A
      if (explicitSearchEngine && searchEngine === 'A') {
        streamAiResponse(searchTerm)
        return
      }

      if (searchTerm) {
        const searchUrl = `${SEARCH_ENGINES[searchEngine]}${encodeURIComponent(searchTerm)}`
        window.open(searchUrl, '_blank')
      }
    }
  }

  return (
    <div
      onClick={() => searchRef.current?.focus()}
      className='flex h-screen flex-col items-center gap-y-4 bg-neutral-800 py-4 text-white'
    >
      <h1 className='text-2xl font-medium'>Quick Search</h1>
      <div className='w-full px-8'>
        <div className='w-full'>
          <input
            type='search'
            ref={searchRef}
            onKeyDown={handleKeyDown}
            className='w-full rounded-xl bg-neutral-700 p-4 focus-within:ring-1 focus-within:ring-neutral-500 focus-within:ring-opacity-50 focus-within:ring-offset-2 focus-within:ring-offset-neutral-500 focus:outline-none'
            placeholder='Search anything...'
          />
        </div>
      </div>

      {(aiResponse || isStreaming) && (
        <div className='mt-4 w-full px-8'>
          <div className='rounded-xl bg-neutral-700 p-4 text-white'>
            {isStreaming && !aiResponse && <div className='animate-pulse'>Thinking...</div>}
            <div className='scroll-bar h-full max-h-52 overflow-y-auto whitespace-pre-wrap text-sm'>
              <Markdown>{aiResponse}</Markdown>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
