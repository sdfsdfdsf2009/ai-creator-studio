import { NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/database'

export interface ProxyAccount {
  id?: string
  name: string
  provider: 'openai' | 'anthropic' | 'google' | 'custom' | 'nano-banana'
  apiKey: string
  baseUrl?: string
  enabled: boolean
  settings?: Record<string, any>
  createdAt?: string
  updatedAt?: string
}

export async function GET() {
  try {
    const accounts = await withDatabase(async (db) => {
      return await db.getProxyAccounts()
    })

    // 隐藏API密钥的安全版本
    const safeAccounts = accounts.map(account => ({
      ...account,
      apiKey: account.apiKey ? '***' + account.apiKey.slice(-4) : ''
    }))

    return NextResponse.json({
      success: true,
      data: safeAccounts
    })
  } catch (error) {
    console.error('Error fetching proxy accounts:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, provider, apiKey, baseUrl, enabled, settings }: ProxyAccount = body

    console.log('Creating proxy account:', { name, provider, hasApiKey: !!apiKey, baseUrl, enabled })

    // Enhanced validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Account name is required' },
        { status: 400 }
      )
    }

    if (!provider || !provider.trim()) {
      return NextResponse.json(
        { success: false, error: 'Provider is required' },
        { status: 400 }
      )
    }

    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json(
        { success: false, error: 'API Key is required' },
        { status: 400 }
      )
    }

    // Validate provider
    const validProviders = ['openai', 'anthropic', 'google', 'custom', 'nano-banana']
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { success: false, error: `Invalid provider: ${provider}. Valid providers: ${validProviders.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate baseUrl for custom providers
    if ((provider === 'custom' || provider === 'nano-banana') && (!baseUrl || !baseUrl.trim())) {
      return NextResponse.json(
        { success: false, error: `Base URL is required for ${provider}` },
        { status: 400 }
      )
    }

    const account = await withDatabase(async (db) => {
      return await db.createProxyAccount({
        name: name.trim(),
        provider: provider.trim(),
        apiKey: apiKey.trim(),
        baseUrl: baseUrl?.trim() || null,
        enabled: enabled ?? true,
        settings: settings || {}
      })
    })

    // 隐藏API密钥的安全版本
    const safeAccount = {
      ...account,
      apiKey: '***' + account.apiKey.slice(-4)
    }

    console.log('Proxy account created successfully:', safeAccount.id)

    return NextResponse.json({
      success: true,
      data: safeAccount
    })
  } catch (error) {
    console.error('Error creating proxy account:', {
      error: error.message,
      stack: error.stack,
      body: request.body
    })

    // Return specific error message if available
    const errorMessage = error.message || 'Internal server error'

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, provider, apiKey, baseUrl, enabled, settings }: ProxyAccount = body

    console.log('Updating proxy account:', { id, name, provider, hasApiKey: !!apiKey, baseUrl, enabled })

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing account ID' },
        { status: 400 }
      )
    }

    // Enhanced validation for provided fields
    if (name !== undefined && (!name || !name.trim())) {
      return NextResponse.json(
        { success: false, error: 'Account name cannot be empty' },
        { status: 400 }
      )
    }

    if (provider !== undefined) {
      const validProviders = ['openai', 'anthropic', 'google', 'custom', 'nano-banana']
      if (!validProviders.includes(provider)) {
        return NextResponse.json(
          { success: false, error: `Invalid provider: ${provider}. Valid providers: ${validProviders.join(', ')}` },
          { status: 400 }
        )
      }
    }

    if (apiKey !== undefined && (!apiKey || !apiKey.trim())) {
      return NextResponse.json(
        { success: false, error: 'API Key cannot be empty when provided' },
        { status: 400 }
      )
    }

    const updates: any = {}
    if (name !== undefined) updates.name = name.trim()
    if (provider !== undefined && provider.trim() !== '') updates.provider = provider.trim()
    if (apiKey !== undefined && apiKey.trim() !== '') updates.apiKey = apiKey.trim()
    if (baseUrl !== undefined) updates.baseUrl = baseUrl?.trim() || null
    if (enabled !== undefined) updates.enabled = enabled
    if (settings !== undefined) updates.settings = settings

    const updatedAccount = await withDatabase(async (db) => {
      return await db.updateProxyAccount(id, updates)
    })

    if (!updatedAccount) {
      return NextResponse.json(
        { success: false, error: 'Proxy account not found' },
        { status: 404 }
      )
    }

    // 隐藏API密钥的安全版本
    const safeAccount = {
      ...updatedAccount,
      apiKey: '***' + updatedAccount.apiKey.slice(-4)
    }

    console.log('Proxy account updated successfully:', safeAccount.id)

    return NextResponse.json({
      success: true,
      data: safeAccount
    })
  } catch (error) {
    console.error('Error updating proxy account:', {
      error: error.message,
      stack: error.stack,
      body: request.body
    })

    // Return specific error message if available
    const errorMessage = error.message || 'Internal server error'

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing account ID' },
        { status: 400 }
      )
    }

    const deleted = await withDatabase(async (db) => {
      return await db.deleteProxyAccount(id)
    })

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Proxy account not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true }
    })
  } catch (error) {
    console.error('Error deleting proxy account:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}