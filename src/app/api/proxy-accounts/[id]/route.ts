import { NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const account = await withDatabase(async (db) => {
      return await db.getProxyAccount(params.id)
    })

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Proxy account not found' },
        { status: 404 }
      )
    }

    // 隐藏API密钥的安全版本
    const safeAccount = {
      ...account,
      apiKey: account.apiKey ? '***' + account.apiKey.slice(-4) : ''
    }

    return NextResponse.json({
      success: true,
      data: safeAccount
    })
  } catch (error) {
    console.error('Error fetching proxy account:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { id, createdAt, updatedAt, ...updates } = body

    const updatedAccount = await withDatabase(async (db) => {
      return await db.updateProxyAccount(params.id, updates)
    })

    // 隐藏API密钥的安全版本
    const safeAccount = {
      ...updatedAccount,
      apiKey: updatedAccount.apiKey ? '***' + updatedAccount.apiKey.slice(-4) : ''
    }

    return NextResponse.json({
      success: true,
      data: safeAccount
    })
  } catch (error) {
    console.error('Error updating proxy account:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deleted = await withDatabase(async (db) => {
      return await db.deleteProxyAccount(params.id)
    })

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Proxy account not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Proxy account deleted successfully' }
    })
  } catch (error) {
    console.error('Error deleting proxy account:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}