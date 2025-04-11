/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MAIN_VITE_GOOGLE_GENERATIVE_AI_API_KEY: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
