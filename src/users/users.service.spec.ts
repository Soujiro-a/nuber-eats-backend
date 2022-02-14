import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from 'src/jwt/jwt.service';
import { MailService } from 'src/mail/mail.service';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Verification } from './entities/verification.entity';
import { UserService } from './users.service';

const mockRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
});

const mockJwtService = {
  sign: jest.fn(() => 'signed-token'),
  verify: jest.fn(),
};

const mockMailService = {
  sendVerificationEmail: jest.fn(),
};

type mockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('UserService', () => {
  let service: UserService;
  let usersRepository: mockRepository<User>;
  let verificationsRepository: mockRepository<Verification>;
  let mailService: MailService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Verification),
          useValue: mockRepository(),
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();
    service = module.get<UserService>(UserService);
    usersRepository = module.get(getRepositoryToken(User));
    verificationsRepository = module.get(getRepositoryToken(Verification));
    mailService = module.get<MailService>(MailService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('UserService를 정의합니다.', () => {
    expect(service).toBeDefined();
  });

  describe('createAccount', () => {
    const createAccountArgs = {
      email: 'create@account.com',
      password: '1234',
      role: 0,
    };
    it('사용자가 있는 경우 새 유저 생성에 실패합니다.', async () => {
      usersRepository.findOne.mockResolvedValue({
        id: 1,
        email: 'asdf@asdf.com',
      });
      const result = await service.createAccount(createAccountArgs);
      expect(result).toMatchObject({
        ok: false,
        error: '해당 이메일을 가진 사용자가 이미 존재합니다.',
      });
    });

    it('새 유저를 만듭니다.', async () => {
      // 각 repository의 함수에 대해 fake value를 return하게 만들기
      usersRepository.findOne.mockResolvedValue(undefined);
      usersRepository.create.mockReturnValue(createAccountArgs);
      usersRepository.save.mockResolvedValue(createAccountArgs);

      verificationsRepository.create.mockReturnValue({
        user: createAccountArgs,
      });
      verificationsRepository.save.mockResolvedValue({
        code: 'code',
      });

      const result = await service.createAccount(createAccountArgs); // createAccount 함수 호출

      // 유저 생성에 성공했을 경우에 발생하는 각 케이스들에 대한 테스트
      expect(usersRepository.create).toHaveBeenCalledTimes(1); // 실행 횟수 검증
      expect(usersRepository.create).toHaveBeenCalledWith(createAccountArgs); // 매개변수 검증

      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(usersRepository.save).toHaveBeenCalledWith(createAccountArgs);

      expect(verificationsRepository.create).toHaveBeenCalledTimes(1);
      expect(verificationsRepository.create).toHaveBeenCalledWith({
        user: createAccountArgs,
      });

      expect(verificationsRepository.save).toHaveBeenCalledTimes(1);
      expect(verificationsRepository.save).toHaveBeenCalledWith({
        user: createAccountArgs,
      });

      expect(mailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
      );

      expect(result).toMatchObject({ ok: true });
    });

    it('예외가 발생했다면 새 유저 생성에 실패합니다.', async () => {
      usersRepository.findOne.mockRejectedValue(new Error());

      const result = await service.createAccount(createAccountArgs);
      expect(result).toMatchObject({
        ok: false,
        error: '유저를 생성할 수 없었습니다.',
      });
    });
  });
  describe('login', () => {
    const loginArgs = {
      email: 'login@account.com',
      password: '1234',
    };
    it('유저가 존재하지 않을 경우에 로그인에 실패합니다.', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const result = await service.login(loginArgs);

      expect(usersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(usersRepository.findOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
      );
      expect(result).toMatchObject({
        ok: false,
        error: '해당 이메일을 가진 유저를 찾을 수 없습니다.',
      });
    });

    it('비밀번호가 일치하지 않을 경우에 로그인에 실패합니다.', async () => {
      const mockedUser = {
        checkPassword: jest.fn(() => Promise.resolve(false)),
      };
      usersRepository.findOne.mockResolvedValue(mockedUser);

      const result = await service.login(loginArgs);
      expect(result).toMatchObject({
        ok: false,
        error: '비밀번호가 일치하지 않습니다.',
      });
    });

    it('비밀번호가 일치할 경우에 token을 반환합니다.', async () => {
      const mockedUser = {
        id: 1,
        checkPassword: jest.fn(() => Promise.resolve(true)),
      };
      usersRepository.findOne.mockResolvedValue(mockedUser);

      const result = await service.login(loginArgs);
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
      expect(jwtService.sign).toHaveBeenCalledWith({ id: mockedUser.id });
      expect(result).toMatchObject({ ok: true, token: 'signed-token' });
    });

    it('예외가 발생했다면 로그인에 실패합니다.', async () => {
      usersRepository.findOne.mockRejectedValue(new Error());

      const result = await service.login(loginArgs);
      console.log(result);
      expect(result).toMatchObject({ ok: false, error: Error() });
    });
  });
  it.todo('findById');
  it.todo('editProfile');
  it.todo('verifyEmail');
});
