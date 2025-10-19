'use client'

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">数据分析</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">数据统计</h2>
        <p className="text-gray-600">
          分析功能正在开发中...
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-semibold text-blue-800">总生成次数</h3>
            <p className="text-2xl font-bold text-blue-600">0</p>
          </div>
          <div className="bg-green-50 p-4 rounded">
            <h3 className="font-semibold text-green-800">成功率</h3>
            <p className="text-2xl font-bold text-green-600">100%</p>
          </div>
          <div className="bg-purple-50 p-4 rounded">
            <h3 className="font-semibold text-purple-800">平均响应时间</h3>
            <p className="text-2xl font-bold text-purple-600">0ms</p>
          </div>
        </div>
      </div>
    </div>
  )
}