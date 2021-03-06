import { INestApplication } from '@nestjs/common';
import { Dish } from 'src/restaurants/entities/dish.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { getConnection, Repository } from 'typeorm';
import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order, OrderStatus } from 'src/orders/entities/order.entity';
import { User } from 'src/users/entities/user.entity';

const GRAPHQL_ENDPOINT = '/graphql';

const ownerUser = {
  email: 'owner@account.com',
  password: '1234',
};

const clientUser = {
  email: 'client@account.com',
  password: '1234',
};

const deliveryUser = {
  email: 'delivery@account.com',
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

describe('OrderModule (e2e)', () => {
  let app: INestApplication;
  let usersRepository: Repository<User>;
  let ordersRepository: Repository<Order>;
  let restaurantsRepository: Repository<Restaurant>;
  let dishesRepository: Repository<Dish>;
  let clientToken: string;
  let ownerToken: string;
  let deliveryToken: string;
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
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    ordersRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    restaurantsRepository = module.get<Repository<Restaurant>>(
      getRepositoryToken(Restaurant),
    );
    dishesRepository = module.get<Repository<Dish>>(getRepositoryToken(Dish));
    await app.init();
  });

  afterAll(async () => {
    await getConnection().dropDatabase();
    app.close();
  });

  describe('createOrder', () => {
    describe('Owner ?????? ?????? ??? ???????????? ?????? ??????', () => {
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
      it('????????? ???????????? ????????? ?????????.', () => {
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
      it("????????? ????????? ????????? ??? 'Test Restaurant' ???????????? ?????? ???????????????.", () => {
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
      it("????????? 'Test Restaurant' ???????????? ????????? ?????? ????????????.", async () => {
        const restaurant = await restaurantsRepository.findOne({
          name: testRestaurant.name,
        });
        return privateTest(
          ownerToken,
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
    });
    describe('Client ?????? ??????', () => {
      it('Client ????????? ?????? ????????? ???????????????.', () => {
        return publicTest(`
            mutation {
              createAccount(input:{
                email: "${clientUser.email}",
                password:"${clientUser.password}",
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
      it('????????? ???????????? ????????? ?????????.', () => {
        return publicTest(`
          mutation {
            login(input:{
              email:"${clientUser.email}",
              password:"${clientUser.password}"
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
            clientToken = token;
          });
      });
    });
    describe('????????? ???????????? ??????', () => {
      it('???????????? ?????? ????????????Id??? ????????? ??????????????? ???????????????.', () => {
        return privateTest(
          clientToken,
          `
        mutation {
          createOrder(input: {
            restaurantId:999
            items:[
              {
                dishId:1
                options:[]
              }
            ]
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
                  createOrder: { ok, error },
                },
              },
            } = res;
            expect(ok).toBeFalsy();
            expect(error).toEqual('????????? ???????????? ?????? ??? ????????????.');
          });
      });
      it('Client ???????????? Owner???????????? ?????? ??????????????? ???????????? ?????? ????????? ????????? ??????????????? ???????????????.', async () => {
        const restaurant = await restaurantsRepository.findOne({
          name: testRestaurant.name,
        });
        return privateTest(
          clientToken,
          `
          mutation {
            createOrder(input: {
              restaurantId:${restaurant.id}
              items:[
                {
                  dishId:999
                  options:[]
                }
              ]
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
                  createOrder: { ok, error },
                },
              },
            } = res;
            expect(ok).toBeFalsy();
            expect(error).toEqual('????????? ????????? ?????? ??? ????????????.');
          });
      });
    });
    it('Client ???????????? Owner???????????? ?????? ??????????????? ????????? ???????????????.', async () => {
      const restaurant = await restaurantsRepository.findOne({
        name: testRestaurant.name,
      });
      const dish = await dishesRepository.findOne({ name: testDish.name });
      return privateTest(
        clientToken,
        `
          mutation {
            createOrder(input: {
              restaurantId:${restaurant.id}
              items:[
                {
                  dishId:${dish.id}
                  options:[
                    {
                      name:"${testDish.options[1].name}"
                    },
                    {
                      name:"${testDish.options[2].name}",
                      choice:"${testDish.options[2].choices[1].name}"
                    }
                  ]
                }
              ]
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
                createOrder: { ok, error },
              },
            },
          } = res;
          expect(ok).toBeTruthy();
          expect(error).toBeNull();

          const {
            total,
            status,
            restaurant: { id },
            customer: { email },
          } = await ordersRepository.findOne();

          expect(total).toEqual(
            testDish.price +
              testDish.options[1].extra +
              testDish.options[2].choices[1]['extra'],
          );
          expect(status).toEqual(OrderStatus.Pending);
          expect(id).toEqual(restaurant.id);
          expect(email).toEqual(clientUser.email);
        });
    });
    it('Client ???????????? Owner???????????? ?????? ??????????????? ????????? ????????? ????????? ?????? ??? ???????????????.', async () => {
      const restaurant = await restaurantsRepository.findOne({
        name: testRestaurant.name,
      });
      const dish = await dishesRepository.findOne({ name: testDish.name });
      return privateTest(
        clientToken,
        `
          mutation {
            createOrder(input: {
              restaurantId:${restaurant.id}
              items:[
                {
                  dishId:${dish.id}
                  options:[
                    {
                      name:"${testDish.options[1].name}"
                    },
                    {
                      name:"${testDish.options[2].name}",
                      choice:"${testDish.options[2].choices[2].name}"
                    },
                    {
                      name:"${testDish.options[0].name}",
                      choice:"${testDish.options[0].choices[2].name}"
                    }
                  ]
                }
              ]
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
                createOrder: { ok, error },
              },
            },
          } = res;
          expect(ok).toBeTruthy();
          expect(error).toBeNull();

          const {
            total,
            status,
            restaurant: { id },
            customer: { email },
          } = await ordersRepository.findOne(2);

          expect(total).toEqual(
            testDish.price +
              testDish.options[1].extra +
              testDish.options[2].choices[2]['extra'],
          );
          expect(status).toEqual(OrderStatus.Pending);
          expect(id).toEqual(restaurant.id);
          expect(email).toEqual(clientUser.email);
        });
    });
  });
  describe('getOrders', () => {
    it('Client??? ??????', () => {
      return privateTest(
        clientToken,
        `
        {
          getOrders(input:{
            status:Pending
          }) {
            ok
            error
            orders {
              customer {
                email
              }
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
                getOrders: { ok, error, orders },
              },
            },
          } = res;

          expect(ok).toBeTruthy();
          expect(error).toBeNull();
          expect(orders).toHaveLength(2);
          orders.map(({ customer: { email } }) => {
            expect(email).toEqual(clientUser.email);
          });
        });
    });
    it('Owner??? ??????', () => {
      return privateTest(
        ownerToken,
        `
      {
        getOrders(input:{
          status:Pending
        }) {
          ok
          error
          orders {
            restaurant {
              name
            }
          }
        }
      }
      `,
      )
        .expect(200)
        .expect(async (res) => {
          const {
            body: {
              data: {
                getOrders: { ok, error, orders },
              },
            },
          } = res;

          expect(ok).toBeTruthy();
          expect(error).toBeNull();
          expect(orders).toHaveLength(2);
          orders.map(({ restaurant: { name } }) => {
            expect(name).toEqual(testRestaurant.name);
          });
        });
    });
    describe('Delivery??? ??????', () => {
      it('Delivery ????????? ?????? ????????? ???????????????.', () => {
        return publicTest(`
            mutation {
              createAccount(input:{
                email: "${deliveryUser.email}",
                password:"${deliveryUser.password}",
                role:Delivery
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
      it('????????? ???????????? ????????? ?????????.', () => {
        return publicTest(`
          mutation {
            login(input:{
              email:"${deliveryUser.email}",
              password:"${deliveryUser.password}"
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
            deliveryToken = token;
          });
      });
      it('Delivery ???????????? ???????????? ???????????????, ?????? ???????????? ????????? ?????? ????????? ????????? ???????????? ????????????.', () => {
        return privateTest(
          deliveryToken,
          `
            {
              getOrders(input:{
                status:Pending
              }) {
                ok
                error
                orders {
                  driver {
                   email
                  }
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
                  getOrders: { ok, error, orders },
                },
              },
            } = res;

            expect(ok).toBeTruthy();
            expect(error).toBeNull();
            expect(orders).toHaveLength(0);
          });
      });
    });
  });
  describe('getOrder', () => {
    it('????????? ????????? ???????????????', () => {
      return privateTest(
        clientToken,
        `
      {
        getOrder(input:{
          id:1
        }) {
          ok
          error
          order {
            total
          }
        }
      }
      `,
      )
        .expect(200)
        .expect(async (res) => {
          const {
            body: {
              data: {
                getOrder: { ok, error, order },
              },
            },
          } = res;

          expect(ok).toBeTruthy();
          expect(error).toBeNull();
          const firstOrder = await ordersRepository.findOne(1);
          expect(order.total).toEqual(firstOrder.total);
        });
    });
    it('???????????? ?????? ????????? ????????????????????? ???????????????.', () => {
      return privateTest(
        clientToken,
        `
      {
        getOrder(input:{
          id:999
        }) {
          ok
          error
          order {
            total
          }
        }
      }
      `,
      )
        .expect(200)
        .expect(async (res) => {
          const {
            body: {
              data: {
                getOrder: { ok, error, order },
              },
            },
          } = res;

          expect(ok).toBeFalsy();
          expect(error).toEqual('????????? ?????? ??? ????????????.');
          expect(order).toBeNull();
        });
    });
    describe('????????? ??? ????????? ?????? ??????', () => {
      it('Client ????????? ?????? ??? ????????? ???????????????.', () => {
        return publicTest(`
            mutation {
              createAccount(input:{
                email: "${notAllowedUser.email}",
                password:"${notAllowedUser.password}",
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
      it('????????? ???????????? ????????? ?????????.', () => {
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
      it('??? ???????????? ????????? ????????????????????? ???????????????.', () => {
        return privateTest(
          notAllowedUserToken,
          `
        {
          getOrder(input:{
            id:1
          }) {
            ok
            error
            order {
              total
            }
          }
        }
        `,
        )
          .expect(200)
          .expect(async (res) => {
            const {
              body: {
                data: {
                  getOrder: { ok, error, order },
                },
              },
            } = res;

            expect(ok).toBeFalsy();
            expect(error).toEqual('?????? ????????? ??? ????????? ????????????.');
            expect(order).toBeNull();
          });
      });
    });
  });
  describe('editOrder', () => {
    it('????????? ????????? ????????? ????????? ????????? ???????????? Cooked ????????? ???????????????.', () => {
      return privateTest(
        ownerToken,
        `
        mutation {
          editOrder(input: {
            id:2,
            status:Cooked,
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
                editOrder: { ok, error },
              },
            },
          } = res;
          expect(ok).toBeTruthy();
          expect(error).toBeNull();
          const { status } = await ordersRepository.findOne(2);
          expect(status).toEqual(OrderStatus.Cooked);
        });
    });
    it('???????????? ?????? ????????? ????????????????????? ???????????????.', () => {
      return privateTest(
        ownerToken,
        `
        mutation {
          editOrder(input: {
            id:999,
            status:Cooked,
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
                editOrder: { ok, error },
              },
            },
          } = res;
          expect(ok).toBeFalsy();
          expect(error).toEqual('????????? ?????? ??? ????????????.');
        });
    });
    it('????????? ??? ????????? ?????? ???????????? ????????? ????????????????????? ???????????????.', () => {
      return privateTest(
        deliveryToken,
        `
        mutation {
          editOrder(input: {
            id:1,
            status:Cooked,
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
                editOrder: { ok, error },
              },
            },
          } = res;
          expect(ok).toBeFalsy();
          expect(error).toEqual('?????? ????????? ??? ????????? ????????????.');
        });
    });
    it('????????? ??? ????????? ?????? ????????????, ????????? ?????? ?????? ????????? ????????? ????????????????????? ???????????????.', () => {
      return privateTest(
        ownerToken,
        `
          mutation {
            editOrder(input: {
              id:1,
              status:Delivered,
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
                editOrder: { ok, error },
              },
            },
          } = res;
          expect(ok).toBeFalsy();
          expect(error).toEqual('?????? ????????? ????????? ????????? ????????????.');
        });
    });
  });
  describe('takeOrder', () => {
    it('????????? ????????? ???????????? ???????????????.', () => {
      return privateTest(
        deliveryToken,
        `
      mutation {
        takeOrder(input:{
          id:2
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
                takeOrder: { ok, error },
              },
            },
          } = res;
          expect(ok).toBeTruthy();
          expect(error).toBeNull();
          const { driverId } = await ordersRepository.findOne(2);
          const { id } = await usersRepository.findOne({
            email: deliveryUser.email,
          });
          expect(driverId).toEqual(id);
        });
    });
    it('?????? ???????????? ????????? ????????? PickedUp ????????? ???????????????.', () => {
      return privateTest(
        deliveryToken,
        `
        mutation {
          editOrder(input: {
            id:2,
            status:PickedUp,
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
                editOrder: { ok, error },
              },
            },
          } = res;
          expect(ok).toBeTruthy();
          expect(error).toBeNull();
          const { status } = await ordersRepository.findOne(2);
          expect(status).toEqual(OrderStatus.PickedUp);
        });
    });
    it('???????????? ?????? ????????? ???????????? ????????????????????? ???????????????.', () => {
      return privateTest(
        deliveryToken,
        `
      mutation {
        takeOrder(input:{
          id:999
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
                takeOrder: { ok, error },
              },
            },
          } = res;
          expect(ok).toBeFalsy();
          expect(error).toEqual('????????? ?????? ??? ????????????.');
        });
    });
    it('????????? ????????? ?????? ???????????? ?????????????????????, ?????? ?????? ????????? ????????? ???????????????.', () => {
      return privateTest(
        deliveryToken,
        `
        mutation {
          takeOrder(input:{
            id:2
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
                takeOrder: { ok, error },
              },
            },
          } = res;
          expect(ok).toBeFalsy();
          expect(error).toEqual('?????? ????????? ?????? ???????????? ???????????? ????????????.');
        });
    });
  });
});
