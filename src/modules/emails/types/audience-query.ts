export type AudienceStatus = 'registered' | 'present' | 'absent';

export interface AudienceCondition {
  fairId: string;
  status: AudienceStatus;
}

export interface AudienceQuery {
  operator: 'AND' | 'OR';
  conditions: AudienceCondition[];
}
