import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PubSub } from 'graphql-subscriptions';
import {
  NEW_COOKED_ORDER,
  NEW_ORDER_UPDATE,
  NEW_PENDING_ORDER,
  PUB_SUB,
} from 'src/common/common.constants';
import { Dish } from 'src/restaurants/entities/dish.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { User, UserRole } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { OrderItem } from './entities/order-item.entity';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderService } from './orders.service';

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
});

const mockPubsub = () => ({
  publish: jest.fn(),
});

type mockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('OrderService', () => {
  let service: OrderService;
  let ordersRepository: mockRepository<Order>;
  let restaurantsRepository: mockRepository<Restaurant>;
  let orderItemRepository: mockRepository<OrderItem>;
  let dishesRepository: mockRepository<Dish>;
  let pubsub: PubSub;
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Restaurant),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Dish),
          useValue: mockRepository(),
        },
        { provide: PUB_SUB, useValue: mockPubsub() },
      ],
    }).compile();
    service = module.get<OrderService>(OrderService);
    ordersRepository = module.get(getRepositoryToken(Order));
    restaurantsRepository = module.get(getRepositoryToken(Restaurant));
    orderItemRepository = module.get(getRepositoryToken(OrderItem));
    dishesRepository = module.get(getRepositoryToken(Dish));

    pubsub = module.get(PUB_SUB);
  });

  it('OrderService??? ???????????????', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    const createOrderArgs = {
      restaurantId: 1,
      items: [
        {
          dishId: 1,
          options: [
            {
              name: 'option2',
              choice: 'choice1',
            },
            {
              name: 'option1',
              choice: 'choice2',
            },
            {
              name: 'option3',
            },
          ],
        },
        {
          dishId: 1,
          options: [
            {
              name: 'option1',
              choice: 'choice2',
            },
            {
              name: 'option2',
              choice: 'choice1',
            },
            {
              name: 'option3',
            },
          ],
        },
      ],
    };

    let restaurant: Restaurant;
    let dish: Dish;
    let customer: User;

    beforeEach(() => {
      restaurant = new Restaurant();
      dish = new Dish();
      customer = new User();
    });
    it('????????? ???????????????.', async () => {
      const dishOptions = [
        {
          name: 'option1',
          choices: [
            {
              name: 'choice1',
            },
            {
              name: 'choice2',
              extra: 1000,
            },
          ],
        },
        {
          name: 'option2',
          choices: [
            {
              name: 'choice1',
              extra: 3000,
            },
            {
              name: 'choice2',
              extra: 2000,
            },
          ],
        },
        {
          name: 'option3',
          extra: 2000,
        },
      ];

      dish.price = 10000;
      dish.options = dishOptions;

      const totalPrice = 32000;

      restaurantsRepository.findOne.mockResolvedValue(restaurant);
      restaurant.ownerId = 1;

      dishesRepository.findOne.mockResolvedValue(dish);

      const orderItem = (element: number) => {
        return {
          dish,
          options: createOrderArgs.items[element - 1].options,
        };
      };
      orderItemRepository.create.mockReturnValueOnce(orderItem(1));
      orderItemRepository.create.mockReturnValueOnce(orderItem(2));

      orderItemRepository.save.mockResolvedValueOnce(orderItem(1));
      orderItemRepository.save.mockResolvedValueOnce(orderItem(2));

      const order = new Order();
      ordersRepository.create.mockReturnValue(order);
      ordersRepository.save.mockResolvedValue(order);

      const result = await service.createOrder(customer, createOrderArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        createOrderArgs.restaurantId,
      );

      expect(dishesRepository.findOne).toHaveBeenCalledTimes(2);

      expect(orderItemRepository.create).toHaveBeenCalledTimes(2);
      expect(orderItemRepository.create).toHaveBeenNthCalledWith(
        1,
        orderItem(1),
      );
      expect(orderItemRepository.create).toHaveBeenNthCalledWith(
        2,
        orderItem(2),
      );

      expect(orderItemRepository.save).toHaveBeenCalledTimes(2);
      expect(orderItemRepository.save).toHaveBeenNthCalledWith(1, orderItem(1));
      expect(orderItemRepository.save).toHaveBeenNthCalledWith(2, orderItem(2));

      expect(ordersRepository.create).toHaveBeenCalledTimes(1);
      expect(ordersRepository.create).toHaveBeenCalledWith({
        customer,
        restaurant,
        total: totalPrice,
        items: [orderItem(1), orderItem(2)],
      });

      expect(pubsub.publish).toHaveBeenCalledTimes(1);
      expect(pubsub.publish).toHaveBeenCalledWith(NEW_PENDING_ORDER, {
        pendingOrders: { order, ownerId: restaurant.ownerId },
      });

      expect(result).toMatchObject({
        ok: true,
      });
    });
    it('???????????? ???????????? ?????? ?????? ????????? ????????? ??? ????????????.', async () => {
      restaurantsRepository.findOne.mockResolvedValue(undefined);

      const result = await service.createOrder(customer, createOrderArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '????????? ???????????? ?????? ??? ????????????.',
      });
    });
    it('????????? ???????????? ?????? ?????? ????????? ????????? ??? ????????????.', async () => {
      restaurantsRepository.findOne.mockResolvedValue(restaurant);

      dishesRepository.findOne.mockResolvedValue(undefined);

      const result = await service.createOrder(customer, createOrderArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(dishesRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '????????? ????????? ?????? ??? ????????????.',
      });
    });
    it('????????? ????????? ?????? ????????? ????????? ??? ????????????.', async () => {
      restaurantsRepository.findOne.mockRejectedValue(new Error());

      const result = await service.createOrder(customer, createOrderArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '????????? ??? ??? ????????????.',
      });
    });
  });
  describe('getOrders', () => {
    let user: User;
    const getOrdersInputArgs = {
      status: OrderStatus.Pending,
    };

    beforeEach(() => {
      user = new User();
    });
    it('????????? ??????, ????????? ????????? ???????????? ???????????????.', async () => {
      user.role = UserRole.Client;
      const firstOrder = new Order();
      const secondOrder = new Order();

      ordersRepository.find.mockResolvedValue([firstOrder, secondOrder]);

      const result = await service.getOrders(user, getOrdersInputArgs);

      expect(ordersRepository.find).toHaveBeenCalledTimes(1);
      expect(ordersRepository.find).toHaveBeenCalledWith({
        where: {
          customer: user,
          status: getOrdersInputArgs.status,
        },
      });

      expect(result).toMatchObject({
        ok: true,
        orders: [firstOrder, secondOrder],
      });
    });
    it('??????????????? ??????, ????????? ??????????????? ?????????????????? ???????????? ???????????????.', async () => {
      user.role = UserRole.Delivery;
      const firstOrder = new Order();
      const secondOrder = new Order();

      ordersRepository.find.mockResolvedValue([firstOrder, secondOrder]);

      const result = await service.getOrders(user, getOrdersInputArgs);

      expect(ordersRepository.find).toHaveBeenCalledTimes(1);
      expect(ordersRepository.find).toHaveBeenCalledWith({
        where: {
          driver: user,
          status: getOrdersInputArgs.status,
        },
      });

      expect(result).toMatchObject({
        ok: true,
        orders: [firstOrder, secondOrder],
      });
    });
    it('????????? ????????? ??????, ????????? ????????? ????????? ????????? ???????????? ???????????????.', async () => {
      user.role = UserRole.Owner;

      const firstRestaurant = new Restaurant();
      const firstOrder = new Order();
      firstOrder.status = OrderStatus.Pending;
      firstRestaurant.orders = [firstOrder];
      const secondRestaurant = new Restaurant();
      const secondOrder = new Order();
      secondOrder.status = OrderStatus.Cooking;
      secondRestaurant.orders = [secondOrder];

      restaurantsRepository.find.mockResolvedValue([
        firstRestaurant,
        secondRestaurant,
      ]);

      const result = await service.getOrders(user, getOrdersInputArgs);

      expect(restaurantsRepository.find).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.find).toHaveBeenCalledWith({
        where: {
          owner: user,
        },
        relations: ['orders'],
      });

      expect(result).toMatchObject({
        ok: true,
        orders: [firstOrder],
      });
    });
    it('????????? ????????? ?????? ???????????? ????????? ??? ????????????.', async () => {
      user.role = UserRole.Client;

      ordersRepository.find.mockRejectedValue(new Error());

      const result = await service.getOrders(user, getOrdersInputArgs);

      expect(ordersRepository.find).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '????????? ????????? ??? ????????????.',
      });
    });
  });
  describe('getOrder', () => {
    let user: User;
    let existOrder: Order;

    const getOrderInputArgs = {
      id: 1,
    };

    beforeEach(() => {
      user = new User();
      existOrder = new Order();
    });
    it('?????? ????????? ???????????????.', async () => {
      ordersRepository.findOne.mockResolvedValue(existOrder);

      const result = await service.getOrder(user, getOrderInputArgs);

      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(ordersRepository.findOne).toHaveBeenCalledWith(
        getOrderInputArgs.id,
        {
          relations: ['restaurant'],
        },
      );

      expect(result).toMatchObject({
        ok: true,
        order: existOrder,
      });
    });
    it('orderId??? ?????? ????????? ???????????? ?????? ???????????????.', async () => {
      ordersRepository.findOne.mockResolvedValue(undefined);

      const result = await service.getOrder(user, getOrderInputArgs);

      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(ordersRepository.findOne).toHaveBeenCalledWith(
        getOrderInputArgs.id,
        {
          relations: ['restaurant'],
        },
      );

      expect(result).toMatchObject({
        ok: false,
        error: '????????? ?????? ??? ????????????.',
      });
    });
    describe('????????? ????????? ????????? ?????? ????????? ????????? ??????', () => {
      it('Client??? ??????', async () => {
        user.role = UserRole.Client;
        existOrder.customerId = 1;
        ordersRepository.findOne.mockResolvedValue(existOrder);

        const result = await service.getOrder(user, getOrderInputArgs);

        expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);
        expect(ordersRepository.findOne).toHaveBeenCalledWith(
          getOrderInputArgs.id,
          {
            relations: ['restaurant'],
          },
        );

        expect(result).toMatchObject({
          ok: false,
          error: '?????? ????????? ??? ????????? ????????????.',
        });
      });
      it('Owner??? ??????', async () => {
        user.role = UserRole.Owner;
        existOrder.restaurant = new Restaurant();
        existOrder.restaurant.ownerId = 1;
        ordersRepository.findOne.mockResolvedValue(existOrder);

        const result = await service.getOrder(user, getOrderInputArgs);

        expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);
        expect(ordersRepository.findOne).toHaveBeenCalledWith(
          getOrderInputArgs.id,
          {
            relations: ['restaurant'],
          },
        );

        expect(result).toMatchObject({
          ok: false,
          error: '?????? ????????? ??? ????????? ????????????.',
        });
      });
      it('Delivery??? ??????', async () => {
        user.role = UserRole.Delivery;
        existOrder.restaurant = new Restaurant();
        existOrder.driverId = 1;
        ordersRepository.findOne.mockResolvedValue(existOrder);

        const result = await service.getOrder(user, getOrderInputArgs);

        expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);
        expect(ordersRepository.findOne).toHaveBeenCalledWith(
          getOrderInputArgs.id,
          {
            relations: ['restaurant'],
          },
        );

        expect(result).toMatchObject({
          ok: false,
          error: '?????? ????????? ??? ????????? ????????????.',
        });
      });
    });
    it('????????? ????????? ?????? ????????? ????????? ??? ????????????.', async () => {
      ordersRepository.findOne.mockRejectedValue(new Error());

      const result = await service.getOrder(user, getOrderInputArgs);

      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '????????? ????????? ??? ????????????.',
      });
    });
  });
  describe('editOrder', () => {
    let user: User;
    let existOrder: Order;

    const editOrderInputArgs = {
      id: 1,
      status: OrderStatus.PickedUp,
    };
    beforeEach(() => {
      user = new User();
      existOrder = new Order();
    });
    describe('?????? ????????? ???????????????.', () => {
      it('???????????? ????????? ?????? ????????? ????????? ??????', async () => {
        editOrderInputArgs.status = OrderStatus.Cooked;
        user.role = UserRole.Owner;
        user.id = 1;
        existOrder.restaurant = new Restaurant();
        existOrder.restaurant.ownerId = 1;
        ordersRepository.findOne.mockResolvedValue(existOrder);

        const result = await service.editOrder(user, editOrderInputArgs);

        expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);
        expect(ordersRepository.findOne).toHaveBeenCalledWith(
          editOrderInputArgs.id,
        );

        expect(ordersRepository.save).toHaveBeenCalledTimes(1);
        expect(ordersRepository.save).toHaveBeenCalledWith([
          { id: editOrderInputArgs.id, status: editOrderInputArgs.status },
        ]);

        expect(pubsub.publish).toHaveBeenCalledTimes(2);
        expect(pubsub.publish).toHaveBeenCalledWith(NEW_COOKED_ORDER, {
          cookedOrders: { ...existOrder, status: editOrderInputArgs.status },
        });
        expect(pubsub.publish).toHaveBeenCalledWith(NEW_ORDER_UPDATE, {
          orderUpdates: { ...existOrder, status: editOrderInputArgs.status },
        });

        expect(result).toMatchObject({
          ok: true,
        });
      });
      it('???????????? ?????? ????????? ????????? ??????', async () => {
        editOrderInputArgs.status = OrderStatus.PickedUp;

        user.role = UserRole.Delivery;
        ordersRepository.findOne.mockResolvedValue(existOrder);

        const result = await service.editOrder(user, editOrderInputArgs);

        expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);
        expect(ordersRepository.findOne).toHaveBeenCalledWith(
          editOrderInputArgs.id,
        );

        expect(ordersRepository.save).toHaveBeenCalledTimes(1);
        expect(ordersRepository.save).toHaveBeenCalledWith([
          { id: editOrderInputArgs.id, status: editOrderInputArgs.status },
        ]);

        expect(pubsub.publish).toHaveBeenCalledTimes(1);
        expect(pubsub.publish).toHaveBeenCalledWith(NEW_ORDER_UPDATE, {
          orderUpdates: { ...existOrder, status: editOrderInputArgs.status },
        });

        expect(result).toMatchObject({
          ok: true,
        });
      });
    });
    it('orderId??? ?????? ????????? ???????????? ?????? ???????????????.', async () => {
      ordersRepository.findOne.mockResolvedValue(undefined);

      const result = await service.editOrder(user, editOrderInputArgs);

      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '????????? ?????? ??? ????????????.',
      });
    });
    it('????????? ????????? ????????? ?????? ????????? ?????? ????????? ??????????????? ????????? ???????????????.', async () => {
      ordersRepository.findOne.mockResolvedValue(existOrder);

      jest.spyOn(service, 'canSeeOrder').mockImplementation(() => {
        return false;
      });
      const result = await service.editOrder(user, editOrderInputArgs);

      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '?????? ????????? ??? ????????? ????????????.',
      });
    });
    it('???????????? Cooking ????????? ????????? ??????????????? ????????? ???????????????.', async () => {
      ordersRepository.findOne.mockResolvedValue(existOrder);

      editOrderInputArgs.status = OrderStatus.Cooking;
      user.role = UserRole.Delivery;

      const result = await service.editOrder(user, editOrderInputArgs);

      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '?????? ????????? ????????? ????????? ????????????.',
      });
    });
    it('????????? ????????? Delivered ????????? ????????? ??????????????? ????????? ???????????????.', async () => {
      existOrder.restaurant = new Restaurant();
      existOrder.restaurant.ownerId = user.id;
      ordersRepository.findOne.mockResolvedValue(existOrder);

      editOrderInputArgs.status = OrderStatus.Delivered;
      user.role = UserRole.Owner;

      const result = await service.editOrder(user, editOrderInputArgs);

      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '?????? ????????? ????????? ????????? ????????????.',
      });
    });
    it('????????? ????????? ?????? ????????? ????????? ??? ????????????.', async () => {
      ordersRepository.findOne.mockRejectedValue(new Error());

      const result = await service.editOrder(user, editOrderInputArgs);

      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '????????? ????????? ??? ????????????.',
      });
    });
  });
  describe('takeOrder', () => {
    let driver: User;
    let existOrder: Order;
    const takeOrderInputArgs = {
      id: 1,
    };

    beforeEach(() => {
      driver = new User();
      existOrder = new Order();
    });
    it('?????? ????????? ???????????? ?????????????????????.', async () => {
      ordersRepository.findOne.mockResolvedValue(existOrder);

      const result = await service.takeOrder(driver, takeOrderInputArgs);

      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(ordersRepository.findOne).toHaveBeenCalledWith(
        takeOrderInputArgs.id,
      );

      expect(ordersRepository.save).toHaveBeenCalledTimes(1);
      expect(ordersRepository.save).toHaveBeenCalledWith({
        id: takeOrderInputArgs.id,
        driver,
      });

      expect(pubsub.publish).toHaveBeenCalledTimes(1);
      expect(pubsub.publish).toHaveBeenCalledWith(NEW_ORDER_UPDATE, {
        orderUpdates: { ...existOrder, driver },
      });

      expect(result).toMatchObject({
        ok: true,
      });
    });
    it('orderId??? ?????? ????????? ???????????? ?????? ???????????????.', async () => {
      ordersRepository.findOne.mockResolvedValue(undefined);

      const result = await service.takeOrder(driver, takeOrderInputArgs);

      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '????????? ?????? ??? ????????????.',
      });
    });
    it('?????? ???????????? ?????????????????? ??????????????? ????????? ????????? ???????????????.', async () => {
      existOrder.driver = new User();
      ordersRepository.findOne.mockResolvedValue(existOrder);

      const result = await service.takeOrder(driver, takeOrderInputArgs);

      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '?????? ????????? ?????? ???????????? ???????????? ????????????.',
      });
    });
    it('????????? ????????? ?????? ???????????? ????????? ??? ????????????.', async () => {
      ordersRepository.findOne.mockRejectedValue(new Error());

      const result = await service.takeOrder(driver, takeOrderInputArgs);

      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '????????? ????????? ??? ????????????.',
      });
    });
  });
});
