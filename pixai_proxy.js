/**
 * PixAI API 代理服务器 (Node.js 版本)
 * 用于绕过浏览器 CORS 限制
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 5555;
const PIXAI_API_BASE = 'https://api.pixai.art';

/**
 * 解析请求体
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

/**
 * 转发请求到 PixAI API
 */
function proxyRequest(path, method, headers, body, res) {
  // The client sends the token in 'x-api-key'. The API expects 'Authorization: Bearer <token>'.
  // We'll check both 'x-api-key' and 'authorization' for robustness.
  const apiToken = headers['x-api-key'] || headers['authorization'];

  const options = {
    hostname: 'api.pixai.art',
    port: 443,
    path: path,
    method: method,
    headers: {
      'Content-Type': 'application/json',
      // Format the header as "Bearer <token>" if the token exists.
      // Also, remove "Bearer " from the token if it's already there to avoid "Bearer Bearer ...".
      'Authorization': apiToken ? `Bearer ${apiToken.replace(/^Bearer\s+/, '')}` : '',
      'User-Agent': 'SillyTavern-PixAI-Extension/1.0',
    },
  };

  const proxyReq = https.request(options, proxyRes => {
    let data = '';

    proxyRes.on('data', chunk => {
      data += chunk;
    });

    proxyRes.on('end', () => {
      // 设置 CORS 头
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      res.end(data);
    });
  });

  proxyReq.on('error', error => {
    console.error('代理请求错误:', error);
    res.writeHead(500, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ error: error.message }));
  });

  if (body && Object.keys(body).length > 0) {
    proxyReq.write(JSON.stringify(body));
  }
  proxyReq.end();
}

/**
 * 创建 HTTP 服务器
 */
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // 处理 OPTIONS 预检请求
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    });
    res.end();
    return;
  }

  // 健康检查端点
  if (path === '/health') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ status: 'ok', message: 'PixAI Proxy is running' }));
    return;
  }

  // 转发到 PixAI API - 支持 /pixai/* 和 /v1/* 路径
  let apiPath = path;

  // 将 /pixai/* 转换为 /v1/*
  if (path.startsWith('/pixai/')) {
    apiPath = path.replace('/pixai/', '/v1/');
  }

  if (path.startsWith('/v1/') || path.startsWith('/pixai/')) {
    try {
      const body = await parseBody(req);
      console.log(`[${new Date().toISOString()}] ${method} ${path} -> ${apiPath}`);
      proxyRequest(apiPath, method, req.headers, body, res);
    } catch (error) {
      console.error('解析请求体错误:', error);
      res.writeHead(400, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ error: 'Invalid request body' }));
    }
    return;
  }

  // 404
  res.writeHead(404, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// 启动服务器
server.listen(PORT, '127.0.0.1', () => {
  console.log('========================================');
  console.log('  PixAI API 代理服务器已启动');
  console.log('========================================');
  console.log(`  监听地址: http://127.0.0.1:${PORT}`);
  console.log(`  健康检查: http://127.0.0.1:${PORT}/health`);
  console.log('========================================');
  console.log('  按 Ctrl+C 停止服务器');
  console.log('========================================\n');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});
