import { describe, it, expect } from 'vitest';
import { executeToolCall } from '../lib/agent/tools';

describe('Nexus Agent Tools', () => {
  it('should return error for unknown tool', async () => {
    const result = await executeToolCall('unknown_tool', {}) as { error: string };
    expect(result.error).toContain('Herramienta desconocida: unknown_tool');
  });

  // More tests would require mocking window.ai or webllm engines
});
