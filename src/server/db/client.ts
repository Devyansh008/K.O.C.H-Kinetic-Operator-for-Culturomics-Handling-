/**
 * src/server/db/client.ts
 *
 * Global PrismaClient singleton instance for Project K.O.C.H.
 */

import prisma, { db } from '../../lib/prisma';

export { prisma, db };
export default prisma;
