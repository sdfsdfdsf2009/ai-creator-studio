// 统一的中文翻译，避免中英文混杂
export const zh = {
  // 通用
  common: {
    loading: '加载中',
    error: '错误',
    success: '成功',
    cancel: '取消',
    confirm: '确认',
    delete: '删除',
    edit: '编辑',
    save: '保存',
    search: '搜索',
    filter: '筛选',
    create: '创建',
    update: '更新',
    view: '查看',
    download: '下载',
    upload: '上传',
    export: '导出',
    import: '导入',
    copy: '复制',
    retry: '重试',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    finish: '完成',
    close: '关闭',
    open: '打开',
    select: '选择',
    clear: '清空',
    reset: '重置',
    refresh: '刷新',
    settings: '设置',
    details: '详情',
    overview: '概览',
    total: '总计',
    all: '全部',
    none: '无',
    yes: '是',
    no: '否',
    ok: '确定',
    apply: '应用',
    submit: '提交',
    saveAs: '另存为',
    rename: '重命名',
    move: '移动',
    duplicate: '复制',
    share: '分享',
    publish: '发布',
    unpublish: '取消发布',
    archive: '归档',
    unarchive: '取消归档'
  },

  // 任务相关
  tasks: {
    title: '任务管理',
    subtitle: '管理您的AI生成任务',
    create: '创建新任务',
    createSubtitle: '设置AI生成任务的参数配置',
    detail: '任务详情',
    taskId: '任务ID',
    list: '任务列表',
    noTasks: '暂无任务',
    createFirst: '创建您的第一个AI生成任务',
    notFound: '任务不存在',
    searchPlaceholder: '搜索任务...',

    status: {
      all: '所有状态',
      pending: '等待中',
      running: '运行中',
      completed: '已完成',
      failed: '失败',
      cancelled: '已取消'
    },

    type: {
      all: '所有类型',
      image: '图片生成',
      video: '视频生成'
    },

    actions: {
      start: '开始生成',
      cancel: '取消任务',
      retry: '重试',
      delete: '删除任务',
      view: '查看详情',
      download: '下载结果',
      clone: '克隆任务'
    },

    progress: {
      progress: '进度',
      updatedAt: '更新于',
      autoRefresh: '自动刷新',
      stopped: '已停止刷新'
    },

    results: {
      title: '生成结果',
      description: '任务已完成，点击图片可以查看大图或下载',
      noResults: '没有生成结果',
      waiting: '任务等待开始...',
      generating: '正在生成中，请稍候...',
      failed: '任务未能完成',
      completed: '任务完成，但没有生成结果'
    },

    info: {
      type: '类型',
      model: '模型',
      cost: '成本',
      createdAt: '创建时间',
      updatedAt: '更新时间',
      prompt: '提示词',
      parameters: '参数配置'
    }
  },

  // 任务表单
  taskForm: {
    basicConfig: {
      title: '基础配置',
      description: '选择生成类型和基本参数'
    },

    type: {
      label: '生成类型',
      image: '🎨 图片生成',
      video: '🎬 视频生成'
    },

    prompt: {
      label: '提示词配置',
      editor: '变量编辑器'
    },

    model: {
      label: 'AI模型',
      placeholder: '选择一个模型',
      costInfo: '每次生成的成本'
    },

    imageParams: {
      title: '图片参数',
      description: '配置图片生成的具体参数',
      quantity: '数量',
      size: '尺寸',
      quality: '质量',
      style: '风格',
      standard: '标准',
      high: '高质量'
    },

    videoParams: {
      title: '视频参数',
      description: '配置视频生成的具体参数',
      duration: '时长',
      fps: '帧率',
      motion: '运动强度',
      transition: '转场效果',
      cameraAngle: '镜头角度',

      seconds: '秒',
      low: '低',
      medium: '中',
      high: '高',
      extreme: '极高',

      none: '无',
      fade: '淡入淡出',
      slide: '滑动',
      zoom: '缩放',

      eyeLevel: '平视',
      highAngle: '俯视',
      lowAngle: '仰视',
      dutchAngle: '倾斜',
      birdEye: '鸟瞰'
    },

    advancedParams: {
      title: '高级参数',
      description: '可选的高级配置选项',
      seed: '种子值',
      seedPlaceholder: '随机种子值，用于复现结果',
      negativePrompt: '负向提示词',
      negativePlaceholder: '描述不希望出现的内容...',
      watermark: '添加水印'
    },

    cost: {
      label: '预估成本',
      description: '基于当前参数的预估费用'
    },

    actions: {
      submit: '开始生成',
      cancel: '取消'
    },

    sizes: {
      '512x512': '512x512',
      '1024x1024': '1024x1024',
      '1024x1792': '1024x1792',
      '1792x1024': '1792x1024'
    }
  },

  // 素材库
  library: {
    title: '素材库',
    subtitle: '浏览和管理您生成的内容',
    searchPlaceholder: '搜索素材...',

    viewMode: {
      grid: '网格',
      list: '列表'
    },

    type: {
      all: '所有类型',
      image: '图片',
      video: '视频'
    },

    sort: {
      createdAt: '创建时间',
      name: '名称',
      size: '文件大小',
      updatedAt: '更新时间'
    },

    sortOrder: {
      desc: '降序',
      asc: '升序'
    },

    actions: {
      export: '导出选中',
      upload: '上传内容',
      download: '下载',
      addToCollection: '添加到集合',
      delete: '删除',
      selectAll: '全选',
      selected: '已选择',
      items: '个项目'
    },

    noMaterials: '暂无素材',
    noMatch: '没有找到匹配的素材',
    noMatchDescription: '尝试调整搜索条件或筛选器',
    emptyDescription: '生成一些内容来填充您的素材库',
    createFirst: '创建您的第一个生成任务',

    total: '共',
    materials: '个素材',
    search: '搜索',

    materialInfo: {
      size: '文件大小',
      duration: '时长',
      seconds: '秒',
      created: '创建于'
    },

    emptyState: {
      title: '暂无素材',
      description: '生成一些内容来填充您的素材库',
      action: '创建您的第一个生成任务'
    }
  },

  // 文件管理
  files: {
    title: '文件管理',
    subtitle: '管理您上传的图片和视频文件',
    searchPlaceholder: '搜索文件...',

    viewMode: {
      grid: '网格',
      list: '列表'
    },

    type: {
      all: '所有类型',
      image: '图片',
      video: '视频'
    },

    sort: {
      createdAt: '上传时间',
      name: '文件名',
      size: '文件大小',
      updatedAt: '更新时间'
    },

    sortOrder: {
      desc: '降序',
      asc: '升序'
    },

    actions: {
      upload: '上传文件',
      download: '下载',
      view: '查看',
      delete: '删除',
      selectAll: '全选',
      selected: '已选择',
      items: '个文件',
      downloadSelected: '下载选中',
      deleteSelected: '删除选中'
    },

    noFiles: '暂无文件',
    noMatch: '没有找到匹配的文件',
    noMatchDescription: '尝试调整搜索条件或筛选器',
    emptyDescription: '上传一些文件来开始管理',
    createFirst: '上传您的第一个文件',

    total: '共',
    files: '个文件',

    fileInfo: {
      size: '文件大小',
      created: '上传于',
      originalName: '原文件名'
    },

    validation: {
      invalidType: '不支持的文件类型。请上传图片或视频文件。',
      tooLarge: '文件太大。最大支持 100MB。',
      uploadFailed: '上传失败',
      deleteFailed: '删除失败',
      deleteConfirm: '确定要删除这个文件吗？',
      batchDeleteConfirm: '确定要删除选中的 {count} 个文件吗？'
    },

    uploading: '上传中...'
  },

  // Prompt模板
  templates: {
    title: 'Prompt模板',
    subtitle: '管理和复用您的Prompt模板',
    create: '创建新模板',
    edit: '编辑模板',
    use: '使用模板',
    copy: '复制Prompt',

    searchPlaceholder: '搜索模板...',

    type: {
      all: '所有类型',
      image: '图片模板',
      video: '视频模板'
    },

    info: {
      variables: '变量',
      usage: '使用',
      times: '次',
      totalCost: '总成本',
      cacheHitRate: '缓存命中率',
      createdAt: '创建于',
      required: '必填'
    },

    noTemplates: '暂无模板',
    noMatch: '没有找到符合条件的模板',
    emptyDescription: '创建您的第一个Prompt模板来开始使用',
    createFirst: '创建模板',

    actions: {
      create: '✨ 创建新模板',
      edit: '编辑',
      delete: '删除',
      use: '🚀 使用模板',
      copy: '📋 复制Prompt'
    },

    badges: {
      popular: '🔥 热门',
      new: '新',
      updated: '已更新'
    },

    confirmDelete: '确定要删除模板"{name}"吗？'
  },

  // 首页
  home: {
    title: 'AI Creator Studio',
    subtitle: 'AI驱动的图片和视频生成平台',

    features: {
      batch: {
        title: '批量处理',
        description: '一次生成多个内容，提高效率'
      },
      cache: {
        title: '智能缓存',
        description: '避免重复生成，节省成本'
      },
      models: {
        title: '多种AI模型',
        description: '支持主流AI服务提供商'
      }
    },

    quickActions: {
      createImage: '创建图片',
      createVideo: '创建视频',
      browseLibrary: '浏览素材库',
      manageTemplates: '管理模板'
    }
  },

  // 分析页面
  analytics: {
    title: '数据分析',
    subtitle: '跟踪您的AI生成成本和使用情况',

    metrics: {
      totalCost: '总成本',
      totalGenerations: '总生成次数',
      cacheHitRate: '缓存命中率',
      avgCost: '平均成本/次',
      change: '相对变化'
    },

    period: {
      today: '今天',
      week: '本周',
      month: '本月',
      year: '今年'
    },

    charts: {
      costTrend: '成本趋势',
      modelUsage: '模型使用分布',
      dailyStats: '每日统计',
      typeDistribution: '类型分布'
    },

    export: {
      title: '导出报表',
      formats: {
        pdf: 'PDF报表',
        excel: 'Excel表格',
        csv: 'CSV数据'
      }
    }
  },

  // 错误信息
  errors: {
    general: '发生错误，请稍后重试',
    network: '网络连接错误，请检查网络设置',
    notFound: '页面不存在',
    unauthorized: '未授权访问',
    serverError: '服务器错误',
    validation: '请检查输入内容',
    fileUpload: '文件上传失败',
    aiService: 'AI服务暂时不可用',
    quotaExceeded: 'API配额已用完',
    invalidParams: '参数无效',

    task: {
      notFound: '任务不存在',
      createFailed: '创建任务失败',
      deleteFailed: '删除任务失败',
      cancelFailed: '取消任务失败'
    },

    material: {
      notFound: '素材不存在',
      uploadFailed: '上传失败',
      deleteFailed: '删除失败'
    },

    template: {
      notFound: '模板不存在',
      createFailed: '创建模板失败',
      updateFailed: '更新模板失败',
      deleteFailed: '删除模板失败'
    }
  },

  // 成功信息
  success: {
    taskCreated: '任务创建成功',
    taskDeleted: '任务删除成功',
    taskCancelled: '任务已取消',
    materialUploaded: '素材上传成功',
    materialDeleted: '素材删除成功',
    templateCreated: '模板创建成功',
    templateUpdated: '模板更新成功',
    templateDeleted: '模板删除成功',
    copied: '已复制到剪贴板',
    exported: '导出成功',
    saved: '保存成功'
  },

  // 确认对话框
  confirm: {
    deleteTask: '确定要删除这个任务吗？此操作无法撤销。',
    deleteTasks: '确定要删除选中的{count}个任务吗？此操作无法撤销。',
    deleteMaterial: '确定要删除这个素材吗？此操作无法撤销。',
    deleteMaterials: '确定要删除选中的{count}个素材吗？此操作无法撤销。',
    deleteTemplate: '确定要删除模板"{name}"吗？此操作无法撤销。',
    cancelTask: '确定要取消这个任务吗？'
  },

  // 时间格式
  time: {
    justNow: '刚刚',
    minutesAgo: '{count}分钟前',
    hoursAgo: '{count}小时前',
    daysAgo: '{count}天前',
    weeksAgo: '{count}周前',
    monthsAgo: '{count}个月前',
    yearsAgo: '{count}年前'
  },

  // 单位
  units: {
    b: 'B',
    kb: 'KB',
    mb: 'MB',
    gb: 'GB',
    tb: 'TB',
    pixels: '像素',
    fps: 'FPS',
    seconds: '秒',
    minutes: '分钟',
    hours: '小时'
  },

  // 导航
  nav: {
    logo: 'AI Creator Studio',
    tasks: '任务',
    create: '创建',
    library: '素材库',
    files: '文件管理',
    workflows: '工作流',
    monitor: '监控',
    templates: '模板',
    analytics: '分析',
    settings: '设置'
  },

  // 工作流管理
  workflows: {
    title: '工作流管理',
    subtitle: '管理和自动化您的AI内容生成工作流',
    create: '创建工作流',
    createSubtitle: '选择模板或创建自定义工作流',

    searchPlaceholder: '搜索工作流...',

    status: {
      all: '所有状态',
      active: '已激活',
      inactive: '未激活',
      error: '错误',
      running: '运行中',
      success: '成功',
      canceled: '已取消'
    },

    actions: {
      activate: '激活',
      deactivate: '停用',
      execute: '执行',
      delete: '删除',
      view: '查看详情',
      edit: '编辑工作流',
      history: '查看执行历史'
    },

    info: {
      nodes: '个节点',
      connections: '连接数',
      createdAt: '创建时间',
      updatedAt: '更新时间',
      status: '状态'
    },

    template: {
      custom: '自定义工作流',
      aiGeneration: 'AI内容生成工作流',
      batchProcessing: '批量处理工作流'
    },

    createForm: {
      name: '工作流名称',
      namePlaceholder: '输入工作流名称',
      description: '描述',
      descriptionPlaceholder: '输入工作流描述（可选）',
      template: '模板（可选）',
      creating: '创建中...'
    },

    noWorkflows: '暂无工作流',
    noMatch: '没有找到符合条件的工作流',
    emptyDescription: '创建您的第一个工作流来开始自动化流程',
    createFirst: '创建工作流',

    nodes: {
      start: '开始',
      webhook: 'Webhook',
      httpRequest: 'HTTP请求',
      function: '函数',
      cron: '定时触发器',
      splitInBatches: '批量处理',
      set: '设置变量',
      if: '条件判断',
      switch: '条件分支',
      merge: '合并数据',
      code: '代码执行'
    },

    confirmDelete: '确定要删除工作流 "{name}" 吗？'
  },

  // 任务监控
  monitor: {
    title: '任务监控',
    subtitle: '实时监控AI生成任务的执行状态和进度',
    activeTasks: '个活跃任务',
    autoRefreshOn: '自动刷新开启',
    autoRefreshOff: '自动刷新关闭',

    stats: {
      pending: '等待中',
      running: '运行中',
      completed: '已完成',
      failed: '失败'
    },

    overview: {
      title: '任务监控',
      taskId: '任务ID',
      simulateStart: '模拟开始',
      simulateProgress: '模拟进度',
      simulateError: '模拟错误'
    },

    tabs: {
      overview: '概览',
      logs: '日志',
      metrics: '指标'
    },

    progress: {
      currentStage: '当前阶段',
      startTime: '开始时间',
      endTime: '完成时间',
      duration: '运行时长',
      estimatedRemaining: '预计剩余时间',
      calculating: '计算中...',
      almostComplete: '即将完成'
    },

    logs: {
      noLogs: '暂无日志',
      level: {
        info: '信息',
        warning: '警告',
        error: '错误',
        success: '成功'
      }
    },

    metrics: {
      totalSteps: '总步骤',
      completedSteps: '已完成步骤',
      currentCost: '当前成本',
      estimatedTotalCost: '预估总成本',
      apiCallsCount: 'API调用次数',
      currentStep: '当前步骤'
    },

    notifications: {
      title: '通知',
      markAllRead: '标记全部已读',
      noNotifications: '暂无新通知'
    },

    quickActions: {
      title: '快速操作',
      refreshData: '刷新监控数据',
      exportReport: '导出监控报告',
      settings: '配置监控设置'
    },

    status: {
      pending: '等待中',
      running: '运行中',
      completed: '已完成',
      failed: '失败',
      cancelled: '已取消'
    },

    messages: {
      selectTask: '选择一个任务来查看监控详情',
      selectTaskId: '请选择一个任务ID来开始监控',
      taskStarted: '任务开始执行',
      progressUpdated: '进度更新到 {progress}%',
      taskCompleted: '任务执行完成',
      taskFailed: '任务执行失败'
    }
  }
}