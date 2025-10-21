// HTMLの要素を取得
const imageUploader = document.getElementById('imageUploader');
const imagePreview = document.getElementById('imagePreview');
const analyzeButton = document.getElementById('analyzeButton');
const resultText = document.getElementById('resultText');
const loader = document.getElementById('loader');
const resultContainer = document.getElementById('resultContainer');

// (元のコードからコピーボタン作成部分を流用)
const copyButton = document.createElement('button'); 
copyButton.id = 'copyButton';
copyButton.textContent = 'まとめをクリップボードにコピー';
resultContainer.parentNode.insertBefore(copyButton, resultContainer.nextSibling);

let imageDataUrl = null;

// 画像がアップロードされたときの処理 (変更なし)
imageUploader.addEventListener('change', event => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            imagePreview.src = e.target.result;
            imageDataUrl = e.target.result; // (形式: "data:image/png;base64,...")
        }
        reader.readAsDataURL(file);
    }
});

// 「占う」ボタンが押されたときの処理
analyzeButton.addEventListener('click', async () => {
    if (!imageDataUrl) {
        alert('先に手相の画像をアップロードしてください！');
        return;
    }
    
    // ▼▼▼ APIキーのチェックを削除 ▼▼▼
    // if (API_KEY.startsWith('AIzaSy') === false) { ... } // ← 削除
    // ▲▲▲ APIキーのチェックを削除 ▲▲▲

    // UIリセット (変更なし)
    resultText.textContent = "鑑定中...";
    resultContainer.classList.remove('visible');
    resultContainer.classList.add('hidden');
    loader.classList.remove('hidden');
    analyzeButton.classList.add('loading');
    copyButton.style.display = 'none';


    try {
        // プロンプトの定義 (変更なし)
        const prompt = `あなたは熟練で人気の手相占い師です。

手のひらの画像を分析し、「恋愛、仕事、金運、人間関係、運勢、自分自身」について占ってください。

以下の3つの線について、良い点と気をつけなければいけない点を分かりやすく教えてください。
鑑定結果は、どちらもハッキリと、各50文字以内で簡潔にお願いします！
* 生命線: 体力やスタミナ、生活の安定度。人生全般のエネルギーがわかるよ。
* 知能線: 考え方のくせや才能, 向いてる仕事や、どう頭を使うかが現れる線だよ
* 感情線: あなたの性格や愛情表現, 人付き合いのパターン。心の動きを示すよ。

---
[ここからまとめ]
(※まとめセクションは、この[ここからまとめ]と[ここまでまとめ]のタグで必ず囲んでください)

あなたはズバリ〇〇タイプ！

(ここに一言でタイプを表現するキャッチコピーを記述)

### 総合運勢バランス
* 恋愛: (星は金色の星「★」と空白の星「☆」で量を表してください) (一言アドバイス)
* 仕事: (星で表現) (一言アドバイス)
* 金運: (星で表現) (一言アドバイス)
* 人間関係: (星で表現) (一言アドバイス)
* 運勢: (星で表現) (一言アドバイス)
* メンタルの強さ: (星で表現) (一言アドバイス)

[ここまでまとめ]
---

(※占いの口調は、丁寧な口調だけど記号を文章に使って優しくも堅実な人物が答えているようにしてください)
`;

        // ▼▼▼ fetch リクエストをローカルサーバーの /api/analyze エンドポイントに変更 ▼▼▼
        const response = await fetch(`/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // サーバーに画像データとプロンプトを送信
                imageDataUrl: imageDataUrl, 
                prompt: prompt 
            })
        });
        // ▲▲▲ fetch リクエストを変更 ▲▲▲

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '鑑定に失敗しました。');
        }

        const data = await response.json();
        // ★ サーバーからのレスポンス形式 ( { resultText: "..." } ) に合わせる
        const geminiResult = data.resultText; 
        
        // ▼▼▼ 以降の処理は元のコードと同じ (変更なし) ▼▼▼
        
        // ★ 修正: 「まとめ」を抽出
        const summaryMatch = geminiResult.match(/\[ここからまとめ\]([\s\S]*?)\[ここまでまとめ\]/);
        let summaryText = summaryMatch ? summaryMatch[1].trim() : "まとめテキストがAIの応答から見つかりませんでした。";

        // ★ AIが[ここからまとめ]タグを生成しなかった場合（保険）
        if (!summaryMatch) {
            summaryText = geminiResult.trim(); // 全文をコピー対象にする
        }
        
        // ★ 修正: AIが[ここまでまとめ]の後ろに余計な文字( * や ●)を送るバグを修正
        // [ここからまとめ]より前の部分だけを取得
        const beforeSummaryMatch = geminiResult.match(/^([\s\S]*?)\[ここからまとめ\]/);
        
        let beforeText = "";
        if (beforeSummaryMatch) {
            beforeText = beforeSummaryMatch[1].trim(); // [ここからまとめ]より前の文章
        } else {
            // [ここからまとめ]タグ自体が見つからなかった場合の保険
            beforeText = geminiResult.replace(/\[ここからまとめ\]([\s\S]*?)\[ここまでまとめ\]/, '').trim();
        }

        // ★ 修正: 表示するテキストを再構築（余計な文字を捨てる）
        const fullText = beforeText + '\n\n（鑑定のまとめは下の「コピー」ボタンから保存できます）';
        const formattedResult = fullText.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        resultText.innerHTML = formattedResult; 
        
        // ★ 修正: コピーボタンに、生のテキスト(\n のまま)を保存
        copyButton.dataset.summary = summaryText; 

    } catch (error) {
        console.error('Error:', error);
        resultText.textContent = `エラーが発生しました: ${error.message}`;
    } finally {
        loader.classList.add('hidden');
        analyzeButton.classList.remove('loading');
        
        resultContainer.classList.remove('hidden');
        resultContainer.classList.add('visible'); 
        
        copyButton.style.display = 'block'; // ★ コピーボタンを表示
    }
});


// ★★★ ここからが「コピー」ボタンの機能 (変更なし) ★★★
copyButton.addEventListener('click', (event) => { 
    const summaryText = event.currentTarget.dataset.summary;

    if (!summaryText) {
        alert('コピーするテキストがありません。');
        return;
    }

    // ★ navigator.clipboard.writeText を使用
    navigator.clipboard.writeText(summaryText)
        .then(() => {
            // 成功した時
            alert('鑑定結果のまとめをクリップボードにコピーしました！\nメモ帳などに貼り付けて保存してください。');
            copyButton.textContent = 'コピーしました！';
            setTimeout(() => {
                copyButton.textContent = 'まとめをクリップボードにコピー';
            }, 2000);
        })
        .catch(err => {
            // 失敗した時
            console.error('クリップボードへのコピーに失敗しました:', err);
            alert('コピーに失敗しました。ブラウザの権限を確認してください。');
        });
});
// ★★★ 修正ここまで ★★★