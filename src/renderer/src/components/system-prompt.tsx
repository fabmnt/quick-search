import { useState } from 'react'

export function SystemPrompt({
  onChange,
  value
}: {
  onChange: (value: string) => void
  value: string
}) {
  const [show, setShow] = useState(true)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  return (
    <>
      <div
        style={{ display: show ? 'flex' : 'none' }}
        className='flex-col items-center justify-between gap-2'
      >
        <div className='relative w-full rounded-3xl border border-neutral-500/40 bg-zinc-700 p-4'>
          <textarea
            value={value}
            onChange={handleChange}
            rows={1}
            className='scroll-bar w-full resize-none bg-transparent p-2 placeholder:text-zinc-500 focus:outline-none'
            placeholder='System prompt'
          />
        </div>
        <button
          className='self-end text-sm text-zinc-500'
          onClick={() => setShow(!show)}
        >
          close
        </button>
      </div>
      <div
        style={{ display: show ? 'none' : 'flex' }}
        className='justify-end'
      >
        <button
          className='text-sm text-zinc-500'
          onClick={() => setShow(!show)}
        >
          open
        </button>
      </div>
    </>
  )
}
