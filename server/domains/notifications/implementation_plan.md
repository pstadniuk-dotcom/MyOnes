
# Notifications Domain Migration

Establish the Notifications domain with a repository, service, and refactored routes to follow the new modular architecture.

## Proposed Changes

### Notifications Domain

#### [NEW] [notification.repository.ts](file:///d:/projects/MyOnes/server/domains/notifications/notification.repository.ts)
- Implement `NotificationRepository` extending `BaseRepository`.
- Include methods for managing individual notifications and user notification preferences.
- Move `normalizeNotificationMetadata` logic into the repository.

#### [NEW] [notification.service.ts](file:///d:/projects/MyOnes/server/domains/notifications/notification.service.ts)
- Implement `NotificationService` as a facade over `NotificationRepository`.

#### [NEW] [index.ts](file:///d:/projects/MyOnes/server/domains/notifications/index.ts)
- Barrel exports for the domain.

### Routes Refactoring

#### [MODIFY] [notifications.routes.ts](file:///d:/projects/MyOnes/server/routes/notifications.routes.ts)
- Replace all `storage` calls with `notificationService`.

#### [MODIFY] [formulas.routes.ts](file:///d:/projects/MyOnes/server/routes/formulas.routes.ts)
- Replace `storage.createNotification` calls with `notificationService.createNotification`.

## Verification Plan

### Automated Tests
- Run `npm run build` to verify type safety and import integrity.

### Manual Verification
- Verify notification fetching and marking as read via the UI (if applicable) or manual API testing.
