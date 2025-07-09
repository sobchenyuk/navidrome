import React from 'react'
import BookmarksIcon from '@material-ui/icons/Bookmarks';
import BookmarksOutlinedIcon from '@material-ui/icons/BookmarksOutlined';
import DynamicMenuIcon from '../layout/DynamicMenuIcon'
import TagsList from './TagsList'

export default {
  list: TagsList,
  icon: (
    <DynamicMenuIcon
      path={'tags'}
      icon={BookmarksOutlinedIcon}
      activeIcon={BookmarksIcon}
    />
  ),
}
