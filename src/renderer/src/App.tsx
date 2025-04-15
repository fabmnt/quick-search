import { useCallback, useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { ComponentPropsWithoutRef } from 'react'

import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

import '@fontsource/geist-sans/100.css';
import '@fontsource/geist-sans/200.css';
import '@fontsource/geist-sans/300.css';
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';

const SEARCH_ENGINES = {
  G: 'https://www.google.com/search?q=',
  C: 'https://chat.openai.com/?q=',
  P: 'https://www.perplexity.ai/search?q='
}

const ENGINE_LABELS = {
  I: "AI",
  T: "Translation",
  G: "Google",
  C: "Chat",
  P: "Perplexity"
}

const MODIFIER_LABELS = {
  '+': "Pro",
}

const COMMAND_CHAR = '!'

function SearchEngineBadge({ engine }: { engine: string }) {

  return (
    <span className='text-xs inline-flex px-2 text-zinc-300 font-medium py-1 border-zinc-500 border rounded-lg'>
      {ENGINE_LABELS[engine] ?? 'Google'}
    </span>
  )
}

function ModifierBadge({ modifier }: { modifier: string }) {
  const label = MODIFIER_LABELS[modifier]
  if (!label) return null

  return (
    <span className='text-xs inline-flex px-2 text-zinc-300 font-medium py-1 border-zinc-500 border rounded-lg'>
      {label}
    </span>
  )
}

function App(): JSX.Element {
  const searchRef = useRef<HTMLTextAreaElement>(null)
  const [aiResponse, setAiResponse] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [responseTitle, setResponseTitle] = useState<string>('')
  const [isTitleLoading, setIsTitleLoading] = useState<boolean>(false)
  const aiAbortControllerRef = useRef<AbortController | null>(null)
  const currentRequestIdRef = useRef(0)
  const searchQuerySplitted = searchQuery.split(' ')
  const searchEngineQuery =
    searchQuerySplitted.find((query) => query.startsWith(COMMAND_CHAR))?.trim()
  const engine = searchEngineQuery?.substring(1, 2).toUpperCase() || 'G'
  const modifier = searchEngineQuery?.substring(2, 3) ?? ''

  useEffect(() => {
    if (!isStreaming && aiResponse) {
      setIsTitleLoading(true)
      fetch(`http://localhost:3131/api/prompt/title`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: aiResponse })
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to generate title')
        }
        return response.json() 
      })
      .then((data) => {
        setResponseTitle(data.title)
      })
      .catch((error) => {
        setError(error.message)
      })
      .finally(() => {
        setIsTitleLoading(false)
      })
    }
  }, [isStreaming, aiResponse])

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

    return (): void => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  useEffect(() => {
    const handleCtrlN = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault()
        setSearchQuery('')
        setAiResponse('')
        setIsStreaming(false)
        setError(null)
        setResponseTitle('')
        if (searchRef.current) {
          searchRef.current.focus()
        }
      }
    }
    window.addEventListener('keydown', handleCtrlN)
    return () => {
      window.removeEventListener('keydown', handleCtrlN)
    }
  }, [])

  const streamAiTranslation = async ({ content }): Promise<void> => {
    // Cancel any ongoing AI fetch (response or translation)
    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort()
    }
    const abortController = new AbortController()
    aiAbortControllerRef.current = abortController
    const requestId = ++currentRequestIdRef.current
    setIsStreaming(true)
    setAiResponse('')

    try {
      const response = await fetch(`http://localhost:3131/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content }),
        signal: abortController.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(`Error: ${errorData}`)
        return
      }

      const object = await response.json()
      setAiResponse(object.translation)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setAiResponse('') // Optionally clear or show cancelled message
      } else if (e instanceof Error) {
        setAiResponse(`Error: ${e.message}`)
      } else {
        setAiResponse('Error: Could not retrieve AI response')
      }
    } finally {
      aiAbortControllerRef.current = null
      if (requestId === currentRequestIdRef.current) {
        setIsStreaming(false)
      }
    }
  }

  const streamAiResponse = async (query: string, usePro: boolean): Promise<void> => {
    // Cancel any ongoing AI fetch
    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort()
    }
    const abortController = new AbortController()
    aiAbortControllerRef.current = abortController
    const requestId = ++currentRequestIdRef.current
    setIsStreaming(true)
    setAiResponse('')

    const useProParam = usePro ? 'true' : 'false'

    try {
      const response = await fetch(`http://localhost:3131/api/prompt?usePro=${useProParam}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: query
        }),
        signal: abortController.signal
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
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setAiResponse('') // Optionally clear or show cancelled message
      } else if (e instanceof Error) {
        setAiResponse(`Error: ${e.message}`)
      } else {
        setAiResponse('Error: Could not retrieve AI response')
      }
    } finally {
      aiAbortControllerRef.current = null
      if (requestId === currentRequestIdRef.current) {
        setIsStreaming(false)
      }
    }
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const searchQuery = e.currentTarget.value.trim()
        const searchQuerySplitted = searchQuery.split(' ')
        const searchEngineQuery =
          searchQuerySplitted.find((query) => query.startsWith(COMMAND_CHAR)) ?? `${COMMAND_CHAR}${engine}`
        const searchTerm = searchQuery.replace(searchEngineQuery, '').trim()

        // Handle AI streaming for !i
        if (engine.startsWith('I')) {
          const usePro = modifier === '+'
          setResponseTitle('')
          streamAiResponse(searchTerm, usePro)
          return
        }

        if (engine.startsWith('T')) {
          setResponseTitle('')
          streamAiTranslation({ content: searchTerm })
          return
        }

        if (searchTerm) {
          const searchUrl = `${SEARCH_ENGINES[engine]}${encodeURIComponent(searchTerm)}`
          window.open(searchUrl, '_blank')
        }
      }
    },
    [searchRef, engine, modifier]
  )

  const adjustTextareaHeight = useCallback(() => {
    if (searchRef.current) {
      // Reset height to get proper scrollHeight
      searchRef.current.style.height = 'auto'

      // Calculate line height based on a single line (approximate method)
      const lineHeight = parseInt(getComputedStyle(searchRef.current).lineHeight) || 20

      // Limit height to 5 rows maximum
      const maxHeight = lineHeight * 8

      // Set height based on content but capped at maxHeight
      const newHeight = Math.min(searchRef.current.scrollHeight, maxHeight)
      searchRef.current.style.height = `${newHeight}px`

      // Enable scrolling if content exceeds the max height
      searchRef.current.style.overflowY =
        searchRef.current.scrollHeight > maxHeight ? 'auto' : 'hidden'
    }
  }, [searchRef])

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setSearchQuery(e.target.value)
    adjustTextareaHeight()
  }, [adjustTextareaHeight])

  // Adjust height when component mounts or searchQuery changes
  useEffect(() => {
    adjustTextareaHeight()
  }, [searchQuery])

  return (
    <div
      style={{ fontFamily: 'Geist Sans, sans-serif' }}
      className='flex min-h-screen flex-col gap-y-4 px-8 text-white'
    >
      <div className='w-full sticky top-0 z-10 bg-zinc-800 py-2'>
        <div className='w-full rounded-3xl border border-neutral-500/40 bg-zinc-700 relative p-4'>
          <textarea
            ref={searchRef}
            rows={1}
            onKeyDown={handleKeyDown}
            onChange={handleTextareaChange}
            value={searchQuery}
            className='scroll-bar p-2 w-full resize-none bg-transparent placeholder:text-zinc-500 focus:outline-none'
            placeholder='Make a quick search!'
          />
          <div className='flex gap-2 items-center'>
            <SearchEngineBadge engine={engine} />
            {modifier && <ModifierBadge modifier={modifier} />}
          </div>
        </div>
      </div>

      <div className='flex flex-1 min-h-0'>
        {(aiResponse || isStreaming) && (
          <div className='mt-4 w-full flex flex-col flex-1 min-h-0 pb-4'>
            <div className='flex flex-col gap-y-6 rounded-xl text-white flex-1 min-h-0'>
              {isTitleLoading && (
                <div className='text-lg text-center font-medium animate-pulse'>Creating title...</div>
              )}
              {responseTitle && !isTitleLoading && (
                <h2 className='text-lg text-center font-medium'>{responseTitle}</h2>
              )}
              {isStreaming && (
                <div className='animate-pulse text-lg font-medium'>Thinking...</div>
              )}
              <div className='text-zinc-300 scroll-bar flex flex-col gap-y-6 flex-1 min-h-0 max-w-none overflow-y-auto leading-relaxed'>
                <Markdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    code({ className, children, ...props }: ComponentPropsWithoutRef<'code'>) {
                      const match = /language-(\w+)/.exec(className || '')
                      return match ? (
                        <SyntaxHighlighter
                          style={atomDark}
                          language={match[1]}
                          PreTag='div'
                          children={String(children).replace(/\n$/, '')}
                        />
                      ) : (
                        <code
                          {...props}
                          className={className}
                        >
                          {children}
                        </code>
                      )
                    },
                    li({ children, ...props }) {
                      return <li className='mb-2' {...props}>{children}</li>
                    },
                    strong({ children, ...props }) {
                      return (
                        <strong className='text-white font-semibold' {...props}>
                          {children}
                        </strong>
                      )
                    }
                  }}
                >
                  {aiResponse}
                </Markdown>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <div className='text-red-500'>{error}</div>}
    </div>
  )
}

export default App
