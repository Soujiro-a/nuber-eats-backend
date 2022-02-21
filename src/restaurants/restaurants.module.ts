import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Restaurant } from './entities/restaurant.entity';
import { RestaurantResolver } from './restaurants.resolver';
import { RestaurantService } from './restaurants.service';

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant, Category])], // TypeOrmModule이 특정 feature를 import할 수 있게 해줌
  providers: [RestaurantResolver, RestaurantService],
})
export class RestaurantsModule {}
