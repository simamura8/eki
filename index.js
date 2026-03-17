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
  "乾為天 (けんいてん)", "坤為地 (こんいち)", "水雷屯 (すいらいちゅん)", "山水蒙 (さんすいもう)",
  "水天需 (すいてんじゅ)", "天水訟 (てんすいしょう)", "地水師 (ちすいし)", "水地比 (すいちひ)",
  "風天小畜 (ふうてんしょうちく)", "天澤履 (てんたくり)", "地天泰 (ちてんたい)", "天地否 (てんちぴ)",
  "天火同人 (てんかどうじん)", "火天大有 (かてんたいゆう)", "地山謙 (ちざんけん)", "雷地予 (らいちよ)",
  "澤雷随 (たくらいずい)", "山風蠱 (さんぷうこ)", "地澤臨 (ちたくりん)", "風地観 (ふうちかん)",
  "火雷噬嗑 (からいぜいごう)", "山火賁 (さんかひ)", "山地剥 (さんちはく)", "地雷復 (じらいふく)",
  "天雷無妄 (てんらいむもう)", "山天大畜 (さんてんたいちく)", "山雷頤 (さんらいらい)", "澤風大過 (たくふうたいか)",
  "坎為水 (かんいすい)", "離為火 (りいか)", "澤山咸 (たくざんかん)", "雷風恒 (らいふうこう)",
  "天山遁 (てんざんとん)", "雷天大壮 (らいてんたいそう)", "火地晋 (かちしん)", "地火明夷 (ちかめいい)",
  "風火家人 (ふうかかじん)", "火澤睽 (かたくけい)", "水山蹇 (すいざんけん)", "雷水解 (らいすいかい)",
  "山澤損 (さんたくそん)", "風雷益 (ふうらいえき)", "澤天夬 (たくてんかい)", "天風姤 (てんぷうこう)",
  "澤地萃 (たくちすい)", "地風升 (ちふうしょう)", "澤水困 (たくすいこん)", "水風井 (すいふうせい)",
  "澤火革 (たくかかく)", "火風鼎 (かふうてい)", "震為雷 (しんいらい)", "艮為山 (ごんいざん)",
  "風山漸 (ふうざんぜん)", "雷澤帰妹 (らいたくきまい)", "雷火豊 (らいかほう)", "火山旅 (かざんたび)",
  "巽為風 (そんいふう)", "兌為澤 (だいたく)", "風水渙 (ふうすいかん)", "水澤節 (すいたくせつ)",
  "風澤中孚 (ふうたくちゅうふ)", "雷山小過 (らいざんしょうか)", "水火既済 (すいかきせい)", "水火未済 (すいかびせい)"
];

// 共通のHTMLヘッダー
const htmlHeader = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>64卦占い</title>
    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            background-color: #f4f4f9;
            text-align: center;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            margin-bottom: 30px;
        }
        .btn {
            display: inline-block;
            padding: 20px 40px;
            font-size: 24px;
            font-weight: bold;
            cursor: pointer;
            text-decoration: none;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 50px;
            transition: background-color 0.3s, transform 0.2s;
        }
        .btn:hover {
            background-color: #0056b3;
            transform: scale(1.05);
        }
        .btn:active {
            transform: scale(0.95);
        }
        .result {
            font-size: 36px;
            font-weight: bold;
            color: #d9534f;
            margin: 30px 0;
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
    <h1>今日の運勢を占いましょう</h1>
    <a href="/fortune" class="btn">占う</a>
  `;
  res.send(htmlHeader + content + htmlFooter);
});

// 占いの実行 (GET /fortune)
app.get('/fortune', (req, res) => {
  // 64卦からランダムに1つ選ぶロジック
  const randomIndex = Math.floor(Math.random() * hexagrams.length);
  const fortuneResult = hexagrams[randomIndex];

  const content = `
    <h1>占いの結果</h1>
    <div class="result">${fortuneResult}</div>
    <a href="/" class="btn" style="background-color: #6c757d;">もう一度占う</a>
  `;
  res.send(htmlHeader + content + htmlFooter);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
