import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, username: string, avatar?: string, email?: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        username: username || "User",
        avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
        email: email || "",
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          username: username || "User",
          ...(avatar ? { avatar } : {}),
          ...(email ? { email } : {}),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database user query failed:", error);
    throw new Error("Database user query failed", { cause: error });
  }
}
