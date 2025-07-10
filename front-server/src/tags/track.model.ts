import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class Track {
  @Field()
  id: string;

  @Field()
  path: string;

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

  @Field({ nullable: true })
  cover?: string; // base64 or URL
}
