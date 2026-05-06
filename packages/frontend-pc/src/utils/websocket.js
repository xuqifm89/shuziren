class TaskWebSocket {
  constructor() {
    this.ws = null;
    this.clientId = null;
    this.userId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 3000;
    this.heartbeatInterval = null;
    this.subscriptions = new Set();
    this.listeners = new Map();
    this.isConnected = false;
    this.isConnecting = false;
  }

  getWsUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }

  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    const wsUrl = this.getWsUrl();
    console.log(`[WS] 正在连接: ${wsUrl}`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WS] 连接成功');
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        this.startHeartbeat();

        if (this.userId) {
          this.authenticate(this.userId);
        }

        this.subscriptions.forEach(topic => {
          if (topic.startsWith('task:')) {
            const taskId = topic.replace('task:', '');
            this._send({ type: 'subscribe', taskId });
          } else if (topic.startsWith('channel:')) {
            const channel = topic.replace('channel:', '');
            this._send({ type: 'subscribe', channel });
          }
        });

        this._emit('connected', { clientId: this.clientId });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this._handleMessage(data);
        } catch (err) {
          console.error('[WS] 消息解析失败:', err);
        }
      };

      this.ws.onclose = (event) => {
        console.log('[WS] 连接关闭:', event.code, event.reason);
        this.isConnected = false;
        this.isConnecting = false;
        this.stopHeartbeat();
        this._emit('disconnected', { code: event.code });

        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this._scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WS] 连接错误:', error);
        this.isConnecting = false;
        this._emit('error', { error });
      };
    } catch (err) {
      console.error('[WS] 创建连接失败:', err);
      this.isConnecting = false;
      this._scheduleReconnect();
    }
  }

  disconnect() {
    this.stopHeartbeat();
    this.reconnectAttempts = this.maxReconnectAttempts;

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.isConnected = false;
  }

  authenticate(userId) {
    this.userId = userId;
    const token = localStorage.getItem('token') || '';
    this._send({ type: 'auth', userId, token });
  }

  subscribeTask(taskId) {
    this.subscriptions.add(`task:${taskId}`);
    this._send({ type: 'subscribe', taskId });
  }

  unsubscribeTask(taskId) {
    this.subscriptions.delete(`task:${taskId}`);
    this._send({ type: 'unsubscribe', taskId });
  }

  subscribeChannel(channel) {
    this.subscriptions.add(`channel:${channel}`);
    this._send({ type: 'subscribe', channel });
  }

  unsubscribeChannel(channel) {
    this.subscriptions.delete(`channel:${channel}`);
    this._send({ type: 'unsubscribe', channel });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      if (callback) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      } else {
        this.listeners.delete(event);
      }
    }
  }

  _handleMessage(data) {
    switch (data.type) {
      case 'connected':
        this.clientId = data.clientId;
        console.log('[WS] 已连接，客户端ID:', data.clientId);
        break;

      case 'auth_success':
        console.log('[WS] 认证成功');
        break;

      case 'auth_failed':
        console.warn('[WS] 认证失败:', data.message);
        break;

      case 'subscribed':
        console.log('[WS] 订阅成功:', data.taskId || data.channel);
        break;

      case 'task_update':
        this._emit('task_update', {
          taskId: data.taskId,
          status: data.status,
          progress: data.progress,
          message: data.message,
          outputUrl: data.outputUrl,
          errorMessage: data.errorMessage,
          timestamp: data.timestamp
        });
        break;

      case 'pong':
        break;

      default:
        this._emit(data.type, data);
    }
  }

  _emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[WS] 事件处理错误 (${event}):`, err);
        }
      });
    }
  }

  _send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  _scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 5);
    console.log(`[WS] ${delay / 1000}秒后重连 (第${this.reconnectAttempts}次)...`);
    setTimeout(() => this.connect(), delay);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this._send({ type: 'ping' });
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      clientId: this.clientId,
      userId: this.userId,
      subscriptions: Array.from(this.subscriptions),
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

let instance = null;

export function getTaskWebSocket() {
  if (!instance) {
    instance = new TaskWebSocket();
  }
  return instance;
}

export default TaskWebSocket;
