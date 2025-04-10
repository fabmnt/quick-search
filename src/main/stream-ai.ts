import { google } from '@ai-sdk/google'
import { streamText } from 'ai'
import { Router } from 'express'
import dotenv from 'dotenv'

dotenv.config()

const route = Router()

route.post('/stream-ai', async (req, res) => {
  const { prompt }: { prompt: string } = req.body
  try {
    const result = streamText({
      model: google('gemini-2.0-flash-001', { useSearchGrounding: true }),
      prompt
    })

    result.pipeTextStreamToResponse(res)
  } catch (error) {
    console.error(error)
    res.status(500).send('Error streaming AI response')
  }
})

export default route
