# 第七章：构建与发布 — 打包部署

## 7.1 wails.json 配置详解

```json
{
  "$schema": "https://wails.io/schemas/config.v3.json",
  "name": "my-app",
  "outputfilename": "my-app",
  "frontend:install": "npm install",
  "frontend:build": "npm run build",
  "frontend:dev:watcher": "npm run dev",
  "frontend:dev:serverUrl": "auto",
  "author": {
    "name": "Your Name",
    "email": "you@example.com"
  }
}
```

### 关键配置项

| 字段 | 说明 |
|------|------|
| `name` | 应用名称 |
| `outputfilename` | 输出二进制文件名 |
| `frontend:install` | 前端依赖安装命令 |
| `frontend:build` | 前端构建命令 |
| `frontend:dev:watcher` | 开发模式前端启动命令 |
| `frontend:dev:serverUrl` | 开发服务器 URL（auto 自动检测） |

## 7.2 构建命令

### 基本构建

```bash
# Build for current platform
wails3 build

# Build with specific output name
wails3 build -o myapp

# Build for production (optimized)
wails3 build -production
```

### 跨平台构建

```bash
# macOS (Intel)
GOOS=darwin GOARCH=amd64 wails3 build

# macOS (Apple Silicon)
GOOS=darwin GOARCH=arm64 wails3 build

# Windows
GOOS=windows GOARCH=amd64 wails3 build

# Linux
GOOS=linux GOARCH=amd64 wails3 build
```

## 7.3 macOS 打包

### 创建 .app Bundle

```bash
# Build creates .app bundle on macOS
wails3 build -platform darwin/universal

# Output: build/bin/MyApp.app
```

### 应用签名

```bash
# Sign the app
codesign --force --deep --sign "Developer ID Application: Your Name (TEAM_ID)" \
    build/bin/MyApp.app

# Verify signature
codesign --verify --deep --strict build/bin/MyApp.app
```

### macOS Notarization

```bash
# Create zip for notarization
ditto -c -k --keepParent build/bin/MyApp.app MyApp.zip

# Submit for notarization
xcrun notarytool submit MyApp.zip \
    --apple-id "your@email.com" \
    --team-id "TEAM_ID" \
    --password "app-specific-password" \
    --wait

# Staple the ticket
xcrun stapler staple build/bin/MyApp.app
```

### 创建 DMG

```bash
# Using create-dmg
create-dmg \
    --volname "My App" \
    --window-pos 200 120 \
    --window-size 600 400 \
    --icon-size 100 \
    --icon "MyApp.app" 175 120 \
    --app-drop-link 425 120 \
    "MyApp.dmg" \
    "build/bin/"
```

## 7.4 Windows 打包

### 创建 MSI 安装包

使用 WiX Toolset：

```xml
<!-- installer.wxs -->
<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
    <Product Id="*" Name="My App" Version="1.0.0" 
             Manufacturer="Your Company" Language="1033">
        <Package InstallerVersion="200" Compressed="yes" />
        <Media Id="1" Cabinet="app.cab" EmbedCab="yes" />
        
        <Directory Id="TARGETDIR" Name="SourceDir">
            <Directory Id="ProgramFilesFolder">
                <Directory Id="INSTALLDIR" Name="My App">
                    <Component Id="MainExecutable" Guid="YOUR-GUID">
                        <File Id="exe" Source="build/bin/myapp.exe" KeyPath="yes" />
                    </Component>
                </Directory>
            </Directory>
        </Directory>
        
        <Feature Id="Complete" Level="1">
            <ComponentRef Id="MainExecutable" />
        </Feature>
    </Product>
</Wix>
```

## 7.5 自动更新

### 实现思路

```go
type UpdateService struct {
    currentVersion string
    updateURL      string
}

func (s *UpdateService) CheckForUpdate() (*UpdateInfo, error) {
    resp, err := http.Get(s.updateURL + "/latest.json")
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    var info UpdateInfo
    json.NewDecoder(resp.Body).Decode(&info)
    
    if info.Version > s.currentVersion {
        return &info, nil
    }
    return nil, nil // No update available
}

func (s *UpdateService) DownloadUpdate(url string) error {
    // Download and replace binary
    // Platform-specific implementation
    return nil
}
```

## 7.6 GitHub Actions CI/CD

```yaml
# .github/workflows/build.yml
name: Build & Release

on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install Wails v3
        run: go install github.com/wailsapp/wails/v3/cmd/wails3@latest
      
      - name: Install frontend dependencies
        run: cd frontend && npm install
      
      - name: Build
        run: wails3 build -production
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-${{ matrix.os }}
          path: build/bin/

  release:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v4
      
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            build-macos-latest/*
            build-windows-latest/*
            build-ubuntu-latest/*
```

## 7.7 本章小结

本章你学到了：
- wails.json 完整配置
- 跨平台构建命令
- macOS 签名和公证流程
- Windows MSI 安装包制作
- 自动更新实现思路
- GitHub Actions CI/CD 配置

---

**上一章**：[第六章：高级特性 — 进阶开发](./06-advanced.md)  
**下一章**：[第八章：实战项目 — Markdown 编辑器](./08-real-project.md)
