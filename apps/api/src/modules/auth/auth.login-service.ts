import type { AuthSessionService } from './auth.session-service.js';
import type { AuthenticatedUser, AuthUserService } from './auth.user-service.js';
import type { TwitchAuthService } from './twitch.auth-service.js';

export interface CompletedLogin {
  user: AuthenticatedUser;
  sessionToken: string;
}

type LoginStage = 'TWITCH_AUTHENTICATION' | 'USER_PERSISTENCE' | 'SESSION_PERSISTENCE';

async function executeStage<T>(stage: LoginStage, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Diagnóstico seguro: nunca registrar tokens,
    // códigos OAuth, respuestas HTTP ni errores
    // internos que puedan contener credenciales.
    console.error(`[Runvista Auth] Failed stage: ${stage}`);

    throw error;
  }
}

export class AuthLoginService {
  constructor(
    private readonly twitchAuth: Pick<TwitchAuthService, 'authenticate'>,
    private readonly users: Pick<AuthUserService, 'findOrCreateFromTwitch'>,
    private readonly sessions: Pick<AuthSessionService, 'create'>,
  ) {}

  async completeTwitchLogin(authorizationCode: string): Promise<CompletedLogin> {
    if (!authorizationCode.trim()) {
      throw new Error('Invalid Twitch authorization code');
    }

    const twitchUser = await executeStage('TWITCH_AUTHENTICATION', () =>
      this.twitchAuth.authenticate(authorizationCode),
    );

    const user = await executeStage('USER_PERSISTENCE', () =>
      this.users.findOrCreateFromTwitch(twitchUser),
    );

    const sessionToken = await executeStage('SESSION_PERSISTENCE', () =>
      this.sessions.create(user.id),
    );

    return {
      user,
      sessionToken,
    };
  }
}
