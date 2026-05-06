const WebSocket = require('ws');

const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 10000;
const AUTH_TIMEOUT = 30000;
const MAX_CONNECTIONS = 1000;

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Map();
    this.heartbeatTimer = null;
  }

  attach(server) {
    this.wss = new WebSocket.Server({
      server,
      path: '/ws',
      verifyClient: (info, callback) => {
        if (this.clients.size >= MAX_CONNECTIONS) {
          callback(false, 429, 'Too many connections');
          return;
        }
        callback(true);
      }
    });

    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const clientInfo = {
        ws,
        userId: null,
        authenticated: false,
        subscriptions: new Set(),
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        connectedAt: new Date(),
        lastPing: Date.now(),
        isAlive: true
      };

      this.clients.set(clientId, clientInfo);
      console.log(`[WS] 新连接: ${clientId} (IP: ${clientInfo.ip}), 当前在线: ${this.clients.size}`);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          clientInfo.lastPing = Date.now();
          this.handleMessage(clientId, message);
        } catch (err) {
          console.error(`[WS] 消息解析失败:`, err.message);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`[WS] 连接关闭: ${clientId}, 当前在线: ${this.clients.size}`);
      });

      ws.on('error', (err) => {
        console.error(`[WS] 连接错误 ${clientId}:`, err.message);
        this.clients.delete(clientId);
      });

      ws.on('pong', () => {
        clientInfo.isAlive = true;
        clientInfo.lastPing = Date.now();
      });

      this.sendToClient(clientId, {
        type: 'connected',
        clientId,
        message: 'WebSocket连接已建立，请尽快完成认证'
      });

      setTimeout(() => {
        if (this.clients.has(clientId) && !clientInfo.authenticated) {
          this.sendToClient(clientId, {
            type: 'auth_timeout',
            message: '认证超时，连接即将关闭'
          });
          setTimeout(() => {
            if (this.clients.has(clientId) && !clientInfo.authenticated) {
              ws.close(4001, 'Authentication timeout');
            }
          }, 3000);
        }
      }, AUTH_TIMEOUT);
    });

    this.startHeartbeat();

    console.log('[WS] WebSocket服务已启动，路径: /ws');
  }

  startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    this.heartbeatTimer = setInterval(() => {
      this.clients.forEach((clientInfo, clientId) => {
        if (!clientInfo.isAlive) {
          console.log(`[WS] 心跳超时，断开: ${clientId}`);
          clientInfo.ws.terminate();
          this.clients.delete(clientId);
          return;
        }

        const timeSinceLastPing = Date.now() - clientInfo.lastPing;
        if (timeSinceLastPing > HEARTBEAT_INTERVAL + HEARTBEAT_TIMEOUT) {
          clientInfo.isAlive = false;
        }

        if (clientInfo.ws.readyState === WebSocket.OPEN) {
          clientInfo.ws.ping();
        }
      });
    }, HEARTBEAT_INTERVAL);
  }

  handleMessage(clientId, message) {
    const clientInfo = this.clients.get(clientId);
    if (!clientInfo) return;

    switch (message.type) {
      case 'auth':
        this.handleAuth(clientId, message);
        break;
      case 'subscribe':
        if (!clientInfo.authenticated && !clientInfo.userId) {
          this.sendToClient(clientId, { type: 'error', message: '请先完成认证' });
          return;
        }
        this.handleSubscribe(clientId, message);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(clientId, message);
        break;
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
        break;
      default:
        console.log(`[WS] 未知消息类型: ${message.type}`);
    }
  }

  handleAuth(clientId, message) {
    const clientInfo = this.clients.get(clientId);
    if (!clientInfo) return;

    const { userId, token } = message;

    if (token) {
      try {
        const { verifyToken } = require('../middleware/auth');
        const decoded = verifyToken(token);
        clientInfo.userId = decoded.userId || decoded.id;
        clientInfo.authenticated = true;
        console.log(`[WS] 用户认证成功: ${clientInfo.userId} (客户端: ${clientId})`);

        this.sendToClient(clientId, {
          type: 'auth_success',
          message: '认证成功',
          userId: clientInfo.userId
        });
      } catch (err) {
        console.warn(`[WS] Token验证失败: ${err.message}`);
        this.sendToClient(clientId, {
          type: 'auth_failed',
          message: 'Token无效或已过期'
        });
      }
    } else if (userId) {
      clientInfo.userId = userId;
      clientInfo.authenticated = false;
      console.log(`[WS] 用户标识(未验证): ${userId} (客户端: ${clientId})`);

      this.sendToClient(clientId, {
        type: 'auth_success',
        message: '已关联用户(未验证Token)',
        userId
      });
    } else {
      this.sendToClient(clientId, {
        type: 'auth_failed',
        message: '认证失败，缺少token或userId'
      });
    }
  }

  handleSubscribe(clientId, message) {
    const clientInfo = this.clients.get(clientId);
    if (!clientInfo) return;

    const { taskId, channel } = message;

    if (taskId) {
      clientInfo.subscriptions.add(`task:${taskId}`);
      console.log(`[WS] 客户端 ${clientId} 订阅任务: ${taskId}`);
    }

    if (channel) {
      clientInfo.subscriptions.add(`channel:${channel}`);
      console.log(`[WS] 客户端 ${clientId} 订阅频道: ${channel}`);
    }

    this.sendToClient(clientId, {
      type: 'subscribed',
      taskId,
      channel
    });
  }

  handleUnsubscribe(clientId, message) {
    const clientInfo = this.clients.get(clientId);
    if (!clientInfo) return;

    const { taskId, channel } = message;

    if (taskId) {
      clientInfo.subscriptions.delete(`task:${taskId}`);
    }

    if (channel) {
      clientInfo.subscriptions.delete(`channel:${channel}`);
    }

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      taskId,
      channel
    });
  }

  broadcastTaskUpdate(taskId, data) {
    const topic = `task:${taskId}`;
    let sentCount = 0;

    this.clients.forEach((clientInfo, clientId) => {
      const hasSubscription = clientInfo.subscriptions.has(topic) || clientInfo.subscriptions.has('channel:tasks');
      if (hasSubscription) {
        this.sendToClient(clientId, {
          type: 'task_update',
          taskId,
          ...data
        });
        sentCount++;
      }
    });

    console.log(`[WS] 广播任务更新: ${taskId}, topic: ${topic}, 在线客户端: ${this.clients.size}, 推送至: ${sentCount} 个客户端`);
  }

  broadcastToUser(userId, data) {
    let sentCount = 0;

    this.clients.forEach((clientInfo, clientId) => {
      if (clientInfo.userId === userId) {
        this.sendToClient(clientId, data);
        sentCount++;
      }
    });

    return sentCount;
  }

  broadcastToAll(data) {
    this.clients.forEach((clientInfo, clientId) => {
      this.sendToClient(clientId, data);
    });
  }

  sendToClient(clientId, data) {
    const clientInfo = this.clients.get(clientId);
    if (!clientInfo || clientInfo.ws.readyState !== WebSocket.OPEN) return;

    try {
      clientInfo.ws.send(JSON.stringify(data));
    } catch (err) {
      console.error(`[WS] 发送消息失败 ${clientId}:`, err.message);
    }
  }

  getOnlineCount() {
    return this.clients.size;
  }

  getAuthenticatedCount() {
    let count = 0;
    this.clients.forEach(info => { if (info.authenticated) count++; });
    return count;
  }

  getUserOnlineClients(userId) {
    const clients = [];
    this.clients.forEach((clientInfo, clientId) => {
      if (clientInfo.userId === userId) {
        clients.push({ clientId, connectedAt: clientInfo.connectedAt, authenticated: clientInfo.authenticated });
      }
    });
    return clients;
  }

  generateClientId() {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  shutdown() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.clients.forEach((clientInfo, clientId) => {
      clientInfo.ws.close(1001, 'Server shutting down');
    });
    this.clients.clear();
    if (this.wss) this.wss.close();
  }
}

module.exports = new WebSocketManager();
