/**
 * LEGACY STORAGE FILE - PLEASE DO NOT USE
 * 
 * All data access logic has been migrated to modular repositories:
 * - Users, HealthProfile, Newsletter, Streaks, Addresses, Orders -> UsersRepository
 * - Formula, ReviewSchedules -> FormulasRepository
 * - ChatSession, Message -> ChatRepository
 * - FileUpload, LabAnalysis -> FilesRepository
 * - AuditLog, AppSettings -> SystemRepository
 * - UserConsent -> ConsentsRepository
 * - Notification -> NotificationsRepository
 * - SupportTicket -> SupportRepository
 * - Ingredient, ResearchCitation -> IngredientsRepository
 * 
 * Please import the specific repository you need instead of this file.
 */

export const storage = {
  deprecated: true,
  message: "This storage object is deprecated. Use domain-specific repositories instead."
};

export default storage;
