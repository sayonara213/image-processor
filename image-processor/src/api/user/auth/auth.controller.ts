import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { CreateUserDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  signIn(@Body() signInDto: CreateUserDto) {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }

  @Post('register')
  signUp(@Body() signInDto: CreateUserDto) {
    return this.authService.signUp(signInDto.email, signInDto.password);
  }
}
