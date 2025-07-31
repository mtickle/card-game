import { store } from '@app/store'; // Import the store you just created
import { Auth0Provider } from '@auth0/auth0-react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const redirectUri = import.meta.env.VITE_AUTH0_REDIRECT_URI;


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      <ErrorBoundary>
        <Provider store={store}>
          <App />
        </Provider>
      </ErrorBoundary>
    </Auth0Provider>
  </React.StrictMode>
);