import { useChat } from '@ai-sdk/react'
import { useEffect, useRef } from 'react'

const SEARCH_ENGINES = {
  G: 'https://www.google.com/search?q=',
  D: 'https://www.duckduckgo.com/?q=',
  B: 'https://www.bing.com/search?q=',
  A: 'https://www.ask.com/web?q=',
  Y: 'https://www.yahoo.com/search?p=',
  C: 'https://chat.openai.com/?q='
}

function App(): JSX.Element {
  const searchRef = useRef<HTMLInputElement>(null)
  const { messages, handleInputChange } = useChat({
    api: 'http://localhost:3000/api/stream-ai'
  })

  useEffect(() => {
    if (searchRef.current) {
      searchRef.current.focus()
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      const searchQuery = e.currentTarget.value.trim()
      const searchQuerySplitted = searchQuery.split(' ')
      let searchEngine = searchQuerySplitted[searchQuerySplitted.length - 1] ?? '!G'
      let explicitSearchEngine = false
      if (!searchEngine.startsWith('!')) {
        searchEngine = 'G'
      } else {
        searchEngine = searchEngine.slice(1)
        explicitSearchEngine = true
      }

      let searchTerm = searchQuery
      if (explicitSearchEngine) {
        searchTerm = searchQuery.split(' ').slice(0, -1).join(' ')
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
      className='flex h-screen flex-col items-center bg-neutral-800 py-8 text-white'
    >
      <h1 className='mb-4 text-2xl font-medium'>Quick Search</h1>
      <div className='w-full px-8'>
        <form>
          <div className='w-full'>
            <input
              type='search'
              ref={searchRef}
              onKeyDown={handleKeyDown}
              onChange={handleInputChange}
              className='w-full rounded-xl bg-neutral-700 p-4 focus-within:ring-1 focus-within:ring-neutral-500 focus-within:ring-opacity-50 focus-within:ring-offset-2 focus-within:ring-offset-neutral-500 focus:outline-none'
              placeholder='Search or type / for AI...'
            />
          </div>
        </form>
      </div>
      <div className='w-full px-8'>
        <div className='flex flex-col gap-2'>
          {messages.map((message, index) => (
            <div key={index}>
              <p>{message.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
