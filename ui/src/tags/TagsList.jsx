import { useState } from 'react'
import { useMediaQuery, withWidth } from '@material-ui/core'
import {
  Filter,
  SearchInput,
  TextField,
  usePermissions,
} from 'react-admin'
import {
  List,
  SongSimpleList,
  useResourceRefresh,
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
  TablePagination,
  TextField as MuiTextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl
} from '@material-ui/core'
import { ExpandMore, ExpandLess, Search } from '@material-ui/icons'

const genres = [
  'Alternative', 'Ambient', 'Audiobook', 'Blues', 'Britpop', 'Classical', 
  'Country', 'Disco', 'Electronic', 'Experimental', 'Folk', 'Funk', 
  'Gospel', 'Grunge', 'Hip-Hop', 'Indie', 'Jazz', 'Metal', 'New Wave', 
  'Pop', 'Post-Punk', 'Progressive', 'Psychedelic', 'Punk', 'R&B', 
  'Reggae', 'Rock', 'Soul', 'World'
]

const currentYear = new Date().getFullYear()
const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => 1900 + i).reverse()

const mockData = [
  { id: 1, path: 'Library/Audiobook_Rus_200_017.mp3', title: 'Chapter 17', artist: 'John Smith', albumArtist: 'John Smith', album: 'Russian Stories', genre: 'Audiobook', trackNumber: '17', year: '2020' },
  { id: 2, path: 'Library/Audiobook_Rus_200_018.mp3', title: 'Chapter 18', artist: 'John Smith', albumArtist: 'John Smith', album: 'Russian Stories', genre: 'Audiobook', trackNumber: '18', year: '2020' },
  { id: 3, path: 'Music/Pop/Artist1/Album1/Track01.mp3', title: 'Love Song', artist: 'Artist One', albumArtist: 'Artist One', album: 'First Album', genre: 'Pop', trackNumber: '1', year: '2019' },
  { id: 4, path: 'Music/Rock/Band2/Album2/Track02.mp3', title: 'Rock Anthem', artist: 'Band Two', albumArtist: 'Band Two', album: 'Rock Collection', genre: 'Rock', trackNumber: '2', year: '2021' },
  { id: 5, path: 'Music/Jazz/Miles/Kind/Track03.mp3', title: 'Blue Notes', artist: 'Miles Davis', albumArtist: 'Miles Davis', album: 'Kind of Blue', genre: 'Jazz', trackNumber: '3', year: '1959' },
  { id: 6, path: 'Library/Classical/Bach/Brandenburg/Track01.mp3', title: 'Brandenburg Concerto No. 1', artist: 'Johann Sebastian Bach', albumArtist: 'Johann Sebastian Bach', album: 'Brandenburg Concertos', genre: 'Classical', trackNumber: '1', year: '1721' },
  { id: 7, path: 'Music/Electronic/Daft/Random/Track04.mp3', title: 'Get Lucky', artist: 'Daft Punk', albumArtist: 'Daft Punk', album: 'Random Access Memories', genre: 'Electronic', trackNumber: '4', year: '2013' },
  { id: 8, path: 'Music/Hip-Hop/Kendrick/DAMN/Track05.mp3', title: 'HUMBLE.', artist: 'Kendrick Lamar', albumArtist: 'Kendrick Lamar', album: 'DAMN.', genre: 'Hip-Hop', trackNumber: '5', year: '2017' },
  { id: 9, path: 'Music/Country/Johnny/Ring/Track01.mp3', title: 'Ring of Fire', artist: 'Johnny Cash', albumArtist: 'Johnny Cash', album: 'Ring of Fire', genre: 'Country', trackNumber: '1', year: '1963' },
  { id: 10, path: 'Music/Folk/Bob/Highway/Track02.mp3', title: 'Like a Rolling Stone', artist: 'Bob Dylan', albumArtist: 'Bob Dylan', album: 'Highway 61 Revisited', genre: 'Folk', trackNumber: '2', year: '1965' },
  { id: 11, path: 'Music/Reggae/Bob/Legend/Track03.mp3', title: 'No Woman No Cry', artist: 'Bob Marley', albumArtist: 'Bob Marley', album: 'Legend', genre: 'Reggae', trackNumber: '3', year: '1975' },
  { id: 12, path: 'Music/Blues/BB/Live/Track01.mp3', title: 'The Thrill Is Gone', artist: 'B.B. King', albumArtist: 'B.B. King', album: 'Live at the Regal', genre: 'Blues', trackNumber: '1', year: '1965' },
  { id: 13, path: 'Music/Punk/Ramones/Ramones/Track04.mp3', title: 'Blitzkrieg Bop', artist: 'Ramones', albumArtist: 'Ramones', album: 'Ramones', genre: 'Punk', trackNumber: '4', year: '1976' },
  { id: 14, path: 'Music/Metal/Metallica/Master/Track02.mp3', title: 'Master of Puppets', artist: 'Metallica', albumArtist: 'Metallica', album: 'Master of Puppets', genre: 'Metal', trackNumber: '2', year: '1986' },
  { id: 15, path: 'Music/Alternative/Nirvana/Nevermind/Track05.mp3', title: 'Smells Like Teen Spirit', artist: 'Nirvana', albumArtist: 'Nirvana', album: 'Nevermind', genre: 'Alternative', trackNumber: '5', year: '1991' },
  { id: 16, path: 'Music/Indie/Arctic/AM/Track01.mp3', title: 'Do I Wanna Know?', artist: 'Arctic Monkeys', albumArtist: 'Arctic Monkeys', album: 'AM', genre: 'Indie', trackNumber: '1', year: '2013' },
  { id: 17, path: 'Music/R&B/Stevie/Songs/Track03.mp3', title: 'Superstition', artist: 'Stevie Wonder', albumArtist: 'Stevie Wonder', album: 'Talking Book', genre: 'R&B', trackNumber: '3', year: '1972' },
  { id: 18, path: 'Music/Disco/Bee/Saturday/Track02.mp3', title: 'Stayin\' Alive', artist: 'Bee Gees', albumArtist: 'Bee Gees', album: 'Saturday Night Fever', genre: 'Disco', trackNumber: '2', year: '1977' },
  { id: 19, path: 'Music/Funk/James/Live/Track04.mp3', title: 'I Got You (I Feel Good)', artist: 'James Brown', albumArtist: 'James Brown', album: 'Live at the Apollo', genre: 'Funk', trackNumber: '4', year: '1963' },
  { id: 20, path: 'Music/Soul/Aretha/Lady/Track01.mp3', title: 'Respect', artist: 'Aretha Franklin', albumArtist: 'Aretha Franklin', album: 'Lady Soul', genre: 'Soul', trackNumber: '1', year: '1967' },
  { id: 21, path: 'Music/Gospel/Mahalia/Newport/Track02.mp3', title: 'Take My Hand, Precious Lord', artist: 'Mahalia Jackson', albumArtist: 'Mahalia Jackson', album: 'Newport 1958', genre: 'Gospel', trackNumber: '2', year: '1958' },
  { id: 22, path: 'Music/World/Buena/Social/Track03.mp3', title: 'Chan Chan', artist: 'Buena Vista Social Club', albumArtist: 'Buena Vista Social Club', album: 'Buena Vista Social Club', genre: 'World', trackNumber: '3', year: '1997' },
  { id: 23, path: 'Music/Ambient/Brian/Music/Track01.mp3', title: '1/1', artist: 'Brian Eno', albumArtist: 'Brian Eno', album: 'Music for Airports', genre: 'Ambient', trackNumber: '1', year: '1978' },
  { id: 24, path: 'Music/Experimental/Frank/Trout/Track04.mp3', title: 'Peaches en Regalia', artist: 'Frank Zappa', albumArtist: 'Frank Zappa', album: 'Hot Rats', genre: 'Experimental', trackNumber: '4', year: '1969' },
  { id: 25, path: 'Music/Progressive/Pink/Dark/Track05.mp3', title: 'Money', artist: 'Pink Floyd', albumArtist: 'Pink Floyd', album: 'The Dark Side of the Moon', genre: 'Progressive', trackNumber: '5', year: '1973' },
  { id: 26, path: 'Music/Psychedelic/Beatles/Sgt/Track02.mp3', title: 'Lucy in the Sky with Diamonds', artist: 'The Beatles', albumArtist: 'The Beatles', album: 'Sgt. Pepper\'s Lonely Hearts Club Band', genre: 'Psychedelic', trackNumber: '2', year: '1967' },
  { id: 27, path: 'Music/New Wave/Talking/Remain/Track01.mp3', title: 'Once in a Lifetime', artist: 'Talking Heads', albumArtist: 'Talking Heads', album: 'Remain in Light', genre: 'New Wave', trackNumber: '1', year: '1980' },
  { id: 28, path: 'Music/Post-Punk/Joy/Unknown/Track03.mp3', title: 'Love Will Tear Us Apart', artist: 'Joy Division', albumArtist: 'Joy Division', album: 'Unknown Pleasures', genre: 'Post-Punk', trackNumber: '3', year: '1979' },
  { id: 29, path: 'Music/Grunge/Pearl/Ten/Track04.mp3', title: 'Alive', artist: 'Pearl Jam', albumArtist: 'Pearl Jam', album: 'Ten', genre: 'Grunge', trackNumber: '4', year: '1991' },
  { id: 30, path: 'Music/Britpop/Oasis/Morning/Track02.mp3', title: 'Wonderwall', artist: 'Oasis', albumArtist: 'Oasis', album: '(What\'s the Story) Morning Glory?', genre: 'Britpop', trackNumber: '2', year: '1995' }
]

const TagsTable = ({ searchTerm, visibleColumns }) => {
  const [order, setOrder] = useState('asc')
  const [orderBy, setOrderBy] = useState('title')
  const [page, setPage] = useState(0)
  const [rowsPerPage] = useState(25)
  const [data, setData] = useState(mockData)
  const [editingCell, setEditingCell] = useState(null)

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  const handleChangePage = (event, newPage) => {
    setPage(newPage)
  }

  const handleCellClick = (rowId, field) => {
    if (['albumArtist', 'artist', 'album', 'title', 'genre', 'trackNumber', 'year'].includes(field)) {
      setEditingCell({ rowId, field })
    }
  }

  const handleCellChange = (rowId, field, value) => {
    setData(prevData => 
      prevData.map(item => 
        item.id === rowId ? { ...item, [field]: value } : item
      )
    )
  }

  const handleCellBlur = () => {
    setEditingCell(null)
  }

  const renderEditableCell = (row, field, value) => {
    const isEditing = editingCell?.rowId === row.id && editingCell?.field === field
    
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

    if (field === 'genre') {
      return (
        <FormControl size="small" fullWidth>
          <Select
            value={value || ''}
            onChange={(e) => handleCellChange(row.id, field, e.target.value)}
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
      return (
        <FormControl size="small" fullWidth>
          <Select
            value={value || ''}
            onChange={(e) => handleCellChange(row.id, field, e.target.value)}
            onBlur={handleCellBlur}
            autoFocus
          >
            {years.map(year => (
              <MenuItem key={year} value={year.toString()}>{year}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )
    }

    // For trackNumber, use smaller width
    const fieldProps = field === 'trackNumber' 
      ? { size: "small", style: { width: '60px' } }
      : { size: "small", fullWidth: true }

    return (
      <MuiTextField
        {...fieldProps}
        value={value || ''}
        onChange={(e) => handleCellChange(row.id, field, e.target.value)}
        onBlur={handleCellBlur}
        autoFocus
      />
    )
  }

  // Filter data based on search term
  const filteredData = data.filter(row => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      row.path.toLowerCase().includes(searchLower) ||
      row.title.toLowerCase().includes(searchLower) ||
      row.artist.toLowerCase().includes(searchLower) ||
      row.albumArtist.toLowerCase().includes(searchLower) ||
      row.album.toLowerCase().includes(searchLower) ||
      row.genre.toLowerCase().includes(searchLower) ||
      row.year.toLowerCase().includes(searchLower) ||
      row.trackNumber.toLowerCase().includes(searchLower)
    )
  })

  const sortedData = [...filteredData].sort((a, b) => {
    let aValue = a[orderBy]
    let bValue = b[orderBy]
    
    // Handle numeric sorting for trackNumber and year
    if (orderBy === 'trackNumber' || orderBy === 'year') {
      aValue = parseInt(aValue) || 0
      bValue = parseInt(bValue) || 0
    }
    
    if (order === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const paginatedData = sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  const createSortHandler = (property) => () => {
    handleRequestSort(property)
  }

  return (
    <Paper>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Folder</TableCell>
            <TableCell>
              <TableSortLabel
                active={orderBy === 'path'}
                direction={orderBy === 'path' ? order : 'asc'}
                onClick={createSortHandler('path')}
              >
                File
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
          {paginatedData.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.path.substring(0, row.path.lastIndexOf('/'))}</TableCell>
              <TableCell>{row.path.substring(row.path.lastIndexOf('/') + 1)}</TableCell>
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
      <TablePagination
        rowsPerPageOptions={[25]}
        component="div"
        count={filteredData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
      />
    </Paper>
  )
}

const TagsList = (props) => {
  const [expanded, setExpanded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
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

  return (
    <>
      {/* Column chooser section */}
      <Box sx={{ mb: 2, p: 2 }}>
        <Button 
          onClick={handleExpandClick} 
          endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
        >
          Choose columns
        </Button>

        {/* Column chooser - collapsible */}
        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
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
      </Box>

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
      <TagsTable searchTerm={searchTerm} visibleColumns={visibleColumns} />
    </>
  )
}

export default withWidth()(TagsList)
