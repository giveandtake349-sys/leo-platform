import { BadRequestException } from '@nestjs/common';
import { EscrowStatus } from './entities/escrow.entity';

/**
 * Full escrow state machine.
 * VALID_TRANSITIONS[from] = Set of allowed `to` states.
 * Any transition not in this map is rejected with ESCROW_INVALID_TRANSITION.
 */
const VALID_TRANSITIONS: Partial<Record<EscrowStatus, EscrowStatus[]>> = {
  draft:     ['pending', 'cancelled'],
  pending:   ['funded', 'cancelled'],
  funded:    ['active', 'refunded', 'cancelled'],
  active:    ['submitted', 'disputed', 'cancelled'],
  submitted: ['revision', 'approved'],
  revision:  ['submitted', 'disputed'],
  approved:  ['released'],
  released:  ['closed'],
  refunded:  ['closed'],
  disputed:  ['released', 'refunded', 'closed'],
};

const TERMINAL: EscrowStatus[] = ['released', 'refunded', 'cancelled', 'closed'];

export class EscrowStateMachine {
  /**
   * Assert that a transition from `current` to `next` is valid.
   * Throws BadRequestException if not.
   */
  static assertTransition(current: EscrowStatus, next: EscrowStatus): void {
    if (TERMINAL.includes(current)) {
      throw new BadRequestException({
        code: 'ESCROW_INVALID_TRANSITION',
        message: `Escrow is in terminal state '${current}' and cannot be transitioned further.`,
      });
    }

    const allowed = VALID_TRANSITIONS[current] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException({
        code: 'ESCROW_INVALID_TRANSITION',
        message: `Cannot transition escrow from '${current}' to '${next}'. Allowed: [${allowed.join(', ')}]`,
      });
    }
  }

  static isTerminal(status: EscrowStatus): boolean {
    return TERMINAL.includes(status);
  }
}
