import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { AllCategoriesOutput } from './dtos/all-categories.dto';
import { CategoryInput, CategoryOutput } from './dtos/category.dto';
import {
  CreateRestaurantInput,
  CreateRestaurantOutput,
} from './dtos/create-restaurant.dto';
import {
  DeleteRestaurantInput,
  DeleteRestaurantOutput,
} from './dtos/delete-restaurant.dto';
import {
  EditRestaurantInput,
  EditRestaurantOutput,
} from './dtos/edit-restaurant.dto';
import { RestaurantsInput, RestaurantsOutput } from './dtos/restaurants.dto';
import { Category } from './entities/category.entity';
import { Restaurant } from './entities/restaurant.entity';
import { CategoryRepository } from './repositories/category.repository';

const TAKE_COUNT_IN_PAGE = 25;

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant) // TypeORM의 Data Mapper에서 getRepository()를 해당 부분을 통해 동작시킴
    private readonly restaurants: Repository<Restaurant>,
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
      };
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
      });
      const totalResults = await this.countRestaurants(category);
      return {
        ok: true,
        category,
        totalPages: Math.ceil(totalResults / TAKE_COUNT_IN_PAGE),
        restaurants,
      };
    } catch (error) {
      return {
        ok: false,
        error: '카테고리를 불러올 수 없습니다.',
      };
    }
  }

  async allRestaurants({ page }: RestaurantsInput): Promise<RestaurantsOutput> {
    try {
      const [restaurants, totalResults] = await this.restaurants.findAndCount({
        skip: (page - 1) * TAKE_COUNT_IN_PAGE,
        take: TAKE_COUNT_IN_PAGE,
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
}
