import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileIds } = body

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No file IDs provided' },
        { status: 400 }
      )
    }

    // 这里应该从数据库批量删除文件记录
    // 现在只是模拟删除成功
    console.log(`Deleting files with IDs: ${fileIds.join(', ')}`)

    // 在实际实现中，你还需要：
    // 1. 从数据库批量删除文件记录
    // 2. 删除物理文件
    // for (const fileId of fileIds) {
    //   const filePath = join(process.cwd(), 'uploads', fileId)
    //   if (existsSync(filePath)) {
    //     await unlink(filePath)
    //   }
    // }

    return NextResponse.json({
      success: true,
      message: `${fileIds.length} files deleted successfully`,
      deletedCount: fileIds.length
    })

  } catch (error) {
    console.error('Error batch deleting files:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}