import { DetectionRule } from '../detection-rule.interface';
import { bruteForceRule } from './brute-force.rule';
import { bruteForceSuccessRule } from './brute-force-success.rule';
import { mfaFatigueRule } from './mfa-fatigue.rule';
import { takeoverChainRule } from './takeover-chain.rule';
import { privilegeEscalationRule } from './privilege-escalation.rule';
import { newCountryRule } from './new-country.rule';
import { newIpRule } from './new-ip.rule';

// Registered detection rules. Each is evaluated against every ingested event;
// a match raises an alert (deduplicated per the rule's dedupe key).
export const DETECTION_RULES: DetectionRule[] = [
  bruteForceRule,
  bruteForceSuccessRule,
  mfaFatigueRule,
  takeoverChainRule,
  privilegeEscalationRule,
  newCountryRule,
  newIpRule,
];
