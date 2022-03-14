import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Dish } from 'src/restaurants/entities/dish.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { CategoryRepository } from 'src/restaurants/repositories/category.repository';
import { getConnection, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

const GRAPHQL_ENDPOINT = '/graphql';

const ownerUser = {
  email: 'owner@account.com',
  password: '1234',
};

const tempOwnerUser = {
  email: 'temp@account.com',
  password: '1234',
};

const testRestaurant = {
  name: 'Test Restaurant',
  address: 'Test Address',
  coverImage: 'https://TestCoverImage.com',
  categoryName: 'Test Category',
};

const tempRestaurant = {
  name: 'Temp Restaurant',
  address: 'Temp Address',
  coverImage: 'https://TempCoverImage.com',
  categoryName: 'Temp Category',
};

const editRestaurantArgs = {
  name: 'Edit Restaurant',
  address: 'Edit Address',
};

const tempEditRestaurantArgs = {
  name: 'TempEdit Restaurant',
  address: 'TempEdit Address',
};

const testDish = {
  name: 'Test Dish',
  price: 12000,
  description: 'Testing Menu',
  options: [
    {
      name: 'spice Level',
      choices: [
        { name: 'Little bit' },
        { name: 'Medium' },
        { name: 'Kill me' },
      ],
    },
    {
      name: 'source',
      extra: 1000,
    },
    {
      name: 'Size',
      choices: [
        { name: 'X', extra: 1000 },
        { name: 'L', extra: 2000 },
        { name: 'XL', extra: 3000 },
      ],
    },
  ],
};

describe('RestaurantModule (e2e)', () => {
  let app: INestApplication;
  let restaurantsRepository: Repository<Restaurant>;
  let dishesRepository: Repository<Dish>;
  let categoriesRepository: CategoryRepository;
  let jwtToken: string;
  let tempToken: string;

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
      return privateTest(
        jwtToken,
        `
          {
            me {
              email
            }
          }
          `,
      )
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
      return privateTest(
        jwtToken,
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
    it('잘못된 규칙으로 음식점 생성을 요청할 경우 생성에 실패합니다.', () => {
      return privateTest(
        jwtToken,
        `
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
          `,
      )
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
    it('기존에 만들어진 음식점의 이름을 수정합니다.', async () => {
      const [restaurant] = await restaurantsRepository.find();
      return privateTest(
        jwtToken,
        `
      mutation {
        editRestaurant(input:{
          restaurantId:${restaurant.id},
          name:"${editRestaurantArgs.name}",
          address:"${editRestaurantArgs.address}",
        }) {
          ok
          error
        }
      }`,
      )
        .expect(200)
        .expect(async (res) => {
          const {
            body: {
              data: {
                editRestaurant: { ok, error },
              },
            },
          } = res;
          expect(ok).toBeTruthy();
          expect(error).toBeNull();

          const [editRestaurant] = await restaurantsRepository.find();
          expect(editRestaurant.name).toBe(editRestaurantArgs.name);
          expect(editRestaurant.address).toBe(editRestaurantArgs.address);
        });
    });
    describe('음식점 이름 수정에 실패합니다.', () => {
      it('음식점Id을 제공하지 않는 경우', async () => {
        return privateTest(
          jwtToken,
          `
        mutation {
          editRestaurant(input:{
            name:"${editRestaurantArgs.name}",
            address:"${editRestaurantArgs.address}",
          }) {
            ok
            error
          }
        }`,
        )
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
      it('존재하지 않는 음식점Id를 제공하는 경우', async () => {
        return privateTest(
          jwtToken,
          `
        mutation {
          editRestaurant(input:{
            restaurantId:999,
            name:"${editRestaurantArgs.name}",
            address:"${editRestaurantArgs.address}",
          }) {
            ok
            error
          }
        }`,
        )
          .expect(200)
          .expect((res) => {
            const {
              body: {
                data: {
                  editRestaurant: { ok, error },
                },
              },
            } = res;
            expect(ok).toBeFalsy();
            expect(error).toEqual('음식점을 찾을 수 없습니다.');
          });
      });
      describe('음식점의 주인이 아닌 경우', () => {
        it('Owner 권한을 가진 새 계정을 만듭니다.', () => {
          return publicTest(`
          mutation {
            createAccount(input:{
              email: "${tempOwnerUser.email}",
              password:"${tempOwnerUser.password}",
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
        it('새 계정으로 로그인을 진행합니다.', () => {
          return publicTest(`
          mutation {
            login(input:{
              email:"${tempOwnerUser.email}",
              password:"${tempOwnerUser.password}"
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
              tempToken = token;
            });
        });
        it('새 유저로 기존에 만들어진 음식점 정보 수정을 시도하지만 실패합니다.', async () => {
          const [restaurant] = await restaurantsRepository.find();
          return privateTest(
            tempToken,
            `
            mutation {
              editRestaurant(input:{
                restaurantId:${restaurant.id},
                name:"${tempEditRestaurantArgs.name}",
                address:"${tempEditRestaurantArgs.address}",
              }) {
                ok
                error
              }
            }`,
          )
            .expect(200)
            .expect(async (res) => {
              const {
                body: {
                  data: {
                    editRestaurant: { ok, error },
                  },
                },
              } = res;
              expect(ok).toBeFalsy();
              expect(error).toBe(
                '해당 음식점의 오너가 아니면 음식점 정보를 수정할 수 없습니다.',
              );
            });
        });
      });
    });
  });
  describe('deleteRestaurant', () => {
    describe('음식점 삭제에 실패합니다.', () => {
      it('음식점의 주인이 아닌 경우', async () => {
        const [restaurant] = await restaurantsRepository.find();
        return privateTest(
          tempToken,
          `
        mutation {
          deleteRestaurant(input:{
            restaurantId:${restaurant.id}
          }) {
            ok
            error
          }
        }`,
        )
          .expect(200)
          .expect(async (res) => {
            const {
              body: {
                data: {
                  deleteRestaurant: { ok, error },
                },
              },
            } = res;
            expect(ok).toBeFalsy();
            expect(error).toBe(
              '해당 음식점의 오너가 아니면 음식점 정보를 삭제할 수 없습니다.',
            );
          });
      });
      it('존재하지 않는 음식점Id를 제공하는 경우', () => {
        return privateTest(
          jwtToken,
          `
        mutation {
          deleteRestaurant(input:{
            restaurantId:999,
          }) {
            ok
            error
          }
        }`,
        )
          .expect(200)
          .expect(async (res) => {
            const {
              body: {
                data: {
                  deleteRestaurant: { ok, error },
                },
              },
            } = res;
            expect(ok).toBeFalsy();
            expect(error).toBe('음식점을 찾을 수 없습니다.');
          });
      });
    });

    it('기존에 만든 음식점을 삭제합니다.', async () => {
      const [restaurant] = await restaurantsRepository.find();
      return privateTest(
        jwtToken,
        `
      mutation {
        deleteRestaurant(input:{
          restaurantId:${restaurant.id}
        }) {
          ok
          error
        }
      }`,
      )
        .expect(200)
        .expect(async (res) => {
          const {
            body: {
              data: {
                deleteRestaurant: { ok, error },
              },
            },
          } = res;
          expect(ok).toBeTruthy();
          expect(error).toBeNull();

          const afterRestaurants = await restaurantsRepository.find();
          expect(afterRestaurants).toHaveLength(0);
        });
    });
  });
  describe('restaurants', () => {
    describe('여러 음식점들을 위한 새 음식점 생성', () => {
      it('owner@account.com 계정을 오너로 둔 음식점을 하나 생성합니다.', () => {
        return privateTest(
          jwtToken,
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
      it('temp@account.com 계정을 오너로 둔 음식점을 하나 생성합니다.', () => {
        return privateTest(
          tempToken,
          `
          mutation {
              createRestaurant(input:{
                name: "${tempRestaurant.name}",
                address:"${tempRestaurant.address}",
                coverImage:"${tempRestaurant.coverImage}",
                categoryName:"${tempRestaurant.categoryName}",
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
    it('음식점들을 조회합니다.', () => {
      return publicTest(`
      {
        restaurants(input:{
          page:1
        }) {
          ok
          error
          totalPages
          totalResults
          results {
            id
            name
          }
        }
      }`)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                restaurants: { ok, error, totalPages, totalResults, results },
              },
            },
          } = res;
          expect(ok).toBeTruthy();
          expect(error).toBeNull();
          expect(totalPages).toEqual(1);
          expect(totalResults).toEqual(2);
          expect(results).toHaveLength(2);
        });
    });
  });
  describe('restaurant', () => {
    it('음식점을 조회합니다.', async () => {
      const testRestaurant = await restaurantsRepository.findOne();
      return publicTest(`{
        restaurant(input: { restaurantId: ${testRestaurant.id} }) {
          ok
          error
          restaurant {
            name
          }
        }
      }
      `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                restaurant: {
                  ok,
                  error,
                  restaurant: { name },
                },
              },
            },
          } = res;
          expect(ok).toBeTruthy();
          expect(error).toBeNull();
          expect(name).toEqual(testRestaurant.name);
        });
    });

    it('존재하지 않는 음식점Id를 제공하는 경우 음식점 조회에 실패합니다.', () => {
      return publicTest(`{
        restaurant(input: { restaurantId: 999 }) {
          ok
          error
          restaurant {
            name
          }
        }
      }
      `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                restaurant: { ok, error, restaurant },
              },
            },
          } = res;
          expect(ok).toBeFalsy();
          expect(error).toEqual('음식점이 존재하지 않습니다.');
          expect(restaurant).toBeNull();
        });
    });
  });
  describe('searchRestaurant', () => {
    describe('검색조건에 맞는 음식점을 찾습니다.', () => {
      it("'Test' 로 검색했을 때", () => {
        return publicTest(`
        {
          searchRestaurant(input: { query: "Test", page: 1 }) {
            ok
            error
            totalPages
            totalResults
            restaurants {
              name
            }
          }
        }
        `)
          .expect(200)
          .expect((res) => {
            const {
              body: {
                data: {
                  searchRestaurant: {
                    ok,
                    error,
                    totalPages,
                    totalResults,
                    restaurants,
                  },
                },
              },
            } = res;
            expect(ok).toBeTruthy();
            expect(error).toBeNull();
            expect(totalPages).toEqual(1);
            expect(totalResults).toEqual(1);
            expect(restaurants).toHaveLength(1);
          });
      });
      it("'Restaurant' 로 검색했을 때", () => {
        return publicTest(`
        {
          searchRestaurant(input: { query: "Restaurant", page: 1 }) {
            ok
            error
            totalPages
            totalResults
            restaurants {
              name
            }
          }
        }
        `)
          .expect(200)
          .expect((res) => {
            const {
              body: {
                data: {
                  searchRestaurant: {
                    ok,
                    error,
                    totalPages,
                    totalResults,
                    restaurants,
                  },
                },
              },
            } = res;
            expect(ok).toBeTruthy();
            expect(error).toBeNull();
            expect(totalPages).toEqual(1);
            expect(totalResults).toEqual(2);
            expect(restaurants).toHaveLength(2);
          });
      });
    });
  });

  describe('allCategories', () => {
    it('모든 카테고리를 불러옵니다.', () => {
      return publicTest(`
      {
        allCategories {
          ok
          error
          categories {
            name
            slug
          }
        }
      }`)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                allCategories: { ok, error, categories },
              },
            },
          } = res;
          expect(ok).toBeTruthy();
          expect(error).toBeNull();
          expect(categories).toHaveLength(2);
        });
    });
  });
  describe('category', () => {
    it('입력받은 카테고리에 해당하는 음식점을 불러옵니다.', async () => {
      const findCategory = await categoriesRepository.findOne();
      return publicTest(`
      {
        category(input:{
          slug:"${findCategory.slug}",
          page:1
        }) {
          ok
          error
          totalPages
          totalResults
          category {
            name
          }
          restaurants {
            name
          }
        }
      }`)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                category: {
                  ok,
                  error,
                  totalPages,
                  totalResults,
                  category,
                  restaurants,
                },
              },
            },
          } = res;
          expect(ok).toBeTruthy();
          expect(error).toBeNull();
          expect(totalPages).toEqual(1);
          expect(totalResults).toEqual(1);
          expect(category.name).toBe(findCategory.name);
          expect(restaurants).toHaveLength(1);
        });
    });
    it('입력받은 카테고리가 존재하지 않아 음식점을 불러올 수 없습니다.', () => {
      return publicTest(`
      {
        category(input:{
          slug:"NOTNING_SLUG",
          page:1
        }) {
          ok
          error
        }
      }`)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                category: { ok, error },
              },
            },
          } = res;
          expect(ok).toBeFalsy();
          expect(error).toEqual('카테고리를 찾을 수 없습니다.');
        });
    });
    it('잘못된 규칙으로 요청할 경우 음식점을 불러올 수 없습니다.', () => {
      return publicTest(`
      {
        category(input:{
          slug:NOTNING_SLUG,
          page:1
        }) {
          ok
          error
        }
      }`)
        .expect(400)
        .expect((res) => {
          const {
            body: {
              errors: [{ message, locations, extensions }],
            },
          } = res;
          expect(message).toEqual(expect.any(String));
          expect(locations).toEqual([
            { column: expect.any(Number), line: expect.any(Number) },
          ]);
          expect(extensions).toMatchObject({
            code: 'GRAPHQL_VALIDATION_FAILED',
          });
        });
    });
  });

  describe('createDish', () => {
    it("'Test Restaurant' 음식점에 메뉴를 하나 만듭니다.", async () => {
      const restaurant = await restaurantsRepository.findOne({
        name: testRestaurant.name,
      });
      return privateTest(
        jwtToken,
        `
        mutation {
          createDish(input:{
            restaurantId:${restaurant.id}
            name:"${testDish.name}"
            price:${testDish.price},
            description:"${testDish.description}",
            options: [
              {
                name:"${testDish.options[0].name}", 
                choices:[{name:"${testDish.options[0].choices[0].name}"},{name:"${testDish.options[0].choices[1].name}"},{name:"${testDish.options[0].choices[2].name}"}]
              },
              {
                name:"${testDish.options[1].name}",
                extra:${testDish.options[1].extra}
              },
              {
                name:"${testDish.options[2].name}", 
                choices:[{name:"${testDish.options[2].choices[0]['name']}", extra:${testDish.options[2].choices[0]['extra']}}, {name:"${testDish.options[2].choices[1]['name']}", extra:${testDish.options[2].choices[1]['extra']}}, {name:"${testDish.options[2].choices[2]['name']}", extra:${testDish.options[2].choices[2]['extra']}}]
              }
            ]
          }) {
            ok
            error
          }
        }`,
      )
        .expect(200)
        .expect(async (res) => {
          const {
            body: {
              data: {
                createDish: { ok, error },
              },
            },
          } = res;
          expect(ok).toBeTruthy();
          expect(error).toBeNull();

          const dishes = await dishesRepository.find();
          expect(dishes).toHaveLength(1);
        });
    });
    describe('메뉴 생성에 실패합니다.', () => {
      it('존재하지 않는 음식점에 메뉴 생성을 시도할 경우', () => {
        return privateTest(
          jwtToken,
          `
        mutation {
          createDish(input:{
            restaurantId:999
            name:"Maxican Chicken"
            price:12000,
            description:"Delicious Chicken",
            options: [
              {
                name:"spice Level", 
                choices:[{name:"Little bit"},{name:"Medium"},{name:"Kill me"}]
              },
              {
                name:"source",
                extra:1000
              },
              {
                name:"Size", 
                choices:[{name:"X", extra:1000}, {name:"L", extra:2000}, {name:"XL", extra:3000}]
              }
            ]
          }) {
            ok
            error
          }
        }`,
        )
          .expect(200)
          .expect(async (res) => {
            const {
              body: {
                data: {
                  createDish: { ok, error },
                },
              },
            } = res;
            expect(ok).toBeFalsy();
            expect(error).toEqual('음식점을 찾을 수 없습니다.');
          });
      });

      it('음식점의 주인이 아닐 경우', async () => {
        const restaurant = await restaurantsRepository.findOne({
          name: testRestaurant.name,
        });
        return privateTest(
          tempToken,
          `
        mutation {
          createDish(input:{
            restaurantId:${restaurant.id}
            name:"Maxican Chicken"
            price:12000,
            description:"Delicious Chicken",
            options: [
              {
                name:"spice Level", 
                choices:[{name:"Little bit"},{name:"Medium"},{name:"Kill me"}]
              },
              {
                name:"source",
                extra:1000
              },
              {
                name:"Size", 
                choices:[{name:"X", extra:1000}, {name:"L", extra:2000}, {name:"XL", extra:3000}]
              }
            ]
          }) {
            ok
            error
          }
        }`,
        )
          .expect(200)
          .expect((res) => {
            const {
              body: {
                data: {
                  createDish: { ok, error },
                },
              },
            } = res;
            expect(ok).toBeFalsy();
            expect(error).toEqual(
              '해당 음식점의 오너가 아니면 메뉴를 생성할 수 없습니다.',
            );
          });
      });
    });
  });
  describe('editDish', () => {
    it("'Test Restaurant' 음식점에 만든 메뉴 이름을 수정합니다.", async () => {
      const dish = await dishesRepository.findOne();
      const EDIT_DISH_NAME = 'Super Maxican Chicken';
      return privateTest(
        jwtToken,
        `
      mutation{
        editDish(input:{
          dishId:${dish.id},
          name:"${EDIT_DISH_NAME}"
        }) {
          ok
          error
        }
      }`,
      )
        .expect(200)
        .expect(async (res) => {
          const {
            body: {
              data: {
                editDish: { ok, error },
              },
            },
          } = res;
          expect(ok).toBeTruthy();
          expect(error).toBeNull();

          const afterDish = await dishesRepository.findOne();
          expect(afterDish.name).toBe(EDIT_DISH_NAME);
        });
    });
    describe('메뉴 수정에 실패합니다.', () => {
      it('존재하지 않는 메뉴에 대한 수정을 시도할 경우', () => {
        return privateTest(
          jwtToken,
          `
        mutation{
          editDish(input:{
            dishId:999,
            name:"EDIT_DISH_NAME"
          }) {
            ok
            error
          }
        }`,
        )
          .expect(200)
          .expect((res) => {
            const {
              body: {
                data: {
                  editDish: { ok, error },
                },
              },
            } = res;
            expect(ok).toBeFalsy();
            expect(error).toEqual('수정하고자 하는 메뉴가 존재하지 않습니다.');
          });
      });
      it('음식점의 주인이 아닐 경우', async () => {
        const dish = await dishesRepository.findOne();
        return privateTest(
          tempToken,
          `
      mutation{
        editDish(input:{
          dishId:${dish.id},
          name:"EDIT_DISH_NAME"
        }) {
          ok
          error
        }
      }`,
        )
          .expect(200)
          .expect((res) => {
            const {
              body: {
                data: {
                  editDish: { ok, error },
                },
              },
            } = res;
            expect(ok).toBeFalsy();
            expect(error).toEqual(
              '해당 음식점의 오너가 아니면 메뉴를 수정할 수 없습니다.',
            );
          });
      });
    });
  });
  describe('deleteDish', () => {
    describe('메뉴 삭제에 실패합니다.', () => {
      it('존재하지 않는 메뉴를 삭제하려고 할 경우', () => {
        return privateTest(
          jwtToken,
          `
        ,mutation {
          deleteDish(input:{
            dishId:999
          }) {
            ok
            error
          }
        }`,
        )
          .expect(200)
          .expect((res) => {
            const {
              body: {
                data: {
                  deleteDish: { ok, error },
                },
              },
            } = res;
            expect(ok).toBeFalsy();
            expect(error).toEqual('지우고자하는 메뉴가 존재하지 않습니다.');
          });
      });
      it('음식점의 주인이 아닐 경우', async () => {
        const dish = await dishesRepository.findOne();
        return privateTest(
          tempToken,
          `
        ,mutation {
          deleteDish(input:{
            dishId:${dish.id}
          }) {
            ok
            error
          }
        }`,
        )
          .expect(200)
          .expect((res) => {
            const {
              body: {
                data: {
                  deleteDish: { ok, error },
                },
              },
            } = res;
            expect(ok).toBeFalsy();
            expect(error).toEqual(
              '해당 음식점의 오너가 아니면 메뉴를 삭제할 수 없습니다.',
            );
          });
      });
    });
    it("'Test Restaurant' 음식점에 만든 메뉴를 삭제합니다.", async () => {
      const dish = await dishesRepository.findOne();
      return privateTest(
        jwtToken,
        `
      ,mutation {
        deleteDish(input:{
          dishId:${dish.id}
        }) {
          ok
          error
        }
      }`,
      )
        .expect(200)
        .expect(async (res) => {
          const {
            body: {
              data: {
                deleteDish: { ok, error },
              },
            },
          } = res;
          expect(ok).toBeTruthy();
          expect(error).toBeNull();

          const dishes = await dishesRepository.find();
          expect(dishes).toHaveLength(0);
        });
    });
  });
});
