import { NextRequest, NextResponse } from 'next/server';
import { GitHubAuthEdgeHandler } from './git_hub_auth_edge_handler';

export const runtime = 'edge';

/**
 * Route entrypoint delegating to GitHubAuthEdgeHandler.
 */
export class Route {
  public static async POST(req: NextRequest): Promise<NextResponse> {
    const handler = new GitHubAuthEdgeHandler();
    return handler.handlePost(req);
  }
}

export const POST = Route.POST;
export { GitHubAuthEdgeHandler };
