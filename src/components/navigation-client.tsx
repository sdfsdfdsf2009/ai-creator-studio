'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useLocale } from 'next-intl'

export function NavigationClient() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const locale = useLocale()

  const navigation = [
    { name: t('logo'), href: '/', key: 'logo' },
    { name: t('tasks'), href: '/tasks', key: 'tasks' },
    { name: t('create'), href: '/tasks/create', key: 'create' },
    { name: t('library'), href: '/library', key: 'library' },
    { name: t('templates'), href: '/prompts', key: 'templates' },
    { name: t('analytics'), href: '/analytics', key: 'analytics' },
  ]

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === `/${locale}` || pathname === `/${locale}/`
    }
    return pathname.startsWith(`/${locale}${href}`)
  }

  return (
    <nav className="border-b">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href={`/${locale}`} className="text-xl font-bold">
              {t('logo')}
            </Link>
            <div className="hidden md:flex space-x-6">
              {navigation.slice(1).map((item) => (
                <Link
                  key={item.key}
                  href={`/${locale}${item.href}`}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    isActive(item.href)
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            <Link href={`/${locale}/settings`}>
              <Button variant="outline" size="sm">
                {t('settings')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}