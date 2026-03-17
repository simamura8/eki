const express = require('express');
const fs = require('fs');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// Gemini APIのセットアップ
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
// 利用可能な最新の2.5-flashモデルを指定
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>やさしい易経占い</title>
    <style>
        :root {
            --primary-color: #d35400;
            --accent-color: #e67e22;
            --ai-bg: #fff4e6;
            --ai-border: #f39c12;
            --user-bg: #ffffff;
            --text-color: #4e342e;
            --bg-color: #fffaf0;
            --label-color: #a1887f;
            --error-color: #c0392b;
        }
        * { box-sizing: border-box; }
        body, html {
            height: 100%; margin: 0; padding: 0;
            font-family: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Meiryo", sans-serif;
            background-color: var(--bg-color); color: var(--text-color);
            overflow: hidden;
        }
        .app-container {
            display: flex; flex-direction: column;
            height: 100vh; width: 100%;
            max-width: 800px; margin: 0 auto;
            background: #ffffff;
            box-shadow: 0 0 30px rgba(78, 52, 46, 0.05);
        }
        header { padding: 15px; text-align: center; border-bottom: 1px solid #fce4ec; background: #fff; z-index: 10; }
        h1 { margin: 0; font-size: 18px; color: var(--primary-color); letter-spacing: 0.1em; }

        main {
            flex-grow: 1; overflow-y: auto; padding: 20px;
            display: flex; flex-direction: column; gap: 20px;
            background-color: var(--bg-color);
            scroll-behavior: smooth;
        }

        .message { padding: 15px 20px; border-radius: 20px; max-width: 85%; line-height: 1.8; font-size: 15px; }
        .message.ai {
            align-self: flex-start; background-color: var(--ai-bg); border: 1px solid #ffe0b2;
            border-left: 5px solid var(--ai-border); color: var(--text-color); border-bottom-left-radius: 4px;
        }
        .message.user {
            align-self: flex-end; background-color: var(--user-bg); border: 1px solid #eee;
            color: var(--text-color); border-bottom-right-radius: 4px;
        }
        .message.error {
            align-self: center; background-color: #fdeaea; border: 1px solid var(--error-color);
            color: var(--error-color); font-size: 13px; max-width: 95%; width: 100%;
        }

        .result-frame { margin: 5px 0; padding: 20px; border-radius: 16px; text-align: left; width: 95%; align-self: center; }
        .result-frame.initial { background-color: #fff9f0; border: 2px dashed #edbb99; }
        .result-frame.new { border: 3px solid var(--accent-color); background-color: #fff3e0; color: #e65100; animation: pop 0.4s ease-out; }
        @keyframes pop { 0% { transform: scale(0.98); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

        .label { font-size: 11px; color: var(--label-color); font-weight: bold; display: block; margin-bottom: 5px; }
        .hex-name { font-size: 22px; font-weight: bold; margin-bottom: 8px; color: var(--primary-color); }
        .yao-text { font-size: 16px; font-weight: bold; border-bottom: 1px solid rgba(211, 84, 0, 0.1); padding-bottom: 8px; margin-bottom: 10px; }
        .meaning { font-size: 14px; }

        footer { padding: 15px; background: #fff; border-top: 1px solid #fef3e2; }
        .input-group { display: flex; gap: 10px; background: #fffaf0; padding: 6px; border-radius: 30px; border: 1px solid #ffe0b2; }
        .chat-input { flex-grow: 1; border: none; background: transparent; padding: 10px 15px; font-size: 16px; outline: none; color: var(--text-color); }
        .send-btn {
            background: var(--primary-color); color: white; border: none; border-radius: 50%;
            width: 44px; height: 44px; cursor: pointer; display: flex; align-items: center; justify-content: center;
            transition: 0.3s;
        }
        .send-btn:hover { background: var(--accent-color); }
        .send-btn svg { width: 18px; height: 18px; fill: white; transform: rotate(45deg); margin-left: -2px; }

        .overlay-view {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: var(--bg-color); z-index: 100;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            padding: 30px; text-align: center; overflow-y: auto;
        }
        .btn-large {
            padding: 16px 60px; font-size: 18px; font-weight: bold; color: white;
            background: var(--primary-color); border: none; border-radius: 50px; cursor: pointer;
            box-shadow: 0 8px 20px rgba(211, 84, 0, 0.2); transition: 0.3s; margin-top: 20px;
        }
        .btn-large:hover { transform: translateY(-2px); box-shadow: 0 12px 25px rgba(211, 84, 0, 0.3); }

        .loading-text { color: var(--primary-color); font-weight: bold; font-size: 16px; animation: blink 1.2s infinite; margin-top: 20px; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

        .zeichiku-bundle { display: flex; justify-content: center; align-items: flex-end; height: 80px; gap: 4px; animation: shake 0.6s infinite ease-in-out; }
        .stalk { width: 4px; height: 70px; background-color: #d7ccc8; border-radius: 4px; }
        .stalk:nth-child(even) { height: 60px; background-color: #bcaaa4; }
        @keyframes shake { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }

        .instruction-box {
            background: #fff; padding: 25px; border-radius: 24px; border: 1px solid #ffe0b2;
            max-width: 500px; width: 100%; margin-bottom: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .input-field {
            width: 100%; padding: 12px 20px; border-radius: 12px; border: 1px solid #eee;
            margin-bottom: 15px; font-size: 15px; outline: none; background: #fafafa;
        }
        .mindset-text { font-size: 14px; line-height: 1.8; color: #8d6e63; margin: 15px 0; font-style: italic; }
    </style>
</head>
<body>
    <div id="start-view" class="overlay-view">
        <h1 style="font-size: 28px; margin-bottom: 20px;">易経占い</h1>
        <div class="instruction-box">
            <span class="label" style="text-align: left;">お名前</span>
            <input type="text" id="user-name" class="input-field" placeholder="（任意）" maxlength="20">
            <span class="label" style="text-align: left;">聞きたいこと。</span>
            <textarea id="concern-input" class="input-field" style="height: 110px; resize: none;" 
                placeholder="例：彼氏との関係がうまくいっていません。今後関係はどうなっていくか教えてください。"></textarea>
            <p class="mindset-text">
                心を静かにして、問いを心に浮かべてください。<br>
                守護してくれている存在がサポートしてくれます。<br>
                準備ができたら、占うボタンを押してください。
            </p>
            <button onclick="performFirstDivination()" class="btn-large">占う</button>
        </div>
    </div>

    <div id="divining-view" class="overlay-view" style="display:none;">
        <div class="zeichiku-bundle">${'<div class="stalk"></div>'.repeat(15)}</div>
        <div class="loading-text">立卦中...</div>
        <p style="margin-top: 15px; color: var(--label-color); font-size: 14px;">Geminiがメッセージを紡いでいます</p>
    </div>

    <div class="app-container">
        <header>
            <h1>やさしい易経占い</h1>
        </header>
        <main id="chat-history"></main>
        <footer>
            <div class="input-group">
                <input type="text" id="chat-msg" class="chat-input" placeholder="メッセージを入力..." onkeypress="if(event.key==='Enter') sendChat()">
                <button id="send-btn" onclick="sendChat()" class="send-btn">
                    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
                </button>
            </div>
            <div style="text-align: center; margin-top: 10px;">
                <a href="javascript:location.reload()" style="color: var(--label-color); font-size: 12px; text-decoration: none;">最初からやり直す</a>
            </div>
        </footer>
    </div>

    <script>
        let chatHistory = [];
        let userName = "";

        function displayError(message) {
            const history = document.getElementById('chat-history');
            history.innerHTML += \`<div class="message error"><b>システムエラー:</b><br>\${message}</div>\`;
            scrollToBottom();
        }

        async function performFirstDivination() {
            const concern = document.getElementById('concern-input').value.trim();
            userName = document.getElementById('user-name').value.trim() || "相談者";
            if (!concern) { alert('ご相談内容を入力してください。'); return; }

            document.getElementById('start-view').style.display = 'none';
            document.getElementById('divining-view').style.display = 'flex';

            try {
                const fRes = await fetch('/fortune');
                const fortune = await fRes.json();
                
                const cRes = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: concern, history: [], initialFortune: fortune, name: userName })
                });
                const data = await cRes.json();

                document.getElementById('divining-view').style.display = 'none';

                if (data.error) {
                    displayError(data.error + " (詳細: " + (data.message || "なし") + ")");
                } else {
                    renderInitialResult(fortune, concern, data.advice || "...");
                    chatHistory = data.history || [];
                }
                scrollToBottom();
            } catch (e) {
                document.getElementById('divining-view').style.display = 'none';
                displayError("ネットワークエラーまたはサーバーエラーです。詳細: " + e.message);
            }
        }

        function renderInitialResult(fortune, concern, advice) {
            const history = document.getElementById('chat-history');
            history.innerHTML += \`<div class="message user">\${concern}</div>\`;
            history.innerHTML += \`
                <div class="result-frame initial">
                    <span class="label">【得卦】</span>
                    <div class="hex-name">\${fortune.卦名} \${fortune.爻}</div>
                    <div class="yao-text">\${fortune.爻辞}</div>
                    <div class="meaning">\${fortune.意味}</div>
                </div>
            \`;
            history.innerHTML += \`<div class="message ai"><span class="label">AIからのアドバイス</span>\${advice}</div>\`;
        }

        async function sendChat() {
            const input = document.getElementById('chat-msg');
            const msg = input.value.trim();
            if (!msg) return;

            input.value = '';
            const historyDiv = document.getElementById('chat-history');
            historyDiv.innerHTML += \`<div class="message user">\${msg}</div>\`;
            scrollToBottom();

            try {
                const res = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: msg, history: chatHistory, name: userName })
                });
                const data = await res.json();
                
                if (data.error) {
                    displayError(data.error + " (詳細: " + (data.message || "なし") + ")");
                } else {
                    chatHistory = data.history || chatHistory;
                    if (data.newFortune) {
                        historyDiv.innerHTML += \`
                            <div class="result-frame new">
                                <span class="label">【新たな占い結果】</span>
                                <div class="hex-name">\${data.newFortune.卦名} \${data.newFortune.爻}</div>
                                <div class="yao-text">\${data.newFortune.爻辞}</div>
                                <div class="meaning">\${data.newFortune.意味}</div>
                            </div>
                        \`;
                    }
                    historyDiv.innerHTML += \`<div class="message ai"><span class="label">AIからのアドバイス</span>\${data.advice || "..."}</div>\`;
                }
                scrollToBottom();
            } catch (e) {
                displayError("通信エラーが発生しました。詳細: " + e.message);
            }
        }

        function scrollToBottom() {
            const div = document.getElementById('chat-history');
            setTimeout(() => { div.scrollTop = div.scrollHeight; }, 100);
        }
    </script>
</body>
</html>
  `;
  res.send(html);
});

app.post('/chat', async (req, res) => {
  const { message, history, initialFortune, name } = req.body;
  let newFortune = null;
  if (message.includes('占って') && !initialFortune) {
    newFortune = ekiData[Math.floor(Math.random() * ekiData.length)];
  }
  const fortune = initialFortune || newFortune;

  try {
    const lengthInstruction = history.length === 0 
        ? "必ず700文字以内で、得卦の解説を含めて丁寧に回答してください。" 
        : "文脈に合わせて最適な長さで回答してください。";
    let prompt = systemPromptBase + "\n\n";
    prompt += `相談者の名前: ${name}\n`;
    prompt += `回答時には、必要に応じてこのお名前で呼びかけてください。\n\n`;
    if (fortune) {
      prompt += `【今回の占い結果】\n卦名: ${fortune.卦名} ${fortune.爻}\n爻辞: ${fortune.爻辞}\n意味: ${fortune.意味}\n\n`;
    }
    prompt += `相談内容: ${message}\n上記の情報を踏まえ、${lengthInstruction}`;

    const chat = model.startChat({
        history: history.map(h => ({ role: h.role === 'model' ? 'model' : 'user', parts: [{ text: h.text }] })),
    });

    const result = await chat.sendMessage(prompt);
    const advice = result.response.text();

    const newHistory = [
        ...history,
        { role: 'user', text: message },
        { role: 'model', text: advice }
    ];

    res.json({ advice, history: newHistory, newFortune });
  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: 'Geminiの呼び出しに失敗しました。', message: error.message });
  }
});

app.get('/fortune', (req, res) => {
  res.json(ekiData[Math.floor(Math.random() * ekiData.length)]);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
