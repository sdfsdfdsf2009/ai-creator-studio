'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Variable, VariableMatch, 
         detectVariables, 
         extractVariableDefinitions, 
         cleanPrompt,
         expandVariables,
         validateVariableValues,
         generateDefaultValues } from '@/lib/variables'

interface VariableEditorProps {
  initialPrompt?: string
  onPromptChange?: (prompt: string) => void
  onVariablesChange?: (variables: Record<string, Variable>) => void
  onValuesChange?: (values: Record<string, any>) => void
}

export function VariableEditor({ 
  initialPrompt = '', 
  onPromptChange,
  onVariablesChange,
  onValuesChange 
}: VariableEditorProps) {
  const [prompt, setPrompt] = useState(initialPrompt)
  const [rawPrompt, setRawPrompt] = useState(initialPrompt)
  const [variables, setVariables] = useState<Record<string, Variable>>({})
  const [values, setValues] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showAdvanced, setShowAdvanced] = useState(false)

  // 解析变量
  useEffect(() => {
    const detectedVars = extractVariableDefinitions(rawPrompt)
    setVariables(detectedVars)
    
    // 生成默认值
    const defaultValues = generateDefaultValues(detectedVars)
    setValues(defaultValues)
    
    onVariablesChange?.(detectedVars)
  }, [rawPrompt, onVariablesChange])

  // 当提示词变化时，通知父组件
  useEffect(() => {
    const expandedPrompt = expandVariables(rawPrompt, variables, values)
    setPrompt(expandedPrompt)
    onPromptChange?.(expandedPrompt)
  }, [rawPrompt, variables, values, onPromptChange])

  // 当值变化时，验证并通知父组件
  useEffect(() => {
    const validation = validateVariableValues(variables, values)
    setErrors(validation.errors)
    onValuesChange?.(values)
  }, [values, variables, onValuesChange])

  // 更新变量值
  const updateValue = (name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }))
  }

  // 渲染变量输入组件
  const renderVariableInput = (variable: Variable) => {
    const error = errors[variable.name]
    const value = values[variable.name] || ''

    switch (variable.type) {
      case 'select':
        return (
          <div key={variable.name} className="space-y-2">
            <Label>
              {variable.name}
              {variable.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <select
              value={value}
              onChange={(e) => updateValue(variable.name, e.target.value)}
              className={`w-full px-3 py-2 border rounded-md ${
                error ? 'border-red-500' : 'border-input'
              }`}
            >
              {variable.options?.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {variable.description && (
              <p className="text-sm text-muted-foreground">
                {variable.description}
              </p>
            )}
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
        )

      case 'number':
        return (
          <div key={variable.name} className="space-y-2">
            <Label>
              {variable.name}
              {variable.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => updateValue(variable.name, e.target.value ? Number(e.target.value) : '')}
              placeholder={variable.defaultValue?.toString()}
              className={error ? 'border-red-500' : ''}
            />
            {variable.description && (
              <p className="text-sm text-muted-foreground">
                {variable.description}
              </p>
            )}
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
        )

      case 'text':
      default:
        return (
          <div key={variable.name} className="space-y-2">
            <Label>
              {variable.name}
              {variable.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              value={value}
              onChange={(e) => updateValue(variable.name, e.target.value)}
              placeholder={variable.defaultValue?.toString()}
              className={error ? 'border-red-500' : ''}
            />
            {variable.description && (
              <p className="text-sm text-muted-foreground">
                {variable.description}
              </p>
            )}
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* 提示词编辑器 */}
      <Card>
        <CardHeader>
          <CardTitle>Prompt Editor</CardTitle>
          <CardDescription>
            Use variable syntax @name:type [options] (description) = default value to define variables
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="rawPrompt">Original Prompt</Label>
              <div className="text-sm text-muted-foreground">
                {rawPrompt.length}/2000 字符
              </div>
            </div>
            <textarea
              id="rawPrompt"
              value={rawPrompt}
              onChange={(e) => setRawPrompt(e.target.value)}
              placeholder="Example: @occupation:select [doctor,engineer,artist] (profession) @style:text (style) = modern Professional portrait of a {occupation}, {style} style"
              className={`w-full px-3 py-2 border rounded-md h-32 resize-none font-mono text-sm ${
                rawPrompt.length > 2000 ? 'border-red-500 focus:ring-red-500' : 'border-input'
              }`}
            />
            {rawPrompt.length > 2000 && (
              <div className="text-sm text-red-500 mt-1">
                ⚠️ Prompt过长，已自动截断到2000字符。建议缩短Prompt以获得最佳效果。
              </div>
            )}
          </div>

          {/* 展开的提示词预览 */}
          <div className="space-y-2">
            <Label>Expanded Prompt</Label>
            <div className="p-3 bg-muted rounded-md min-h-[60px] text-sm">
              {prompt || 'Please fill in prompt and variables...'}
            </div>
          </div>

          {/* 快速帮助 */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Variable syntax: @name:type [options] (description) = default value</p>
            <p>• Supported types: text (text), select (dropdown), number (number)</p>
            <p>• Variable usage: Reference with {'{name}'} in prompt</p>
          </div>
        </CardContent>
      </Card>

      {/* 变量配置 */}
      {Object.keys(variables).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Variable Configuration
              <Badge variant="secondary">
                {Object.keys(variables).length} variables
              </Badge>
            </CardTitle>
            <CardDescription>
              Configure the value of each variable, which will be replaced in the prompt
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.values(variables).map(variable => (
              renderVariableInput(variable)
            ))}
          </CardContent>
        </Card>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-4">
        <Button 
          onClick={() => {
            setRawPrompt('')
            setVariables({})
            setValues({})
            setErrors({})
          }}
          variant="outline"
        >
          Clear
        </Button>
        <Button 
          onClick={() => {
            // 重置为默认值
            const defaultValues = generateDefaultValues(variables)
            setValues(defaultValues)
          }}
          variant="outline"
        >
          Reset to Default
        </Button>
      </div>
    </div>
  )
}