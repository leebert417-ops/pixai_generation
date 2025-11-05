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
const EXTENSION_NAME = 'PixAI Generation';

// 默认设置
const defaultSettings = {
  apiKey: '', // API 密钥存储在扩展设置中
  modelId: '1648918127446573124',
  loraId: '',
  loraWeight: 0.7,
  negativePrompt:
    'worst quality, large head, low quality, extra digits, bad eye, EasyNegativeV2, ng_deepnegative_v1_75t',
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

// API 端点
const PIXAI_API_BASE = 'https://api.pixai.art/v1';
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

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 2. 合并设置和覆盖参数
  const finalParams = {
    modelId: overrides.modelId || settings.modelId,
    loraId: overrides.loraId || settings.loraId,
    loraWeight: overrides.loraWeight || settings.loraWeight,
    steps: overrides.steps || settings.steps,
    scale: overrides.scale || settings.scale,
    width: overrides.width || settings.width,
    height: overrides.height || settings.height,
    negativePrompt: negativePrompt || settings.negativePrompt,
    // PixAI 支持的采样器，这里我们硬编码一个，或者允许覆盖
    samplingMethod: overrides.sampler || 'DPM++ 2M Karras',
  };

  // 3. 构建 Lora (如果 Lora ID 存在)
  const loraPayload = {};
  if (finalParams.loraId) {
    loraPayload[finalParams.loraId] = finalParams.loraWeight;
  }

  // 4. 构建请求体 (基于您提供的官方示例结构)
  const taskPayload = {
    parameters: {
      prompts: prompt,
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
  const createResponse = await fetch(`${PIXAI_API_BASE}/task`, {
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

    const statusResponse = await fetch(`${PIXAI_API_BASE}/task/${taskId}`, {
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
      // 3. 获取图像 URL (基于您提供的官方示例结构)
      const mediaUrls = statusData.outputs?.mediaUrls || [];
      if (mediaUrls.length > 0) {
        const imageUrl = mediaUrls[0];
        console.log(`[PixAI] 图像 URL: ${imageUrl}`);

        // --- 步骤 4: 使用 SillyTavern 的后端下载图像 ---
        toastr.info('正在下载图像...', 'PixAI');

        // 使用 SillyTavern 的 /api/content/importURL 端点下载图片
        const importResponse = await fetch('/api/content/importURL', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: imageUrl }),
          signal: signal,
        });

        if (!importResponse.ok) {
          throw new Error(`无法下载图像: ${importResponse.statusText}`);
        }

        const importData = await importResponse.json();

        // importURL 返回的是文件路径，我们需要读取文件内容
        // 但更简单的方法是直接使用返回的 base64 数据（如果有）
        if (importData.path) {
          // 读取文件并转换为 base64
          const fileResponse = await fetch(importData.path);
          const fileBlob = await fileResponse.blob();
          const base64DataUrl = await getBase64Async(fileBlob);

          return {
            format: 'png',
            data: base64DataUrl.split(',')[1],
          };
        } else {
          throw new Error('下载图像失败：未返回文件路径');
        }
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
 * 加载设置 (UI)
 */
async function loadSettings() {
  // 填充设置值
  $('#pixai_api_key').val(settings.apiKey);
  $('#pixai_model_id').val(settings.modelId);
  $('#pixai_lora_id').val(settings.loraId);
  $('#pixai_lora_weight').val(settings.loraWeight);
  $('#pixai_negative_prompt').val(settings.negativePrompt);
  $('#pixai_steps, #pixai_steps_value').val(settings.steps);
  $('#pixai_scale, #pixai_scale_value').val(settings.scale);
  $('#pixai_width, #pixai_width_value').val(settings.width);
  $('#pixai_height, #pixai_height_value').val(settings.height);
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

  // 2. 绑定设置事件监听
  $('#pixai_api_key').on('input', () => {
    settings.apiKey = String($('#pixai_api_key').val());
    saveSettingsDebounced();
  });
  $('#pixai_model_id').on('input', () => {
    settings.modelId = $('#pixai_model_id').val();
    saveSettingsDebounced();
  });
  $('#pixai_lora_id').on('input', () => {
    settings.loraId = $('#pixai_lora_id').val();
    saveSettingsDebounced();
  });
  $('#pixai_lora_weight').on('input', () => {
    settings.loraWeight = Number($('#pixai_lora_weight').val());
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

  // 调试信息
  console.log('[PixAI] Extension loaded.');
  console.log('[PixAI] API Key set:', !!settings.apiKey);

  // 添加一个测试命令来检查密钥
  SlashCommandParser.addCommandObject(
    SlashCommand.fromProps({
      name: 'pixai-test-key',
      callback: () => {
        const key = getPixaiApiKey();
        if (key) {
          console.log('[PixAI] API Key exists. Length:', key.length);
          console.log('[PixAI] First 10 chars:', key.substring(0, 10) + '...');
          toastr.success(`API 密钥已设置（长度: ${key.length}）`, 'PixAI 测试');
        } else {
          console.log('[PixAI] API Key NOT set');
          toastr.error('API 密钥未设置', 'PixAI 测试');
        }
        return key ? 'Key is set' : 'Key is NOT set';
      },
      helpString: '测试 PixAI API 密钥是否已设置',
    }),
  );
});
