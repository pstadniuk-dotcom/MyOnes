/**
 * Agent Runner — Core tool-calling loop with safety rails
 *
 * This is the shared execution engine for all agents (PR, Retention, etc.).
 * It runs a loop where the AI picks a tool, we execute it, and repeat
 * until the task is complete or safety limits are hit.
 */
import OpenAI from 'openai';
import type { ChatCompletionMessageFunctionToolCall } from 'openai/resources/chat/completions/completions';
import logger from '../../infra/logging/logger';
import { agentRepository } from './agent.repository';

// Safety configuration
const DEFAULT_MAX_ITERATIONS = 20; // Max tool calls per run
const DEFAULT_MAX_TOKENS = 200_000; // Max tokens per run
const MAX_CONSECUTIVE_FAILURES = 3; // Circuit breaker threshold

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>; // JSON schema
  execute: (args: any) => Promise<any>;
}

export interface AgentRunOptions {
  agentName: string;
  systemPrompt: string;
  userPrompt: string;
  tools: AgentTool[];
  model?: string;
  maxIterations?: number;
  maxTokens?: number;
  onProgress?: (step: { action: string; result: string }) => void;
}

export interface AgentRunResult {
  runId: string;
  status: 'completed' | 'failed' | 'paused';
  steps: Array<{ timestamp: string; action: string; result: string; details?: any }>;
  totalTokens: number;
  finalOutput: string;
  prospectsFound: number;
  pitchesDrafted: number;
  error?: string;
}

export async function runAgent(options: AgentRunOptions): Promise<AgentRunResult> {
  const {
    agentName,
    systemPrompt,
    userPrompt,
    tools,
    model = 'gpt-4o',
    maxIterations = DEFAULT_MAX_ITERATIONS,
    maxTokens = DEFAULT_MAX_TOKENS,
    onProgress,
  } = options;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Create agent run record
  const runId = await agentRepository.createRun({
    agentName,
    status: 'running',
    runLog: [],
  });

  const steps: AgentRunResult['steps'] = [];
  let totalTokens = 0;
  let consecutiveFailures = 0;
  let prospectsFound = 0;
  let pitchesDrafted = 0;
  let finalOutput = '';

  // Build OpenAI function definitions from our tools
  const openaiTools: OpenAI.Chat.Completions.ChatCompletionTool[] = tools.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  // Conversation history for the loop
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  try {
    for (let i = 0; i < maxIterations; i++) {
      // Check token budget
      if (totalTokens >= maxTokens) {
        const msg = `Token budget exhausted (${totalTokens}/${maxTokens})`;
        steps.push({ timestamp: new Date().toISOString(), action: 'budget_limit', result: msg });
        logger.warn(`[${agentName}] ${msg}`);
        break;
      }

      // Call OpenAI
      const response = await openai.chat.completions.create({
        model,
        messages,
        tools: openaiTools.length > 0 ? openaiTools : undefined,
        tool_choice: openaiTools.length > 0 ? 'auto' : undefined,
        temperature: 0.3,
      });

      const choice = response.choices[0];
      const usage = response.usage;
      if (usage) {
        totalTokens += usage.total_tokens;
      }

      // If no tool calls, the AI is done
      if (choice.finish_reason === 'stop' || !choice.message.tool_calls?.length) {
        finalOutput = choice.message.content || '';
        steps.push({
          timestamp: new Date().toISOString(),
          action: 'completed',
          result: finalOutput.substring(0, 500),
        });
        break;
      }

      // Process tool calls
      messages.push(choice.message);

      for (const tc of choice.message.tool_calls) {
        const toolCall = tc as ChatCompletionMessageFunctionToolCall;
        const toolName = toolCall.function.name;
        const tool = tools.find(t => t.name === toolName);

        if (!tool) {
          const errorResult = `Tool "${toolName}" not found`;
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: errorResult,
          });
          steps.push({
            timestamp: new Date().toISOString(),
            action: `tool_error:${toolName}`,
            result: errorResult,
          });
          consecutiveFailures++;
          continue;
        }

        try {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await tool.execute(args);

          // Track metrics from tool results
          if (result?.prospectsFound) prospectsFound += result.prospectsFound;
          if (result?.pitchesDrafted) pitchesDrafted += result.pitchesDrafted;

          const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
          const truncatedResult = resultStr.length > 5000 ? resultStr.substring(0, 5000) + '...(truncated)' : resultStr;

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: truncatedResult,
          });

          steps.push({
            timestamp: new Date().toISOString(),
            action: `tool:${toolName}`,
            result: truncatedResult.substring(0, 300),
            details: args,
          });

          onProgress?.({ action: `tool:${toolName}`, result: truncatedResult.substring(0, 200) });
          consecutiveFailures = 0;

        } catch (err: any) {
          const errorResult = `Error executing ${toolName}: ${err.message}`;
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: errorResult,
          });

          steps.push({
            timestamp: new Date().toISOString(),
            action: `tool_error:${toolName}`,
            result: errorResult,
            details: { error: err.message },
          });

          consecutiveFailures++;
          logger.error(`[${agentName}] Tool ${toolName} failed`, { error: err.message });
        }

        // Circuit breaker
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          const msg = `Circuit breaker: ${MAX_CONSECUTIVE_FAILURES} consecutive failures`;
          steps.push({ timestamp: new Date().toISOString(), action: 'circuit_breaker', result: msg });
          logger.error(`[${agentName}] ${msg}`);

          await agentRepository.updateRun(runId, {
            status: 'failed',
            completedAt: new Date(),
            prospectsFound,
            pitchesDrafted,
            tokensUsed: totalTokens,
            errorMessage: msg,
            runLog: steps,
          });

          return { runId, status: 'failed', steps, totalTokens, finalOutput: '', prospectsFound, pitchesDrafted, error: msg };
        }
      }
    }

    // Success
    await agentRepository.updateRun(runId, {
      status: 'completed',
      completedAt: new Date(),
      prospectsFound,
      pitchesDrafted,
      tokensUsed: totalTokens,
      runLog: steps,
    });

    return { runId, status: 'completed', steps, totalTokens, finalOutput, prospectsFound, pitchesDrafted };

  } catch (err: any) {
    const errorMsg = `Agent run failed: ${err.message}`;
    logger.error(`[${agentName}] ${errorMsg}`, { error: err });

    steps.push({ timestamp: new Date().toISOString(), action: 'fatal_error', result: errorMsg });

    await agentRepository.updateRun(runId, {
      status: 'failed',
      completedAt: new Date(),
      prospectsFound,
      pitchesDrafted,
      tokensUsed: totalTokens,
      errorMessage: errorMsg,
      runLog: steps,
    });

    return { runId, status: 'failed', steps, totalTokens, finalOutput: '', prospectsFound, pitchesDrafted, error: errorMsg };
  }
}
