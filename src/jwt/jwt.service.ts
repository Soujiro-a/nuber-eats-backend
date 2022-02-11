import { Inject, Injectable } from '@nestjs/common';
import { JwtModuleOptions } from './jwt.interfaces';
import { sign, verify } from 'jsonwebtoken';
import { CONFIG_OPTIONS } from 'src/common/common.constants';

@Injectable()
export class JwtService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: JwtModuleOptions,
  ) {}
  sign(payload: object): string {
    return sign(payload, this.options.privateKey);
  }
  verify(token: string) {
    return verify(token, this.options.privateKey);
  }
}
