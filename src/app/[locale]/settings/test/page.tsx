'use client'

export default function SettingsTestPage() {
  const handleClick = () => {
    console.log('按钮被点击了！')
    alert('按钮点击测试成功！')
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">设置页面测试</h1>

      <div className="space-y-4">
        <p>这是一个极简的设置页面，用于测试按钮功能。</p>

        <button
          onClick={handleClick}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          测试按钮
        </button>

        <button
          onClick={() => console.log('内联按钮点击')}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 ml-4"
        >
          内联测试
        </button>
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">调试信息：</h2>
        <p>如果您看到这个页面，说明路由正常工作。</p>
        <p>点击上面的按钮，测试按钮事件是否响应。</p>
        <p>打开浏览器控制台，查看是否有 JavaScript 错误。</p>
      </div>
    </div>
  )
}