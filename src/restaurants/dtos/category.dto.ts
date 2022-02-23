import { Field, InputType, ObjectType } from '@nestjs/graphql';
import {
  PagenationInput,
  PagenationOutput,
} from 'src/common/dtos/pagenation.dto';
import { Category } from '../entities/category.entity';

@InputType()
export class CategoryInput extends PagenationInput {
  @Field(() => String)
  slug: string;
}

@ObjectType()
export class CategoryOutput extends PagenationOutput {
  @Field(() => Category, { nullable: true })
  category?: Category;
}
