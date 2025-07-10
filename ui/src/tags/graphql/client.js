import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

// Use environment variable or fallback to localhost for development
const GRAPHQL_URI = import.meta.env.VITE_GRAPHQL_URI || 'http://localhost:3010/graphql';

const httpLink = createHttpLink({
  uri: GRAPHQL_URI,
});

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});
