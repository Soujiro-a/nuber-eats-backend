import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Dish } from 'src/restaurants/entities/dish.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { OrderItem } from './entities/order-item.entity';
import { Orders } from './entities/order.entity';
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

type mockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('OrderService', () => {
  let service: OrderService;
  let ordersRepository: mockRepository<Orders>;
  let restaurantsRepository: mockRepository<Restaurant>;
  let orderItemRepository: mockRepository<OrderItem>;
  let dishesRepository: mockRepository<Dish>;
  let customer: User;
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getRepositoryToken(Orders),
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
      ],
    }).compile();
    service = module.get<OrderService>(OrderService);
    ordersRepository = module.get(getRepositoryToken(Orders));
    restaurantsRepository = module.get(getRepositoryToken(Restaurant));
    orderItemRepository = module.get(getRepositoryToken(OrderItem));
    dishesRepository = module.get(getRepositoryToken(Dish));
    customer = new User();
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

    beforeEach(() => {
      restaurant = new Restaurant();
      dish = new Dish();
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

      const orders = new Orders();
      ordersRepository.create.mockReturnValue(orders);

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
});
