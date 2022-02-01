import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAccountInput } from './dtos/create-account-dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async createAccount({
    email,
    password,
    role,
  }: CreateAccountInput): Promise<{ ok: boolean; error?: string }> {
    try {
      // 새 유저인지 체크하기
      const exists = await this.users.findOne({ email });
      // 이미 존재하는 이메일이라면
      if (exists) {
        // 에러 메시지 반환
        return {
          ok: false,
          error: '해당 이메일을 가진 사용자가 이미 존재합니다.',
        };
      }
      // 유저 만들기 & 비밀번호 해싱하기
      await this.users.save(this.users.create({ email, password, role }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: '유저를 생성할 수 없었습니다.' };
    }
  }
}
