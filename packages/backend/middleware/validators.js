const { validationResult } = require('express-validator');
const responseHelper = require('../utils/responseHelper');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(e => e.msg).join(', ');
    return res.status(400).json(
      responseHelper.validationError(messages)
    );
  }
  next();
}

const loginRules = [
  require('express-validator').body('username')
    .trim()
    .notEmpty().withMessage('用户名不能为空')
    .isLength({ min: 2, max: 50 }).withMessage('用户名长度2-50字符')
    .escape(),
  require('express-validator').body('password')
    .notEmpty().withMessage('密码不能为空')
    .isLength({ min: 4, max: 100 }).withMessage('密码长度4-100字符'),
  validate
];

const registerRules = [
  require('express-validator').body('username')
    .trim()
    .notEmpty().withMessage('用户名不能为空')
    .isLength({ min: 2, max: 50 }).withMessage('用户名长度2-50字符')
    .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/).withMessage('用户名只能包含字母、数字、下划线和中文')
    .escape(),
  require('express-validator').body('password')
    .notEmpty().withMessage('密码不能为空')
    .isLength({ min: 6, max: 100 }).withMessage('密码长度6-100字符'),
  require('express-validator').body('email')
    .optional()
    .isEmail().withMessage('邮箱格式不正确')
    .normalizeEmail(),
  require('express-validator').body('phone')
    .optional()
    .matches(/^1[3-9]\d{9}$/).withMessage('手机号格式不正确'),
  validate
];

const updateUserRules = [
  require('express-validator').param('id')
    .notEmpty().withMessage('用户ID不能为空'),
  require('express-validator').body('username')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('用户名长度2-50字符')
    .escape(),
  require('express-validator').body('email')
    .optional()
    .isEmail().withMessage('邮箱格式不正确')
    .normalizeEmail(),
  validate
];

const changePasswordRules = [
  require('express-validator').param('id')
    .notEmpty().withMessage('用户ID不能为空'),
  require('express-validator').body('oldPassword')
    .notEmpty().withMessage('当前密码不能为空'),
  require('express-validator').body('newPassword')
    .notEmpty().withMessage('新密码不能为空')
    .isLength({ min: 6, max: 100 }).withMessage('新密码长度6-100字符'),
  validate
];

module.exports = {
  validate,
  loginRules,
  registerRules,
  updateUserRules,
  changePasswordRules
};
