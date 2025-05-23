/**
 * Interface for proactive engagement rules.
 * Extracted from ConciergusContext.tsx.
 */
export interface ProactiveRule {
  id: string;
  triggerType: string;
  conditions: Record<string, unknown>;
  action: Record<string, unknown>;
  cooldown?: number;
  enabled?: boolean;
} 