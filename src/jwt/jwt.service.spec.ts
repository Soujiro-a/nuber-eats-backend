import { Test } from '@nestjs/testing';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { sign, verify } from 'jsonwebtoken';
import { JwtService } from './jwt.service';

const TEST_KEY = 'testKey';
const USER_ID = 1;

jest.mock('jsonwebtoken', () => {
  return {
    sign: jest.fn(() => 'Token'),
    verify: jest.fn(() => ({ id: USER_ID })),
  };
});

describe('JwtService', () => {
  let service: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JwtService,
        {
          provide: CONFIG_OPTIONS,
          useValue: { privateKey: TEST_KEY },
        },
      ],
    }).compile();
    service = module.get<JwtService>(JwtService);
  });

  it('JwtService를 정의합니다.', () => {
    expect(service).toBeDefined();
  });

  describe('sign', () => {
    it('서명된 토큰을 반환합니다.', () => {
      const ID = 1;
      const token = service.sign({ id: ID });
      expect(sign).toHaveBeenCalledTimes(1);
      expect(sign).toHaveBeenCalledWith({ id: ID }, TEST_KEY);
      expect(typeof token).toBe('string');
    });
  });
  describe('verify', () => {
    it('토큰 안의 내용을 반환합니다.', () => {
      const TOKEN = 'TOKEN';
      const decodedToken = service.verify(TOKEN);
      expect(verify).toHaveBeenCalledTimes(1);
      expect(verify).toHaveBeenCalledWith(TOKEN, TEST_KEY);
      expect(decodedToken).toMatchObject({ id: USER_ID });
    });
  });
});
