import { anthropic } from "@ai-sdk/anthropic";
import {
  LanguageModelV1,
  LanguageModelV1StreamPart,
  LanguageModelV1Message,
} from "@ai-sdk/provider";

const MODEL = "claude-3-5-haiku-latest";

export class MockLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v2" as const;
  readonly provider = "mock";
  readonly modelId: string;
  readonly defaultObjectGenerationMode = "tool" as const;
  readonly supportsStructuredOutputs = false;

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUserPrompt(messages: LanguageModelV1Message[]): string {
    // Find the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "user") {
        const content = message.content;
        if (Array.isArray(content)) {
          // Extract text from content parts
          const textParts = content
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text);
          return textParts.join(" ");
        } else if (typeof content === "string") {
          return content;
        }
      }
    }
    return "";
  }

  private getLastToolResult(messages: LanguageModelV1Message[]): any {
    // Find the last tool message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "tool") {
        const content = messages[i].content;
        if (Array.isArray(content) && content.length > 0) {
          return content[0];
        }
      }
    }
    return null;
  }

  private async *generateMockStream(
    messages: LanguageModelV1Message[],
    userPrompt: string
  ): AsyncGenerator<LanguageModelV1StreamPart> {
    // Count tool messages to determine which step we're on
    const toolMessageCount = messages.filter((m) => m.role === "tool").length;

    // Determine component type from the original user prompt
    const promptLower = userPrompt.toLowerCase();
    let componentType = "counter";
    let componentName = "Counter";

    if (promptLower.includes("세차") || promptLower.includes("car wash") || promptLower.includes("transportation")) {
      componentType = "carwash";
      componentName = "CarWashTransport";
    } else if (promptLower.includes("form")) {
      componentType = "form";
      componentName = "ContactForm";
    } else if (promptLower.includes("card")) {
      componentType = "card";
      componentName = "Card";
    }

    // Step 1: Create component file
    if (toolMessageCount === 1) {
      const text = `I'll create a ${componentName} component for you.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_1`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: `/components/${componentName}.jsx`,
          file_text: this.getComponentCode(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 2: Enhance component
    if (toolMessageCount === 2) {
      const text = `Now let me enhance the component with better styling.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_2`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "str_replace",
          path: `/components/${componentName}.jsx`,
          old_str: this.getOldStringForReplace(componentType),
          new_str: this.getNewStringForReplace(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 3: Create App.jsx
    if (toolMessageCount === 0) {
      const text = `This is a static response. You can place an Anthropic API key in the .env file to use the Anthropic API for component generation. Let me create an App.jsx file to display the component.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(15);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_3`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: "/App.jsx",
          file_text: this.getAppCode(componentName),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 4: Final summary (no tool call)
    if (toolMessageCount >= 3) {
      const text = `Perfect! I've created:

1. **${componentName}.jsx** - A fully-featured ${componentType} component
2. **App.jsx** - The main app file that displays the component

The component is now ready to use. You can see the preview on the right side of the screen.`;

      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(30);
      }

      yield {
        type: "finish",
        finishReason: "stop",
        usage: {
          promptTokens: 50,
          completionTokens: 50,
        },
      };
      return;
    }
  }

  private getComponentCode(componentType: string): string {
    switch (componentType) {
      case "form":
        return `import React, { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Handle form submission here
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Contact Us</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
        >
          Send Message
        </button>
      </form>
    </div>
  );
};

export default ContactForm;`;

      case "carwash":
        return `import { useState } from 'react';

const CarWashTransport = () => {
  const [distance, setDistance] = useState(50);
  const [purpose, setPurpose] = useState('wash');

  const getRecommendation = () => {
    if (purpose === 'wash') {
      return {
        method: 'drive',
        icon: '🚗',
        title: '운전해서 가세요',
        reason: '세차할 차를 직접 가져가야 합니다.',
        color: 'blue',
      };
    }
    if (distance <= 500) {
      return {
        method: 'walk',
        icon: '🚶',
        title: '걸어가세요',
        reason: \`\${distance}m는 도보 약 \${Math.ceil(distance / 80)}분 거리입니다.\`,
        color: 'green',
      };
    }
    return {
      method: 'drive',
      icon: '🚗',
      title: '운전해서 가세요',
      reason: \`\${distance}m는 걷기엔 먼 거리입니다.\`,
      color: 'blue',
    };
  };

  const rec = getRecommendation();
  const bgColor = rec.color === 'green' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200';
  const textColor = rec.color === 'green' ? 'text-green-700' : 'text-blue-700';
  const badgeColor = rec.color === 'green' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold mb-1 text-gray-900">세차장 교통수단 추천</h2>
      <p className="text-sm text-gray-500 mb-6">거리와 목적에 맞는 이동 방법을 알려드려요</p>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            목적
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setPurpose('wash')}
              className={\`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all \${
                purpose === 'wash'
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }\`}
            >
              🧽 세차하러
            </button>
            <button
              onClick={() => setPurpose('supply')}
              className={\`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all \${
                purpose === 'supply'
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }\`}
            >
              🧴 용품 구매
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            거리: <span className="font-bold text-gray-900">{distance}m</span>
          </label>
          <input
            type="range"
            min="10"
            max="2000"
            step="10"
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>10m</span>
            <span>1km</span>
            <span>2km</span>
          </div>
        </div>
      </div>

      <div className={\`p-5 rounded-xl border-2 \${bgColor} transition-all\`}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{rec.icon}</span>
          <div>
            <span className={\`inline-block px-2 py-0.5 rounded-full text-xs font-semibold \${badgeColor} mb-1\`}>
              {rec.method === 'drive' ? '운전' : '도보'} 추천
            </span>
            <h3 className={\`text-lg font-bold \${textColor}\`}>{rec.title}</h3>
          </div>
        </div>
        <p className={\`text-sm \${textColor} opacity-80\`}>{rec.reason}</p>
      </div>

      {purpose === 'wash' && (
        <p className="mt-4 text-xs text-gray-400 text-center">
          💡 세차 목적이라면 거리와 관계없이 차를 가져가야 합니다
        </p>
      )}
    </div>
  );
};

export default CarWashTransport;`;

      case "card":
        return `import React from 'react';

const Card = ({ 
  title = "Welcome to Our Service", 
  description = "Discover amazing features and capabilities that will transform your experience.",
  imageUrl,
  actions 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {imageUrl && (
        <img 
          src={imageUrl} 
          alt={title}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        {actions && (
          <div className="mt-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;`;

      default:
        return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  const increment = () => {
    setCount(count + 1);
  };

  const decrement = () => {
    setCount(count - 1);
  };

  const reset = () => {
    setCount(0);
  };

  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Counter</h2>
      <div className="text-4xl font-bold mb-6">{count}</div>
      <div className="flex gap-4">
        <button 
          onClick={decrement}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Decrease
        </button>
        <button 
          onClick={reset}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Reset
        </button>
        <button 
          onClick={increment}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Increase
        </button>
      </div>
    </div>
  );
};

export default Counter;`;
    }
  }

  private getOldStringForReplace(componentType: string): string {
    switch (componentType) {
      case "carwash":
        return "      <p className=\"text-sm text-gray-500 mb-6\">거리와 목적에 맞는 이동 방법을 알려드려요</p>";
      case "form":
        return "    console.log('Form submitted:', formData);";
      case "card":
        return '      <div className="p-6">';
      default:
        return "  const increment = () => setCount(count + 1);";
    }
  }

  private getNewStringForReplace(componentType: string): string {
    switch (componentType) {
      case "carwash":
        return "      <p className=\"text-sm text-gray-500 mb-6\">거리와 목적에 맞는 최적의 이동 방법을 알려드려요 ✨</p>";
      case "form":
        return "    console.log('Form submitted:', formData);\n    alert('Thank you! We\\'ll get back to you soon.');";
      case "card":
        return '      <div className="p-6 hover:bg-gray-50 transition-colors">';
      default:
        return "  const increment = () => setCount(prev => prev + 1);";
    }
  }

  private getAppCode(componentName: string): string {
    if (componentName === "CarWashTransport") {
      return `import CarWashTransport from '@/components/CarWashTransport';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-8">
      <CarWashTransport />
    </div>
  );
}`;
    }

    if (componentName === "Card") {
      return `import Card from '@/components/Card';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Card 
          title="Amazing Product"
          description="This is a fantastic product that will change your life. Experience the difference today!"
          actions={
            <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
              Learn More
            </button>
          }
        />
      </div>
    </div>
  );
}`;
    }

    return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <${componentName} />
      </div>
    </div>
  );
}`;
  }

  async doGenerate(
    options: Parameters<LanguageModelV1["doGenerate"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);

    // Collect all stream parts
    const parts: LanguageModelV1StreamPart[] = [];
    for await (const part of this.generateMockStream(
      options.prompt,
      userPrompt
    )) {
      parts.push(part);
    }

    // Build response from parts
    const textParts = parts
      .filter((p) => p.type === "text-delta")
      .map((p) => (p as any).textDelta)
      .join("");

    const toolCalls = parts
      .filter((p) => p.type === "tool-call")
      .map((p) => ({
        toolCallType: "function" as const,
        toolCallId: (p as any).toolCallId,
        toolName: (p as any).toolName,
        args: (p as any).args,
      }));

    // Get finish reason from finish part
    const finishPart = parts.find((p) => p.type === "finish") as any;
    const finishReason = finishPart?.finishReason || "stop";

    return {
      text: textParts,
      toolCalls,
      finishReason: finishReason as any,
      usage: {
        promptTokens: 100,
        completionTokens: 200,
      },
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {
          maxTokens: options.maxTokens,
          temperature: options.temperature,
        },
      },
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
    console.log('[MockLanguageModel] doStream called');
    const userPrompt = this.extractUserPrompt(options.prompt);
    console.log('[MockLanguageModel] User prompt:', userPrompt.substring(0, 100) + '...');

    const self = this;

    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        console.log('[MockLanguageModel] Stream start');
        try {
          const generator = self.generateMockStream(options.prompt, userPrompt);
          let chunkCount = 0;

          for await (const chunk of generator) {
            chunkCount++;
            if (chunkCount <= 3) {
              console.log('[MockLanguageModel] Chunk', chunkCount, ':', chunk.type);
            }
            controller.enqueue(chunk);
          }

          console.log('[MockLanguageModel] Stream completed. Total chunks:', chunkCount);
          controller.close();
        } catch (error) {
          console.error('[MockLanguageModel] ❌ Stream error:', error);
          controller.error(error);
        }
      },
    });

    console.log('[MockLanguageModel] Returning stream object');
    return {
      stream,
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {},
      },
      rawResponse: { headers: {} },
    };
  }
}

export function getLanguageModel() {
  console.log('\n[PROVIDER] getLanguageModel called');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log('[PROVIDER] API key exists:', !!apiKey);
  console.log('[PROVIDER] API key length:', apiKey?.length || 0);

  // API 키가 없거나 빈 문자열인 경우
  if (!apiKey || apiKey.trim() === "") {
    console.error('[PROVIDER] ❌ No API key provided');
    throw new Error(
      'ANTHROPIC_API_KEY is required. Please add a valid Anthropic API key to your .env file.\n' +
      'Get your API key from: https://console.anthropic.com/'
    );
  }

  // API 키 형식 검증: 특수문자(#, @, !, 등) 포함 여부 확인
  const isValidFormat = /^[a-zA-Z0-9_-]+$/.test(apiKey);
  console.log('[PROVIDER] API key format valid:', isValidFormat);

  if (!isValidFormat) {
    console.error('[PROVIDER] ❌ Invalid API key format (contains special characters)');
    console.error('[PROVIDER] First 20 chars:', apiKey.substring(0, 20) + '...');
    throw new Error(
      'Invalid ANTHROPIC_API_KEY format. API keys should only contain letters, numbers, hyphens, and underscores.\n' +
      'Please check your .env file and ensure the API key is correct.\n' +
      'Get a valid API key from: https://console.anthropic.com/'
    );
  }

  // API 키 길이 검증 추가
  if (apiKey.length < 50) {
    console.error('[PROVIDER] ❌ API key too short:', apiKey.length, 'chars');
    throw new Error(
      'Invalid ANTHROPIC_API_KEY. Anthropic API keys are typically 100+ characters long.\n' +
      'Please check your .env file and ensure you copied the complete API key.\n' +
      'Get a valid API key from: https://console.anthropic.com/'
    );
  }

  // 실제 Anthropic API 사용
  console.log('[PROVIDER] ✓ Using Anthropic model:', MODEL);
  return anthropic(MODEL);
}
