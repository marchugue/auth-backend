import { prisma } from '../../utils/prisma';
import { queueChange } from '../../utils/syncQueue';

export const findUserByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email } });

export const findUserById = (id: string) =>
  prisma.user.findUnique({ where: { id } });

export const findUserByVerificationToken = (hashedToken: string) =>
  prisma.user.findFirst({
    where: { emailVerificationToken: hashedToken, emailVerificationExpiry: { gt: new Date() } },
  });

export const findUserByResetToken = (hashedToken: string) =>
  prisma.user.findFirst({
    where: { passwordResetToken: hashedToken, passwordResetExpiry: { gt: new Date() } },
  });

export const createUser = async (data: {
  email: string;
  password: string;
  name?: string;
  emailVerificationToken: string;
  emailVerificationExpiry: Date;
}) => {
  const user = await prisma.user.create({ data });
  queueChange('users', 'upsert', user);
  return user;
};

export const updateUser = async (id: string, data: Record<string, any>) => {
  const user = await prisma.user.update({ where: { id }, data });
  queueChange('users', 'upsert', user);
  return user;
};

/** Password reset + revoking every session in one transaction. */
export const resetPasswordAndRevokeSessions = async (userId: string, hashedPassword: string) => {
  const sessionsToRevoke = await prisma.session.findMany({ where: { userId }, select: { id: true } });

  const [user] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, passwordResetToken: null, passwordResetExpiry: null },
    }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);

  queueChange('users', 'upsert', user);
  sessionsToRevoke.forEach((s) => queueChange('sessions', 'delete', { id: s.id }));

  return user;
};