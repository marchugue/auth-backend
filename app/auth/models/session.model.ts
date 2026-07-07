import { prisma } from '../../utils/prisma';
import { queueChange } from '../../utils/syncQueue';

export const createSessionRecord = async (data: {
  userId: string;
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}) => {
  const session = await prisma.session.create({ data });
  queueChange('sessions', 'upsert', session);
  return session;
};

export const updateSessionToken = async (id: string, refreshToken: string) => {
  const session = await prisma.session.update({ where: { id }, data: { refreshToken } });
  queueChange('sessions', 'upsert', session);
  return session;
};

export const findSessionById = (id: string) =>
  prisma.session.findUnique({ where: { id } });

export const deleteSessionById = async (id: string) => {
  await prisma.session.delete({ where: { id } });
  queueChange('sessions', 'delete', { id });
};

export const deleteSessionsByUserId = async (userId: string) => {
  const sessions = await prisma.session.findMany({ where: { userId }, select: { id: true } });
  await prisma.session.deleteMany({ where: { userId } });
  sessions.forEach((s) => queueChange('sessions', 'delete', { id: s.id }));
};