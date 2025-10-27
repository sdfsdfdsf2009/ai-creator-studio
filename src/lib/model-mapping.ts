/**
 * 模型名称映射工具
 * 提供显示名称到实际模型名称的映射功能
 */

/**
 * 模型映射配置
 */
const modelMappings: Record<string, string> = {
  // EvoLink 视频模型映射
  'Veo 3 Fast (EvoLink)': 'veo3.1-fast',
  'Veo 3 Pro (EvoLink)': 'veo3.1-pro',
  'Veo 3 Ultra (EvoLink)': 'veo3.1-ultra',
  'Sora 1.0 (EvoLink)': 'sora-1.0',
  'Sora 2.0 (EvoLink)': 'sora-2.0',
  'Sora-2': 'sora-2',
  'Gemini 2.5 Flash': 'gemini-2.5-flash-image',
  'Luma Dream Machine (EvoLink)': 'luma-dream-machine',
  'Pika Labs (EvoLink)': 'pika-labs',
  'Runway Gen-3 (EvoLink)': 'runway-gen3',
  'Luma 1.6 (EvoLink)': 'luma-1.6',
  'Video-1 (EvoLink)': 'video-1',

  // 图像模型映射
  'DALL-E 3': 'dall-e-3',
  'DALL-E 2': 'dall-e-2',
  'Stable Diffusion XL': 'stable-diffusion-xl',
  'Stable Diffusion': 'stable-diffusion',
  'Midjourney v6': 'midjourney-v6',
  'Flux Pro': 'flux-pro',
  'Flux Dev': 'flux-dev',
  'Flux Schnell': 'flux-schnell',

  // 其他模型
  'GPT-4 Vision': 'gpt-4-vision-preview',
  'GPT-4': 'gpt-4-turbo-preview',
  'Claude 3': 'claude-3-opus-20240229'
}

/**
 * 将显示名称映射到实际模型名称
 * @param displayName - 显示名称
 * @returns 实际模型名称
 */
export function mapDisplayNameToActualModel(displayName: string): string {
  return modelMappings[displayName] || displayName
}

/**
 * 获取所有可用的模型映射
 * @returns 模型映射对象
 */
export function getModelMappings(): Record<string, string> {
  return { ...modelMappings }
}

/**
 * 检查模型是否存在映射
 * @param displayName - 显示名称
 * @returns 是否存在映射
 */
export function hasModelMapping(displayName: string): boolean {
  return displayName in modelMappings
}

/**
 * 添加新的模型映射
 * @param displayName - 显示名称
 * @param actualModel - 实际模型名称
 */
export function addModelMapping(displayName: string, actualModel: string): void {
  modelMappings[displayName] = actualModel
}

/**
 * 批量添加模型映射
 * @param mappings - 模型映射对象
 */
export function addModelMappings(mappings: Record<string, string>): void {
  Object.assign(modelMappings, mappings)
}