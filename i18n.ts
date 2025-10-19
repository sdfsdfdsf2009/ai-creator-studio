import { getRequestConfig } from 'next-intl/server'

export default getRequestConfig(async ({ locale }) => {
  // Handle undefined locale by defaulting to 'zh'
  const resolvedLocale = locale || 'zh'

  return {
    locale: resolvedLocale,
    messages: (await import(`./src/messages/${resolvedLocale}.json`)).default
  }
})