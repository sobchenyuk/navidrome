import { Resolver, Query, Mutation, Args, Float } from '@nestjs/graphql';
import { TagsService } from './tags.service';
import { EncodingService } from './encoding.service';
import { Track } from './track.model';
import { TagInput } from './tag.input';
import { EncodingTaskStatus } from './encoding-task-status.model';

@Resolver(() => Track)
export class TagsResolver {
  constructor(
    private readonly tagsService: TagsService,
    private readonly encodingService: EncodingService,
  ) {}

  @Query(() => [Track], { name: 'tracks' })
  async getTracks(
    @Args('limit', { type: () => Float, defaultValue: 25 }) limit: number,
    @Args('offset', { type: () => Float, defaultValue: 0 }) offset: number,
    @Args('search', { type: () => String, nullable: true }) search?: string,
    @Args('sortBy', { type: () => String, nullable: true }) sortBy?: string,
    @Args('sortOrder', { type: () => String, nullable: true }) sortOrder?: string,
  ): Promise<Track[]> {
    return this.tagsService.findAll(limit, offset, search, sortBy, sortOrder);
  }

  @Query(() => Number, { name: 'tracksCount' })
  async getTracksCount(
    @Args('search', { type: () => String, nullable: true }) search?: string,
  ): Promise<number> {
    return this.tagsService.getTracksCount(search);
  }

  @Query(() => Track, { name: 'track', nullable: true })
  async getTrack(
    @Args('path', { type: () => String }) path: string,
  ): Promise<Track | null> {
    return this.tagsService.findOne(path);
  }

  @Query(() => EncodingTaskStatus, { name: 'encodingTaskStatus', nullable: true })
  async getEncodingTaskStatus(): Promise<EncodingTaskStatus | null> {
    return this.encodingService.getEncodingTaskStatus();
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

  @Mutation(() => Boolean)
  async indexTracks(): Promise<boolean> {
    return this.tagsService.indexAllTracks();
  }

  @Mutation(() => Boolean)
  async fixEncoding(): Promise<boolean> {
    return this.encodingService.startEncodingFix();
  }
}
