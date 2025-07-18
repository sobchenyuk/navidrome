import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_TRACKS, UPDATE_TAGS, INDEX_TRACKS, GET_TRACKS_COUNT } from './graphql/queries';

export const useTracks = (limit = 25, offset = 0, search) => {
  const { data, loading, error, refetch } = useQuery(GET_TRACKS, {
    variables: { limit, offset, search },
    errorPolicy: 'all',
  });

  const { data: countData, refetch: refetchCount } = useQuery(GET_TRACKS_COUNT, {
    variables: { search },
    errorPolicy: 'all',
    skip: !search && search !== '', // пропускаем запрос если search undefined
  });

  const [updateTagsMutation] = useMutation(UPDATE_TAGS, {
    errorPolicy: 'all',
    onCompleted: () => {
      refetch();
    },
  });

  const [indexTracksMutation] = useMutation(INDEX_TRACKS, {
    errorPolicy: 'all',
  });

  const [localData, setLocalData] = useState([]);

  const tracks = data?.tracks || localData;

  const updateTrack = useCallback(async (trackPath, field, value) => {
    try {
      const fieldMap = {
        artistName: 'artist',
        albumName: 'album',
        albumArtistName: 'albumArtist',
        trackNum: 'trackNumber',
        yearReleased: 'year',
        genreType: 'genre',
        titleText: 'title',
        artist: 'artist',
        album: 'album',
        albumArtist: 'albumArtist',
        trackNumber: 'trackNumber',
        year: 'year',
        genre: 'genre',
        title: 'title',
      };

      const realField = fieldMap[field] || field;

      setLocalData(prevData =>
        prevData.map(track =>
          track.path === trackPath
            ? { ...track, [realField]: value }
            : track
        )
      );

      const input = { [realField]: value };

      if (realField === 'trackNumber' || realField === 'year') {
        input[realField] = value ? parseInt(value, 10) : null;
      }

      const result = await updateTagsMutation({
        variables: {
          path: trackPath,
          input,
        },
      });

      console.log('Tags updated successfully:', result);
      return true;
    } catch (err) {
      console.error('Error updating tags:', err);

      if (data?.tracks) {
        setLocalData(data.tracks);
      }

      return false;
    }
  }, [updateTagsMutation, data]);

  const indexTracks = useCallback(async () => {
    try {
      console.log('🔄 Starting indexing...');
      const result = await indexTracksMutation();
      console.log('✅ Indexing completed:', result);
      refetch(); // Обновляем данные после индексации
      refetchCount(); // Обновляем количество
      return true;
    } catch (err) {
      console.error('❌ Error indexing tracks:', err);
      return false;
    }
  }, [indexTracksMutation, refetch, refetchCount]);

  useState(() => {
    if (data?.tracks && localData.length === 0) {
      setLocalData(data.tracks);
    }
  }, [data, localData.length]);

  return {
    tracks,
    loading,
    error,
    updateTrack,
    indexTracks,
    refetch,
    totalCount: countData?.tracksCount || 0,
  };
};
