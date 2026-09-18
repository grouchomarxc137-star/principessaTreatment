import type { Role } from "../../shared/types.ts";
import { hashPassword, verifyPassword } from "./auth.ts";
import { DEFAULT_CARDS, DEFAULT_PREFERENCES } from "./catalog.ts";
import { prisma } from "./db.ts";
import { env } from "./env.ts";

// Runs on every start and is safe to repeat: makes sure both people can sign
// in, the state row exists, and there is a deck to start from.

async function ensureUser(role: Role, name: string, password: string | undefined) {
  const existing = await prisma.user.findUnique({ where: { role } });
  if (!password) {
    if (!existing) console.warn(`No ${role}_PASSWORD set, so ${name} can't sign in yet.`);
    return;
  }
  if (!existing) {
    await prisma.user.create({ data: { role, name, passwordHash: await hashPassword(password) } });
    console.log(`Created ${name}.`);
  } else if (!(await verifyPassword(password, existing.passwordHash))) {
    // The env password changed: rotate it and sign out every device.
    await prisma.user.update({
      where: { role },
      data: { passwordHash: await hashPassword(password), sessions: { deleteMany: {} } },
    });
    console.log(`Updated ${name}'s password.`);
  }
}

export async function bootstrap() {
  await ensureUser("PRINCIPESSA", "Principessa", env.principessaPassword);
  await ensureUser("PRINCIPE", "Principe", env.principePassword);

  await prisma.currentState.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });

  if ((await prisma.careCard.count()) === 0) {
    await prisma.careCard.createMany({ data: DEFAULT_CARDS });
  }
  if ((await prisma.preference.count()) === 0) {
    await prisma.preference.createMany({
      data: DEFAULT_PREFERENCES.map((p, i) => ({ ...p, sortOrder: i * 10 })),
    });
  }
}
