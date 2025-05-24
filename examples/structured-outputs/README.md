# Structured Outputs Example

This example demonstrates AI SDK 5 Alpha's advanced structured output capabilities with Conciergus AI, including real-time object streaming, schema validation, and interactive UI generation.

## 🎯 Features Demonstrated

- **Real-time Object Streaming**: Stream complex objects as they're generated
- **Schema Validation**: Zod-based type safety and runtime validation
- **Interactive UI**: Dynamic component rendering based on streamed data
- **Partial Object Updates**: Handle incomplete objects during streaming
- **Error Recovery**: Graceful handling of malformed or incomplete data
- **TypeScript Integration**: Full type safety throughout the pipeline

## 🏗️ What You'll Build

- A **Recipe Generator** that streams structured recipe data
- A **Code Generator** that produces validated code snippets
- A **Form Builder** that creates forms from natural language
- A **Data Dashboard** that visualizes streamed analytics

## 🚀 Quick Start

### 1. Environment Setup

```bash
cp .env.example .env
```

Configure your `.env`:

```bash
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Start Development Server

```bash
pnpm dev
```

## 📁 Project Structure

```
structured-outputs/
├── README.md
├── package.json
├── .env.example
├── src/
│   ├── app.tsx                    # Main application
│   ├── components/
│   │   ├── RecipeGenerator.tsx    # Recipe streaming example
│   │   ├── CodeGenerator.tsx      # Code generation with validation
│   │   ├── FormBuilder.tsx        # Dynamic form creation
│   │   ├── DataDashboard.tsx      # Analytics visualization
│   │   └── StreamingViewer.tsx    # Generic streaming component
│   ├── schemas/
│   │   ├── recipe.ts              # Recipe schema definitions
│   │   ├── code.ts                # Code schema definitions
│   │   ├── form.ts                # Form schema definitions
│   │   └── analytics.ts           # Analytics schema definitions
│   ├── hooks/
│   │   ├── useStructuredStream.ts # Structured streaming hook
│   │   ├── useObjectValidation.ts # Runtime validation hook
│   │   └── usePartialUpdates.ts   # Partial object handling
│   └── utils/
│       ├── schemaValidator.ts     # Schema validation utilities
│       ├── streamProcessor.ts     # Stream processing logic
│       └── errorRecovery.ts       # Error handling strategies
├── tests/
│   ├── streaming.test.ts          # Streaming functionality tests
│   ├── schemas.test.ts            # Schema validation tests
│   └── components.test.ts         # Component rendering tests
└── api/
    ├── recipe/route.ts            # Recipe generation endpoint
    ├── code/route.ts              # Code generation endpoint
    ├── form/route.ts              # Form building endpoint
    └── analytics/route.ts         # Analytics endpoint
```

## 🔧 Schema Definitions

### Recipe Schema

```typescript
// src/schemas/recipe.ts
import { z } from 'zod';

export const ingredientSchema = z.object({
  name: z.string(),
  amount: z.string(),
  unit: z.string().optional(),
  notes: z.string().optional(),
});

export const instructionSchema = z.object({
  step: z.number(),
  description: z.string(),
  duration: z.string().optional(),
  temperature: z.string().optional(),
});

export const recipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  cuisine: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  prepTime: z.string(),
  cookTime: z.string(),
  servings: z.number(),
  ingredients: z.array(ingredientSchema),
  instructions: z.array(instructionSchema),
  nutritionalInfo: z.object({
    calories: z.number(),
    protein: z.string(),
    carbs: z.string(),
    fat: z.string(),
  }).optional(),
  tags: z.array(z.string()),
});

export type Recipe = z.infer<typeof recipeSchema>;
export type Ingredient = z.infer<typeof ingredientSchema>;
export type Instruction = z.infer<typeof instructionSchema>;
```

### Code Schema

```typescript
// src/schemas/code.ts
import { z } from 'zod';

export const codeFileSchema = z.object({
  filename: z.string(),
  language: z.enum(['typescript', 'javascript', 'python', 'rust', 'go']),
  content: z.string(),
  description: z.string(),
  dependencies: z.array(z.string()).optional(),
});

export const codeProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  framework: z.string(),
  files: z.array(codeFileSchema),
  packageJson: z.object({
    dependencies: z.record(z.string()),
    devDependencies: z.record(z.string()).optional(),
    scripts: z.record(z.string()).optional(),
  }).optional(),
  instructions: z.array(z.string()),
});

export type CodeProject = z.infer<typeof codeProjectSchema>;
export type CodeFile = z.infer<typeof codeFileSchema>;
```

## 🎮 Interactive Components

### Recipe Generator

```typescript
// src/components/RecipeGenerator.tsx
import { useObject } from 'ai/react';
import { recipeSchema } from '../schemas/recipe';
import { ConciergusObjectStream } from '@conciergus/ai';

export function RecipeGenerator() {
  const {
    object: recipe,
    submit,
    isLoading,
    error,
    stop,
  } = useObject({
    api: '/api/recipe',
    schema: recipeSchema,
    onFinish: (result) => {
      console.log('Recipe completed:', result);
    },
    onError: (error) => {
      console.error('Recipe generation failed:', error);
    },
  });

  return (
    <div className="recipe-generator">
      <div className="input-section">
        <h2>AI Recipe Generator</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const prompt = formData.get('prompt') as string;
            submit(`Create a detailed recipe for: ${prompt}`);
          }}
        >
          <input
            name="prompt"
            placeholder="What would you like to cook?"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate Recipe'}
          </button>
          {isLoading && (
            <button type="button" onClick={stop}>
              Stop Generation
            </button>
          )}
        </form>
      </div>

      <div className="output-section">
        <ConciergusObjectStream
          object={recipe}
          schema={recipeSchema}
          renderPartial={(partial) => <RecipePreview recipe={partial} />}
          renderComplete={(complete) => <RecipeCard recipe={complete} />}
          renderError={(error) => <ErrorDisplay error={error} />}
        />
      </div>
    </div>
  );
}

function RecipePreview({ recipe }: { recipe: Partial<Recipe> }) {
  return (
    <div className="recipe-preview">
      {recipe.title && <h3>{recipe.title}</h3>}
      {recipe.description && <p>{recipe.description}</p>}
      
      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <div className="ingredients">
          <h4>Ingredients ({recipe.ingredients.length})</h4>
          <ul>
            {recipe.ingredients.map((ingredient, index) => (
              <li key={index}>
                {ingredient.amount} {ingredient.unit} {ingredient.name}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {recipe.instructions && recipe.instructions.length > 0 && (
        <div className="instructions">
          <h4>Instructions ({recipe.instructions.length})</h4>
          <ol>
            {recipe.instructions.map((instruction, index) => (
              <li key={index}>{instruction.description}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
```

### Code Generator

```typescript
// src/components/CodeGenerator.tsx
import { useObject } from 'ai/react';
import { codeProjectSchema } from '../schemas/code';
import { ConciergusCodeViewer } from '@conciergus/ai';

export function CodeGenerator() {
  const {
    object: project,
    submit,
    isLoading,
    error,
  } = useObject({
    api: '/api/code',
    schema: codeProjectSchema,
  });

  return (
    <div className="code-generator">
      <div className="input-section">
        <h2>AI Code Generator</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const description = formData.get('description') as string;
            const framework = formData.get('framework') as string;
            
            submit(`Create a ${framework} project: ${description}`);
          }}
        >
          <input
            name="description"
            placeholder="Describe your project"
            disabled={isLoading}
          />
          <select name="framework" disabled={isLoading}>
            <option value="react">React</option>
            <option value="vue">Vue</option>
            <option value="svelte">Svelte</option>
            <option value="nextjs">Next.js</option>
          </select>
          <button type="submit" disabled={isLoading}>
            Generate Code
          </button>
        </form>
      </div>

      <div className="output-section">
        {project && (
          <ConciergusCodeViewer
            project={project}
            showFileTree={true}
            enableSyntaxHighlighting={true}
            enableCopyToClipboard={true}
          />
        )}
      </div>
    </div>
  );
}
```

## 🔄 Streaming Hooks

### Custom Structured Streaming Hook

```typescript
// src/hooks/useStructuredStream.ts
import { useState, useCallback } from 'react';
import { z } from 'zod';

export function useStructuredStream<T>(
  schema: z.ZodSchema<T>,
  endpoint: string
) {
  const [object, setObject] = useState<Partial<T> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submit = useCallback(async (prompt: string) => {
    setIsLoading(true);
    setError(null);
    setObject(null);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Try to parse complete JSON objects from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              
              // Validate partial object against schema
              const validated = schema.partial().parse(data);
              setObject(validated);
            } catch (parseError) {
              console.warn('Failed to parse streaming data:', parseError);
            }
          }
        }
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [schema, endpoint]);

  return {
    object,
    submit,
    isLoading,
    error,
  };
}
```

### Object Validation Hook

```typescript
// src/hooks/useObjectValidation.ts
import { useMemo } from 'react';
import { z } from 'zod';

export function useObjectValidation<T>(
  object: Partial<T> | null,
  schema: z.ZodSchema<T>
) {
  return useMemo(() => {
    if (!object) {
      return {
        isValid: false,
        isPartial: true,
        errors: [],
        completeness: 0,
      };
    }

    try {
      // Try full validation
      schema.parse(object);
      return {
        isValid: true,
        isPartial: false,
        errors: [],
        completeness: 1,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Calculate completeness based on present fields
        const requiredFields = getRequiredFields(schema);
        const presentFields = Object.keys(object).length;
        const completeness = presentFields / requiredFields.length;

        return {
          isValid: false,
          isPartial: true,
          errors: error.errors,
          completeness: Math.min(completeness, 0.99), // Never 100% if invalid
        };
      }

      return {
        isValid: false,
        isPartial: true,
        errors: [{ message: 'Unknown validation error' }],
        completeness: 0,
      };
    }
  }, [object, schema]);
}

function getRequiredFields(schema: z.ZodSchema): string[] {
  // This is a simplified implementation
  // In practice, you'd need to traverse the schema more thoroughly
  if (schema instanceof z.ZodObject) {
    return Object.keys(schema.shape);
  }
  return [];
}
```

## 🛡️ Error Recovery

### Stream Error Recovery

```typescript
// src/utils/errorRecovery.ts
export class StreamErrorRecovery {
  private retryAttempts = 3;
  private retryDelay = 1000;

  async recoverFromError<T>(
    operation: () => Promise<T>,
    onPartialRecovery?: (attempt: number) => void
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.retryAttempts) {
          onPartialRecovery?.(attempt);
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    
    throw lastError!;
  }

  async recoverPartialObject<T>(
    partialObject: Partial<T>,
    schema: z.ZodSchema<T>,
    regenerateField: (fieldName: string) => Promise<any>
  ): Promise<T> {
    const result = { ...partialObject };
    
    try {
      return schema.parse(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Try to fix missing required fields
        for (const issue of error.errors) {
          if (issue.code === 'invalid_type' && issue.received === 'undefined') {
            const fieldPath = issue.path.join('.');
            try {
              const regeneratedValue = await regenerateField(fieldPath);
              this.setNestedProperty(result, issue.path, regeneratedValue);
            } catch (regenerationError) {
              console.warn(`Failed to regenerate field ${fieldPath}:`, regenerationError);
            }
          }
        }
        
        // Try validation again
        return schema.parse(result);
      }
      
      throw error;
    }
  }

  private setNestedProperty(obj: any, path: (string | number)[], value: any): void {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
    current[path[path.length - 1]] = value;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## 🎨 UI Components

### Generic Streaming Viewer

```typescript
// src/components/StreamingViewer.tsx
import { z } from 'zod';
import { useObjectValidation } from '../hooks/useObjectValidation';

interface StreamingViewerProps<T> {
  object: Partial<T> | null;
  schema: z.ZodSchema<T>;
  renderPartial: (object: Partial<T>, validation: ValidationResult) => React.ReactNode;
  renderComplete: (object: T) => React.ReactNode;
  renderError?: (error: z.ZodError) => React.ReactNode;
}

export function StreamingViewer<T>({
  object,
  schema,
  renderPartial,
  renderComplete,
  renderError,
}: StreamingViewerProps<T>) {
  const validation = useObjectValidation(object, schema);

  if (!object) {
    return (
      <div className="streaming-viewer empty">
        <div className="placeholder">
          Waiting for data...
        </div>
      </div>
    );
  }

  if (validation.isValid) {
    return (
      <div className="streaming-viewer complete">
        {renderComplete(object as T)}
      </div>
    );
  }

  if (validation.errors.length > 0 && renderError) {
    const zodError = new z.ZodError(validation.errors);
    return (
      <div className="streaming-viewer error">
        {renderError(zodError)}
      </div>
    );
  }

  return (
    <div className="streaming-viewer partial">
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${validation.completeness * 100}%` }}
        />
        <span className="progress-text">
          {Math.round(validation.completeness * 100)}% complete
        </span>
      </div>
      {renderPartial(object, validation)}
    </div>
  );
}
```

## 🧪 Testing

### Schema Validation Tests

```typescript
// tests/schemas.test.ts
import { recipeSchema, codeProjectSchema } from '../src/schemas';

describe('Schema Validation', () => {
  test('should validate complete recipe', () => {
    const recipe = {
      title: 'Chocolate Chip Cookies',
      description: 'Classic homemade cookies',
      cuisine: 'American',
      difficulty: 'easy' as const,
      prepTime: '15 minutes',
      cookTime: '12 minutes',
      servings: 24,
      ingredients: [
        { name: 'flour', amount: '2', unit: 'cups' },
        { name: 'sugar', amount: '1', unit: 'cup' },
      ],
      instructions: [
        { step: 1, description: 'Mix dry ingredients' },
        { step: 2, description: 'Add wet ingredients' },
      ],
      tags: ['dessert', 'cookies'],
    };

    expect(() => recipeSchema.parse(recipe)).not.toThrow();
  });

  test('should handle partial recipe during streaming', () => {
    const partialRecipe = {
      title: 'Chocolate Chip Cookies',
      description: 'Classic homemade cookies',
    };

    const result = recipeSchema.partial().safeParse(partialRecipe);
    expect(result.success).toBe(true);
  });
});
```

### Streaming Tests

```typescript
// tests/streaming.test.ts
import { useStructuredStream } from '../src/hooks/useStructuredStream';
import { recipeSchema } from '../src/schemas/recipe';

// Mock fetch for testing
global.fetch = jest.fn();

describe('Structured Streaming', () => {
  test('should handle streaming recipe generation', async () => {
    const mockResponse = {
      body: {
        getReader: () => ({
          read: jest.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('{"title":"Test Recipe"}\n'),
            })
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('{"title":"Test Recipe","ingredients":[{"name":"flour","amount":"2","unit":"cups"}]}\n'),
            })
            .mockResolvedValueOnce({
              done: true,
              value: undefined,
            }),
        }),
      },
    };

    (fetch as jest.Mock).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => 
      useStructuredStream(recipeSchema, '/api/recipe')
    );

    await act(async () => {
      await result.current.submit('chocolate chip cookies');
    });

    expect(result.current.object).toMatchObject({
      title: 'Test Recipe',
      ingredients: [{ name: 'flour', amount: '2', unit: 'cups' }],
    });
  });
});
```

## 🚀 API Routes

### Recipe Generation

```typescript
// api/recipe/route.ts
import { streamObject } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { recipeSchema } from '../../src/schemas/recipe';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const result = await streamObject({
    model: anthropic('claude-3-5-sonnet-20241022'),
    schema: recipeSchema,
    prompt: `Create a detailed recipe for: ${prompt}
    
    Include all required fields:
    - Title and description
    - Cuisine type and difficulty level
    - Preparation and cooking times
    - Number of servings
    - Complete ingredients list with amounts and units
    - Step-by-step instructions
    - Relevant tags
    - Nutritional information if possible
    
    Make sure the recipe is practical and easy to follow.`,
  });

  return result.toTextStreamResponse();
}
```

## 📚 Best Practices

### Schema Design

1. **Use Progressive Disclosure**: Design schemas that work well with partial data
2. **Provide Defaults**: Use `.default()` for non-critical fields
3. **Validate Incrementally**: Use `.partial()` for streaming validation
4. **Handle Arrays Gracefully**: Consider empty arrays vs undefined

### Error Handling

1. **Graceful Degradation**: Show partial content when possible
2. **Clear Error Messages**: Provide actionable feedback to users
3. **Retry Mechanisms**: Implement smart retry logic for failures
4. **Fallback Content**: Always have a fallback when streaming fails

### Performance

1. **Debounce Updates**: Don't re-render on every token
2. **Memoize Validation**: Cache validation results when possible
3. **Optimize Schemas**: Keep schemas simple and efficient
4. **Stream Intelligently**: Balance real-time updates with performance

## 🔗 Related Examples

- [**basic-chat**](../basic-chat/) - Basic chat implementation
- [**agent-workflows**](../agent-workflows/) - Complex agent interactions
- [**voice-chat**](../voice-chat/) - Voice integration with structured outputs

---

This example showcases the power of AI SDK 5 Alpha's structured output capabilities, providing type-safe, real-time streaming of complex objects with comprehensive error handling and validation. 