//
// 修正版本：修复了因 "third-party" 文件夹导致的路径偏移
//

// 导入 SillyTavern 的核心功能
import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js'; // 路径从 ../../../ 变为 ../../../../
import { extension_settings, getContext, renderExtensionTemplateAsync } from '../../../extensions.js'; // 路径从 ../../ 变为 ../../../
import { t } from '../../../i18n.js'; // 路径从 ../../ 变为 ../../../
import { SECRET_KEYS, secret_state } from '../../../secrets.js'; // 路径从 ../../ 变为 ../../../
import { SlashCommand } from '../../../slash-commands/SlashCommand.js'; // 路径从 ../../ 变为 ../../../
import {
  ARGUMENT_TYPE,
  SlashCommandArgument,
  SlashCommandNamedArgument,
} from '../../../slash-commands/SlashCommandArgument.js'; // 路径从 ../../ 变为 ../../../
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js'; // 路径从 ../../ 变为 ../../../
import { getBase64Async, humanizedDateTime, saveBase64AsFile } from '../../../utils.js'; // 路径从 ../../ 变为 ../../../

// 定义拓展名称
const MODULE_NAME = 'pixai_generation';
const EXTENSION_NAME = 'PixAI Generation';

// 为 ST 的密钥管理器定义密钥名称
if (!SECRET_KEYS.PIXAI) {
  SECRET_KEYS.PIXAI = 'api_key_pixai';
}

// 默认设置
const defaultSettings = {
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
  const token = secret_state[SECRET_KEYS.PIXAI];
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
 * 加载设置 (UI)
 */
async function loadSettings() {
  // 填充设置值
  $('#pixai_model_id').val(settings.modelId);
  $('#pixai_lora_id').val(settings.loraId);
  $('#pixai_lora_weight').val(settings.loraWeight);
  $('#pixai_negative_prompt').val(settings.negativePrompt);
  $('#pixai_steps, #pixai_steps_value').val(settings.steps);
  $('#pixai_scale, #pixai_scale_value').val(settings.scale);
  $('#pixai_width, #pixai_width_value').val(settings.width);
  $('#pixai_height, #pixai_height_value').val(settings.height);

  // 更新 API 密钥按钮的状态
  $('#pixai_key').toggleClass('success', !!secret_state[SECRET_KEYS.PIXAI]);
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
      helpString: t('使用 PixAI 生成图像。\n用法: /pixai [提示词] --negative [负面提示词] --width [宽度] ...'),
    }),
  );
}

/**
 * 拓展加载时运行
 */
jQuery(async () => {
  // 1. 加载设置模板
  const settingsHtml = await renderExtensionTemplateAsync(MODULE_NAME, 'settings', defaultSettings);
  $('#extensions_settings').append(settingsHtml);

  // 2. 绑定设置事件监听
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

  // 5. 监听 API 密钥的变化
  eventSource.on(event_types.SECRET_WRITTEN, key => {
    if (key === SECRET_KEYS.PIXAI) {
      $('#pixai_key').addClass('success');
    }
  });
  eventSource.on(event_types.SECRET_DELETED, key => {
    if (key === SECRET_KEYS.PIXAI) {
      $('#pixai_key').removeClass('success');
    }
  });
});
