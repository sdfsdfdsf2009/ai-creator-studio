import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export default function Home() {
  const t = useTranslations('home')
  const tCommon = useTranslations('common')

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-background min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            {t('title')}
          </h1>
          <p className="text-xl text-muted-foreground">
            {t('subtitle')}
          </p>
          <div className="flex justify-center gap-2">
            <Badge variant="secondary">{t('features.batch')}</Badge>
            <Badge variant="outline">{t('features.cache')}</Badge>
            <Badge>{t('features.models')}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Card>
            <CardHeader>
              <CardTitle>{t('imageGeneration.title')}</CardTitle>
              <CardDescription>{t('imageGeneration.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/tasks/create">
                <Button className="w-full">{tCommon('getStarted')}</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('videoCreation.title')}</CardTitle>
              <CardDescription>{t('videoCreation.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/tasks/create">
                <Button variant="outline" className="w-full">{tCommon('explore')}</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('templateLibrary.title')}</CardTitle>
              <CardDescription>{t('templateLibrary.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/prompts">
                <Button variant="secondary" className="w-full">{tCommon('viewTemplates')}</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <div className="space-y-4">
            <div className="max-w-md mx-auto space-y-2">
              <Label htmlFor="email">{t('emailPlaceholder')}</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  className="flex-1"
                />
                <Button>{t('subscribe')}</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}