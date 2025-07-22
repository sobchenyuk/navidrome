import { Module } from '@nestjs/common';
import { TagsService } from './tags.service';
import { TagsResolver } from './tags.resolver';
import { DatabaseService } from './database.service';
import { EncodingService } from './encoding.service';

@Module({
  providers: [TagsService, TagsResolver, DatabaseService, EncodingService],
  exports: [TagsService, EncodingService],
})
export class TagsModule {}
