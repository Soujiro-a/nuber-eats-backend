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
    it('Owner ????????? ?????? ????????? ???????????????.', () => {
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
    it('????????? ???????????? ????????? ?????????.', async () => {
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
    it('?????? ????????? ?????? ????????? ????????? ????????????.', () => {
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
    it('????????? ????????? ????????? ??? ???????????? ?????? ???????????????.', () => {
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
    it('????????? ???????????? ????????? ????????? ????????? ?????? ????????? ???????????????.', () => {
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
    it('????????? ???????????? ???????????? ????????? ???????????????.', async () => {
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
    describe('????????? ?????? ????????? ???????????????.', () => {
      it('?????????Id??? ???????????? ?????? ??????', async () => {
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
      it('???????????? ?????? ?????????Id??? ???????????? ??????', async () => {
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
            expect(error).toEqual('???????????? ?????? ??? ????????????.');
          });
      });
      describe('???????????? ????????? ?????? ??????', () => {
        it('Owner ????????? ?????? ??? ????????? ????????????.', () => {
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
        it('??? ???????????? ???????????? ???????????????.', () => {
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
        it('??? ????????? ????????? ???????????? ????????? ?????? ????????? ??????????????? ???????????????.', async () => {
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
                '?????? ???????????? ????????? ????????? ????????? ????????? ????????? ??? ????????????.',
              );
            });
        });
      });
    });
  });
  describe('deleteRestaurant', () => {
    describe('????????? ????????? ???????????????.', () => {
      it('???????????? ????????? ?????? ??????', async () => {
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
              '?????? ???????????? ????????? ????????? ????????? ????????? ????????? ??? ????????????.',
            );
          });
      });
      it('???????????? ?????? ?????????Id??? ???????????? ??????', () => {
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
            expect(error).toBe('???????????? ?????? ??? ????????????.');
          });
      });
    });

    it('????????? ?????? ???????????? ???????????????.', async () => {
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
    describe('?????? ??????????????? ?????? ??? ????????? ??????', () => {
      it('owner@account.com ????????? ????????? ??? ???????????? ?????? ???????????????.', () => {
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
      it('temp@account.com ????????? ????????? ??? ???????????? ?????? ???????????????.', () => {
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
    it('??????????????? ???????????????.', () => {
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
    it('???????????? ???????????????.', async () => {
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

    it('???????????? ?????? ?????????Id??? ???????????? ?????? ????????? ????????? ???????????????.', () => {
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
          expect(error).toEqual('???????????? ???????????? ????????????.');
          expect(restaurant).toBeNull();
        });
    });
  });
  describe('searchRestaurant', () => {
    describe('??????????????? ?????? ???????????? ????????????.', () => {
      it("'Test' ??? ???????????? ???", () => {
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
      it("'Restaurant' ??? ???????????? ???", () => {
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
    it('?????? ??????????????? ???????????????.', () => {
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
    it('???????????? ??????????????? ???????????? ???????????? ???????????????.', async () => {
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
    it('???????????? ??????????????? ???????????? ?????? ???????????? ????????? ??? ????????????.', () => {
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
          expect(error).toEqual('??????????????? ?????? ??? ????????????.');
        });
    });
    it('????????? ???????????? ????????? ?????? ???????????? ????????? ??? ????????????.', () => {
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
    it("'Test Restaurant' ???????????? ????????? ?????? ????????????.", async () => {
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
    describe('?????? ????????? ???????????????.', () => {
      it('???????????? ?????? ???????????? ?????? ????????? ????????? ??????', () => {
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
            expect(error).toEqual('???????????? ?????? ??? ????????????.');
          });
      });

      it('???????????? ????????? ?????? ??????', async () => {
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
              '?????? ???????????? ????????? ????????? ????????? ????????? ??? ????????????.',
            );
          });
      });
    });
  });
  describe('editDish', () => {
    it("'Test Restaurant' ???????????? ?????? ?????? ????????? ???????????????.", async () => {
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
    describe('?????? ????????? ???????????????.', () => {
      it('???????????? ?????? ????????? ?????? ????????? ????????? ??????', () => {
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
            expect(error).toEqual('??????????????? ?????? ????????? ???????????? ????????????.');
          });
      });
      it('???????????? ????????? ?????? ??????', async () => {
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
              '?????? ???????????? ????????? ????????? ????????? ????????? ??? ????????????.',
            );
          });
      });
    });
  });
  describe('deleteDish', () => {
    describe('?????? ????????? ???????????????.', () => {
      it('???????????? ?????? ????????? ??????????????? ??? ??????', () => {
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
            expect(error).toEqual('?????????????????? ????????? ???????????? ????????????.');
          });
      });
      it('???????????? ????????? ?????? ??????', async () => {
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
              '?????? ???????????? ????????? ????????? ????????? ????????? ??? ????????????.',
            );
          });
      });
    });
    it("'Test Restaurant' ???????????? ?????? ????????? ???????????????.", async () => {
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
