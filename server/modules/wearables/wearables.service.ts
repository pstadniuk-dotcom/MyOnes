import OpenAI from 'openai';
import { wearablesRepository } from './wearables.repository';
import { filesRepository } from '../files/files.repository';
import { formulasRepository } from '../formulas/formulas.repository';
import { usersRepository } from '../users/users.repository';
import logger from '../../infra/logging/logger';
import {
    getOrCreateJunctionUser,
    createJunctionUserWithClientUserId,
    generateLinkToken,
    getConnectedProviders,
    disconnectProvider,
    getSleepData,
    getActivityData,
    getBodyData,
    getWorkoutData,
    PROVIDER_MAP,
    PROVIDER_DISPLAY_NAMES,
} from '../../junction';

const PILLAR_META: Record<string, { label: string; description: string }> = {
    sleep: { label: 'Sleep', description: 'Sleep duration, stages & quality' },
    activity: { label: 'Activity', description: 'Steps, calories & active minutes' },
    recovery: { label: 'Recovery', description: 'HRV, heart rate & stress' },
    workouts: { label: 'Workouts', description: 'Exercise sessions & performance' },
    body: { label: 'Body', description: 'Weight, BMI & body composition' },
    glucose: { label: 'Glucose', description: 'Continuous blood sugar monitoring' },
    heart: { label: 'Heart', description: 'Blood pressure & ECG readings' },
    nutrition: { label: 'Nutrition', description: 'Calories, hydration & macros' },
};

// Static map of suggested providers per unlockable pillar
const PILLAR_SUGGESTED: Record<string, { slug: string; name: string; logo?: string }[]> = {
    sleep:    [{ slug: 'oura', name: 'Oura Ring' }, { slug: 'eight_sleep', name: 'Eight Sleep' }, { slug: 'fitbit', name: 'Fitbit' }, { slug: 'whoop_v2', name: 'WHOOP' }, { slug: 'garmin', name: 'Garmin' }, { slug: 'polar', name: 'Polar' }, { slug: 'withings', name: 'Withings' }],
    activity: [{ slug: 'garmin', name: 'Garmin' }, { slug: 'fitbit', name: 'Fitbit' }, { slug: 'google_fit', name: 'Google Fit' }, { slug: 'apple_health_kit', name: 'Apple Health' }, { slug: 'polar', name: 'Polar' }, { slug: 'strava', name: 'Strava' }, { slug: 'whoop_v2', name: 'WHOOP' }, { slug: 'withings', name: 'Withings' }, { slug: 'ultrahuman', name: 'Ultrahuman' }, { slug: 'peloton', name: 'Peloton' }, { slug: 'wahoo', name: 'Wahoo' }, { slug: 'zwift', name: 'Zwift' }, { slug: 'hammerhead', name: 'Hammerhead' }],
    recovery: [{ slug: 'oura', name: 'Oura Ring' }, { slug: 'whoop_v2', name: 'WHOOP' }, { slug: 'garmin', name: 'Garmin' }, { slug: 'fitbit', name: 'Fitbit' }, { slug: 'polar', name: 'Polar' }, { slug: 'apple_health_kit', name: 'Apple Health' }, { slug: 'ultrahuman', name: 'Ultrahuman' }],
    workouts: [{ slug: 'garmin', name: 'Garmin' }, { slug: 'fitbit', name: 'Fitbit' }, { slug: 'strava', name: 'Strava' }, { slug: 'peloton', name: 'Peloton' }, { slug: 'apple_health_kit', name: 'Apple Health' }, { slug: 'polar', name: 'Polar' }, { slug: 'whoop_v2', name: 'WHOOP' }, { slug: 'zwift', name: 'Zwift' }, { slug: 'wahoo', name: 'Wahoo' }, { slug: 'hammerhead', name: 'Hammerhead' }, { slug: 'ultrahuman', name: 'Ultrahuman' }],
    body:     [{ slug: 'withings', name: 'Withings' }, { slug: 'fitbit', name: 'Fitbit' }, { slug: 'oura', name: 'Oura Ring' }, { slug: 'apple_health_kit', name: 'Apple Health' }, { slug: 'garmin', name: 'Garmin' }, { slug: 'polar', name: 'Polar' }, { slug: 'ultrahuman', name: 'Ultrahuman' }],
    glucose:  [{ slug: 'freestyle_libre', name: 'Freestyle Libre' }, { slug: 'dexcom', name: 'Dexcom' }, { slug: 'beurer', name: 'Beurer' }],
    heart:    [{ slug: 'withings', name: 'Withings' }, { slug: 'omron', name: 'Omron' }, { slug: 'kardia', name: 'Kardia' }, { slug: 'beurer', name: 'Beurer' }, { slug: 'garmin', name: 'Garmin' }, { slug: 'apple_health_kit', name: 'Apple Health' }, { slug: 'polar', name: 'Polar' }],
    nutrition:[{ slug: 'cronometer', name: 'Cronometer' }],
};

export class WearablesService {
    private normalizeConnectProvider(provider?: string): string | undefined {
        const normalized = String(provider || '').trim().toLowerCase();
        if (!normalized) {
            return undefined;
        }

        if (normalized === 'beurer') {
            throw new Error('beurer is not currently supported in the web connection flow');
        }

        return normalized;
    }

    private normalizeLabStatus(status: unknown): 'normal' | 'high' | 'low' | 'critical' {
        const normalized = String(status || '').toLowerCase().trim();
        if (normalized === 'high' || normalized === 'low' || normalized === 'critical') {
            return normalized;
        }
        return 'normal';
    }

    private inferMarkerStatus(name: unknown, value: unknown, rawStatus: unknown, referenceRange?: unknown): 'normal' | 'high' | 'low' | 'critical' {
        const normalizedStatus = this.normalizeLabStatus(rawStatus);
        const markerName = String(name || '').toLowerCase();
        const markerValue = String(value || '').toLowerCase();

        // Respect explicit statuses from upstream extraction first.
        if (normalizedStatus !== 'normal') {
            return normalizedStatus;
        }

        // Semantic override for biological-age style markers where value text carries directionality
        if (markerName.includes('biological age')) {
            if (markerValue.includes('older') || markerValue.includes('accelerated') || markerValue.includes('higher')) {
                return 'high';
            }
            if (markerValue.includes('younger') || markerValue.includes('decelerated') || markerValue.includes('lower')) {
                return 'normal';
            }
        }

        // Generic semantic parsing for extracted text values when status is missing.
        const criticalKeywords = ['critical', 'severely high', 'severely low', 'dangerously', 'panic'];
        if (criticalKeywords.some(keyword => markerValue.includes(keyword))) {
            return 'critical';
        }

        const highKeywords = ['high', 'elevated', 'above range', 'above normal', 'increased', 'excess', 'older'];
        if (highKeywords.some(keyword => markerValue.includes(keyword))) {
            return 'high';
        }

        const lowKeywords = ['low', 'below range', 'below normal', 'decreased', 'deficient', 'insufficient'];
        if (lowKeywords.some(keyword => markerValue.includes(keyword))) {
            return 'low';
        }

        const normalKeywords = ['normal', 'within range', 'within normal', 'optimal', 'negative', 'non-reactive'];
        if (normalKeywords.some(keyword => markerValue.includes(keyword))) {
            return 'normal';
        }

        // Numeric fallback: compare value to reference range when status text is missing.
        const numericValue = this.parseMarkerNumericValue(value);
        const rangeText = String(referenceRange || '').toLowerCase().trim();
        if (numericValue !== null && rangeText) {
            const range = this.parseReferenceRange(rangeText);
            if (range) {
                if (range.type === 'between') {
                    if (numericValue < range.min) return 'low';
                    if (numericValue > range.max) return 'high';
                    return 'normal';
                }
                if (range.type === 'lte') {
                    return numericValue > range.max ? 'high' : 'normal';
                }
                if (range.type === 'lt') {
                    return numericValue >= range.max ? 'high' : 'normal';
                }
                if (range.type === 'gte') {
                    return numericValue < range.min ? 'low' : 'normal';
                }
                if (range.type === 'gt') {
                    return numericValue <= range.min ? 'low' : 'normal';
                }
            }
        }

        return normalizedStatus;
    }

    private parseReferenceRange(referenceRange: string):
        | { type: 'between'; min: number; max: number }
        | { type: 'lt' | 'lte'; max: number }
        | { type: 'gt' | 'gte'; min: number }
        | null {
        const normalized = referenceRange
            .replace(/[–—]/g, '-')
            .replace(/to/gi, '-')
            .replace(/,/g, '')
            .trim();

        const betweenMatch = normalized.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
        if (betweenMatch) {
            const min = Number(betweenMatch[1]);
            const max = Number(betweenMatch[2]);
            if (Number.isFinite(min) && Number.isFinite(max)) {
                return { type: 'between', min: Math.min(min, max), max: Math.max(min, max) };
            }
        }

        const lteMatch = normalized.match(/(?:<=|≤|up to|less than or equal to)\s*(-?\d+(?:\.\d+)?)/i);
        if (lteMatch) {
            const max = Number(lteMatch[1]);
            if (Number.isFinite(max)) {
                return { type: 'lte', max };
            }
        }

        const ltMatch = normalized.match(/(?:<|less than)\s*(-?\d+(?:\.\d+)?)/i);
        if (ltMatch) {
            const max = Number(ltMatch[1]);
            if (Number.isFinite(max)) {
                return { type: 'lt', max };
            }
        }

        const gteMatch = normalized.match(/(?:>=|≥|at least|greater than or equal to)\s*(-?\d+(?:\.\d+)?)/i);
        if (gteMatch) {
            const min = Number(gteMatch[1]);
            if (Number.isFinite(min)) {
                return { type: 'gte', min };
            }
        }

        const gtMatch = normalized.match(/(?:>|greater than)\s*(-?\d+(?:\.\d+)?)/i);
        if (gtMatch) {
            const min = Number(gtMatch[1]);
            if (Number.isFinite(min)) {
                return { type: 'gt', min };
            }
        }

        return null;
    }

    private buildLabSummary(markers: Array<{ name: string; status: 'normal' | 'high' | 'low' | 'critical' }>): string {
        if (!markers.length) {
            return 'No interpreted biomarker values were found yet. Upload or re-analyze your latest blood test for personalized insights.';
        }

        const abnormal = markers.filter(marker => marker.status !== 'normal');
        if (!abnormal.length) {
            return 'Your latest uploaded markers are within normal ranges based on the extracted report data.';
        }

        const critical = abnormal.filter(marker => marker.status === 'critical').map(marker => marker.name);
        const high = abnormal.filter(marker => marker.status === 'high').map(marker => marker.name);
        const low = abnormal.filter(marker => marker.status === 'low').map(marker => marker.name);

        const parts: string[] = [];
        if (critical.length) {
            parts.push(`Critical: ${critical.slice(0, 3).join(', ')}`);
        }
        if (high.length) {
            parts.push(`High: ${high.slice(0, 4).join(', ')}`);
        }
        if (low.length) {
            parts.push(`Low: ${low.slice(0, 4).join(', ')}`);
        }

        return `Found ${abnormal.length} out-of-range marker${abnormal.length > 1 ? 's' : ''}. ${parts.join(' • ')}`;
    }

    private normalizeMarkerKey(name: unknown): string {
        return String(name || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }

    private parseMarkerNumericValue(value: unknown): number | null {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }

        const raw = String(value ?? '').replace(/,/g, '');
        const match = raw.match(/-?\d+(\.\d+)?/);
        if (!match) {
            return null;
        }

        const parsed = Number(match[0]);
        return Number.isFinite(parsed) ? parsed : null;
    }

    private getStatusSeverity(status: 'normal' | 'high' | 'low' | 'critical'): number {
        if (status === 'critical') return 2;
        if (status === 'high' || status === 'low') return 1;
        return 0;
    }

    private buildLabChangeHighlights(
        latestMarkers: Array<{ name: string; value: string | number; unit?: string; status: 'normal' | 'high' | 'low' | 'critical' }>,
        previousMarkers: Array<{ name: string; value: string | number; unit?: string; status: 'normal' | 'high' | 'low' | 'critical' }>,
    ): string[] {
        if (!latestMarkers.length || !previousMarkers.length) {
            return [];
        }

        const previousByKey = new Map<string, { name: string; value: string | number; unit?: string; status: 'normal' | 'high' | 'low' | 'critical' }>();
        for (const marker of previousMarkers) {
            const key = this.normalizeMarkerKey(marker.name);
            if (key && !previousByKey.has(key)) {
                previousByKey.set(key, marker);
            }
        }

        const trendPriority: Record<'worsened' | 'improved' | 'stable', number> = {
            worsened: 0,
            improved: 1,
            stable: 2,
        };

        const highlights: Array<{ text: string; trend: 'worsened' | 'improved' | 'stable'; score: number }> = [];

        for (const latest of latestMarkers) {
            const key = this.normalizeMarkerKey(latest.name);
            const previous = previousByKey.get(key);
            if (!previous) {
                continue;
            }

            const latestSeverity = this.getStatusSeverity(latest.status);
            const previousSeverity = this.getStatusSeverity(previous.status);

            let trend: 'worsened' | 'improved' | 'stable' = 'stable';
            let score = 0;

            if (latestSeverity !== previousSeverity) {
                trend = latestSeverity > previousSeverity ? 'worsened' : 'improved';
                score = Math.abs(latestSeverity - previousSeverity) * 100;
            } else {
                const latestNumeric = this.parseMarkerNumericValue(latest.value);
                const previousNumeric = this.parseMarkerNumericValue(previous.value);

                if (latestNumeric !== null && previousNumeric !== null && previousNumeric !== 0) {
                    const percentDelta = ((latestNumeric - previousNumeric) / Math.abs(previousNumeric)) * 100;
                    score = Math.abs(percentDelta);

                    if (Math.abs(percentDelta) < 5) {
                        trend = 'stable';
                    } else {
                        trend = percentDelta > 0 ? 'worsened' : 'improved';
                    }
                }
            }

            const unit = latest.unit || previous.unit || '';
            const text = `${latest.name}: ${trend} (${previous.value}${unit ? ` ${unit}` : ''} → ${latest.value}${unit ? ` ${unit}` : ''})`;
            highlights.push({ text, trend, score });
        }

        return highlights
            .sort((a, b) => {
                const trendOrder = trendPriority[a.trend] - trendPriority[b.trend];
                if (trendOrder !== 0) {
                    return trendOrder;
                }
                return b.score - a.score;
            })
            .slice(0, 3)
            .map((highlight) => highlight.text);
    }

    private buildLabActionItems(
        latestMarkers: Array<{ name: string; status: 'normal' | 'high' | 'low' | 'critical' }>,
        hasPreviousReport: boolean,
    ): string[] {
        const abnormal = latestMarkers.filter((marker) => marker.status !== 'normal');

        if (!latestMarkers.length) {
            return [
                'Use Re-analyze latest report to extract structured markers from your upload.',
                'Upload your prior lab report to unlock change tracking between reports.',
            ];
        }

        const actions: string[] = [];

        if (abnormal.length > 0) {
            const topMarkers = abnormal.slice(0, 2).map((marker) => marker.name).join(', ');
            actions.push(`Review ${topMarkers} with your practitioner before making major supplement or medication changes.`);
            actions.push('Re-test the same panel in 8–12 weeks to confirm whether markers are moving in the right direction.');
            actions.push('Use Re-analyze latest report after each upload to keep your recommendations current.');
        } else {
            actions.push('Maintain your current protocol and repeat core bloodwork in 8–12 weeks.');
            actions.push('Keep syncing wearable and symptom data so trend interpretation stays personalized.');
            actions.push('Use Re-analyze latest report after each upload to keep your recommendations current.');
        }

        if (!hasPreviousReport) {
            actions[1] = 'Upload one prior lab report to unlock stronger trend comparisons over time.';
        }

        return actions.slice(0, 3);
    }

    private isDemoConflictError(error: unknown): boolean {
        const message = String((error as any)?.body?.detail || (error as any)?.message || '').toLowerCase();
        return message.includes('demo connection') && message.includes('non-demo');
    }

    private hasDemoConnection(connections: any[]): boolean {
        return connections.some((connection: any) => {
            const slug = this.getProviderSlug(connection);
            const name = String(connection?.name || '').toLowerCase();
            const source = String(connection?.source || '').toLowerCase();
            const mode = String(connection?.mode || '').toLowerCase();

            return (
                slug.includes('demo') ||
                name.includes('demo') ||
                source.includes('demo') ||
                mode.includes('demo') ||
                connection?.demo === true ||
                connection?.isDemo === true
            );
        });
    }

    private isProviderConnected(provider: any): boolean {
        const status = String(provider?.status || '').toLowerCase();
        if (['connected', 'active', 'authorized', 'ok', 'success'].includes(status)) {
            return true;
        }

        if (provider?.connected === true || provider?.isConnected === true) {
            return true;
        }

        return Boolean(provider?.connectedAt || provider?.lastSyncAt || provider?.lastSyncedAt);
    }

    /**
     * Determine the connection status for a provider, distinguishing between
     * truly disconnected providers and ones in an error state (e.g. token revoked).
     */
    private getProviderConnectionStatus(provider: any): 'connected' | 'disconnected' | 'error' {
        const status = String(provider?.status || '').toLowerCase();

        // Explicit error state from Junction (e.g. token_refresh_failed)
        if (status === 'error') {
            return 'error';
        }

        if (this.isProviderConnected(provider)) {
            return 'connected';
        }

        return 'disconnected';
    }

    /**
     * Extract a human-readable error message from a Junction provider object.
     */
    private getProviderErrorMessage(provider: any): string | null {
        const errorDetails = provider?.errorDetails || provider?.error_details;
        if (errorDetails) {
            return String(errorDetails.errorMessage || errorDetails.error_message || '');
        }
        return null;
    }

    private getProviderSlug(provider: any): string {
        return String(provider?.slug || provider?.provider || provider?.name || '')
            .toLowerCase()
            .trim();
    }

    private getProviderDisplayName(provider: any): string {
        const rawSlug = this.getProviderSlug(provider);
        const mappedSlug = PROVIDER_MAP[rawSlug] || rawSlug;
        return PROVIDER_DISPLAY_NAMES[mappedSlug] || provider?.name || mappedSlug || 'Connected device';
    }

    async getConnections(userId: string) {
        const junctionUserId = await wearablesRepository.getJunctionUserId(userId);
        if (!junctionUserId) {
            return [];
        }

        const providers = await getConnectedProviders(junctionUserId);

        return providers.map((p: any) => ({
            id: `${junctionUserId}_${this.getProviderSlug(p)}`,
            userId,
            provider: PROVIDER_MAP[this.getProviderSlug(p)] || this.getProviderSlug(p),
            providerName: this.getProviderDisplayName(p),
            status: this.getProviderConnectionStatus(p),
            connectedAt: p.connectedAt || p.createdOn || new Date().toISOString(),
            lastSyncedAt: p.lastSyncAt || null,
            errorMessage: this.getProviderErrorMessage(p),
            source: 'junction',
        }));
    }

    async getConnectLink(userId: string, provider?: string, forceFreshUser: boolean = false, redirectUrl?: string) {
        const normalizedProvider = this.normalizeConnectProvider(provider);
        let junctionUserId = await wearablesRepository.getJunctionUserId(userId);

        if (forceFreshUser) {
            const recoveryClientUserId = `${userId}-real-${Date.now()}`;
            junctionUserId = await createJunctionUserWithClientUserId(recoveryClientUserId);
            await wearablesRepository.updateJunctionUserId(userId, junctionUserId);
            logger.info('Force-created fresh Junction user ID for connect flow', { userId, junctionUserId, provider: normalizedProvider });
        } else if (!junctionUserId) {
            junctionUserId = await getOrCreateJunctionUser(userId, null);
            await wearablesRepository.updateJunctionUserId(userId, junctionUserId);
            logger.info('Created and saved Junction user ID', { userId, junctionUserId });
        }

        try {
            const existingConnections = await getConnectedProviders(junctionUserId);
            if (this.hasDemoConnection(existingConnections)) {
                logger.warn('Detected demo connection on Junction user; rotating to fresh real-data user before link generation', {
                    userId,
                    junctionUserId,
                    provider: normalizedProvider,
                });

                const recoveryClientUserId = `${userId}-real-${Date.now()}`;
                const freshJunctionUserId = await createJunctionUserWithClientUserId(recoveryClientUserId);
                await wearablesRepository.updateJunctionUserId(userId, freshJunctionUserId);
                junctionUserId = freshJunctionUserId;
            }
        } catch (error) {
            logger.warn('Unable to inspect existing Junction connections before link generation', { userId, junctionUserId, error });
        }

        let linkToken: string;
        let linkWebUrl: string;

        try {
            const link = await generateLinkToken(junctionUserId, normalizedProvider as any, redirectUrl);
            linkToken = link.linkToken;
            linkWebUrl = link.linkWebUrl;
        } catch (error) {
            if (!this.isDemoConflictError(error)) {
                throw error;
            }

            const previousJunctionUserId = junctionUserId;
            logger.warn('Detected demo/non-demo Junction conflict; rotating to a fresh Junction user', { userId, junctionUserId });
            const recoveryClientUserId = `${userId}-real-${Date.now()}`;
            const freshJunctionUserId = await createJunctionUserWithClientUserId(recoveryClientUserId);
            await wearablesRepository.updateJunctionUserId(userId, freshJunctionUserId);
            junctionUserId = freshJunctionUserId;

            const retryLink = await generateLinkToken(freshJunctionUserId, normalizedProvider as any, redirectUrl);
            linkToken = retryLink.linkToken;
            linkWebUrl = retryLink.linkWebUrl;

            logger.info('Recovered Junction connect flow with fresh user', {
                userId,
                previousJunctionUserId,
                freshJunctionUserId,
            });
        }

        return {
            linkUrl: linkWebUrl,
            linkToken,
        };
    }

    async disconnectDevice(userId: string, connectionId: string) {
        const actualJunctionUserId = await wearablesRepository.getJunctionUserId(userId);
        if (!actualJunctionUserId) {
            throw new Error('Not authorized to disconnect this device');
        }

        if (!connectionId.startsWith(actualJunctionUserId + '_')) {
            throw new Error('Not authorized to disconnect this device');
        }

        const providerSlug = connectionId.substring(actualJunctionUserId.length + 1);
        if (!providerSlug) {
            throw new Error('Invalid connection ID');
        }

        await disconnectProvider(actualJunctionUserId, providerSlug);
    }

    async getBiometricData(userId: string, startDate: string, endDate: string, provider?: string) {
        const junctionUserId = await wearablesRepository.getJunctionUserId(userId);
        console.log('[Wearables:getBiometricData] userId:', userId, 'junctionUserId:', junctionUserId);
        if (!junctionUserId) {
            console.log('[Wearables:getBiometricData] No junction user ID - returning empty');
            return { data: [] };
        }

        const [sleepData, activityData, bodyData] = await Promise.all([
            getSleepData(junctionUserId, startDate, endDate).catch((e) => { console.error('[Wearables] Sleep fetch error:', e?.message); return []; }),
            getActivityData(junctionUserId, startDate, endDate).catch((e) => { console.error('[Wearables] Activity fetch error:', e?.message); return []; }),
            getBodyData(junctionUserId, startDate, endDate).catch((e) => { console.error('[Wearables] Body fetch error:', e?.message); return []; }),
        ]);
        console.log('[Wearables:getBiometricData] Junction API results - sleep:', sleepData.length, 'activity:', activityData.length, 'body:', bodyData.length);

        const dataByDate = new Map<string, any>();

        // Process sleep data
        sleepData.forEach((sleep: any) => {
            const dateKey = sleep.calendarDate || sleep.date?.split('T')[0];
            if (!dateKey) return;

            if (!dataByDate.has(dateKey)) {
                dataByDate.set(dateKey, { date: dateKey, provider: sleep.source?.slug });
            }
            const entry = dataByDate.get(dateKey);
            entry.sleep = {
                score: sleep.score || sleep.sleepScore,
                totalMinutes: sleep.total ? Math.round(sleep.total / 60) : (sleep.duration ? Math.round(sleep.duration / 60) : null),
                deepSleepMinutes: sleep.deep ? Math.round(sleep.deep / 60) : null,
                remSleepMinutes: sleep.rem ? Math.round(sleep.rem / 60) : null,
                lightSleepMinutes: sleep.light ? Math.round(sleep.light / 60) : null,
                efficiency: sleep.efficiency,
            };

            // Many providers (Oura, Fitbit) report HRV and resting HR in sleep data.
            // Extract heart metrics from sleep so they're available even without body data.
            const sleepHrv = sleep.averageHrv || sleep.average_hrv || sleep.hrv?.average;
            const sleepRestingHR = sleep.hrResting || sleep.hrLowest || sleep.hr_lowest || sleep.heartRate?.min;
            const sleepAvgHR = sleep.hrAverage || sleep.hr_average;
            const sleepRespiratoryRate = sleep.respiratoryRate || sleep.respiratory_rate;
            if (sleepHrv || sleepRestingHR || sleepAvgHR) {
                if (!entry.heart) {
                    entry.heart = {};
                }
                // Only set if not already populated by body data (body data takes precedence)
                if (!entry.heart.hrvMs && sleepHrv) entry.heart.hrvMs = sleepHrv;
                if (!entry.heart.restingRate && sleepRestingHR) entry.heart.restingRate = sleepRestingHR;
                if (!entry.heart.averageRate && sleepAvgHR) entry.heart.averageRate = sleepAvgHR;
            }
            if (sleepRespiratoryRate) {
                if (!entry.body) entry.body = {};
                if (!entry.body.respiratoryRate) entry.body.respiratoryRate = sleepRespiratoryRate;
            }
        });

        // Process activity data
        activityData.forEach((activity: any) => {
            const dateKey = activity.calendarDate || activity.date?.split('T')[0];
            if (!dateKey) return;

            if (!dataByDate.has(dateKey)) {
                dataByDate.set(dateKey, { date: dateKey, provider: activity.source?.slug });
            }
            const entry = dataByDate.get(dateKey);
            entry.activity = {
                steps: activity.steps,
                caloriesBurned: activity.caloriesTotal || activity.caloriesActive,
                activeMinutes: activity.activeMinutes || activity.moderateMinutes,
                distance: activity.distance,
                floorsClimbed: activity.floors,
            };
        });

        // Process body data
        bodyData.forEach((body: any) => {
            const dateKey = body.calendarDate || body.date?.split('T')[0];
            if (!dateKey) return;

            if (!dataByDate.has(dateKey)) {
                dataByDate.set(dateKey, { date: dateKey, provider: body.source?.slug });
            }
            const entry = dataByDate.get(dateKey);
            entry.heart = {
                hrvMs: body.hrv?.avgHrv || body.hrvAvg,
                restingRate: body.heartRate?.restingHr || body.restingHeartRate,
                averageRate: body.heartRate?.avgHr,
                maxRate: body.heartRate?.maxHr,
            };
            entry.body = {
                weight: body.weight,
                bodyFat: body.bodyFatPercentage,
                temperature: body.temperature,
                spo2: body.oxygenSaturation,
                respiratoryRate: body.respiratoryRate,
            };
        });

        let data = Array.from(dataByDate.values());
        if (provider) {
            data = data.filter(d => d.provider === provider);
        }

        data.sort((a, b) => a.date.localeCompare(b.date));
        return { data };
    }

    async getMergedBiometricData(userId: string, startDate: string, endDate: string) {
        const junctionUserId = await wearablesRepository.getJunctionUserId(userId);
        if (!junctionUserId) {
            return { data: [] };
        }

        const [sleepData, activityData, bodyData, workoutData] = await Promise.all([
            getSleepData(junctionUserId, startDate, endDate),
            getActivityData(junctionUserId, startDate, endDate),
            getBodyData(junctionUserId, startDate, endDate),
            getWorkoutData(junctionUserId, startDate, endDate),
        ]);

        const dataByDate = new Map<string, any>();

        const processData = (items: any[], type: string) => {
            for (const item of items) {
                const date = item.calendar_date || item.date || item.timestamp?.split('T')[0];
                if (!date) continue;

                if (!dataByDate.has(date)) {
                    dataByDate.set(date, {
                        date,
                        source: 'junction',
                        sleep: {},
                        activity: {},
                        body: {},
                        workouts: [],
                    });
                }

                const entry = dataByDate.get(date);
                if (type === 'sleep' && item.duration_total_seconds) {
                    entry.sleep = {
                        totalMinutes: Math.round(item.duration_total_seconds / 60),
                        deepMinutes: Math.round((item.duration_deep_sleep_seconds || 0) / 60),
                        remMinutes: Math.round((item.duration_rem_sleep_seconds || 0) / 60),
                        lightMinutes: Math.round((item.duration_light_sleep_seconds || 0) / 60),
                        score: item.sleep_efficiency,
                        hrvMs: item.average_hrv,
                    };
                } else if (type === 'activity') {
                    entry.activity = {
                        steps: item.steps,
                        calories: item.calories_active,
                        distance: item.distance_meters ? Math.round(item.distance_meters) : undefined,
                        activeMinutes: item.active_duration_seconds ? Math.round(item.active_duration_seconds / 60) : undefined,
                    };
                } else if (type === 'body') {
                    entry.body = {
                        weight: item.weight_kg,
                        bodyFat: item.body_fat_percentage,
                    };
                } else if (type === 'workout') {
                    entry.workouts.push({
                        type: item.sport_name || item.title,
                        duration: item.duration_seconds ? Math.round(item.duration_seconds / 60) : undefined,
                        calories: item.calories,
                        distance: item.distance_meters,
                    });
                }
            }
        };

        processData(sleepData, 'sleep');
        processData(activityData, 'activity');
        processData(bodyData, 'body');
        processData(workoutData, 'workout');

        const data = Array.from(dataByDate.values());
        data.sort((a, b) => a.date.localeCompare(b.date));

        return { data };
    }

    async syncData(userId: string) {
        const junctionUserId = await wearablesRepository.getJunctionUserId(userId);
        if (!junctionUserId) {
            throw new Error('No wearables connected');
        }

        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        await Promise.all([
            getSleepData(junctionUserId, startDate, endDate).catch(() => []),
            getActivityData(junctionUserId, startDate, endDate).catch(() => []),
            getBodyData(junctionUserId, startDate, endDate).catch(() => []),
        ]);

        return {
            success: true,
            message: 'Data sync initiated via Junction',
        };
    }

    async getInsights(userId: string, days: number = 30) {
        const junctionUserId = await wearablesRepository.getJunctionUserId(userId);
        if (!junctionUserId) {
            return {
                insights: { sleep: null, heart: null, recovery: null, activity: null },
                message: 'No wearables connected',
            };
        }

        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const [sleepData, activityData, bodyData] = await Promise.all([
            getSleepData(junctionUserId, startDate, endDate).catch(() => []),
            getActivityData(junctionUserId, startDate, endDate).catch(() => []),
            getBodyData(junctionUserId, startDate, endDate).catch(() => []),
        ]);

        if (sleepData.length === 0 && activityData.length === 0 && bodyData.length === 0) {
            return {
                insights: { sleep: null, heart: null, recovery: null, activity: null },
                message: 'No data available for insights',
            };
        }

        const sleepDurations = sleepData.map((s: any) => s.total ? s.total / 60 : (s.duration ? s.duration / 60 : null)).filter(Boolean) as number[];
        const sleepScores = sleepData.map((s: any) => s.score || s.sleepScore).filter(Boolean) as number[];
        const hrvValues = sleepData.map((s: any) => s.averageHrv || s.average_hrv).filter(Boolean) as number[];
        const restingHRs = sleepData.map((s: any) => s.hrResting || s.hrLowest).filter(Boolean) as number[];
        const steps = activityData.map((a: any) => a.steps).filter(Boolean) as number[];

        const insights = {
            sleep: sleepDurations.length > 0 ? {
                averageMinutes: Math.round(sleepDurations.reduce((a, b) => a + b, 0) / sleepDurations.length),
                averageScore: sleepScores.length > 0
                    ? Math.round(sleepScores.reduce((a, b) => a + b, 0) / sleepScores.length)
                    : null,
                trend: this.calculateTrend(sleepDurations),
                qualityTrend: sleepScores.length > 0 ? this.calculateTrend(sleepScores) : null,
            } : null,

            heart: hrvValues.length > 0 || restingHRs.length > 0 ? {
                averageHRV: hrvValues.length > 0
                    ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length)
                    : null,
                averageRestingHR: restingHRs.length > 0
                    ? Math.round(restingHRs.reduce((a, b) => a + b, 0) / restingHRs.length)
                    : null,
                hrvTrend: hrvValues.length > 0 ? this.calculateTrend(hrvValues) : null,
                restingHRTrend: restingHRs.length > 0 ? this.calculateTrend(restingHRs) : null,
            } : null,

            recovery: null,

            activity: steps.length > 0 ? {
                averageSteps: Math.round(steps.reduce((a, b) => a + b, 0) / steps.length),
                trend: this.calculateTrend(steps),
            } : null,
        };

        return { insights, daysAnalyzed: days };
    }

    async getHistoricalData(userId: string, days: number = 90) {
        const junctionUserId = await wearablesRepository.getJunctionUserId(userId);
        if (!junctionUserId) {
            return {
                success: false,
                error: 'No wearable connected',
                data: null,
            };
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const [sleepData, activityData, bodyData, workoutData] = await Promise.all([
            getSleepData(junctionUserId, startStr, endStr).catch(e => { logger.error('Sleep fetch error:', e); return []; }),
            getActivityData(junctionUserId, startStr, endStr).catch(e => { logger.error('Activity fetch error:', e); return []; }),
            getBodyData(junctionUserId, startStr, endStr).catch(e => { logger.error('Body fetch error:', e); return []; }),
            getWorkoutData(junctionUserId, startStr, endStr).catch(e => { logger.error('Workout fetch error:', e); return []; }),
        ]);

        const historicalData = {
            summary: {
                daysOfData: days,
                dateRange: { start: startStr, end: endStr },
                dataPoints: {
                    sleep: sleepData.length,
                    activity: activityData.length,
                    body: bodyData.length,
                    workouts: workoutData.length,
                },
            },
            sleep: sleepData.map((s: any) => ({
                date: s.calendar_date || s.calendarDate,
                // SDK returns duration fields in seconds; duration_total_seconds is legacy snake_case, s.total/s.duration are camelCase SDK fields
                totalMinutes: s.duration_total_seconds
                    ? Math.round(s.duration_total_seconds / 60)
                    : (s.total != null ? Math.round(s.total / 60) : s.duration != null ? Math.round(s.duration / 60) : null),
                deepSleepMinutes: s.duration_deep_sleep_seconds
                    ? Math.round(s.duration_deep_sleep_seconds / 60)
                    : (s.deep != null ? Math.round(s.deep / 60) : null),
                remSleepMinutes: s.duration_rem_sleep_seconds
                    ? Math.round(s.duration_rem_sleep_seconds / 60)
                    : (s.rem != null ? Math.round(s.rem / 60) : null),
                lightSleepMinutes: s.duration_light_sleep_seconds
                    ? Math.round(s.duration_light_sleep_seconds / 60)
                    : (s.light != null ? Math.round(s.light / 60) : null),
                awakeMinutes: s.duration_awake_seconds
                    ? Math.round(s.duration_awake_seconds / 60)
                    : (s.awake != null ? Math.round(s.awake / 60) : null),
                efficiency: s.sleep_efficiency || s.efficiency,
                score: s.sleep_score || s.score,
                // SDK v2 uses camelCase: averageHrv (flat), not hrv.average
                hrv: s.averageHrv || s.average_hrv || s.hrv?.average,
                // SDK v2 uses hrLowest / hrResting (flat)
                restingHR: s.hrResting || s.hrLowest || s.hr_lowest || s.heartRate?.min,
                respiratoryRate: s.respiratoryRate || s.respiratory_rate,
                readinessScore: s.readinessScore || s.readiness_score || s.readiness?.score || null,
                source: s.source?.slug || 'unknown',
            })),
            activity: activityData.map((a: any) => ({
                date: a.calendar_date || a.calendarDate || a.date?.split('T')[0],
                steps: a.steps,
                // caloriesActive can be negative in Fitbit demo data — clamp to 0
                caloriesActive: Math.max(0, a.calories_active ?? a.caloriesActive ?? 0) || null,
                caloriesTotal: a.calories_total || a.caloriesTotal,
                distanceMeters: a.distance_meters || a.distance,
                floorsClimbed: a.floors_climbed || a.floorsClimbed,
                // SDK exposes intensity buckets as low/medium/high (in minutes); active = medium + high
                activeMinutes: ((a.medium || 0) + (a.high || 0)) || null,
                lowIntensityMinutes: a.low_intensity_duration_seconds ? Math.round(a.low_intensity_duration_seconds / 60) : (a.low ?? null),
                moderateIntensityMinutes: a.moderate_intensity_duration_seconds ? Math.round(a.moderate_intensity_duration_seconds / 60) : (a.medium ?? null),
                highIntensityMinutes: a.high_intensity_duration_seconds ? Math.round(a.high_intensity_duration_seconds / 60) : (a.high ?? null),
                // SDK uses camelCase heartRate.avgBpm / maxBpm
                avgHeartRate: a.heart_rate?.avg_bpm || a.heartRate?.avgBpm,
                maxHeartRate: a.heart_rate?.max_bpm || a.heartRate?.maxBpm,
                source: a.source?.slug || 'unknown',
            })),
            body: bodyData.map((b: any) => ({
                date: b.calendar_date || b.calendarDate || b.date?.split('T')[0],
                weight: b.weight_kg || b.weight,
                // SDK v2 uses 'fat' (not bodyFat / body_fat_percentage)
                bodyFat: b.fat || b.body_fat_percentage || b.bodyFat,
                // SDK v2 uses 'bodyMassIndex' (not bmi)
                bmi: b.bodyMassIndex || b.bmi,
                restingHR: b.hr_resting || b.heartRate?.resting,
                hrvAvg: b.hrv_avg || b.hrv?.average,
                hrvMax: b.hrv_max || b.hrv?.max,
                bloodOxygen: b.blood_oxygen || b.spo2,
                respiratoryRate: b.respiratory_rate || b.respiratoryRate,
                recoveryScore: b.recovery_score || b.recoveryScore || null,
                source: b.source?.slug || 'unknown',
            })),
            workouts: workoutData.map((w: any) => ({
                date: w.calendar_date || w.calendarDate || w.time_start?.split('T')[0] || w.timeStart?.split('T')[0],
                type: w.sport?.name || w.title || w.sport_name,
                // SDK has timeStart/timeEnd (camelCase); compute duration from those when duration_seconds is absent
                durationMinutes: w.duration_seconds
                    ? Math.round(w.duration_seconds / 60)
                    : (w.timeStart && w.timeEnd
                        ? Math.round((new Date(w.timeEnd).getTime() - new Date(w.timeStart).getTime()) / 60000)
                        : null),
                calories: w.calories,
                distanceMeters: w.distance_meters || w.distance,
                // SDK uses camelCase averageHr/maxHr
                avgHeartRate: w.average_hr || w.averageHr || w.heartRate?.average,
                maxHeartRate: w.max_hr || w.maxHr || w.heartRate?.max,
                avgSpeed: w.average_speed || w.averageSpeed,
                source: w.source?.slug || 'unknown',
            })),
        };

        // Helper: average of non-null values in an array
        const avgOf = (arr: (number | null | undefined)[]): number | null => {
            const valid = arr.filter((v): v is number => v != null);
            return valid.length > 0 ? Math.round(valid.reduce((s, v) => s + v, 0) / valid.length) : null;
        };
        const avgOf1 = (arr: (number | null | undefined)[]): number | null => {
            const valid = arr.filter((v): v is number => v != null);
            return valid.length > 0 ? Math.round(valid.reduce((s, v) => s + v, 0) / valid.length * 10) / 10 : null;
        };

        const stats = {
            sleep: {
                avgDuration: avgOf(historicalData.sleep.map(s => s.totalMinutes)),
                avgScore: avgOf(historicalData.sleep.map(s => s.score)),
                avgHRV: avgOf(historicalData.sleep.map(s => s.hrv)),
                avgDeepSleep: avgOf(historicalData.sleep.map(s => s.deepSleepMinutes)),
                avgRemSleep: avgOf(historicalData.sleep.map(s => s.remSleepMinutes)),
                avgLightSleep: avgOf(historicalData.sleep.map(s => s.lightSleepMinutes)),
                avgEfficiency: avgOf(historicalData.sleep.map(s => s.efficiency)),
                avgRespiratoryRate: avgOf1(historicalData.sleep.map(s => s.respiratoryRate)),
                avgRestingHR: avgOf(historicalData.sleep.map(s => s.restingHR)),
                avgReadiness: avgOf(historicalData.sleep.map(s => s.readinessScore)),
            },
            activity: {
                avgSteps: avgOf(historicalData.activity.map(a => a.steps)),
                avgActiveMinutes: avgOf(historicalData.activity.map(a => a.activeMinutes)),
                avgCaloriesActive: avgOf(historicalData.activity.map(a => a.caloriesActive)),
                avgCaloriesTotal: avgOf(historicalData.activity.map(a => a.caloriesTotal)),
                avgDistance: avgOf1(historicalData.activity.map(a => a.distanceMeters)),
                avgFloors: avgOf(historicalData.activity.map(a => a.floorsClimbed)),
                avgHeartRate: avgOf(historicalData.activity.map(a => a.avgHeartRate)),
                avgMaxHeartRate: avgOf(historicalData.activity.map(a => a.maxHeartRate)),
            },
            body: {
                latestWeight: historicalData.body.filter(b => b.weight).slice(-1)[0]?.weight || null,
                latestBodyFat: historicalData.body.filter(b => b.bodyFat).slice(-1)[0]?.bodyFat || null,
                latestBMI: historicalData.body.filter(b => b.bmi).slice(-1)[0]?.bmi || null,
                avgRestingHR: avgOf(historicalData.body.map(b => b.restingHR)),
                avgHRV: avgOf(historicalData.body.map(b => b.hrvAvg)),
                avgBloodOxygen: avgOf(historicalData.body.map(b => b.bloodOxygen)),
                avgRespiratoryRate: avgOf1(historicalData.body.map(b => b.respiratoryRate)),
                avgRecoveryScore: avgOf(historicalData.body.map(b => b.recoveryScore)),
            },
            workouts: {
                totalCount: historicalData.workouts.length,
                avgPerWeek: historicalData.workouts.length > 0
                    ? Math.round((historicalData.workouts.length / days) * 7 * 10) / 10
                    : 0,
                avgDuration: (() => {
                    const withDuration = historicalData.workouts.filter(w => w.durationMinutes != null && w.durationMinutes > 0);
                    return withDuration.length > 0
                        ? Math.round(withDuration.reduce((sum, w) => sum + w.durationMinutes!, 0) / withDuration.length)
                        : null;
                })(),
                avgCalories: avgOf(historicalData.workouts.map(w => w.calories)),
                avgHeartRate: avgOf(historicalData.workouts.map(w => w.avgHeartRate)),
                avgDistance: avgOf1(historicalData.workouts.map(w => w.distanceMeters)),
                mostCommonType: historicalData.workouts.length > 0
                    ? this.getMostCommonWorkoutType(historicalData.workouts)
                    : null,
            },
        };

        return {
            success: true,
            data: historicalData,
            statistics: stats,
        };
    }

    async getPillars(userId: string) {
        const junctionUserId = await wearablesRepository.getJunctionUserId(userId);
        if (!junctionUserId) {
            return { activePillars: [], unlockablePillars: Object.keys(PILLAR_META).map(p => ({ pillar: p, label: PILLAR_META[p].label, description: PILLAR_META[p].description, suggestedProviders: PILLAR_SUGGESTED[p] ?? [] })) };
        }

        // Derive active pillars from real data, not unreliable provider catalog
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const [sleepData, activityData, bodyData, workoutData, connectedProviders] = await Promise.all([
            getSleepData(junctionUserId, startDate, endDate).catch(() => []),
            getActivityData(junctionUserId, startDate, endDate).catch(() => []),
            getBodyData(junctionUserId, startDate, endDate).catch(() => []),
            getWorkoutData(junctionUserId, startDate, endDate).catch(() => []),
            getConnectedProviders(junctionUserId).catch(() => []),
        ]);

        const connectedProviderSlugs = new Set<string>(
            (connectedProviders as any[])
                .filter((provider: any) => this.isProviderConnected(provider))
                .flatMap((provider: any) => {
                    const raw = this.getProviderSlug(provider);
                    if (!raw) return [];
                    const mapped = PROVIDER_MAP[raw] || raw;
                    return [raw, mapped];
                })
        );

        const hasConnectedProviderForPillar = (pillar: string) =>
            (PILLAR_SUGGESTED[pillar] ?? []).some((provider) => {
                const mapped = PROVIDER_MAP[provider.slug] || provider.slug;
                return connectedProviderSlugs.has(provider.slug) || connectedProviderSlugs.has(mapped);
            });

        const hasHRV = sleepData.some((s: any) => s.averageHrv != null || s.average_hrv != null || s.hrv?.average != null)
            || bodyData.some((b: any) => b.hrv?.rmssd?.avg != null || b.hrv_avg != null);

        const dataPresence: Record<string, boolean> = {
            sleep:    sleepData.length > 0 || hasConnectedProviderForPillar('sleep'),
            activity: activityData.length > 0 || hasConnectedProviderForPillar('activity'),
            workouts: workoutData.length > 0 || hasConnectedProviderForPillar('workouts'),
            body:     bodyData.length > 0 || hasConnectedProviderForPillar('body'),
            recovery: hasHRV || hasConnectedProviderForPillar('recovery'),
            glucose:  hasConnectedProviderForPillar('glucose'),
            heart:    hasConnectedProviderForPillar('heart'),
            nutrition: hasConnectedProviderForPillar('nutrition'),
        };

        const activePillars: string[] = [];
        const unlockablePillars: { pillar: string; label: string; description: string; suggestedProviders: { slug: string; name: string; logo?: string }[] }[] = [];

        for (const [pillar, active] of Object.entries(dataPresence)) {
            if (active) {
                activePillars.push(pillar);
            } else {
                unlockablePillars.push({
                    pillar,
                    label: PILLAR_META[pillar].label,
                    description: PILLAR_META[pillar].description,
                    suggestedProviders: PILLAR_SUGGESTED[pillar] ?? [],
                });
            }
        }

        return { activePillars, unlockablePillars };
    }

    async getHealthPulseSummary(userId: string) {
        const junctionUserId = await wearablesRepository.getJunctionUserId(userId);

        // Get 7 days of wearable data + latest lab analyses in parallel
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const [sleepData, activityData, bodyData, labAnalyses, labReports] = await Promise.all([
            junctionUserId ? getSleepData(junctionUserId, startDate, endDate).catch(() => []) : Promise.resolve([]),
            junctionUserId ? getActivityData(junctionUserId, startDate, endDate).catch(() => []) : Promise.resolve([]),
            junctionUserId ? getBodyData(junctionUserId, startDate, endDate).catch(() => []) : Promise.resolve([]),
            filesRepository.listLabAnalysesByUser(userId).catch(() => []),
            filesRepository.getLabReportsByUser(userId).catch(() => []),
        ]);

        // Check connected providers
        let providers: string[] = [];
        if (junctionUserId) {
            try {
                const connected = await getConnectedProviders(junctionUserId);
                providers = connected
                    .filter((provider: any) => this.isProviderConnected(provider))
                    .map((provider: any) => this.getProviderDisplayName(provider));
            } catch {
                providers = [];
            }
        }

        // Build date-keyed map of the last 7 days
        const dateMap = new Map<string, { sleepMinutes: number | null; deepSleepMinutes: number | null; hrv: number | null; sleepScore: number | null; steps: number | null; activeMinutes: number | null }>();

        // Initialise each of the 7 days with nulls so we have full arrays even without data
        for (let i = 6; i >= 0; i--) {
            const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            dateMap.set(d, { sleepMinutes: null, deepSleepMinutes: null, hrv: null, sleepScore: null, steps: null, activeMinutes: null });
        }

        // Fill sleep data (uses Junction/Vital SDK v2 camelCase fields)
        for (const s of sleepData as any[]) {
            const date = s.calendar_date || s.calendarDate || s.date?.split('T')[0];
            if (!date || !dateMap.has(date)) continue;
            const entry = dateMap.get(date)!;
            // Duration: SDK v2 uses total/duration (seconds), legacy uses duration_total_seconds
            if (s.duration_total_seconds) entry.sleepMinutes = Math.round(s.duration_total_seconds / 60);
            else if (s.total != null) entry.sleepMinutes = Math.round(s.total / 60);
            else if (s.duration != null) entry.sleepMinutes = Math.round(s.duration / 60);
            // Deep sleep: SDK v2 uses deep (seconds), legacy uses duration_deep_sleep_seconds
            if (s.duration_deep_sleep_seconds) entry.deepSleepMinutes = Math.round(s.duration_deep_sleep_seconds / 60);
            else if (s.deep != null) entry.deepSleepMinutes = Math.round(s.deep / 60);
            // HRV: SDK v2 uses averageHrv (flat camelCase)
            if (s.averageHrv) entry.hrv = Math.round(s.averageHrv);
            else if (s.average_hrv) entry.hrv = Math.round(s.average_hrv);
            // Sleep score: SDK v2 uses efficiency (0-100), legacy uses sleep_efficiency (0-1)
            if (s.efficiency != null) entry.sleepScore = Math.round(s.efficiency);
            else if (s.sleep_efficiency) entry.sleepScore = Math.round(s.sleep_efficiency * 100);
            // Fallback for older format
            if (!entry.hrv && (s.hrv?.avgHrv || s.hrvAvg)) entry.hrv = Math.round(s.hrv?.avgHrv || s.hrvAvg);
        }

        // Fill activity data
        for (const a of activityData as any[]) {
            const date = a.calendar_date || a.calendarDate || a.date?.split('T')[0];
            if (!date || !dateMap.has(date)) continue;
            const entry = dateMap.get(date)!;
            if (a.steps) entry.steps = a.steps;
            if (a.active_duration_seconds) entry.activeMinutes = Math.round(a.active_duration_seconds / 60);
            else if (a.activeMinutes) entry.activeMinutes = a.activeMinutes;
        }

        const sortedDates = Array.from(dateMap.keys()).sort();
        const today = sortedDates[sortedDates.length - 1];
        const todayEntry = dateMap.get(today)!;

        const mapAnalysisMarkers = (analysis: any) => (
            analysis?.extractedMarkers
                ? (analysis.extractedMarkers as any[]).slice(0, 8).map((m: any) => ({
                    name: m.name,
                    value: m.value,
                    unit: m.unit || '',
                    status: this.inferMarkerStatus(m.name, m.value, m.status, m.referenceRange),
                    referenceRange: m.referenceRange || '',
                }))
                : []
        );

        const extractDataArray = (reportData: any): any[] => {
            if (!reportData) return [];
            const raw = reportData.extractedData;
            if (Array.isArray(raw) && raw.length > 0) return raw;
            // Handle nested formats: { extractedData: { results: [...] } }
            if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                for (const key of ['results', 'markers', 'data', 'tests', 'extractedData']) {
                    if (Array.isArray(raw[key]) && raw[key].length > 0) return raw[key];
                }
            }
            return [];
        };

        const mapReportMarkers = (report: any) => {
            const items = extractDataArray(report?.labReportData);
            return items.slice(0, 8).map((marker: any) => ({
                name: marker.testName || marker.name || 'Unknown Marker',
                value: marker.value,
                unit: marker.unit || '',
                status: this.inferMarkerStatus(marker.testName || marker.name, marker.value, marker.status, marker.referenceRange),
                referenceRange: marker.referenceRange || '',
            }));
        };

        // Prefer completed reports, but fall back to any report that has actual extracted data
        const reportsWithData = (labReports as any[])
            .filter((report: any) => extractDataArray(report?.labReportData).length > 0)
            .sort((a: any, b: any) => {
                // Prefer 'completed' status, then sort by date
                const statusA = a?.labReportData?.analysisStatus === 'completed' ? 0 : 1;
                const statusB = b?.labReportData?.analysisStatus === 'completed' ? 0 : 1;
                if (statusA !== statusB) return statusA - statusB;
                return new Date(b?.uploadedAt || 0).getTime() - new Date(a?.uploadedAt || 0).getTime();
            });

        const completedReports = reportsWithData.length > 0
            ? reportsWithData
            : (labReports as any[])
                .filter((report: any) => report?.labReportData?.analysisStatus === 'completed')
                .sort((a: any, b: any) => new Date(b?.uploadedAt || 0).getTime() - new Date(a?.uploadedAt || 0).getTime());

        const latestLabReport = completedReports[0] || null;
        const previousLabReport = completedReports[1] || null;

        const fallbackMarkers = latestLabReport ? mapReportMarkers(latestLabReport) : [];
        const fallbackPreviousMarkers = previousLabReport ? mapReportMarkers(previousLabReport) : [];

        // Lab markers from most recent analysis, with fallback to latest uploaded lab report extraction
        const latestLab = labAnalyses[0] || null;
        const previousLab = labAnalyses[1] || null;
        const analysisMarkers = mapAnalysisMarkers(latestLab);
        const previousAnalysisMarkers = mapAnalysisMarkers(previousLab);
        const labMarkers = analysisMarkers.length > 0 ? analysisMarkers : fallbackMarkers;
        const previousMarkers = previousAnalysisMarkers.length > 0 ? previousAnalysisMarkers : fallbackPreviousMarkers;

        const uploadedLabCount = Array.isArray(labReports) ? labReports.length : 0;
        const hasUploadedLabs = uploadedLabCount > 0;

        const labSummary = latestLab?.aiInsights?.summary
            || (labMarkers.length > 0
                ? this.buildLabSummary(labMarkers.map((marker: any) => ({ name: marker.name, status: marker.status })))
                : '');

        const latestUploadedReport = (labReports as any[])
            .sort((a: any, b: any) => new Date(b?.uploadedAt || 0).getTime() - new Date(a?.uploadedAt || 0).getTime())[0] || null;

        const labReportDate = latestLab?.processedAt
            ? new Date(latestLab.processedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : latestLabReport?.uploadedAt
                ? new Date(latestLabReport.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : latestUploadedReport?.uploadedAt
                    ? new Date(latestUploadedReport.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : null;

        const labChanges = this.buildLabChangeHighlights(labMarkers, previousMarkers);
        const labNextActions = this.buildLabActionItems(labMarkers.map((marker: any) => ({ name: marker.name, status: marker.status })), previousMarkers.length > 0);

        const labSummarySource = latestLab?.aiInsights?.summary
            ? 'ai_insights'
            : (labMarkers.length > 0 ? 'extracted_markers' : (hasUploadedLabs ? 'uploaded_reports' : 'none'));
        const labSummaryConfidence = latestLab?.aiInsights?.summary
            ? 'high'
            : (labMarkers.length > 0 ? 'medium' : 'low');

        const sourceLabel = labSummarySource === 'ai_insights'
            ? 'AI analysis'
            : labSummarySource === 'extracted_markers'
                ? 'Extracted markers'
                : labSummarySource === 'uploaded_reports'
                    ? 'Uploaded reports'
                    : 'No analyzed source';

        const confidenceLabel = labSummaryConfidence.charAt(0).toUpperCase() + labSummaryConfidence.slice(1);
        const labConfidenceSource = hasUploadedLabs
            ? `Source: ${sourceLabel} • Confidence: ${confidenceLabel}${labReportDate ? ` • Report: ${labReportDate}` : ''}`
            : null;

        return {
            connected: providers.length > 0,
            providers,
            today: {
                sleepMinutes: todayEntry.sleepMinutes,
                deepSleepMinutes: todayEntry.deepSleepMinutes,
                sleepScore: todayEntry.sleepScore,
                hrvMs: todayEntry.hrv,
                steps: todayEntry.steps,
                activeMinutes: todayEntry.activeMinutes,
            },
            trends: {
                dates: sortedDates,
                sleepMinutes: sortedDates.map(d => dateMap.get(d)!.sleepMinutes),
                hrv: sortedDates.map(d => dateMap.get(d)!.hrv),
                steps: sortedDates.map(d => dateMap.get(d)!.steps),
            },
            labMarkers,
            labSummary,
            labReportDate,
            labChanges,
            labNextActions,
            labSummarySource,
            labSummaryConfidence,
            labConfidenceSource,
            uploadedLabCount,
            hasUploadedLabs,
            lastUpdated: new Date().toISOString(),
        };
    }

    // ── Weekly Brief: tiered health analysis with deterministic signals ──
    private weeklyBriefCache = new Map<string, { data: any; expiresAt: number }>();
    private readonly WEEKLY_BRIEF_TTL = 60 * 60 * 1000; // 1 hour

    async getWeeklyBrief(userId: string) {
        const cacheKey = userId;
        const cached = this.weeklyBriefCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.data;
        }

        // Always pull 30 days so we have baseline room
        const histResult = await this.getHistoricalData(userId, 30);
        if (!histResult.success || !histResult.data) {
            return { tier: 'insufficient' as const, daysOfData: 0, narrative: null, actions: [], formulaNote: null, error: 'No wearable data available' };
        }

        const { sleep, activity } = histResult.data;

        // Count actual days with data (union of sleep + activity dates)
        const allDates = new Set<string>();
        sleep.forEach((s: any) => { if (s.date) allDates.add(s.date); });
        activity.forEach((a: any) => { if (a.date) allDates.add(a.date); });
        const daysOfData = allDates.size;

        if (daysOfData < 3) {
            return {
                tier: 'insufficient' as const,
                daysOfData,
                narrative: 'Keep wearing your device — we need at least 3 days of data to generate your first health brief.',
                actions: ['Wear your device overnight to capture sleep data', 'Keep your device on during the day for activity tracking'],
                formulaNote: null,
                generatedAt: new Date().toISOString(),
            };
        }

        // Determine tier
        type Tier = 'snapshot' | 'early_trends' | 'weekly' | 'full';
        let tier: Tier;
        if (daysOfData < 7) tier = 'snapshot';
        else if (daysOfData < 14) tier = 'early_trends';
        else if (daysOfData < 30) tier = 'weekly';
        else tier = 'full';

        // Sort daily arrays by date ascending
        const sortedSleep = [...sleep].sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));
        const sortedActivity = [...activity].sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));

        // ── Deterministic signal computation ──
        type Signal = {
            metric: string;
            label: string;
            category: 'sleep' | 'activity' | 'recovery';
            recentAvg: number;
            baselineAvg: number | null;
            delta: number | null;
            percentChange: number | null;
            direction: 'up' | 'down' | 'stable';
            flag: 'positive' | 'neutral' | 'attention';
            unit: string;
        };

        const avg = (arr: number[]): number | null => {
            if (arr.length === 0) return null;
            return Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10;
        };

        // Split data into recent vs baseline depending on tier
        const splitData = <T extends { date?: string }>(data: T[]) => {
            if (tier === 'snapshot') {
                return { recent: data, baseline: [] as T[] };
            }
            if (tier === 'early_trends') {
                const mid = Math.floor(data.length / 2);
                return { recent: data.slice(mid), baseline: data.slice(0, mid) };
            }
            // weekly or full: last 7 days vs the rest
            const cutoff = data.length - 7;
            if (cutoff <= 0) {
                const mid = Math.floor(data.length / 2);
                return { recent: data.slice(mid), baseline: data.slice(0, mid) };
            }
            return { recent: data.slice(cutoff), baseline: data.slice(0, cutoff) };
        };

        const sleepSplit = splitData(sortedSleep);
        const activitySplit = splitData(sortedActivity);

        // Extract metric values (filter nulls)
        const extract = <T>(items: T[], getter: (item: T) => number | null | undefined): number[] =>
            items.map(getter).filter((v): v is number => v != null && !isNaN(v));

        // Compute a signal for a metric
        const computeSignal = (
            metric: string,
            label: string,
            category: 'sleep' | 'activity' | 'recovery',
            recentValues: number[],
            baselineValues: number[],
            unit: string,
            thresholds: { attentionUp?: number; attentionDown?: number; positiveUp?: number; positiveDown?: number; invertDirection?: boolean },
        ): Signal | null => {
            const recentAvg = avg(recentValues);
            if (recentAvg === null) return null;

            const baselineAvg = avg(baselineValues);
            let delta: number | null = null;
            let percentChange: number | null = null;
            let direction: 'up' | 'down' | 'stable' = 'stable';
            let flag: 'positive' | 'neutral' | 'attention' = 'neutral';

            if (baselineAvg !== null && baselineAvg !== 0) {
                delta = Math.round((recentAvg - baselineAvg) * 10) / 10;
                percentChange = Math.round(((recentAvg - baselineAvg) / Math.abs(baselineAvg)) * 1000) / 10;
                if (Math.abs(percentChange) < 2) {
                    direction = 'stable';
                } else {
                    direction = delta > 0 ? 'up' : 'down';
                }

                // Apply thresholds
                const pct = percentChange;
                const abs = Math.abs(delta);
                if (thresholds.attentionDown != null && pct < -thresholds.attentionDown) flag = 'attention';
                if (thresholds.attentionUp != null && pct > thresholds.attentionUp) flag = 'attention';
                if (thresholds.positiveDown != null && pct < -thresholds.positiveDown) flag = 'positive';
                if (thresholds.positiveUp != null && pct > thresholds.positiveUp) flag = 'positive';

                // For inverted metrics (resting HR) — lower is better
                if (thresholds.invertDirection) {
                    if (direction === 'up' && abs > 3) flag = 'attention';
                    if (direction === 'down' && abs > 2) flag = 'positive';
                }
            }

            return { metric, label, category, recentAvg, baselineAvg, delta, percentChange, direction, flag, unit };
        };

        const signals: Signal[] = [];

        // Sleep metrics
        const hrvSignal = computeSignal(
            'hrv', 'HRV', 'recovery',
            extract(sleepSplit.recent, (s: any) => s.hrv),
            extract(sleepSplit.baseline, (s: any) => s.hrv),
            'ms',
            { attentionDown: 10, positiveUp: 10 },
        );
        if (hrvSignal) signals.push(hrvSignal);

        const rhrSignal = computeSignal(
            'resting_hr', 'Resting Heart Rate', 'recovery',
            extract(sleepSplit.recent, (s: any) => s.restingHR),
            extract(sleepSplit.baseline, (s: any) => s.restingHR),
            'bpm',
            { invertDirection: true },
        );
        if (rhrSignal) signals.push(rhrSignal);

        const sleepDurSignal = computeSignal(
            'sleep_duration', 'Sleep Duration', 'sleep',
            extract(sleepSplit.recent, (s: any) => s.totalMinutes ? s.totalMinutes / 60 : null),
            extract(sleepSplit.baseline, (s: any) => s.totalMinutes ? s.totalMinutes / 60 : null),
            'hrs',
            { attentionDown: 5, positiveUp: 5 },
        );
        if (sleepDurSignal) signals.push(sleepDurSignal);

        const deepSleepSignal = computeSignal(
            'deep_sleep', 'Deep Sleep', 'sleep',
            extract(sleepSplit.recent, (s: any) => s.deepSleepMinutes),
            extract(sleepSplit.baseline, (s: any) => s.deepSleepMinutes),
            'min',
            { attentionDown: 15, positiveUp: 15 },
        );
        if (deepSleepSignal) signals.push(deepSleepSignal);

        const effSignal = computeSignal(
            'sleep_efficiency', 'Sleep Efficiency', 'sleep',
            extract(sleepSplit.recent, (s: any) => s.efficiency),
            extract(sleepSplit.baseline, (s: any) => s.efficiency),
            '%',
            { attentionDown: 5, positiveUp: 3 },
        );
        if (effSignal) signals.push(effSignal);

        const readinessSignal = computeSignal(
            'readiness', 'Readiness Score', 'recovery',
            extract(sleepSplit.recent, (s: any) => s.readinessScore),
            extract(sleepSplit.baseline, (s: any) => s.readinessScore),
            'pts',
            { attentionDown: 10, positiveUp: 5 },
        );
        if (readinessSignal) signals.push(readinessSignal);

        // Activity metrics
        const stepsSignal = computeSignal(
            'steps', 'Daily Steps', 'activity',
            extract(activitySplit.recent, (a: any) => a.steps),
            extract(activitySplit.baseline, (a: any) => a.steps),
            'steps',
            { attentionDown: 20, positiveUp: 15 },
        );
        if (stepsSignal) signals.push(stepsSignal);

        const activeMinSignal = computeSignal(
            'active_minutes', 'Active Minutes', 'activity',
            extract(activitySplit.recent, (a: any) => a.activeMinutes),
            extract(activitySplit.baseline, (a: any) => a.activeMinutes),
            'min',
            { attentionDown: 20, positiveUp: 15 },
        );
        if (activeMinSignal) signals.push(activeMinSignal);

        if (signals.length === 0) {
            return {
                tier,
                daysOfData,
                narrative: 'We have some data but not enough individual metrics yet. Keep wearing your device.',
                actions: ['Ensure your device is worn overnight for sleep tracking'],
                formulaNote: null,
                generatedAt: new Date().toISOString(),
            };
        }

        // ── Fetch user's active formula (if any) ──
        let formulaContext: string | null = null;
        try {
            const formula = await formulasRepository.getCurrentFormulaByUser(userId);
            if (formula) {
                const allIngredients = [
                    ...(formula.bases || []).map((b: any) => `${b.ingredient} ${b.amount}${b.unit}`),
                    ...(formula.additions || []).map((a: any) => `${a.ingredient} ${a.amount}${a.unit}`),
                ];
                formulaContext = allIngredients.join(', ');
            }
        } catch (err) {
            logger.warn('Failed to fetch formula for weekly brief:', err);
        }

        // ── AI narrative from computed signals ──
        const tierLabels: Record<Tier, string> = {
            snapshot: '3-6 days of data (early snapshot, no baseline comparison)',
            early_trends: '7-13 days of data (emerging trends, first-half vs second-half comparison)',
            weekly: '14-29 days of data (weekly analysis, 7-day recent vs earlier baseline)',
            full: '30+ days of data (full weekly brief, 7-day recent vs 14-30 day baseline)',
        };

        const signalBlock = signals.map(s => {
            const parts = [`${s.label}: ${s.recentAvg}${s.unit}`];
            if (s.baselineAvg !== null) {
                parts.push(`baseline ${s.baselineAvg}${s.unit}`);
                parts.push(`Δ${s.delta! > 0 ? '+' : ''}${s.delta}${s.unit} (${s.percentChange! > 0 ? '+' : ''}${s.percentChange}%)`);
                parts.push(`flag: ${s.flag}`);
            }
            return parts.join(' | ');
        }).join('\n');

        const systemPrompt = `You are a concise health analyst for the Ones supplement platform. You receive pre-computed health signals (recent vs baseline) and write a brief, insightful narrative that connects the dots.

DATA TIER: ${tierLabels[tier]}

RULES:
- Write a "narrative" paragraph (3-5 sentences) that synthesizes ALL signals into one cohesive story. Connect related metrics — e.g., low sleep efficiency + low deep sleep → poor sleep quality → link to recovery. Reference actual numbers naturally within the narrative, don't just list them.
- Provide 2-3 short, specific action items (one line each). Reference actual numbers where relevant.
- Do NOT recommend supplements or products.
- If the tier is "snapshot", note that trends will become available with more data.
- Be encouraging but honest. Lead with strengths, then address concerns.
${formulaContext ? `- The user takes a custom Ones supplement with: ${formulaContext}. Write one sentence noting how their formula relates to the data (e.g., "Your Magnesium Glycinate may be contributing to your strong deep sleep numbers"). If there is no clear connection, write null for formulaNote.` : '- The user has no active formula. Set formulaNote to null.'}

Return ONLY valid JSON:
{
  "narrative": "string (3-5 sentence paragraph)",
  "actions": ["string", "string"],
  "formulaNote": "string or null"
}`;

        const userMessage = `Computed health signals:\n${signalBlock}`;

        try {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage },
                ],
                max_tokens: 512,
                temperature: 0.5,
                response_format: { type: 'json_object' },
            });

            const raw = completion.choices?.[0]?.message?.content;
            let narrative = 'Your health data has been analyzed.';
            let actions: string[] = [];
            let formulaNote: string | null = null;

            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    narrative = parsed.narrative || narrative;
                    actions = Array.isArray(parsed.actions) ? parsed.actions : [];
                    formulaNote = parsed.formulaNote || null;
                } catch (parseErr) {
                    logger.warn('Failed to parse weekly brief AI response:', parseErr);
                }
            }

            const result = {
                tier,
                daysOfData,
                narrative,
                actions,
                formulaNote,
                generatedAt: new Date().toISOString(),
            };

            this.weeklyBriefCache.set(cacheKey, { data: result, expiresAt: Date.now() + this.WEEKLY_BRIEF_TTL });
            return result;
        } catch (err) {
            logger.error('Weekly brief AI generation failed:', err);
            // Return fallback even if AI narrative fails
            return {
                tier,
                daysOfData,
                narrative: 'Your health signals have been computed — AI summary temporarily unavailable.',
                actions: [],
                formulaNote: null,
                generatedAt: new Date().toISOString(),
            };
        }
    }

    // ── AI-powered wearable data analysis ──────────────────────────
    private aiAnalysisCache = new Map<string, { data: any; expiresAt: number }>();
    private readonly AI_CACHE_TTL = 60 * 60 * 1000; // 1 hour

    async getAiAnalysis(userId: string, days: number = 30) {
        const cacheKey = `${userId}:${days}`;
        const cached = this.aiAnalysisCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.data;
        }

        // Fetch the same stats the frontend already uses
        const histResult = await this.getHistoricalData(userId, days);
        if (!histResult.success || !histResult.statistics) {
            return { insights: [], summary: null, error: 'No wearable data available' };
        }

        const stats = histResult.statistics;

        // Build a concise data block for the AI
        const dataBlock: Record<string, any> = {};

        if (stats.sleep) {
            dataBlock.sleep = {
                avgDurationHours: stats.sleep.avgDuration ? +(stats.sleep.avgDuration / 60).toFixed(1) : null,
                avgScore: stats.sleep.avgScore ?? null,
                avgHRV: stats.sleep.avgHRV ?? null,
                avgDeepSleepMin: stats.sleep.avgDeepSleep ?? null,
                avgRemSleepMin: stats.sleep.avgRemSleep ?? null,
                avgLightSleepMin: stats.sleep.avgLightSleep ?? null,
                avgEfficiencyPct: stats.sleep.avgEfficiency ?? null,
                avgRestingHR: stats.sleep.avgRestingHR ?? null,
            };
            // Strip nulls
            Object.keys(dataBlock.sleep).forEach(k => { if (dataBlock.sleep[k] == null) delete dataBlock.sleep[k]; });
            if (Object.keys(dataBlock.sleep).length === 0) delete dataBlock.sleep;
        }

        if (stats.activity) {
            dataBlock.activity = {
                avgSteps: stats.activity.avgSteps ?? null,
                avgActiveMinutes: stats.activity.avgActiveMinutes ?? null,
                avgCaloriesActive: stats.activity.avgCaloriesActive ?? null,
            };
            Object.keys(dataBlock.activity).forEach(k => { if (dataBlock.activity[k] == null) delete dataBlock.activity[k]; });
            if (Object.keys(dataBlock.activity).length === 0) delete dataBlock.activity;
        }

        if (stats.workouts) {
            dataBlock.workouts = {
                totalCount: stats.workouts.totalCount ?? null,
                avgPerWeek: stats.workouts.avgPerWeek ?? null,
                avgDurationMin: stats.workouts.avgDuration ?? null,
                mostCommonType: stats.workouts.mostCommonType ?? null,
            };
            Object.keys(dataBlock.workouts).forEach(k => { if (dataBlock.workouts[k] == null) delete dataBlock.workouts[k]; });
            if (Object.keys(dataBlock.workouts).length === 0) delete dataBlock.workouts;
        }

        if (stats.body) {
            dataBlock.body = {
                latestWeight: stats.body.latestWeight ?? null,
                latestBodyFat: stats.body.latestBodyFat ?? null,
                avgBloodOxygen: stats.body.avgBloodOxygen ?? null,
                avgHRV: stats.body.avgHRV ?? null,
                avgRestingHR: stats.body.avgRestingHR ?? null,
            };
            Object.keys(dataBlock.body).forEach(k => { if (dataBlock.body[k] == null) delete dataBlock.body[k]; });
            if (Object.keys(dataBlock.body).length === 0) delete dataBlock.body;
        }

        if (Object.keys(dataBlock).length === 0) {
            return { insights: [], summary: null, error: 'Insufficient data for analysis' };
        }

        const systemPrompt = `You are a health data analyst reviewing wearable device metrics. Provide concise, actionable insights based on the data provided.

RULES:
- Do NOT mention supplements, vitamins, or any product recommendations.
- Focus purely on data interpretation, lifestyle tips, and behavior changes.
- Be encouraging but honest. Highlight both strengths and areas to improve.
- Keep each insight to 2-3 sentences max.
- Use plain language a non-medical person can understand.

Return ONLY valid JSON with this structure:
{
  "summary": "One sentence overall assessment of the user's health data.",
  "insights": [
    {
      "category": "sleep" | "activity" | "recovery" | "body",
      "title": "Short title (3-6 words)",
      "body": "2-3 sentence insight with context and interpretation.",
      "tip": "One specific, actionable thing the user can do to improve.",
      "sentiment": "positive" | "neutral" | "attention"
    }
  ]
}

Generate 3-5 insights based on which data categories are available. Only create insights for categories that have data. Use "attention" sentiment sparingly — only when a metric is clearly suboptimal.`;

        const userMessage = `Here is the user's wearable health data averaged over the last ${days} days:\n\n${JSON.stringify(dataBlock, null, 2)}`;

        try {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage },
                ],
                max_tokens: 1024,
                temperature: 0.6,
                response_format: { type: 'json_object' },
            });

            const raw = completion.choices?.[0]?.message?.content;
            if (!raw) {
                logger.warn('AI analysis returned empty response');
                return { insights: [], summary: null, error: 'AI returned empty response' };
            }

            const parsed = JSON.parse(raw);
            const result = {
                summary: parsed.summary || null,
                insights: Array.isArray(parsed.insights) ? parsed.insights : [],
                daysAnalyzed: days,
                generatedAt: new Date().toISOString(),
            };

            // Cache the result
            this.aiAnalysisCache.set(cacheKey, { data: result, expiresAt: Date.now() + this.AI_CACHE_TTL });

            return result;
        } catch (err) {
            logger.error('AI wearable analysis failed:', err);
            return { insights: [], summary: null, error: 'Failed to generate analysis' };
        }
    }

    private calculateTrend(values: number[]): 'improving' | 'declining' | 'stable' {
        if (values.length < 3) return 'stable';
        const recent = values.slice(-Math.min(7, Math.floor(values.length / 2)));
        const earlier = values.slice(0, Math.min(7, Math.floor(values.length / 2)));
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
        const change = (recentAvg - earlierAvg) / earlierAvg;
        if (change > 0.05) return 'improving';
        if (change < -0.05) return 'declining';
        return 'stable';
    }

    private getMostCommonWorkoutType(workouts: any[]): string | null {
        const typeCounts: Record<string, number> = {};
        workouts.forEach(w => {
            if (w.type) {
                typeCounts[w.type] = (typeCounts[w.type] || 0) + 1;
            }
        });

        let maxCount = 0;
        let mostCommon = null;
        for (const [type, count] of Object.entries(typeCounts)) {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = type;
            }
        }
        return mostCommon;
    }

    // ── Health Pulse Intelligence Engine ─────────────────────────────────
    // Deterministic signal detection + AI narrative generation
    // Cached for 1 hour per user

    private pulseIntelligenceCache = new Map<string, { data: any; expiresAt: number }>();
    private readonly PULSE_INTEL_TTL = 60 * 60 * 1000; // 1 hour

    async getHealthPulseIntelligence(userId: string) {
        // Check cache
        const cached = this.pulseIntelligenceCache.get(userId);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.data;
        }

        try {
            const result = await this._computePulseIntelligence(userId);
            this.pulseIntelligenceCache.set(userId, { data: result, expiresAt: Date.now() + this.PULSE_INTEL_TTL });
            return result;
        } catch (err) {
            logger.error('Health Pulse Intelligence error:', err);
            return this._fallbackPulseIntelligence();
        }
    }

    private async _computePulseIntelligence(userId: string) {
        const junctionUserId = await wearablesRepository.getJunctionUserId(userId);

        // Fetch 7 days wearable, lab data, and user profile in parallel
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const [sleepData, activityData, bodyData, labReports, healthProfile, providers] = await Promise.all([
            junctionUserId ? getSleepData(junctionUserId, startDate, endDate).catch(() => []) : Promise.resolve([]),
            junctionUserId ? getActivityData(junctionUserId, startDate, endDate).catch(() => []) : Promise.resolve([]),
            junctionUserId ? getBodyData(junctionUserId, startDate, endDate).catch(() => []) : Promise.resolve([]),
            filesRepository.getLabReportsByUser(userId).catch(() => []),
            usersRepository.getHealthProfile(userId).catch(() => null),
            junctionUserId ? getConnectedProviders(junctionUserId).catch(() => []) : Promise.resolve([]),
        ]);

        const connectedProviders = (providers as any[])
            .filter((p: any) => this.isProviderConnected(p))
            .map((p: any) => this.getProviderDisplayName(p));
        const hasWearable = connectedProviders.length > 0;

        // ── Step 1: Compute wearable deltas ──
        const wearableSignals = this._computeWearableSignals(sleepData as any[], activityData as any[], bodyData as any[]);

        // ── Step 2: Compute lab flags ──
        const labSignals = this._computeLabSignals(labReports as any[]);

        // ── Step 3: Apply deterministic rules → classify state + drivers ──
        const { state, stateLabel, drivers } = this._classifyHealthState(wearableSignals, labSignals);

        // Get user goals for context
        const userGoals = (healthProfile as any)?.healthGoals || [];
        const primaryGoal = userGoals[0] || 'overall health';

        // ── Step 4: Generate AI narrative ──
        const narrative = await this._generatePulseNarrative(state, stateLabel, drivers, labSignals.labFlags, primaryGoal);

        return {
            state,
            stateLabel,
            stateColor: this._stateColor(state),
            headline: narrative.headline,
            summary: narrative.summary,
            drivers: drivers.slice(0, 4),
            actions: narrative.actions.slice(0, 3),
            hasWearable,
            hasLabs: labSignals.hasLabs,
            providers: connectedProviders,
            lastUpdated: new Date().toISOString(),
        };
    }

    private _computeWearableSignals(sleepData: any[], activityData: any[], bodyData: any[]): WearableSignals {
        const signals: WearableSignals = {
            hrvValues: [],
            rhrValues: [],
            sleepMinutes: [],
            sleepConsistency: null,
            tempDeviation: null,
            hrvDeltaPct: null,
            rhrDeltaBpm: null,
            sleepDeltaMin: null,
        };

        if (!sleepData.length && !activityData.length) return signals;

        // Extract daily values
        for (const s of sleepData) {
            // HRV
            const hrv = s.averageHrv || s.average_hrv || s.hrv?.avgHrv || null;
            if (hrv != null) signals.hrvValues.push(hrv);

            // Sleep duration
            let sleepMin: number | null = null;
            if (s.duration_total_seconds) sleepMin = Math.round(s.duration_total_seconds / 60);
            else if (s.total != null) sleepMin = Math.round(s.total / 60);
            else if (s.duration != null) sleepMin = Math.round(s.duration / 60);
            if (sleepMin != null) signals.sleepMinutes.push(sleepMin);
        }

        // RHR from body data or activity
        for (const b of bodyData) {
            const rhr = b.resting_heart_rate || b.restingHeartRate || null;
            if (rhr != null) signals.rhrValues.push(rhr);
        }
        // Fallback: check activity data for RHR
        if (signals.rhrValues.length === 0) {
            for (const a of activityData) {
                const rhr = a.resting_heart_rate || a.restingHeartRate || null;
                if (rhr != null) signals.rhrValues.push(rhr);
            }
        }

        // Temp deviation from body data
        for (const b of bodyData) {
            const temp = b.skin_temperature_celsius || b.skinTempCelsius || b.temperatureDeviation || null;
            if (temp != null) {
                signals.tempDeviation = temp;
                break; // most recent
            }
        }

        // Compute deltas: latest vs baseline (baseline = average of all except latest)
        if (signals.hrvValues.length >= 2) {
            const latest = signals.hrvValues[signals.hrvValues.length - 1];
            const baseline = signals.hrvValues.slice(0, -1).reduce((a, b) => a + b, 0) / (signals.hrvValues.length - 1);
            signals.hrvDeltaPct = baseline > 0 ? Math.round(((latest - baseline) / baseline) * 100) : null;
        }

        if (signals.rhrValues.length >= 2) {
            const latest = signals.rhrValues[signals.rhrValues.length - 1];
            const baseline = Math.round(signals.rhrValues.slice(0, -1).reduce((a, b) => a + b, 0) / (signals.rhrValues.length - 1));
            signals.rhrDeltaBpm = latest - baseline;
        }

        if (signals.sleepMinutes.length >= 2) {
            const latest = signals.sleepMinutes[signals.sleepMinutes.length - 1];
            const baseline = Math.round(signals.sleepMinutes.slice(0, -1).reduce((a, b) => a + b, 0) / (signals.sleepMinutes.length - 1));
            signals.sleepDeltaMin = latest - baseline;
        }

        // Sleep consistency: std deviation of bedtime (approximated from sleep duration variance)
        if (signals.sleepMinutes.length >= 3) {
            const mean = signals.sleepMinutes.reduce((a, b) => a + b, 0) / signals.sleepMinutes.length;
            const variance = signals.sleepMinutes.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / signals.sleepMinutes.length;
            signals.sleepConsistency = Math.round(Math.sqrt(variance)); // std dev in minutes
        }

        return signals;
    }

    private _computeLabSignals(labReports: any[]): LabSignals {
        const result: LabSignals = { hasLabs: false, labFlags: [], markerTrends: [] };

        const extractData = (report: any): any[] => {
            const raw = report?.labReportData?.extractedData;
            if (Array.isArray(raw) && raw.length > 0) return raw;
            return [];
        };

        const reportsWithData = labReports
            .filter((r: any) => extractData(r).length > 0 && r?.labReportData?.analysisStatus === 'completed')
            .sort((a: any, b: any) => new Date(b?.uploadedAt || 0).getTime() - new Date(a?.uploadedAt || 0).getTime());

        if (reportsWithData.length === 0) return result;
        result.hasLabs = true;

        const latestMarkers = extractData(reportsWithData[0]);
        const previousMarkers = reportsWithData.length > 1 ? extractData(reportsWithData[1]) : [];

        // Find out-of-range markers
        for (const m of latestMarkers) {
            const status = this.normalizeLabStatus(m.status);
            if (status !== 'normal') {
                const name = m.testName || m.name || 'Unknown';
                result.labFlags.push({
                    name,
                    status,
                    value: String(m.value ?? ''),
                    unit: m.unit || '',
                    referenceRange: m.referenceRange || '',
                });
            }
        }

        // Compute trends vs previous report
        if (previousMarkers.length > 0) {
            const prevMap = new Map<string, any>();
            for (const m of previousMarkers) {
                const key = (m.testName || m.name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
                if (key) prevMap.set(key, m);
            }

            for (const m of latestMarkers) {
                const key = (m.testName || m.name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
                const prev = prevMap.get(key);
                if (!prev) continue;

                const curVal = this._parseNumeric(m.value);
                const prevVal = this._parseNumeric(prev.value);
                if (curVal == null || prevVal == null || prevVal === 0) continue;

                const pctChange = ((curVal - prevVal) / Math.abs(prevVal)) * 100;
                if (Math.abs(pctChange) >= 10) {
                    result.markerTrends.push({
                        name: m.testName || m.name,
                        direction: pctChange > 0 ? 'up' : 'down',
                        pctChange: Math.round(pctChange),
                    });
                }
            }
        }

        return result;
    }

    private _parseNumeric(value: unknown): number | null {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        const raw = String(value ?? '').replace(/,/g, '');
        const match = raw.match(/-?\d+(\.\d+)?/);
        return match ? Number(match[0]) : null;
    }

    private _classifyHealthState(
        wearable: WearableSignals,
        lab: LabSignals,
    ): { state: PulseState; stateLabel: string; drivers: PulseDriver[] } {
        const drivers: PulseDriver[] = [];

        // ── Wearable-based drivers ──
        const hrvDown = wearable.hrvDeltaPct != null && wearable.hrvDeltaPct <= -12;
        const rhrUp = wearable.rhrDeltaBpm != null && wearable.rhrDeltaBpm >= 5;
        const sleepIrregular = wearable.sleepConsistency != null && wearable.sleepConsistency >= 40;
        const sleepShort = wearable.sleepMinutes.length > 0 && wearable.sleepMinutes[wearable.sleepMinutes.length - 1] < 360; // <6h

        if (wearable.hrvDeltaPct != null && Math.abs(wearable.hrvDeltaPct) >= 5) {
            const direction = wearable.hrvDeltaPct < 0 ? 'down' : 'up';
            drivers.push({
                signal: `HRV ${direction === 'down' ? '↓' : '↑'} ${Math.abs(wearable.hrvDeltaPct)}% vs baseline`,
                type: 'wearable',
                severity: hrvDown ? 'warning' : direction === 'up' ? 'positive' : 'neutral',
                category: 'recovery',
            });
        }

        if (wearable.rhrDeltaBpm != null && Math.abs(wearable.rhrDeltaBpm) >= 3) {
            const direction = wearable.rhrDeltaBpm > 0 ? 'up' : 'down';
            drivers.push({
                signal: `Resting HR ${direction === 'up' ? '↑' : '↓'} ${Math.abs(wearable.rhrDeltaBpm)} bpm`,
                type: 'wearable',
                severity: rhrUp ? 'warning' : direction === 'down' ? 'positive' : 'neutral',
                category: 'recovery',
            });
        }

        if (wearable.sleepConsistency != null) {
            if (sleepIrregular) {
                drivers.push({
                    signal: `Sleep timing variance ↑ ${wearable.sleepConsistency} min`,
                    type: 'wearable',
                    severity: 'warning',
                    category: 'sleep',
                });
            }
        }

        if (sleepShort) {
            const lastSleep = wearable.sleepMinutes[wearable.sleepMinutes.length - 1];
            const hours = Math.floor(lastSleep / 60);
            const mins = lastSleep % 60;
            drivers.push({
                signal: `Last night: ${hours}h ${mins}m sleep`,
                type: 'wearable',
                severity: 'warning',
                category: 'sleep',
            });
        }

        // ── Lab-based drivers ──
        const criticalLabs = lab.labFlags.filter(f => f.status === 'critical');
        const abnormalLabs = lab.labFlags.filter(f => f.status === 'high' || f.status === 'low');

        if (criticalLabs.length > 0) {
            for (const flag of criticalLabs.slice(0, 2)) {
                drivers.push({
                    signal: `${flag.name}: ${flag.value} ${flag.unit} (critical)`,
                    type: 'lab',
                    severity: 'critical',
                    category: 'labs',
                });
            }
        }

        if (abnormalLabs.length > 0) {
            // Group by common deficiencies/concerns
            const vitD = abnormalLabs.find(f => /vitamin\s*d|25-hydroxy/i.test(f.name));
            const iron = abnormalLabs.find(f => /ferritin|iron/i.test(f.name));
            const b12 = abnormalLabs.find(f => /b-?12|cobalamin/i.test(f.name));
            const lipid = abnormalLabs.find(f => /cholesterol|ldl|triglyc/i.test(f.name));

            // Add specific flags for key markers
            if (vitD) {
                drivers.push({
                    signal: `Vitamin D ${vitD.status === 'low' ? 'insufficient' : vitD.status}: ${vitD.value} ${vitD.unit}`,
                    type: 'lab',
                    severity: 'warning',
                    category: 'labs',
                });
            }
            if (iron) {
                drivers.push({
                    signal: `${iron.name} ${iron.status}: ${iron.value} ${iron.unit}`,
                    type: 'lab',
                    severity: 'warning',
                    category: 'labs',
                });
            }
            if (b12) {
                drivers.push({
                    signal: `B12 ${b12.status}: ${b12.value} ${b12.unit}`,
                    type: 'lab',
                    severity: 'warning',
                    category: 'labs',
                });
            }
            if (lipid) {
                drivers.push({
                    signal: `${lipid.name} ${lipid.status}: ${lipid.value} ${lipid.unit}`,
                    type: 'lab',
                    severity: 'warning',
                    category: 'labs',
                });
            }

            // If there are other abnormal labs not yet added
            const addedNames = new Set([vitD, iron, b12, lipid].filter(Boolean).map(f => f!.name));
            const remaining = abnormalLabs.filter(f => !addedNames.has(f.name));
            if (remaining.length > 0 && drivers.filter(d => d.type === 'lab').length < 3) {
                drivers.push({
                    signal: `${remaining.length} additional marker${remaining.length > 1 ? 's' : ''} outside optimal range`,
                    type: 'lab',
                    severity: 'neutral',
                    category: 'labs',
                });
            }
        }

        // ── Classify overall state ──
        let state: PulseState = 'optimal';
        let stateLabel = 'Performing';

        if (criticalLabs.length > 0) {
            state = 'attention';
            stateLabel = 'Needs Attention';
        } else if (hrvDown && rhrUp) {
            state = 'under_recovery';
            stateLabel = 'Recovering';
        } else if (sleepIrregular && (hrvDown || sleepShort)) {
            state = 'circadian_stress';
            stateLabel = 'Circadian Stress';
        } else if (abnormalLabs.length >= 3) {
            state = 'attention';
            stateLabel = 'Needs Attention';
        } else if (hrvDown || rhrUp || sleepShort || abnormalLabs.length > 0) {
            state = 'adapting';
            stateLabel = 'Adapting';
        } else if (drivers.some(d => d.severity === 'positive')) {
            state = 'optimal';
            stateLabel = 'Performing';
        }

        // No data at all
        if (drivers.length === 0) {
            state = 'baseline';
            stateLabel = 'Baseline';
        }

        // Sort: critical first, then warning, then neutral, then positive
        const severityOrder: Record<string, number> = { critical: 0, warning: 1, neutral: 2, positive: 3 };
        drivers.sort((a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2));

        return { state, stateLabel, drivers };
    }

    private _stateColor(state: PulseState): string {
        switch (state) {
            case 'optimal': return 'emerald';
            case 'adapting': return 'amber';
            case 'under_recovery': return 'amber';
            case 'circadian_stress': return 'orange';
            case 'attention': return 'red';
            case 'baseline': return 'slate';
            default: return 'slate';
        }
    }

    private async _generatePulseNarrative(
        state: PulseState,
        stateLabel: string,
        drivers: PulseDriver[],
        labFlags: LabFlag[],
        primaryGoal: string,
    ): Promise<{ headline: string; summary: string; actions: string[] }> {
        // Fallback for no data
        if (drivers.length === 0) {
            return {
                headline: 'Connect data sources to unlock your Health Pulse',
                summary: 'Link a wearable device or upload lab results to see personalized health intelligence.',
                actions: [
                    'Connect a wearable from the Devices page',
                    'Upload your latest blood work from the Labs page',
                    'Complete your health profile for personalized insights',
                ],
            };
        }

        const structuredInput = {
            state,
            stateLabel,
            drivers: drivers.slice(0, 4).map(d => d.signal),
            labFlags: labFlags.slice(0, 4).map(f => `${f.name}: ${f.value} ${f.unit} (${f.status})`),
            primaryGoal,
        };

        try {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a concise health intelligence system. Given structured health signals, generate a short narrative.

RULES:
- Headline: Max 8 words. No scores. No numbers in headline.
- Summary: 1 sentence, max 25 words. What the signals mean together.
- Actions: Exactly 3 specific, actionable steps. Max 12 words each. No supplements.
- Tone: Premium, calm, confident. Like a private health advisor.
- Never say "consult a doctor" as an action — these are lifestyle optimizations.
- Match the user's primary goal when choosing actions.

Return JSON: { "headline": "...", "summary": "...", "actions": ["...", "...", "..."] }`
                    },
                    {
                        role: 'user',
                        content: JSON.stringify(structuredInput),
                    },
                ],
                max_tokens: 256,
                temperature: 0.6,
                response_format: { type: 'json_object' },
            });

            const raw = completion.choices?.[0]?.message?.content;
            if (raw) {
                const parsed = JSON.parse(raw);
                return {
                    headline: parsed.headline || `Health Pulse: ${stateLabel}`,
                    summary: parsed.summary || 'Your health signals are being analyzed.',
                    actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 3) : [],
                };
            }
        } catch (err) {
            logger.warn('Pulse narrative AI fallback:', err);
        }

        // Deterministic fallback
        return this._deterministicNarrative(state, stateLabel, drivers);
    }

    private _deterministicNarrative(
        state: PulseState,
        stateLabel: string,
        drivers: PulseDriver[],
    ): { headline: string; summary: string; actions: string[] } {
        const headlines: Record<PulseState, string> = {
            optimal: 'Your body is responding well',
            adapting: 'Your system is adjusting',
            under_recovery: 'Recovery signals trending lower',
            circadian_stress: 'Your rhythm needs attention',
            attention: 'Key markers need your focus',
            baseline: 'Getting to know your biology',
        };

        const summaries: Record<PulseState, string> = {
            optimal: 'Recovery and lab markers are trending in the right direction.',
            adapting: 'Some signals are shifting — worth monitoring over the next few days.',
            under_recovery: 'Your recovery signals suggest your system is under mild strain.',
            circadian_stress: 'Sleep irregularity and recovery drops suggest circadian disruption.',
            attention: 'Several markers are outside optimal range and worth reviewing.',
            baseline: 'Connect a wearable or upload labs to see personalized intelligence.',
        };

        const defaultActions: Record<PulseState, string[]> = {
            optimal: ['Maintain your current sleep and activity routine', 'Continue monitoring trends weekly', 'Review your formula alignment next month'],
            adapting: ['Keep bedtime within ±30 minutes', 'Prioritize 7+ hours of sleep tonight', 'Monitor again in 3 days'],
            under_recovery: ['Reduce high-intensity sessions for 3 days', 'Add 30 min of quiet downtime before bed', 'Focus on hydration and nutrient-dense meals'],
            circadian_stress: ['Set a consistent wake time 7 days a week', 'Avoid screens 60 min before bed', 'Get morning sunlight within 30 min of waking'],
            attention: ['Review flagged markers on the Labs page', 'Discuss results with your practitioner', 'Retest in 8-12 weeks to track progress'],
            baseline: ['Connect a wearable from the Devices page', 'Upload your latest blood work', 'Complete your health profile'],
        };

        return {
            headline: headlines[state] || `Health Pulse: ${stateLabel}`,
            summary: summaries[state] || 'Analyzing your health signals.',
            actions: defaultActions[state] || [],
        };
    }

    private _fallbackPulseIntelligence() {
        return {
            state: 'baseline' as PulseState,
            stateLabel: 'Baseline',
            stateColor: 'slate',
            headline: 'Getting to know your biology',
            summary: 'Connect a wearable or upload labs to unlock your Health Pulse.',
            drivers: [],
            actions: ['Connect a wearable from the Devices page', 'Upload your latest blood work', 'Complete your health profile'],
            hasWearable: false,
            hasLabs: false,
            providers: [],
            lastUpdated: new Date().toISOString(),
        };
    }
}

// ── Types for Health Pulse Intelligence ──
type PulseState = 'optimal' | 'adapting' | 'under_recovery' | 'circadian_stress' | 'attention' | 'baseline';

interface PulseDriver {
    signal: string;
    type: 'wearable' | 'lab';
    severity: 'critical' | 'warning' | 'neutral' | 'positive';
    category: string;
}

interface WearableSignals {
    hrvValues: number[];
    rhrValues: number[];
    sleepMinutes: number[];
    sleepConsistency: number | null;
    tempDeviation: number | null;
    hrvDeltaPct: number | null;
    rhrDeltaBpm: number | null;
    sleepDeltaMin: number | null;
}

interface LabFlag {
    name: string;
    status: 'high' | 'low' | 'critical';
    value: string;
    unit: string;
    referenceRange: string;
}

interface LabSignals {
    hasLabs: boolean;
    labFlags: LabFlag[];
    markerTrends: Array<{ name: string; direction: 'up' | 'down'; pctChange: number }>;
}

export const wearablesService = new WearablesService();
