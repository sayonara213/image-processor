import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AppLogger } from 'src/common/services/logger.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async signIn(email: string, pass: string): Promise<{ access_token: string }> {
    try {
      const user = await this.usersService.findOne(email);

      if (!user) {
        throw new UnauthorizedException('No such user');
      }

      const isPasswordValid = await bcrypt.compare(pass, user.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const payload = { sub: user.id, email: user.email };

      return {
        access_token: await this.jwtService.signAsync(payload),
      };
    } catch (e) {
      this.logger.error('Sign in failed', e?.stack || e);

      if (e instanceof HttpException) {
        throw e;
      }

      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async signUp(email: string, pass: string) {
    try {
      const hash = await bcrypt.hash(pass, 10);
      await this.usersService.create(email, hash);

      return {
        message: 'User created successfully',
      };
    } catch (e) {
      this.logger.error('Sign up failed', e?.stack || e);

      throw new BadRequestException('User already exists');
    }
  }
}
