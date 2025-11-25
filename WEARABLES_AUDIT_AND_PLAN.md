# Wearables Integration Audit & Implementation Plan

## Current State Analysis

### ✅ What's Working

#### 1. **Oura Ring - FULLY FUNCTIONAL**
- **OAuth Flow:** Complete (`/api/wearables/connect/oura` + `/api/wearables/callback/oura`)
- **Token Management:** Auto-refresh every hour via `tokenRefreshScheduler.ts`
- **Data Sync:** Daily cron job fetches sleep, activity, readiness data (`wearableDataSync.ts`)
- **Data Storage:** Writes to `biometric_data` table with full normalization
- **API Endpoints:**
  - Sleep: `https://api.ouraring.com/v2/usercollection/daily_sleep`
  - Activity: `https://api.ouraring.com/v2/usercollection/daily_activity`
  - Readiness: `https://api.ouraring.com/v2/usercollection/daily_readiness`

**Normalization Logic:**
```typescript
// Oura API returns seconds → converted to minutes
deepSleepMinutes: Math.round(sleep.deep_sleep_duration / 60)
remSleepMinutes: Math.round(sleep.rem_sleep_duration / 60)
lightSleepMinutes: Math.round(sleep.light_sleep_duration / 60)
sleepHours: Math.round(sleep.total_sleep_duration / 60) // total minutes
```

#### 2. **Fitbit - PARTIALLY FUNCTIONAL** ⚠️
- **OAuth Flow:** Complete ✅
- **Token Management:** Auto-refresh implemented ✅
- **Data Sync:** ❌ **NOT IMPLEMENTED**
- **Status:** Users can connect, but no data is being fetched

#### 3. **WHOOP - PARTIALLY FUNCTIONAL** ⚠️
- **OAuth Flow:** Complete ✅
- **Token Management:** Auto-refresh implemented ✅
- **Data Sync:** ❌ **NOT IMPLEMENTED**
- **Status:** Users can connect, but no data is being fetched

---

## Missing Components

### 1. Fitbit Data Sync Implementation

**API Endpoints Needed:**
```typescript
// Sleep
GET https://api.fitbit.com/1.2/user/-/sleep/date/{date}.json

// Activity
GET https://api.fitbit.com/1/user/-/activities/date/{date}.json

// Heart Rate
GET https://api.fitbit.com/1/user/-/activities/heart/date/{date}/1d.json
```

**Expected Response Format:**
```json
{
  "sleep": [{
    "levels": {
      "summary": {
        "deep": { "minutes": 120 },      // ⚠️ Different from Oura (minutes vs seconds)
        "rem": { "minutes": 90 },
        "light": { "minutes": 180 }
      }
    },
    "efficiency": 85,
    "minutesAsleep": 390
  }]
}
```

**Normalization Challenge:**
- Fitbit uses **minutes** (not seconds like Oura)
- Field names differ: `minutesAsleep` vs `total_sleep_duration`
- Sleep efficiency is percentage (0-100), not a score

### 2. WHOOP Data Sync Implementation

**API Endpoints Needed:**
```typescript
// Sleep
GET https://api.prod.whoop.com/developer/v1/activity/sleep/{sleep_id}

// Recovery
GET https://api.prod.whoop.com/developer/v1/recovery/{recovery_id}

// Workout
GET https://api.prod.whoop.com/developer/v1/activity/workout/{workout_id}
```

**Expected Response Format:**
```json
{
  "score": {
    "stage_summary": {
      "total_in_bed_time_milli": 28800000,  // ⚠️ Milliseconds!
      "total_awake_time_milli": 3600000,
      "total_light_sleep_time_milli": 10800000,
      "total_slow_wave_sleep_time_milli": 7200000,
      "total_rem_sleep_time_milli": 5400000
    },
    "sleep_performance_percentage": 85,
    "respiratory_rate": 16.5
  }
}
```

**Normalization Challenge:**
- WHOOP uses **milliseconds** (neither seconds nor minutes!)
- Field names are verbose: `total_slow_wave_sleep_time_milli` vs `deep_sleep_duration`
- Unique metrics: `strain`, `recovery_score` (0-100), `respiratory_rate`

### 3. Apple Health & Garmin (Not Started)

**Apple Health:**
- ❌ No web API - requires native iOS app with HealthKit SDK
- **Workaround Options:**
  1. Build iOS companion app (uses HealthKit)
  2. Use third-party bridge (Vital/Rook provide mobile SDKs)

**Garmin:**
- ✅ Has OAuth web API (similar to Fitbit/Oura)
- ❌ Not implemented yet
- **API:** Garmin Health API (`https://healthapi.garmin.com/`)

---

## Database Schema Review

### Current `biometric_data` Table (from `shared/schema.ts`)

```typescript
export const biometricData = pgTable("biometric_data", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  connectionId: varchar("connection_id").references(() => wearableConnections.id),
  provider: wearableProviderEnum("provider"), // 'fitbit' | 'oura' | 'whoop'
  dataDate: timestamp("data_date"), // The day this data represents
  
  // Sleep metrics (ALL STORED IN MINUTES except sleepScore)
  sleepScore: integer("sleep_score"), // 0-100
  sleepHours: integer("sleep_hours"), // Total sleep in MINUTES ⚠️ Misnamed!
  deepSleepMinutes: integer("deep_sleep_minutes"),
  remSleepMinutes: integer("rem_sleep_minutes"),
  lightSleepMinutes: integer("light_sleep_minutes"),
  
  // Heart metrics
  hrvMs: integer("hrv_ms"), // Milliseconds
  restingHeartRate: integer("resting_heart_rate"), // BPM
  averageHeartRate: integer("average_heart_rate"),
  maxHeartRate: integer("max_heart_rate"),
  
  // Recovery and readiness
  recoveryScore: integer("recovery_score"), // 0-100 (WHOOP, Oura)
  readinessScore: integer("readiness_score"), // 0-100 (Oura)
  strainScore: integer("strain_score"), // 0-21 (WHOOP)
  
  // Activity metrics
  steps: integer("steps"),
  caloriesBurned: integer("calories_burned"),
  activeMinutes: integer("active_minutes"),
  
  // Additional metrics
  spo2Percentage: integer("spo2_percentage"), // Blood oxygen 0-100
  skinTempCelsius: integer("skin_temp_celsius"), // Multiplied by 10 for decimal precision
  respiratoryRate: integer("respiratory_rate"), // Breaths per minute
  
  // Raw data from provider (for reference)
  rawData: json("raw_data"),
  
  syncedAt: timestamp("synced_at").defaultNow(),
});
```

**✅ Schema is Well-Designed:**
- Already supports all 3 providers
- Has all necessary fields for normalization
- `rawData` JSON column preserves original API responses

**⚠️ Potential Issue:**
- `sleepHours` field name is misleading (stores **minutes**, not hours)
- Consider renaming to `sleepTotalMinutes` in future migration

---

## Normalization Strategy

### The Core Problem

Each platform returns data in different formats:

| Metric | Oura | Fitbit | WHOOP |
|--------|------|--------|-------|
| Deep Sleep | `deep_sleep_duration` (seconds) | `deep.minutes` (minutes) | `total_slow_wave_sleep_time_milli` (milliseconds) |
| Total Sleep | `total_sleep_duration` (seconds) | `minutesAsleep` (minutes) | `total_in_bed_time_milli` (milliseconds) |
| Sleep Score | `score` (0-100) | `efficiency` (0-100) | `sleep_performance_percentage` (0-100) |
| HRV | `average_hrv` (ms) | Not in daily summary | `hrv_rmssd_milli` (milliseconds) |
| Strain | N/A | N/A | `strain` (0-21 scale) |

### Proposed Normalization Layer

**Create: `server/wearableDataNormalizer.ts`**

```typescript
interface NormalizedBiometricData {
  sleepScore: number | null;        // 0-100 (universal)
  sleepTotalMinutes: number | null; // Always minutes
  deepSleepMinutes: number | null;  // Always minutes
  remSleepMinutes: number | null;   // Always minutes
  lightSleepMinutes: number | null; // Always minutes
  hrvMs: number | null;              // Always milliseconds
  restingHeartRate: number | null;   // BPM
  recoveryScore: number | null;      // 0-100 (WHOOP/Oura)
  strainScore: number | null;        // 0-21 (WHOOP only)
  steps: number | null;
  caloriesBurned: number | null;
  activeMinutes: number | null;
  respiratoryRate: number | null;    // Breaths per minute
  skinTempCelsius: number | null;    // Degrees (×10 for storage)
}

// Convert Oura data to normalized format
function normalizeOuraData(sleep: OuraSleepData, activity: OuraActivityData, readiness: OuraReadinessData): NormalizedBiometricData {
  return {
    sleepScore: sleep.score || null,
    sleepTotalMinutes: sleep.total_sleep_duration ? Math.round(sleep.total_sleep_duration / 60) : null,
    deepSleepMinutes: sleep.deep_sleep_duration ? Math.round(sleep.deep_sleep_duration / 60) : null,
    remSleepMinutes: sleep.rem_sleep_duration ? Math.round(sleep.rem_sleep_duration / 60) : null,
    lightSleepMinutes: sleep.light_sleep_duration ? Math.round(sleep.light_sleep_duration / 60) : null,
    hrvMs: sleep.average_hrv || null,
    restingHeartRate: sleep.lowest_heart_rate || null,
    recoveryScore: readiness?.score || null,
    strainScore: null, // Oura doesn't have strain
    steps: activity?.steps || null,
    caloriesBurned: activity?.total_calories || null,
    activeMinutes: activity?.high_activity_time ? Math.round(activity.high_activity_time / 60) : null,
    respiratoryRate: null, // Not in daily summaries
    skinTempCelsius: readiness?.temperature_deviation ? Math.round(readiness.temperature_deviation * 10) : null,
  };
}

// Convert Fitbit data to normalized format
function normalizeFitbitData(sleep: FitbitSleepData, activity: FitbitActivityData, heartRate: FitbitHeartRateData): NormalizedBiometricData {
  return {
    sleepScore: sleep.efficiency || null,
    sleepTotalMinutes: sleep.minutesAsleep || null, // Already in minutes!
    deepSleepMinutes: sleep.levels?.summary?.deep?.minutes || null,
    remSleepMinutes: sleep.levels?.summary?.rem?.minutes || null,
    lightSleepMinutes: sleep.levels?.summary?.light?.minutes || null,
    hrvMs: heartRate?.value?.hrv || null, // Need to fetch HRV separately
    restingHeartRate: heartRate?.value?.restingHeartRate || null,
    recoveryScore: null, // Fitbit doesn't have recovery score
    strainScore: null,
    steps: activity?.summary?.steps || null,
    caloriesBurned: activity?.summary?.caloriesOut || null,
    activeMinutes: activity?.summary?.veryActiveMinutes + activity?.summary?.fairlyActiveMinutes || null,
    respiratoryRate: null,
    skinTempCelsius: null, // Fitbit doesn't track skin temp
  };
}

// Convert WHOOP data to normalized format
function normalizeWhoopData(sleep: WhoopSleepData, recovery: WhoopRecoveryData, workout: WhoopWorkoutData): NormalizedBiometricData {
  return {
    sleepScore: sleep.score?.sleep_performance_percentage || null,
    sleepTotalMinutes: sleep.score?.stage_summary?.total_in_bed_time_milli ? Math.round(sleep.score.stage_summary.total_in_bed_time_milli / 60000) : null,
    deepSleepMinutes: sleep.score?.stage_summary?.total_slow_wave_sleep_time_milli ? Math.round(sleep.score.stage_summary.total_slow_wave_sleep_time_milli / 60000) : null,
    remSleepMinutes: sleep.score?.stage_summary?.total_rem_sleep_time_milli ? Math.round(sleep.score.stage_summary.total_rem_sleep_time_milli / 60000) : null,
    lightSleepMinutes: sleep.score?.stage_summary?.total_light_sleep_time_milli ? Math.round(sleep.score.stage_summary.total_light_sleep_time_milli / 60000) : null,
    hrvMs: recovery?.score?.hrv_rmssd_milli || null,
    restingHeartRate: recovery?.score?.resting_heart_rate || null,
    recoveryScore: recovery?.score?.recovery_score || null,
    strainScore: workout?.score?.strain || null, // 0-21 scale
    steps: null, // WHOOP doesn't track steps
    caloriesBurned: workout?.score?.kilojoule ? Math.round(workout.score.kilojoule * 0.239) : null, // Convert kJ to kcal
    activeMinutes: null, // Calculate from workout duration?
    respiratoryRate: sleep.score?.respiratory_rate || null,
    skinTempCelsius: null,
  };
}
```

---

## Implementation Plan

### Phase 1: Complete Fitbit Integration (Estimated: 4-6 hours)

**1.1. Create Fitbit Data Sync Service**
- File: `server/wearableDataSync.ts`
- Add `syncFitbitData()` function
- Fetch sleep, activity, heart rate data
- Use normalization layer

**1.2. Update Scheduler**
- File: `server/wearableDataScheduler.ts`
- Add Fitbit to daily sync cron job
- Currently only syncs Oura

**1.3. Test End-to-End**
- Connect Fitbit device
- Verify data appears in `biometric_data` table
- Check AI prompt builder receives data

### Phase 2: Complete WHOOP Integration (Estimated: 4-6 hours)

**2.1. Create WHOOP Data Sync Service**
- File: `server/wearableDataSync.ts`
- Add `syncWhoopData()` function
- Handle millisecond conversions
- Map strain score (unique to WHOOP)

**2.2. Update Scheduler**
- Add WHOOP to daily sync cron job

**2.3. Test End-to-End**
- Connect WHOOP device
- Verify strain data is captured
- Test recovery score display

### Phase 3: Add Garmin Support (Estimated: 6-8 hours)

**3.1. Implement OAuth Flow**
- Register app at Garmin Developer Portal
- Add OAuth routes to `server/routes.ts`
- Add to `.env`: `GARMIN_CLIENT_ID`, `GARMIN_CLIENT_SECRET`

**3.2. Create Garmin Data Sync**
- Use Garmin Health API
- Normalize data format (similar to Fitbit structure)

**3.3. Update Schema**
- Add `'garmin'` to `wearableProviderEnum` in `shared/schema.ts`

### Phase 4: Centralize Normalization (Estimated: 2-3 hours)

**4.1. Create Normalizer Module**
- File: `server/wearableDataNormalizer.ts`
- Extract normalization logic from `wearableDataSync.ts`
- Single source of truth for unit conversions

**4.2. Refactor Existing Code**
- Update Oura sync to use normalizer
- Update Fitbit sync to use normalizer
- Update WHOOP sync to use normalizer

**4.3. Add Unit Tests**
- Test Oura seconds → minutes conversion
- Test Fitbit minutes (no conversion)
- Test WHOOP milliseconds → minutes conversion

### Phase 5: Apple Health Strategy (Future)

**Option A: Build iOS Companion App**
- Use HealthKit SDK
- Upload data to ONES backend
- **Effort:** 40+ hours (requires Swift/iOS development)

**Option B: Use Third-Party Bridge**
- Integrate Vital/Rook mobile SDK
- Users grant HealthKit permissions via their app
- Data syncs to your backend via webhooks
- **Cost:** $99-300/month
- **Effort:** 6-8 hours integration

**Recommendation:** Start with Option B (Vital/Rook) for MVP, consider Option A if you build native app later

---

## Code Quality Improvements

### 1. Error Handling

**Current Issue:** Token refresh errors don't notify users

**Fix:**
```typescript
// In wearableTokenRefresh.ts
await storage.createNotification({
  userId: connection.userId,
  type: 'system',
  title: 'Wearable Device Disconnected',
  message: `Your ${connection.provider} connection has expired. Please reconnect.`,
  metadata: { actionUrl: '/dashboard/wearables' }
});
```

### 2. Rate Limiting

**Current Implementation:**
```typescript
// wearableDataSync.ts - Line 270
await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
```

**Issue:** Hardcoded rate limit may not be optimal

**Improvement:**
```typescript
const RATE_LIMITS = {
  oura: 5000,   // 5k requests/day = ~3.5 requests/min
  fitbit: 150,  // 150 requests/hour = 2.5 requests/min
  whoop: 100,   // Approximate limit
};

async function rateLimitedFetch(provider: string) {
  const delay = 60000 / RATE_LIMITS[provider]; // Convert to ms
  await new Promise(resolve => setTimeout(resolve, delay));
}
```

### 3. Data Deduplication

**Current Issue:** No check for duplicate data entries

**Fix:**
```typescript
// Before saving to biometric_data
const existing = await storage.getBiometricDataByDate(userId, dataDate, provider);
if (existing) {
  console.log(`Skipping duplicate data for ${dataDate}`);
  return;
}
```

---

## Testing Checklist

### Unit Tests (Create `server/__tests__/wearableDataNormalizer.test.ts`)
- [ ] Oura seconds → minutes conversion
- [ ] Fitbit minutes (no conversion needed)
- [ ] WHOOP milliseconds → minutes conversion
- [ ] Null value handling
- [ ] Edge case: zero values vs missing data

### Integration Tests
- [ ] Fitbit OAuth flow (mock token exchange)
- [ ] WHOOP OAuth flow
- [ ] Token refresh for expired connections
- [ ] Daily sync cron job triggers correctly

### End-to-End Tests
- [ ] Connect Oura device → data appears in `biometric_data`
- [ ] Connect Fitbit device → data appears normalized
- [ ] Connect WHOOP device → strain score captured
- [ ] AI consultation uses biometric data in prompts
- [ ] Disconnect device → data stops syncing

---

## Deployment Considerations

### Environment Variables Checklist
```bash
# Already configured:
✅ OURA_CLIENT_ID
✅ OURA_CLIENT_SECRET
✅ FITBIT_CLIENT_ID
✅ FITBIT_CLIENT_SECRET

# Missing (need to register apps):
❌ WHOOP_CLIENT_ID
❌ WHOOP_CLIENT_SECRET
❌ GARMIN_CLIENT_ID (future)
❌ GARMIN_CLIENT_SECRET (future)
```

### Railway/Vercel Configuration
- Ensure environment variables are set in production
- Configure redirect URIs for each OAuth provider:
  - Oura: `https://myones.ai/api/wearables/callback/oura`
  - Fitbit: `https://myones.ai/api/wearables/callback/fitbit`
  - WHOOP: `https://myones.ai/api/wearables/callback/whoop`

### Database Migration
- No schema changes needed for Fitbit/WHOOP (already supported)
- For Garmin: Add migration to update `wearableProviderEnum`

---

## Cost & Time Estimate

| Task | Estimated Time | Priority |
|------|---------------|----------|
| Fitbit data sync | 4-6 hours | **High** (auth already done) |
| WHOOP data sync | 4-6 hours | **High** (auth already done) |
| Normalization refactor | 2-3 hours | **Medium** (cleanup) |
| Garmin OAuth + sync | 6-8 hours | **Low** (new integration) |
| Apple Health (Vital SDK) | 6-8 hours | **Low** (requires mobile consideration) |
| Unit tests | 3-4 hours | **Medium** (quality) |
| **TOTAL** | **25-35 hours** | |

### ROI Analysis
- **User Benefit:** Users with Fitbit/WHOOP can immediately use their existing devices
- **AI Improvement:** More biometric data = better personalization
- **Market Coverage:**
  - Oura: ~2% market share
  - Fitbit: ~35% market share (largest!)
  - WHOOP: ~5% (athletes)
  - Garmin: ~10% (athletes/outdoors)
  - Apple Health: ~40% (requires mobile app)

**Recommendation:** Prioritize Fitbit (largest user base) → WHOOP (already 80% done) → Garmin → Apple Health (via Vital)

---

## Next Steps

**Immediate Actions:**
1. ✅ Complete this audit document
2. Register WHOOP developer account (get client ID/secret)
3. Implement Fitbit data sync (4-6 hours)
4. Implement WHOOP data sync (4-6 hours)
5. Test both integrations end-to-end
6. Refactor normalization into shared module
7. Add unit tests for normalization logic

**Future Enhancements:**
- Add Garmin support
- Implement Apple Health via Vital SDK
- Add real-time webhook support (vs daily polling)
- Build admin dashboard to monitor sync health
- Add user notifications for connection errors

---

## References

- **Oura API Docs:** https://cloud.ouraring.com/v2/docs
- **Fitbit API Docs:** https://dev.fitbit.com/build/reference/web-api/
- **WHOOP API Docs:** https://developer.whoop.com/api
- **Garmin Health API:** https://developer.garmin.com/health-api/overview/
- **Current Implementation:**
  - `server/wearableDataSync.ts` (Oura only)
  - `server/wearableTokenRefresh.ts` (All 3 providers)
  - `server/routes.ts` (OAuth flows for all 3)
