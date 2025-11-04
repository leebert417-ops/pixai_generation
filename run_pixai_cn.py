import requests
import time
import sys
import json

def generate_image_basic(api_token, prompt):
    """
    使用 PixAI API 创建一个基本的图像生成任务
    (基于您提供的 "parameters" 嵌套结构)
    
    Args:
        api_token (str): PixAI 的 API 令牌
        prompt (str): 用于图像生成的提示词
    
    Returns:
        dict: API 响应（任务信息）或 None
    """
    
    # API 端点
    url = "https://api.pixai.art/v1/task"
    
    # 请求头
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    # 请求体 (按照您提供的 "parameters" 嵌套格式)
    data = {
        "parameters": {
            "prompts": prompt,
            "negativePrompts": "worst quality, large head, low quality, extra digits, bad eye, EasyNegativeV2, ng_deepnegative_v1_75t",
            
            # ⚠️ 请在此处指定您想使用的模型 ID
            "modelId": "1648918127446573124", 
            
            "width": 512,
            "height": 768,
            "samplingSteps": 20,
            "samplingMethod": "DPM++ 2M Karras",
            "cfgScale": 6.0,
            "batchSize": 1,
            
            # ⚠️ Lora 指定格式 (ID: 权重 的字典形式)
            "lora": { 
                "1744880666293972790": 0.7 
            }
        }
    }
    
    print("🚀 正在创建任务...")
    # 用于调试: 打印发送的 JSON 数据
    # print(f"发送数据: {json.dumps(data, indent=2, ensure_ascii=False)}") 
    
    try:
        # 发送 API 请求
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()  # 如果有 HTTP 错误则抛出异常
        
        return response.json()
    
    except requests.exceptions.HTTPError as http_err:
        print(f"❌ HTTP 错误 (创建任务): {http_err}")
        print(f"   详情: {response.text}")
        if response.status_code == 401:
            print("   (错误 401: 未授权。请检查您的 API 令牌是否正确。)")
    except requests.exceptions.RequestException as e:
        print(f"❌ API 请求错误 (创建任务): {e}")
        
    return None

def check_task_status(api_token, task_id):
    """
    检查图像生成任务的状态
    """
    url = f"https://api.pixai.art/v1/task/{task_id}"
    headers = {
        "Authorization": f"Bearer {api_token}"
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        return response.json()
    
    except requests.exceptions.RequestException as e:
        print(f"❌ 状态检查错误: {e}")
        return None

def wait_for_completion(api_token, task_id, poll_interval=10, max_wait_time=300):
    """
    等待任务完成（轮询）
    """
    start_time = time.time()
    
    print(f"\n🔄 正在等待任务 (ID: {task_id}) 完成... (最多{max_wait_time}秒)")
    
    while time.time() - start_time < max_wait_time:
        task_info = check_task_status(api_token, task_id)
        
        if task_info is None:
            return None # 检查状态时出错，终止等待
        
        status = task_info.get("status")
        print(f"   ... 当前状态: {status}")
        
        if status == "completed":
            print("\n✅ 图像生成已完成！")
            return task_info
        elif status in ["failed", "cancelled"]:
            print(f"❌ 任务状态变为 {status}，处理终止。")
            print(f"   详情: {task_info.get('error', '未知详情')}")
            return task_info
        elif status == "processing":
            print("   ... 正在处理中。")
        elif status == "pending":
            print("   ... 正在排队中。")
            
        # 等待 N 秒后再次检查状态
        time.sleep(poll_interval)
    
    print(f"❌ 已超时。任务未在 {max_wait_time} 秒内完成。")
    return None

# --- 主执行模块 ---
if __name__ == "__main__":
    
    # ⚠️ 警告: 请将 'your_api_token_here' 替换为您自己的有效 API 令牌
    API_TOKEN = "sk-1KNX1wFgQTiafoSaTJPhkVwMXyuDlsvs/nleD84kVNA0emq2" 
    
    if API_TOKEN == "your_api_token_here":
        print("======================================================================")
        print("🛑 错误: 未设置 API 令牌。")
        print("   请将脚本中的 'your_api_token_here' 部分，")
        print("   替换为您自己的 PixAI API 令牌后再运行。")
        print("======================================================================")
        sys.exit(1) # 退出脚本
    
    # 想要生成的图像的提示词
    prompt = "1girl, solo, masterpiece, best quality, very detailed, white hair, blue eyes, smile"
    
    print("开始图像生成任务...")
    
    # 1. 创建图像生成任务
    task_creation_result = generate_image_basic(API_TOKEN, prompt)
    
    if task_creation_result:
        task_id = task_creation_result.get("id")
        
        if not task_id:
            print("❌ 获取任务 ID 失败。")
            print(f"响应内容: {task_creation_result}")
        else:
            print(f"✅ 任务创建成功。Task ID: {task_id}")
            
            # 2. 等待任务完成
            completed_task = wait_for_completion(API_TOKEN, task_id)
            
            # 3. 显示结果 (基于您提供的 'outputs.mediaUrls' 响应结构)
            if completed_task and completed_task.get("status") == "completed":
                
                # 从完成响应中查找 'outputs' -> 'mediaUrls'
                media_urls = completed_task.get("outputs", {}).get("mediaUrls", [])
                
                if media_urls:
                    print("\n========================================================")
                    print("🎉 成功！生成图像的 URL 如下:")
                    for i, url in enumerate(media_urls, 1):
                        print(f"   {i}. {url}")
                    print("========================================================")
                else:
                    print("❌ 任务已完成，但未找到图像 URL。")
                    print("   (可能是响应结构不匹配)")
                    # 打印完整的响应以便调试
                    print(f"   完整响应: {json.dumps(completed_task, indent=2, ensure_ascii=False)}")
            else:
                print("\n========================================================")
                print("ℹ️ 任务未成功完成或已失败。")
                print("========================================================")