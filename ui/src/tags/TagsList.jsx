import { useState, useEffect } from 'react'
import { useMediaQuery, withWidth } from '@material-ui/core'
import { ApolloProvider } from '@apollo/client'
import {
  Filter,
  SearchInput,
  TextField,
  usePermissions,
  useTranslate,
} from 'react-admin'
import {
  List,
  SongSimpleList,
  useResourceRefresh,
  Pagination,
  Title,
} from '../common'
import {
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Paper,
  Collapse,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableSortLabel,
  TextField as MuiTextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  CircularProgress
} from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { ExpandMore, ExpandLess, Search } from '@material-ui/icons'
import { apolloClient } from './graphql/client'
import { useTracks } from './useTracks'
import { useEncoding } from './useEncoding'
import genres from './genres.js'

const currentYear = new Date().getFullYear()
const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => 1900 + i).reverse()

const TagsTable = ({ searchTerm, visibleColumns, tracks, loading, error, updateTrack, page, onPageChange, totalCount, rowsPerPage, onChangeRowsPerPage, onSortChange }) => {
  const [order, setOrder] = useState('asc')
  const [orderBy, setOrderBy] = useState('title')
  const [editingCell, setEditingCell] = useState(null)
  const [fieldValues, setFieldValues] = useState({}) // локальные значения полей
  const [debounceTimers, setDebounceTimers] = useState({}) // таймеры для debounce

  // Cleanup таймеров при размонтировании
  useEffect(() => {
    return () => {
      Object.values(debounceTimers).forEach(timer => {
        if (timer) clearTimeout(timer)
      })
    }
  }, [])

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc'
    const newOrder = isAsc ? 'desc' : 'asc'
    setOrder(newOrder)
    setOrderBy(property)
    onSortChange(property, newOrder)
  }

  const handleCellClick = (rowId, field) => {
    if (['albumArtist', 'artist', 'album', 'title', 'genre', 'trackNumber', 'year'].includes(field)) {
      setEditingCell({ rowId, field })
      // Инициализируем локальное значение
      const track = tracks.find(t => t.id === rowId)
      if (track) {
        const key = `${rowId}-${field}`
        setFieldValues(prev => ({
          ...prev,
          [key]: track[field] || ''
        }))
      }
    }
  }

  const debouncedUpdate = (trackPath, field, value, rowId) => {
    const key = `${rowId}-${field}`

    // Очищаем предыдущий таймер
    if (debounceTimers[key]) {
      clearTimeout(debounceTimers[key])
    }

    // Создаем новый таймер
    const timer = setTimeout(async () => {
      // Обрабатываем пустые значения и 0 для trackNumber
      let processedValue = value

      if (field === 'trackNumber') {
        // Для trackNumber: пустая строка = null, "0" = 0, другие числа как есть
        if (value === '') {
          processedValue = null
        } else {
          const parsed = parseInt(value, 10)
          processedValue = isNaN(parsed) ? null : parsed
        }
      }

      await updateTrack(trackPath, field, processedValue)

      // Удаляем таймер из списка
      setDebounceTimers(prev => {
        const { [key]: removed, ...rest } = prev
        return rest
      })
    }, 300) // 300мс debounce

    // Сохраняем таймер
    setDebounceTimers(prev => ({
      ...prev,
      [key]: timer
    }))
  }

  const handleCellBlur = () => {
    setEditingCell(null)
  }

  const renderEditableCell = (row, field, value) => {
    const isEditing = editingCell?.rowId === row.id && editingCell?.field === field
    const key = `${row.id}-${field}`
    const localValue = fieldValues[key]

    if (!isEditing) {
      return (
        <span
          onClick={() => handleCellClick(row.id, field)}
          style={{ cursor: 'pointer', minHeight: '20px', display: 'block' }}
        >
          {value || '\u00A0'}
        </span>
      )
    }

    const handleInputChange = (newValue) => {
      // Обновляем локальное значение
      setFieldValues(prev => ({
        ...prev,
        [key]: newValue
      }))

      // Запускаем debounced обновление
      debouncedUpdate(row.path, field, newValue, row.id)
    }

    if (field === 'genre') {
      return (
        <FormControl size="small" fullWidth>
          <Select
            value={localValue !== undefined ? localValue : (value || '')}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={handleCellBlur}
            autoFocus
          >
            {genres.map(genre => (
              <MenuItem key={genre} value={genre}>{genre}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )
    }

    if (field === 'year') {
      const handleYearInputChange = (newValue) => {
        // Ограничиваем ввод только цифрами
        const numericValue = newValue.replace(/[^0-9]/g, '')
        handleInputChange(numericValue)
      }

      return (
        <MuiTextField
          size="small"
          fullWidth
          type="text"
          value={localValue !== undefined ? localValue : (value || '')}
          onChange={(e) => handleYearInputChange(e.target.value)}
          onBlur={handleCellBlur}
          autoFocus
          placeholder="Год (напр. 2023)"
          inputProps={{
            maxLength: 4,
            pattern: '[0-9]*'
          }}
        />
      )
    }

    const fieldProps = field === 'trackNumber'
      ? { size: "small", style: { width: '60px' } }
      : { size: "small", fullWidth: true }

    if (field === 'trackNumber') {
      const handleTrackNumberChange = (newValue) => {
        // Ограничиваем ввод только цифрами
        const numericValue = newValue.replace(/[^0-9]/g, '')
        handleInputChange(numericValue)
      }

      return (
        <MuiTextField
          {...fieldProps}
          value={localValue !== undefined ? localValue : (value || '')}
          onChange={(e) => handleTrackNumberChange(e.target.value)}
          onBlur={handleCellBlur}
          autoFocus
          placeholder="№"
          inputProps={{
            maxLength: 3
          }}
        />
      )
    }

    return (
      <MuiTextField
        {...fieldProps}
        value={localValue !== undefined ? localValue : (value || '')}
        onChange={(e) => handleInputChange(e.target.value)}
        onBlur={handleCellBlur}
        autoFocus
      />
    )
  }

  // Данные уже отфильтрованы и отсортированы на сервере
  const displayData = tracks

  const createSortHandler = (property) => () => {
    handleRequestSort(property)
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error loading tracks: {error.message}
      </Alert>
    )
  }

  return (
    <Paper>
      {/* Пагинация сверху */}
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
        <Pagination
          page={page + 1}
          perPage={rowsPerPage}
          total={totalCount || 0}
          setPage={(newPage) => onPageChange(null, newPage - 1)}
          setPerPage={onChangeRowsPerPage}
        />
      </Box>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <TableSortLabel
                active={orderBy === 'path'}
                direction={orderBy === 'path' ? order : 'asc'}
                onClick={createSortHandler('path')}
              >
                Path
              </TableSortLabel>
            </TableCell>
            {visibleColumns.albumArtist && (
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'albumArtist'}
                  direction={orderBy === 'albumArtist' ? order : 'asc'}
                  onClick={createSortHandler('albumArtist')}
                >
                  Album Artist
                </TableSortLabel>
              </TableCell>
            )}
            {visibleColumns.albumName && (
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'album'}
                  direction={orderBy === 'album' ? order : 'asc'}
                  onClick={createSortHandler('album')}
                >
                  Album Name
                </TableSortLabel>
              </TableCell>
            )}
            {visibleColumns.artist && (
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'artist'}
                  direction={orderBy === 'artist' ? order : 'asc'}
                  onClick={createSortHandler('artist')}
                >
                  Artist
                </TableSortLabel>
              </TableCell>
            )}
            {visibleColumns.genre && (
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'genre'}
                  direction={orderBy === 'genre' ? order : 'asc'}
                  onClick={createSortHandler('genre')}
                >
                  Genre
                </TableSortLabel>
              </TableCell>
            )}
            {visibleColumns.trackName && (
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'title'}
                  direction={orderBy === 'title' ? order : 'asc'}
                  onClick={createSortHandler('title')}
                >
                  Track Name
                </TableSortLabel>
              </TableCell>
            )}
            {visibleColumns.trackNumber && (
              <TableCell style={{ width: '80px' }}>
                <TableSortLabel
                  active={orderBy === 'trackNumber'}
                  direction={orderBy === 'trackNumber' ? order : 'asc'}
                  onClick={createSortHandler('trackNumber')}
                >
                  #
                </TableSortLabel>
              </TableCell>
            )}
            {visibleColumns.year && (
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'year'}
                  direction={orderBy === 'year' ? order : 'asc'}
                  onClick={createSortHandler('year')}
                >
                  Year
                </TableSortLabel>
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {displayData.map((row) => (
            <TableRow key={row.id}>
              <TableCell title={row.path}>{row.path || ''}</TableCell>
              {visibleColumns.albumArtist && (
                <TableCell>
                  {renderEditableCell(row, 'albumArtist', row.albumArtist)}
                </TableCell>
              )}
              {visibleColumns.albumName && (
                <TableCell>
                  {renderEditableCell(row, 'album', row.album)}
                </TableCell>
              )}
              {visibleColumns.artist && (
                <TableCell>
                  {renderEditableCell(row, 'artist', row.artist)}
                </TableCell>
              )}
              {visibleColumns.genre && (
                <TableCell>
                  {renderEditableCell(row, 'genre', row.genre)}
                </TableCell>
              )}
              {visibleColumns.trackName && (
                <TableCell>
                  {renderEditableCell(row, 'title', row.title)}
                </TableCell>
              )}
              {visibleColumns.trackNumber && (
                <TableCell style={{ width: '80px' }}>
                  {renderEditableCell(row, 'trackNumber', row.trackNumber)}
                </TableCell>
              )}
              {visibleColumns.year && (
                <TableCell>
                  {renderEditableCell(row, 'year', row.year)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Пагинация снизу */}
      <Pagination
        page={page + 1}
        perPage={rowsPerPage}
        total={totalCount || 0}
        setPage={(newPage) => onPageChange(null, newPage - 1)}
        setPerPage={onChangeRowsPerPage}
      />
    </Paper>
  )
}

const TagsListContent = (props) => {
  const translate = useTranslate()
  const [expanded, setExpanded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [sortBy, setSortBy] = useState('title')
  const [sortOrder, setSortOrder] = useState('asc')
  const [isIndexing, setIsIndexing] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationTimer, setNotificationTimer] = useState(null)
  const [refetchTimer, setRefetchTimer] = useState(null) // для таймера refetch
  const [visibleColumns, setVisibleColumns] = useState({
    albumArtist: true,
    albumName: true,
    artist: true,
    genre: true,
    trackName: true,
    trackNumber: true,
    year: false
  })

  const isXsmall = useMediaQuery((theme) => theme.breakpoints.down('xs'))
  const isDesktop = useMediaQuery((theme) => theme.breakpoints.up('md'))
  const { permissions } = usePermissions()

  // Debounce для поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setPage(0) // сбрасываем на первую страницу при поиске
    }, 300) // 300мс задержка

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Cleanup notification timer on unmount
  useEffect(() => {
    return () => {
      if (notificationTimer) {
        clearTimeout(notificationTimer)
      }
      if (refetchTimer) {
        clearTimeout(refetchTimer)
      }
    }
  }, [])

  // Use GraphQL hook to fetch tracks
  const { tracks, loading, error, updateTrack, indexTracks, totalCount, refetch } = useTracks(rowsPerPage, page * rowsPerPage, debouncedSearchTerm, sortBy, sortOrder)
  
  // Use encoding hook
  const { isFixing, encodingStatus, showCompleteNotification, showNoFilesNotification, startEncodingFix } = useEncoding()

  const handleExpandClick = () => {
    setExpanded(!expanded)
  }

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value)
  }

  const handleColumnToggle = (column) => (event) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: event.target.checked
    }))
  }

  const handleIndexClick = async () => {
    setIsIndexing(true)
    const success = await indexTracks()
    setIsIndexing(false)

    if (success) {
      setShowNotification(true)
      // Очищаем предыдущий таймер если есть
      if (notificationTimer) {
        clearTimeout(notificationTimer)
      }
      // Создаем новый таймер
      const timer = setTimeout(() => {
        setShowNotification(false)
        setNotificationTimer(null)
      }, 3000)
      setNotificationTimer(timer)
    }
  }

  const handlePageChange = (event, newPage) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage)
    setPage(0) // сбрасываем на первую страницу при изменении количества

    // Очищаем предыдущий таймер если есть
    if (refetchTimer) {
      clearTimeout(refetchTimer)
    }

    // Принудительно обновляем данные
    const timer = setTimeout(() => {
      refetch()
      setRefetchTimer(null)
    }, 0)
    setRefetchTimer(timer)
  }

  const handleSortChange = (property, order) => {
    setSortBy(property)
    setSortOrder(order)
  }

  const handleEncodingFixClick = async () => {
    const success = await startEncodingFix()
    if (!success) {
      // Можно добавить уведомление об ошибке
      console.error('Failed to start encoding fix')
    }
  }

  return (
    <>
      {/* Header with buttons */}
      <Box sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Button
            onClick={handleExpandClick}
            endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
          >
            Choose columns
          </Button>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button onClick={handleIndexClick} disabled={isIndexing}>
              {isIndexing ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  Индексация...
                </>
              ) : (
                'Проиндексировать'
              )}
            </Button>
            
            <Button variant="outlined" size="small" onClick={handleEncodingFixClick} disabled={isFixing}>
              {isFixing ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  Обработка...
                </>
              ) : (
                'Фикс кодировки'
              )}
            </Button>
          </Box>
        </Box>
        
        {/* Statistics under buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          {(encodingStatus.status !== 'none' && (encodingStatus.found > 0 || isFixing)) && (
            <Typography variant="body2" color="textSecondary">
              Найдено: {encodingStatus.found} | Обработано: {encodingStatus.processed}/{encodingStatus.found}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Column chooser - collapsible */}
      <Collapse in={expanded}>
        <Box sx={{ mb: 2, p: 2, pt: 0 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Common tags
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.albumArtist} onChange={handleColumnToggle('albumArtist')} />}
              label="Album Artist"
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.albumName} onChange={handleColumnToggle('albumName')} />}
              label="Album Name"
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.artist} onChange={handleColumnToggle('artist')} />}
              label="Artist"
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.genre} onChange={handleColumnToggle('genre')} />}
              label="Genre"
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.trackName} onChange={handleColumnToggle('trackName')} />}
              label="Track Name"
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.trackNumber} onChange={handleColumnToggle('trackNumber')} />}
              label="Track Number"
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.year} onChange={handleColumnToggle('year')} />}
              label="Year"
            />
          </Box>
        </Box>
      </Collapse>

      {/* Уведомление об успешной индексации */}
      {showNotification && (
        <Alert severity="success" sx={{ m: 2 }}>
          ✅ Индексация успешно завершена!
        </Alert>
      )}
      
      {/* Уведомление о завершении исправления кодировки */}
      {showCompleteNotification && (
        <Alert severity="success" sx={{ m: 2 }}>
          ✅ Исправление кодировки завершено!
        </Alert>
      )}
      
      {/* Уведомление о том, что файлов для обработки не найдено */}
      {(() => {
        console.log('showNoFilesNotification:', showNoFilesNotification);
        return showNoFilesNotification && (
          <Alert severity="info" sx={{ m: 2 }}>
            📦 Файлов для обработки не найдено
          </Alert>
        );
      })()}

      {/* Search */}
      <Box sx={{ mb: 2, p: 2 }}>
        <MuiTextField
          fullWidth
          placeholder="Search for tags"
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Table */}
      {isIndexing ? (
        <Box display="flex" flexDirection="column" alignItems="center" p={4}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="h6" color="textSecondary">
            Идет индексация файлов...
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Пожалуйста, подождите
          </Typography>
        </Box>
      ) : (
        <TagsTable
          searchTerm={searchTerm}
          visibleColumns={visibleColumns}
          tracks={tracks}
          loading={loading}
          error={error}
          updateTrack={updateTrack}
          page={page}
          onPageChange={handlePageChange}
          totalCount={totalCount}
          rowsPerPage={rowsPerPage}
          onChangeRowsPerPage={handleChangeRowsPerPage}
          onSortChange={handleSortChange}
        />
      )}
    </>
  )
}

const TagsList = (props) => {
  return (
    <ApolloProvider client={apolloClient}>
      <TagsListContent {...props} />
    </ApolloProvider>
  )
}

export default withWidth()(TagsList)
