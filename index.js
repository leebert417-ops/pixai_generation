//
// 修正版本：修复了因 "third-party" 文件夹导致的路径偏移
//

// 导入 SillyTavern 的核心功能
import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js'; // script.js 在根目录，4层路径
import { extension_settings, getContext, renderExtensionTemplateAsync } from '../../../extensions.js'; // 路径从 ../../ 变为 ../../../
import { humanizedDateTime } from '../../../RossAscends-mods.js'; // RossAscends-mods.js 在 public/ 目录下，3层路径
import { SlashCommand } from '../../../slash-commands/SlashCommand.js'; // 路径从 ../../ 变为 ../../../
import {
  ARGUMENT_TYPE,
  SlashCommandArgument,
  SlashCommandNamedArgument,
} from '../../../slash-commands/SlashCommandArgument.js'; // 路径从 ../../ 变为 ../../../
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js'; // 路径从 ../../ 变为 ../../../
import { getBase64Async, saveBase64AsFile } from '../../../utils.js'; // 路径从 ../../ 变为 ../../../

// 定义拓展名称
const MODULE_NAME = 'pixai_generation'; // 用于 extension_settings 的键名
const TEMPLATE_PATH = 'third-party/pixai_generation'; // 用于模板路径
const PROXY_URL = 'http://127.0.0.1:5555'; // 代理服务器地址

// 代理服务器进程 ID（如果从扩展启动）
let proxyProcess = null;

// 默认设置
const defaultSettings = {
  apiKey: '', // API 密钥存储在扩展设置中
  modelId: '1648918127446573124',
  samplingMethod: 'DPM++ 2M Karras',
  promptPrefix: 'best quality, absurdres, masterpiece,',
  negativePrompt:
    'worst quality, large head, low quality, extra digits, bad eye, EasyNegativeV2, ng_deepnegative_v1_75t',
  useLora: false,
  loras: [], // 改为数组，支持多个 Lora: [{id: 'xxx', weight: 0.7}, ...]
  steps: 20,
  scale: 6.0,
  width: 512,
  height: 768,
};

// 初始化设置
if (extension_settings[MODULE_NAME] === undefined) {
  extension_settings[MODULE_NAME] = { ...defaultSettings };
}
const settings = extension_settings[MODULE_NAME];

// API 端点 - 使用本地代理避免 CORS 问题
const PIXAI_PROXY_BASE = 'http://127.0.0.1:5555/pixai';
const POLL_INTERVAL_MS = 5000; // 5秒轮询一次
const MAX_WAIT_TIME_MS = 300000; // 5分钟超时

/**
 * 帮助函数：休眠
 */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 帮助函数：添加聊天消息
 */
async function addChatMessage(message, isSystem = false) {
  const context = getContext();
  const messageObj = {
    name: isSystem ? 'System' : context.name1,
    is_user: false,
    is_system: isSystem,
    mes: message,
    extra: {},
  };
  context.chat.push(messageObj);
  const messageId = context.chat.length - 1;
  await eventSource.emit(event_types.MESSAGE_RECEIVED, messageId, 'extension');
  context.addOneMessage(messageObj);
  await eventSource.emit(event_types.CHARACTER_MESSAGE_RENDERED, messageId, 'extension');
  await context.saveChat();
}

/**
 * 获取 PixAI API 密钥
 */
function getPixaiApiKey() {
  return settings.apiKey;
}

/**
 * 核心功能：调用 PixAI API
 * 这是一个异步轮询函数
 * @param {string} prompt - 提示词
 * @param {string} negativePrompt - 负面提示词
 * @param {object} overrides - 从斜杠命令传入的覆盖参数
 * @param {AbortSignal} signal - 用于中止请求的信号
 * @returns {Promise<{format: string, data: string}>} - 必须返回 Base64 图像数据
 */
async function generatePixaiImage(prompt, negativePrompt, overrides = {}, signal) {
  // 1. 从 ST 的安全存储中获取 API 密钥
  const token = getPixaiApiKey();
  if (!token) {
    throw new Error('PixAI API 密钥未设置。请在拓展设置中配置。');
  }

  // 使用代理时，API 密钥通过自定义 header 传递
  const headers = {
    'X-API-Key': token,
    'Content-Type': 'application/json',
  };

  // 2. 合并设置和覆盖参数
  const finalParams = {
    modelId: overrides.modelId || settings.modelId,
    samplingMethod: overrides.sampler || settings.samplingMethod,
    steps: overrides.steps || settings.steps,
    scale: overrides.scale || settings.scale,
    width: overrides.width || settings.width,
    height: overrides.height || settings.height,
    negativePrompt: negativePrompt || settings.negativePrompt,
    useLora: settings.useLora,
    loras: settings.loras || [],
  };

  // 3. 添加提示词前缀
  let finalPrompt = prompt;
  if (settings.promptPrefix && settings.promptPrefix.trim()) {
    const prefix = settings.promptPrefix.trim();
    // 确保前缀和提示词之间有空格
    finalPrompt = prefix.endsWith(',') ? `${prefix} ${prompt}` : `${prefix}, ${prompt}`;
  }

  // 4. 构建 Lora (仅当启用 Lora 且有 Lora 列表时)
  const loraPayload = {};
  if (finalParams.useLora && finalParams.loras && finalParams.loras.length > 0) {
    finalParams.loras.forEach(lora => {
      if (lora.id && lora.id.trim()) {
        loraPayload[lora.id.trim()] = lora.weight;
      }
    });
  }

  // 5. 构建请求体 (基于您提供的官方示例结构)
  const taskPayload = {
    parameters: {
      prompts: finalPrompt,
      negativePrompts: finalParams.negativePrompt,
      modelId: finalParams.modelId,
      width: finalParams.width,
      height: finalParams.height,
      samplingSteps: finalParams.steps,
      samplingMethod: finalParams.samplingMethod,
      cfgScale: finalParams.scale,
      batchSize: 1,
      lora: loraPayload,
    },
  };

  // --- 步骤 1: 创建任务 ---
  toastr.info('正在创建任务...', 'PixAI');
  const createResponse = await fetch(`${PIXAI_PROXY_BASE}/task`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(taskPayload),
    signal: signal, // 允许 ST 中止请求
  });

  if (!createResponse.ok) {
    const errText = await createResponse.text();
    throw new Error(`PixAI 创建任务失败 (HTTP ${createResponse.status}): ${errText}`);
  }

  const taskResult = await createResponse.json();
  const taskId = taskResult.id;
  if (!taskId) {
    throw new Error('PixAI 响应中未找到任务 ID。');
  }

  console.log(`[PixAI] 任务创建成功: ${taskId}`);
  toastr.info(`任务 ${taskId} 已创建，正在等待...`, 'PixAI');

  // --- 步骤 2: 轮询任务 ---
  const startTime = Date.now();
  while (Date.now() - startTime < MAX_WAIT_TIME_MS) {
    // 检查是否在等待时被用户中止
    if (signal.aborted) {
      throw new Error('PixAI 任务被用户中止。');
    }

    const statusResponse = await fetch(`${PIXAI_PROXY_BASE}/task/${taskId}`, {
      method: 'GET',
      headers: headers,
      signal: signal,
    });

    if (!statusResponse.ok) {
      throw new Error(`PixAI 状态检查失败 (HTTP ${statusResponse.status})`);
    }

    const statusData = await statusResponse.json();
    const status = statusData.status;

    console.log(`[PixAI] 任务 ${taskId} 状态: ${status}`);

    if (status === 'completed') {
      // 3. 获取图像 URL (基于官方示例结构)
      const mediaUrls = statusData.outputs?.mediaUrls || [];
      if (mediaUrls.length > 0) {
        const imageUrl = mediaUrls[0];
        console.log(`[PixAI] 图像 URL: ${imageUrl}`);

        // --- 步骤 4: 下载图像并转为 Base64 ---
        toastr.info('正在下载图像...', 'PixAI');
        const imageResponse = await fetch(imageUrl, { signal: signal });
        if (!imageResponse.ok) {
          throw new Error('无法从 PixAI URL 下载图像。');
        }
        const imageBlob = await imageResponse.blob();
        const base64DataUrl = await getBase64Async(imageBlob);

        return {
          format: imageBlob.type.split('/')[1] || 'png',
          data: base64DataUrl.split(',')[1], // 移除 "data:image/png;base64," 前缀
        };
      } else {
        throw new Error('PixAI 任务完成，但未返回 mediaUrls。');
      }
    } else if (status === 'failed' || status === 'cancelled') {
      const errorDetails = statusData.error || statusData.errorDetails || '未知错误';
      throw new Error(`PixAI 任务失败或被取消。详情: ${errorDetails}`);
    }

    // 等待 N 秒后再轮询
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error('PixAI 任务超时。');
}

/**
 * 检查代理服务器状态
 */
async function checkProxyStatus() {
  try {
    const response = await fetch(`${PROXY_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000), // 3秒超时
    });

    if (response.ok) {
      const data = await response.json();
      updateProxyStatus(true, data.message || '代理服务器运行中');
      return true;
    } else {
      updateProxyStatus(false, '代理服务器响应异常');
      return false;
    }
  } catch (error) {
    updateProxyStatus(false, '代理服务器未运行');
    return false;
  }
}

/**
 * 更新代理服务器状态显示
 */
function updateProxyStatus(isRunning, message) {
  const $statusText = $('#pixai_proxy_status_text');
  if (isRunning) {
    $statusText.html(`<span style="color: #4caf50">✅ ${message}</span>`);
  } else {
    $statusText.html(`<span style="color: #f44336">❌ ${message}</span>`);
  }
}

/**
 * 启动代理服务器
 */
async function startProxyServer() {
  toastr.info('正在启动代理服务器...', 'PixAI');

  try {
    // 检查是否已经在运行
    const isRunning = await checkProxyStatus();
    if (isRunning) {
      toastr.success('代理服务器已经在运行', 'PixAI');
      return;
    }

    // 尝试通过 Node.js 启动
    // 注意：浏览器环境无法直接启动进程，需要用户手动启动
    toastr.warning('请手动运行 start_proxy_node.bat 启动代理服务器', 'PixAI', { timeOut: 5000 });

    // 打开文件所在目录（如果可能）
    // 这在浏览器中无法实现，只能提示用户
    const extensionPath = window.location.origin + '/scripts/extensions/third-party/pixai_generation/';
    console.log('代理服务器脚本位置:', extensionPath);
  } catch (error) {
    console.error('启动代理服务器失败:', error);
    toastr.error('启动代理服务器失败: ' + error.message, 'PixAI');
  }
}

/**
 * 渲染 Lora 列表
 */
function renderLoraList() {
  const $list = $('#pixai_lora_list');
  $list.empty();

  if (!settings.loras) {
    settings.loras = [];
  }

  settings.loras.forEach((lora, index) => {
    const $item = $(`
      <div class="pixai_lora_item" data-index="${index}">
        <div class="pixai_lora_item_fields">
          <div class="pixai_lora_item_field">
            <label>Lora ID</label>
            <input type="text" class="text_pole pixai_lora_id_input" value="${
              lora.id || ''
            }" placeholder="例如: 1744880666293972790" />
          </div>
          <div class="pixai_lora_item_field" style="flex: 0 0 150px;">
            <label>权重</label>
            <input type="number" class="text_pole pixai_lora_weight_input" value="${
              lora.weight || 0.7
            }" step="0.1" min="0" max="1" />
          </div>
        </div>
        <button type="button" class="pixai_lora_remove">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `);

    // 绑定输入事件
    $item.find('.pixai_lora_id_input').on('input', function () {
      settings.loras[index].id = $(this).val();
      saveSettingsDebounced();
    });

    $item.find('.pixai_lora_weight_input').on('input', function () {
      settings.loras[index].weight = Number($(this).val());
      saveSettingsDebounced();
    });

    // 绑定删除按钮
    $item.find('.pixai_lora_remove').on('click', function () {
      settings.loras.splice(index, 1);
      saveSettingsDebounced();
      renderLoraList();
    });

    $list.append($item);
  });
}

/**
 * 添加新的 Lora
 */
function addLora() {
  if (!settings.loras) {
    settings.loras = [];
  }
  settings.loras.push({ id: '', weight: 0.7 });
  saveSettingsDebounced();
  renderLoraList();
}

/**
 * 加载设置 (UI)
 */
async function loadSettings() {
  // 填充设置值
  $('#pixai_api_key').val(settings.apiKey);
  $('#pixai_model_id').val(settings.modelId);
  $('#pixai_sampling_method').val(settings.samplingMethod);
  $('#pixai_prompt_prefix').val(settings.promptPrefix);
  $('#pixai_negative_prompt').val(settings.negativePrompt);
  $('#pixai_use_lora').prop('checked', settings.useLora);
  $('#pixai_steps, #pixai_steps_value').val(settings.steps);
  $('#pixai_scale, #pixai_scale_value').val(settings.scale);
  $('#pixai_width, #pixai_width_value').val(settings.width);
  $('#pixai_height, #pixai_height_value').val(settings.height);

  // 渲染 Lora 列表
  renderLoraList();

  // 根据 useLora 显示/隐藏 Lora 设置
  if (settings.useLora) {
    $('#pixai_lora_settings').show();
  } else {
    $('#pixai_lora_settings').hide();
  }
}

/**
 * 注册斜杠命令
 */
function registerSlashCommand() {
  SlashCommandParser.addCommandObject(
    SlashCommand.fromProps({
      name: 'pixai',
      returns: '生成的图像',
      callback: async (args, trigger) => {
        const prompt = String(trigger).trim();
        if (!prompt) {
          toastr.error('提示词不能为空。', 'PixAI 错误');
          return '';
        }

        const negativePrompt = args.negative || settings.negativePrompt;
        const context = getContext();
        const characterName = context.characters[context.characterId]?.name || 'PixAI';

        const abortController = new AbortController();
        // TODO: 添加一个停止按钮来调用 abortController.abort()

        try {
          // 1. 调用 API
          const result = await generatePixaiImage(prompt, negativePrompt, args, abortController.signal);

          if (!result.data) {
            throw new Error('API 未返回图像数据。');
          }

          // 2. 保存图像文件
          const filename = `${characterName}_${humanizedDateTime()}`;
          const imagePath = await saveBase64AsFile(result.data, characterName, filename, result.format);

          // 3. 在聊天中显示
          const markdownImage = `![PixAI Image: ${prompt}](${imagePath})`;
          await addChatMessage(`(PixAI 正在为“${prompt}”生成图像...)\n${markdownImage}`, true);

          toastr.success('图像生成完毕！', 'PixAI');
          return imagePath; // 返回路径给斜杠命令
        } catch (error) {
          console.error('[PixAI 错误]', error);
          toastr.error(`PixAI 失败: ${error.message}`, 'PixAI 错误');
          await addChatMessage(`[PixAI 错误]\n${error.message}`, true);
          return ''; // 返回空字符串表示失败
        }
      },
      aliases: ['pix'],
      namedArgumentList: [
        new SlashCommandNamedArgument('negative', '负面提示词', [ARGUMENT_TYPE.STRING], false),
        new SlashCommandNamedArgument('width', '宽度', [ARGUMENT_TYPE.NUMBER], false),
        new SlashCommandNamedArgument('height', '高度', [ARGUMENT_TYPE.NUMBER], false),
        new SlashCommandNamedArgument('steps', '步数', [ARGUMENT_TYPE.NUMBER], false),
        new SlashCommandNamedArgument('scale', 'CFG Scale', [ARGUMENT_TYPE.NUMBER], false),
        new SlashCommandNamedArgument('modelId', '模型ID', [ARGUMENT_TYPE.STRING], false),
        new SlashCommandNamedArgument('loraId', 'Lora ID', [ARGUMENT_TYPE.STRING], false),
      ],
      unnamedArgumentList: [
        new SlashCommandArgument('prompt', [ARGUMENT_TYPE.STRING], true, true), // true = 必需, true = 接受剩余文本
      ],
      helpString:
        '使用 PixAI 生成图像。用法: /pixai [提示词] --negative [负面提示词] --width [宽度] --height [高度] --steps [步数] --scale [CFG Scale]',
    }),
  );
}

/**
 * 拓展加载时运行
 */
jQuery(async () => {
  // 1. 加载设置模板
  const settingsHtml = await renderExtensionTemplateAsync(TEMPLATE_PATH, 'settings', defaultSettings);
  $('#extensions_settings').append(settingsHtml);

  // 2. 绑定代理服务器控制按钮
  $('#pixai_check_proxy').on('click', async () => {
    toastr.info('正在检查代理服务器状态...', 'PixAI');
    await checkProxyStatus();
  });

  $('#pixai_start_proxy').on('click', async () => {
    await startProxyServer();
  });

  // 3. 初始检查代理服务器状态
  setTimeout(() => {
    checkProxyStatus();
  }, 1000);

  // 4. 绑定设置事件监听
  $('#pixai_api_key').on('input', () => {
    settings.apiKey = String($('#pixai_api_key').val());
    saveSettingsDebounced();
  });
  $('#pixai_model_id').on('input', () => {
    settings.modelId = $('#pixai_model_id').val();
    saveSettingsDebounced();
  });
  $('#pixai_sampling_method').on('change', () => {
    settings.samplingMethod = $('#pixai_sampling_method').val();
    saveSettingsDebounced();
  });
  $('#pixai_prompt_prefix').on('input', () => {
    settings.promptPrefix = $('#pixai_prompt_prefix').val();
    saveSettingsDebounced();
  });
  $('#pixai_negative_prompt').on('input', async function () {
    settings.negativePrompt = $(this).val();
    saveSettingsDebounced();
    if (!CSS.supports('field-sizing', 'content')) {
      const { resetScrollHeight } = await import('../../../../utils.js'); // 修正为4层路径
      await resetScrollHeight($(this));
    }
  });
  $('#pixai_use_lora').on('change', () => {
    settings.useLora = $('#pixai_use_lora').prop('checked');
    // 显示/隐藏 Lora 设置
    if (settings.useLora) {
      $('#pixai_lora_settings').slideDown(200);
    } else {
      $('#pixai_lora_settings').slideUp(200);
    }
    saveSettingsDebounced();
  });
  // 绑定添加 Lora 按钮
  $('#pixai_add_lora').on('click', () => {
    addLora();
  });
  $('#pixai_steps').on('input', () => {
    settings.steps = Number($('#pixai_steps').val());
    $('#pixai_steps_value').val(settings.steps);
    saveSettingsDebounced();
  });
  $('#pixai_scale').on('input', () => {
    settings.scale = Number($('#pixai_scale').val());
    $('#pixai_scale_value').val(settings.scale.toFixed(1));
    saveSettingsDebounced();
  });
  $('#pixai_width').on('input', () => {
    settings.width = Number($('#pixai_width').val());
    $('#pixai_width_value').val(settings.width);
    saveSettingsDebounced();
  });
  $('#pixai_height').on('input', () => {
    settings.height = Number($('#pixai_height').val());
    $('#pixai_height_value').val(settings.height);
    saveSettingsDebounced();
  });

  // 3. 注册斜杠命令
  registerSlashCommand();

  // 4. 加载保存的设置值
  await loadSettings();

  console.log('[PixAI] Extension loaded.');
});
