import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class EncodingTaskStatus {
  @Field(() => Int)
  found: number;

  @Field(() => Int)
  processed: number;

  @Field()
  status: string;
}
