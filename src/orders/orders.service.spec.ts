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

  it('OrderService를 정의합니다', () => {
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
    it('주문을 생성합니다.', async () => {
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
    it('음식점이 존재하지 않는 경우 주문을 생성할 수 없습니다.', async () => {
      restaurantsRepository.findOne.mockResolvedValue(undefined);

      const result = await service.createOrder(customer, createOrderArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '주문한 음식점을 찾을 수 없습니다.',
      });
    });
    it('음식이 존재하지 않는 경우 주문을 생성할 수 없습니다.', async () => {
      restaurantsRepository.findOne.mockResolvedValue(restaurant);

      dishesRepository.findOne.mockResolvedValue(undefined);

      const result = await service.createOrder(customer, createOrderArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(dishesRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '주문한 음식을 찾을 수 없습니다.',
      });
    });
    it('예외가 발생한 경우 주문을 생성할 수 없습니다.', async () => {
      restaurantsRepository.findOne.mockRejectedValue(new Error());

      const result = await service.createOrder(customer, createOrderArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '주문을 할 수 없습니다.',
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
    it('고객인 경우, 본인이 신청한 주문들을 불러옵니다.', async () => {
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
    it('드라이버인 경우, 본인이 배달원으로 배정되어있는 주문들을 불러옵니다.', async () => {
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
    it('음식점 주인인 경우, 본인의 음식점 앞으로 들어온 주문들을 불러옵니다.', async () => {
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
    it('예외가 발생한 경우 주문들을 받아올 수 없습니다.', async () => {
      user.role = UserRole.Client;

      ordersRepository.find.mockRejectedValue(new Error());

      const result = await service.getOrders(user, getOrdersInputArgs);

      expect(ordersRepository.find).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '주문을 받아올 수 없습니다.',
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
    it('특정 주문을 불러옵니다.', async () => {
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
    it('orderId에 맞는 주문이 존재하지 않아 실패합니다.', async () => {
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
        error: '주문을 찾을 수 없습니다.',
      });
    });
    it('주문에 접근할 권한이 없는 사람이 조회하려고 했지만 실패합니다.', async () => {
      ordersRepository.findOne.mockResolvedValue(existOrder);

      jest.spyOn(service, 'canSeeOrder').mockImplementation(() => {
        return false;
      });

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
        error: '해당 주문을 볼 권한이 없습니다.',
      });
    });
    it('예외가 발생한 경우 주문을 받아올 수 없습니다.', async () => {
      ordersRepository.findOne.mockRejectedValue(new Error());

      const result = await service.getOrder(user, getOrderInputArgs);

      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '주문을 불러올 수 없습니다.',
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
    describe('특정 주문을 수정합니다.', () => {
      it('음식점의 주인이 주문 정보를 수정할 경우', async () => {
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
      it('배달원이 주문 정보를 수정할 경우', async () => {
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
    it('orderId에 맞는 주문이 존재하지 않아 실패합니다.', async () => {
      ordersRepository.findOne.mockResolvedValue(undefined);

      const result = await service.editOrder(user, editOrderInputArgs);

      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '주문을 찾을 수 없습니다.',
      });
    });
    it('주문에 접근할 권한이 없는 사람이 주문 정보를 수정하려고 했지만 실패합니다.', async () => {
      ordersRepository.findOne.mockResolvedValue(existOrder);

      jest.spyOn(service, 'canSeeOrder').mockImplementation(() => {
        return false;
      });
      const result = await service.editOrder(user, editOrderInputArgs);

      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '해당 주문을 볼 권한이 없습니다.',
      });
    });
    it('주문을 수정할 권한이 없는 사람이 주문 정보를 수정하려고 했지만 실패합니다.', async () => {
      ordersRepository.findOne.mockResolvedValue(existOrder);

      editOrderInputArgs.status = OrderStatus.Cooking;
      user.role = UserRole.Delivery;

      const result = await service.editOrder(user, editOrderInputArgs);

      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '해당 주문을 수정할 권한이 없습니다.',
      });
    });
    it('예외가 발생한 경우 주문을 수정할 수 없습니다.', async () => {
      ordersRepository.findOne.mockRejectedValue(new Error());

      const result = await service.editOrder(user, editOrderInputArgs);

      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '주문을 수정할 수 없습니다.',
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
    it('특정 주문에 배달원이 배정되었습니다.', async () => {
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
    it('orderId에 맞는 주문이 존재하지 않아 실패합니다.', async () => {
      ordersRepository.findOne.mockResolvedValue(undefined);

      const result = await service.takeOrder(driver, takeOrderInputArgs);

      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '주문을 찾을 수 없습니다.',
      });
    });
    it('이미 배달원이 배정되어있는 주문이라서 배달원 배정에 실패합니다.', async () => {
      existOrder.driver = new User();
      ordersRepository.findOne.mockResolvedValue(existOrder);

      const result = await service.takeOrder(driver, takeOrderInputArgs);

      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '해당 주문은 이미 배달원이 배정되어 있습니다.',
      });
    });
    it('예외가 발생한 경우 배달원을 배정할 수 없습니다.', async () => {
      ordersRepository.findOne.mockRejectedValue(new Error());

      const result = await service.takeOrder(driver, takeOrderInputArgs);

      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '주문을 수주할 수 없습니다.',
      });
    });
  });
});
