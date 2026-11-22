import { z } from 'zod';

const twitchConfigSchema = z.object({
  TWITCH_CLIENT_ID: z.string().trim().min(1),
  TWITCH_CLIENT_SECRET: z.string().trim().min(1),
  TWITCH_REDIRECT_URI: z.url().refine((value) => {
    const url = new URL(value);

    const isLocal = url.protocol === 'http:' && url.hostname === 'localhost';

    const isSecure = url.protocol === 'https:';

    return (isLocal || isSecure) && !url.username && !url.password && !url.search && !url.hash;
  }, 'Invalid OAuth redirect URI'),
});

export type TwitchConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function parseTwitchConfig(environment: Record<string, string | undefined>): TwitchConfig {
  const result = twitchConfigSchema.safeParse(environment);

  if (!result.success) {
    throw new Error(
      'Invalid Twitch configuration: check TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET and TWITCH_REDIRECT_URI',
    );
  }

  return {
    clientId: result.data.TWITCH_CLIENT_ID,
    clientSecret: result.data.TWITCH_CLIENT_SECRET,
    redirectUri: result.data.TWITCH_REDIRECT_URI,
  };
}
