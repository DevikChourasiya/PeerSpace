import { FeedbackRound } from '../models/feedbackRound.model.js';
import { RoundStatus, AuditAction } from '@peerspace/shared';
import { logAuditEvent } from './auditLog.service.js';

let schedulerInterval: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Checks for scheduled rounds whose start date has arrived and activates them.
 * Returns the count of activated rounds.
 */
export const checkScheduledRounds = async (): Promise<number> => {
  if (isRunning) return 0;
  isRunning = true;

  try {
    const now = new Date();
    // Find scheduled rounds whose startDate <= now
    const eligibleRounds = await FeedbackRound.find({
      status: RoundStatus.SCHEDULED,
      startDate: { $lte: now },
    });

    let activatedCount = 0;

    for (const round of eligibleRounds) {
      // Publication guard: only open if questionnaireVersionId is bound
      if (!round.questionnaireVersionId) {
        console.warn(
          `[Scheduler] Skipping auto-open for round "${round.title}" (${round.id}): Missing published questionnaire version.`
        );
        continue;
      }

      round.status = RoundStatus.OPEN;
      await round.save();
      activatedCount++;

      console.log(
        `[Scheduler] Automatically transitioned scheduled round "${round.title}" (${round.id}) to OPEN.`
      );

      // Record audit event
      await logAuditEvent({
        actor: {
          id: round.createdBy?.toString() || '000000000000000000000000',
          email: 'scheduler@system.peerspace',
          role: 'system',
        },
        action: AuditAction.ROUND_STATUS_TRANSITION,
        entityType: 'FeedbackRound',
        entityId: round.id,
        details: {
          from: RoundStatus.SCHEDULED,
          to: RoundStatus.OPEN,
          triggeredBy: 'automatic_scheduler',
          startDate: round.startDate,
        },
      });
    }

    return activatedCount;
  } catch (err) {
    console.error('[Scheduler] Error checking scheduled rounds:', err);
    return 0;
  } finally {
    isRunning = false;
  }
};

/**
 * Starts the periodic scheduled round activation service.
 */
export const startRoundScheduler = (intervalMs = 30000): void => {
  if (schedulerInterval) return;

  console.log(`[Scheduler] Round scheduler started (interval: ${intervalMs}ms).`);
  // Run an immediate check on startup
  checkScheduledRounds().catch((err) => console.error('[Scheduler] Initial check error:', err));

  schedulerInterval = setInterval(() => {
    checkScheduledRounds().catch((err) => console.error('[Scheduler] Interval check error:', err));
  }, intervalMs);

  // Prevent scheduler from keeping Node process alive if everything else exits
  schedulerInterval.unref();
};

/**
 * Stops the scheduled round activation service cleanly.
 */
export const stopRoundScheduler = (): void => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Scheduler] Round scheduler stopped.');
  }
};
