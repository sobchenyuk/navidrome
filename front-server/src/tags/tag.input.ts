import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class TagInput {
  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  artist?: string;

  @Field({ nullable: true })
  albumArtist?: string;

  @Field({ nullable: true })
  album?: string;

  @Field(() => Int, { nullable: true })
  year?: number;

  @Field(() => Int, { nullable: true })
  trackNumber?: number;

  @Field({ nullable: true })
  genre?: string;
}
