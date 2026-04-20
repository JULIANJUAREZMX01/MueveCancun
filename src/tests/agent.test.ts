import { describe, it, expect } from 'vitest';
import { executeToolCall } from '../lib/agent/tools';

describe('Nexus Agent Tools', () => {
  it('should return error object for unknown tool', async () => {
    const result = await executeToolCall('unknown_tool', {});
    expect(result).toEqual({ error: 'Herramienta desconocida: unknown_tool' });
  });

  // More tests would require mocking window.ai or webllm engines
});
