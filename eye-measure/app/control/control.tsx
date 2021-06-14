import React, { Fragment } from 'react';
import { render } from 'react-dom';
import { AppContainer as ReactHotAppContainer } from 'react-hot-loader';
import Root from './containers/Root';
import { history, configuredStore } from './Store';
import '../global.css';

document.addEventListener('DOMContentLoaded', () => {
  const store = configuredStore();

  const AppContainer = process.env.PLAIN_HMR ? Fragment : ReactHotAppContainer;

  render(
    <AppContainer>
      <Root store={store} history={history} />
    </AppContainer>,
    document.getElementById('controlRoot')
  );
});
