import { NextResponse } from 'next/server';
import { openAIProvider } from '../../../../lib/ai/provider';

export async function GET() {
  try {
    const health = await openAIProvider.checkHealth();
    // Return appropriate status code based on health state
    // 200 for connected or clean missing credentials (safe inspection)
    // 503 for provider connectivity/auth/quota issues
    const isOk = health.status === 'connected' || health.status === 'missing_credentials';
    return NextResponse.json(health, { status: isOk ? 200 : 503 });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'error',
        configured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0),
        provider: 'OpenAI',
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        message: err.message || 'Provider health check failed.',
      },
      { status: 500 }
    );
  }
}
