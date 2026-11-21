import { IntermediateRecord, SemanticallyValidatedRecord, SupportedEvent } from './types';

/**
 * Phase 5: Intermediate Code Generation
 * Converts semantically validated records into normalized Intermediate Representation (IR)
 * objects before passing them downstream to the cybersecurity detection engine.
 */
export function generateIntermediateRecord(
  record: SemanticallyValidatedRecord
): IntermediateRecord {
  return {
    record_type: 'SECURITY_LOG',
    lineNumber: record.lineNumber,
    timestamp: record.timestamp.replace(/\s+/, ' '),
    source_ip: record.ipAddress.trim(),
    username: record.username.trim(),
    event: record.event.trim() as SupportedEvent,
    message: record.message.trim(),
    rawLine: record.rawLine,
  };
}

export function generateIntermediateCode(
  validatedRecords: SemanticallyValidatedRecord[]
): IntermediateRecord[] {
  return validatedRecords.map(generateIntermediateRecord);
}
