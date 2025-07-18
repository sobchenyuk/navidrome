import { gql } from '@apollo/client';

export const GET_TRACKS = gql`
  query GetTracks($limit: Float, $offset: Float, $search: String) {
    tracks(limit: $limit, offset: $offset, search: $search) {
      id
      path
      title
      artist
      albumArtist
      album
      genre
      trackNumber
      year
      cover
    }
  }
`;

export const GET_TRACK = gql`
  query GetTrack($path: String!) {
    track(path: $path) {
      id
      path
      title
      artist
      albumArtist
      album
      genre
      trackNumber
      year
      cover
    }
  }
`;

export const UPDATE_TAGS = gql`
  mutation UpdateTags($path: String!, $input: TagInput!) {
    updateTags(path: $path, input: $input)
  }
`;

export const UPLOAD_COVER = gql`
  mutation UploadCover($path: String!, $coverData: String!) {
    uploadCover(path: $path, coverData: $coverData)
  }
`;

export const INDEX_TRACKS = gql`
  mutation IndexTracks {
    indexTracks
  }
`;

export const GET_TRACKS_COUNT = gql`
  query GetTracksCount($search: String) {
    tracksCount(search: $search)
  }
`;
