import { useChat } from '@ai-sdk/react'
import '@fontsource/geist-sans/100.css'
import '@fontsource/geist-sans/200.css'
import '@fontsource/geist-sans/300.css'
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import { ComponentPropsWithoutRef, useState } from 'react'
import { SystemPrompt } from './components/system-prompt'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

function App(): JSX.Element {
  const [systemPrompt, setSystemPrompt] = useState<string>('')
  const { messages, input, handleInputChange, handleSubmit, error, setMessages, status } = useChat({
    api: 'http://localhost:3131/api/prompt',
    streamProtocol: 'text',
    body: {
      system: systemPrompt
    }
  })

  const handleSystemPromptChange = (value: string) => {
    setSystemPrompt(value)
  }

  const clearMessages = () => {
    setMessages([])
  }

  return (
    <div
      style={{ fontFamily: 'Geist Sans, sans-serif' }}
      className='flex min-h-screen flex-col px-8 text-white'
    >
      <div className='sticky top-0 z-10 flex w-full flex-col gap-y-2 bg-zinc-800 py-2'>
        <SystemPrompt
          onChange={handleSystemPromptChange}
          value={systemPrompt}
        />
        <form
          onSubmit={handleSubmit}
          className='relative w-full rounded-3xl border border-neutral-500/40 bg-zinc-700 p-4'
        >
          <input
            value={input}
            onChange={handleInputChange}
            className='scroll-bar w-full resize-none bg-transparent p-2 placeholder:text-zinc-500 focus:outline-none'
            placeholder='Make a quick search!'
          />
        </form>
      </div>

      <div className='flex justify-end gap-x-2'>
        <button
          className='text-sm text-zinc-500'
          onClick={clearMessages}
        >
          Clear
        </button>
      </div>
      <div className='flex min-h-0 flex-1'>
        {messages.length > 0 && (
          <div className='mt-4 flex min-h-0 w-full flex-1 flex-col pb-4'>
            <div className='flex min-h-0 flex-1 flex-col gap-y-6 rounded-xl text-white'>
              <div className='scroll-bar flex min-h-0 max-w-none flex-1 flex-col gap-y-8 overflow-y-auto leading-relaxed text-zinc-300'>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className='flex'
                    style={{
                      justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                    }}
                  >
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
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
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
                          return (
                            <li
                              className='mb-2'
                              {...props}
                            >
                              {children}
                            </li>
                          )
                        },
                        strong({ children, ...props }) {
                          return (
                            <strong
                              className='font-semibold text-white'
                              {...props}
                            >
                              {children}
                            </strong>
                          )
                        }
                      }}
                    >
                      {message.content}
                    </Markdown>
                  </div>
                ))}
                {(status === 'streaming' || status === 'submitted') && (
                  <div className='animate-pulse text-lg font-medium'>Thinking...</div>
                )}
              </div>
            </div>
          </div>
        )}
        {error && <div className='text-red-500'>{error.message}</div>}
      </div>
    </div>
  )
}

export default App
