import { prisma } from '../../utils/prisma';
import { queueChange } from '../../utils/syncQueue';

export const findUserByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email } });

export const findUserByUsername = (username: string) =>
  prisma.user.findUnique({ where: { username } });

export const findUserById = (id: string) =>
  prisma.user.findUnique({ where: { id } });

export const createUser = async (data: {
  username: string;
  email?: string;
  password: string;
  name?: string;
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