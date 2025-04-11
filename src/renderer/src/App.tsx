import { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'

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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (searchRef.current) {
      searchRef.current.focus()
    }

    const handleFocus = (): void => {
      if (searchRef.current) {
        searchRef.current.focus()
      }
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
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

      if (!response.ok) {
        const errorData = await response.json()
        setError(`Error: ${errorData}`)
        return
      }

      if (!response.body) {
        setError('Error: Could not retrieve AI response')
        return
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
      setAiResponse('Error: Could not retrieve AI response')
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      const searchQuery = e.currentTarget.value.trim()
      const searchQuerySplitted = searchQuery.split(' ')
      const searchEngineQuery =
        searchQuerySplitted.find((query) => query.startsWith('!') && query.trim().length === 2) ??
        '!G'
      const searchEngine = searchEngineQuery.slice(1).toUpperCase()
      const searchTerm = searchQuery.replace(searchEngineQuery, '')

      // Handle AI streaming for !A
      if (searchEngine === 'A') {
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
    <div className='flex h-screen flex-col gap-y-4 bg-neutral-800 p-8 text-white'>
      <h1 className='text-2xl font-medium tracking-wider'>Quick Search</h1>
      <div className='w-full'>
        <div className='w-full'>
          <input
            type='search'
            ref={searchRef}
            onKeyDown={handleKeyDown}
            className='w-full rounded-3xl bg-neutral-700 p-4 focus-within:ring-1 focus-within:ring-neutral-300 focus-within:ring-opacity-50 focus-within:ring-offset-2 focus-within:ring-offset-neutral-300 focus:outline-none'
            placeholder='Search anything...'
          />
        </div>
      </div>

      {(aiResponse || isStreaming) && (
        <div className='mt-4 w-full'>
          <div className='rounded-xl bg-neutral-900 p-4 text-white'>
            {isStreaming && !aiResponse && <div className='animate-pulse'>Thinking...</div>}
            <div className='scroll-bar h-full max-h-60 overflow-y-auto whitespace-pre-wrap text-wrap text-sm'>
              <Markdown remarkPlugins={[remarkGfm]}>{aiResponse}</Markdown>
            </div>
          </div>
        </div>
      )}

      {error && <div className='text-red-500'>{error}</div>}
    </div>
  )
}

export default App
