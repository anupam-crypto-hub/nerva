/**
 * Seed script — Creates an Organization, Workspace, and API Key.
 *
 * Run:  npx ts-node prisma/seed.ts
 *   or: npm run prisma:seed
 *
 * The raw API key is printed to console — save it, it won't be shown again.
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🌱 Seeding Nerva database...\n');

  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { id: '000000000000000000000001' },
    update: {},
    create: {
      id: '000000000000000000000001',
      name: 'Jiffy Commerce',
      status: 'ACTIVE',
      metadata: { plan: 'enterprise' },
    },
  });
  console.log(`✅ Organization: ${org.name} (${org.id})`);

  // 2. Create Workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'jiffy-main' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Jiffy Main Workspace',
      slug: 'jiffy-main',
      status: 'ACTIVE',
      settings: {
        timezone: 'Asia/Kolkata',
        defaultLanguage: 'en',
        codConfirmation: { enabled: true, timeoutMinutes: 30 },
        addressVerification: { enabled: true },
        ndrRescue: { enabled: true, maxAttempts: 3 },
      },
    },
  });
  console.log(`✅ Workspace: ${workspace.name} (${workspace.id})`);

  // 3. Create API Key
  const rawKey = `nk_${uuidv4().replace(/-/g, '')}${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  const keyPrefix = rawKey.substring(0, 11);
  const keyHash = await bcrypt.hash(rawKey, 12);
  const clientId = `cli_${uuidv4().replace(/-/g, '').substring(0, 24)}`;

  const existingKey = await prisma.apiKey.findFirst({
    where: { workspaceId: workspace.id, name: 'dev-seed-key', status: 'ACTIVE' },
  });

  if (existingKey) {
    console.log(`⚠️  API Key already exists for this workspace. Skipping creation.`);
    console.log(`   Key prefix: ${existingKey.keyPrefix}...`);
    console.log(`   (If you lost the raw key, delete the existing key and re-run seed)\n`);
  } else {
    await prisma.apiKey.create({
      data: {
        workspaceId: workspace.id,
        clientId,
        keyHash,
        keyPrefix,
        name: 'dev-seed-key',
        permissions: [
          'events:write',
          'events:read',
          'workflows:read',
          'workflows:write',
          'webhooks:read',
          'webhooks:write',
        ],
        status: 'ACTIVE',
      },
    });

    console.log(`✅ API Key created:`);
    console.log(`   ┌──────────────────────────────────────────────────┐`);
    console.log(`   │  API Key: ${rawKey}`);
    console.log(`   └──────────────────────────────────────────────────┘`);
    console.log(`   ⚠️  SAVE THIS KEY — it will NOT be shown again.\n`);
  }

  console.log('🎉 Seed complete!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
