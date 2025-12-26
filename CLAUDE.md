# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. It uses Claude AI (via Anthropic SDK) to generate React components based on natural language descriptions, with a virtual file system that runs entirely in-browser without writing files to disk.

## Development Philosophy

### 최소 컨텍스트, 최대 효율 원칙

이 프로젝트는 다음 철학을 따릅니다:

#### 1. 범용 도구보다 프로젝트 특화 구현 선호

**원칙**: MCP나 범용 라이브러리는 과도한 컨텍스트를 가져와 AI의 성능을 저하시킬 수 있습니다.

**적용**:
- ❌ **피해야 할 것**:
  - 범용 MCP 서버 (Playwright MCP 등)
  - 불필요하게 많은 기능을 제공하는 대형 라이브러리
  - 프로젝트에 맞지 않는 보일러플레이트

- ✅ **선호하는 것**:
  - 프로젝트 요구사항에 정확히 맞는 커스텀 구현
  - 필요한 기능만 제공하는 경량 스크립트
  - 프로젝트 구조에 최적화된 API 엔드포인트

**예시**:
```typescript
// ❌ 나쁜 예: Playwright MCP 전체를 로드
// - 수백 개의 메서드와 옵션
// - 대부분 이 프로젝트에서 사용하지 않음

// ✅ 좋은 예: 필요한 기능만 구현
// scripts/analyze-preview.js
async function analyzePreview() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');

  // 이 프로젝트에 필요한 것만:
  // 1. 스크린샷
  // 2. Tailwind 클래스 추출
  // 3. 색상 팔레트 분석

  const screenshot = await page.screenshot({ encoding: 'base64' });
  const styles = await page.evaluate(() => {
    const classes = [];
    document.querySelectorAll('[class]').forEach(el => {
      classes.push(...el.className.split(' '));
    });
    return [...new Set(classes)];
  });

  await browser.close();
  return { screenshot, styles };
}
```

#### 2. Claude 4.5의 능력을 최대한 활용

**Claude Sonnet 4.5의 강점**:
- 200K 토큰 컨텍스트 윈도우
- 향상된 도구 사용 능력
- 멀티모달 (이미지 분석)
- 복잡한 워크플로우 실행

**적용**:
```typescript
// Claude가 직접 호출할 수 있는 간단한 API
// src/app/api/analyze-component/route.ts

export async function POST(req: Request) {
  const { componentName } = await req.json();

  // 1. 스크린샷 캡처
  const screenshot = await capturePreview();

  // 2. 스타일 분석
  const styles = await analyzeStyles();

  // 3. 간결한 결과 반환
  return Response.json({
    screenshot,  // Claude가 직접 볼 수 있음
    styles,      // 간결한 데이터만
  });
}
```

#### 3. 간결한 인터페이스 설계

**원칙**: 도구나 API는 최소한의 파라미터만 받고, 명확한 결과만 반환해야 합니다.

**나쁜 예**:
```typescript
// ❌ 너무 많은 옵션
interface BrowserOptions {
  headless?: boolean;
  slowMo?: number;
  devtools?: boolean;
  proxy?: ProxySettings;
  timeout?: number;
  viewport?: ViewportSize;
  userAgent?: string;
  // ... 50개 이상의 옵션
}
```

**좋은 예**:
```typescript
// ✅ 이 프로젝트에 필요한 것만
interface PreviewAnalysis {
  screenshot: string;      // base64
  colorPalette: string[];  // ['bg-blue-500', 'text-slate-900']
  layoutType: 'flex' | 'grid';
  issues?: string[];       // 발견된 문제점만
}
```

#### 4. 컨텍스트 품질 > 컨텍스트 양

**원칙**: 많은 정보보다 정확하고 관련성 높은 정보가 더 중요합니다.

**적용**:
- 생성된 컴포넌트의 모든 줄을 분석하는 대신, 핵심 패턴만 추출
- 전체 DOM 트리 대신, Tailwind 클래스만 수집
- 모든 스크린샷 대신, 주요 뷰포트만 캡처

```typescript
// ✅ 핵심 정보만 추출
const analysis = {
  // ❌ 전체 HTML (수천 줄)을 보내지 않음
  // html: page.content()

  // ✅ 필요한 통찰만
  colorPalette: extractColors(classes),
  layoutPatterns: detectLayouts(classes),
  suggestions: generateSuggestions(classes),
};
```

#### 5. 점진적 복잡도

**원칙**: 간단한 버전으로 시작해서 필요할 때만 기능 추가

**단계**:
1. **MVP**: 기본 스크린샷 + 스타일 추출
2. **개선**: 자동 분석 + 제안
3. **최적화**: A/B 테스트 + 자동 프롬프트 개선

**안티패턴**:
```typescript
// ❌ 처음부터 모든 기능 구현
class BrowserAutomation {
  screenshot() {}
  click() {}
  type() {}
  drag() {}
  hover() {}
  scroll() {}
  evaluate() {}
  // ... 100개 메서드
}

// ✅ 필요한 것만 시작
async function captureAndAnalyze() {
  // 1. 스크린샷
  // 2. 스타일 분석
  // 끝
}
```

### 실제 적용 예시

이 프로젝트에서 이 원칙을 적용한 사례:

#### 1. Virtual File System
- ❌ 범용 파일시스템 라이브러리 사용 대신
- ✅ 이 프로젝트에 필요한 최소 기능만 구현
- 결과: 가볍고, 이해하기 쉽고, 디버깅이 용이

#### 2. Streaming Protocol
- ❌ 복잡한 양방향 통신 프로토콜 대신
- ✅ 간단한 텍스트 프리픽스 (`0:`, `1:`)
- 결과: 명확하고, 디버깅 쉽고, 확장 가능

#### 3. Tool Integration
- ❌ 수십 개의 파일 조작 도구 대신
- ✅ 2개의 핵심 도구 (str_replace_editor, file_manager)
- 결과: AI가 혼란 없이 정확하게 사용

### 브라우저 자동화 구현 가이드

프로젝트에 브라우저 자동화가 필요할 경우:

**권장 접근법**:
1. `scripts/analyze-preview.js` - 독립 스크립트로 시작
2. 필요시 `src/app/api/preview-analysis/route.ts` - API로 승격
3. 최소 기능만 구현:
   - 스크린샷 캡처
   - Tailwind 클래스 추출
   - 색상 팔레트 분석

**피해야 할 것**:
- Playwright MCP 전체 설치
- E2E 테스트 프레임워크 (이 용도로는 과도함)
- 범용 브라우저 자동화 라이브러리의 모든 기능

## Development Commands

### Setup
```bash
npm run setup
```
Runs the complete setup: installs dependencies, generates Prisma client, and runs database migrations.

### Development Server
```bash
npm run dev
```
Starts Next.js dev server with Turbopack on http://localhost:3000

```bash
npm run dev:daemon
```
Starts dev server in background, writing logs to logs.txt

### Testing
```bash
npm test
```
Runs Vitest tests in watch mode. Tests use jsdom environment.

To run a single test file:
```bash
npx vitest src/lib/__tests__/file-system.test.ts
```

### Build & Lint
```bash
npm run build      # Production build
npm run lint       # ESLint check
```

### Database
```bash
npx prisma generate              # Regenerate Prisma client
npx prisma migrate dev           # Create and apply migration
npm run db:reset                 # Reset database (force)
```
@prisma/schema.prisma 파일에 스키마가 정의 되어 있어. 이를 참고 하여 이해해.
Prisma client is generated to `src/generated/prisma/` (custom output location).

## Architecture Overview

### Virtual File System

The core innovation is a **virtual file system** (`src/lib/file-system.ts`) that operates entirely in memory:
- `VirtualFileSystem` class manages files as a tree structure with `FileNode` objects
- Files never touch the real filesystem - everything is serialized to/from JSON
- Supports standard operations: create, read, update, delete, rename, with automatic parent directory creation
- Serialization/deserialization enables persistence to database and transmission to client

### AI Tool Integration

The app provides Claude with two tools to manipulate the virtual filesystem:
1. **`str_replace_editor`** (`src/lib/tools/str-replace.ts`): View, create, and edit files with string replacement or line insertion
2. **`file_manager`** (`src/lib/tools/file-manager.ts`): Rename and delete files/folders

These tools bridge Claude's text-based edits to the virtual filesystem operations.

### Component Preview System

The preview system (`src/lib/transform/jsx-transformer.ts` and `src/components/preview/PreviewFrame.tsx`) works as follows:

1. **Transform Phase**: JSX/TSX files are transformed using Babel standalone in the browser
   - TypeScript → JavaScript transpilation
   - JSX → React.createElement calls
   - CSS imports are extracted and collected separately

2. **Import Map Creation**: All transformed files get blob URLs via `URL.createObjectURL()`
   - Import map resolves local imports (e.g., `@/components/Foo`) to blob URLs
   - Third-party packages resolved to https://esm.sh CDN
   - Handles both `@/` alias (root) and relative paths (`./`, `../`)

3. **Preview HTML**: Generated HTML includes:
   - Tailwind CDN for styling
   - Import map with all blob URLs
   - CSS styles collected from .css files
   - Error boundary for runtime errors
   - Syntax error display for transform failures

4. **Entry Point**: Always `/App.jsx` which must export a default React component

### Authentication & Persistence

- **Cookie-based auth** using JWT (jose library): `src/lib/auth.ts`
- Sessions stored in httpOnly cookies with 7-day expiration
- **Anonymous mode**: Users can work without signing up
  - Anonymous work tracked via client-side cookie (`src/lib/anon-work-tracker.ts`)
  - On signup, anonymous project is transferred to user account
- **Database**: SQLite with Prisma ORM
  - `User` model: email/password (bcrypt hashed)
  - `Project` model: stores name, messages (chat history), and data (serialized VFS)
  - Projects can exist without user (anonymous) or belong to a user

### Chat & Streaming

- Chat interface: `src/components/chat/ChatInterface.tsx`
- API route: `src/app/api/chat/route.ts`
- Uses Vercel AI SDK for streaming responses
- System prompt: `src/lib/prompts/generation.tsx` instructs Claude to:
  - Create React components with Tailwind styling
  - Always have root `/App.jsx` file
  - Use `@/` import alias for local files
- **Mock Provider**: When no `ANTHROPIC_API_KEY` is set, falls back to `MockLanguageModel` in `src/lib/provider.ts` which generates static counter/form/card components

### State Management

Uses React Context for state:
- **FileSystemContext** (`src/lib/contexts/file-system-context.tsx`): Manages VFS state, file tree, selected file
- **ChatContext** (`src/lib/contexts/chat-context.tsx`): Manages chat messages and AI interaction
- Both contexts are composed in the main app and accessed via custom hooks

## File Structure Patterns

- `src/app/` - Next.js 15 App Router pages and API routes
- `src/components/` - React components organized by feature (auth, chat, editor, preview, ui)
- `src/lib/` - Core business logic (auth, file system, tools, transforms, contexts)
- `src/actions/` - Next.js Server Actions for database operations
- `src/generated/prisma/` - Generated Prisma client (gitignored)
- `prisma/` - Database schema and migrations

## Important Constraints

- **No HTML files**: The preview system doesn't use HTML files from the VFS. `/App.jsx` is always the entry point.
- **Import aliases**: Local imports must use `@/` prefix (e.g., `import Foo from '@/components/Foo'`)
- **CSS handling**: CSS imports are stripped during transform and collected into a single `<style>` tag
- **Babel in browser**: All transpilation happens client-side using `@babel/standalone`
- **Virtual FS paths**: All paths must start with `/` and are normalized automatically
- Use comments sparingly. Only comment complex code.
- 모든 답변은 한글로 해.

## Troubleshooting & Known Issues

### Issue 1: Preview Not Showing Generated Components

**증상**: AI가 채팅으로 응답하지만 오른쪽 프리뷰 창에 UI가 표시되지 않음

**원인**:
1. **파일 시스템 동기화 누락**: API에서 파일을 생성했지만 클라이언트가 업데이트를 받지 못함
2. **AI가 tool을 사용하지 않음**: 프롬프트가 충분히 명시적이지 않아 AI가 텍스트로만 응답

**해결책**:
- `src/app/api/chat/route.ts:169-171`: 파일 시스템 데이터를 `1:{json}` 형식으로 스트리밍 응답에 포함
- `src/lib/contexts/chat-context.tsx:132-141`: 클라이언트에서 `1:` 프리픽스를 파싱하여 파일 시스템 업데이트
- `src/lib/contexts/file-system-context.tsx:146-152`: `updateFromSerialized` 메서드 추가
- `src/lib/prompts/generation.tsx:6-30`: AI에게 tool 사용을 강제하는 명시적 지시 추가

### Issue 2: Message Type Mismatch Error

**증상**:
```
Unexpected value `[object Object],[object Object]` for `children` prop, expected `string`
```

**원인**:
- `MessageList` 컴포넌트가 `ai` 패키지의 `Message` 타입 사용 (content가 배열)
- 실제 사용하는 커스텀 `Message` 타입은 content가 string

**해결책**:
- `src/components/chat/MessageList.tsx:3`: 올바른 타입 import (`@/lib/contexts/chat-context`)
- `src/components/chat/MessageList.tsx:50-73`: `message.parts` 로직 제거, content만 사용
- `src/components/chat/MarkdownRenderer.tsx:11-22`: `stringifyChildren` 헬퍼 함수로 안전하게 처리
- `src/actions/get-project.ts:6-36`: Anthropic 형식 메시지를 simple 형식으로 변환

### Issue 3: Empty Message Content Error

**증상**:
```
messages.10: all messages must have non-empty content except for the optional final assistant message
```

**원인**: 데이터베이스에 빈 content를 가진 메시지가 저장되어 Anthropic API로 전송됨

**해결책**:
- `src/app/api/chat/route.ts:43-48`: API 요청 전 빈 메시지 필터링
- `src/app/api/chat/route.ts:59-64`: UI 표시용 메시지도 필터링
- `src/actions/get-project.ts:35`: 데이터베이스에서 불러올 때도 필터링

### Issue 4: AI Not Using Tools

**증상**: AI가 텍스트로만 응답하고 파일을 생성하지 않음 (로그에 `stop_reason: end_turn`, tool_use 없음)

**원인**: 시스템 프롬프트가 tool 사용에 대해 충분히 명시적이지 않음

**해결책**:
- `src/lib/prompts/generation.tsx:6-30`: "CRITICAL: You MUST use tools" 섹션 추가
- Tool 사용법과 예시를 프롬프트에 명시
- 기존 대화 히스토리가 있는 프로젝트는 새 프로젝트로 시작 필요

## Common Solutions

### 프리뷰가 작동하지 않을 때
1. 브라우저 콘솔에서 에러 확인 (F12)
2. 서버 로그에서 API 에러 확인
3. 새 프로젝트 생성 또는 DB 리셋:
   ```bash
   npm run db:reset
   ```

### 메시지 히스토리 문제
- 빈 메시지나 잘못된 형식이 DB에 저장되었을 경우, 새 프로젝트 시작 권장
- 또는 해당 프로젝트 삭제 후 재생성

## Data Flow: Component Generation

사용자 요청 → 프리뷰 표시까지의 전체 흐름:

1. **사용자 입력**: ChatInterface에서 메시지 전송
2. **API 요청**: `POST /api/chat` (메시지 + 현재 파일 시스템)
3. **Anthropic API 호출**:
   - 시스템 프롬프트 + 사용자 메시지 전달
   - tool 제공 (str_replace_editor, file_manager)
4. **Tool 실행**:
   - AI가 `str_replace_editor`로 파일 생성/수정
   - VirtualFileSystem 업데이트
5. **응답 스트리밍**:
   - `0:"text"` - AI 텍스트 응답
   - `1:{files}` - 업데이트된 파일 시스템 (스트림 끝)
6. **클라이언트 업데이트**:
   - ChatContext가 파일 시스템 데이터 수신
   - FileSystemContext.updateFromSerialized 호출
   - refreshTrigger 증가
7. **프리뷰 렌더링**:
   - PreviewFrame이 refreshTrigger 감지
   - getAllFiles로 최신 파일 가져오기
   - JSX transform → blob URLs → import map
   - iframe에 HTML 주입

## Development Session Log (2025-12-26)

이 섹션은 실제 개발 세션에서 발생한 문제와 해결 과정을 시간 순서대로 기록합니다.

### 세션 개요
- **목표**: React 컴포넌트 생성기 애플리케이션의 프리뷰 기능 수정
- **주요 문제**: AI가 컴포넌트를 생성하지만 프리뷰 창에 표시되지 않음
- **해결된 이슈**: 4개의 주요 버그 수정 및 시스템 프롬프트 개선

### 1단계: 초기 문제 파악

**사용자 보고**: "질문에 대답은 하는데, 오르쪽 창에 ui를 만들어 주지 못하고 있어"

**진단 과정**:
1. 서버 로그 확인 - API가 정상적으로 응답하고 있음
2. 클라이언트-서버 통신 분석 - 파일 시스템 데이터가 전송되지 않음을 발견
3. 스트리밍 응답 구조 확인 - 텍스트만 전송되고 파일 데이터는 누락됨

**근본 원인**: API 응답에 파일 시스템 업데이트 데이터가 포함되지 않음

### 2단계: 파일 시스템 동기화 구현

**변경 파일들**:

#### `src/app/api/chat/route.ts` (169-176번째 줄)
```typescript
// Send file system updates to client
const filesData = JSON.stringify(fileSystem.serialize());
const filesChunk = `1:${filesData}\n`;
controller.enqueue(encoder.encode(filesChunk));
```
- 스트림 응답 끝에 파일 시스템 데이터 추가
- 프로토콜: `1:{json}` 형식으로 전송

#### `src/lib/contexts/chat-context.tsx` (132-141번째 줄)
```typescript
} else if (line.startsWith('1:')) {
  // Parse format: 1:{json data}
  const filesData = line.substring(2);
  try {
    const parsedFiles = JSON.parse(filesData);
    updateFromSerialized(parsedFiles);
  } catch (e) {
    console.error('Failed to parse file system data:', e);
  }
}
```
- `1:` 프리픽스를 가진 라인 파싱
- `updateFromSerialized` 호출하여 파일 시스템 업데이트

#### `src/lib/contexts/file-system-context.tsx` (146-152번째 줄)
```typescript
const updateFromSerialized = useCallback(
  (data: Record<string, any>) => {
    fileSystem.deserializeFromNodes(data);
    triggerRefresh();
  },
  [fileSystem, triggerRefresh]
);
```
- 새 메서드 추가: 직렬화된 데이터로부터 파일 시스템 업데이트
- `triggerRefresh()` 호출로 프리뷰 리렌더링 트리거

**결과**: 이론적으로는 해결되었으나, 테스트 시 여전히 작동하지 않음

### 3단계: ReactMarkdown 타입 에러 수정

**에러 메시지**:
```
Unexpected value `[object Object],[object Object]` for `children` prop, expected `string`
```

**원인 분석**:
- `MessageList` 컴포넌트가 잘못된 `Message` 타입 import (from `ai` package)
- `ai` 패키지의 타입: `content` is `string | Array<...>`
- 실제 커스텀 타입: `content` is `string`

**수정 작업**:

#### `src/components/chat/MessageList.tsx`
1. Import 변경 (3번째 줄):
```typescript
import { Message } from "@/lib/contexts/chat-context";
```

2. 렌더링 로직 단순화 (50-73번째 줄):
```typescript
<div className="text-sm">
  {message.content ? (
    message.role === "user" ? (
      <span className="whitespace-pre-wrap">{message.content}</span>
    ) : (
      <MarkdownRenderer content={message.content} className="prose-sm" />
    )
  ) : isLoading && ... ? (
    <div className="flex items-center gap-2 text-neutral-500">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span className="text-sm">Generating...</span>
    </div>
  ) : null}
</div>
```

#### `src/components/chat/MarkdownRenderer.tsx` (11-22번째 줄)
```typescript
function stringifyChildren(children: any): string {
  if (typeof children === 'string') {
    return children;
  }
  if (Array.isArray(children)) {
    return children.map(stringifyChildren).join('');
  }
  if (children && typeof children === 'object') {
    return String(children);
  }
  return String(children || '');
}
```
- 안전한 children 변환 함수 추가
- 모든 ReactMarkdown 컴포넌트에서 사용

#### `src/actions/get-project.ts` (6-36번째 줄)
```typescript
function convertAnthropicMessagesToSimple(messages: any[]): any[] {
  return messages.map((msg) => {
    if (typeof msg.content === 'string') {
      return { role: msg.role, content: msg.content };
    }
    if (Array.isArray(msg.content)) {
      const textContent = msg.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');
      return { role: msg.role, content: textContent };
    }
    return { role: msg.role, content: '' };
  })
  .filter((msg) => (msg.role === 'user' || msg.role === 'assistant') && msg.content.trim() !== '');
}
```
- Anthropic 형식 메시지를 Simple 형식으로 변환
- DB에서 로드할 때 자동 변환

**결과**: ReactMarkdown 에러 해결, UI 정상 렌더링

### 4단계: 빈 메시지 에러 수정

**에러 메시지**:
```
messages.10: all messages must have non-empty content except for the optional final assistant message
```

**원인**: DB에 빈 `content`를 가진 메시지가 저장되어 Anthropic API로 전송됨

**수정 작업**:

#### `src/app/api/chat/route.ts`

1. Anthropic 메시지 필터링 (43-48번째 줄):
```typescript
const anthropicMessages = messages
  .filter((msg: any) => msg.content && String(msg.content).trim() !== '')
  .map((msg: any) => ({
    role: msg.role === "user" ? "user" : "assistant",
    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
  }));
```

2. Simple 메시지 필터링 (59-64번째 줄):
```typescript
const simpleMessages: any[] = messages
  .filter((m: any) => m.content && String(m.content).trim() !== '')
  .map((m: any) => ({
    role: m.role,
    content: m.content,
  }));
```

#### `src/actions/get-project.ts` (35번째 줄)
```typescript
.filter((msg) => (msg.role === 'user' || msg.role === 'assistant') && msg.content.trim() !== '');
```

**결과**: API 400 에러 해결

### 5단계: AI Tool 사용 강제

**문제**: 새 테스트 케이스에서 AI가 텍스트로만 응답하고 파일을 생성하지 않음

**서버 로그 분석**:
```
[CHAT ANTHROPIC API] Response stop_reason: end_turn
```
- `tool_use` 블록이 없음
- AI가 도구를 사용하지 않고 텍스트로만 응답

**근본 원인**: 시스템 프롬프트가 tool 사용에 대해 충분히 명시적이지 않음

**수정 작업**:

#### `src/lib/prompts/generation.tsx` (6-30번째 줄)
```typescript
## CRITICAL: You MUST use tools to create/edit files

**IMPORTANT**: When a user asks you to create a component, you MUST use the str_replace_editor tool to actually create or modify files. Simply describing the code in your response is NOT sufficient - you must execute the tool calls to write the files.

* Keep responses as brief as possible. Do not summarize the work you've done unless the user asks you to.
* Users will ask you to create react components and various mini apps. Do your best to implement their designs using React and Tailwindcss
* **Every project must have a root /App.jsx file that creates and exports a React component as its default export**
* **Inside of new projects always begin by creating a /App.jsx file using the str_replace_editor tool**
* **When users ask for new components, USE THE TOOLS to create the actual files - don't just describe them**

## Tool Usage
You have access to these tools:
- **str_replace_editor**: Use this to view, create, and edit files
  - command="create": Create a new file with content
  - command="view": View existing file contents
  - command="str_replace": Replace text in a file
  - command="insert": Insert text at a specific line
- **file_manager**: Use this to rename or delete files

**YOU MUST USE THESE TOOLS** to actually create files when users request components.
```

**주요 변경사항**:
1. "CRITICAL: You MUST use tools" 섹션 추가
2. 강조 문구 추가 (볼드, 별표)
3. Tool 사용법 명시적으로 설명
4. 각 단계마다 "use the tool" 강조

**제약 사항**: 기존 프로젝트에 잘못된 메시지 히스토리가 남아있어 새 프로젝트에서만 효과적

### 문제 해결 과정 메타 분석

#### 효과적이었던 점
1. ✅ 에러 메시지를 정확히 제공받음 (ReactMarkdown 에러)
2. ✅ 서버 로그 확인으로 빠른 진단 (`stop_reason: end_turn`)
3. ✅ 체계적인 접근: API → Context → Component 순서로 수정
4. ✅ 타입 불일치 문제를 근본 원인까지 추적

#### 개선이 필요했던 점
1. ❌ 초기 문제 설명이 모호함 ("오른쪽 창에 ui를 만들어 주지 못함")
2. ❌ 재현 단계 없음 (어떤 입력으로 테스트했는지)
3. ❌ 환경 정보 부족 (브라우저 콘솔 에러 확인 안 함)

#### 효과적인 프롬프트 예시

**나쁜 예**:
> "작동이 안 돼요"
> "에러가 나요"
> "화면에 안 나와요"

**좋은 예**:
```
[문제 상황]
AI에게 "Create a pricing card"를 요청했는데
채팅으로는 "I'll create..."라고 응답하지만
오른쪽 프리뷰 창에 아무것도 표시되지 않습니다.

[재현 단계]
1. 새 프로젝트 생성
2. "Create a modern pricing card component" 입력
3. AI가 응답하지만 프리뷰 없음

[확인한 사항]
- 브라우저 콘솔: [에러 메시지 첨부]
- 서버 로그: npm run dev 실행 중
- 네트워크 탭: API 요청은 200 OK

[예상 동작]
프리뷰 창에 생성된 pricing card 컴포넌트가 표시되어야 함
```

### 학습한 교훈

1. **타입 안전성의 중요성**
   - 외부 패키지와 커스텀 타입 간의 혼동 방지
   - 명시적 타입 정의 및 import 경로 확인

2. **스트리밍 프로토콜 설계**
   - 명확한 프리픽스 사용 (`0:`, `1:`)
   - 파싱 에러 핸들링 필수

3. **AI 프롬프트 엔지니어링**
   - "MUST", "CRITICAL", 볼드 등으로 강조
   - 구체적인 예시와 단계별 지시
   - 도구 사용법 명시

4. **디버깅 전략**
   - 서버 로그 활용 (`stop_reason`, tool usage 확인)
   - 클라이언트-서버 데이터 흐름 추적
   - 타입 불일치 → 런타임 에러 패턴 인식

5. **데이터 정합성**
   - 빈 메시지 필터링을 여러 레이어에서 수행
   - DB 저장 전, API 전송 전, 렌더링 전 검증

### 남은 작업

- [ ] 기존 프로젝트의 잘못된 메시지 히스토리 정리
- [ ] DB 리셋 또는 새 프로젝트 생성으로 수정 사항 검증
- [ ] 프로덕션 배포 전 전체 플로우 테스트