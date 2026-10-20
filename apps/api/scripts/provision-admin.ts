import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { User } from '../src/models/user.model.js';
import { UserRole, UserStatus } from '@peerspace/shared';

interface ParsedArgs {
  email?: string;
  secret?: string;
  help?: boolean;
}

function parseCliArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--email' && i + 1 < args.length) {
      parsed.email = args[++i];
    } else if (arg === '--secret' && i + 1 < args.length) {
      parsed.secret = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    }
  }
  return parsed;
}

async function runProvisioning() {
  const args = parseCliArgs(process.argv.slice(2));

  if (args.help || !args.email) {
    console.log(`
PeerSpace — Administrator Provisioning Utility

Usage:
  npm run provision:admin -- --email <user_email> [--secret <provisioning_secret>]

Requirements:
  1. The target account must already be registered in PeerSpace.
  2. The provisioning secret must match ADMIN_PROVISION_SECRET in .env.

Examples:
  npm run provision:admin -- --email admin@university.edu
  npm run provision:admin -- --email admin@university.edu --secret my-secret-token
`);
    process.exit(args.help ? 0 : 1);
  }

  const targetEmail = args.email.trim().toLowerCase();
  const providedSecret =
    args.secret || process.env.ADMIN_PROVISION_SECRET || env.ADMIN_PROVISION_SECRET;

  if (!providedSecret || providedSecret !== env.ADMIN_PROVISION_SECRET) {
    console.error('❌ Authorization Failed: Invalid or missing administrator provisioning secret.');
    console.error('   Ensure ADMIN_PROVISION_SECRET is set in .env or provide --secret <secret>.');
    process.exit(1);
  }

  console.log(`[Provisioning] Connecting to database...`);
  await connectDatabase();

  try {
    const user = await User.findOne({ email: targetEmail });

    if (!user) {
      console.error(`❌ User Not Found: No registered account found with email "${targetEmail}".`);
      console.error(
        '   The user must first create an account through the PeerSpace registration portal.'
      );
      process.exitCode = 1;
      return;
    }

    if (user.role === UserRole.ADMIN) {
      console.log(`ℹ️ No Change Needed: "${targetEmail}" is already an Administrator.`);
      return;
    }

    if (user.role !== UserRole.STUDENT) {
      console.error(
        `❌ Ambiguous Role: User "${targetEmail}" currently holds role "${user.role}". Silent overwrite refused.`
      );
      process.exitCode = 1;
      return;
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.REJECTED) {
      console.error(
        `❌ Invalid Status: Account "${targetEmail}" is currently "${user.status}". Cannot promote to Administrator.`
      );
      process.exitCode = 1;
      return;
    }

    // Apply promotion with audit trail
    user.role = UserRole.ADMIN;
    user.status = UserStatus.ACTIVE;
    user.statusReason = 'Initial administrator provisioning via server-side CLI';
    user.statusUpdatedAt = new Date();

    await user.save();

    console.log('✅ Administrator Provisioned Successfully:');
    console.log(`   - Name:   ${user.name}`);
    console.log(`   - Email:  ${user.email}`);
    console.log(`   - Role:   ${user.role}`);
    console.log(`   - Status: ${user.status}`);
  } catch (error) {
    console.error(
      '❌ Unexpected error during provisioning:',
      error instanceof Error ? error.message : error
    );
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

runProvisioning().catch((err) => {
  console.error('Fatal provisioning error:', err);
  process.exit(1);
});
