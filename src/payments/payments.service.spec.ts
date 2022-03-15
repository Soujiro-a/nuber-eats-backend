import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreatePaymentInput } from './dtos/create-payment.dto';
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payments.service';

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

describe('PaymentService', () => {
  let service: PaymentService;
  let restaurantsRepository: mockRepository<Restaurant>;
  let paymentsRepository: mockRepository<Payment>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(Restaurant),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: mockRepository(),
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    restaurantsRepository = module.get(getRepositoryToken(Restaurant));
    paymentsRepository = module.get(getRepositoryToken(Payment));
  });

  it('PaymentService를 정의합니다.', () => {
    expect(service).toBeDefined();
  });

  describe('createPayment', () => {
    const createPaymentInputArgs: CreatePaymentInput = {
      transactionId: 'xx',
      restaurantId: 1,
    };

    let restaurant: Restaurant;
    let owner: User;

    beforeEach(() => {
      restaurant = new Restaurant();
      owner = new User();
    });
    it('결제내역을 만들고, 결제한 음식점에 대해 프로모션 혜택을 적용합니다.', async () => {
      restaurantsRepository.findOne.mockResolvedValue(restaurant);

      const payment = new Payment();
      paymentsRepository.create.mockReturnValue(payment);

      const result = await service.createPayment(owner, createPaymentInputArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        createPaymentInputArgs.restaurantId,
      );

      expect(paymentsRepository.create).toHaveBeenCalledTimes(1);
      expect(paymentsRepository.create).toHaveBeenCalledWith({
        transactionId: createPaymentInputArgs.transactionId,
        user: owner,
        restaurant,
      });

      expect(paymentsRepository.save).toHaveBeenCalledTimes(1);
      expect(paymentsRepository.save).toHaveBeenCalledWith(payment);

      expect(restaurant.isPromoted).toBeTruthy();
      expect(restaurant.promotedUntil).toEqual(expect.any(Date));

      expect(restaurantsRepository.save).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.save).toHaveBeenCalledWith(restaurant);

      expect(result).toMatchObject({
        ok: true,
      });
    });
    it('존재하지 않는 음식점에 대해 프로모션 혜택을 적용할 수 없습니다.', async () => {
      restaurantsRepository.findOne.mockResolvedValue(undefined);

      const result = await service.createPayment(owner, createPaymentInputArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        createPaymentInputArgs.restaurantId,
      );

      expect(result).toMatchObject({
        ok: false,
        error: '음식점을 찾을 수 없습니다.',
      });
    });
    it('해당 음식점의 주인만 프로포션 혜택을 결제할 수 있습니다.', async () => {
      restaurant.ownerId = 1;

      restaurantsRepository.findOne.mockResolvedValue(restaurant);
      const result = await service.createPayment(owner, createPaymentInputArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        createPaymentInputArgs.restaurantId,
      );

      expect(result).toMatchObject({
        ok: false,
        error: '음식점의 주인만 할 수 있는 작업입니다.',
      });
    });
    it('예외가 발생했다면 결제를 진행할 수 없습니다.', async () => {
      restaurantsRepository.findOne.mockRejectedValue(new Error());
      const result = await service.createPayment(owner, createPaymentInputArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        createPaymentInputArgs.restaurantId,
      );

      expect(result).toMatchObject({
        ok: false,
        error: '결제를 진행할 수 없습니다.',
      });
    });
  });
  describe('getPayment', () => {
    let user: User;

    beforeEach(() => {
      user = new User();
    });
    it('특정 유저의 결제 목록들을 불러옵니다.', async () => {
      const payments: Payment[] = [new Payment(), new Payment()];
      paymentsRepository.find.mockResolvedValue(payments);

      const result = await service.getPayment(user);

      expect(paymentsRepository.find).toHaveBeenCalledTimes(1);
      expect(paymentsRepository.find).toHaveBeenCalledWith({ user });

      expect(result).toMatchObject({
        ok: true,
        payments,
      });
    });
    it('예외가 발생했다면 결제 목록들을 불러올 수 없습니다.', async () => {
      paymentsRepository.find.mockRejectedValue(new Error());

      const result = await service.getPayment(user);

      expect(paymentsRepository.find).toHaveBeenCalledTimes(1);
      expect(paymentsRepository.find).toHaveBeenCalledWith({ user });

      expect(result).toMatchObject({
        ok: false,
        error: '결제 목록을 불러올 수 없습니다.',
      });
    });
  });
  describe('checkPromotedRestaurants', () => {
    it('현재 시간보다 더 적은 시간을 가진 음식점들에 대해 프로모션을 종료합니다.', async () => {
      const restaurants: Restaurant[] = [new Restaurant(), new Restaurant()];
      const firstPromotionDate = new Date();
      firstPromotionDate.setDate(firstPromotionDate.getDate() - 7);
      restaurants[0].promotedUntil = firstPromotionDate;

      restaurantsRepository.find.mockResolvedValue([restaurants[0]]);

      await service.checkPromotedRestaurants();

      expect(restaurantsRepository.find).toHaveBeenCalledTimes(1);

      expect(restaurantsRepository.save).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.save).toHaveBeenCalledWith(restaurants[0]);

      expect(restaurants[0].isPromoted).toBeFalsy();
      expect(restaurants[0].promotedUntil).toBeNull();
    });
  });
});
