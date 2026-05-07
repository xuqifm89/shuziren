const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const userRepository = require('../repositories/UserRepository');
const { auditLog, AUDIT_ACTIONS } = require('../middleware/auditLogger');
const { generateToken } = require('../middleware/auth');
const { requireRole, requirePermission, getRolePermissions } = require('../middleware/rbac');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const fileService = require('../services/fileService');
const { authLimiter, uploadLimiter } = require('../middleware/rateLimiter');
const { loginRules, registerRules, updateUserRules, changePasswordRules } = require('../middleware/validators');

const avatarsDir = path.join(__dirname, '..', 'assets', 'avatars');
fileService.ensureDir(avatarsDir);

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, 'avatar-' + Date.now() + ext);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG、PNG、GIF、WEBP 格式图片'));
    }
  }
});

router.post('/:id/avatar', authMiddleware, uploadLimiter, avatarUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择图片文件' });
    }

    const avatarUrl = `/assets/avatars/${req.file.filename}`;
    const user = await userRepository.update(req.params.id, { avatar: avatarUrl });

    if (user) {
      const userResponse = user.toJSON();
      delete userResponse.password;
      res.json({ ...userResponse, avatarUrl });
    } else {
      fileService.deleteFile(req.file.path);
      res.status(404).json({ error: '用户不存在' });
    }
  } catch (error) {
    if (req.file && fileService.fileExists(req.file.path)) {
      fileService.deleteFile(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

router.post('/register', authLimiter, registerRules, async (req, res) => {
  try {
    const { username, password, phone, nickname, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const existingUser = await userRepository.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    if (email) {
      const existingEmail = await userRepository.findByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: '邮箱已被使用' });
      }
    }

    if (phone) {
      const existingPhone = await userRepository.findByPhone(phone);
      if (existingPhone) {
        return res.status(400).json({ error: '手机号已被使用' });
      }
    }

    const user = await userRepository.create({
      username,
      password,
      phone,
      nickname: nickname || username,
      email,
      role: 'user',
      lightParticles: 100
    });

    const userResponse = user.toJSON();
    delete userResponse.password;

    const token = generateToken(userResponse);

    res.status(201).json({
      ...userResponse,
      token,
      permissions: getRolePermissions('user')
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: '注册服务暂时不可用，请稍后重试' });
  }
});

router.post('/login', authLimiter, loginRules, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    let user = await userRepository.findByUsername(username);
    if (!user) {
      user = await userRepository.findByEmail(username);
    }
    
    if (!user) {
      auditLog({ username, action: AUDIT_ACTIONS.LOGIN_FAILED, resource: 'user', details: { reason: 'user_not_found' }, ip: req.ip, userAgent: req.headers['user-agent'], statusCode: 401, success: false }).catch(() => {});
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const isValidPassword = await userRepository.verifyPassword(password, user.password);
    if (!isValidPassword) {
      auditLog({ userId: user.id, username, action: AUDIT_ACTIONS.LOGIN_FAILED, resource: 'user', details: { reason: 'wrong_password' }, ip: req.ip, userAgent: req.headers['user-agent'], statusCode: 401, success: false }).catch(() => {});
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({ error: '账号已被禁用' });
    }

    await userRepository.updateLastLogin(user.id).catch(err => console.warn('更新登录时间失败:', err.message));

    const userResponse = user.toJSON();
    delete userResponse.password;

    const token = generateToken(userResponse);

    auditLog({ userId: user.id, username, action: AUDIT_ACTIONS.LOGIN, resource: 'user', ip: req.ip, userAgent: req.headers['user-agent'], statusCode: 200, success: true }).catch(() => {});

    res.json({
      ...userResponse,
      token,
      permissions: getRolePermissions(userResponse.role || 'user')
    });
  } catch (error) {
    console.error('Login error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: '登录服务暂时不可用，请稍后重试' });
  }
});

router.post('/wechat-login', authLimiter, async (req, res) => {
  try {
    const { code, nickName, avatarUrl, gender } = req.body;

    if (!code) {
      return res.status(400).json({ error: '缺少微信授权码' });
    }

    let wechatUser;
    try {
      const axios = require('axios');
      const appId = process.env.WX_APPID || '';
      const appSecret = process.env.WX_APPSECRET || '';

      if (!appId || !appSecret) {
        const virtualOpenId = 'wx_' + code.substring(0, 16);
        let user = await userRepository.findByUsername(virtualOpenId);
        if (!user) {
          user = await userRepository.create({
            username: virtualOpenId,
            password: Math.random().toString(36).substring(2, 15),
            nickname: nickName || '微信用户',
            avatar: avatarUrl || '',
            role: 'user',
            lightParticles: 100,
            wechatOpenId: virtualOpenId
          });
        } else {
          if (nickName) user = await userRepository.update(user.id, { nickname: nickName, avatar: avatarUrl || user.avatar });
        }
        const userResponse = user.toJSON();
        delete userResponse.password;
        const token = generateToken(userResponse);
        auditLog({ userId: user.id, username: virtualOpenId, action: AUDIT_ACTIONS.LOGIN, resource: 'user', details: { method: 'wechat' }, ip: req.ip, userAgent: req.headers['user-agent'], statusCode: 200, success: true });
        return res.json({ ...userResponse, token, permissions: getRolePermissions(userResponse.role || 'user') });
      }

      const wxRes = await axios.get(`https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`);
      wechatUser = wxRes.data;

      if (wechatUser.errcode) {
        return res.status(400).json({ error: '微信登录失败: ' + wechatUser.errmsg });
      }

      const openId = wechatUser.openid;
      let user = await userRepository.findByWechatOpenId(openId);

      if (!user) {
        user = await userRepository.create({
          username: 'wx_' + openId.substring(0, 16),
          password: Math.random().toString(36).substring(2, 15),
          nickname: nickName || '微信用户',
          avatar: avatarUrl || '',
          role: 'user',
          lightParticles: 100,
          wechatOpenId: openId
        });
      } else {
        if (nickName) user = await userRepository.update(user.id, { nickname: nickName, avatar: avatarUrl || user.avatar });
      }

      await userRepository.updateLastLogin(user.id);
      const userResponse = user.toJSON();
      delete userResponse.password;
      const token = generateToken(userResponse);
      auditLog({ userId: user.id, username: user.username, action: AUDIT_ACTIONS.LOGIN, resource: 'user', details: { method: 'wechat' }, ip: req.ip, userAgent: req.headers['user-agent'], statusCode: 200, success: true });
      res.json({ ...userResponse, token, permissions: getRolePermissions(userResponse.role || 'user') });
    } catch (wxError) {
      console.error('WeChat API error:', wxError.message);
      return res.status(500).json({ error: '微信服务暂时不可用' });
    }
  } catch (error) {
    console.error('WeChat login error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const users = await userRepository.findAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const user = await userRepository.findById(req.params.id);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: '用户不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/role', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['superadmin', 'admin', 'user'].includes(role)) {
      return res.status(400).json({ error: '无效的角色' });
    }

    if (req.params.id === req.userId && role !== 'superadmin') {
      return res.status(400).json({ error: '不能降低自己的角色等级' });
    }

    const user = await userRepository.update(req.params.id, { role });
    if (user) {
      const userResponse = user.toJSON();
      delete userResponse.password;
      res.json({
        ...userResponse,
        permissions: getRolePermissions(userResponse.role || 'user')
      });
    } else {
      res.status(404).json({ error: '用户不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/permissions/me', authMiddleware, async (req, res) => {
  try {
    const role = req.userRole || 'user';
    res.json({
      role,
      permissions: getRolePermissions(role)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, updateUserRules, async (req, res) => {
  try {
    const { nickname, email, phone, avatar, bio } = req.body;
    const user = await userRepository.update(req.params.id, { nickname, email, phone, avatar, bio });
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: '用户不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/password', authMiddleware, changePasswordRules, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await userRepository.findByIdWithPassword(req.params.id);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const isValidPassword = await userRepository.verifyPassword(oldPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: '原密码错误' });
    }

    const updatedUser = await userRepository.update(req.params.id, { password: newPassword });
    if (updatedUser) {
      const userResponse = updatedUser.toJSON();
      delete userResponse.password;
      res.json(userResponse);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/light-particles', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await userRepository.updateLightParticles(req.params.id, amount);
    if (user) {
      res.json({ lightParticles: user.lightParticles });
    } else {
      res.status(404).json({ error: '用户不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const result = await userRepository.delete(req.params.id);
    if (result) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: '用户不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;