const express = require('express');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// 起動時にデータを読み込んでおく
const ekiData = JSON.parse(fs.readFileSync('./eki.json', 'utf8'));

app.use((req, res, next) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  next();
});

// トップページ（SPAの土台）
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
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            font-family: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Meiryo", sans-serif;
            background-color: #fef9f3;
            text-align: center;
            color: #5d4037;
        }
        .container {
            background: #ffffff;
            padding: 40px;
            border-radius: 24px;
            box-shadow: 0 10px 30px rgba(93, 64, 55, 0.08);
            border-top: 8px solid #e67e22;
            max-width: 600px;
            width: 90%;
            min-height: 480px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        h1 { color: #8d6e63; margin-bottom: 20px; font-weight: bold; }
        .btn {
            display: inline-block;
            padding: 16px 48px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            text-decoration: none;
            background-color: #e67e22;
            color: white;
            border: none;
            border-radius: 50px;
            transition: all 0.3s;
            margin-top: 20px;
        }
        .btn:hover { background-color: #d35400; transform: translateY(-2px); }
        .result-box {
            margin: 20px 0;
            padding: 25px;
            background-color: #fffbf0;
            border: 2px dashed #edbb99;
            border-radius: 16px;
            text-align: left;
        }
        .label {
            font-size: 13px;
            color: #a1887f;
            margin-bottom: 4px;
            font-weight: bold;
            display: block;
        }
        .hexagram-name {
            font-size: 26px;
            font-weight: bold;
            color: #bf360c;
            margin-bottom: 15px;
            text-align: center;
        }
        .yao-text {
            font-size: 17px;
            font-weight: bold;
            color: #5d4037;
            margin-bottom: 12px;
            line-height: 1.5;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        .meaning {
            font-size: 15px;
            line-height: 1.6;
            color: #6d4c41;
        }
        .footer-links { margin-top: 20px; }
        .btn-secondary { background-color: #bcaaa4; font-size: 14px; padding: 12px 24px; margin-right: 10px; }

        .divining-overlay { display: none; flex-direction: column; align-items: center; }
        .zeichiku-bundle {
            display: flex; justify-content: center; align-items: flex-end;
            height: 100px; gap: 3px; margin-bottom: 20px;
            animation: shake 0.6s infinite ease-in-out;
        }
        .stalk { width: 3px; height: 80px; background-color: #d7ccc8; border-radius: 4px; }
        .stalk:nth-child(even) { height: 65px; background-color: #bcaaa4; }
        @keyframes shake { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        .divining-text { color: #e67e22; font-weight: bold; letter-spacing: 0.2em; animation: blink 1.2s infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    </style>
</head>
<body>
    <div class="container">
        <div id="start-view">
            <h1>易経占い</h1>
            <p>深遠なる古の知恵に耳を傾けましょう。</p>
            <button onclick="getFortune()" class="btn">占いを開始する</button>
        </div>

        <div id="divining" class="divining-overlay">
            <div class="zeichiku-bundle">
                ${'<div class="stalk"></div>'.repeat(15)}
            </div>
            <div class="divining-text">揲筮中...</div>
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
            <div class="footer-links">
                <button onclick="showStart()" class="btn btn-secondary">トップへ戻る</button>
                <button onclick="getFortune()" class="btn">もう一度占う</button>
            </div>
        </div>
    </div>

    <script>
        async function getFortune() {
            document.getElementById('start-view').style.display = 'none';
            document.getElementById('result-view').style.display = 'none';
            document.getElementById('divining').style.display = 'flex';

            try {
                const response = await fetch('/fortune');
                const data = await response.json();

                // 演出のために少し待つ
                setTimeout(() => {
                    document.getElementById('res-hex').textContent = data.卦名 + ' ' + data.爻;
                    document.getElementById('res-yao').textContent = data.爻辞;
                    document.getElementById('res-meaning').textContent = data.意味;

                    document.getElementById('divining').style.display = 'none';
                    document.getElementById('result-view').style.display = 'block';
                }, 1500);
            } catch (error) {
                alert('占いに失敗しました。もう一度お試しください。');
                showStart();
            }
        }

        function showStart() {
            document.getElementById('result-view').style.display = 'none';
            document.getElementById('divining').style.display = 'none';
            document.getElementById('start-view').style.display = 'block';
        }
    </script>
</body>
</html>
  `;
  res.send(html);
});

// 占いの実行（JSONデータを返すAPIとして機能）
app.get('/fortune', (req, res) => {
  const fortune = ekiData[Math.floor(Math.random() * ekiData.length)];
  res.json(fortune);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
