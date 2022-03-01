import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { Dish } from './entities/dish.entity';
import { Restaurant } from './entities/restaurant.entity';
import { CategoryRepository } from './repositories/category.repository';
import { RestaurantService } from './restaurants.service';

const mockRepository = () => ({
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
});

type mockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const mockCategoryRepository = () => ({
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  getOrCreate: jest.fn(),
});

type mockCategoryRepository = Partial<
  Record<keyof CategoryRepository, jest.Mock>
>;

describe('RestaurantService', () => {
  let service: RestaurantService;
  let restaurantsRepository: mockRepository<Restaurant>;
  let dishesRepository: mockRepository<Dish>;
  let categoriesRepository: mockCategoryRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RestaurantService,
        {
          provide: getRepositoryToken(Restaurant),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Dish),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(CategoryRepository),
          useValue: mockCategoryRepository(),
        },
      ],
    }).compile();
    service = module.get<RestaurantService>(RestaurantService);
    restaurantsRepository = module.get(getRepositoryToken(Restaurant));
    dishesRepository = module.get(getRepositoryToken(Dish));
    categoriesRepository = module.get(getRepositoryToken(CategoryRepository));
  });

  it('RestaurantService를 정의합니다.', () => {
    expect(service).toBeDefined();
  });

  describe('createRestaurant', () => {
    const user = new User();
    const createRestaurantArgs = {
      name: 'New Restaurant',
      address: 'New Address',
      coverImage: 'http://coverImage.com',
      categoryName: 'New Category',
    };
    it('음식점을 생성합니다.', async () => {
      const category = {
        slug: createRestaurantArgs.categoryName,
        name: createRestaurantArgs.categoryName,
      };

      restaurantsRepository.create.mockReturnValue(createRestaurantArgs);

      categoriesRepository.getOrCreate.mockResolvedValue(category);

      const result = await service.createRestaurant(user, createRestaurantArgs);

      expect(restaurantsRepository.create).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.create).toHaveBeenCalledWith(
        createRestaurantArgs,
      );

      expect(categoriesRepository.getOrCreate).toHaveBeenCalledTimes(1);
      expect(categoriesRepository.getOrCreate).toHaveBeenCalledWith(
        createRestaurantArgs.categoryName,
      );

      expect(restaurantsRepository.save).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.save).toHaveBeenCalledWith(
        createRestaurantArgs,
      );

      expect(result).toMatchObject({
        ok: true,
      });
    });
    it('음식점 생성에 실패하였습니다.', async () => {
      categoriesRepository.getOrCreate.mockRejectedValue(new Error());

      const result = await service.createRestaurant(user, createRestaurantArgs);

      expect(result).toMatchObject({
        ok: false,
        error: '음식점을 생성할 수 없었습니다.',
      });
    });
  });
  describe('editRestaurant', () => {
    it.todo('음식점 정보를 수정합니다');
    it.todo('존재하지 않는 음식점에 대해서 정보를 수정할 수 없습니다.');
    it.todo('음식점의 주인이 아니라면 정보를 수정할 수 없습니다.');
    it.todo('예외가 발생했다면 음식점 정보를 수정할 수 없습니다.');
  });
  describe('deleteRestaurant', () => {
    it.todo('음식점을 삭제합니다.');
    it.todo('존재하지 않는 음식점을 삭제할 수 없습니다.');
    it.todo('예외가 발생했다면 음식점을 삭제할 수 없습니다.');
  });
  describe('allCategories', () => {
    it.todo('카테고리들을 불러옵니다.');
    it.todo('카테고리들을 불러오는데 실패합니다.');
  });
  describe('countRestaurants', () => {
    it.todo('특정 카테고리에 속해있는 음식점들의 갯수를 불러옵니다.');
  });
  describe('findCategoryBySlug', () => {
    it.todo(
      'slug값과 일치하는 카테고리와 해당 카테고리의 특정페이지에 있는 음식점들 25곳의 정보, 총 페이지 수를 불러옵니다.',
    );
    it.todo('slug값과 일치하는 카테고리를 찾을 수 없습니다.');
    it.todo('예외가 발생했다면 카테고리를 불러올 수 없습니다.');
  });
  describe('allRestaurants', () => {
    it.todo(
      '특정페이지에 있는 모든 음식점들 25곳의 정보, 총 페이지 수, 음식점 총 갯수를 불러옵니다.',
    );
    it.todo('예외가 발생했다면 음식점들 정보를 불러올 수 없습니다.');
  });
  describe('findRestaurantById', () => {
    it.todo('입력받은 id를 가진 음식점 정보를 반환합니다.');
    it.todo('입력받은 id를 가진 음식점이 존재하지 않습니다.');
    it.todo('예외가 발생했다면, 음식점 정보를 불러올 수 없습니다.');
  });
  describe('searchRestaurantByName', () => {
    it.todo('입력받은 검색어가 이름에 포함된 음식점 정보를 반환합니다.');
    it.todo('입력받은 검색어가 이름에 포함된 음식점이 존재하지 않습니다.');
  });
  describe('createDish', () => {
    it.todo('메뉴를 생성합니다.');
    it.todo('존재하지 않는 음식점에 메뉴를 생성할 수 없습니다.');
    it.todo('음식점의 주인이 아니라면 메뉴를 생성할 수 없습니다.');
    it.todo('예외가 발생했다면 메뉴를 생성할 수 없습니다.');
  });
  describe('editDish', () => {
    it.todo('메뉴 정보를 수정합니다.');
    it.todo('존재하지 않는 음식점의 메뉴 정보를 수정할 수 없습니다.');
    it.todo('음식점의 주인이 아니라면 메뉴 정보를 수정할 수 없습니다.');
    it.todo('예외가 발생했다면 메뉴 정보를 수정할 수 없습니다.');
  });
  describe('deleteDish', () => {
    it.todo('메뉴를 삭제합니다.');
    it.todo('존재하지 않는 음식점의 메뉴를 삭제할 수 없습니다.');
    it.todo('음식점의 주인이 아니라면 메뉴를 삭제할 수 없습니다.');
    it.todo('예외가 발생했다면 메뉴를 삭제할 수 없습니다.');
  });
});
