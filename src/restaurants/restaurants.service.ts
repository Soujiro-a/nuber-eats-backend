import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { ILike, Repository } from 'typeorm';
import { AllCategoriesOutput } from './dtos/all-categories.dto';
import { CategoryInput, CategoryOutput } from './dtos/category.dto';
import { CreateDishInput, CreateDishOutput } from './dtos/create-dish.dto';
import {
  CreateRestaurantInput,
  CreateRestaurantOutput,
} from './dtos/create-restaurant.dto';
import { DeleteDishInput, DeleteDishOutput } from './dtos/delete-dish.dto';
import {
  DeleteRestaurantInput,
  DeleteRestaurantOutput,
} from './dtos/delete-restaurant.dto';
import { EditDishInput, EditDishOutput } from './dtos/edit-dish.dto';
import {
  EditRestaurantInput,
  EditRestaurantOutput,
} from './dtos/edit-restaurant.dto';
import {
  MyRestaurantInput,
  MyRestaurantOutput,
} from './dtos/my-restaurant.dto';
import { MyRestaurantsOutput } from './dtos/my-restaurants.dto';
import { RestaurantInput, RestaurantOutput } from './dtos/restaurant.dto';
import { RestaurantsInput, RestaurantsOutput } from './dtos/restaurants.dto';
import {
  SearchRestaurantInput,
  SearchRestaurantOutput,
} from './dtos/search-restaurant.dto';
import { Category } from './entities/category.entity';
import { Dish } from './entities/dish.entity';
import { Restaurant } from './entities/restaurant.entity';
import { CategoryRepository } from './repositories/category.repository';

const TAKE_COUNT_IN_PAGE = 3;

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant) // TypeORM의 Data Mapper에서 getRepository()를 해당 부분을 통해 동작시킴
    private readonly restaurants: Repository<Restaurant>,
    @InjectRepository(Dish)
    private readonly dishes: Repository<Dish>,
    private readonly categories: CategoryRepository,
  ) {}

  async createRestaurant(
    owner: User,
    createRestaurantInput: CreateRestaurantInput,
  ): Promise<CreateRestaurantOutput> {
    try {
      const newRestaurant = this.restaurants.create(createRestaurantInput);
      newRestaurant.owner = owner;
      const category = await this.categories.getOrCreate(
        createRestaurantInput.categoryName,
      );
      newRestaurant.category = category;
      await this.restaurants.save(newRestaurant);
      return {
        ok: true,
        restaurantId: newRestaurant.id,
      };
    } catch {
      return {
        ok: false,
        error: '음식점을 생성할 수 없었습니다.',
      };
    }
  }

  async editRestaurant(
    owner: User,
    editRestaurantInput: EditRestaurantInput,
  ): Promise<EditRestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne(
        editRestaurantInput.restaurantId,
      );

      if (!restaurant) {
        return {
          ok: false,
          error: '음식점을 찾을 수 없습니다.',
        };
      }

      if (owner.id !== restaurant.ownerId) {
        return {
          ok: false,
          error:
            '해당 음식점의 오너가 아니면 음식점 정보를 수정할 수 없습니다.',
        };
      }

      let category: Category = null;
      if (editRestaurantInput.categoryName) {
        category = await this.categories.getOrCreate(
          editRestaurantInput.categoryName,
        );
      }
      await this.restaurants.save([
        {
          id: editRestaurantInput.restaurantId,
          ...editRestaurantInput,
          ...(category && { category }),
        },
      ]);
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: '음식점 정보를 수정할 수 없습니다.',
      };
    }
  }

  async deleteRestaurant(
    owner: User,
    { restaurantId }: DeleteRestaurantInput,
  ): Promise<DeleteRestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne(restaurantId);

      if (!restaurant) {
        return {
          ok: false,
          error: '음식점을 찾을 수 없습니다.',
        };
      }

      if (owner.id !== restaurant.ownerId) {
        return {
          ok: false,
          error:
            '해당 음식점의 오너가 아니면 음식점 정보를 삭제할 수 없습니다.',
        };
      }
      await this.restaurants.delete(restaurantId);

      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: '음식점을 삭제할 수 없습니다.',
      };
    }
  }

  async allCategories(): Promise<AllCategoriesOutput> {
    try {
      const categories = await this.categories.find();
      return {
        ok: true,
        categories,
      };
    } catch {
      return {
        ok: false,
        error: '카테고리를 불러올 수 없습니다.',
      };
    }
  }

  countRestaurants(category: Category): Promise<number> {
    return this.restaurants.count({ category });
  }

  async findCategoryBySlug({
    slug,
    page,
  }: CategoryInput): Promise<CategoryOutput> {
    try {
      const category = await this.categories.findOne({ slug });

      if (!category) {
        return {
          ok: false,
          error: '카테고리를 찾을 수 없습니다.',
        };
      }
      const restaurants = await this.restaurants.find({
        where: {
          category,
        },
        take: TAKE_COUNT_IN_PAGE,
        skip: (page - 1) * TAKE_COUNT_IN_PAGE,
        order: {
          isPromoted: 'DESC',
        },
      });
      const totalResults = await this.countRestaurants(category);
      return {
        ok: true,
        category,
        totalPages: Math.ceil(totalResults / TAKE_COUNT_IN_PAGE),
        totalResults,
        restaurants,
      };
    } catch {
      return {
        ok: false,
        error: '카테고리를 불러올 수 없습니다.',
      };
    }
  }

  async myRestaurants(owner: User): Promise<MyRestaurantsOutput> {
    try {
      const restaurants = await this.restaurants.find({
        where: { owner },
        relations: ['category'],
      });
      return {
        ok: true,
        restaurants,
      };
    } catch {
      return {
        ok: false,
        error: '주인이 가지고 있는 음식점들을 불러올 수 없습니다.',
      };
    }
  }

  async myRestaurant(
    owner: User,
    { id }: MyRestaurantInput,
  ): Promise<MyRestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne({
        where: { owner, id },
        relations: ['menu', 'orders'],
      });
      return {
        ok: true,
        restaurant,
      };
    } catch {
      return {
        ok: false,
        error: '음식점을 찾을 수 없습니다.',
      };
    }
  }

  async allRestaurants({ page }: RestaurantsInput): Promise<RestaurantsOutput> {
    try {
      const [restaurants, totalResults] = await this.restaurants.findAndCount({
        skip: (page - 1) * TAKE_COUNT_IN_PAGE,
        take: TAKE_COUNT_IN_PAGE,
        order: {
          isPromoted: 'DESC',
        },
        relations: ['category'],
      });
      return {
        ok: true,
        results: restaurants,
        totalPages: Math.ceil(totalResults / TAKE_COUNT_IN_PAGE),
        totalResults,
      };
    } catch {
      return {
        ok: false,
        error: '음식점들을 불러올 수 없습니다.',
      };
    }
  }

  async findRestaurantById({
    restaurantId,
  }: RestaurantInput): Promise<RestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne(restaurantId, {
        relations: ['menu', 'category'],
      });

      if (!restaurant) {
        return {
          ok: false,
          error: '음식점이 존재하지 않습니다.',
        };
      }

      return {
        ok: true,
        restaurant,
      };
    } catch {
      return {
        ok: false,
        error: '음식점을 찾을 수 없습니다.',
      };
    }
  }

  async searchRestaurantByName({
    query,
    page,
  }: SearchRestaurantInput): Promise<SearchRestaurantOutput> {
    try {
      const [restaurants, totalResults] = await this.restaurants.findAndCount({
        where: {
          name: ILike(`%${query}%`),
          // name: Raw((name) => `${name} ILIKE '%${query}%'`), // 직접 query문을 작성해서 요청하는 방법도 있음
        },
        skip: (page - 1) * TAKE_COUNT_IN_PAGE,
        take: TAKE_COUNT_IN_PAGE,
      });
      return {
        ok: true,
        restaurants,
        totalPages: Math.ceil(totalResults / TAKE_COUNT_IN_PAGE),
        totalResults,
      };
    } catch {
      return {
        ok: false,
        error: '음식점을 찾을 수 없습니다.',
      };
    }
  }

  async createDish(
    owner: User,
    createDishInput: CreateDishInput,
  ): Promise<CreateDishOutput> {
    try {
      const restaurant = await this.restaurants.findOne(
        createDishInput.restaurantId,
      );

      if (!restaurant) {
        return {
          ok: false,
          error: '음식점을 찾을 수 없습니다.',
        };
      }

      if (owner.id !== restaurant.ownerId) {
        return {
          ok: false,
          error: '해당 음식점의 오너가 아니면 메뉴를 생성할 수 없습니다.',
        };
      }
      await this.dishes.save(
        this.dishes.create({ ...createDishInput, restaurant }),
      );
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: '메뉴를 생성할 수 없습니다.',
      };
    }
  }

  async editDish(
    owner: User,
    editDishInput: EditDishInput,
  ): Promise<EditDishOutput> {
    try {
      const dish = await this.dishes.findOne(editDishInput.dishId, {
        relations: ['restaurant'],
      });

      if (!dish) {
        return {
          ok: false,
          error: '수정하고자 하는 메뉴가 존재하지 않습니다.',
        };
      }

      if (dish.restaurant.ownerId !== owner.id) {
        return {
          ok: false,
          error: '해당 음식점의 오너가 아니면 메뉴를 수정할 수 없습니다.',
        };
      }

      await this.dishes.save([
        {
          id: editDishInput.dishId,
          ...editDishInput,
        },
      ]);
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: '메뉴를 수정할 수 없습니다.',
      };
    }
  }

  async deleteDish(
    owner: User,
    { dishId }: DeleteDishInput,
  ): Promise<DeleteDishOutput> {
    try {
      const dish = await this.dishes.findOne(dishId, {
        relations: ['restaurant'],
      });

      if (!dish) {
        return {
          ok: false,
          error: '지우고자하는 메뉴가 존재하지 않습니다.',
        };
      }

      if (dish.restaurant.ownerId !== owner.id) {
        return {
          ok: false,
          error: '해당 음식점의 오너가 아니면 메뉴를 삭제할 수 없습니다.',
        };
      }

      await this.dishes.delete(dishId);

      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: '메뉴를 삭제할 수 없습니다.',
      };
    }
  }
}
