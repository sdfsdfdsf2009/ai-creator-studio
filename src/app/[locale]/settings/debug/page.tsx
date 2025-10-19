'use client'

import React from 'react'

// 最简化的测试页面，没有任何复杂的依赖
export default function SettingsDebugPage() {
  console.log('SettingsDebugPage: 组件开始渲染')

  const handleClick = () => {
    console.log('SettingsDebugPage: handleClick 被调用')
    alert('✅ 最简化页面按钮点击成功！')
  }

  const handleDivClick = () => {
    console.log('SettingsDebugPage: handleDivClick 被调用')
    alert('✅ div点击成功！')
  }

  const handleNativeClick = () => {
    console.log('SettingsDebugPage: handleNativeClick 被调用')
    alert('✅ 原生按钮点击成功！')
  }

  // 使用原生事件监听器
  const attachNativeListener = (elementId: string) => {
    setTimeout(() => {
      const element = document.getElementById(elementId)
      if (element) {
        console.log(`SettingsDebugPage: 找到元素 ${elementId}`)
        element.addEventListener('click', handleNativeClick)
        console.log(`SettingsDebugPage: 已为 ${elementId} 添加原生事件监听器`)
      } else {
        console.log(`SettingsDebugPage: 未找到元素 ${elementId}`)
      }
    }, 1000)
  }

  React.useEffect(() => {
    console.log('SettingsDebugPage: useEffect 执行')
    attachNativeListener('native-btn')

    // 添加全局点击监听器
    const globalClickHandler = (e: MouseEvent) => {
      console.log('SettingsDebugPage: 全局点击事件', e.target)
    }
    document.addEventListener('click', globalClickHandler)

    return () => {
      document.removeEventListener('click', globalClickHandler)
    }
  }, [])

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#f0f0f0',
        border: '2px solid red',
        margin: '20px'
      }}
      onClick={handleDivClick}
    >
      <h1 style={{ color: 'red', fontSize: '24px' }}>
        设置页面调试 - 最简化版本
      </h1>

      <div style={{ marginTop: '20px' }}>
        <p>如果您看到这个页面，说明路由正常工作。</p>
        <p>请尝试点击下面的按钮，并在控制台查看日志。</p>
      </div>

      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* React onClick 按钮 */}
        <button
          onClick={handleClick}
          style={{
            padding: '10px 20px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          React onClick 按钮
        </button>

        {/* 内联箭头函数按钮 */}
        <button
          onClick={() => {
            console.log('SettingsDebugPage: 内联箭头函数被调用')
            alert('✅ 内联箭头函数点击成功！')
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          内联箭头函数按钮
        </button>

        {/* 原生按钮（通过ID添加事件监听器） */}
        <button
          id="native-btn"
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          原生事件监听器按钮
        </button>

        {/* 普通HTML按钮 */}
        <input
          type="button"
          value="HTML input 按钮"
          onClick={() => {
            console.log('SettingsDebugPage: HTML input 按钮被调用')
            alert('✅ HTML input 按钮点击成功！')
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        />

        {/* 使用onMouseDown */}
        <button
          onMouseDown={() => {
            console.log('SettingsDebugPage: onMouseDown 被调用')
            alert('✅ onMouseDown 事件成功！')
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#fd7e14',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          onMouseDown 按钮
        </button>
      </div>

      <div style={{
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '5px'
      }}>
        <h3 style={{ color: '#856404' }}>调试信息：</h3>
        <ul style={{ color: '#856404', fontSize: '14px' }}>
          <li>✅ 页面正常加载 - 路由工作正常</li>
          <li>🔘 尝试点击每个按钮 - 测试不同的事件处理方式</li>
          <li>🔘 打开浏览器开发者工具（F12）- 查看控制台日志</li>
          <li>🔘 检查是否有JavaScript错误信息</li>
          <li>🔘 观察网络请求是否有异常</li>
        </ul>
      </div>

      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#d1ecf1',
        border: '1px solid #bee5eb',
        borderRadius: '5px'
      }}>
        <h3 style={{ color: '#0c5460' }}>快速诊断步骤：</h3>
        <ol style={{ color: '#0c5460', fontSize: '14px' }}>
          <li>打开浏览器开发者工具（F12）</li>
          <li>切换到 Console（控制台）标签页</li>
          <li>刷新页面，查看是否出现 "SettingsDebugPage: 组件开始渲染"</li>
          <li>依次点击每个按钮，查看控制台日志</li>
          <li>如果没有任何日志，说明JavaScript可能被阻止</li>
          <li>如果有日志但无弹窗，说明alert()可能被阻止</li>
        </ol>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            console.log('SettingsDebugPage: 内联script执行')

            // 直接在HTML中添加事件监听器
            document.addEventListener('DOMContentLoaded', function() {
              console.log('SettingsDebugPage: DOMContentLoaded 事件触发')

              setTimeout(function() {
                const buttons = document.querySelectorAll('button, input[type="button"]')
                console.log('SettingsDebugPage: 找到按钮数量:', buttons.length)

                buttons.forEach(function(button, index) {
                  console.log('SettingsDebugPage: 按钮' + index + ':', button.textContent.trim())
                })
              }, 500)
            })
          `
        }}
      />
    </div>
  )
}