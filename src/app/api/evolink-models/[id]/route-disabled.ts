// 临时禁用的EvoLink模型API路由 - 用于修复首页加载问题
// 此文件被重命名以避免编译错误

import { NextRequest, NextResponse } from 'next/server'

// 临时返回空响应，避免编译错误
export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'EvoLink API temporarily disabled during debugging'
  })
}

export async function PUT() {
  return NextResponse.json({
    success: false,
    error: 'EvoLink API temporarily disabled during debugging'
  })
}

export async function DELETE() {
  return NextResponse.json({
    success: false,
    error: 'EvoLink API temporarily disabled during debugging'
  })
}