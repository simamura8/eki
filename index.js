const express = require('express');
const fs = require('fs');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// Gemini APIのセットアップ
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// データの読み込み
let ekiData = [];
let systemPromptBase = "";
try {
    ekiData = JSON.parse(fs.readFileSync('./eki.json', 'utf8'));
    systemPromptBase = fs.readFileSync('./prompt.txt', 'utf8');
} catch (e) {
    console.error('設定ファイルの読み込みに失敗しました:', e);
}

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  next();
});

app.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>やさしい易経占い</title>
    <style>
        body {
            display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0;
            font-family: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Meiryo", sans-serif;
            background-color: #fef9f3; text-align: center; color: #5d4037;
        }
        .container {
            background: #ffffff; padding: 40px; border-radius: 24px;
            box-shadow: 0 10px 30px rgba(93, 64, 55, 0.08);
            border-top: 8px solid #e67e22; max-width: 650px; width: 92%; min-height: 400px;
            display: flex; flex-direction: column; justify-content: center;
        }
        h1 { color: #8d6e63; margin-bottom: 20px; font-weight: bold; }
        .btn {
            display: inline-block; padding: 14px 40px; font-size: 16px; font-weight: bold; cursor: pointer;
            background-color: #e67e22; color: white; border: none; border-radius: 50px; 
            transition: all 0.3s; margin-top: 15px; outline: none;
        }
        .btn:hover { background-color: #d35400; transform: translateY(-1px); }
        .btn:disabled { background-color: #ccc; cursor: not-allowed; }
        
        .consult-input {
            width: 100%; box-sizing: border-box; padding: 18px; border: 2px solid #f3e5f5; border-radius: 16px;
            font-size: 16px; margin-bottom: 15px; resize: none; background: #fff; color: #5d4037;
        }
        .result-box {
            margin: 15px 0; padding: 25px; background-color: #fffbf0; border: 2px dashed #edbb99; border-radius: 16px; text-align: left;
        }
        .label { font-size: 12px; color: #a1887f; font-weight: bold; display: block; margin-bottom: 4px; }
        .hexagram-name { font-size: 24px; font-weight: bold; color: #bf360c; margin-bottom: 12px; text-align: center; }
        .yao-text { font-size: 16px; font-weight: bold; color: #5d4037; margin-bottom: 8px; line-height: 1.5; padding-bottom: 8px; border-bottom: 1px solid #eee; }
        .meaning { font-size: 14px; line-height: 1.6; color: #6d4c41; }
        .consult-response {
            margin-top: 20px; padding: 20px; background: #f1f8e9; border-radius: 12px;
            text-align: left; font-size: 14px; line-height: 1.8; color: #33691e; border-left: 5px solid #8bc34a;
            white-space: pre-wrap;
        }
        .divining-overlay { display: none; flex-direction: column; align-items: center; }
        .zeichiku-bundle { display: flex; justify-content: center; align-items: flex-end; height: 80px; gap: 3px; margin-bottom: 15px; animation: shake 0.6s infinite ease-in-out; }
        .stalk { width: 3px; height: 70px; background-color: #d7ccc8; border-radius: 4px; }
        .stalk:nth-child(even) { height: 55px; background-color: #bcaaa4; }
        @keyframes shake { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        .loading-text { color: #e67e22; font-weight: bold; animation: blink 1.2s infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .btn-secondary { background-color: #bcaaa4; font-size: 14px; padding: 12px 24px; }
    </style>
</head>
<body>
    <div class="container">
        <div id="start-view">
            <h1>易経占い</h1>
            <p>深遠なる古の知恵に耳を傾けましょう。</p>
            <button onclick="showInputScreen()" class="btn">占いを開始する</button>
        </div>

        <div id="input-view" style="display:none;">
            <h1>ご相談内容</h1>
            <p>今、心にかかっていることをお書きください。</p>
            <textarea id="concern-input" class="consult-input" placeholder="例：仕事の方向性について..." rows="3"></textarea>
            <button id="consult-btn" onclick="performDivination()" class="btn" style="background-color: #8bc34a;">占って相談する</button>
            <br>
            <button onclick="showStartScreen()" class="btn btn-secondary" style="margin-top: 20px;">戻る</button>
        </div>

        <div id="divining" class="divining-overlay">
            <div class="zeichiku-bundle">${'<div class="stalk"></div>'.repeat(15)}</div>
            <div class="loading-text">揲筮中...</div>
            <div id="gemini-status" style="font-size: 12px; color: #8bc34a; margin-top: 10px;">Geminiが知恵を練っています...</div>
        </div>

        <div id="result-view" style="display:none;">
            <h1>占いの結果</h1>
            <div class="result-box">
                <span class="label">【得卦】</span>
                <div id="res-hex" class="hexagram-name"></div>
                <span class="label">【爻辞】</span>
                <div id="res-yao" class="yao-text"></div>
                <span class="label">【意味】</span>
                <div id="res-meaning" class="meaning"></div>
            </div>
            <span class="label" style="text-align: left; margin-top: 20px;">【AIからのアドバイス】</span>
            <div id="res-consult" class="consult-response"></div>
            <div style="margin-top: 30px;">
                <button onclick="showStartScreen()" class="btn btn-secondary">トップへ戻る</button>
                <button onclick="showInputScreen()" class="btn" style="margin-left: 10px;">もう一度占う</button>
            </div>
        </div>
    </div>

    <script>
        function showStartScreen() { hideAll(); document.getElementById('start-view').style.display = 'block'; }
        function showInputScreen() { hideAll(); document.getElementById('concern-input').value = ''; document.getElementById('input-view').style.display = 'block'; }
        function hideAll() { ['start-view', 'input-view', 'divining', 'result-view'].forEach(id => document.getElementById(id).style.display = 'none'); }

        async function performDivination() {
            const concern = document.getElementById('concern-input').value.trim();
            if (!concern) { alert('ご相談内容を入力してください。'); return; }
            hideAll();
            document.getElementById('divining').style.display = 'flex';
            try {
                const fRes = await fetch('/fortune');
                const fortune = await fRes.json();
                const cRes = await fetch('/consult', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fortune, concern })
                });
                const consult = await cRes.json();
                if (consult.error) throw new Error(consult.error);
                document.getElementById('res-hex').textContent = fortune.卦名 + ' ' + fortune.爻;
                document.getElementById('res-yao').textContent = fortune.爻辞;
                document.getElementById('res-meaning').textContent = fortune.意味;
                document.getElementById('res-consult').textContent = consult.advice;
                hideAll();
                document.getElementById('result-view').style.display = 'block';
            } catch (error) {
                alert('エラーが発生しました: ' + error.message);
                showStartScreen();
            }
        }
    </script>
</body>
</html>
  `;
  res.send(html);
});

app.get('/fortune', (req, res) => {
  const fortune = ekiData[Math.floor(Math.random() * ekiData.length)];
  res.json(fortune);
});

app.post('/consult', async (req, res) => {
  const { fortune, concern } = req.body;
  try {
    const prompt = `${systemPromptBase}

【現在の占い状況】
得卦: ${fortune.卦名} ${fortune.爻}
爻辞: ${fortune.爻辞}
意味: ${fortune.意味}
相談者の悩み: ${concern}

上記の情報に基づき、あなたの価値観を反映させたメッセージを700文字以内で作成してください。`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    res.json({ advice: text });
  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: error.message, advice: 'APIエラーが発生しました。' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
