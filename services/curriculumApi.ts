import { Course, GeneratedCourse } from '../types';
import { isVibeCodingCurriculum, mapVibeCodingToGeneratedCourse } from './vibeCodingAdapter';

const API_BASE = '/api/v2';
const USE_DEMO_MODE = true; // Toggle this for demo animation

type CurriculumListResponse = {
  ok: boolean;
  curricula?: any[];
  error?: string;
};

type CurriculumDetailResponse = {
  ok: boolean;
  curriculum?: any;
  course?: any; // content_json
  error?: string;
};

// --- DEMO DATA DEFINITIONS ---

const DEMO_CURRICULUM_ID = 'demo-curr-001';
const DEMO_SESSION_ID = 'demo-sess-001';

const PYTHON_DEMO_DATA: any = {
  id: DEMO_CURRICULUM_ID,
  title: { en: 'Python for AI Development', jp: 'AI開発のためのPython入門' },
  description: { 
    en: 'Master Python fundamentals with a focus on data science and machine learning.',
    jp: 'データサイエンスと機械学習に焦点を当てたPythonの基礎をマスターします。'
  },
  modules: [
    {
      module_id: 'm1',
      title: { en: 'The Core of Python', jp: 'Module 1: Pythonの核心' },
      objective: { en: 'Master syntax and memory management.', jp: 'AI開発に必須の構文とメモリ管理を習得する。' },
      estimated_hours: 3,
      lessons: [
        { 
          lesson_id: 'm1-l1', 
          title: { en: 'Variables & Memory', jp: '変数とメモリ管理' }, 
          subtitle: { en: 'How Python handles data', jp: 'Pythonのデータ処理の仕組み' },
          estimated_min: 15,
          quiz: {
            id: 'm1-l1-quiz',
            title: { en: 'Variables & Memory Check', jp: '変数とメモリ管理チェック' },
            questions: [
              {
                id: 'q1',
                text: { en: 'In Python, a variable is best described as…', jp: 'Pythonの変数は最も適切に言うと…' },
                options: [
                  { id: 'a', text: { en: 'A label pointing to an object', jp: 'オブジェクトを指すラベル' } },
                  { id: 'b', text: { en: 'A box that stores data directly', jp: 'データを直接保存する箱' } },
                  { id: 'c', text: { en: 'A copy of the object', jp: 'オブジェクトのコピー' } }
                ],
                correctAnswer: 'a',
                explanation: {
                  en: 'Python variables reference objects rather than storing values directly.',
                  jp: 'Pythonの変数は値そのものではなく、オブジェクトへの参照です。'
                }
              }
            ]
          },
          sections: [
            {
              id: 's1',
              title: { en: 'Everything is an Object', jp: 'すべてはオブジェクト' },
              content: [
                { type: 'text', style: 'lead', text: { en: 'In Python, variables are just labels.', jp: 'Pythonにおいて、変数は箱ではなく「ラベル」に過ぎません。' } },
                { type: 'text', text: { en: 'Multiple names can point to the same object. Changing a mutable object affects every name that references it.', jp: '同じオブジェクトを複数の名前が参照できます。ミュータブルなオブジェクトは、どの参照から変更しても全てに影響します。' } },
                { 
                  type: 'mermaid', 
                  chart: 'graph LR\n  A[Variable: x] -->|Reference| B(Object: 10)\n  C[Variable: y] -->|Reference| B\n  style B fill:#f9f,stroke:#333',
                  caption: { en: 'Variables pointing to the same object', jp: '同じオブジェクトを参照する複数の変数' }
                }
              ]
            },
            {
              id: 's2',
              title: { en: 'Reference vs Copy', jp: '参照とコピー' },
              content: [
                { type: 'text', text: { en: 'Assigning a list copies the reference, not the data. Use copy() or slicing to duplicate.', jp: 'リストの代入は「参照」をコピーするだけで、データ自体は複製されません。copy() やスライスで複製します。' } },
                { type: 'text', text: { en: 'Shallow copies only duplicate the outer list. Nested objects still share references.', jp: '浅いコピーは外側だけを複製します。ネスト内のオブジェクトは共有されたままです。' } },
                {
                  type: 'code',
                  language: 'python',
                  code: 'a = [1, 2, 3]\nb = a\nc = a.copy()\n\nb.append(4)\nprint(a)  # [1, 2, 3, 4]\nprint(c)  # [1, 2, 3]'
                },
                {
                  type: 'callout',
                  variant: 'tip',
                  title: { en: 'Shallow vs Deep', jp: '浅いコピーと深いコピー' },
                  text: { en: 'Nested lists need deepcopy to avoid shared inner references.', jp: 'ネストしたリストは deepcopy を使わないと内部参照が共有されます。' }
                }
              ]
            },
            {
              id: 's3',
              title: { en: 'Mutable vs Immutable', jp: 'ミュータブルとイミュータブル' },
              content: [
                { type: 'text', text: { en: 'Lists and dicts are mutable; numbers and strings are immutable. Mutations change memory references differently.', jp: 'リストや辞書はミュータブル、数値や文字列はイミュータブルです。変更時の参照の動きが変わります。' } },
                { type: 'table', headers: [
                  { en: 'Type', jp: '型' },
                  { en: 'Mutable?', jp: '可変か' },
                  { en: 'Example', jp: '例' }
                ],
                  rows: [
                    [ { en: 'List', jp: 'リスト' }, { en: 'Yes', jp: 'はい' }, { en: '[1, 2, 3]', jp: '[1, 2, 3]' } ],
                    [ { en: 'Dict', jp: '辞書' }, { en: 'Yes', jp: 'はい' }, { en: '{\"a\": 1}', jp: '{\"a\": 1}' } ],
                    [ { en: 'String', jp: '文字列' }, { en: 'No', jp: 'いいえ' }, { en: '\"hello\"', jp: '\"hello\"' } ],
                    [ { en: 'Tuple', jp: 'タプル' }, { en: 'No', jp: 'いいえ' }, { en: '(1, 2)', jp: '(1, 2)' } ]
                  ] },
                {
                  type: 'code',
                  language: 'python',
                  code: 'x = 10\nx_id = id(x)\nx += 1\nprint(x_id == id(x))  # False\n\ny = [1, 2]\ny_id = id(y)\ny.append(3)\nprint(y_id == id(y))  # True'
                },
                {
                  type: 'callout',
                  variant: 'info',
                  title: { en: 'Identity vs Equality', jp: '同一性と等価性' },
                  text: { en: 'Use `is` for identity (same object), `==` for equality (same value).', jp: '`is` は同一オブジェクトかどうか、`==` は値が同じかどうかを判定します。' }
                }
              ]
            },
            {
              id: 's4',
              title: { en: 'Memory & Garbage Collection', jp: 'メモリとガーベジコレクション' },
              content: [
                { type: 'text', text: { en: 'Python uses reference counting plus a cyclic garbage collector. Unused objects are reclaimed automatically.', jp: 'Pythonは参照カウントと循環GCを使い、不要なオブジェクトを自動回収します。' } },
                { type: 'text', text: { en: 'Objects are freed when reference count drops to zero. Cycles are handled by a separate collector.', jp: '参照数が0になると解放され、循環参照は別のGCが検出します。' } },
                {
                  type: 'callout',
                  variant: 'warning',
                  title: { en: 'Leaky References', jp: '参照の残り' },
                  text: { en: 'Global variables or long-lived caches can keep objects alive longer than expected.', jp: 'グローバル変数や長寿命キャッシュはオブジェクトを予想以上に保持します。' }
                },
                {
                  type: 'mermaid',
                  chart: 'graph LR\n  A[Object] --> B[Ref Count]\n  B --> C{Zero?}\n  C -- yes --> D[Free Memory]\n  C -- no --> A',
                  caption: { en: 'Reference counting flow', jp: '参照カウントの流れ' }
                }
              ]
            }
          ]
        },
        { 
          lesson_id: 'm1-l2', 
          title: { en: 'List Comprehensions', jp: 'リスト内包表記' }, 
          subtitle: { en: 'Pythonic data processing', jp: 'Pythonicなデータ処理' },
          estimated_min: 20,
          quiz: {
            id: 'm1-l2-quiz',
            title: { en: 'List Comprehensions Check', jp: 'リスト内包表記チェック' },
            questions: [
              {
                id: 'q1',
                text: { en: 'Which comprehension correctly filters even numbers?', jp: '偶数だけを抽出する内包表記はどれ？' },
                options: [
                  { id: 'a', text: { en: '[x for x in data if x % 2 == 0]', jp: '[x for x in data if x % 2 == 0]' } },
                  { id: 'b', text: { en: '[x if x % 2 == 0 for x in data]', jp: '[x if x % 2 == 0 for x in data]' } },
                  { id: 'c', text: { en: '[if x % 2 == 0 for x in data]', jp: '[if x % 2 == 0 for x in data]' } }
                ],
                correctAnswer: 'a',
                explanation: {
                  en: 'The filter clause comes after the for-expression: [x for x in data if condition].',
                  jp: 'フィルタ条件は for の後に書きます: [x for x in data if condition]。'
                }
              }
            ]
          },
          sections: [
            {
              id: 's1',
              title: { en: 'The Definition', jp: '内包表記の定義' },
              content: [
                { type: 'text', style: 'lead', text: { en: 'List comprehensions are a compact way to map and filter data in a single expression.', jp: 'リスト内包表記は、データの変換（map）と抽出（filter）を1行で表現するPythonicな記法です。' } },
                { 
                  type: 'code', 
                  language: 'python', 
                  filename: 'syntax_comp.py',
                  code: '# Basic structure\n# [expression for item in iterable if condition]\n\nsquares = [x**2 for x in range(5) if x % 2 == 0]\nprint(squares)  # [0, 4, 16]' 
                },
                {
                  type: 'callout',
                  variant: 'info',
                  title: { en: 'Why it matters', jp: 'なぜ重要か' },
                  text: { en: 'Readable transformations reduce bugs in data pipelines and feature engineering.', jp: '変換処理が短く読みやすいと、特徴量作成などのミスが減ります。' }
                }
              ]
            },
            {
              id: 's2',
              title: { en: 'Patterns & Variations', jp: '基本パターンと応用' },
              content: [
                { type: 'text', text: { en: 'Common patterns include mapping, filtering, and flattening.', jp: 'よく使うのは「変換」「フィルタ」「フラット化」の3パターンです。' } },
                { type: 'text', text: { en: 'Think of them as mini building blocks: transform the data, keep what you need, then reshape if necessary.', jp: '「変換→抽出→形を整える」という小さなブロックの組み合わせとして捉えると整理しやすいです。' } },
                {
                  type: 'list',
                  style: 'key',
                  items: [
                    { en: 'Mapping: [f(x) for x in data]', jp: '変換: [f(x) for x in data]' },
                    { en: 'Filtering: [x for x in data if cond(x)]', jp: 'フィルタ: [x for x in data if cond(x)]' },
                    { en: 'Flattening: [item for row in matrix for item in row]', jp: 'フラット化: [item for row in matrix for item in row]' }
                  ]
                },
                {
                  type: 'table',
                  headers: [
                    { en: 'Pattern', jp: 'パターン' },
                    { en: 'When to use', jp: '使いどころ' },
                    { en: 'Tip', jp: 'コツ' }
                  ],
                  rows: [
                    [
                      { en: 'Mapping', jp: '変換' },
                      { en: 'Feature creation / normalization', jp: '特徴量作成・正規化' },
                      { en: 'Keep functions short', jp: '関数は短く' }
                    ],
                    [
                      { en: 'Filtering', jp: 'フィルタ' },
                      { en: 'Remove noise / invalid rows', jp: 'ノイズ・無効行の除去' },
                      { en: 'Prefer clear conditions', jp: '条件は明確に' }
                    ],
                    [
                      { en: 'Flattening', jp: 'フラット化' },
                      { en: 'Nested lists to a single list', jp: 'ネスト配列を1本化' },
                      { en: 'Avoid too many levels', jp: '過度なネストを避ける' }
                    ]
                  ]
                },
                {
                  type: 'mermaid',
                  chart: 'graph LR\n  A[Iterable] --> B{Condition}\n  B -- yes --> C[Transform]\n  C --> D[Output list]\n  B -- no --> E[Skip]\n  E --> D',
                  caption: { en: 'How a comprehension maps + filters', jp: '内包表記の「フィルタ→変換」フロー' }
                },
                {
                  type: 'code',
                  language: 'python',
                  filename: 'patterns_comp.py',
                  code: 'names = ["  Ada ", "Grace ", "Linus"]\nclean = [n.strip().lower() for n in names]\n\nmatrix = [[1, 2], [3, 4]]\nflat = [item for row in matrix for item in row]'
                },
                {
                  type: 'callout',
                  variant: 'tip',
                  title: { en: 'Order matters', jp: '順序が大事' },
                  text: { en: 'Write it in the same order you would read it: for x in data, then if condition, then transform.', jp: '読みやすい順序にすると理解しやすいです（for → if → 変換）。' }
                }
              ]
            },
            {
              id: 's3',
              title: { en: 'Comprehensions vs Loops', jp: 'forループとの違い' },
              content: [
                { type: 'text', text: { en: 'Comprehensions are concise, but loops win when logic is complex.', jp: '内包表記は簡潔ですが、複雑なロジックならfor文の方が安全です。' } },
                {
                  type: 'table',
                  headers: [
                    { en: 'Aspect', jp: '観点' },
                    { en: 'Loop', jp: 'for文' },
                    { en: 'Comprehension', jp: '内包表記' }
                  ],
                  rows: [
                    [ { en: 'Readability', jp: '可読性' }, { en: 'High for complex logic', jp: '複雑処理に強い' }, { en: 'High for simple transforms', jp: '単純変換で強い' } ],
                    [ { en: 'Length', jp: '記述量' }, { en: 'Longer', jp: '長い' }, { en: 'Compact', jp: '短い' } ],
                    [ { en: 'Debugging', jp: 'デバッグ' }, { en: 'Easy (step-by-step)', jp: '追いやすい' }, { en: 'Harder for nesting', jp: 'ネストで難しい' } ]
                  ]
                },
                {
                  type: 'callout',
                  variant: 'warning',
                  title: { en: 'Avoid Over-Nesting', jp: '過度なネストは避ける' },
                  text: { en: 'If it takes more than one line to explain, switch to a loop.', jp: '1行で説明できない場合はfor文を検討しましょう。' }
                }
              ]
            },
            {
              id: 's4',
              title: { en: 'Practical Use Cases', jp: '実務での活用例' },
              content: [
                { type: 'text', text: { en: 'Use comprehensions in feature cleaning, labeling, and quick filtering.', jp: '特徴量の整形やラベリング、簡易フィルタに向いています。' } },
                {
                  type: 'list',
                  items: [
                    { en: 'Normalize text before vectorization', jp: 'ベクトル化前のテキスト正規化' },
                    { en: 'Filter out missing values', jp: '欠損値の除外' },
                    { en: 'Create binary labels', jp: '二値ラベルの作成' }
                  ]
                },
                {
                  type: 'code',
                  language: 'python',
                  filename: 'labels_comp.py',
                  code: 'scores = [72, 88, 59, 95]\nlabels = [\"pass\" if s >= 70 else \"fail\" for s in scores]\nprint(labels)  # [\"pass\", \"pass\", \"fail\", \"pass\"]'
                },
                {
                  type: 'callout',
                  variant: 'tip',
                  title: { en: 'When to Switch', jp: '切り替えタイミング' },
                  text: { en: 'For large datasets, prefer NumPy/Pandas for speed and clarity.', jp: '大規模データではNumPy/Pandasの方が高速で明確です。' }
                }
              ]
            }
          ]
        },
        { 
          lesson_id: 'm1-l3', 
          title: { en: 'Functions & Lambda', jp: '関数とラムダ式' }, 
          subtitle: { en: 'Functional programming basics', jp: '関数型プログラミングの基礎' },
          estimated_min: 20,
          sections: [
            {
              id: 's1',
              title: { en: 'Function as a Value', jp: '関数は値として扱える' },
              content: [
                { type: 'text', style: 'lead', text: { en: 'In Python, functions are first-class objects: you can pass them, store them, and return them.', jp: 'Pythonの関数は第一級オブジェクトです。引数に渡したり、変数に代入したり、返り値として使えます。' } },
                { type: 'text', text: { en: 'This is the foundation of functional style: you can build pipelines by combining small, reusable functions.', jp: 'この性質が関数型の基盤です。小さな関数を組み合わせて、再利用しやすい処理パイプラインを作れます。' } },
                { 
                  type: 'code', 
                  language: 'python', 
                  filename: 'first_class.py',
                  code: 'def add_tax(x):\n    return x * 1.1\n\nops = [add_tax, abs]\nprint(ops[0](100))  # 110.0' 
                },
                {
                  type: 'callout',
                  variant: 'info',
                  title: { en: 'Why it matters', jp: 'なぜ重要か' },
                  text: { en: 'You can compose small functions into pipelines.', jp: '小さな関数をつなげてパイプラインを作れます。' }
                }
              ]
            },
            {
              id: 's2',
              title: { en: 'Lambda & Inline Functions', jp: 'ラムダとインライン関数' },
              content: [
                { type: 'text', text: { en: 'Use lambda for short, single-expression functions.', jp: 'ラムダは短い1行関数に向きます。' } },
                { type: 'text', text: { en: 'A good rule: if you need a name, you probably need a def. Lambdas shine in sort keys and small transforms.', jp: '目安として、名前を付けたくなるならdefにしましょう。ラムダはソートキーや小さな変換で効果的です。' } },
                { 
                  type: 'code', 
                  language: 'python', 
                  filename: 'lambda_sort.py',
                  code: 'data = [{\"val\": 3}, {\"val\": 1}, {\"val\": 2}]\n# Sort by \"val\" key\ndata.sort(key=lambda x: x[\"val\"])' 
                },
                {
                  type: 'callout',
                  variant: 'info',
                  title: { en: 'Naming helps review', jp: '命名はレビューに効く' },
                  text: { en: 'Named functions are easier to test and review than anonymous lambdas.', jp: '無名ラムダより、名前付き関数の方がテストやレビューが容易です。' }
                },
                {
                  type: 'callout',
                  variant: 'warning',
                  title: { en: 'Keep it readable', jp: '読みやすさ優先' },
                  text: { en: 'If the lambda needs explanation, use a named function.', jp: '説明が必要なら関数として定義した方が良いです。' }
                }
              ]
            },
            {
              id: 's3',
              title: { en: 'Map, Filter, Reduce', jp: 'map / filter / reduce' },
              content: [
                { type: 'text', text: { en: 'Functional helpers transform data without explicit loops.', jp: '関数型の補助関数で、明示的なループなしに変換できます。' } },
                { type: 'text', text: { en: 'In practice, list comprehensions are often clearer than map/filter, but these helpers are useful in pipelines or when you already have a function.', jp: '実務では内包表記の方が読みやすいことも多いですが、既存関数を流し込むときはmap/filterが便利です。' } },
                {
                  type: 'code',
                  language: 'python',
                  filename: 'map_filter.py',
                  code: 'nums = [1, 2, 3, 4]\n\nsquares = list(map(lambda x: x**2, nums))\nevens = list(filter(lambda x: x % 2 == 0, nums))'
                },
                {
                  type: 'mermaid',
                  chart: 'graph LR\n  A[Data] --> B[Map]\n  B --> C[Filter]\n  C --> D[Result]',
                  caption: { en: 'Functional data flow', jp: '関数型のデータフロー' }
                },
                {
                  type: 'table',
                  headers: [
                    { en: 'Helper', jp: '関数' },
                    { en: 'Purpose', jp: '目的' },
                    { en: 'Example', jp: '例' }
                  ],
                  rows: [
                    [
                      { en: 'map', jp: 'map' },
                      { en: 'Transform each item', jp: '各要素を変換' },
                      { en: 'map(f, data)', jp: 'map(f, data)' }
                    ],
                    [
                      { en: 'filter', jp: 'filter' },
                      { en: 'Keep items by condition', jp: '条件で抽出' },
                      { en: 'filter(cond, data)', jp: 'filter(cond, data)' }
                    ],
                    [
                      { en: 'reduce', jp: 'reduce' },
                      { en: 'Aggregate into one value', jp: '集約して1つに' },
                      { en: 'reduce(f, data)', jp: 'reduce(f, data)' }
                    ]
                  ]
                },
                {
                  type: 'callout',
                  variant: 'tip',
                  title: { en: 'Where is reduce?', jp: 'reduceの場所' },
                  text: { en: 'Use functools.reduce when you need it; otherwise prefer sum/min/max for clarity.', jp: 'reduceはfunctools.reduceで利用しますが、sum/min/maxの方が明快な場合が多いです。' }
                }
              ]
            },
            {
              id: 's4',
              title: { en: 'Practical Patterns', jp: '実務パターン' },
              content: [
                { type: 'text', text: { en: 'Compose small functions to keep feature pipelines clean.', jp: '小さな関数を合成して特徴量パイプラインを整理します。' } },
                { type: 'text', text: { en: 'Aim for pure functions (no side effects) so you can test and reuse them safely.', jp: '副作用の少ない純粋関数を意識すると、テストや再利用が楽になります。' } },
                {
                  type: 'code',
                  language: 'python',
                  filename: 'pipeline_fn.py',
                  code: 'def normalize(s):\n    return s.strip().lower()\n\ndef is_valid(s):\n    return len(s) > 2\n\nraw = [\"  AI \", \"ML\", \" data \"]\nclean = [normalize(s) for s in raw if is_valid(s)]'
                },
                {
                  type: 'table',
                  headers: [
                    { en: 'Use case', jp: 'ユースケース' },
                    { en: 'Pattern', jp: 'パターン' },
                    { en: 'Why it works', jp: '効果' }
                  ],
                  rows: [
                    [
                      { en: 'Text cleanup', jp: 'テキスト整形' },
                      { en: 'map(normalize, texts)', jp: 'map(normalize, texts)' },
                      { en: 'Consistent features', jp: '特徴量の一貫性' }
                    ],
                    [
                      { en: 'Quality filter', jp: '品質フィルタ' },
                      { en: 'filter(is_valid, rows)', jp: 'filter(is_valid, rows)' },
                      { en: 'Reduce noise', jp: 'ノイズ低減' }
                    ],
                    [
                      { en: 'Labeling', jp: 'ラベル付け' },
                      { en: '[label(x) for x in data]', jp: '[label(x) for x in data]' },
                      { en: 'Fast dataset prep', jp: '高速な前処理' }
                    ]
                  ]
                },
                {
                  type: 'callout',
                  variant: 'tip',
                  title: { en: 'When to switch', jp: '切り替えタイミング' },
                  text: { en: 'For complex logic, use explicit loops and tests.', jp: '複雑なロジックはfor文＋テストの方が安全です。' }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      module_id: 'm2',
      title: { en: 'Data Science Foundations', jp: 'Module 2: データサイエンスの基礎' },
      objective: { en: 'Manipulate large datasets.', jp: '大規模データセットを操作する。' },
      estimated_hours: 5,
      lessons: [
        { 
          lesson_id: 'm2-l1', 
          title: { en: 'NumPy Vectorization', jp: 'NumPyとベクトル化' }, 
          subtitle: { en: 'Speeding up calculations', jp: '計算の高速化' },
          estimated_min: 25,
          sections: [
            {
              id: 's1',
              title: { en: 'The Power of Arrays', jp: '配列の力' },
              content: [
                { type: 'text', text: { en: 'NumPy arrays are stored in contiguous memory blocks, unlike Python lists.', jp: 'NumPy配列はPythonのリストとは異なり、連続したメモリブロックに格納されます。' } },
                {
                  type: 'mermaid',
                  chart: 'graph TD\n  subgraph Python List\n  A[Ptr] --> Obj1[Int]\n  B[Ptr] --> Obj2[Int]\n  end\n  subgraph NumPy Array\n  C[Int Int Int Int]\n  end\n  style C fill:#afa',
                  caption: { en: 'Memory Layout Comparison', jp: 'メモリレイアウトの比較' }
                }
              ]
            }
          ]
        },
        { 
          lesson_id: 'm2-l2', 
          title: { en: 'Pandas DataFrames', jp: 'Pandasデータフレーム' }, 
          subtitle: { en: 'Tabular data analysis', jp: '表形式データの分析' },
          estimated_min: 30,
          sections: [
            {
              id: 's1',
              title: { en: 'Anatomy of a DataFrame', jp: 'データフレームの構造' },
              content: [
                { type: 'text', text: { en: 'A DataFrame is essentially a dictionary of Series objects sharing a common index.', jp: 'データフレームは本質的に、共通のインデックスを共有するSeriesオブジェクトの辞書です。' } },
                { 
                  type: 'code', 
                  language: 'python', 
                  code: 'import pandas as pd\n\ndf = pd.read_csv("dataset.csv")\nprint(df.describe())' 
                }
              ]
            }
          ]
        },
        { 
          lesson_id: 'm2-l3', 
          title: { en: 'Matplotlib Visualization', jp: 'データの可視化' }, 
          subtitle: { en: 'Plotting insights', jp: 'インサイトの図示' },
          estimated_min: 25,
          sections: [
            {
              id: 's1',
              title: { en: 'Basic Plotting', jp: '基本的なプロット' },
              content: [
                { type: 'text', text: { en: 'Visualizing loss curves is crucial for AI training.', jp: '損失曲線の可視化はAIの学習において不可欠です。' } },
                { 
                  type: 'code', 
                  language: 'python', 
                  code: 'import matplotlib.pyplot as plt\n\nloss = [0.9, 0.5, 0.3, 0.1]\nplt.plot(loss)\nplt.title("Training Loss")\nplt.show()' 
                }
              ]
            }
          ]
        }
      ]
    },
    {
      module_id: 'm3',
      title: { en: 'Machine Learning Concepts', jp: 'Module 3: 機械学習の概念' },
      objective: { en: 'Understand neural networks.', jp: 'ニューラルネットワークを理解する。' },
      estimated_hours: 6,
      lessons: [
        { 
          lesson_id: 'm3-l1', 
          title: { en: 'The Perceptron', jp: 'パーセプトロンの仕組み' }, 
          subtitle: { en: 'The neuron model', jp: 'ニューロンのモデル' },
          estimated_min: 30,
          sections: [
            {
              id: 's1',
              title: { en: 'Biological Inspiration', jp: '生物学的なインスピレーション' },
              content: [
                { type: 'text', text: { en: 'A perceptron mimics a biological neuron: inputs are weighted, summed, and activated.', jp: 'パーセプトロンは生物のニューロンを模倣しています。入力は重み付けされ、合計され、発火（活性化）します。' } },
                {
                  type: 'mermaid',
                  chart: 'graph LR\n  X1[Input 1] --w1--> Sum((Σ))\n  X2[Input 2] --w2--> Sum\n  Sum --> Act[Activation] --> Y[Output]\n  style Sum fill:#ff9',
                  caption: { en: 'Perceptron Flow', jp: 'パーセプトロンの流れ' }
                }
              ]
            }
          ]
        },
        { 
          lesson_id: 'm3-l2', 
          title: { en: 'Loss & Optimization', jp: '損失と最適化' }, 
          subtitle: { en: 'Gradient Descent', jp: '勾配降下法' },
          estimated_min: 35,
          sections: [
            {
              id: 's1',
              title: { en: 'The Learning Process', jp: '学習のプロセス' },
              content: [
                { type: 'text', text: { en: 'Learning implies minimizing error. We use Gradient Descent to find the lowest error valley.', jp: '学習とは誤差を最小化することです。勾配降下法を使って、誤差が最も低い「谷」を探します。' } },
                {
                  type: 'callout',
                  variant: 'warning',
                  title: { en: 'Learning Rate', jp: '学習率' },
                  text: { en: 'If the learning rate is too high, you might overshoot the valley. Too low, and you never reach it.', jp: '学習率が高すぎると谷を飛び越えてしまい、低すぎるといつまでもたどり着けません。' }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      module_id: 'm4',
      title: { en: 'Practical AI Application', jp: 'Module 4: 実践AIアプリケーション' },
      objective: { en: 'Build real apps.', jp: '実際のアプリを作る。' },
      estimated_hours: 4,
      lessons: [
        { lesson_id: 'm4-l1', title: { en: 'LLM APIs', jp: 'LLM APIの活用' }, subtitle: { en: 'Using Gemini', jp: 'Geminiの活用' }, estimated_min: 20, sections: [] },
        { lesson_id: 'm4-l2', title: { en: 'Chat UI', jp: 'チャットUI構築' }, subtitle: { en: 'Streamlit', jp: 'Streamlit入門' }, estimated_min: 40, sections: [] }
      ]
    }
  ],
  ui_template_id: 'doc_chapter',
  duration: '18 hours',
  modelUsed: 'pro'
};

const ART_DEMO_DATA: any = {
  id: 'demo-art-001',
  title: { en: 'Art History: The Art of Seeing', jp: '美術史：視覚の芸術' },
  description: { 
    en: 'Explore the history, philosophy, and techniques that have shaped human expression.',
    jp: '数千年にわたり人間の表現を形作ってきた歴史、哲学、技術を探求します。'
  },
  modules: [
    {
      module_id: 'a1',
      title: { en: 'Ancient Foundations', jp: 'Module 1: 古代の礎' },
      objective: { en: 'From ritual to ideal.', jp: '儀式から理想へ。' },
      estimated_hours: 3,
      lessons: [
        { 
          lesson_id: 'a1-l1', 
          title: { en: 'Cave Art and Magic', jp: '洞窟壁画と魔術' }, 
          subtitle: { en: 'The dawn of human expression', jp: '人類表現の夜明け' },
          estimated_min: 20,
          sections: [
            {
              id: 's1',
              title: { en: 'Lascaux: The Shaman\'s Vision', jp: 'ラスコー：シャーマンの視覚' },
              content: [
                { type: 'text', style: 'lead', text: { en: 'Cave paintings were not mere decorations; they were technology for survival and ritual.', jp: '洞窟壁画は単なる装飾ではなく、生存と儀式のための「技術」でした。' } },
                { type: 'text', text: { en: 'In Lascaux and Chauvet, animals dominate the walls—bison, horses, deer—often drawn with motion, volume, and an uncanny vitality.', jp: 'ラスコーやショーヴェでは、バイソン・馬・鹿などの動物が壁面を支配します。動きや量感が巧みに表現され、生命力が宿っているように見えます。' } },
                {
                  type: 'list',
                  style: 'key',
                  items: [
                    { en: 'Focus on animals rather than humans', jp: '人間よりも動物が中心' },
                    { en: 'Motion lines and overlapping forms', jp: '動きの線や重なりの表現' },
                    { en: 'Use of natural rock contours to create 3D volume', jp: '岩肌の凹凸を活かした立体感' }
                  ]
                },
                { 
                  type: 'mermaid', 
                  chart: 'graph TD\n  Ritual[Ritual] --> Hunt[Successful Hunt]\n  Hunt --> Art[Cave Painting]\n  Art --> Ritual',
                  caption: { en: 'The feedback loop of prehistoric art', jp: '原始芸術のフィードバックループ' }
                },
                {
                  type: 'callout',
                  variant: 'info',
                  title: { en: 'Not just “art”', jp: '単なる「アート」ではない' },
                  text: { en: 'For hunter-gatherers, images were tools for memory, coordination, and belief. Art was a shared survival interface.', jp: '狩猟採集社会にとって、像は記憶・協調・信仰のための道具でした。アートは共同体の“生存インターフェース”だったのです。' }
                }
              ]
            }
            ,
            {
              id: 's2',
              title: { en: 'Why Paint in the Dark?', jp: 'なぜ暗い洞窟に描くのか' },
              content: [
                { type: 'text', text: { en: 'Many paintings are deep inside caves, far from daily living spaces. This suggests a ritual or ceremonial function.', jp: '多くの壁画は生活空間から離れた洞窟の奥にあります。日常ではなく儀礼の場であった可能性が高いと考えられています。' } },
                {
                  type: 'table',
                  headers: [
                    { en: 'Hypothesis', jp: '仮説' },
                    { en: 'What it explains', jp: '説明できる点' },
                    { en: 'Limitations', jp: '限界' }
                  ],
                  rows: [
                    [
                      { en: 'Hunting magic', jp: '狩猟呪術' },
                      { en: 'Animals and success rituals', jp: '動物表現と成功祈願' },
                      { en: 'Not all animals were hunted', jp: '全てが狩猟対象ではない' }
                    ],
                    [
                      { en: 'Shamanic vision', jp: 'シャーマンの幻視' },
                      { en: 'Abstract signs and trance motifs', jp: '抽象記号や幻視的モチーフ' },
                      { en: 'Hard to prove archaeologically', jp: '考古学的に検証が難しい' }
                    ],
                    [
                      { en: 'Social memory', jp: '共同体の記憶' },
                      { en: 'Shared myths and teaching', jp: '神話や教育の共有' },
                      { en: 'Context lost over millennia', jp: '文脈が失われている' }
                    ]
                  ]
                },
                {
                  type: 'list',
                  items: [
                    { en: 'Deep placement suggests intentional pilgrimage', jp: '奥深い配置は“巡礼”のような意図を示唆' },
                    { en: 'Torchlight creates flicker → animated perception', jp: '松明の揺らぎがアニメーション的効果を生む' }
                  ]
                }
              ]
            },
            {
              id: 's3',
              title: { en: 'Tools, Pigments, and Technique', jp: '道具・顔料・技法' },
              content: [
                { type: 'text', text: { en: 'Prehistoric artists used a surprisingly advanced toolkit: minerals, charcoal, binders, and airbrush-like blowing.', jp: '先史時代の作者は、鉱物・木炭・結合材・吹き付けなど、驚くほど高度なツールを使っていました。' } },
                {
                  type: 'table',
                  headers: [
                    { en: 'Material', jp: '素材' },
                    { en: 'Color', jp: '色' },
                    { en: 'Usage', jp: '用途' }
                  ],
                  rows: [
                    [ { en: 'Charcoal', jp: '木炭' }, { en: 'Black', jp: '黒' }, { en: 'Outlines, shading', jp: '輪郭線・陰影' } ],
                    [ { en: 'Red ochre', jp: '赤色黄土' }, { en: 'Red', jp: '赤' }, { en: 'Bodies, accents', jp: '体躯・強調' } ],
                    [ { en: 'Manganese dioxide', jp: '二酸化マンガン' }, { en: 'Dark brown/black', jp: '濃茶/黒' }, { en: 'Depth and contrast', jp: '奥行き・コントラスト' } ]
                  ]
                },
                {
                  type: 'list',
                  style: 'key',
                  items: [
                    { en: 'Finger painting and engraving', jp: '指描き・刻線' },
                    { en: 'Blowing pigment through hollow bones', jp: '骨筒による吹き付け' },
                    { en: 'Layering to imply motion', jp: '重ね描きによる動きの表現' }
                  ]
                },
                {
                  type: 'mermaid',
                  chart: 'flowchart LR\n  Pigment[Grind Pigment] --> Mix[Mix with Binder]\n  Mix --> Apply[Apply / Blow]\n  Apply --> Ritual[Chant / Gesture]',
                  caption: { en: 'A plausible cave painting workflow', jp: '洞窟壁画の想定プロセス' }
                }
              ]
            },
            {
              id: 's4',
              title: { en: 'Design Lessons for Today', jp: '現代へのデザイン示唆' },
              content: [
                { type: 'text', text: { en: 'Cave art teaches that communication is environmental, multisensory, and ritualized.', jp: '洞窟壁画は、コミュニケーションが環境・感覚・儀礼に根ざしていることを教えてくれます。' } },
                {
                  type: 'list',
                  style: 'key',
                  items: [
                    { en: 'Environment shapes meaning (space is part of the message)', jp: '環境が意味を作る（空間もメッセージの一部）' },
                    { en: 'Motion and light can “animate” static visuals', jp: '光と動きが静止画を“動的化”する' },
                    { en: 'Shared rituals build trust and memory', jp: '共同体の儀礼が信頼と記憶を強化する' }
                  ]
                },
                {
                  type: 'callout',
                  variant: 'tip',
                  title: { en: 'Try this', jp: '試してみよう' },
                  text: { en: 'Design a modern “cave wall” experience: a dark space, slow light, and a single evolving image that guides attention.', jp: '現代版の“洞窟壁画”体験を設計してみましょう。暗い空間・ゆっくりした光・変化する単一の像で注意を導く。' }
                }
              ]
            }
          ]
        },
        { 
          lesson_id: 'a1-l2', 
          title: { en: 'Egyptian Eternity', jp: 'エジプトの永遠性' }, 
          subtitle: { en: 'The canon of proportions', jp: 'プロポーションの正典' },
          estimated_min: 25,
          sections: [
            {
              id: 's1',
              title: { en: 'The Grid System', jp: 'グリッドシステム' },
              content: [
                { type: 'text', text: { en: 'Egyptian art was obsessed with order and permanence. They used a strict grid to ensure figures were consistent for thousands of years.', jp: 'エジプト美術は秩序と永続性に執着しました。彼らは厳格なグリッドを使用し、数千年にわたって人物像の一貫性を保ちました。' } },
                {
                   type: 'mermaid',
                   chart: 'graph LR\n  Head[Head: 1 unit] --- Shoulders[Shoulders: 3 units]\n  Shoulders --- Waist[Waist: Narrow]\n  Waist --- Feet[Feet: Profile]\n  style Head fill:#eec',
                   caption: { en: 'Conceptual structure of Egyptian figures', jp: 'エジプト人像の概念構造' }
                }
              ]
            }
          ]
        },
        { 
          lesson_id: 'a1-l3', 
          title: { en: 'Greek Idealism', jp: 'ギリシャの理想主義' }, 
          subtitle: { en: 'Contrapposto and life', jp: 'コントラポストと生命' },
          estimated_min: 30,
          sections: [
            {
              id: 's1',
              title: { en: 'Breaking Stiffness', jp: '硬直からの脱却' },
              content: [
                { type: 'text', text: { en: 'The Greeks introduced "Contrapposto" (counterpoise), where the figure\'s weight is shifted to one leg, creating a dynamic S-curve.', jp: 'ギリシャ人は「コントラポスト（対抗姿勢）」を導入しました。重心を片足にかけることで、身体に動的なS字カーブが生まれ、生命感が宿ります。' } }
              ]
            }
          ]
        }
      ]
    },
    {
      module_id: 'a2',
      title: { en: 'The Renaissance Awakening', jp: 'Module 2: ルネサンスの覚醒' },
      objective: { en: 'Redesigning the world.', jp: '世界の再設計。' },
      estimated_hours: 4,
      lessons: [
        { 
          lesson_id: 'a2-l1', 
          title: { en: 'Da Vinci & Perspective', jp: 'ダ・ヴィンチと遠近法' }, 
          subtitle: { en: 'Math meets Art', jp: '数学と芸術の出会い' },
          estimated_min: 30,
          sections: [
            {
              id: 's1',
              title: { en: 'Linear Perspective', jp: '線遠近法' },
              content: [
                { type: 'text', text: { en: 'The discovery of the vanishing point changed everything.', jp: '消失点の発見がすべてを変えました。' } },
                { 
                  type: 'mermaid', 
                  chart: 'graph TD\n  VP[Vanishing Point] --- L1[Orthogonal 1]\n  VP --- L2[Orthogonal 2]\n  VP --- L3[Orthogonal 3]\n  style VP fill:#f96,stroke:#333',
                  caption: { en: 'Geometric structure', jp: '幾何学的構造' }
                }
              ]
            }
          ]
        },
        { 
          lesson_id: 'a2-l2', 
          title: { en: 'Michelangelo & Anatomy', jp: 'ミケランジェロと解剖学' }, 
          subtitle: { en: 'The spiritual body', jp: '精神的な肉体' },
          estimated_min: 25,
          sections: [
            {
              id: 's1',
              title: { en: 'Dissecting for Art', jp: '芸術のための解剖' },
              content: [
                { type: 'text', text: { en: 'Renaissance artists dissected corpses to understand the machinery of muscles beneath the skin.', jp: 'ルネサンスの芸術家たちは、皮膚の下にある筋肉のメカニズムを理解するために死体を解剖しました。' } }
              ]
            }
          ]
        },
        { 
          lesson_id: 'a2-l3', 
          title: { en: 'Vermeer\'s Light', jp: 'フェルメールの光' }, 
          subtitle: { en: 'The Camera Obscura', jp: 'カメラ・オブスクラ' },
          estimated_min: 25,
          sections: [
            {
              id: 's1',
              title: { en: 'Optical Tools', jp: '光学ツール' },
              content: [
                { type: 'text', text: { en: 'It is widely believed Vermeer used a Camera Obscura to trace light with photographic precision.', jp: 'フェルメールは光を写真のような精度でトレースするために、カメラ・オブスクラ（暗箱）を使用していたと広く信じられています。' } },
                {
                   type: 'mermaid',
                   chart: 'graph LR\n  Light[Subject] --> Lens((Lens))\n  Lens -->|Projected| Canvas[Canvas]\n  style Lens fill:#bbf',
                   caption: { en: 'Camera Obscura Mechanism', jp: 'カメラ・オブスクラの仕組み' }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      module_id: 'a3',
      title: { en: 'The Fracture of Reality', jp: 'Module 3: 現実の解体' },
      objective: { en: 'Modernism begins.', jp: 'モダニズムの始まり。' },
      estimated_hours: 4,
      lessons: [
        { 
          lesson_id: 'a3-l1', 
          title: { en: 'Impressionism', jp: '印象派：光の粒子' }, 
          subtitle: { en: 'Capturing the fleeting moment', jp: '移ろいゆく瞬間の捕捉' },
          estimated_min: 20,
          sections: [
            {
              id: 's1',
              title: { en: 'Broken Color', jp: '色彩分割' },
              content: [
                { type: 'text', text: { en: 'Instead of mixing colors on the palette, Impressionists placed complementary colors side by side to vibrate in the viewer\'s eye.', jp: 'パレット上で色を混ぜる代わりに、印象派は補色を隣り合わせに配置し、見る人の網膜上で色が振動するようにしました。' } }
              ]
            }
          ]
        },
        { 
          lesson_id: 'a3-l2', 
          title: { en: 'Cubism', jp: 'キュビズム：視点の破壊' }, 
          subtitle: { en: 'Seeing from all angles', jp: '全方位からの視覚' },
          estimated_min: 25,
          sections: [
            {
              id: 's1',
              title: { en: 'The Fourth Dimension', jp: '4次元の表現' },
              content: [
                { type: 'text', text: { en: 'Picasso and Braque tried to paint time itself—showing the front, side, and back of an object simultaneously.', jp: 'ピカソとブラックは「時間」そのものを描こうとしました。物体の正面、側面、背面を同時に画面上に配置したのです。' } }
              ]
            }
          ]
        }
      ]
    },
    {
      module_id: 'a4',
      title: { en: 'Digital Renaissance', jp: 'Module 4: デジタルルネサンス' },
      objective: { en: 'AI Art', jp: 'AIアート' },
      estimated_hours: 3,
      lessons: [
        { lesson_id: 'a4-l1', title: { en: 'Generative History', jp: '生成芸術の歴史' }, subtitle: { en: 'Plotters to AI', jp: 'プロッターからAIへ' }, estimated_min: 20, sections: [] },
        { lesson_id: 'a4-l2', title: { en: 'Co-Creation', jp: '共創の未来' }, subtitle: { en: 'Human + Machine', jp: '人間 + 機械' }, estimated_min: 30, sections: [] }
      ]
    }
  ],
  ui_template_id: 'doc_chapter',
  duration: '15 hours',
  modelUsed: 'pro'
};

const UNITY_DEMO_DATA: any = {
  id: 'demo-unity-001',
  title: { en: 'Unity x AI: Future of Game Dev', jp: 'Unity x AI：次世代ゲーム開発' },
  description: { 
    en: 'Architect and director skills for AI game dev.',
    jp: 'AIを「優秀な部下」として使いこなし、Unityでの没入型体験を構築する。'
  },
  modules: [
    {
      module_id: 'u1',
      title: { en: 'AI Game Dev Philosophy', jp: 'Module 1: AIゲーム開発の思想' },
      objective: { en: 'Shift from coding to judging.', jp: '「書く」から「判断する」へのシフト。' },
      estimated_hours: 3,
      lessons: [
        {
          lesson_id: 'u1-l1',
          title: { en: 'What is Vibe Coding?', jp: 'バイブコーディングとは何か' },
          subtitle: { en: 'Intuition over perfection', jp: '完璧さより直感を' },
          estimated_min: 15,
          sections: [
            {
              id: 's1',
              title: { en: 'The Shifting Role', jp: '役割の変化' },
              content: [
                { type: 'text', style: 'lead', text: { en: 'You are now a Director, not just a Coder.', jp: 'あなたは今や単なるコーダーではなく、ディレクターです。' } },
                {
                  type: 'table',
                  headers: [ {en: 'Task', jp: '項目'}, {en: 'AI Strength', jp: 'AIの得意'}, {en: 'Human Role', jp: '人の役割'} ],
                  rows: [
                    [ {en: 'Coding', jp: 'コード'}, {en: 'Speed', jp: '高速生成'}, {en: 'Intent', jp: '意図の定義'} ],
                    [ {en: 'Architecture', jp: '設計'}, {en: 'Patterns', jp: 'パターン提案'}, {en: 'Consistency', jp: '整合性の維持'} ]
                  ]
                }
              ]
            },
            {
              id: 's2',
              title: { en: 'The Vibe Cycle', jp: 'バイブスのサイクル' },
              content: [
                { type: 'text', text: { en: 'Fast iteration loop.', jp: '高速な反復ループ。' } },
                { 
                  type: 'mermaid', 
                  chart: 'graph LR\n  A(Idea) --> B[AI Gen]\n  B --> C{Test}\n  C -->|Bad| A\n  C -->|Good| D[Refine]',
                  caption: { en: 'Iterative Flow', jp: '反復フロー' }
                }
              ]
            }
          ]
        },
        { 
          lesson_id: 'u1-l2', 
          title: { en: 'Setting Up AI Workbench', jp: 'AIワークベンチの構築' }, 
          subtitle: { en: 'Tools setup', jp: 'ツールのセットアップ' },
          estimated_min: 20,
          sections: [
            {
              id: 's1',
              title: { en: 'The Trinity', jp: '三種の神器' },
              content: [
                { type: 'text', text: { en: 'Cursor (Editor), GitHub Copilot (Autocomplete), and ChatGPT (Architect).', jp: 'Cursor (エディタ), GitHub Copilot (補完), ChatGPT (設計)。この3つを組み合わせるのが最強です。' } }
              ]
            }
          ]
        }
      ]
    },
    {
      module_id: 'u2',
      title: { en: 'Asset Generation Pipeline', jp: 'Module 2: アセット生成パイプライン' },
      objective: { en: 'GenAI for assets.', jp: 'アセットのための生成AI。' },
      estimated_hours: 5,
      lessons: [
        { 
          lesson_id: 'u2-l1', 
          title: { en: 'Skybox & Texture Gen', jp: 'スカイボックスとテクスチャ生成' }, 
          subtitle: { en: 'Stable Diffusion', jp: 'Stable Diffusionの活用' },
          estimated_min: 30,
          sections: [
            {
              id: 's1',
              title: { en: 'Seamless Textures', jp: 'シームレステクスチャ' },
              content: [
                { type: 'text', text: { en: 'Use prompts like "tiling", "seamless" to create game-ready materials.', jp: '「tiling」「seamless」といったプロンプトを使って、ゲームですぐに使えるマテリアルを生成します。' } },
                {
                   type: 'code',
                   language: 'text',
                   code: 'Prompt: stone wall texture, ancient ruins, mossy, seamless, tiling, 4k, realistic --tile'
                }
              ]
            }
          ]
        },
        { 
          lesson_id: 'u2-l2', 
          title: { en: '3D Models from Text', jp: 'テキストからの3Dモデル生成' }, 
          subtitle: { en: 'Meshy & Luma', jp: 'MeshyとLuma AI' },
          estimated_min: 30,
          sections: [
            {
              id: 's1',
              title: { en: 'Rapid Prototyping', jp: 'ラピッドプロトタイピング' },
              content: [
                { type: 'text', text: { en: 'Generate placeholder models in seconds to test gameplay mechanics before hiring artists.', jp: 'アーティストを雇う前に、ゲームプレイの仕組みをテストするための仮モデルを数秒で生成します。' } }
              ]
            }
          ]
        }
      ]
    },
    {
      module_id: 'u3',
      title: { en: 'Intelligence & NPCs', jp: 'Module 3: 知能とNPC' },
      objective: { en: 'LLMs in Games.', jp: 'ゲーム内LLM。' },
      estimated_hours: 6,
      lessons: [
        { 
          lesson_id: 'u3-l1', 
          title: { en: 'Connecting to OpenAI', jp: 'OpenAIへの接続' }, 
          subtitle: { en: 'API requests in C#', jp: 'C#でのAPIリクエスト' },
          estimated_min: 40,
          sections: [
            {
              id: 's1',
              title: { en: 'UnityWebRequest', jp: 'UnityWebRequestの使用' },
              content: [
                { type: 'text', text: { en: 'How to send a POST request to the Chat Completions API.', jp: 'Chat Completions APIにPOSTリクエストを送信する方法。' } },
                { 
                  type: 'code', 
                  language: 'csharp', 
                  filename: 'LLMConnector.cs',
                  code: 'using UnityEngine.Networking;\n\nIEnumerator PostRequest(string prompt) {\n    var json = "{\\"model\\": \\"gpt-4o\\", \\"messages\\": ...}";\n    var req = new UnityWebRequest("https://api.openai.com/v1/chat/completions", "POST");\n    // ... Setup headers and upload handler\n    yield return req.SendWebRequest();\n}' 
                }
              ]
            }
          ]
        },
        { 
          lesson_id: 'u3-l2', 
          title: { en: 'NPC Personality', jp: 'NPCの性格デザイン' }, 
          subtitle: { en: 'System Prompts', jp: 'システムプロンプト' },
          estimated_min: 35,
          sections: [
            {
              id: 's1',
              title: { en: 'Defining Character', jp: 'キャラクターの定義' },
              content: [
                { type: 'text', text: { en: 'The system prompt is the "soul" of your NPC.', jp: 'システムプロンプトは、NPCの「魂」です。' } },
                { 
                  type: 'code', 
                  language: 'json', 
                  filename: 'villager_prompt.json',
                  code: '{\n  "role": "system",\n  "content": "You are a grumpy blacksmith named Grog. You hate adventurers but love gold. Speak with a rough accent."\n}' 
                }
              ]
            }
          ]
        }
      ]
    },
    {
      module_id: 'u4',
      title: { en: 'Solo Studio', jp: 'Module 4: 一人称スタジオ' },
      objective: { en: 'Release strategy.', jp: 'リリース戦略。' },
      estimated_hours: 4,
      lessons: [
        { lesson_id: 'u4-l1', title: { en: 'Auto Playtest', jp: '自動プレイテスト' }, subtitle: { en: 'Agents', jp: 'エージェント' }, estimated_min: 30, sections: [] },
        { lesson_id: 'u4-l2', title: { en: 'Marketing', jp: 'マーケティング' }, subtitle: { en: 'Assets', jp: '素材生成' }, estimated_min: 25, sections: [] }
      ]
    }
  ],
  ui_template_id: 'doc_chapter',
  duration: '18 hours',
  modelUsed: 'pro'
};

const AI_AGENTS_DEMO_DATA: any = {
  id: 'demo-agents-001',
  title: { en: 'AI Agents: Startup Technical Guide', jp: 'AIエージェント：スタートアップ技術ガイド' },
  description: { 
    en: 'Master the architectural patterns and tools for building production-ready AI agents on Google Cloud.',
    jp: 'Google Cloud上でプロダクション品質のAIエージェントを構築するためのアーキテクチャパターンとツールを習得します。'
  },
  modules: [
    {
      module_id: 'ag1',
      title: { en: 'Core Concepts & Ecosystem', jp: 'Module 1: コアコンセプトとエコシステム' },
      objective: { en: 'Understand what agents are and the tools available.', jp: 'エージェントの定義と利用可能なツール群を理解する。' },
      estimated_hours: 2,
      lessons: [
        { 
          lesson_id: 'ag1-l1', 
          title: { en: 'What is an AI Agent?', jp: 'AIエージェントとは何か' }, 
          subtitle: { en: 'Beyond Chatbots', jp: 'チャットボットを超えた存在' },
          estimated_min: 15,
          sections: [
            {
              id: 's1',
              title: { en: 'The Definition', jp: 'エージェントの定義' },
              content: [
                { type: 'text', style: 'lead', text: { en: 'AI agents combine intelligence with tools to take action on your behalf.', jp: 'AIエージェントは、高度なモデルの知能とツールの利用能力を組み合わせ、ユーザーに代わってアクションを実行するシステムです。' } },
                { type: 'text', text: { en: 'Unlike a pure chatbot, an agent can plan, choose tools, execute steps, and update its own state as it works toward a goal.', jp: '単なるチャットボットと異なり、エージェントは目標達成に向けて計画し、ツールを選択し、手順を実行し、自身の状態を更新できます。' } },
                {
                  type: 'list',
                  style: 'key',
                  items: [
                    { en: 'Goal/Intent: the outcome the agent is trying to achieve.', jp: '目的/意図: エージェントが達成しようとする成果。' },
                    { en: 'Reasoning/Policy: how it decides what to do next.', jp: '推論/ポリシー: 次に何をするかを決める仕組み。' },
                    { en: 'Tools/Actions: APIs, functions, or workflows it can execute.', jp: 'ツール/アクション: 実行可能なAPI、関数、ワークフロー。' },
                    { en: 'State/Memory: context that persists across steps.', jp: '状態/メモリ: ステップを跨いで保持されるコンテキスト。' },
                    { en: 'Feedback/Observation: signals used to adjust the plan.', jp: 'フィードバック/観測: 計画を調整するための信号。' }
                  ]
                },
                { 
                  type: 'mermaid', 
                  chart: 'graph TD\n  User((User)) --> Agent[AI Agent]\n  Agent --> Brain[Model/Reasoning]\n  Agent --> Tools[API/Functions]\n  Brain <--> Tools\n  Agent --> Result[Action/Outcome]',
                  caption: { en: 'The basic structure of an AI Agent', jp: 'AIエージェントの基本構造' }
                },
                {
                  type: 'callout',
                  variant: 'info',
                  title: { en: 'Autonomy is a spectrum', jp: '自律性はグラデーション' },
                  text: { en: 'Most production agents are semi-autonomous with human approval for high-risk actions.', jp: '実運用の多くは半自律型で、高リスクなアクションは人間の承認を挟みます。' }
                }
              ]
            },
            {
              id: 's2',
              title: { en: 'Agents vs Chatbots', jp: 'チャットボットとの違い' },
              content: [
                { type: 'text', text: { en: 'Chatbots focus on conversation. Agents focus on outcomes and can take actions beyond text.', jp: 'チャットボットは会話中心ですが、エージェントは成果中心でテキスト以外の行動も実行できます。' } },
                {
                  type: 'table',
                  headers: [
                    { en: 'Aspect', jp: '観点' },
                    { en: 'Chatbot', jp: 'チャットボット' },
                    { en: 'AI Agent', jp: 'AIエージェント' }
                  ],
                  rows: [
                    [ { en: 'Primary role', jp: '主な役割' }, { en: 'Answer questions', jp: '質問に答える' }, { en: 'Achieve a goal', jp: '目標を達成する' } ],
                    [ { en: 'Tool use', jp: 'ツール利用' }, { en: 'Limited or none', jp: '限定的または無し' }, { en: 'Active and multi-step', jp: '能動的で複数ステップ' } ],
                    [ { en: 'State', jp: '状態管理' }, { en: 'Short context window', jp: '短い文脈' }, { en: 'Persistent memory', jp: '継続的なメモリ' } ],
                    [ { en: 'Success metric', jp: '評価指標' }, { en: 'Response quality', jp: '回答品質' }, { en: 'Task completion', jp: 'タスク完遂' } ]
                  ]
                }
              ]
            },
            {
              id: 's3',
              title: { en: 'The Agent Loop', jp: 'エージェントのループ構造' },
              content: [
                { type: 'text', text: { en: 'Agents iterate through a loop of observing, planning, acting, and reflecting until the goal is met.', jp: 'エージェントは「観測→計画→実行→振り返り」のループを回しながら目標に近づきます。' } },
                {
                  type: 'mermaid',
                  chart: 'flowchart LR\n  Observe[Observe Context] --> Plan[Plan Next Step]\n  Plan --> Act[Use Tools / Execute]\n  Act --> Reflect[Check Result]\n  Reflect --> Observe',
                  caption: { en: 'Continuous improvement loop', jp: '継続的な改善ループ' }
                },
                {
                  type: 'code',
                  language: 'pseudo',
                  code: 'while not goal_met:\n  observe()\n  plan()\n  act_with_tools()\n  reflect_and_update_state()'
                }
              ]
            },
            {
              id: 's4',
              title: { en: 'Practical Use Cases', jp: '実務での活用例' },
              content: [
                { type: 'text', text: { en: 'Agents are best when tasks require multiple steps, external tools, and changing context.', jp: '複数ステップ・外部ツール・変化する文脈が必要なタスクで特に効果を発揮します。' } },
                {
                  type: 'list',
                  items: [
                    { en: 'Customer support triage and follow-up workflows', jp: 'カスタマーサポートの振り分けとフォロー' },
                    { en: 'Data gathering → analysis → report generation', jp: 'データ収集→分析→レポート生成' },
                    { en: 'DevOps incident response with runbooks', jp: 'ランブックに基づく障害対応' },
                    { en: 'Sales research and outbound personalization', jp: '営業リサーチと提案のパーソナライズ' },
                    { en: 'Internal knowledge retrieval and action routing', jp: '社内ナレッジ検索とアクション振り分け' }
                  ]
                },
                {
                  type: 'callout',
                  variant: 'warning',
                  title: { en: 'Guardrails matter', jp: 'ガードレールが重要' },
                  text: { en: 'Define tool permissions, approval steps, and logging before giving agents write access to systems.', jp: 'システムに書き込み権限を与える前に、ツール権限・承認フロー・監査ログを定義しましょう。' }
                }
              ]
            }
          ]
        },
        
      ]
    },
    {
      module_id: 'ag2',
      title: { en: 'Models & Reasoning', jp: 'Module 2: モデルと推論' },
      objective: { en: 'Select the right brain for your agent.', jp: 'エージェントに最適な「脳」を選択する。' },
      estimated_hours: 3,
      lessons: [
        {
          lesson_id: 'ag2-l1',
          title: { en: 'Model Selection Strategy', jp: 'モデル選択の戦略' },
          subtitle: { en: 'Cost, Latency, and Quality', jp: 'コスト、レイテンシ、品質のバランス' },
          estimated_min: 35,
          sections: [
            {
              id: 's1',
              title: { en: 'The Efficiency Frontier', jp: '効率性のフロンティア' },
              content: [
                { type: 'text', text: { en: 'Choosing the right model is about finding the optimal balance for your specific use case.', jp: '適切なモデルを選択することは、特定のユースケースに最適なバランスを見つけることです。' } },
                { type: 'text', text: { en: 'Start with the simplest model that meets quality targets, then scale up only where the task truly needs it.', jp: 'まずは品質目標を満たす最小のモデルから始め、必要なタスクにだけ段階的に強いモデルを使いましょう。' } },
                { type: 'text', text: { en: 'In practice, teams use a multi-vendor portfolio (Gemini, Claude, GPT) and pick by tier: speed, balance, or deep reasoning.', jp: '実務ではGemini / Claude / GPTの複数ベンダーを併用し、「高速」「バランス」「深い推論」の階層で使い分けます。' } },
                {
                  type: 'list',
                  style: 'key',
                  items: [
                    { en: 'Fast/cheap tier: high volume, low latency, simple transforms.', jp: '高速・低コスト層: 高ボリューム、低レイテンシ、単純変換。' },
                    { en: 'Balanced tier: default choice for product UX and medium reasoning.', jp: 'バランス層: UXと品質の標準選択、ミドル推論。' },
                    { en: 'Deep reasoning tier: multi-step planning, tool orchestration, high-stakes tasks.', jp: '深い推論層: 多段計画、ツール連携、高リスク領域。' }
                  ]
                },
                {
                  type: 'table',
                  headers: [
                    { en: 'Tier', jp: '層' },
                    { en: 'Gemini', jp: 'Gemini' },
                    { en: 'Claude', jp: 'Claude' },
                    { en: 'GPT', jp: 'GPT' },
                    { en: 'Best for', jp: '適した用途' }
                  ],
                  rows: [
                    [
                      { en: 'Fast / Cheap', jp: '高速・低コスト' },
                      { en: 'Gemini 2.5 Flash-Lite', jp: 'Gemini 2.5 Flash-Lite' },
                      { en: 'Claude Haiku 4.5', jp: 'Claude Haiku 4.5' },
                      { en: 'GPT‑5 nano', jp: 'GPT‑5 nano' },
                      { en: 'High volume, low latency tasks', jp: '高ボリューム・低レイテンシ' }
                    ],
                    [
                      { en: 'Balanced', jp: 'バランス' },
                      { en: 'Gemini 3 Flash Preview', jp: 'Gemini 3 Flash Preview' },
                      { en: 'Claude Sonnet 4.5', jp: 'Claude Sonnet 4.5' },
                      { en: 'GPT‑5 mini', jp: 'GPT‑5 mini' },
                      { en: 'Product UX and mixed tasks', jp: 'プロダクトUXと混合タスク' }
                    ],
                    [
                      { en: 'Deep Reasoning', jp: '深い推論' },
                      { en: 'Gemini 3 Pro Preview', jp: 'Gemini 3 Pro Preview' },
                      { en: 'Claude Opus 4.5', jp: 'Claude Opus 4.5' },
                      { en: 'GPT‑5.2', jp: 'GPT‑5.2' },
                      { en: 'Multi-step and high-stakes work', jp: '多段推論・高リスク領域' }
                    ]
                  ]
                },
                {
                  type: 'callout',
                  variant: 'tip',
                  title: { en: 'Rule of thumb', jp: '経験則' },
                  text: { en: 'If you cannot define clear success metrics, model upgrades rarely fix the core problem.', jp: '明確な成功指標が定義できない場合、モデルの強化だけでは問題は解決しません。' }
                }
              ]
            },
            {
              id: 's2',
              title: { en: 'Selection Criteria Checklist', jp: '選定基準チェックリスト' },
              content: [
                { type: 'text', text: { en: 'Translate product requirements into measurable model criteria.', jp: 'プロダクト要件を測定可能なモデル基準に落とし込みます。' } },
                {
                  type: 'list',
                  style: 'check',
                  items: [
                    { en: 'Task complexity (single-step vs multi-step reasoning)', jp: 'タスクの複雑性（単発か多段推論か）' },
                    { en: 'Accuracy tolerance and risk of errors', jp: '誤り許容度とリスク' },
                    { en: 'Latency SLA and concurrency needs', jp: 'レイテンシSLAと同時実行数' },
                    { en: 'Cost per task and monthly budget cap', jp: 'タスク単価と月次コスト上限' },
                    { en: 'Tool-use frequency and external call reliability', jp: 'ツール利用頻度と外部呼び出しの信頼性' },
                    { en: 'Context length and knowledge freshness requirements', jp: 'コンテキスト長と情報鮮度の要件' }
                  ]
                }
              ]
            },
            {
              id: 's3',
              title: { en: 'Decision Matrix', jp: '意思決定マトリクス' },
              content: [
                {
                  type: 'table',
                  headers: [
                    { en: 'Signal', jp: 'シグナル' },
                    { en: 'Typical Need', jp: '典型ニーズ' },
                    { en: 'Suggested Model', jp: '推奨モデル' }
                  ],
                  rows: [
                    [ { en: 'High volume, simple tasks', jp: '高ボリューム・単純タスク' }, { en: 'Low latency, low cost', jp: '低レイテンシ・低コスト' }, { en: 'Fast tier', jp: '高速層' } ],
                    [ { en: 'Balanced UX and quality', jp: 'UXと品質のバランス' }, { en: 'Stable production performance', jp: '安定した本番性能' }, { en: 'Balanced tier', jp: 'バランス層' } ],
                    [ { en: 'Complex reasoning', jp: '高度な推論' }, { en: 'Multi-step planning', jp: '多段の計画' }, { en: 'Reasoning tier', jp: '推論層' } ],
                    [ { en: 'High-stakes outputs', jp: '高リスク出力' }, { en: 'Extra validation needed', jp: '追加検証が必要' }, { en: 'Reasoning tier + verification', jp: '推論層 + 検証' } ]
                  ]
                }
              ]
            },
            {
              id: 's4',
              title: { en: 'Open-Source Model Options', jp: 'オープンソースモデルの選択肢' },
              content: [
                { type: 'text', text: { en: 'Open-source models are strongest when you need data residency, customization, or predictable per-token cost at scale.', jp: 'オープンソースモデルは「データ主権」「カスタマイズ」「大規模時のコスト予測性」が必要な場合に強みを発揮します。' } },
                {
                  type: 'table',
                  headers: [
                    { en: 'Family', jp: 'ファミリー' },
                    { en: 'Strengths', jp: '強み' },
                    { en: 'Tradeoffs', jp: 'トレードオフ' },
                    { en: 'Deployment', jp: '運用形態' }
                  ],
                  rows: [
                    [
                      { en: 'Llama', jp: 'Llama' },
                      { en: 'Broad ecosystem, strong general reasoning', jp: '幅広いエコシステム、汎用推論に強い' },
                      { en: 'Requires infra + safety tuning', jp: 'インフラ/安全性調整が必要' },
                      { en: 'Self-host, VPC, managed OSS service', jp: '自前ホスト / VPC / OSSマネージド' }
                    ],
                    [
                      { en: 'Mistral / Mixtral', jp: 'Mistral / Mixtral' },
                      { en: 'Fast, strong coding / tool-use', jp: '高速、コード・ツール利用に強い' },
                      { en: 'Model selection and routing adds complexity', jp: 'モデル選定とルーティングが複雑' },
                      { en: 'Self-host, optimized inference stacks', jp: '自前ホスト / 推論最適化' }
                    ],
                    [
                      { en: 'Qwen', jp: 'Qwen' },
                      { en: 'Strong multilingual coverage', jp: '多言語対応が強い' },
                      { en: 'Benchmark parity varies by task', jp: 'タスクで性能のばらつき' },
                      { en: 'Self-host, regional cloud options', jp: '自前ホスト / 地域クラウド' }
                    ]
                  ]
                },
                {
                  type: 'list',
                  style: 'key',
                  items: [
                    { en: 'Use OSS when data cannot leave your environment.', jp: 'データを外部に出せない場合はOSSが有効。' },
                    { en: 'Fine-tune for domain language, but keep a fallback to a stronger API model.', jp: 'ドメイン特化は微調整、ただし高性能APIへのフォールバックも残す。' },
                    { en: 'Budget for infra, monitoring, and safety reviews.', jp: 'インフラ・監視・安全性レビューのコストも見積もる。' }
                  ]
                }
              ]
            },
            {
              id: 's5',
              title: { en: 'Routing & Fallback Strategy', jp: 'ルーティングとフォールバック' },
              content: [
                { type: 'text', text: { en: 'Use a lightweight model first, then escalate only when confidence or quality is low.', jp: '軽量モデルで開始し、確信度や品質が不足する場合のみ上位モデルへ昇格します。' } },
                {
                  type: 'code',
                  language: 'pseudo',
                  code: 'result = fast_model(task)  # e.g., Flash‑Lite / Haiku / GPT‑4o mini\nif confidence_low(result) or requires_reasoning(task):\n  result = balanced_model(task)  # e.g., Flash / Sonnet / GPT‑4o\nif high_risk(task) or multi_step(task):\n  result = reasoning_model(task)  # e.g., Pro / Opus / advanced GPT\nreturn result'
                },
                {
                  type: 'callout',
                  variant: 'warning',
                  title: { en: 'Avoid model thrashing', jp: 'モデルの往復を避ける' },
                  text: { en: 'Too many escalations increase latency and cost. Set clear thresholds.', jp: '昇格を繰り返すとレイテンシとコストが増大します。明確な閾値を設定しましょう。' }
                }
              ]
            },
            {
              id: 's6',
              title: { en: 'Evaluation & Monitoring', jp: '評価とモニタリング' },
              content: [
                { type: 'text', text: { en: 'Selection is not a one-time choice. Monitor and iterate with real usage data.', jp: 'モデル選定は一度きりではありません。実運用データで継続的に改善します。' } },
                {
                  type: 'list',
                  items: [
                    { en: 'Success rate and completion time', jp: '成功率と完了時間' },
                    { en: 'Tool-use accuracy and error recovery', jp: 'ツール利用の正確性と復旧率' },
                    { en: 'Hallucination incidents and user escalations', jp: '幻覚発生率とユーザーエスカレーション' },
                    { en: 'Cost per task and total spend', jp: 'タスク単価と総コスト' }
                  ]
                },
                {
                  type: 'callout',
                  variant: 'info',
                  title: { en: 'Golden set', jp: 'ゴールデンセット' },
                  text: { en: 'Maintain a fixed evaluation set to compare model changes over time.', jp: '固定の評価セットを維持し、モデル変更の影響を比較しましょう。' }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      module_id: 'ag3',
      title: { en: 'Tools & Grounding (RAG)', jp: 'Module 3: ツールとグラウンディング (RAG)' },
      objective: { en: 'Connect agents to the real world.', jp: 'エージェントを現実の世界と接続する。' },
      estimated_hours: 4,
      lessons: [
        {
          lesson_id: 'ag3-l1',
          title: { en: 'Grounding with RAG', jp: 'RAGによるグラウンディング' },
          subtitle: { en: 'Verifiable accuracy', jp: '検証可能な正確性' },
          estimated_min: 30,
          sections: [
            {
              id: 's1',
              title: { en: 'How Grounding Works', jp: 'グラウンディングの仕組み' },
              content: [
                { type: 'text', text: { en: 'Grounding connects the model to real-time, verifiable data sources like Vertex AI Search.', jp: 'グラウンディングは、モデルをVertex AI Searchのようなリアルタイムで検証可能なデータソースに接続します。' } },
                {
                   type: 'mermaid',
                   chart: 'graph LR\n  Q[User Query] --> R[Retrieval]\n  DB[(Data Source)] --> R\n  R --> P[Prompt + Context]\n  P --> LLM[Model]\n  LLM --> A[Grounded Answer]',
                   caption: { en: 'RAG Architecture', jp: 'RAGのアーキテクチャ' }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      module_id: 'ag4',
      title: { en: 'AgentOps & Orchestration', jp: 'Module 4: AgentOpsとオーケストレーション' },
      objective: { en: 'Manage and scale agent workforces.', jp: 'エージェント・ワークフォースの管理とスケーリング。' },
      estimated_hours: 3,
      lessons: [
        { lesson_id: 'ag4-l1', title: { en: 'MCP and A2A Protocol', jp: 'MCPとA2Aプロトコル' }, subtitle: { en: 'Interoperability', jp: '相互運用性' }, estimated_min: 20, sections: [] },
        { lesson_id: 'ag4-l2', title: { en: 'Evaluation & Monitoring', jp: '評価とモニタリング' }, subtitle: { en: 'AgentOps', jp: 'AgentOpsの実践' }, estimated_min: 30, sections: [] }
      ]
    }
  ],
  ui_template_id: 'doc_chapter',
  duration: '12 hours',
  modelUsed: 'pro'
};

// --- UTILS ---

let activeDemoData = PYTHON_DEMO_DATA;

const selectDemoByPrompt = (message: string) => {
  const m = message.toLowerCase();
  if (m.includes('art') || m.includes('美術') || m.includes('芸術')) {
    activeDemoData = ART_DEMO_DATA;
  } else if (m.includes('unity') || m.includes('game') || m.includes('ゲーム')) {
    activeDemoData = UNITY_DEMO_DATA;
  } else if (m.includes('agent') || m.includes('エージェント') || m.includes('startup')) {
    activeDemoData = AI_AGENTS_DEMO_DATA;
  } else {
    activeDemoData = PYTHON_DEMO_DATA;
  }
};;

const normalizeGeneratedCourse = (raw: any): GeneratedCourse => {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid curriculum payload.');
  }

  const courseData = raw.course || raw.content_json || raw;
  const curriculumContent = courseData.content || courseData;

  const firstLesson = curriculumContent?.modules?.[0]?.lessons?.[0];
  const hasNewFormat = firstLesson && (
    Array.isArray(firstLesson.sections) ||  
    (typeof firstLesson.title === 'object' && firstLesson.title?.en)
  );

  if (hasNewFormat) {
    const createdAt = raw.created_at || courseData.created_at ? new Date(raw.created_at || courseData.created_at) : new Date();

    const chapters = (curriculumContent.modules || []).flatMap((module: any, mi: number) =>
      (module.lessons || []).map((lesson: any, li: number) => ({
        id: lesson.lesson_id || lesson.id || `m${mi}-l${li}`,
        title: typeof lesson.title === 'object' ? lesson.title.jp || lesson.title.en : lesson.title,
        duration: lesson.reading_time || (lesson.estimated_min ? `${lesson.estimated_min}分` : '10分'),
        type: 'ドキュメント',
        content: typeof lesson.subtitle === 'object' ? lesson.subtitle.jp || lesson.subtitle.en : (lesson.summary || lesson.subtitle || ''),
        _lessonData: lesson,
        _moduleIndex: mi,
        _lessonIndex: li
      }))
    );

    return {
      id: raw.id || courseData.id || curriculumContent.curriculum_id || activeDemoData.id,
      title: typeof curriculumContent.title === 'object' ? curriculumContent.title.jp || curriculumContent.title.en : curriculumContent.title,
      description: typeof curriculumContent.description === 'object' ? curriculumContent.description.jp || curriculumContent.description.en : curriculumContent.description,
      chapters,
      modules: curriculumContent.modules,
      ui_template_id: curriculumContent.ui_template_id || 'doc_chapter',
      createdAt,
      duration: `${Math.round((curriculumContent.modules || []).reduce((sum: number, m: any) => sum + (m.estimated_hours || 0), 0))}時間`,
      modelUsed: 'pro',
      preferredTemplate: 'doc_chapter'
    } as any;
  }

  const normalized = isVibeCodingCurriculum(curriculumContent)
    ? mapVibeCodingToGeneratedCourse(curriculumContent)
    : (curriculumContent as GeneratedCourse);

  const createdAt = raw.created_at || courseData.created_at ? new Date(raw.created_at || courseData.created_at) : new Date();
  const chapters = normalized.chapters || (normalized as any).modules || [];
  const modules = curriculumContent.modules || (normalized as any).modules;

  return {
    ...normalized,
    chapters,
    modules,
    id: raw.id || courseData.id || normalized.id,
    title: typeof normalized.title === 'object' ? (normalized.title as any).jp || (normalized.title as any).en : normalized.title,
    description: typeof normalized.description === 'object' ? (normalized.description as any).jp || (normalized.description as any).en : normalized.description,
    createdAt
  };
};

export const fetchGeneratedCourses = async (): Promise<Course[]> => {
  if (USE_DEMO_MODE) {
    // Strictly return only demo courses when in demo mode
    const demoItems = [
      { id: PYTHON_DEMO_DATA.id, title: PYTHON_DEMO_DATA.title.jp, desc: PYTHON_DEMO_DATA.description.jp, img: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800' },
      { id: ART_DEMO_DATA.id, title: ART_DEMO_DATA.title.jp, desc: ART_DEMO_DATA.description.jp, img: 'https://images.unsplash.com/photo-1577720580479-7d839d829c73?auto=format&fit=crop&q=80&w=1000' },
      { id: UNITY_DEMO_DATA.id, title: UNITY_DEMO_DATA.title.jp, desc: UNITY_DEMO_DATA.description.jp, img: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&q=80&w=800' },
      { id: AI_AGENTS_DEMO_DATA.id, title: AI_AGENTS_DEMO_DATA.title.jp, desc: AI_AGENTS_DEMO_DATA.description.jp, img: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800' }
    ];

    return demoItems.map(d => ({
      id: d.id,
      title: d.title,
      description: d.desc,
      category: 'AI Demo',
      progress: 0,
      totalLessons: 0,
      completedLessons: 0,
      thumbnail: d.img,
      color: 'bg-indigo-500',
      source: 'generated'
    }));
  }

  // Real DB fetch (skipped in demo mode)
  let curricula: any[] = [];
  try {
    const response = await fetch(`${API_BASE}/curricula`);
    if (response.ok) {
      const payload: CurriculumListResponse = await response.json();
      curricula = payload.curricula || [];
    }
  } catch (err) {
    console.warn("Failed to fetch curricula from DB", err);
  }

  return curricula.map(row => ({
    id: row.id,
    title: row.title,
    description: row.description || '',
    category: row.category || 'AI Generated',
    progress: row.progress || 0,
    totalLessons: row.total_lessons || 0,
    completedLessons: row.completed_lessons || 0,
    thumbnail: row.thumbnail || 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&q=80&w=800',
    color: row.color || 'bg-indigo-500',
    source: row.source || 'generated'
  }));
};

export const fetchGeneratedCourseById = async (id: string): Promise<GeneratedCourse> => {
  if (USE_DEMO_MODE) {
    if (id === PYTHON_DEMO_DATA.id) return normalizeGeneratedCourse(PYTHON_DEMO_DATA);
    if (id === ART_DEMO_DATA.id) return normalizeGeneratedCourse(ART_DEMO_DATA);
    if (id === UNITY_DEMO_DATA.id) return normalizeGeneratedCourse(UNITY_DEMO_DATA);
    if (id === AI_AGENTS_DEMO_DATA.id) return normalizeGeneratedCourse(AI_AGENTS_DEMO_DATA);
    // If not a demo ID but in demo mode, fallback to Python demo
    return normalizeGeneratedCourse(PYTHON_DEMO_DATA);
  }

  const response = await fetch(`${API_BASE}/curricula/${id}`);
  if (!response.ok) {
    throw new Error('Failed to load curriculum.');
  }
  const payload: CurriculumDetailResponse = await response.json();
  if (!payload.curriculum && !payload.course) throw new Error(payload.error || 'Curriculum not found.');

  return normalizeGeneratedCourse(payload);
};

export const saveGeneratedCourse = async (course: GeneratedCourse): Promise<void> => {
  const response = await fetch('/api/curricula', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ course }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || 'Failed to save curriculum.');
  }
};

// --- V2 AI Chat & Decision ---

export const sendAiChat = async (message: string, sessionId?: string, attachments: any[] = []) => {
  if (USE_DEMO_MODE) {
    selectDemoByPrompt(message);
    await new Promise(resolve => setTimeout(resolve, 2500)); 
    
    const title = activeDemoData.title.jp;
    const desc = activeDemoData.description.jp;

    if (!sessionId) {
      return {
        session_id: DEMO_SESSION_ID,
        curriculum_id: activeDemoData.id,
        message: `「${message}」というテーマ、素晴らしいですね！\n\nあなた専用の「${title}」の学習プランを提案させていただきます。\n\n### 学習要件案\n- **対象レベル**: 初心者からスタート\n- **ゴール**: ${desc}\n- **形式**: 図解とインタラクティブな解説\n\nこの方向性で進めてよろしいでしょうか？`,
        pending_approval: 'requirements',
        agent_logs: [
          { agent: 'orchestrator', message: '新規セッションを開始しました。', status: 'success' },
          { agent: 'analyzer', message: '入力内容の分析を完了。学習目標の特定に成功。', status: 'success' },
          { agent: 'interviewer', message: '要件ドラフトを生成しました。', status: 'success' }
        ]
      };
    }
    return {
      session_id: sessionId || DEMO_SESSION_ID,
      curriculum_id: activeDemoData.id,
      message: "ありがとうございます。ご要望を取り入れながら調整を進めます。\n\n確認のため、一度現状の内容で承認プロセスに進んでいただけますか？",
      pending_approval: 'requirements',
      agent_logs: [
        { agent: 'orchestrator', message: 'ユーザー入力を解析中...', status: 'success' },
        { agent: 'interviewer', message: '修正要件を取り込みました。', status: 'success' }
      ]
    };
  }

  const response = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId, attachments }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Chat failed.');
  }
  return await response.json();
};

export const sendAiDecision = async (curriculumId: string, sessionId: string, stage: string, decision: 'approved' | 'revise', feedbackText?: string) => {
  if (USE_DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Maintain active demo based on curriculumId
    if (curriculumId === ART_DEMO_DATA.id) activeDemoData = ART_DEMO_DATA;
    else if (curriculumId === UNITY_DEMO_DATA.id) activeDemoData = UNITY_DEMO_DATA;
    else activeDemoData = PYTHON_DEMO_DATA;

    if (decision === 'revise') {
      return {
        status: 'revised',
        message: "フィードバックありがとうございます。内容を修正しました。\n再度ご確認ください。",
        pending_approval: stage,
        agent_logs: [
          { agent: 'orchestrator', message: `修正リクエストを受信: ${stage}`, status: 'success' },
          { agent: stage === 'requirements' ? 'interviewer' : stage === 'roadmap' ? 'architect' : 'writer', message: 'フィードバックに基づき再構成中...', status: 'success' }
        ]
      };
    }
    if (stage === 'requirements') {
      return {
        session_id: sessionId,
        curriculum_id: activeDemoData.id,
        message: `要件を確定しました。続いて、具体的な学習ロードマップを作成しました。\n\n### 🗺️ 学習ロードマップ案: ${activeDemoData.title.jp}\n\n${activeDemoData.modules.map((m: any, i: number) => `**Module ${i+1}: ${m.title.jp}**\n- ${m.objective.jp}`).join('\n\n')}\n\nこの構成で進めてよろしいでしょうか？`,
        pending_approval: 'roadmap',
        agent_logs: [
          { agent: 'orchestrator', message: '要件が承認されました。', status: 'success' },
          { agent: 'architect', message: 'カリキュラムの構造を設計中...', status: 'success' },
          { agent: 'architect', message: 'モジュール間の依存関係を整理しました。', status: 'success' }
        ]
      };
    }
    if (stage === 'roadmap') {
      return {
        session_id: sessionId,
        curriculum_id: activeDemoData.id,
        message: "ロードマップを確定しました。これに基づき、詳細コンテンツを執筆しました。\n\n### 📖 生成されたカリキュラム詳細\n\n" + 
                 activeDemoData.modules.flatMap((m: any) => m.lessons.map((l: any) => `**- ${l.title.jp}**`)).join('\n') + 
                 "\n\n内容を確認し、問題なければ「最終承認」を行ってください。あなたのライブラリに保存されます。",
        pending_approval: 'curriculum',
        agent_logs: [
          { agent: 'orchestrator', message: 'ロードマップが承認されました。', status: 'success' },
          { agent: 'writer', message: '詳細コンテンツの執筆を開始...', status: 'success' },
          { agent: 'reviewer', message: '生成されたコンテンツの品質チェックを実施中...', status: 'success' },
          { agent: 'reviewer', message: '品質基準をクリアしました。', status: 'success' }
        ]
      };
    }
    if (stage === 'curriculum') {
      return {
        status: 'approved',
        curriculum_id: activeDemoData.id,
        message: "承認ありがとうございます。\n\nあなた専用のコースを生成し、ライブラリに保存しました！",
        agent_logs: [
          { agent: 'orchestrator', message: '最終承認を確認。', status: 'success' },
          { agent: 'orchestrator', message: 'コースデータをデータベースに永続化しました。', status: 'success' }
        ]
      };
    }
  }

  const response = await fetch(`${API_BASE}/ai/curricula/${curriculumId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, stage, decision, feedback_text: feedbackText }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Decision failed.');
  }
  return await response.json();
};

export const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed.');
  }
  return await response.json();
};
