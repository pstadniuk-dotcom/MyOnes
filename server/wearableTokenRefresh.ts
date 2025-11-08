import type { IStorage } from './storage';

interface TokenRefreshResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  user_id?: string;
}

export async function refreshFitbitToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<TokenRefreshResponse> {
  const tokenResponse = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }).toString()
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Fitbit token refresh error:', errorText);
    throw new Error('Failed to refresh Fitbit token');
  }

  return await tokenResponse.json();
}

export async function refreshOuraToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<TokenRefreshResponse> {
  const tokenResponse = await fetch('https://api.ouraring.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    }).toString()
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Oura token refresh error:', errorText);
    throw new Error('Failed to refresh Oura token');
  }

  return await tokenResponse.json();
}

export async function refreshWhoopToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<TokenRefreshResponse> {
  const tokenResponse = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    }).toString()
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('WHOOP token refresh error:', errorText);
    throw new Error('Failed to refresh WHOOP token');
  }

  return await tokenResponse.json();
}

export async function refreshExpiredTokens(storage: IStorage): Promise<void> {
  try {
    const now = new Date();
    const expiryThreshold = new Date(now.getTime() + 60 * 60 * 1000);

    const allConnections = await storage.getAllWearableConnectionsNearingExpiry(expiryThreshold);

    console.log(`Found ${allConnections.length} wearable connections needing token refresh`);

    for (const connection of allConnections) {
      try {
        if (!connection.refreshToken) {
          console.warn(`No refresh token for connection ${connection.id}, marking as error`);
          await storage.updateWearableConnection(connection.id, {
            status: 'error'
          });
          continue;
        }

        let tokenData: TokenRefreshResponse;
        
        if (connection.provider === 'fitbit') {
          const clientId = process.env.FITBIT_CLIENT_ID;
          const clientSecret = process.env.FITBIT_CLIENT_SECRET;
          
          if (!clientId || !clientSecret) {
            console.error('Fitbit credentials not configured');
            continue;
          }

          tokenData = await refreshFitbitToken(connection.refreshToken, clientId, clientSecret);
        } 
        else if (connection.provider === 'oura') {
          const clientId = process.env.OURA_CLIENT_ID;
          const clientSecret = process.env.OURA_CLIENT_SECRET;
          
          if (!clientId || !clientSecret) {
            console.error('Oura credentials not configured');
            continue;
          }

          tokenData = await refreshOuraToken(connection.refreshToken, clientId, clientSecret);
        } 
        else if (connection.provider === 'whoop') {
          const clientId = process.env.WHOOP_CLIENT_ID;
          const clientSecret = process.env.WHOOP_CLIENT_SECRET;
          
          if (!clientId || !clientSecret) {
            console.error('WHOOP credentials not configured');
            continue;
          }

          tokenData = await refreshWhoopToken(connection.refreshToken, clientId, clientSecret);
        }
        else {
          console.warn(`Unknown provider: ${connection.provider}`);
          continue;
        }

        const expiresAt = tokenData.expires_in 
          ? new Date(Date.now() + tokenData.expires_in * 1000) 
          : null;

        await storage.updateWearableConnection(connection.id, {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || connection.refreshToken,
          tokenExpiresAt: expiresAt,
          status: 'connected'
        });

        console.log(`Successfully refreshed token for ${connection.provider} connection ${connection.id}`);
      } catch (error) {
        console.error(`Failed to refresh token for connection ${connection.id}:`, error);
        
        await storage.updateWearableConnection(connection.id, {
          status: 'error'
        });
      }
    }
  } catch (error) {
    console.error('Error in refreshExpiredTokens:', error);
  }
}
