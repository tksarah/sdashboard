# SDashboard

SDashboardは、シンプルかつモダンなダッシュボードWebアプリケーションです。

## 構成

- `backend.py` : バックエンド（APIサーバー等）
- `requirements.txt` : Python依存パッケージ一覧
- `static/` : フロントエンド静的ファイル
    - `index.html` : メインHTML
    - `css/style.css` : スタイルシート
    - `js/dashboard.js` : JavaScript

## セットアップ手順

1. **Python環境の準備**
   - Python 3.8以上を推奨
   - 仮想環境の作成（任意）

2. **依存パッケージのインストール**
   ```bash
   pip install -r requirements.txt
   ```

3. **アプリケーションの起動**
   ```bash
   python backend.py
   ```
   サーバーが起動したら、ブラウザで `http://localhost:8000` などにアクセスしてください。

## フロントエンド

- `static/index.html` を中心に、`css/style.css` と `js/dashboard.js` でUI/UXを構成
- レスポンシブデザイン対応
- ダークテーマ

## カスタマイズ

- スタイル変更: `static/css/style.css`
- 機能追加: `static/js/dashboard.js` または `backend.py`

## ライセンス

このプロジェクトはMITライセンスです。
  

---

## systemdによる自動起動設定（Linux向け）

Linuxサーバーで `backend.py` を systemd サービスとして自動起動するには、以下の手順を参考にしてください。

### 1. サービスファイルの作成

例: `/etc/systemd/system/sdashboard-backend.service`

```
[Unit]
Description=SDashboard Backend Service
After=network.target

[Service]
Type=simple
User=YOUR_USER_NAME
WorkingDirectory=/opt/collator-dashboard
ExecStart=/usr/bin/python3 backend.py
Restart=always

[Install]
WantedBy=multi-user.target
```

- `User` と `WorkingDirectory`、`ExecStart` のパスは環境に合わせて修正してください。

### 2. サービスの有効化と起動

```bash
sudo systemctl daemon-reload
sudo systemctl enable sdashboard-backend
sudo systemctl start sdashboard-backend
```

### 3. ステータス確認・ログ確認

```bash
sudo systemctl status sdashboard-backend
journalctl -u sdashboard-backend -f
```

---
