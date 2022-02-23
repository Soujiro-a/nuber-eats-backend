import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { CoreOutput } from './output.dto';

@InputType()
export class PagenationInput {
  @Field(() => Int, { defaultValue: 1 })
  page: number;
}

@ObjectType()
export class PagenationOutput extends CoreOutput {
  @Field(() => Int, { nullable: true })
  totalPages?: number;
}
