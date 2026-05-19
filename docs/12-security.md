# 附录D：安全性最佳实践

> 本章介绍 Wails v3 桌面应用开发中的安全注意事项和最佳实践。

## D.1 前后端通信安全边界

### 理解安全模型

```
┌─────────────────────────────────────────────────┐
│                 Wails Application                │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────┐    ┌───────────────────┐  │
│  │   Go Backend     │    │   Web Frontend    │  │
│  │   (TRUSTED)      │    │   (UNTRUSTED)     │  │
│  │                  │    │                   │  │
│  │  ✅ File access  │    │  ❌ No direct     │  │
│  │  ✅ Network      │    │     file access   │  │
│  │  ✅ System calls │    │  ❌ No system     │  │
│  │  ✅ Crypto       │    │     calls         │  │
│  │                  │    │  ⚠️ Can call Go   │  │
│  │                  │    │     services      │  │
│  └──────────────────┘    └───────────────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
```

**核心原则**：前端代码应被视为不可信的，所有安全敏感操作必须在 Go 后端执行。

### Service 方法的输入验证

```go
// ❌ Bad: No input validation
func (s *FileService) ReadFile(path string) (string, error) {
    data, err := os.ReadFile(path)
    return string(data), err
}

// ✅ Good: Validate and sanitize input
func (s *FileService) ReadFile(path string) (string, error) {
    // Prevent path traversal attacks
    cleanPath := filepath.Clean(path)

    // Ensure path is within allowed directory
    if !strings.HasPrefix(cleanPath, s.allowedDir) {
        return "", fmt.Errorf("access denied: path outside allowed directory")
    }

    // Check file size to prevent memory exhaustion
    info, err := os.Stat(cleanPath)
    if err != nil {
        return "", err
    }
    if info.Size() > 10*1024*1024 { // 10MB limit
        return "", fmt.Errorf("file too large: %d bytes", info.Size())
    }

    data, err := os.ReadFile(cleanPath)
    return string(data), err
}
```

## D.2 路径遍历防护

```go
// Path traversal prevention utility
func isPathSafe(basePath, requestedPath string) bool {
    // Clean and resolve the path
    absBase, err := filepath.Abs(basePath)
    if err != nil {
        return false
    }

    absRequested, err := filepath.Abs(requestedPath)
    if err != nil {
        return false
    }

    // Ensure the requested path is within the base path
    return strings.HasPrefix(absRequested, absBase+string(filepath.Separator)) ||
        absRequested == absBase
}

// Usage in service
func (s *FileService) ReadFile(relativePath string) (string, error) {
    fullPath := filepath.Join(s.baseDir, relativePath)

    if !isPathSafe(s.baseDir, fullPath) {
        return "", fmt.Errorf("access denied: path traversal detected")
    }

    data, err := os.ReadFile(fullPath)
    return string(data), err
}
```

## D.3 敏感数据存储

### macOS Keychain

```go
//go:build darwin

package main

import (
    "os/exec"
    "strings"
)

func storeSecret(service, account, password string) error {
    cmd := exec.Command("security", "add-generic-password",
        "-s", service,
        "-a", account,
        "-w", password,
        "-U", // Update if exists
    )
    return cmd.Run()
}

func getSecret(service, account string) (string, error) {
    cmd := exec.Command("security", "find-generic-password",
        "-s", service,
        "-a", account,
        "-w", // Output password only
    )
    output, err := cmd.Output()
    if err != nil {
        return "", err
    }
    return strings.TrimSpace(string(output)), nil
}

func deleteSecret(service, account string) error {
    cmd := exec.Command("security", "delete-generic-password",
        "-s", service,
        "-a", account,
    )
    return cmd.Run()
}
```

### 跨平台密钥存储（使用 zalando/go-keyring）

```go
import "github.com/zalando/go-keyring"

type SecretService struct{}

func (s *SecretService) StoreToken(token string) error {
    return keyring.Set("MyWailsApp", "auth-token", token)
}

func (s *SecretService) GetToken() (string, error) {
    return keyring.Get("MyWailsApp", "auth-token")
}

func (s *SecretService) DeleteToken() error {
    return keyring.Delete("MyWailsApp", "auth-token")
}
```

### 加密本地配置

```go
import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
    "encoding/base64"
    "io"
)

// Encrypt sensitive config before writing to disk
func encrypt(plaintext string, key []byte) (string, error) {
    block, err := aes.NewCipher(key)
    if err != nil {
        return "", err
    }

    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return "", err
    }

    nonce := make([]byte, gcm.NonceSize())
    if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
        return "", err
    }

    ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
    return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func decrypt(encoded string, key []byte) (string, error) {
    ciphertext, err := base64.StdEncoding.DecodeString(encoded)
    if err != nil {
        return "", err
    }

    block, err := aes.NewCipher(key)
    if err != nil {
        return "", err
    }

    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return "", err
    }

    nonceSize := gcm.NonceSize()
    if len(ciphertext) < nonceSize {
        return "", fmt.Errorf("ciphertext too short")
    }

    nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
    plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
    if err != nil {
        return "", err
    }

    return string(plaintext), nil
}
```

## D.4 防止前端代码逆向

### 生产构建优化

```typescript
// vite.config.ts - production settings
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // Remove console.log
        drop_debugger: true, // Remove debugger statements
      },
      mangle: {
        toplevel: true, // Mangle top-level names
      },
    },
    sourcemap: false, // Never ship sourcemaps in production
  },
})
```

### 注意事项

> ⚠️ **重要**：前端代码（HTML/CSS/JS）嵌入在二进制文件中，但仍可被提取。
> 不要在前端代码中存放任何敏感信息（API keys、secrets 等）。
> 所有敏感逻辑必须放在 Go 后端。

## D.5 网络请求安全

```go
import (
    "crypto/tls"
    "net/http"
    "time"
)

// Create a secure HTTP client
func newSecureClient() *http.Client {
    return &http.Client{
        Timeout: 30 * time.Second,
        Transport: &http.Transport{
            TLSClientConfig: &tls.Config{
                MinVersion: tls.VersionTLS12, // Minimum TLS 1.2
            },
            MaxIdleConns:        100,
            MaxIdleConnsPerHost: 10,
            IdleConnTimeout:     90 * time.Second,
        },
    }
}

// Validate URLs before making requests
func isAllowedURL(rawURL string) bool {
    parsed, err := url.Parse(rawURL)
    if err != nil {
        return false
    }

    // Only allow HTTPS
    if parsed.Scheme != "https" {
        return false
    }

    // Whitelist allowed domains
    allowedDomains := []string{
        "api.example.com",
        "cdn.example.com",
    }

    for _, domain := range allowedDomains {
        if parsed.Host == domain {
            return true
        }
    }
    return false
}
```

## D.6 SQL 注入防护

```go
// ❌ Bad: String concatenation (SQL injection vulnerable)
func (s *Service) Search(query string) ([]Item, error) {
    sql := "SELECT * FROM items WHERE name = '" + query + "'"
    rows, err := s.db.Query(sql)
    // ...
}

// ✅ Good: Parameterized queries
func (s *Service) Search(query string) ([]Item, error) {
    rows, err := s.db.Query(
        "SELECT * FROM items WHERE name = ?", query,
    )
    // ...
}

// ✅ Good: Using LIKE with parameters
func (s *Service) FuzzySearch(query string) ([]Item, error) {
    rows, err := s.db.Query(
        "SELECT * FROM items WHERE name LIKE ?",
        "%"+query+"%",
    )
    // ...
}
```

## D.7 安全检查清单

| 检查项 | 说明 | 优先级 |
|--------|------|--------|
| 输入验证 | 所有 Service 方法参数都需验证 | 🔴 高 |
| 路径遍历 | 文件操作前检查路径合法性 | 🔴 高 |
| SQL 注入 | 使用参数化查询 | 🔴 高 |
| 敏感数据 | 使用系统 Keychain 存储 | 🔴 高 |
| HTTPS | 网络请求强制使用 HTTPS | 🟡 中 |
| 代码混淆 | 生产构建移除 sourcemap 和 console | 🟡 中 |
| 依赖审计 | 定期 `npm audit` 和 `go mod verify` | 🟡 中 |
| 权限最小化 | Service 只暴露必要的方法 | 🟢 低 |
| 错误信息 | 不向前端暴露内部错误细节 | 🟢 低 |

---

**返回主目录**：[README](../README.md)
