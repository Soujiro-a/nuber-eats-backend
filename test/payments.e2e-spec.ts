import { INestApplication } from '@nestjs/common';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { getConnection, Repository } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

const GRAPHQL_ENDPOINT = '/graphql';

const ownerUser = {
  email: 'owner@account.com',
  password: '1234',
};

const notAllowedUser = {
  email: 'notAllowed@account.com',
  password: '1234',
};

const testRestaurant = {
  name: 'Test Restaurant',
  address: 'Test Address',
  coverImage: 'https://TestCoverImage.com',
  categoryName: 'Test Category',
};

describe('PaymentModule (e2e)', () => {
  let app: INestApplication;
  let restaurantsRepository: Repository<Restaurant>;
  let ownerToken: string;
  let notAllowedUserToken: string;

  const baseTest = () => request(app.getHttpServer()).post(GRAPHQL_ENDPOINT);
  const publicTest = (query: string) => baseTest().send({ query });
  const privateTest = (token: string, query: string) =>
    baseTest().set('X-JWT', token).send({ query });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    restaurantsRepository = module.get<Repository<Restaurant>>(
      getRepositoryToken(Restaurant),
    );
    await app.init();
  });

  afterAll(async () => {
    await getConnection().dropDatabase();
    app.close();
  });

  describe('createPayment', () => {
    describe('Owner 계정 생성 및 음식점 생성', () => {
      it('Owner 권한을 가진 계정을 생성합니다.', () => {
        return publicTest(`
                mutation {
                  createAccount(input:{
                    email: "${ownerUser.email}",
                    password:"${ownerUser.password}",
                    role:Owner
                  }) {
                    ok
                    error
                  }
                }
                `)
          .expect(200)
          .expect((res) => {
            const {
              body: {
                data: {
                  createAccount: { ok, error },
                },
              },
            } = res;
            expect(ok).toBeTruthy();
            expect(error).toBeNull();
          });
      });
      it('생성한 계정으로 로그인 합니다.', () => {
        return publicTest(`
              mutation {
                login(input:{
                  email:"${ownerUser.email}",
                  password:"${ownerUser.password}"
                }) {
                  ok
                  token
                  error
                }
              } 
              `)
          .expect(200)
          .expect((res) => {
            const {
              body: {
                data: {
                  login: { ok, error, token },
                },
              },
            } = res;
            expect(ok).toBeTruthy();
            expect(error).toBeNull();
            expect(token).toEqual(expect.any(String));
            ownerToken = token;
          });
      });
      it("생성한 계정을 오너로 둔 'Test Restaurant' 음식점을 하나 생성합니다.", () => {
        return privateTest(
          ownerToken,
          `
              mutation {
                  createRestaurant(input:{
                    name: "${testRestaurant.name}",
                    address:"${testRestaurant.address}",
                    coverImage:"${testRestaurant.coverImage}",
                    categoryName:"${testRestaurant.categoryName}",
                  }) {
                    ok
                    error
                  }
                }
              `,
        )
          .expect(200)
          .expect((res) => {
            const {
              body: {
                data: {
                  createRestaurant: { ok, error },
                },
              },
            } = res;
            expect(ok).toBeTruthy();
            expect(error).toBeNull();
          });
      });
    });
    describe('Owner 계정 생성 (음식점의 주인이 아닌 케이스 확인용)', () => {
      it('Owner 권한을 가진 계정을 생성합니다.', () => {
        return publicTest(`
                mutation {
                  createAccount(input:{
                    email: "${notAllowedUser.email}",
                    password:"${notAllowedUser.password}",
                    role:Owner
                  }) {
                    ok
                    error
                  }
                }
                `)
          .expect(200)
          .expect((res) => {
            const {
              body: {
                data: {
                  createAccount: { ok, error },
                },
              },
            } = res;
            expect(ok).toBeTruthy();
            expect(error).toBeNull();
          });
      });
      it('생성한 계정으로 로그인 합니다.', () => {
        return publicTest(`
              mutation {
                login(input:{
                  email:"${notAllowedUser.email}",
                  password:"${notAllowedUser.password}"
                }) {
                  ok
                  token
                  error
                }
              } 
              `)
          .expect(200)
          .expect((res) => {
            const {
              body: {
                data: {
                  login: { ok, error, token },
                },
              },
            } = res;
            expect(ok).toBeTruthy();
            expect(error).toBeNull();
            expect(token).toEqual(expect.any(String));
            notAllowedUserToken = token;
          });
      });
    });
    it('존재하지 않는 음식점에 대해 프로모션 혜택을 위한 결제에 실패합니다.', () => {
      return privateTest(
        ownerToken,
        `
          mutation {
            createPayment(input: {
              transactionId:"xx"
              restaurantId:999
            }) {
              ok
              error
            }
          }
          `,
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                createPayment: { ok, error },
              },
            },
          } = res;

          expect(ok).toBeFalsy();
          expect(error).toEqual('음식점을 찾을 수 없습니다.');
        });
    });
    it('프로포션을 적용하고자 하는 음식점의 주인이 아닌 경우 결제에 실패합니다.', async () => {
      const restaurant = await restaurantsRepository.findOne();
      return privateTest(
        notAllowedUserToken,
        `
              mutation {
                createPayment(input: {
                  transactionId:"xx"
                  restaurantId:${restaurant.id}
                }) {
                  ok
                  error
                }
              }
              `,
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                createPayment: { ok, error },
              },
            },
          } = res;

          expect(ok).toBeFalsy();
          expect(error).toEqual('음식점의 주인만 할 수 있는 작업입니다.');
        });
    });
    it('결제에 성공하여 특정 음식점에 대한 프로모션 혜택이 적용됩니다.', async () => {
      const restaurant = await restaurantsRepository.findOne();
      return privateTest(
        ownerToken,
        `
              mutation {
                createPayment(input: {
                  transactionId:"xx"
                  restaurantId:${restaurant.id}
                }) {
                  ok
                  error
                }
              }
              `,
      )
        .expect(200)
        .expect(async (res) => {
          const {
            body: {
              data: {
                createPayment: { ok, error },
              },
            },
          } = res;

          expect(ok).toBeTruthy();
          expect(error).toBeNull();

          const { isPromoted, promotedUntil } =
            await restaurantsRepository.findOne();

          expect(isPromoted).toBeTruthy();
          expect(promotedUntil).toEqual(expect.any(Date));
        });
    });
  });
  describe('getPayment', () => {
    it('Owner 계정에 대한 결제 목록을 불러옵니다.', () => {
      return privateTest(
        ownerToken,
        `
        {
            getPayment{
              ok
              error
              payments {
                transactionId
              }
            }
          }
        `,
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                getPayment: { ok, error, payments },
              },
            },
          } = res;

          expect(ok).toBeTruthy();
          expect(error).toBeNull();
          expect(payments).toHaveLength(1);
        });
    });
    it('다른 Owner 계정에 대한 결제 목록을 불러옵니다. (결제 내역이 존재하지 않으므로 결제 목록은 비어있음)', () => {
      return privateTest(
        notAllowedUserToken,
        `
            {
                getPayment{
                  ok
                  error
                  payments {
                    transactionId
                  }
                }
              }
            `,
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                getPayment: { ok, error, payments },
              },
            },
          } = res;

          expect(ok).toBeTruthy();
          expect(error).toBeNull();
          expect(payments).toHaveLength(0);
        });
    });
  });
});
