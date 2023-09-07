import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UserService } from 'src/user/user.service';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly config: ConfigService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.get('GOOGLE_CLIENT_ID'),
      clientSecret: config.get('GOOGLE_CLIENT_SECRET_KEY'),
      callbackURL: config.get('CALL_BACK_URL'),
      scope: ['profile', 'email'],
    });
  }
  extractGoogleUserData(user: any): CreateUserDto {
    const { name, emails, photos } = user;

    const userData: CreateUserDto = {
      email: emails[0].value,
      username: name.givenName,
      avatar: photos[0].value,
      cover: '',
      password: '',
    };
    return userData;
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    {
      const user = this.extractGoogleUserData(profile);
      let userCheck = await this.userService.findUserEmail(user.email);
      console.log(userCheck);
      if (!userCheck) {
        const newUser = await this.authService.signup(user);
        userCheck = await this.userService.findUserById(newUser.id);
      }
      done(null, userCheck);
    }
  }
}
