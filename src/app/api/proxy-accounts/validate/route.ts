import { NextRequest, NextResponse } from 'next/server'
import { proxyAccountManager } from '@/lib/proxy-account-manager'
import { ProxyAccount } from '@/app/api/proxy-accounts/route'

// POST - 验证代理账号
export async function POST(request: NextRequest) {
  try {
    const account: ProxyAccount = await request.json()

    if (!account || !account.provider) {
      return NextResponse.json({
        success: false,
        error: 'Invalid account data'
      }, { status: 400 })
    }

    const result = await proxyAccountManager.validateAccount(account)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Failed to validate proxy account:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate account'
    }, { status: 500 })
  }
}