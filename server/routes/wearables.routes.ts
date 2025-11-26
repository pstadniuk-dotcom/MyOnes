/**
 * Wearables Routes Module
 * 
 * Handles all /api/wearables/* endpoints:
 * - Device connections (Fitbit, Oura, WHOOP)
 * - OAuth flow for device authorization
 * - Biometric data retrieval
 * - Data sync and insights
 */

import { Router } from 'express';
import crypto from 'crypto';
import { storage } from '../storage';
import { requireAuth } from './middleware';
import logger from '../logger';

const router = Router();

// Get user's connected wearable devices
router.get('/connections', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const connections = await storage.getWearableConnections(userId);
    res.json(connections);
  } catch (error) {
    logger.error('Error fetching wearable connections:', error);
    res.status(500).json({ error: 'Failed to fetch wearable connections' });
  }
});

// Initiate OAuth flow for a wearable device
router.get('/connect/:provider', requireAuth, async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.userId!;
    
    if (!['fitbit', 'oura', 'whoop'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    // Generate state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state in session
    if (!req.session) {
      req.session = {} as any;
    }
    (req.session as any).oauthState = state;
    (req.session as any).oauthUserId = userId;
    (req.session as any).oauthProvider = provider;

    let authUrl = '';
    // Build redirect URI - use env var if set (for production), otherwise use request host (for dev)
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${baseUrl}/api/wearables/callback/${provider}`;

    if (provider === 'fitbit') {
      const clientId = process.env.FITBIT_CLIENT_ID;
      if (!clientId) {
        return res.status(500).json({ error: 'Fitbit credentials not configured' });
      }
      
      const scopes = [
        'activity', 'heartrate', 'sleep', 'profile', 'oxygen_saturation',
        'respiratory_rate', 'temperature', 'cardio_fitness'
      ];
      
      authUrl = `https://www.fitbit.com/oauth2/authorize?` +
        `response_type=code&` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes.join(' '))}&` +
        `state=${state}`;
    }
    else if (provider === 'oura') {
      const clientId = process.env.OURA_CLIENT_ID;
      if (!clientId) {
        return res.status(500).json({ error: 'Oura credentials not configured' });
      }
      
      authUrl = `https://cloud.ouraring.com/oauth/authorize?` +
        `response_type=code&` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${state}`;
    }
    else if (provider === 'whoop') {
      const clientId = process.env.WHOOP_CLIENT_ID;
      if (!clientId) {
        return res.status(500).json({ error: 'WHOOP credentials not configured' });
      }
      
      const scopes = ['read:recovery', 'read:cycles', 'read:sleep', 'read:workout', 'offline'];
      
      authUrl = `https://api.prod.whoop.com/oauth/oauth2/auth?` +
        `response_type=code&` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes.join(' '))}&` +
        `state=${state}`;
    }

    res.json({ authUrl });
  } catch (error) {
    logger.error('Error initiating OAuth flow:', error);
    res.status(500).json({ error: 'Failed to initiate OAuth flow' });
  }
});

// OAuth callback handler
router.get('/callback/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      logger.error(`OAuth error from ${provider}:`, oauthError);
      return res.redirect(`/dashboard?error=${encodeURIComponent(`Failed to connect ${provider}`)}`);
    }

    // Verify state for CSRF protection
    const sessionState = (req.session as any)?.oauthState;
    if (!sessionState || sessionState !== state) {
      logger.error('OAuth state mismatch');
      return res.redirect('/dashboard?error=invalid_state');
    }

    const userId = (req.session as any)?.oauthUserId;
    if (!userId) {
      logger.error('No user ID in session');
      return res.redirect('/dashboard?error=session_expired');
    }

    // Exchange code for tokens
    let tokenData: any = null;
    // Build redirect URI dynamically from the incoming request
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${baseUrl}/api/wearables/callback/${provider}`;

    if (provider === 'fitbit') {
      const clientId = process.env.FITBIT_CLIENT_ID;
      const clientSecret = process.env.FITBIT_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        throw new Error('Fitbit credentials not configured');
      }

      const tokenResponse = await fetch('https://api.fitbit.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code as string,
          redirect_uri: redirectUri
        }).toString()
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        logger.error('Fitbit token exchange error:', errorText);
        throw new Error('Failed to exchange code for tokens');
      }

      tokenData = await tokenResponse.json();
    }
    else if (provider === 'oura') {
      const clientId = process.env.OURA_CLIENT_ID;
      const clientSecret = process.env.OURA_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        throw new Error('Oura credentials not configured');
      }

      const tokenResponse = await fetch('https://api.ouraring.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code as string,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret
        }).toString()
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        logger.error('Oura token exchange error:', errorText);
        throw new Error('Failed to exchange code for tokens');
      }

      tokenData = await tokenResponse.json();
    }
    else if (provider === 'whoop') {
      const clientId = process.env.WHOOP_CLIENT_ID;
      const clientSecret = process.env.WHOOP_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        throw new Error('WHOOP credentials not configured');
      }

      const tokenResponse = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code as string,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret
        }).toString()
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        logger.error('WHOOP token exchange error:', errorText);
        throw new Error('Failed to exchange code for tokens');
      }

      tokenData = await tokenResponse.json();
    }

    // Calculate token expiration
    const expiresAt = tokenData.expires_in 
      ? new Date(Date.now() + tokenData.expires_in * 1000) 
      : null;

    // Save connection to database
    await storage.createWearableConnection({
      userId,
      provider: provider as 'fitbit' | 'oura' | 'whoop',
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      tokenExpiresAt: expiresAt,
      providerUserId: tokenData.user_id || null,
      scopes: tokenData.scope ? tokenData.scope.split(' ') : [],
      status: 'connected'
    });

    // Clear session OAuth data
    delete (req.session as any).oauthState;
    delete (req.session as any).oauthUserId;
    delete (req.session as any).oauthProvider;

    // Redirect to dashboard with success message
    res.redirect('/dashboard?success=device_connected');
  } catch (error) {
    logger.error('Error in OAuth callback:', error);
    res.redirect(`/dashboard?error=${encodeURIComponent('Failed to connect device')}`);
  }
});

// Disconnect a wearable device
router.post('/disconnect/:connectionId', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { connectionId } = req.params;

    await storage.disconnectWearableDevice(userId, connectionId);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error disconnecting wearable:', error);
    if (error instanceof Error && error.message === 'Connection not found') {
      return res.status(404).json({ error: 'Connection not found' });
    }
    res.status(500).json({ error: 'Failed to disconnect device' });
  }
});

// Manual sync endpoint - trigger data sync for user's wearables
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { syncOuraData, syncFitbitData } = await import('../wearableDataSync');
    
    const connections = await storage.getWearableConnections(userId);
    const results = [];
    
    for (const connection of connections) {
      if (connection.status !== 'connected') continue;
      
      let result;
      if (connection.provider === 'oura') {
        result = await syncOuraData(userId, connection, storage, 7);
      } else if (connection.provider === 'fitbit') {
        result = await syncFitbitData(userId, connection, storage, 7);
      }
      // WHOOP sync disabled - requires business partnership API access
      
      if (result) {
        results.push({ provider: connection.provider, ...result });
      }
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'No wearables connected' });
    }
    
    const totalDays = results.reduce((sum, r) => sum + r.daysSynced, 0);
    const anySuccess = results.some(r => r.success);
    
    res.json({ 
      success: anySuccess,
      results,
      totalDaysSynced: totalDays,
    });
  } catch (error) {
    logger.error('Error in manual sync:', error);
    res.status(500).json({ error: 'Failed to sync data' });
  }
});

// Get normalized biometric data for a date range
router.get('/biometric-data', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { startDate, endDate, provider } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    // Get raw biometric data
    const rawData = await storage.getBiometricData(userId, start, end);
    
    // Filter by provider if specified
    const filteredData = provider 
      ? rawData.filter(d => d.provider === provider)
      : rawData;
    
    // Normalize the data
    const { normalizeBiometricData } = await import('../wearableDataNormalizer');
    const normalizedData = filteredData.map(d => normalizeBiometricData(d));
    
    res.json({ data: normalizedData });
  } catch (error) {
    logger.error('Error fetching biometric data:', error);
    res.status(500).json({ error: 'Failed to fetch biometric data' });
  }
});

// Get merged biometric data (combines data from all providers by date)
router.get('/biometric-data/merged', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    // Get raw biometric data
    const rawData = await storage.getBiometricData(userId, start, end);
    
    if (rawData.length === 0) {
      return res.json({ data: [] });
    }
    
    // Normalize all data
    const { normalizeBiometricData, mergeMultiProviderData } = await import('../wearableDataNormalizer');
    const normalizedData = rawData.map(d => normalizeBiometricData(d));
    
    // Group by date and merge
    const dataByDate = new Map<string, typeof normalizedData>();
    normalizedData.forEach(d => {
      const dateKey = d.date.toISOString().split('T')[0];
      if (!dataByDate.has(dateKey)) {
        dataByDate.set(dateKey, []);
      }
      dataByDate.get(dateKey)!.push(d);
    });
    
    // Merge data for each date
    const mergedData = Array.from(dataByDate.values()).map(dataArray => {
      return dataArray.length > 1 
        ? mergeMultiProviderData(dataArray)
        : dataArray[0];
    });
    
    // Sort by date
    mergedData.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    res.json({ data: mergedData });
  } catch (error) {
    logger.error('Error fetching merged biometric data:', error);
    res.status(500).json({ error: 'Failed to fetch merged biometric data' });
  }
});

// Get biometric trends and insights
router.get('/insights', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const days = parseInt(req.query.days as string) || 30;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get merged biometric data
    const rawData = await storage.getBiometricData(userId, startDate, endDate);
    
    if (rawData.length === 0) {
      return res.json({ 
        insights: {
          sleep: null,
          heart: null,
          recovery: null,
          activity: null,
        },
        message: 'No data available for insights',
      });
    }
    
    const { normalizeBiometricData, calculateTrend, calculateSleepQuality } = await import('../wearableDataNormalizer');
    const normalizedData = rawData.map(d => normalizeBiometricData(d));
    
    // Calculate trends
    const sleepDurations = normalizedData.map(d => d.sleep.totalMinutes).filter(Boolean) as number[];
    const sleepScores = normalizedData.map(d => d.sleep.score || calculateSleepQuality(d.sleep)).filter(Boolean) as number[];
    const hrvValues = normalizedData.map(d => d.heart.hrvMs).filter(Boolean) as number[];
    const restingHRs = normalizedData.map(d => d.heart.restingRate).filter(Boolean) as number[];
    const recoveryScores = normalizedData.map(d => d.recovery.score).filter(Boolean) as number[];
    const steps = normalizedData.map(d => d.activity.steps).filter(Boolean) as number[];
    
    const insights = {
      sleep: sleepDurations.length > 0 ? {
        averageMinutes: Math.round(sleepDurations.reduce((a, b) => a + b, 0) / sleepDurations.length),
        averageScore: Math.round(sleepScores.reduce((a, b) => a + b, 0) / sleepScores.length),
        trend: calculateTrend(sleepDurations),
        qualityTrend: calculateTrend(sleepScores),
      } : null,
      
      heart: hrvValues.length > 0 || restingHRs.length > 0 ? {
        averageHRV: hrvValues.length > 0 ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length) : null,
        averageRestingHR: restingHRs.length > 0 ? Math.round(restingHRs.reduce((a, b) => a + b, 0) / restingHRs.length) : null,
        hrvTrend: hrvValues.length > 0 ? calculateTrend(hrvValues) : null,
        restingHRTrend: restingHRs.length > 0 ? calculateTrend(restingHRs) : null,
      } : null,
      
      recovery: recoveryScores.length > 0 ? {
        averageScore: Math.round(recoveryScores.reduce((a, b) => a + b, 0) / recoveryScores.length),
        trend: calculateTrend(recoveryScores),
      } : null,
      
      activity: steps.length > 0 ? {
        averageSteps: Math.round(steps.reduce((a, b) => a + b, 0) / steps.length),
        trend: calculateTrend(steps),
      } : null,
    };
    
    res.json({ insights, daysAnalyzed: days });
  } catch (error) {
    logger.error('Error calculating insights:', error);
    res.status(500).json({ error: 'Failed to calculate insights' });
  }
});

export default router;
