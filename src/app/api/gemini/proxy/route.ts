import { NextRequest, NextResponse } from 'next/server';
import { GeminiProxyEdgeHandler } from './gemini_proxy_edge_handler';

export const runtime = 'edge';

/**
 * Route entrypoint delegating to GeminiProxyEdgeHandler.
 */
export class Route {
  public static async POST(req: NextRequest): Promise<NextResponse> {
    const handler = new GeminiProxyEdgeHandler();
    return handler.handlePost(req);
  }
}

export const POST = Route.POST;
export { GeminiProxyEdgeHandler };

