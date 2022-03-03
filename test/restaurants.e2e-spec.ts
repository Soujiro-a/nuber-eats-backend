import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Dish } from 'src/restaurants/entities/dish.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { CategoryRepository } from 'src/restaurants/repositories/category.repository';
import { User } from 'src/users/entities/user.entity';
import { getConnection, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

const GRAPHQL_ENDPOINT = '/graphql';

const ownerUser = {
  email: 'owner@account.com',
  password: '1234',
};

const testUser = {
  email: 'test@account.com',
  password: '1234',
};

const testRestaurant = {
  name: 'Test Restaurant',
  address: 'Test Address',
  coverImage: 'https://TestCoverImage.com',
  categoryName: 'Test Category',
};

describe('RestaurantModule (e2e)', () => {
  let app: INestApplication;
  let usersRepository: Repository<User>;
  let restaurantsRepository: Repository<Restaurant>;
  let dishesRepository: Repository<Dish>;
  let categoriesRepository: CategoryRepository;
  let jwtToken: string;

  const baseTest = () => request(app.getHttpServer()).post(GRAPHQL_ENDPOINT);
  const publicTest = (query: string) => baseTest().send({ query });
  const privateTest = (query: string) =>
    baseTest().set('X-JWT', jwtToken).send({ query });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    restaurantsRepository = module.get<Repository<Restaurant>>(
      getRepositoryToken(Restaurant),
    );
    dishesRepository = module.get<Repository<Dish>>(getRepositoryToken(Dish));
    categoriesRepository = module.get<CategoryRepository>(
      getRepositoryToken(CategoryRepository),
    );
    await app.init();
  });

  afterAll(async () => {
    await getConnection().dropDatabase();
    app.close();
  });

  describe('createRestaurant', () => {
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
    it('생성한 계정으로 로그인 합니다.', async () => {
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
          jwtToken = token;
        });
    });
    it('현재 로그인 중인 계정의 정보를 찾습니다.', () => {
      return privateTest(`
          {
            me {
              email
            }
          }
          `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                me: { email },
              },
            },
          } = res;
          expect(email).toEqual(ownerUser.email);
        });
    });
    it('생성한 계정을 오너로 둔 음식점을 하나 생성합니다.', () => {
      return privateTest(`
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
        `)
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

    it('잘못된 규칙으로 음식점 생성을 요청할 경우 생성에 실패합니다.', () => {
      return privateTest(`
          mutation {
              createRestaurant(input:{
                name: "asd",
                address:"asd",
                coverImage:"asd",
              }) {
                ok
                error
              }
            }
          `)
        .expect(400)
        .expect((res) => {
          const {
            body: {
              errors: [
                {
                  message,
                  extensions: { code },
                },
              ],
            },
          } = res;
          expect(message).toEqual(expect.any(String));
          expect(code).toEqual('GRAPHQL_VALIDATION_FAILED');
        });
    });
  });
  describe('editRestaurant', () => {
    it.todo('기존에 만들어진 레스토랑의 이름을 수정합니다.');
    it('Client 권한을 가진 계정을 생성합니다.', () => {
      return publicTest(`
              mutation {
                createAccount(input:{
                  email: "${testUser.email}",
                  password:"${testUser.password}",
                  role:Client
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
  });
  describe('deleteRestaurant', () => {
    it.todo('test');
  });
  describe('restaurants', () => {
    it.todo('test');
  });
  describe('restaurant', () => {
    it.todo('test');
  });
  describe('searchRestaurant', () => {
    it.todo('test');
  });
});
