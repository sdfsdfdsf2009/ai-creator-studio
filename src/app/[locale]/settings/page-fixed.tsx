'use client'

import { useEffect, useRef } from 'react'

export default function SettingsPageFixed() {
  const button1Ref = useRef<HTMLButtonElement>(null)
  const button2Ref = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const checkboxRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    console.log('设置页面组件已挂载')

    // 方法1: 使用 addEventListener
    const button1 = button1Ref.current
    if (button1) {
      const handleClick1 = (e: Event) => {
        console.log('方法1按钮点击：addEventListener', e)
        alert('方法1测试成功！addEventListener 正常工作')
      }
      button1.addEventListener('click', handleClick1)

      return () => {
        button1.removeEventListener('click', handleClick1)
      }
    }
  }, [])

  useEffect(() => {
    // 方法2: 使用原生 DOM 方法
    const button2 = button2Ref.current
    if (button2) {
      button2.onclick = (e: MouseEvent) => {
        console.log('方法2按钮点击：onclick 属性', e)
        alert('方法2测试成功！onclick 属性正常工作')
      }
    }
  }, [])

  useEffect(() => {
    // 方法3: 监听输入框变化
    const input = inputRef.current
    if (input) {
      const handleInput = (e: Event) => {
        const target = e.target as HTMLInputElement
        console.log('输入框内容变化：', target.value)
      }
      input.addEventListener('input', handleInput)

      return () => {
        input.removeEventListener('input', handleInput)
      }
    }
  }, [])

  useEffect(() => {
    // 方法4: 监听复选框变化
    const checkbox = checkboxRef.current
    if (checkbox) {
      const handleChange = (e: Event) => {
        const target = e.target as HTMLInputElement
        console.log('复选框状态变化：', target.checked)
        alert(`复选框状态：${target.checked ? '已选中' : '未选中'}`)
      }
      checkbox.addEventListener('change', handleChange)

      return () => {
        checkbox.removeEventListener('change', handleChange)
      }
    }
  }, [])

  // 方法5: 内联函数调用
  const handleInlineClick = () => {
    console.log('方法5按钮点击：内联函数')
    alert('方法5测试成功！内联函数正常工作')
  }

  // 方法6: 使用数据属性和事件委托
  const handleDelegatedClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.dataset.action === 'delegate-test') {
      console.log('方法6按钮点击：事件委托', e)
      alert('方法6测试成功！事件委托正常工作')
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6" onClick={handleDelegatedClick}>
      <h1 className="text-2xl font-bold">设置页面 - 修复版本</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">事件处理方法测试</h2>
        <p className="text-gray-600 mb-4">
          这个页面使用了多种不同的方法来处理按钮点击事件，帮助诊断问题。
        </p>

        <div className="space-y-4">
          {/* 方法1: addEventListener */}
          <div className="flex items-center space-x-4">
            <button
              ref={button1Ref}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              方法1: addEventListener
            </button>
            <span className="text-sm text-gray-600">在 useEffect 中绑定</span>
          </div>

          {/* 方法2: onclick 属性 */}
          <div className="flex items-center space-x-4">
            <button
              ref={button2Ref}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              方法2: onclick 属性
            </button>
            <span className="text-sm text-gray-600">直接设置 onclick 属性</span>
          </div>

          {/* 方法3: 内联函数 */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handleInlineClick}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            >
              方法3: 内联函数
            </button>
            <span className="text-sm text-gray-600">React onClick 属性</span>
          </div>

          {/* 方法4: 事件委托 */}
          <div className="flex items-center space-x-4">
            <button
              data-action="delegate-test"
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
            >
              方法4: 事件委托
            </button>
            <span className="text-sm text-gray-600">通过 data-action 处理</span>
          </div>

          {/* 方法5: 原生HTML属性 */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                console.log('方法5按钮点击：箭头函数')
                alert('方法5测试成功！箭头函数正常工作')
              }}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              方法5: 箭头函数
            </button>
            <span className="text-sm text-gray-600">内联箭头函数</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">表单控件测试</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">API Key 输入：</label>
            <input
              ref={inputRef}
              type="text"
              placeholder="输入一些文字测试"
              className="w-full p-2 border rounded"
            />
            <p className="text-xs text-gray-500 mt-1">在控制台查看输入日志</p>
          </div>

          <div>
            <label className="flex items-center">
              <input
                ref={checkboxRef}
                type="checkbox"
                className="mr-2"
              />
              <span>启用服务（点击测试）</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">点击复选框会触发 alert</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">调试信息</h2>
        <div className="space-y-2 text-sm">
          <p><strong>组件状态：</strong> ✅ 已挂载</p>
          <p><strong>React：</strong> ✅ 正常工作</p>
          <p><strong>JavaScript：</strong> ✅ 正常工作</p>
          <p><strong>测试方法：</strong> 请点击上方所有按钮进行测试</p>
          <p><strong>控制台：</strong> 打开开发者工具查看日志</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">快速导航</h2>
        <div className="space-x-4">
          <a href="/zh-CN/settings" className="bg-blue-100 text-blue-700 px-4 py-2 rounded hover:bg-blue-200 inline-block">
            返回原始设置页面
          </a>
          <a href="/zh-CN/settings/test" className="bg-green-100 text-green-700 px-4 py-2 rounded hover:bg-green-200 inline-block">
            简单测试页面
          </a>
          <a href="/zh-CN/settings/diagnostic" className="bg-purple-100 text-purple-700 px-4 py-2 rounded hover:bg-purple-200 inline-block">
            诊断工具页面
          </a>
          <a href="/settings-test.html" className="bg-orange-100 text-orange-700 px-4 py-2 rounded hover:bg-orange-200 inline-block">
            原生HTML测试
          </a>
        </div>
      </div>
    </div>
  )
}