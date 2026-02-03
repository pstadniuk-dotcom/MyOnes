/**
 * Wearables Domain
 * 
 * Modular domain for managing wearable device connections and biometric data.
 */

import { WearableRepository } from './wearable.repository';
import { WearableService } from './wearable.service';
import { userService } from '../users';

const wearableRepository = new WearableRepository();
const wearableService = new WearableService(wearableRepository, userService);

export { wearableRepository, wearableService };
