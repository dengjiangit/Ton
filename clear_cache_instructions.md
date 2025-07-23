# 🔧 浏览器缓存清理说明

如果你仍然看到 "require is not defined" 错误，请按以下步骤清理浏览器缓存：

## 方法1: 硬刷新（推荐）
1. 在浏览器中按 `Ctrl + Shift + R` (Windows/Linux) 或 `Cmd + Shift + R` (Mac)
2. 或者按 `F12` 打开开发者工具，右键点击刷新按钮，选择"硬性重新加载"

## 方法2: 清理浏览器缓存
1. 按 `F12` 打开开发者工具
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

## 方法3: 开发者工具清理
1. 按 `F12` 打开开发者工具
2. 进入 Network 标签页
3. 勾选 "Disable cache"
4. 刷新页面

## 方法4: 无痕模式测试
1. 打开无痕/隐私浏览模式
2. 访问 http://localhost:5173

## ✅ 预期结果
清理缓存后，你应该看到：
- 不再有 "require is not defined" 错误
- 页面正常加载
- 所有路由都能正常工作

## 🎯 测试页面
- 首页: http://localhost:5173/
- 创建红包: http://localhost:5173/create
- 领取红包: http://localhost:5173/claim
- 我的红包: http://localhost:5173/my-redpackets 