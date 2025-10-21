require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// .env から APIキーを読み込む
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || !apiKey.startsWith('AIzaSy')) {
  console.error('有効な GEMINI_API_KEY が .env ファイルに設定されていません。');
  process.exit(1); // サーバーを停止
}

// Google AI SDK の初期化
const genAI = new GoogleGenerativeAI(apiKey);
// gemini-1.5-flash を使用 (元のコードの 'gemini-2.5-flash-image' に相当するマルチモーダルモデル)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });



// ミドルウェアの設定
// 画像データ(Base64)を送受信するため、JSONのサイズ制限を緩和
app.use(express.json({ limit: '10mb' })); 
// 'public' フォルダ内の静的ファイル (index.html, style.css, script.js) を提供
app.use(express.static('public')); 

// フロントエンドからの占いリクエストを受け付けるAPIエンドポイント
app.post('/api/analyze', async (req, res) => {
  try {
    const { imageDataUrl, prompt } = req.body;

    if (!imageDataUrl || !prompt) {
      return res.status(400).json({ error: '画像データまたはプロンプトがありません。' });
    }

    // データURLからMIMEタイプとBase64データを抽出
    // 形式: "data:[mimeType];base64,[base64Data]"
    const match = imageDataUrl.match(/data:(.*);base64,(.*)/);
    if (!match) {
      return res.status(400).json({ error: '無効な画像データ形式です。' });
    }
    
    const imagePart = {
      inlineData: {
        mimeType: match[1], // (例: 'image/png')
        data: match[2]      // (Base64データ本体)
      }
    };

    // Google AI APIにリクエストを送信
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // 鑑定結果をフロントエンドに返す
    res.json({ resultText: text });

  } catch (error) {
    console.error('Google API へのリクエストエラー:', error);
    res.status(500).json({ error: '鑑定中にサーバーエラーが発生しました。' });
  }
});

// ルートURL (/) にアクセスがあったら public/index.html を表示
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// サーバーを起動
app.listen(port, () => {
  console.log(`サーバーが http://localhost:${port} で起動しました`);
  console.log('HTMLファイルは public フォルダに配置してください。');
});