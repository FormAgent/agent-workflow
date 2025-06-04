# 🚀 インテリジェント・ワークフローエンジン

DAG（有向非環グラフ）タスクスケジューリング、動的タスク生成、インテリジェント戦略システムをサポートする強力なワークフローエンジンです。

[English](./README.md) | 日本語 | [中文](./README.ZH.md)

## ✨ コア機能

### 🔄 **強力なDAGタスクスケジューリング**
- 自動タスク依存関係解析とトポロジカルソート
- インテリジェント並列実行最適化
- 循環依存関係検出
- エレガントなエラーハンドリングと復旧

### 🧠 **インテリジェント動的戦略システム**
- 条件トリガータスク生成
- タスク結果に基づく動的プランニング
- コンテキスト変更の監視
- LLM駆動のインテリジェントタスクプランニング

### ⚡ **高性能実行エンジン**
- O(V+E)複雑度のトポロジカルソート
- 依存関係のないタスクの自動並列実行
- メモリ最適化と遅延初期化
- 完全な実行監視とメトリクス

## 🚀 クイックスタート

### インストール

```bash
npm install agent-workflow
# または
yarn add agent-workflow  
# または
pnpm add agent-workflow
```

### 基本的な使用法 - シンプルなタスクフロー

```typescript
import { WorkflowBuilder } from 'agent-workflow';

// タスクの定義
class DataProcessTask implements DAGTask {
  name = 'dataProcess';
  async execute(input: TaskInput) {
    const processed = input.rawData.toUpperCase();
    return { ...input, processed };
  }
}

class AnalysisTask implements DAGTask {
  name = 'analysis';
  async execute(input: TaskInput) {
    const analysis = `分析結果: ${input.processed}`;
    return { ...input, analysis };
  }
}

// 🔥 シンプルで強力 - 1行で完了
const result = await WorkflowBuilder
  .create()
  .addTask(new DataProcessTask())
  .addTask(new AnalysisTask())
  .build()
  .execute({ rawData: 'hello world' });

console.log(result.data.analysis); // "分析結果: HELLO WORLD"
```

### インテリジェント動的ワークフロー - 条件タスク生成

```typescript
const workflow = WorkflowBuilder
  .create()
  .addTask(new CodeScanTask())
  .whenCondition(
    // TypeScriptファイルが発見された場合
    (context) => {
      const fileTypes = context.get('discoveredTypes') as string[];
      return fileTypes?.includes('typescript');
    },
    // TS関連タスクを自動生成
    async (context) => [
      new TypeCheckTask(),
      new TSLintTask(),
      new TypeCoverageTask()
    ]
  )
  .build();

const result = await workflow.execute({ projectPath: './src' });
console.log(`インテリジェントに ${result.dynamicTasksGenerated} 個のタスクを生成しました`);
```

### 結果に基づく動的プランニング

```typescript
const workflow = WorkflowBuilder
  .create()
  .addTask(new SecurityScanTask())
  .onTaskComplete('securityScan', async (result, context) => {
    const tasks = [];
    const issues = result.vulnerabilities || [];
    
    // スキャン結果に基づいて修復タスクを動的生成
    if (issues.includes('xss')) {
      tasks.push(new XSSFixTask());
    }
    if (issues.includes('sql-injection')) {
      tasks.push(new SQLInjectionFixTask());
    }
    
    return tasks;
  })
  .build();
```

### LLM駆動のインテリジェントワークフロー

```typescript
// 🤖 AI自動タスクフロープランニング
const result = await WorkflowBuilder
  .create()
  .withLLMModel('gpt-4-turbo')
  .withDynamicPlanning('このVueプロジェクトを分析し、コード品質レポートを生成してください')
  .build()
  .execute({ projectPath: './my-vue-app' });

console.log('AI自動生成の分析レポート:', result.data);
```

## 🎛️ 高度な設定

### 完全な設定例

```typescript
const workflow = WorkflowBuilder
  .create()
  .withConfig({
    llmModel: 'gpt-4-turbo',
    retryAttempts: 3,
    timeoutMs: 60000,
    maxDynamicSteps: 20
  })
  .addTask(new InitTask())
  .addDynamicStrategy({
    name: 'error_recovery',
    condition: (context) => context.get('hasError') === true,
    generator: async (context) => [new ErrorRecoveryTask()],
    priority: 10, // 高優先度
    once: true    // 一回のみ実行
  })
  .build();
```

### タスク依存関係管理

```typescript
const task1 = new DataFetchTask();
const task2 = new DataProcessTask();
task2.dependsOn = [task1]; // 依存関係の宣言

const task3 = new DataAnalysisTask();
task3.dependsOn = [task1, task2]; // 複数依存関係

const workflow = WorkflowBuilder
  .create()
  .addTasks([task1, task2, task3]) // 依存関係順序を自動処理
  .build();
```

## 🔧 動的戦略システム

動的戦略はワークフローエンジンのインテリジェントコアであり、実行過程の条件に基づいて**新しいタスクを動的生成**し、ワークフローに「自適応」能力を持たせます。

### 🎯 動的戦略アーキテクチャ

```typescript
interface DynamicStrategy {
  name: string;                                           // 戦略識別子
  condition: (context: WorkflowContext, result?: any) => boolean;  // トリガー条件
  generator: (context: WorkflowContext) => Promise<DAGTask[]>;     // タスクジェネレーター
  priority?: number;                                      // 実行優先度（数値が大きいほど優先）
  once?: boolean;                                         // 一回限り実行フラグ
}
```

### 📋 戦略パラメータ詳細説明

#### **name: string**
- **役割**: 戦略の一意識別子
- **用途**: 
  - ログ出力と監視表示
  - `once: true` 時の実行済み戦略追跡
  - デバッグと問題調査

#### **condition: (context, result?) => boolean**
- **役割**: 戦略がいつトリガーされるかを決定
- **動作メカニズム**: 
  - 各実行ステップ後に呼び出される
  - 現在のワークフローコンテキストを受け取る
  - `true` を返すと戦略がトリガー、`false` でスキップ

#### **generator: (context) => Promise<DAGTask[]>**
- **役割**: 新しいタスクを動的生成
- **動作メカニズム**:
  - 条件が満たされた時にこの関数が呼び出される
  - 現在のコンテキストをパラメータとして受け取る
  - ワークフローに追加する新しいタスク配列を返す

#### **priority?: number (デフォルト: 0)**
- **役割**: 戦略実行順序の制御
- **動作メカニズム**:
  ```typescript
  // 戦略は優先度の高い順にソートされて実行
  const sortedStrategies = [...strategies].sort(
    (a, b) => (b.priority || 0) - (a.priority || 0)
  );
  ```
- **典型的な使用法**:
  - `priority: 10` - 高優先度（エラー処理、重要タスク）
  - `priority: 5` - 中優先度（通常のビジネスロジック）
  - `priority: 1` - 低優先度（クリーンアップ、ログ記録）

#### **once?: boolean (デフォルト: false)**
- **役割**: 戦略が一度だけ実行されるかを制御
- **動作メカニズム**:
  ```typescript
  // 使用済みの一回限り戦略をスキップ
  if (strategy.once && this.usedStrategies.has(strategy.name)) {
    continue;
  }
  
  // 戦略を使用済みにマーク
  if (strategy.once) {
    this.usedStrategies.add(strategy.name);
  }
  ```
- **使用シナリオ**:
  - `once: true` - 初期化、エラー復旧、一回限りの設定
  - `once: false` - 継続監視、繰り返しタスク

### 🔄 戦略実行フロー

```mermaid
graph TD
    A[タスク実行完了] --> B[全戦略を評価]
    B --> C[優先度順にソート]
    C --> D[戦略が既に使用済みかチェック(once)]
    D --> E{条件は満たされているか?}
    E -->|はい| F[ジェネレーター実行]
    E -->|いいえ| G[戦略をスキップ]
    F --> H[新しいタスクをキューに追加]
    H --> I{once=true?}
    I -->|はい| J[使用済みにマーク]
    I -->|いいえ| K[再利用可能]
    J --> L[次の戦略に続行]
    K --> L
    G --> L
```

### 1. 条件戦略 - `whenCondition()`

```typescript
.whenCondition(
  (context) => context.get('environment') === 'production',
  async (context) => [
    new SecurityAuditTask(),
    new PerformanceTestTask()
  ]
)
```

### 2. タスク完了戦略 - `onTaskComplete()`

```typescript
.onTaskComplete('codeAnalysis', async (result, context) => {
  const tasks = [];
  
  if (result.complexity > 0.8) {
    tasks.push(new RefactorSuggestionTask());
  }
  
  if (result.coverage < 0.7) {
    tasks.push(new TestGenerationTask());
  }
  
  return tasks;
})
```

### 3. コンテキスト変更戦略 - `onContextChange()`

```typescript
.onContextChange('framework', async (framework, context) => {
  switch (framework) {
    case 'react':
      return [new ReactLintTask(), new ReactTestTask()];
    case 'vue':
      return [new VueLintTask(), new VueTestTask()];
    case 'angular':
      return [new AngularLintTask(), new AngularTestTask()];
    default:
      return [new GenericLintTask()];
  }
})
```

### 4. カスタム戦略 - `addDynamicStrategy()`

```typescript
.addDynamicStrategy({
  name: 'performance_optimization',
  condition: (context, result) => {
    const metrics = context.get('performanceMetrics');
    return metrics?.loadTime > 3000; // 読み込み時間が3秒超過
  },
  generator: async (context) => [
    new ImageOptimizationTask(),
    new CodeSplittingTask(),
    new CacheOptimizationTask()
  ],
  priority: 5,
  once: false // 複数回トリガー可能
})
```

### 💡 実際の応用シナリオ

#### 🚨 エラー復旧戦略
```typescript
.addDynamicStrategy({
  name: 'error_recovery',
  condition: (context) => context.get('hasError') === true,
  generator: async (context) => [
    new ErrorAnalysisTask(),     // エラー分析
    new ErrorFixTask(),          // エラー修復  
    new ValidationTask()         // 修復検証
  ],
  priority: 10,  // 最高優先度、エラー時は優先処理
  once: true     // 一回限り、無限エラーループを避ける
})
```

#### 🔍 パフォーマンス監視戦略
```typescript
.addDynamicStrategy({
  name: 'performance_monitoring', 
  condition: (context) => {
    const metrics = context.get('performanceMetrics');
    return metrics?.loadTime > 5000; // 5秒超過
  },
  generator: async (context) => [
    new PerformanceOptimizationTask(),
    new CacheOptimizationTask()
  ],
  priority: 5,   // 中優先度
  once: false    // 繰り返しトリガー可能、継続監視
})
```

#### 🧪 テストカバレッジ戦略
```typescript
.addDynamicStrategy({
  name: 'test_coverage_boost',
  condition: (context) => {
    const coverage = context.get('testCoverage');
    return coverage < 0.8; // カバレッジが80%未満
  },
  generator: async (context) => [
    new TestGenerationTask(),
    new CoverageAnalysisTask()
  ],
  priority: 3,   // 低めの優先度
  once: true     // 一回限りの生成で十分
})
```

### 🎯 戦略設計ベストプラクティス

#### 1. **優先度設計原則**
```typescript
// 緊急事態 - 最高優先度
priority: 10  // エラー復旧、セキュリティ問題
priority: 8   // データ整合性、重要ビジネス

// 通常業務 - 中優先度  
priority: 5   // 通常のビジネスロジック
priority: 3   // 最適化改善

// 補助機能 - 低優先度
priority: 1   // ログ記録、クリーンアップタスク
priority: 0   // 統計、レポート
```

#### 2. **onceパラメータ選択**
```typescript
// once: true 適用シナリオ
- 初期化タスク
- エラー復旧  
- 一回限りの設定
- データ移行

// once: false 適用シナリオ  
- パフォーマンス監視
- データ同期
- 継続最適化
- 定期チェック
```

#### 3. **条件設計のコツ**
```typescript
// シンプルなブール条件
condition: (context) => context.get('needsOptimization') === true

// 複雑なロジック条件
condition: (context) => {
  const metrics = context.get('metrics');
  const config = context.get('config');
  return metrics?.errorRate > 0.05 && config?.env === 'production';
}

// 実行履歴に基づく条件
condition: (context) => {
  const history = context.getExecutionHistory();
  return history.some(h => h.status === 'failed');
}
```

この動的戦略システムにより、ワークフローは**自適応能力**を持ち、実行過程の実際の状況に基づいてインテリジェントに実行プランを調整できます。これはワークフローエンジンの核心インテリジェント機能です！🚀

## 📊 実行監視と結果

### 詳細な実行結果

```typescript
interface WorkflowResult {
  success: boolean;                              // 成功したか
  data?: any;                                   // 最終データ
  error?: Error;                                // エラー情報
  executionTime: number;                        // 総実行時間(ms)
  taskResults: Map<string, TaskExecutionResult>; // 各タスクの詳細結果
  dynamicTasksGenerated?: number;               // 動的生成されたタスク数
  totalSteps?: number;                          // 総実行ステップ数
}

// 使用例
const result = await workflow.execute();

if (result.success) {
  console.log(`✅ ワークフローが正常に完了しました`);
  console.log(`📊 実行時間: ${result.executionTime}ms`);
  console.log(`🎯 動的生成タスク: ${result.dynamicTasksGenerated}個`);
  console.log(`📈 総実行ステップ数: ${result.totalSteps}`);
  
  // 具体的なタスク結果を確認
  result.taskResults.forEach((taskResult, taskName) => {
    console.log(`タスク ${taskName}: ${taskResult.status} (${taskResult.duration}ms)`);
  });
} else {
  console.error(`❌ ワークフロー失敗:`, result.error?.message);
}
```

### 実行履歴追跡

```typescript
const workflow = WorkflowBuilder.create()
  .addTask(new TaskA())
  .addTask(new TaskB())
  .build();

await workflow.execute();

// 詳細な実行履歴を取得
const history = workflow.getContext().getExecutionHistory();
history.forEach(record => {
  console.log(`${record.taskName}: ${record.status} (${record.duration}ms)`);
});
```

## 🎯 ベストプラクティス

### 1. タスク設計原則

```typescript
class WellDesignedTask implements DAGTask {
  constructor(
    public name: string,
    private config: TaskConfig
  ) {}

  async execute(input: TaskInput): Promise<Record<string, any>> {
    // ✅ 入力検証
    this.validateInput(input);
    
    // ✅ 冪等性設計
    if (this.isAlreadyProcessed(input)) {
      return this.getCachedResult(input);
    }
    
    // ✅ コアビジネスロジック
    const result = await this.processData(input);
    
    // ✅ 結果キャッシュ
    this.cacheResult(input, result);
    
    return result;
  }
}
```

### 2. エラーハンドリング戦略

```typescript
const robustWorkflow = WorkflowBuilder
  .create()
  .withConfig({ 
    retryAttempts: 3,
    timeoutMs: 30000 
  })
  .addTask(new RiskyTask())
  .addDynamicStrategy({
    name: 'error_fallback',
    condition: (context) => context.get('lastTaskFailed'),
    generator: async (context) => [new FallbackTask()],
    priority: 1
  })
  .build();
```

### 3. パフォーマンス最適化提案

- **並列最適化**: 不要なタスク依存関係を削減
- **メモリ管理**: 大きなオブジェクトの適時クリーンアップ
- **遅延読み込み**: 重量級コンポーネントの必要時初期化
- **戦略優先度**: 戦略実行順序の適切な設定

## 📚 その他の例

実際の使用例については [examples](./examples) ディレクトリをご確認ください：

### 🚀 例の実行

```bash
# 1. 基本ワークフロー例 - シンプルなタスク依存関係と実行を展示
npx tsx examples/basic-workflow.ts

# 2. 動的戦略例 - 4つの動的戦略の実際応用を展示
npx tsx examples/dynamic-strategies.ts

# 3. LLM統合例 - AI駆動ワークフロー（シミュレーション）を展示
npx tsx examples/llm-integration.ts

# 4. エラーハンドリング例 - 障害耐性機構と復旧戦略を展示
npx tsx examples/error-handling.ts

# 5. ストリーミングワークフロー例 - リアルタイムストリーミングデータ返却を展示
npx tsx examples/streaming-workflow.ts

# 🔥 新機能：高度なAI機能
# 6. AI SDKストリーミング例 - AI SDK互換ワークフローを展示
npx tsx examples/ai-sdk-streaming-workflow.ts

# 7. 簡素化Agent API例 - OpenAI Agent SDK互換インターフェースを展示
npx tsx examples/simple-agent-style.ts

# 8. AIプランナー例 - インテリジェントワークフロー生成を展示
npx tsx examples/ai-planner-workflow.ts
```

### 📖 例の説明

| 例ファイル | 機能展示 | 学習ポイント |
|---------|---------|----------|
| **basic-workflow.ts** | • タスク定義と依存関係<br>• ワークフロー構築<br>• 結果取得 | WorkflowBuilderの基本的な使い方をクイックマスター |
| **dynamic-strategies.ts** | • 4つの動的戦略<br>• 条件トリガー<br>• インテリジェントタスク生成 | 動的ワークフローのコア機能をマスター |
| **llm-integration.ts** | • AIタスクプランニング<br>• ストリーミング処理<br>• インテリジェント決定 | LLM駆動ワークフローアプリケーションの理解 |
| **error-handling.ts** | • エラーハンドリング<br>• 復旧戦略<br>• 障害耐性機構 | 堅牢なワークフローシステム構築の学習 |
| **streaming-workflow.ts** | • リアルタイムストリーミング実行<br>• フロントエンド対応返却<br>• プログレス可視化 | ストリーミングワークフロー実装とフロントエンド統合をマスター |
| **🔥 ai-sdk-streaming-workflow.ts** | • **AI SDK 100%互換**<br>• **streamText API**<br>• **Express ルート統合** | AI SDK互換ワークフローをマスター、LLMアプリケーションに適用 |
| **🔥 simple-agent-style.ts** | • **OpenAI Agent SDKスタイル**<br>• **Agent転送メカニズム**<br>• **ツール関数サポート** | 簡素化Agent APIの迅速開発を学習 |
| **🔥 ai-planner-workflow.ts** | • **AI駆動プランニング**<br>• **インテリジェントタスク生成**<br>• **JSON ワークフロー設定** | インテリジェントワークフロープランニングシステムを理解 |

### 🎯 クイック体験

すべての例を迅速に体験したい場合は、以下を実行してください：

```bash
# 依存関係をインストール
npm install

# すべての例を順次実行
npm run examples
```

または、シンプルなスクリプトを作成して実行：

```bash
# 実行スクリプトを作成
cat > run-examples.sh << 'EOF'
#!/bin/bash
echo "🚀 WorkflowBuilder例を実行"
echo "========================="

echo -e "\n1️⃣ 基本ワークフロー例"
npx tsx examples/basic-workflow.ts

echo -e "\n2️⃣ 動的戦略例" 
npx tsx examples/dynamic-strategies.ts

echo -e "\n3️⃣ LLM統合例"
npx tsx examples/llm-integration.ts

echo -e "\n4️⃣ エラーハンドリング例"
npx tsx examples/error-handling.ts

echo -e "\n5️⃣ ストリーミングワークフロー例"
npx tsx examples/streaming-workflow.ts

echo -e "\n6️⃣ AI SDKストリーミング例"
npx tsx examples/ai-sdk-streaming-workflow.ts

echo -e "\n7️⃣ 簡素化Agent API例"
npx tsx examples/simple-agent-style.ts

echo -e "\n8️⃣ AIプランナー例"
npx tsx examples/ai-planner-workflow.ts

echo -e "\n✅ すべての例の実行が完了しました！"
EOF

chmod +x run-examples.sh
./run-examples.sh
```

## 🌊 ストリーミングワークフロー - リアルタイムユーザー体験

### ストリーミングワークフローとは？

従来のワークフローはすべてのタスクが完了するまで結果を返すのを待つ必要がありますが、ストリーミングワークフローは実行過程のデータをリアルタイムで返すことができ、特に以下に適しています：
- 長時間実行されるLLMタスク
- リアルタイムフィードバックが必要なシナリオ
- フロントエンドユーザー体験の最適化

### 基本ストリーミングタスクの実装

```typescript
class StreamingAnalysisTask {
  name = 'streamingAnalysis';
  isStreaming = true;

  // 通常の実行メソッド（互換性のため）
  async execute(input: any): Promise<Record<string, any>> {
    return { analysis: 'Static result', timestamp: Date.now() };
  }

  // ストリーミング実行メソッド
  async *executeStream(input: any): AsyncGenerator<string, Record<string, any>, unknown> {
    // LLMストリーミング応答をシミュレート
    yield '🔍 分析を開始しています...';
    yield '📊 プロジェクトタイプを検出しています...';
    yield '⚡ 最適化提案を生成しています...';
    yield '✅ 分析完了';
    
    return { 
      analysis: 'Complete analysis data',
      timestamp: Date.now() 
    };
  }
}
```

### ストリーミングワークフローの使用

```typescript
import { SimpleStreamingWorkflow } from './examples/streaming-workflow';

const streamingWorkflow = new SimpleStreamingWorkflow()
  .addTask(new StreamingAnalysisTask())
  .addTask(new StreamingOptimizationTask());

// 🌊 ストリーミング実行
for await (const chunk of streamingWorkflow.executeStream(input)) {
  switch (chunk.type) {
    case 'progress':
      console.log(`進捗: ${chunk.progress}%`);
      break;
    case 'data':
      console.log(`データ: ${chunk.content}`);
      break;
    case 'complete':
      console.log(`タスク完了: ${chunk.taskName}`);
      break;
  }
}
```

### フロントエンド統合例

#### 1. サーバーサイド (Express + SSE)
```typescript
app.get('/api/workflow/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const workflow = new SimpleStreamingWorkflow()
    .addTask(new StreamingCodeAnalysisTask());

  for await (const chunk of workflow.executeStream(req.body)) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }
  
  res.end();
});
```

#### 2. フロントエンド (React)
```tsx
function WorkflowProgress() {
  const [messages, setMessages] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const startWorkflow = () => {
    const eventSource = new EventSource('/api/workflow/stream');
    
    eventSource.onmessage = (event) => {
      const chunk = JSON.parse(event.data);
      
      if (chunk.type === 'progress') {
        setProgress(chunk.progress);
      } else if (chunk.type === 'data') {
        setMessages(prev => [...prev, chunk.content]);
      }
    };
  };

  return (
    <div>
      <button onClick={startWorkflow}>分析開始</button>
      <progress value={progress} max={100} />
      <div>
        {messages.map((msg, i) => 
          <div key={i} className="message">{msg}</div>
        )}
      </div>
    </div>
  );
}
```

#### 3. フロントエンド (Vue)
```vue
<template>
  <div>
    <button @click="startWorkflow" :disabled="isRunning">
      {{ isRunning ? '実行中...' : '分析開始' }}
    </button>
    <progress :value="progress" max="100"></progress>
    <div v-for="(msg, i) in messages" :key="i" class="message">
      {{ msg }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const messages = ref([]);
const progress = ref(0);
const isRunning = ref(false);

const startWorkflow = async () => {
  isRunning.value = true;
  messages.value = [];
  progress.value = 0;

  const response = await fetch('/api/workflow/stream');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          
          if (data.type === 'progress') {
            progress.value = data.progress;
          } else if (data.type === 'data') {
            messages.value.push(data.content);
          }
        }
      }
    }
  } finally {
    isRunning.value = false;
  }
};
</script>
```

### ストリーミングワークフローの利点

- **✨ リアルタイムフィードバック** - ユーザーは即座に実行進捗を確認
- **🚀 長時間タスクサポート** - 時間のかかるLLM分析に適している
- **📊 進捗可視化** - 明確な進捗バーとステータス
- **🔄 中断・再開可能** - 一時停止と継続をサポート
- **💬 リアルタイム応答** - LLMストリーミング出力の直接表示
- **🎯 フロントエンド対応** - 完璧なユーザー体験

### データフォーマット

ストリーミングワークフローは標準化されたデータブロックを返します：

```typescript
interface StreamingChunk {
  type: 'progress' | 'data' | 'error' | 'complete';
  taskName: string;
  content?: any;
  progress?: number;        // 0-100
  timestamp: number;
  metadata?: Record<string, any>;
}
```

ストリーミングワークフローを通じて、ChatGPTのようなリアルタイム応答体験をユーザーに提供できます！

## 🤖 AI SDK完全互換

### 完璧なAI SDK統合

私たちのワークフローシステムは [AI SDK](https://github.com/vercel/ai) との**100%API互換性**を提供すると同時に、強力なワークフロー編成機能を提供します：

```typescript
// 🔥 AI SDK互換のストリーミングタスク
class AICodeAnalysisTask implements DAGTask {
  name = 'aiCodeAnalysis';
  isAISDKStreaming = true;

  async executeStreamAI(input: TaskInput) {
    const { textStream, fullStream } = await streamText({
      model: openai('gpt-4-turbo'),
      prompt: `以下のコードを分析してください: ${input.code}`,
    });

    return {
      textStream,
      fullStream,
      toDataStreamResponse: () => new Response(/* SSE stream */),
      toReadableStream: () => new ReadableStream(/* text stream */)
    };
  }
}

// 🚀 AI SDK互換ワークフローの構築
const aiWorkflow = WorkflowBuilder
  .create()
  .addTask(new AICodeAnalysisTask())
  .addTask(new AIDocumentationTask())
  .buildAISDKStreaming(); // 🔥 AI SDK互換ビルダー

// 💫 AI SDKと完全に同様の使用
const result = aiWorkflow.executeStreamAISDK(input);

// AI SDK streamTextと同じAPI！
for await (const textChunk of result.textStream) {
  console.log(textChunk); // リアルタイムAI出力
}

// またはExpressルートで使用 - コード変更は一切不要！
app.post('/api/ai/analyze', async (req, res) => {
  const workflow = WorkflowBuilder
    .create()
    .addTask(new AICodeAnalysisTask())
    .buildAISDKStreaming();

  const streamResult = workflow.executeStreamAISDK(req.body);
  
  // 🎯 AI SDKと完全に同様の返却
  return streamResult.toDataStreamResponse();
});
```

### AI SDK vs 私たちの実装比較

| 機能特性 | AI SDK `streamText()` | 私たちのAIワークフロー |
|---------|----------------------|------------------|
| **API互換性** | ✅ シンプル | ✅ 100%互換 |
| **マルチタスク編成** | ❌ 単一タスク | ✅ 複雑ワークフロー |
| **動的タスク生成** | ❌ なし | ✅ インテリジェント戦略 |
| **並列実行** | ❌ 直列 | ✅ 自動最適化 |
| **依存関係管理** | ❌ なし | ✅ DAG依存関係 |
| **エラー復旧** | ❌ 基本 | ✅ 高度障害耐性 |
| **コンテキスト管理** | ❌ 限定的 | ✅ 豊富なコンテキスト |
| **パフォーマンス** | ✅ 良好 | ✅ 最適化+並列 |

**🎯 コア利点：**
- **ゼロ移行コスト** - AI SDKと同じAPI
- **ワークフロー能力** - 単一呼び出しで複雑なマルチタスク編成を実現
- **AI優先設計** - LLMアプリケーション専用構築
- **本番対応** - 高度エラーハンドリングと監視

## 🎭 簡素化Agent スタイルAPI

### OpenAI Agent SDK互換

私たちは**簡素化されたAgent API**を提供し、OpenAIのAgent SDKとほぼ完全に一致していますが、底層機能はより強力です：

```typescript
// 🤖 Agent定義（OpenAI Agent SDKと完全に同様）
const supportAgent = new Agent(
  'Support & Returns',
  'あなたはサポートエージェントで、返金申請の提出やカスタマーサービス問題の処理ができます。',
  [submitRefundRequest] // ツール関数
);

const shoppingAgent = new Agent(
  'Shopping Assistant', 
  'あなたはショッピングアシスタントで、ウェブ製品の検索ができます。',
  [webSearch, analyzeOutfit]
);

const triageAgent = new Agent(
  'Triage Agent',
  'ユーザークエリに基づいてユーザーを正しいエージェントにルーティングします。',
  [],
  [shoppingAgent, supportAgent] // 転送
);

// 🚀 OpenAI Agent SDKと完全に同様の実行
const output = await Runner.runSync({
  startingAgent: triageAgent,
  input: "紺色のスーツジャケットに最も適した靴は何ですか？"
});

console.log(output);
// {
//   "recommendation": "あなたのコーディネートに基づき、茶色または紺色のカジュアルシューズをお勧めします",
//   "suggestedProducts": [
//     {"name": "Clarksデザートブーツ", "price": "$120", "match": "95%"}
//   ]
// }
```

### API比較：OpenAI vs 私たちの実装

```python
# OpenAI Agent SDK (Python)
output = Runner.run_sync(
    starting_agent=triage_agent,
    input="私のコーディネートに適した靴は何ですか？"
)
```

```typescript
// 私たちの実装 (TypeScript) - ほぼ完全に一致！
const output = await Runner.runSync({
  startingAgent: triageAgent,
  input: "私のコーディネートに適した靴は何ですか？"
});
```

**🎯 OpenAI Agent SDKと比較したコア利点：**

- ✅ **API の簡潔性**: ほぼ完全に一致したインターフェース
- ✅ **より強力**: 底層複雑ワークフロー能力
- ✅ **型安全性**: 完全なTypeScriptサポート
- ✅ **柔軟性**: マルチステップワークフローに拡張可能
- ✅ **パフォーマンス**: 自動並列実行と最適化
- ✅ **高度機能**: 動的戦略、ストリーミング処理、コンテキスト管理

## 🧠 AI駆動ワークフロープランニング

### インテリジェントプランナーシステム

私たちのAIプランナーはユーザーリクエストを分析し、最適化されたワークフロー設定を自動生成できます：

```typescript
// 🧠 AIプランナーがリクエストを分析してワークフローを生成
class AIPlannerTask implements DAGTask {
  async execute(input: TaskInput) {
    const userRequest = input.userRequest;
    
    // AI分析："私のReact TypeScriptプロジェクトを分析して最適化してください"
    const workflowPlan = await this.generateWorkflowPlan(userRequest);
    
    return { workflowPlan };
  }
}

// 🚀 プランナーがインテリジェントワークフロー設定を生成
const plannerWorkflow = WorkflowBuilder
  .create()
  .addTask(new AIPlannerTask())
  .onTaskComplete('aiPlanner', async (result, context) => {
    const plan = result.workflowPlan;
    
    // 🎯 動的生成されたワークフローを実行
    return await PlanExecutor.executePlan(plan, context.getAll());
  })
  .build();

// 💫 単一行で複雑ワークフローを作成
const result = await plannerWorkflow.execute({
  userRequest: "Python FastAPIを使用してAI機能付き天気アプリを作成"
});
```

### AIプランナー出力例

AIプランナーは構造化されたJSONワークフローを生成します：

```json
{
  "workflow": {
    "description": "AI駆動の天気アプリ開発",
    "staticTasks": [
      {
        "type": "WebSearchTask",
        "name": "weatherApiResearch",
        "config": {"query": "2024年最高の天気API", "maxResults": 5}
      },
      {
        "type": "FileOperationTask",
        "name": "projectSetup", 
        "config": {"action": "create", "structure": "fastapi-project"}
      }
    ],
    "dynamicStrategies": [
      {
        "type": "onTaskComplete",
        "name": "apiSelectionStrategy",
        "trigger": "天気API研究完了後",
        "generateTasks": [
          {
            "type": "CodeGenerationTask",
            "name": "weatherService",
            "config": {"component": "weather-service", "framework": "fastapi"}
          }
        ]
      }
    ]
  }
}
```

**🎯 AIプランナー特性：**
- **インテリジェントリクエスト分析** - 意図と要求の理解
- **最適化タスク選択** - 作業に最適なタスクを選択
- **動的戦略生成** - インテリジェント条件ロジックの作成
- **マルチシナリオサポート** - React分析、アプリ開発、汎用クエリ
- **JSON駆動実行** - 構造化され、再現可能なワークフロー

## 🤝 貢献ガイド

1. このリポジトリをFork
2. 機能ブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
5. Pull Requestを開く

## 📄 ライセンス

MIT © [FormAgent](https://github.com/FormAgent)

ワークフロー開発をよりシンプルに、より強力に、よりインテリジェントに！ 🚀
