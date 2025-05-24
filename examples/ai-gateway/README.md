# AI Gateway Integration Example

This example demonstrates how to integrate Conciergus AI with AI Gateway for enterprise multi-provider deployments, including automatic failover, cost optimization, and performance monitoring.

## 🎯 Features Demonstrated

- **Multi-Provider Setup**: Configure multiple AI providers with priorities
- **Automatic Failover**: Seamless switching when providers fail
- **Cost Optimization**: Intelligent routing based on cost and performance
- **Load Balancing**: Distribute requests across providers
- **Real-time Monitoring**: Track performance metrics and costs
- **Rate Limiting**: Prevent quota exhaustion
- **Model Comparison**: A/B testing across different models

## 🏗️ Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Conciergus UI     │    │    AI Gateway       │    │   AI Providers      │
│                     │    │                     │    │                     │
│ ┌─────────────────┐ │    │ ┌─────────────────┐ │    │ ┌─────────────────┐ │
│ │ Chat Component  │─┼────┼─│ Request Router  │─┼────┼─│ Anthropic       │ │
│ └─────────────────┘ │    │ └─────────────────┘ │    │ └─────────────────┘ │
│ ┌─────────────────┐ │    │ ┌─────────────────┐ │    │ ┌─────────────────┐ │
│ │ Cost Tracker    │─┼────┼─│ Cost Optimizer  │ │    │ │ OpenAI          │ │
│ └─────────────────┘ │    │ └─────────────────┘ │    │ └─────────────────┘ │
│ ┌─────────────────┐ │    │ ┌─────────────────┐ │    │ ┌─────────────────┐ │
│ │ Model Switcher  │─┼────┼─│ Load Balancer   │ │    │ │ Google AI       │ │
│ └─────────────────┘ │    │ └─────────────────┘ │    │ └─────────────────┘ │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

## 🚀 Quick Start

### 1. Environment Setup

```bash
cp .env.example .env
```

Configure your `.env` file:

```bash
# AI Provider Keys
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
GOOGLE_AI_API_KEY=your_google_key

# AI Gateway Configuration
AI_GATEWAY_URL=https://your-gateway.example.com
AI_GATEWAY_API_KEY=your_gateway_key

# Telemetry (Optional)
TELEMETRY_ENDPOINT=https://your-telemetry.example.com
ENABLE_COST_TRACKING=true
ENABLE_PERFORMANCE_MONITORING=true
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the example.

## 📁 Project Structure

```
ai-gateway/
├── README.md
├── package.json
├── .env.example
├── src/
│   ├── app.tsx                 # Main application
│   ├── components/
│   │   ├── ChatInterface.tsx   # Chat with gateway integration
│   │   ├── CostTracker.tsx     # Real-time cost monitoring
│   │   ├── ModelSwitcher.tsx   # Dynamic model selection
│   │   ├── PerformanceMetrics.tsx # Performance dashboard
│   │   └── ProviderStatus.tsx  # Provider health monitoring
│   ├── config/
│   │   └── gateway.ts          # AI Gateway configuration
│   ├── hooks/
│   │   ├── useGateway.ts       # Gateway management hook
│   │   ├── useCostTracking.ts  # Cost tracking hook
│   │   └── useModelComparison.ts # Model comparison hook
│   └── utils/
│       ├── failover.ts         # Failover logic
│       ├── costOptimizer.ts    # Cost optimization algorithms
│       └── loadBalancer.ts     # Load balancing strategies
├── tests/
│   ├── gateway.test.ts         # Gateway integration tests
│   ├── failover.test.ts        # Failover mechanism tests
│   └── costOptimizer.test.ts   # Cost optimization tests
└── docs/
    ├── DEPLOYMENT.md           # Production deployment guide
    ├── MONITORING.md           # Monitoring setup
    └── TROUBLESHOOTING.md      # Common issues and solutions
```

## 🔧 Configuration

### Basic Gateway Setup

```typescript
// src/config/gateway.ts
import { createAIGateway } from '@conciergus/ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const gateway = createAIGateway({
  providers: [
    {
      id: 'anthropic',
      name: 'Anthropic Claude',
      model: createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!,
      })('claude-3-5-sonnet-20241022'),
      priority: 1,
      costPerToken: {
        input: 0.000003,
        output: 0.000015,
      },
      rateLimit: {
        requests: 1000,
        period: '1h',
      },
    },
    {
      id: 'openai',
      name: 'OpenAI GPT-4',
      model: createOpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
      })('gpt-4-turbo'),
      priority: 2,
      costPerToken: {
        input: 0.00001,
        output: 0.00003,
      },
      rateLimit: {
        requests: 500,
        period: '1h',
      },
    },
    {
      id: 'google',
      name: 'Google Gemini',
      model: createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_AI_API_KEY!,
      })('gemini-1.5-pro'),
      priority: 3,
      costPerToken: {
        input: 0.00000125,
        output: 0.000005,
      },
      rateLimit: {
        requests: 2000,
        period: '1h',
      },
    },
  ],
  strategies: {
    failover: 'waterfall',
    loadBalancing: 'round-robin',
    costOptimization: 'cheapest-first',
  },
  monitoring: {
    enableMetrics: true,
    enableCostTracking: true,
    enablePerformanceMonitoring: true,
  },
});
```

### Advanced Strategies

```typescript
// src/utils/costOptimizer.ts
export class CostOptimizer {
  private providers: Provider[];
  private metrics: PerformanceMetrics;

  constructor(providers: Provider[], metrics: PerformanceMetrics) {
    this.providers = providers;
    this.metrics = metrics;
  }

  selectOptimalProvider(requestContext: RequestContext): Provider {
    const candidates = this.providers.filter(p => p.isHealthy);
    
    // Calculate cost-effectiveness score
    return candidates.reduce((best, current) => {
      const currentScore = this.calculateScore(current, requestContext);
      const bestScore = this.calculateScore(best, requestContext);
      
      return currentScore > bestScore ? current : best;
    });
  }

  private calculateScore(provider: Provider, context: RequestContext): number {
    const costScore = 1 / provider.costPerToken.input;
    const performanceScore = provider.averageLatency < 2000 ? 1 : 0.5;
    const reliabilityScore = provider.successRate;
    
    return (costScore * 0.3) + (performanceScore * 0.4) + (reliabilityScore * 0.3);
  }
}
```

### Failover Implementation

```typescript
// src/utils/failover.ts
export class FailoverManager {
  private providers: Provider[];
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  async executeWithFailover<T>(
    operation: (provider: Provider) => Promise<T>
  ): Promise<T> {
    let lastError: Error;
    
    for (const provider of this.getOrderedProviders()) {
      try {
        const result = await this.executeWithRetry(operation, provider);
        this.recordSuccess(provider);
        return result;
      } catch (error) {
        lastError = error as Error;
        this.recordFailure(provider, error);
        continue;
      }
    }
    
    throw new Error(`All providers failed. Last error: ${lastError.message}`);
  }

  private async executeWithRetry<T>(
    operation: (provider: Provider) => Promise<T>,
    provider: Provider
  ): Promise<T> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation(provider);
      } catch (error) {
        if (attempt === this.maxRetries) throw error;
        await this.delay(this.retryDelay * attempt);
      }
    }
    throw new Error('Max retries exceeded');
  }
}
```

## 📊 Monitoring Dashboard

The example includes a comprehensive monitoring dashboard:

### Cost Tracking Component

```typescript
// src/components/CostTracker.tsx
import { useCostTracking } from '../hooks/useCostTracking';

export function CostTracker() {
  const { 
    totalCost, 
    costByProvider, 
    costTrends, 
    projectedMonthlyCost 
  } = useCostTracking();

  return (
    <div className="cost-tracker">
      <div className="cost-summary">
        <h3>Cost Overview</h3>
        <div className="cost-metric">
          <span>Today: ${totalCost.today.toFixed(4)}</span>
          <span>This Month: ${totalCost.month.toFixed(2)}</span>
          <span>Projected: ${projectedMonthlyCost.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="provider-costs">
        {costByProvider.map(provider => (
          <div key={provider.id} className="provider-cost">
            <span>{provider.name}</span>
            <span>${provider.cost.toFixed(4)}</span>
            <span>{provider.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
      
      <CostChart data={costTrends} />
    </div>
  );
}
```

### Performance Metrics

```typescript
// src/components/PerformanceMetrics.tsx
export function PerformanceMetrics() {
  const metrics = usePerformanceMetrics();

  return (
    <div className="performance-metrics">
      <MetricCard
        title="Average Latency"
        value={`${metrics.averageLatency}ms`}
        trend={metrics.latencyTrend}
      />
      <MetricCard
        title="Success Rate"
        value={`${(metrics.successRate * 100).toFixed(1)}%`}
        trend={metrics.successRateTrend}
      />
      <MetricCard
        title="Requests/Hour"
        value={metrics.requestsPerHour}
        trend={metrics.requestsTrend}
      />
    </div>
  );
}
```

## 🧪 Testing

Run the test suite:

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# Load testing
pnpm test:load
```

### Example Test

```typescript
// tests/failover.test.ts
import { FailoverManager } from '../src/utils/failover';

describe('FailoverManager', () => {
  it('should failover to secondary provider when primary fails', async () => {
    const failoverManager = new FailoverManager([
      { id: 'primary', isHealthy: false },
      { id: 'secondary', isHealthy: true },
    ]);

    const result = await failoverManager.executeWithFailover(
      async (provider) => {
        if (provider.id === 'primary') throw new Error('Primary down');
        return 'success';
      }
    );

    expect(result).toBe('success');
  });
});
```

## 🚀 Production Deployment

### Docker Setup

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN pnpm install --production

COPY . .
RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "start"]
```

### Kubernetes Configuration

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: conciergus-ai-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: conciergus-ai-gateway
  template:
    metadata:
      labels:
        app: conciergus-ai-gateway
    spec:
      containers:
      - name: app
        image: conciergus/ai-gateway:latest
        ports:
        - containerPort: 3000
        env:
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: ai-keys
              key: anthropic
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: ai-keys
              key: openai
```

## 📈 Performance Optimization

### Caching Strategy

```typescript
// src/utils/cache.ts
export class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  private ttl = 5 * 60 * 1000; // 5 minutes

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: string): void {
    this.cache.set(key, {
      value,
      expires: Date.now() + this.ttl,
    });
  }
}
```

### Connection Pooling

```typescript
// src/utils/connectionPool.ts
export class ConnectionPool {
  private pools = new Map<string, Connection[]>();
  private maxConnections = 10;

  async getConnection(providerId: string): Promise<Connection> {
    let pool = this.pools.get(providerId);
    if (!pool) {
      pool = [];
      this.pools.set(providerId, pool);
    }

    // Return existing connection or create new one
    const connection = pool.pop() || await this.createConnection(providerId);
    return connection;
  }

  releaseConnection(providerId: string, connection: Connection): void {
    const pool = this.pools.get(providerId) || [];
    if (pool.length < this.maxConnections) {
      pool.push(connection);
    } else {
      connection.close();
    }
  }
}
```

## 🔍 Troubleshooting

### Common Issues

1. **Provider Authentication Failures**
   - Verify API keys are correctly configured
   - Check rate limits and quotas
   - Ensure providers support your region

2. **High Latency**
   - Enable connection pooling
   - Implement response caching
   - Use geographic load balancing

3. **Cost Overruns**
   - Set up spending alerts
   - Implement usage quotas
   - Optimize model selection

### Debug Mode

Enable comprehensive logging:

```bash
DEBUG=true pnpm dev
```

### Health Checks

Monitor provider health:

```typescript
// Health check endpoint
app.get('/health', async (req, res) => {
  const healthChecks = await Promise.all(
    providers.map(async (provider) => ({
      id: provider.id,
      status: await provider.healthCheck(),
      latency: await provider.ping(),
    }))
  );

  res.json({
    status: 'ok',
    providers: healthChecks,
    timestamp: new Date().toISOString(),
  });
});
```

## 📚 Related Examples

- [**telemetry**](../telemetry/) - Detailed telemetry setup
- [**cost-tracking**](../cost-tracking/) - Advanced cost optimization
- [**monitoring**](../monitoring/) - Production monitoring
- [**kubernetes**](../kubernetes/) - Kubernetes deployment

## 🆘 Support

For issues specific to this example:
1. Check the [troubleshooting guide](./docs/TROUBLESHOOTING.md)
2. Review the [deployment documentation](./docs/DEPLOYMENT.md)
3. Open an issue with the `ai-gateway` label

---

This example demonstrates enterprise-grade AI Gateway integration with Conciergus AI, providing robust failover, cost optimization, and comprehensive monitoring for production deployments. 