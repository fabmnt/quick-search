import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateObject, streamObject, streamText } from 'ai'
import dotenv from 'dotenv'
import { Router } from 'express'
import { z } from 'zod'
dotenv.config()

const route = Router()

const google = createGoogleGenerativeAI({
  apiKey: import.meta.env.MAIN_VITE_GOOGLE_GENERATIVE_AI_API_KEY
})

route.post('/prompt/:usePro', async (req, res) => {
  const { usePro } = req.params
  const { prompt }: { prompt: string } = req.body
  try {
    const result = streamText({
      model: google(usePro === 'true' ? 'gemini-2.5-pro-exp-03-25' : 'gemini-2.0-flash-001', {
        useSearchGrounding: true
      }),
      prompt
    })

    result.pipeTextStreamToResponse(res)
  } catch (error) {
    res.status(500).send('Error streaming AI response')
  }
})

route.post('/translate', async (req, res) => {
  const { content, from, to }: { content: string; from: string; to: string } = req.body
  console.log({ content, from, to })
  try {
    const { object } = await generateObject({
      model: google('gemini-2.0-flash-001'),
      prompt: `Translate the following text from ${from} to ${to}: ${content}`,
      schema: z.object({
        translation: z.string()
      })
    })

    res.json({ translation: object.translation })
  } catch (error) {
    res.status(500).send('Error streaming AI response')
  }
})

export default route
