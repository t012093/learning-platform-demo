# AIカリキュラム生成システム v0.1

このディレクトリは、対話型・パーソナルAI学習システムの仕様書・アーキテクチャ資料です。

## 前提
- Gemini 2.5 Pro を主モデルに採用（将来 Claude へ差し替え可能）
- Cloud Run をオーケストレーター/ワーカーに採用
- Supabase（Auth/DB/Storage/pgvector）を中心に構成
- PDF出力はオンデマンド生成
- UIテンプレは `vibe_coding` を基準に設計
- 入力は PDF / Audio / YouTube / TXT / DB をすべて対応

## ドキュメント一覧
- `01_overview.md` : 仕様概要（目的、UX、承認、パーソナル配分）
- `02_architecture.md` : アーキテクチャ図と構成
- `03_database_rls.md` : DDL + RLS（改善点反映）
- `04_langgraph.md` : LangGraphノード設計と状態遷移
- `05_api_spec.md` : API設計（Cloud Run + Supabase）
- `06_template_vibe_coding.md` : テンプレJSON雛形
- `07_ingest_spec.md` : 素材取り込み仕様（Audio / YouTube / DB）
- `08_migration_mapping.md` : 段階移行プラン + vibe_coding→GeneratedCourseマッピング案
- `09_content_types_tts.md` : ドキュメント/スライド型 + TTS/音声同期仕様
- `schemas/` : Doc/Slide/TTS/VibeCoding用のJSON Schema
- `local_postgres_phase1.sql` : Phase 1向けのローカルDBスキャフォールド（RLSなし、pgvectorは任意）
