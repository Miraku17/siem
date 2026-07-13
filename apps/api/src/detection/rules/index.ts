import { DetectionRule } from '../detection-rule.interface';
import { bruteForceRule } from './brute-force.rule';

// Register detection rules here. Additional starter rules to implement:
//   - admin.new_country       Admin login from a new country       -> CRITICAL
//   - dos.request_flood       100 requests within 30s              -> HIGH
//   - abuse.access_denied     Repeated ACCESS_DENIED               -> MEDIUM
export const DETECTION_RULES: DetectionRule[] = [bruteForceRule];
