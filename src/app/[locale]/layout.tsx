import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { QueryProvider } from '@/lib/query-client'
import { NavigationClient } from '@/components/navigation-client'

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <QueryProvider>
          <NextIntlClientProvider messages={messages}>
            <NavigationClient />
            <main className="min-h-screen">
              {children}
            </main>
          </NextIntlClientProvider>
        </QueryProvider>
      </body>
    </html>
  );
}