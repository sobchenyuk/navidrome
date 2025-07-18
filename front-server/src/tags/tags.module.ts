import { Module } from '@nestjs/common';
import { TagsService } from './tags.service';
import { TagsResolver } from './tags.resolver';
import { DatabaseService } from './database.service';

@Module({
  providers: [TagsService, TagsResolver, DatabaseService],
  exports: [TagsService],
})
export class TagsModule {}
