#!/usr/bin/env python3
"""
PixAI API 代理服务器
用于解决浏览器 CORS 限制问题
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import sys

app = Flask(__name__)
CORS(app)  # 允许所有来源的跨域请求

PIXAI_API_BASE = "https://api.pixai.art/v1"

@app.route('/pixai/task', methods=['POST', 'OPTIONS'])
def create_task():
    """创建 PixAI 任务"""
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        # 从请求中获取数据
        data = request.get_json()
        api_key = request.headers.get('X-API-Key')
        
        if not api_key:
            return jsonify({'error': 'Missing API key'}), 401
        
        # 转发请求到 PixAI API
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            f'{PIXAI_API_BASE}/task',
            headers=headers,
            json=data,
            timeout=30
        )
        
        return jsonify(response.json()), response.status_code
        
    except Exception as e:
        print(f"Error in create_task: {e}", file=sys.stderr)
        return jsonify({'error': str(e)}), 500


@app.route('/pixai/task/<task_id>', methods=['GET', 'OPTIONS'])
def get_task(task_id):
    """获取任务状态"""
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        api_key = request.headers.get('X-API-Key')
        
        if not api_key:
            return jsonify({'error': 'Missing API key'}), 401
        
        headers = {
            'Authorization': f'Bearer {api_key}'
        }
        
        response = requests.get(
            f'{PIXAI_API_BASE}/task/{task_id}',
            headers=headers,
            timeout=30
        )
        
        return jsonify(response.json()), response.status_code
        
    except Exception as e:
        print(f"Error in get_task: {e}", file=sys.stderr)
        return jsonify({'error': str(e)}), 500


@app.route('/pixai/media/<path:media_url>', methods=['GET', 'OPTIONS'])
def get_media(media_url):
    """获取图片（转换为 base64）"""
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        # 下载图片
        response = requests.get(media_url, timeout=30)
        
        if response.status_code == 200:
            import base64
            base64_data = base64.b64encode(response.content).decode('utf-8')
            return jsonify({
                'data': base64_data,
                'format': 'png'
            })
        else:
            return jsonify({'error': 'Failed to download image'}), response.status_code
            
    except Exception as e:
        print(f"Error in get_media: {e}", file=sys.stderr)
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("=" * 60)
    print("🚀 PixAI 代理服务器启动中...")
    print("=" * 60)
    print("监听地址: http://127.0.0.1:5555")
    print("按 Ctrl+C 停止服务器")
    print("=" * 60)
    
    app.run(host='127.0.0.1', port=5555, debug=False)

