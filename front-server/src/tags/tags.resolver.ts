import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { TagsService } from './tags.service';
import { Track } from './track.model';
import { TagInput } from './tag.input';

@Resolver(() => Track)
export class TagsResolver {
  constructor(private readonly tagsService: TagsService) {}

  @Query(() => [Track], { name: 'tracks' })
  async getTracks(
    @Args('path', { type: () => String, nullable: true }) path?: string,
  ): Promise<Track[]> {
    return this.tagsService.findAll(path);
  }

  @Query(() => Track, { name: 'track', nullable: true })
  async getTrack(
    @Args('path', { type: () => String }) path: string,
  ): Promise<Track | null> {
    return this.tagsService.findOne(path);
  }

  @Mutation(() => Boolean)
  async updateTags(
    @Args('path', { type: () => String }) path: string,
    @Args('input', { type: () => TagInput }) input: TagInput,
  ): Promise<boolean> {
    return this.tagsService.updateTags(path, input);
  }

  @Mutation(() => Boolean)
  async uploadCover(
    @Args('path', { type: () => String }) path: string,
    @Args('coverData', { type: () => String }) coverData: string, // base64 encoded
  ): Promise<boolean> {
    const buffer = Buffer.from(coverData, 'base64');
    return this.tagsService.uploadCover(path, buffer);
  }
}
