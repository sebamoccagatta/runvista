import type { TwitchConfig } from './twitch.config.js';
import { exchangeTwitchAuthorizationCode, type TwitchTokens } from './twitch.token.js';
import { getAuthenticatedTwitchUser, type TwitchUser } from './twitch.user.js';
import { validateTwitchAccessToken, type ValidatedTwitchToken } from './twitch.validate.js';

export interface TwitchAuthDependencies {
  exchangeCode: (config: TwitchConfig, code: string) => Promise<TwitchTokens>;

  validateToken: (config: TwitchConfig, accessToken: string) => Promise<ValidatedTwitchToken>;

  getUser: (config: TwitchConfig, accessToken: string) => Promise<TwitchUser>;
}

const defaultDependencies: TwitchAuthDependencies = {
  exchangeCode: exchangeTwitchAuthorizationCode,
  validateToken: validateTwitchAccessToken,
  getUser: getAuthenticatedTwitchUser,
};

type TwitchAuthStage = 'TOKEN_EXCHANGE' | 'TOKEN_VALIDATION' | 'USER_LOOKUP';

async function executeStage<T>(stage: TwitchAuthStage, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Solo registramos la etapa.
    // No exponemos tokens, códigos ni respuestas de Twitch.
    console.error(`[Runvista Twitch] Failed stage: ${stage}`);

    throw error;
  }
}

export class TwitchAuthService {
  constructor(
    private readonly config: TwitchConfig,
    private readonly dependencies: TwitchAuthDependencies = defaultDependencies,
  ) {}

  async authenticate(code: string): Promise<TwitchUser> {
    if (!code.trim()) {
      throw new Error('Invalid Twitch authorization code');
    }

    const tokens = await executeStage('TOKEN_EXCHANGE', () =>
      this.dependencies.exchangeCode(this.config, code),
    );

    const validated = await executeStage('TOKEN_VALIDATION', () =>
      this.dependencies.validateToken(this.config, tokens.access_token),
    );

    const user = await executeStage('USER_LOOKUP', () =>
      this.dependencies.getUser(this.config, tokens.access_token),
    );

    if (validated.userId !== user.id) {
      console.error('[Runvista Twitch] Failed stage: IDENTITY_MISMATCH');

      throw new Error('Twitch identity mismatch');
    }

    return user;
  }
}
