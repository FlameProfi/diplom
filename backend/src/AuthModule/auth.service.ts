import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { User } from '@prisma/client'; // Импортируем тип User для лучшей типизации
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && user.passwordHash && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user; // Используем passwordHash
      return result;
    }
    return null;
  }

  async login(user: Omit<User, 'passwordHash'>) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
