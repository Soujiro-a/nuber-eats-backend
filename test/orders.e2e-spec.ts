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
    describe('Owner 계정 생성 및 음식점과 메뉴 생성', () => {
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
      it("생성한 'Test Restaurant' 음식점에 메뉴를 하나 만듭니다.", async () => {
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
    describe('Client 계정 생성', () => {
      it('Client 권한을 가진 계정을 생성합니다.', () => {
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
      it('생성한 계정으로 로그인 합니다.', () => {
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
    describe('주문에 실패하는 경우', () => {
      it('존재하지 않는 레스토랑Id로 주문을 하려했으나 실패합니다.', () => {
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
            expect(error).toEqual('주문한 음식점을 찾을 수 없습니다.');
          });
      });
      it('Client 계정으로 Owner계정으로 만든 음식점에서 존재하지 않는 메뉴로 주문을 하려했으나 실패합니다.', async () => {
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
            expect(error).toEqual('주문한 음식을 찾을 수 없습니다.');
          });
      });
    });
    it('Client 계정으로 Owner계정으로 만든 음식점에서 메뉴를 주문합니다.', async () => {
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
    it('Client 계정으로 Owner계정으로 만든 음식점에서 메뉴를 옵션만 바꾸어 한번 더 주문합니다.', async () => {
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
    it('Client일 경우', () => {
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
    it('Owner일 경우', () => {
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
    describe('Delivery일 경우', () => {
      it('Delivery 권한을 가진 계정을 생성합니다.', () => {
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
      it('생성한 계정으로 로그인 합니다.', () => {
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
      it('Delivery 계정으로 주문들을 불러오지만, 아직 배정받은 주문이 없어 아무런 주문도 불러오지 못합니다.', () => {
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
    it('첫번째 주문을 불러옵니다', () => {
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
    it('존재하지 않는 주문을 불러오려했으나 실패합니다.', () => {
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
          expect(error).toEqual('주문을 찾을 수 없습니다.');
          expect(order).toBeNull();
        });
    });
    describe('주문을 볼 권한이 없는 경우', () => {
      it('Client 권한을 가진 새 계정을 생성합니다.', () => {
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
      it('새 사용자로 주문을 조회하려하지만 실패합니다.', () => {
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
            expect(error).toEqual('해당 주문을 볼 권한이 없습니다.');
            expect(order).toBeNull();
          });
      });
    });
  });
  describe('editOrder', () => {
    it('음식점 주인이 자신의 두번째 주문을 수정하여 Cooked 상태로 변경합니다.', () => {
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
    it('존재하지 않는 주문을 수정하려했으나 실패합니다.', () => {
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
          expect(error).toEqual('주문을 찾을 수 없습니다.');
        });
    });
    it('주문을 볼 권한이 없는 사용자가 주문을 수정하려하지만 실패합니다.', () => {
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
          expect(error).toEqual('해당 주문을 볼 권한이 없습니다.');
        });
    });
    it('주문을 볼 권한은 있는 사용자가, 자신의 권한 밖의 상태로 강제로 수정하려하지만 실패합니다.', () => {
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
          expect(error).toEqual('해당 주문을 수정할 권한이 없습니다.');
        });
    });
  });
  describe('takeOrder', () => {
    it('두번째 주문에 배달원을 배정합니다.', () => {
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
    it('해당 배달원이 두번째 주문을 PickedUp 상태로 변경합니다.', () => {
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
    it('존재하지 않는 주문에 배달원을 배정하려했으나 실패합니다.', () => {
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
          expect(error).toEqual('주문을 찾을 수 없습니다.');
        });
    });
    it('두번째 주문에 다시 배달원을 배정하려했으나, 이미 있기 때문에 배정에 실패합니다.', () => {
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
          expect(error).toEqual('해당 주문은 이미 배달원이 배정되어 있습니다.');
        });
    });
  });
});
