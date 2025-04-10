import { google } from '@ai-sdk/google'
import { streamText, UIMessage } from 'ai'
import { Router } from 'express'

const route = Router()

route.post('/stream-ai', async (req, res) => {
  const { messages }: { messages: UIMessage[] } = req.body
  console.log(messages)

  try {
    const result = streamText({
      model: google('gemini-2.0-flash-001'),
      messages
    })

    result.pipeDataStreamToResponse(res)
  } catch (error) {
    console.error(error)
    res.status(500).send('Error streaming AI response')
  }
})

export default route
