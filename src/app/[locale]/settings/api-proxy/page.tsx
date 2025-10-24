'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ApiProxySettingsPage() {
  const router = useRouter()

  useEffect(() => {
    // 重定向到新的代理账户页面
    router.replace('/settings/proxy-accounts/')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">正在重定向到新的代理账户设置页面...</p>
      </div>
    </div>
  )
}