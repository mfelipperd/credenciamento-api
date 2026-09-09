import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { EUserRole } from 'src/enum/role';
import { McpRequestUser } from '../oauth/mcp-auth.guard';

export function textResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Garante que o usuário logado pode acessar a feira informada: admin acessa
 * qualquer uma, os demais perfis só as que estão em user.fairIds (calculado
 * na emissão do token — ver OAuthService.computeFairIds). Lança erro (que o
 * MCP SDK devolve como resultado de erro pro chamador) se não tiver acesso.
 */
export function assertFairAccess(user: McpRequestUser, fairId: string): void {
  if (user.role === EUserRole.ADMIN) return;
  if (!user.fairIds.includes(fairId)) {
    throw new Error(
      `Acesso negado: o usuário ${user.email} não tem acesso à feira ${fairId}.`,
    );
  }
}

type ToolResult = { content: { type: 'text'; text: string }[] };

/**
 * Registers a tool that takes input parameters.
 *
 * Works around a real TypeScript compiler limit (TS2589: excessively deep type
 * instantiation) hit when the MCP SDK's Zod-shape generics are instantiated with
 * a concrete inputSchema — confirmed not fixable via explicit typing (tried
 * explicit param annotations, the deprecated .tool() overload, and explicit
 * generic type args; none resolved it). The `any` cast is isolated to this one
 * call; `handler`'s argument type is still fully inferred from `inputSchema` via
 * the generic signature below, so callers get real type-checking.
 */
export function registerToolWithInput<Shape extends Record<string, z.ZodTypeAny>>(
  server: McpServer,
  name: string,
  description: string,
  inputSchema: Shape,
  handler: (args: { [K in keyof Shape]: z.infer<Shape[K]> }) => Promise<ToolResult>,
  annotations?: ToolAnnotations,
) {
  (server.registerTool as any)(
    name,
    { description, inputSchema, annotations },
    handler,
  );
}
