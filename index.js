const express = require('express');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// 日本語の文字化けを防ぐためのミドルウェア（Content-Typeにcharset=utf-8を指定）
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  next();
});

// 64卦のリスト
const hexagrams = [
  "乾為天", "坤為地", "水雷屯", "山水蒙",
  "水天需", "天水訟", "地水師", "水地比",
  "風天小畜", "天澤履", "地天泰", "天地否",
  "天火同人", "火天大有", "地山謙", "雷地予",
  "澤雷随", "山風蠱", "地澤臨", "風地観",
  "火雷噬嗑", "山火賁", "山地剥", "地雷復",
  "天雷無妄", "山天大畜", "山雷頤", "澤風大過",
  "坎為水", "離為火", "澤山咸", "雷風恒",
  "天山遁", "雷天大壮", "火地晋", "地火明夷",
  "風火家人", "火澤睽", "水山蹇", "雷水解",
  "山澤損", "風雷益", "澤天夬", "天風姤",
  "澤地萃", "地風升", "澤水困", "水風井",
  "澤火革", "火風鼎", "震為雷", "艮為山",
  "風山漸", "雷澤帰妹", "雷火豊", "火山旅",
  "巽為風", "兌為澤", "風水渙", "水澤節",
  "風澤中孚", "雷山小過", "水火既済", "水火未済"
];

// 爻（こう）の名称
const yaoNames = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];

/**
 * 将来的に384通りの爻辞（メッセージ）を格納するためのオブジェクト構造の例
 * const yaoMessages = {
 *   0: { // 乾為天
 *     1: "初九。潜龍。勿用。",
 *     2: "九二。見龍在田。利見大人。",
 *     ...
 *   },
 *   ...
 * };
 */

// 共通のHTMLヘッダー
const htmlHeader = `
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
            /* 柔らかいフォント設定 */
            font-family: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Meiryo", sans-serif;
            background-color: #fef9f3; /* 温かい生成り色 */
            text-align: center;
            color: #5d4037; /* 濃い茶色で柔らかいコントラスト */
        }
        .container {
            background: #ffffff;
            padding: 50px;
            border-radius: 24px; /* 角を丸くして柔らかく */
            box-shadow: 0 10px 30px rgba(93, 64, 55, 0.08);
            border-top: 8px solid #e67e22; /* 温かいオレンジのアクセント */
            max-width: 600px;
            width: 90%;
            min-height: 420px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        h1 {
            color: #8d6e63;
            margin-bottom: 20px;
            font-weight: bold;
            letter-spacing: 0.05em;
        }
        .btn {
            display: inline-block;
            padding: 16px 48px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            text-decoration: none;
            background-color: #e67e22; /* 温かいオレンジ */
            color: white;
            border: none;
            border-radius: 50px; /* 丸いボタン */
            transition: all 0.3s;
            margin-top: 20px;
        }
        .btn:hover {
            background-color: #d35400;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(230, 126, 34, 0.3);
        }
        .result-box {
            margin: 20px 0;
            padding: 35px;
            background-color: #fffbf0;
            border: 2px dashed #edbb99; /* 柔らかい点線 */
            border-radius: 16px;
        }
        .label {
            font-size: 15px;
            color: #a1887f;
            margin-bottom: 8px;
            display: block;
        }
        .hexagram-name {
            font-size: 34px;
            font-weight: bold;
            color: #bf360c; /* 落ち着いた赤茶色 */
        }
        .footer-links {
            margin-top: 20px;
        }
        .btn-secondary {
            background-color: #bcaaa4;
            font-size: 14px;
            padding: 12px 24px;
        }
        .btn-secondary:hover {
            background-color: #a1887f;
        }

        /* 筮竹アニメーションのスタイル */
        .divining-overlay {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .zeichiku-bundle {
            display: flex;
            justify-content: center;
            align-items: flex-end;
            height: 120px;
            gap: 3px;
            margin-bottom: 25px;
            transform-origin: bottom center;
            animation: shake 0.6s infinite ease-in-out;
        }
        .stalk {
            width: 4px;
            height: 100px;
            background-color: #d7ccc8;
            border-radius: 4px;
        }
        .stalk:nth-child(even) {
            height: 85px;
            background-color: #bcaaa4;
        }
        @keyframes shake {
            0% { transform: rotate(-4deg); }
            50% { transform: rotate(4deg); }
            100% { transform: rotate(-4deg); }
        }
        .divining-text {
            font-size: 18px;
            color: #e67e22;
            font-weight: bold;
            letter-spacing: 0.2em;
            animation: blink 1.2s infinite;
        }
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
        }
    </style>
</head>
<body>
    <div class="container">
`;

const htmlFooter = `
    </div>
</body>
</html>
`;

// トップページ (GET /)
app.get('/', (req, res) => {
  const content = `
    <h1>易経占い</h1>
    <p>深遠なる古の知恵に耳を傾けましょう。</p>
    <a href="/fortune" class="btn">占いを開始する</a>
  `;
  res.send(htmlHeader + content + htmlFooter);
});

// 占いの実行 (GET /fortune)
app.get('/fortune', (req, res) => {
  const hexIndex = Math.floor(Math.random() * hexagrams.length);
  const hexName = hexagrams[hexIndex];
  const yaoIndex = Math.floor(Math.random() * 6);
  const resultDisplay = `${hexName} ${yaoIndex + 1}爻`;

  // 筮竹の棒を生成（15本程度で表現）
  let stalks = '';
  for(let i=0; i<15; i++) {
    stalks += '<div class="stalk"></div>';
  }

  const content = `
    <div id="divining" class="divining-overlay">
        <div class="zeichiku-bundle">
            ${stalks}
        </div>
        <div class="divining-text">揲筮中...</div>
    </div>

    <div id="result" style="display:none;">
        <h1>占いの結果</h1>
        <div class="result-box">
            <span class="label">【得卦】</span>
            <div class="hexagram-name">${resultDisplay}</div>
        </div>
        
        <div class="footer-links" style="display:block;">
            <a href="/" class="btn btn-secondary">トップへ戻る</a>
            <a href="/fortune" class="btn" style="margin-left: 10px;">もう一度占う</a>
        </div>
    </div>

    <script>
        // 2.5秒後に結果を表示する演出
        setTimeout(() => {
            document.getElementById('divining').style.display = 'none';
            document.getElementById('result').style.display = 'block';
        }, 2500);
    </script>
  `;
  res.send(htmlHeader + content + htmlFooter);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
