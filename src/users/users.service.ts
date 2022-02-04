import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAccountInput } from './dtos/create-account-dto';
import { LoginInput } from './dtos/login.dto';
import { User } from './entities/user.entity';
import { JwtService } from 'src/jwt/jwt.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
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

  async login({
    email,
    password,
  }: LoginInput): Promise<{ ok: boolean; error?: string; token?: string }> {
    try {
      // 입력받은 이메일을 가진 유저 찾기
      const user = await this.users.findOne({ email });
      if (!user) {
        return {
          ok: false,
          error: '해당 이메일을 가진 유저를 찾을 수 없습니다.',
        };
      }
      // 입력받은 비밀번호가 해당 유저의 비밀번호와 일치하는지 확인
      const passwordCorrect = await user.checkPassword(password);
      if (!passwordCorrect) {
        return {
          ok: false,
          error: '비밀번호가 일치하지 않습니다.',
        };
      }
      // JWT 만들고 user에게 주기(*)
      const token = this.jwt.sign({ id: user.id });
      return {
        ok: true,
        token,
      };
    } catch (error) {
      return {
        ok: false,
        error,
      };
    }
  }

  async findById(id: number): Promise<User> {
    return this.users.findOne({ id });
  }
}
