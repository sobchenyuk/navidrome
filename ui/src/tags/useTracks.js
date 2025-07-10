import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_TRACKS, UPDATE_TAGS } from './graphql/queries';

export const useTracks = (searchPath) => {
  const { data, loading, error, refetch } = useQuery(GET_TRACKS, {
    variables: { path: searchPath },
    errorPolicy: 'all',
  });

  const [updateTagsMutation] = useMutation(UPDATE_TAGS, {
    errorPolicy: 'all',
    onCompleted: () => {
      // Refetch tracks after successful update
      refetch();
    },
  });

  const [localData, setLocalData] = useState([]);
  
  // Use GraphQL data or fallback to local data
  const tracks = data?.tracks || localData;

  const updateTrack = useCallback(async (trackPath, field, value) => {
    try {
      // Update local state immediately for UI responsiveness
      setLocalData(prevData => 
        prevData.map(track => 
          track.path === trackPath 
            ? { ...track, [field]: value }
            : track
        )
      );

      // Prepare input object with only the changed field
      const input = { [field]: value };
      
      // Convert string numbers to integers for specific fields
      if (field === 'trackNumber' || field === 'year') {
        input[field] = value ? parseInt(value, 10) : null;
      }

      // Send mutation to backend
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
      
      // Revert local changes on error
      if (data?.tracks) {
        setLocalData(data.tracks);
      }
      
      return false;
    }
  }, [updateTagsMutation, data]);

  // Initialize local data when GraphQL data loads
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
    refetch,
  };
};
