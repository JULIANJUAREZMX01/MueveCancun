import { describe, it, expect } from 'vitest';
import { executeToolCall } from '../lib/agent/tools';

describe('Nexus Agent Tools', () => {
  it('should throw error for unknown tool', async () => {
    await expect(executeToolCall('unknown_tool', {})).rejects.toThrow('Unknown tool: unknown_tool');
  });

  // More tests would require mocking window.ai or webllm engines
});
