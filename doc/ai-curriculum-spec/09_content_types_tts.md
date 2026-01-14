# コンテンツ型とTTS仕様（v0.1）

このドキュメントは、`vibe_coding` の**ドキュメントタイプ**と**スライドタイプ**、
および将来的な**TTS生成/音声同期**の仕様方針をまとめる。
現フェーズでは「ドキュメントタイプの生成」を優先し、TTS/音声同期は後続実装とする。

## 1. ドキュメントタイプ（DocChapter）

### 1.1 目的
- 章単位の教材を「読み物」として構造化する
- UIは `VibeDocView` の `doc` タブで表示する

### 1.2 構造
```ts
type LocalizedText = { en: string; jp: string };

type DocChapter = {
  id: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  readingTime: LocalizedText;
  sections: DocSection[];
};

type DocSection = {
  id: string;
  title: LocalizedText;
  content: LocalizedDocBlock[];
};
```

### 1.3 Docブロック種別（LocalizedDocBlock）
以下は `types.ts` の `LocalizedDocBlock` に準拠する。

- `text`: `text`, `style?` (`normal` | `lead` | `quote`)
- `image`: `src`, `alt`, `caption?`, `layout?` (`full` | `float-right`)
- `code`: `code`, `language`, `filename?`, `highlightLines?`
- `list`: `items`, `style?` (`bullet` | `number` | `check`)
- `callout`: `title?`, `text`, `variant` (`info` | `warning` | `tip` | `success`)
- `mermaid`: `chart`, `caption?`
- `table`: `headers`, `rows`
- `mindmap`: `root`（階層ノード構造）

### 1.4 ローカライズ
- 生成は `LocalizedText`（`jp` と `en`）を基本とする
- UI側のフォールバックは `jp → en → string` の順で許容

## 2. スライドタイプ（GeneratedChapter.slides）

### 2.1 目的
- ドキュメントの要点をスライド形式で表示する
- TTSの読み上げ単位として利用する

### 2.2 構造
```ts
type Slide = {
  title: string;
  bullets: string[];
  speechScript?: string;
  timing?: string;
  visualStyle?: string;
  motionCue?: string;
  accentIcon?: string;
  layoutHint?: string;
  imagePrompt?: string;
  highlightBox?: string;
};
```

### 2.3 生成方針（MVP）
- 1章あたり**最低1枚**のスライドを保証する
- 1セクションあたり1〜3枚を目安にし、章全体で8枚以内を推奨
- `speechScript` を優先してTTSに流し、無い場合は `bullets` を結合して読む
- `visualStyle` / `motionCue` / `accentIcon` / `layoutHint` は任意（将来の演出用）

### 2.4 ドキュメント → スライド変換ルール
**優先順位**
1) `section.title` をスライド見出しに使う  
2) `doc_blocks` を種類ごとにスライド化  
3) 余力があれば「まとめ/次のアクション」のスライドを追加  

**ブロック別の基本変換**
- `text`: 1ブロック=1スライド。長文は2〜3文に分割して `bullets` へ
- `list`: 各 `items[]` を `bullets` に並べる
- `code`: `highlightBox` に短いコマンド、`bullets` に意図/効果を要約
- `callout`: `bullets` 1〜2行で要点化、`accentIcon` で意味を示す
- `table`: 重要行を2〜4件に圧縮して `bullets` 化
- `image`: `layoutHint="visual-first"`、`imagePrompt` は `caption/alt` を短文化

**演出用フィールドの制約**
- `layoutHint`: `text-only` / `visual-first` / `wide` / `two-column` を推奨
- `visualStyle`: `tech`, `cyan`, `neon`, `warm`, `sunset`, `creative`, `nature`, `green` を推奨
- `motionCue`: `fade-in` / `slide-up` / `slide-left` / `pop` を推奨
- `accentIcon`: `lightbulb` / `target` / `key` / `palette` から選ぶ

**長さの目安**
- `title`: 40文字以内
- `bullets`: 2〜5項目、各80文字以内
- `speechScript`: 1スライドあたり15〜35秒程度

## 3. TTS生成（将来実装）

### 3.1 モデル
- Gemini 2.5 Pro（別名: google pro nano banana）を想定

### 3.2 出力するTTS用情報
TTS生成の際は「スライドごとの読み上げ文」と「同期用タイムライン」を出力する。

推奨JSON（例）:
```json
{
  "tts_bundle": {
    "language": "ja-JP",
    "voice": "auto",
    "slides": [
      {
        "slide_id": "ch1-s1",
        "tts_script": "...",
        "estimated_sec": 18,
        "tts_prompt": {
          "audio_profile": "calm, confident, warm",
          "scene": "Short lecture slide",
          "director_notes": "Emphasize key terms. Keep pauses short.",
          "context": "Chapter 1: Minimum Viable Knowledge",
          "transcript": "..."
        }
      }
    ],
    "slide_timeline_sec": [0, 18, 37, 55]
  }
}
```

- `slide_id` は `"{chapter_id}-s{index}"` を基本とする
- `tts_script` は `slides[].speechScript` に格納する
- `estimated_sec` は文字数ベースの推定値（例: `ceil(chars / 12)`）
- `slide_timeline_sec` は**スライド開始時刻（秒）**の配列で、必ず `0` から開始

### 3.3 TTSプロンプトの組み立て方針
**5-Element Prompting** を基本とする。
```
Audio Profile: {audio_profile}
Scene: {scene}
Director's Notes: {director_notes}
Context: {context}
Transcript: {transcript}
```

**推奨ルール**
- `transcript` は箇条書きを読み上げ文に変換する（記号や番号は読まない）
- 1スライドあたり15〜35秒に収まる長さを目安にする
- 専門語は最初に簡単な言い換えを含める（JP/ENともに）

### 3.4 音声同期の方針
- `slide_timeline_sec` を基準にスライドを自動送りする
- 既存の `SlideViewer` は固定配列 `SLIDE_TIMINGS` を使用しているため、
  後続実装で `slide_timeline_sec` を参照する方式に切り替える

## 4. 現フェーズの優先順位
1. DocChapter（ドキュメントタイプ）の生成
2. Slide生成（任意）
3. TTS + 音声同期（後続）

## 5. JSON Schema
- `schemas/doc_chapter.schema.json`
- `schemas/slide_set.schema.json`
- `schemas/tts_bundle.schema.json`
