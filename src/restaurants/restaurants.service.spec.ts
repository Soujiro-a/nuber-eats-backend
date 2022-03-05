import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { ILike, Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { Dish } from './entities/dish.entity';
import { Restaurant } from './entities/restaurant.entity';
import { CategoryRepository } from './repositories/category.repository';
import { RestaurantService } from './restaurants.service';

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

const mockCategoryRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  getOrCreate: jest.fn(),
});

type mockCategoryRepository = Partial<
  Record<keyof CategoryRepository, jest.Mock>
>;

const TAKE_COUNT_IN_PAGE = 25;

describe('RestaurantService', () => {
  let service: RestaurantService;
  let restaurantsRepository: mockRepository<Restaurant>;
  let dishesRepository: mockRepository<Dish>;
  let categoriesRepository: mockCategoryRepository;
  let user: User;

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
    user = new User();
  });

  it('RestaurantService를 정의합니다.', () => {
    expect(service).toBeDefined();
  });

  describe('createRestaurant', () => {
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
    const editRestaurantArgs = {
      restaurantId: 1,
      name: 'Edit Restaurant',
      address: 'Edit Address',
      coverImage: 'http://editCoverImage.com',
      categoryName: 'Edit Category',
    };

    const oldRestaurant = {
      id: 1,
      name: 'Old Restaurant',
      address: 'Old Address',
      coverImage: 'http://oldCoverImage.com',
      categoryName: 'Old Category',
      ownerId: 1,
    };

    it('음식점 정보를 수정합니다', async () => {
      const category = {
        slug: editRestaurantArgs.categoryName,
        name: editRestaurantArgs.categoryName,
      };
      restaurantsRepository.findOne.mockResolvedValue(oldRestaurant);
      categoriesRepository.getOrCreate.mockResolvedValue(category);
      user.id = 1;

      const result = await service.editRestaurant(user, editRestaurantArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        editRestaurantArgs.restaurantId,
      );

      expect(categoriesRepository.getOrCreate).toHaveBeenCalledTimes(1);
      expect(categoriesRepository.getOrCreate).toHaveBeenCalledWith(
        editRestaurantArgs.categoryName,
      );

      expect(restaurantsRepository.save).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.save).toHaveBeenCalledWith([
        {
          id: editRestaurantArgs.restaurantId,
          ...editRestaurantArgs,
          ...{ category },
        },
      ]);

      expect(result).toMatchObject({
        ok: true,
      });
    });
    it('존재하지 않는 음식점에 대해서 정보를 수정할 수 없습니다.', async () => {
      restaurantsRepository.findOne.mockResolvedValue(undefined);

      const result = await service.editRestaurant(user, editRestaurantArgs);

      expect(result).toMatchObject({
        ok: false,
        error: '음식점을 찾을 수 없습니다.',
      });
    });
    it('음식점의 주인이 아니라면 정보를 수정할 수 없습니다.', async () => {
      restaurantsRepository.findOne.mockResolvedValue(oldRestaurant);

      const result = await service.editRestaurant(user, editRestaurantArgs);

      expect(result).toMatchObject({
        ok: false,
        error: '해당 음식점의 오너가 아니면 음식점 정보를 수정할 수 없습니다.',
      });
    });
    it('예외가 발생했다면 음식점 정보를 수정할 수 없습니다.', async () => {
      restaurantsRepository.findOne.mockRejectedValue(new Error());

      const result = await service.editRestaurant(user, editRestaurantArgs);

      expect(result).toMatchObject({
        ok: false,
        error: '음식점 정보를 수정할 수 없습니다.',
      });
    });
  });
  describe('deleteRestaurant', () => {
    const deleteRestaurantArgs = {
      restaurantId: 1,
    };

    const oldRestaurant = {
      id: 1,
      name: 'Old Restaurant',
      address: 'Old Address',
      coverImage: 'http://oldCoverImage.com',
      categoryName: 'Old Category',
      ownerId: 1,
    };

    it('음식점을 삭제합니다.', async () => {
      restaurantsRepository.findOne.mockResolvedValue(oldRestaurant);
      user.id = 1;

      const result = await service.deleteRestaurant(user, deleteRestaurantArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        deleteRestaurantArgs.restaurantId,
      );

      expect(restaurantsRepository.delete).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.delete).toHaveBeenCalledWith(
        deleteRestaurantArgs.restaurantId,
      );

      expect(result).toMatchObject({
        ok: true,
      });
    });
    it('존재하지 않는 음식점을 삭제할 수 없습니다.', async () => {
      restaurantsRepository.findOne.mockResolvedValue(undefined);

      const result = await service.deleteRestaurant(user, deleteRestaurantArgs);

      expect(result).toMatchObject({
        ok: false,
        error: '음식점을 찾을 수 없습니다.',
      });
    });
    it('음식점의 주인이 아니라면 음식점을 삭제할 수 없습니다.', async () => {
      restaurantsRepository.findOne.mockResolvedValue(oldRestaurant);

      const result = await service.deleteRestaurant(user, deleteRestaurantArgs);

      expect(result).toMatchObject({
        ok: false,
        error: '해당 음식점의 오너가 아니면 음식점 정보를 삭제할 수 없습니다.',
      });
    });
    it('예외가 발생했다면 음식점을 삭제할 수 없습니다.', async () => {
      restaurantsRepository.findOne.mockRejectedValue(new Error());

      const result = await service.deleteRestaurant(user, deleteRestaurantArgs);

      expect(result).toMatchObject({
        ok: false,
        error: '음식점을 삭제할 수 없습니다.',
      });
    });
  });
  describe('allCategories', () => {
    it('카테고리들을 불러옵니다.', async () => {
      const categories = [
        {
          slug: 'first category',
          name: 'first category',
        },
        {
          slug: 'second category',
          name: 'second category',
        },
        {
          slug: 'third category',
          name: 'third category',
        },
      ];
      categoriesRepository.find.mockResolvedValue(categories);

      const result = await service.allCategories();

      expect(categoriesRepository.find).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: true,
        categories,
      });
    });
    it('카테고리들을 불러오는데 실패합니다.', async () => {
      categoriesRepository.find.mockRejectedValue(new Error());
      const result = await service.allCategories();

      expect(result).toMatchObject({
        ok: false,
        error: '카테고리를 불러올 수 없습니다.',
      });
    });
  });
  describe('countRestaurants', () => {
    it('특정 카테고리에 속해있는 음식점들의 갯수를 불러옵니다.', async () => {
      const category = new Category();

      const restaurants = [
        {
          name: 'First Restaurant',
          address: 'First Address',
          coverImage: 'http://coverImage.com',
          categoryName: 'Category',
        },
        {
          name: 'Second Restaurant',
          address: 'Second Address',
          coverImage: 'http://coverImage.com',
          categoryName: 'Category',
        },
        {
          name: 'Third Restaurant',
          address: 'Third Address',
          coverImage: 'http://coverImage.com',
          categoryName: 'Category',
        },
      ];

      restaurantsRepository.count.mockResolvedValue(restaurants.length);

      const result = await service.countRestaurants(category);

      expect(restaurantsRepository.count).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.count).toHaveBeenCalledWith({ category });

      expect(result).toEqual(restaurants.length);
    });
  });
  describe('findCategoryBySlug', () => {
    const findCategoryBySlugArgs = {
      slug: 'category',
      page: 1,
    };
    it('slug값과 일치하는 카테고리와 해당 카테고리의 특정페이지에 있는 음식점들 25곳의 정보, 총 페이지 수를 불러옵니다.', async () => {
      const category = {
        name: 'category',
        coverImage: 'https://coverImage.com',
        slug: 'category',
        restaurants: [
          {
            id: 1,
            name: 'First Restaurant',
            address: 'First Address',
            coverImage: 'http://FirstCoverImage.com',
            categoryName: 'Category',
            ownerId: 1,
          },
          {
            id: 2,
            name: 'Second Restaurant',
            address: 'Second Address',
            coverImage: 'http://SecondCoverImage.com',
            categoryName: 'Category',
            ownerId: 1,
          },
        ],
      };
      categoriesRepository.findOne.mockResolvedValue(category);
      restaurantsRepository.find.mockResolvedValue(category.restaurants);

      jest.spyOn(service, 'countRestaurants').mockImplementation(async () => {
        return category.restaurants.length;
      });

      const result = await service.findCategoryBySlug(findCategoryBySlugArgs);

      expect(categoriesRepository.findOne).toHaveBeenCalledTimes(1);
      expect(categoriesRepository.findOne).toHaveBeenCalledWith({
        slug: findCategoryBySlugArgs.slug,
      });

      expect(restaurantsRepository.find).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.find).toHaveBeenCalledWith({
        where: {
          category,
        },
        take: TAKE_COUNT_IN_PAGE,
        skip: (findCategoryBySlugArgs.page - 1) * TAKE_COUNT_IN_PAGE,
      });

      expect(result).toMatchObject({
        ok: true,
        category,
        totalPages: Math.ceil(category.restaurants.length / TAKE_COUNT_IN_PAGE),
        restaurants: category.restaurants,
      });
    });
    it('slug값과 일치하는 카테고리를 찾을 수 없습니다.', async () => {
      categoriesRepository.findOne.mockResolvedValue(undefined);

      const result = await service.findCategoryBySlug(findCategoryBySlugArgs);

      expect(categoriesRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '카테고리를 찾을 수 없습니다.',
      });
    });
    it('예외가 발생했다면 카테고리를 불러올 수 없습니다.', async () => {
      categoriesRepository.findOne.mockRejectedValue(new Error());

      const result = await service.findCategoryBySlug(findCategoryBySlugArgs);

      expect(categoriesRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '카테고리를 불러올 수 없습니다.',
      });
    });
  });
  describe('allRestaurants', () => {
    const allRestaurantsArgs = {
      page: 1,
    };
    it('특정페이지에 있는 모든 음식점들 25곳의 정보, 총 페이지 수, 음식점 총 갯수를 불러옵니다.', async () => {
      const restaurants = [
        {
          id: 1,
          name: 'First Restaurant',
          address: 'First Address',
          coverImage: 'http://FirstCoverImage.com',
          categoryName: 'Category',
          ownerId: 1,
        },
        {
          id: 2,
          name: 'Second Restaurant',
          address: 'Second Address',
          coverImage: 'http://SecondCoverImage.com',
          categoryName: 'Category',
          ownerId: 1,
        },
      ];

      restaurantsRepository.findAndCount.mockResolvedValue([
        restaurants,
        restaurants.length,
      ]);

      const result = await service.allRestaurants(allRestaurantsArgs);

      expect(restaurantsRepository.findAndCount).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.findAndCount).toHaveBeenCalledWith({
        skip: (allRestaurantsArgs.page - 1) * TAKE_COUNT_IN_PAGE,
        take: TAKE_COUNT_IN_PAGE,
      });

      expect(result).toMatchObject({
        ok: true,
        results: restaurants,
        totalPages: Math.ceil(restaurants.length / TAKE_COUNT_IN_PAGE),
        totalResults: restaurants.length,
      });
    });
    it('예외가 발생했다면 음식점들 정보를 불러올 수 없습니다.', async () => {
      restaurantsRepository.findAndCount.mockRejectedValue(new Error());

      const result = await service.allRestaurants(allRestaurantsArgs);

      expect(restaurantsRepository.findAndCount).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '음식점들을 불러올 수 없습니다.',
      });
    });
  });
  describe('findRestaurantById', () => {
    const findRestaurantByIdArgs = {
      restaurantId: 1,
    };
    it('입력받은 id를 가진 음식점 정보를 반환합니다.', async () => {
      const restaurant = {
        id: 1,
        name: 'First Restaurant',
        address: 'First Address',
        coverImage: 'http://FirstCoverImage.com',
        categoryName: 'Category',
        ownerId: 1,
      };

      restaurantsRepository.findOne.mockResolvedValue(restaurant);

      const result = await service.findRestaurantById(findRestaurantByIdArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        findRestaurantByIdArgs.restaurantId,
        {
          relations: ['menu'],
        },
      );

      expect(result).toMatchObject({
        ok: true,
        restaurant,
      });
    });
    it('입력받은 id를 가진 음식점이 존재하지 않습니다.', async () => {
      restaurantsRepository.findOne.mockResolvedValue(undefined);

      const result = await service.findRestaurantById(findRestaurantByIdArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '음식점이 존재하지 않습니다.',
      });
    });
    it('예외가 발생했다면, 음식점 정보를 불러올 수 없습니다.', async () => {
      restaurantsRepository.findOne.mockRejectedValue(new Error());

      const result = await service.findRestaurantById(findRestaurantByIdArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '음식점을 찾을 수 없습니다.',
      });
    });
  });
  describe('searchRestaurantByName', () => {
    const searchRestaurantByNameArgs = {
      query: 'Restaurant',
      page: 1,
    };
    it('입력받은 검색어가 이름에 포함된 음식점 정보를 반환합니다.', async () => {
      const restaurants = [
        {
          id: 1,
          name: 'First Restaurant',
          address: 'First Address',
          coverImage: 'http://FirstCoverImage.com',
          categoryName: 'Category',
          ownerId: 1,
        },
        {
          id: 2,
          name: 'Second Restaurant',
          address: 'Second Address',
          coverImage: 'http://SecondCoverImage.com',
          categoryName: 'Category',
          ownerId: 1,
        },
      ];

      restaurantsRepository.findAndCount.mockResolvedValue([
        restaurants,
        restaurants.length,
      ]);

      const result = await service.searchRestaurantByName(
        searchRestaurantByNameArgs,
      );

      expect(restaurantsRepository.findAndCount).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          name: ILike(`%${searchRestaurantByNameArgs.query}%`),
        },
        skip: (searchRestaurantByNameArgs.page - 1) * TAKE_COUNT_IN_PAGE,
        take: TAKE_COUNT_IN_PAGE,
      });

      expect(result).toMatchObject({
        ok: true,
        restaurants,
        totalPages: Math.ceil(restaurants.length / TAKE_COUNT_IN_PAGE),
        totalResults: restaurants.length,
      });
    });
    it('입력받은 검색어가 이름에 포함된 음식점이 존재하지 않습니다.', async () => {
      restaurantsRepository.findAndCount.mockResolvedValue(undefined);

      const result = await service.searchRestaurantByName(
        searchRestaurantByNameArgs,
      );

      expect(restaurantsRepository.findAndCount).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '음식점을 찾을 수 없습니다.',
      });
    });
  });

  describe('createDish', () => {
    const createDishArgs = {
      restaurantId: 1,
      name: 'New Dish',
      price: 10000,
      description: 'Delicious',
    };

    const existRestaurant = {
      id: 1,
      name: 'Exist Restaurant',
      address: 'Exist Address',
      coverImage: 'http://CoverImage.com',
      categoryName: 'Exist Category',
      ownerId: 1,
    };
    it('메뉴를 생성합니다.', async () => {
      const newDish = new Dish();
      restaurantsRepository.findOne.mockResolvedValue(existRestaurant);
      dishesRepository.create.mockReturnValue(newDish);
      user.id = 1;

      const result = await service.createDish(user, createDishArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        createDishArgs.restaurantId,
      );

      expect(dishesRepository.create).toHaveBeenCalledTimes(1);
      expect(dishesRepository.create).toHaveBeenCalledWith({
        ...createDishArgs,
        restaurant: existRestaurant,
      });

      expect(dishesRepository.save).toHaveBeenCalledTimes(1);
      expect(dishesRepository.save).toHaveBeenCalledWith(newDish);

      expect(result).toMatchObject({
        ok: true,
      });
    });
    it('존재하지 않는 음식점에 메뉴를 생성할 수 없습니다.', async () => {
      restaurantsRepository.findOne.mockResolvedValue(undefined);

      const result = await service.createDish(user, createDishArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '음식점을 찾을 수 없습니다.',
      });
    });
    it('음식점의 주인이 아니라면 메뉴를 생성할 수 없습니다.', async () => {
      restaurantsRepository.findOne.mockResolvedValue(existRestaurant);

      const result = await service.createDish(user, createDishArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '해당 음식점의 오너가 아니면 메뉴를 생성할 수 없습니다.',
      });
    });
    it('예외가 발생했다면 메뉴를 생성할 수 없습니다.', async () => {
      restaurantsRepository.findOne.mockRejectedValue(new Error());

      const result = await service.createDish(user, createDishArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '메뉴를 생성할 수 없습니다.',
      });
    });
  });
  describe('editDish', () => {
    const editDishArgs = {
      restaurantId: 1,
      name: 'New Dish',
      price: 10000,
      description: 'Delicious',
      dishId: 1,
    };
    let existDish: Dish;
    beforeEach(() => {
      existDish = new Dish();
      existDish.restaurant = new Restaurant();
    });
    it('메뉴 정보를 수정합니다.', async () => {
      existDish.restaurant.ownerId = 1;
      user.id = 1;
      dishesRepository.findOne.mockResolvedValue(existDish);

      const result = await service.editDish(user, editDishArgs);

      expect(dishesRepository.findOne).toHaveBeenCalledTimes(1);
      expect(dishesRepository.findOne).toHaveBeenCalledWith(
        editDishArgs.dishId,
        { relations: ['restaurant'] },
      );

      expect(dishesRepository.save).toHaveBeenCalledTimes(1);
      expect(dishesRepository.save).toHaveBeenCalledWith([
        {
          id: editDishArgs.dishId,
          ...editDishArgs,
        },
      ]);

      expect(result).toMatchObject({
        ok: true,
      });
    });
    it('존재하지 않는 음식점의 메뉴 정보를 수정할 수 없습니다.', async () => {
      dishesRepository.findOne.mockResolvedValue(undefined);

      const result = await service.editDish(user, editDishArgs);

      expect(dishesRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '수정하고자 하는 메뉴가 존재하지 않습니다.',
      });
    });
    it('음식점의 주인이 아니라면 메뉴 정보를 수정할 수 없습니다.', async () => {
      existDish.restaurant.ownerId = 1;
      dishesRepository.findOne.mockResolvedValue(existDish);

      const result = await service.editDish(user, editDishArgs);

      expect(dishesRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '해당 음식점의 오너가 아니면 메뉴를 수정할 수 없습니다.',
      });
    });
    it('예외가 발생했다면 메뉴 정보를 수정할 수 없습니다.', async () => {
      dishesRepository.findOne.mockRejectedValue(new Error());

      const result = await service.editDish(user, editDishArgs);

      expect(dishesRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '메뉴를 수정할 수 없습니다.',
      });
    });
  });
  describe('deleteDish', () => {
    const deleteDishArgs = {
      dishId: 1,
    };
    let existDish: Dish;
    beforeEach(() => {
      existDish = new Dish();
      existDish.restaurant = new Restaurant();
    });
    it('메뉴를 삭제합니다.', async () => {
      existDish.restaurant.ownerId = 1;
      user.id = 1;
      dishesRepository.findOne.mockResolvedValue(existDish);

      const result = await service.deleteDish(user, deleteDishArgs);

      expect(dishesRepository.findOne).toHaveBeenCalledTimes(1);
      expect(dishesRepository.findOne).toHaveBeenCalledWith(
        deleteDishArgs.dishId,
        { relations: ['restaurant'] },
      );

      expect(dishesRepository.delete).toHaveBeenCalledTimes(1);
      expect(dishesRepository.delete).toHaveBeenCalledWith(
        deleteDishArgs.dishId,
      );

      expect(result).toMatchObject({
        ok: true,
      });
    });
    it('존재하지 않는 음식점의 메뉴를 삭제할 수 없습니다.', async () => {
      dishesRepository.findOne.mockResolvedValue(undefined);

      const result = await service.deleteDish(user, deleteDishArgs);

      expect(dishesRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '지우고자하는 메뉴가 존재하지 않습니다.',
      });
    });
    it('음식점의 주인이 아니라면 메뉴를 삭제할 수 없습니다.', async () => {
      existDish.restaurant.ownerId = 1;
      dishesRepository.findOne.mockResolvedValue(existDish);

      const result = await service.deleteDish(user, deleteDishArgs);

      expect(dishesRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '해당 음식점의 오너가 아니면 메뉴를 삭제할 수 없습니다.',
      });
    });
    it('예외가 발생했다면 메뉴를 삭제할 수 없습니다.', async () => {
      dishesRepository.findOne.mockRejectedValue(new Error());

      const result = await service.deleteDish(user, deleteDishArgs);

      expect(dishesRepository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        ok: false,
        error: '메뉴를 삭제할 수 없습니다.',
      });
    });
  });
});
