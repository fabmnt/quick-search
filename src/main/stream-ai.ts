import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateObject, streamText } from 'ai'
import dotenv from 'dotenv'
import { Router } from 'express'
import { z } from 'zod'
dotenv.config()

const route = Router()

const google = createGoogleGenerativeAI({
  apiKey: import.meta.env.MAIN_VITE_GOOGLE_GENERATIVE_AI_API_KEY
})

route.post('/prompt/title', async (req, res) => {
  const { prompt }: { prompt: string } = req.body
  try {
    const result = await generateObject({
      model: google('gemini-2.0-flash'),
      prompt: `Resume the following content in a short title: ${prompt.substring(0, 300)}`,
      schema: z.object({
        title: z.string().describe('A short and relevant title from the content provided')
      })
    })

    res.json({ title: result.object.title })
  } catch (error) {
    console.error(error)
    res.status(500).send('Error streaming AI response')
  }
})

route.post('/prompt/', async (req, res) => {
  const { messages, system } = req.body
  try {
    const result = streamText({
      model: google('gemini-2.0-flash', {
        useSearchGrounding: true
      }),
      temperature: 0.7,
      maxTokens: 1000,
      system: system || 'You are a helpful assistant.',
      messages
    })

    result.pipeTextStreamToResponse(res)
  } catch (error) {
    console.error(error)
    res.status(500).send('Error streaming AI response')
  }
})

route.post('/translate', async (req, res) => {
  const { content }: { content: string } = req.body
  try {
    const { object } = await generateObject({
      model: google('gemini-2.5-pro-exp-03-25'),
      prompt: `Based on the text provided, translate it to either English or Spanish. Text is: ${content}`,
      schema: z.object({
        translation: z.string()
      })
    })

    res.json({ translation: object.translation })
  } catch (error) {
    console.error(error)
    res.status(500).send('Error streaming AI response')
  }
})

export default route
